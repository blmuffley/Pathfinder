package store

import (
	"context"
	"embed"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

// Store wraps a PostgreSQL connection pool and provides data access methods.
type Store struct {
	pool   *pgxpool.Pool
	logger *zap.Logger
}

// New creates a new Store, connects to PostgreSQL, and runs migrations.
func New(ctx context.Context, databaseURL string, maxConns int, logger *zap.Logger) (*Store, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}
	if maxConns > 0 {
		cfg.MaxConns = int32(maxConns)
	}

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("connect to database: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	s := &Store{pool: pool, logger: logger}

	if err := s.runMigrations(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("run migrations: %w", err)
	}

	logger.Info("database connected and migrated")
	return s, nil
}

// Close shuts down the connection pool.
func (s *Store) Close() {
	s.pool.Close()
}

// runMigrations applies embedded SQL migration files.
func (s *Store) runMigrations(ctx context.Context) error {
	// Create migrations tracking table
	_, err := s.pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return fmt.Errorf("create migrations table: %w", err)
	}

	entries, err := migrationsFS.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		version := entry.Name()

		var exists bool
		err := s.pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)", version).Scan(&exists)
		if err != nil {
			return fmt.Errorf("check migration %s: %w", version, err)
		}
		if exists {
			continue
		}

		sql, err := migrationsFS.ReadFile("migrations/" + version)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", version, err)
		}

		s.logger.Info("applying migration", zap.String("version", version))
		if _, err := s.pool.Exec(ctx, string(sql)); err != nil {
			return fmt.Errorf("apply migration %s: %w", version, err)
		}

		if _, err := s.pool.Exec(ctx, "INSERT INTO schema_migrations (version) VALUES ($1)", version); err != nil {
			return fmt.Errorf("record migration %s: %w", version, err)
		}
	}

	return nil
}

// --- Agent operations ---

// InsertAgent registers a new agent after enrollment.
func (s *Store) InsertAgent(ctx context.Context, agentID, hostname, osType, agentVersion string) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO agents (agent_id, hostname, os_type, agent_version)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (agent_id) DO UPDATE SET
		   hostname = EXCLUDED.hostname,
		   agent_version = EXCLUDED.agent_version,
		   status = 'active',
		   last_heartbeat = NOW()`,
		agentID, hostname, osType, agentVersion,
	)
	return err
}

// UpdateHeartbeat refreshes the agent's last heartbeat timestamp.
func (s *Store) UpdateHeartbeat(ctx context.Context, agentID string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE agents SET last_heartbeat = NOW() WHERE agent_id = $1`,
		agentID,
	)
	return err
}

// AgentExists checks if an agent_id is enrolled.
func (s *Store) AgentExists(ctx context.Context, agentID string) (bool, error) {
	var exists bool
	err := s.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM agents WHERE agent_id = $1 AND status = 'active')`,
		agentID,
	).Scan(&exists)
	return exists, err
}

// --- Raw flow operations ---

// FlowRow represents a raw flow for batch insertion.
type FlowRow struct {
	AgentID       string
	SrcIP         string
	SrcPort       int
	DstIP         string
	DstPort       int
	Protocol      string
	BytesSent     int64
	BytesReceived int64
	ProcessName   string
	ProcessPID    int
	CapturedAt    time.Time
}

// InsertFlows batch-inserts raw flow records.
func (s *Store) InsertFlows(ctx context.Context, flows []FlowRow) (int64, error) {
	if len(flows) == 0 {
		return 0, nil
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var count int64
	for _, f := range flows {
		_, err := tx.Exec(ctx,
			`INSERT INTO raw_flows (agent_id, src_ip, src_port, dst_ip, dst_port, protocol, bytes_sent, bytes_received, process_name, process_pid, captured_at)
			 VALUES ($1, $2::inet, $3, $4::inet, $5, $6, $7, $8, $9, $10, $11)`,
			f.AgentID, f.SrcIP, f.SrcPort, f.DstIP, f.DstPort, f.Protocol,
			f.BytesSent, f.BytesReceived, f.ProcessName, f.ProcessPID, f.CapturedAt,
		)
		if err != nil {
			return 0, fmt.Errorf("insert flow: %w", err)
		}
		count++
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit flows: %w", err)
	}
	return count, nil
}

// --- Classification result operations ---

// UpsertIntegration creates or updates a classified integration.
func (s *Store) UpsertIntegration(ctx context.Context, sourceApp, targetApp, integrationType string, confidence float64, firstSeen, lastSeen time.Time, flowCount int64) (string, error) {
	var id string
	err := s.pool.QueryRow(ctx,
		`INSERT INTO classified_integrations (source_app, target_app, integration_type, classification_confidence, first_seen, last_seen, flow_count)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 ON CONFLICT (source_app, target_app) DO UPDATE SET
		   integration_type = CASE
		     WHEN EXCLUDED.classification_confidence > classified_integrations.classification_confidence
		     THEN EXCLUDED.integration_type
		     ELSE classified_integrations.integration_type
		   END,
		   classification_confidence = GREATEST(EXCLUDED.classification_confidence, classified_integrations.classification_confidence),
		   last_seen = GREATEST(EXCLUDED.last_seen, classified_integrations.last_seen),
		   flow_count = classified_integrations.flow_count + EXCLUDED.flow_count,
		   synced_to_sn = FALSE
		 RETURNING id`,
		sourceApp, targetApp, integrationType, confidence, firstSeen, lastSeen, flowCount,
	).Scan(&id)
	return id, err
}

// UpsertInterface creates or updates a classified interface.
func (s *Store) UpsertInterface(ctx context.Context, integrationID, protocol string, port int, direction, pattern, processName string, avgBytes, flowCount int64, firstSeen, lastSeen time.Time) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO classified_interfaces (integration_id, protocol, port, direction, pattern, process_name, avg_bytes, flow_count, first_seen, last_seen)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 ON CONFLICT (integration_id, protocol, port, direction) DO UPDATE SET
		   pattern = COALESCE(EXCLUDED.pattern, classified_interfaces.pattern),
		   process_name = COALESCE(EXCLUDED.process_name, classified_interfaces.process_name),
		   avg_bytes = (classified_interfaces.avg_bytes * classified_interfaces.flow_count + EXCLUDED.avg_bytes * EXCLUDED.flow_count)
		             / NULLIF(classified_interfaces.flow_count + EXCLUDED.flow_count, 0),
		   flow_count = classified_interfaces.flow_count + EXCLUDED.flow_count,
		   last_seen = GREATEST(EXCLUDED.last_seen, classified_interfaces.last_seen),
		   synced_to_sn = FALSE`,
		integrationID, protocol, port, direction, pattern, processName, avgBytes, flowCount, firstSeen, lastSeen,
	)
	return err
}

// MarkFlowsClassified marks raw flows as classified.
func (s *Store) MarkFlowsClassified(ctx context.Context, flowIDs []int64) error {
	if len(flowIDs) == 0 {
		return nil
	}
	_, err := s.pool.Exec(ctx,
		`UPDATE raw_flows SET classified = TRUE WHERE id = ANY($1)`,
		flowIDs,
	)
	return err
}

// UnclassifiedFlow represents a raw flow pending classification.
type UnclassifiedFlow struct {
	ID            int64
	AgentID       string
	SrcIP         string
	SrcPort       int
	DstIP         string
	DstPort       int
	Protocol      string
	BytesSent     int64
	BytesReceived int64
	ProcessName   string
	CapturedAt    time.Time
}

// GetUnclassifiedFlows retrieves raw flows that haven't been classified yet.
func (s *Store) GetUnclassifiedFlows(ctx context.Context, limit int) ([]UnclassifiedFlow, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, agent_id, src_ip, src_port, dst_ip, dst_port, protocol, bytes_sent, bytes_received, process_name, captured_at
		 FROM raw_flows
		 WHERE classified = FALSE
		 ORDER BY captured_at
		 LIMIT $1`,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var flows []UnclassifiedFlow
	for rows.Next() {
		var f UnclassifiedFlow
		var srcIP, dstIP string
		if err := rows.Scan(&f.ID, &f.AgentID, &srcIP, &f.SrcPort, &dstIP, &f.DstPort,
			&f.Protocol, &f.BytesSent, &f.BytesReceived, &f.ProcessName, &f.CapturedAt); err != nil {
			return nil, err
		}
		f.SrcIP = srcIP
		f.DstIP = dstIP
		flows = append(flows, f)
	}
	return flows, rows.Err()
}

// --- SN Sync operations ---

// UnsyncedIntegration represents an integration pending ServiceNow sync.
type UnsyncedIntegration struct {
	ID                      string
	SourceApp               string
	TargetApp               string
	IntegrationType         string
	ClassificationConfidence float64
	FirstSeen               time.Time
	LastSeen                time.Time
	FlowCount               int64
}

// GetUnsyncedIntegrations retrieves integrations not yet synced to ServiceNow.
func (s *Store) GetUnsyncedIntegrations(ctx context.Context, limit int) ([]UnsyncedIntegration, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, source_app, target_app, integration_type, classification_confidence, first_seen, last_seen, flow_count
		 FROM classified_integrations
		 WHERE synced_to_sn = FALSE
		 ORDER BY last_seen DESC
		 LIMIT $1`,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var integrations []UnsyncedIntegration
	for rows.Next() {
		var i UnsyncedIntegration
		if err := rows.Scan(&i.ID, &i.SourceApp, &i.TargetApp, &i.IntegrationType,
			&i.ClassificationConfidence, &i.FirstSeen, &i.LastSeen, &i.FlowCount); err != nil {
			return nil, err
		}
		integrations = append(integrations, i)
	}
	return integrations, rows.Err()
}

// MarkIntegrationSynced marks an integration as synced to ServiceNow.
func (s *Store) MarkIntegrationSynced(ctx context.Context, id, snSysID string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE classified_integrations SET synced_to_sn = TRUE, sn_sys_id = $1 WHERE id = $2`,
		snSysID, id,
	)
	return err
}

// InsertSyncLog records a sync operation for audit.
func (s *Store) InsertSyncLog(ctx context.Context, entityType, entityID, snSysID, operation, status, errorMsg string) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO sn_sync_log (entity_type, entity_id, sn_sys_id, operation, status, error_message)
		 VALUES ($1, $2::uuid, $3, $4, $5, $6)`,
		entityType, entityID, snSysID, operation, status, errorMsg,
	)
	return err
}

// --- SGC (Service Graph Connector) operations ---

// GetUnsyncedSGCRecords retrieves records of the given type that have not yet
// been synced via the Service Graph Connector. Returns generic maps so the
// SGC publisher can apply type-specific mapping.
func (s *Store) GetUnsyncedSGCRecords(ctx context.Context, recordType string, limit int) ([]map[string]interface{}, error) {
	var query string
	switch recordType {
	case "servers":
		query = `SELECT id::text, agent_id, hostname, os_type,
		                COALESCE(ip_address, '') as ip_address,
		                COALESCE(serial_number, '') as serial_number,
		                COALESCE(cpu_count, 0) as cpu_count,
		                COALESCE(ram_mb, 0) as ram_mb
		         FROM agents
		         WHERE sgc_synced = FALSE
		         ORDER BY last_heartbeat DESC
		         LIMIT $1`
	case "app_instances":
		query = `SELECT id::text, name, COALESCE(version, '') as version,
		                COALESCE(vendor, '') as vendor,
		                COALESCE(host_sys_id, '') as host_sys_id,
		                COALESCE(listen_port, 0) as listen_port,
		                COALESCE(install_path, '') as install_path
		         FROM app_instances
		         WHERE sgc_synced = FALSE
		         ORDER BY last_observed DESC
		         LIMIT $1`
	case "integrations":
		query = `SELECT id::text, source_app, target_app, integration_type,
		                COALESCE(port, 0) as port,
		                classification_confidence as confidence
		         FROM classified_integrations
		         WHERE sgc_synced = FALSE
		         ORDER BY last_seen DESC
		         LIMIT $1`
	case "cloud_services":
		query = `SELECT id::text, name, COALESCE(service_type, '') as service_type,
		                COALESCE(provider_name, '') as provider_name,
		                COALESCE(fqdn, '') as fqdn,
		                COALESCE(ip_address, '') as ip_address,
		                COALESCE(region, '') as region,
		                COALESCE(account_id, '') as account_id
		         FROM cloud_services
		         WHERE sgc_synced = FALSE
		         ORDER BY last_observed DESC
		         LIMIT $1`
	case "medical_devices":
		query = `SELECT id::text, name, COALESCE(manufacturer, '') as manufacturer,
		                COALESCE(model_number, '') as model_number,
		                COALESCE(serial_number, '') as serial_number,
		                COALESCE(ip_address, '') as ip_address,
		                COALESCE(mac_address, '') as mac_address,
		                COALESCE(device_class, '') as device_class,
		                COALESCE(fda_classification, '') as fda_classification,
		                COALESCE(operating_system, '') as operating_system
		         FROM medical_devices
		         WHERE sgc_synced = FALSE
		         ORDER BY last_observed DESC
		         LIMIT $1`
	default:
		return nil, fmt.Errorf("unknown SGC record type: %s", recordType)
	}

	rows, err := s.pool.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("query unsynced %s: %w", recordType, err)
	}
	defer rows.Close()

	fieldDescriptions := rows.FieldDescriptions()
	var results []map[string]interface{}

	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			return nil, fmt.Errorf("scan %s row: %w", recordType, err)
		}

		record := make(map[string]interface{}, len(fieldDescriptions))
		for i, fd := range fieldDescriptions {
			record[string(fd.Name)] = values[i]
		}
		results = append(results, record)
	}

	return results, rows.Err()
}

// MarkSGCRecordSynced marks a record as synced via the Service Graph Connector
// and stores the ServiceNow sys_id.
func (s *Store) MarkSGCRecordSynced(ctx context.Context, recordType, id, sysID string) error {
	var query string
	switch recordType {
	case "server":
		query = `UPDATE agents SET sgc_synced = TRUE, sgc_sys_id = $1 WHERE id = $2::uuid`
	case "app_instance":
		query = `UPDATE app_instances SET sgc_synced = TRUE, sgc_sys_id = $1 WHERE id = $2::uuid`
	case "integration":
		query = `UPDATE classified_integrations SET sgc_synced = TRUE, sgc_sys_id = $1 WHERE id = $2::uuid`
	case "cloud_service":
		query = `UPDATE cloud_services SET sgc_synced = TRUE, sgc_sys_id = $1 WHERE id = $2::uuid`
	case "medical_device":
		query = `UPDATE medical_devices SET sgc_synced = TRUE, sgc_sys_id = $1 WHERE id = $2::uuid`
	default:
		return fmt.Errorf("unknown SGC record type: %s", recordType)
	}

	_, err := s.pool.Exec(ctx, query, sysID, id)
	return err
}

// GetSGCExportRecords retrieves records modified since the given timestamp for
// the SGC pull-based export API. Returns generic maps with a "record_type"
// field so the export handler can route to the correct mapping function.
// Supports cursor-based pagination; cursor is the last id from the previous page.
func (s *Store) GetSGCExportRecords(ctx context.Context, ciType string, since time.Time, limit int, cursor string) ([]map[string]interface{}, string, error) {
	types := []string{"server", "app_instance", "integration", "cloud_service", "medical_device"}
	if ciType != "" {
		types = []string{ciType}
	}

	var allRecords []map[string]interface{}

	for _, rt := range types {
		records, err := s.getSGCExportByType(ctx, rt, since, limit, cursor)
		if err != nil {
			s.logger.Warn("SGC export query failed for type", zap.String("type", rt), zap.Error(err))
			continue
		}
		allRecords = append(allRecords, records...)
	}

	// Trim to limit and compute next cursor.
	nextCursor := ""
	if len(allRecords) > limit {
		allRecords = allRecords[:limit]
	}
	if len(allRecords) == limit {
		if lastID, ok := allRecords[len(allRecords)-1]["id"].(string); ok {
			nextCursor = lastID
		}
	}

	return allRecords, nextCursor, nil
}

// getSGCExportByType queries a single table for export records.
func (s *Store) getSGCExportByType(ctx context.Context, recordType string, since time.Time, limit int, cursor string) ([]map[string]interface{}, error) {
	var baseQuery string
	switch recordType {
	case "server":
		baseQuery = `SELECT id::text, agent_id, hostname, os_type,
		                    COALESCE(ip_address, '') as ip_address,
		                    COALESCE(serial_number, '') as serial_number,
		                    'server' as record_type
		             FROM agents WHERE last_heartbeat >= $1`
	case "app_instance":
		baseQuery = `SELECT id::text, name, COALESCE(version, '') as version,
		                    COALESCE(host_sys_id, '') as host_sys_id,
		                    'app_instance' as record_type
		             FROM app_instances WHERE last_observed >= $1`
	case "integration":
		baseQuery = `SELECT id::text, source_app, target_app, integration_type,
		                    COALESCE(port, 0) as port,
		                    classification_confidence as confidence,
		                    'integration' as record_type
		             FROM classified_integrations WHERE last_seen >= $1`
	case "cloud_service":
		baseQuery = `SELECT id::text, name, COALESCE(service_type, '') as service_type,
		                    COALESCE(provider_name, '') as provider_name,
		                    COALESCE(fqdn, '') as fqdn,
		                    'cloud_service' as record_type
		             FROM cloud_services WHERE last_observed >= $1`
	case "medical_device":
		baseQuery = `SELECT id::text, name, COALESCE(manufacturer, '') as manufacturer,
		                    COALESCE(serial_number, '') as serial_number,
		                    COALESCE(ip_address, '') as ip_address,
		                    'medical_device' as record_type
		             FROM medical_devices WHERE last_observed >= $1`
	default:
		return nil, fmt.Errorf("unknown export type: %s", recordType)
	}

	if cursor != "" {
		baseQuery += " AND id > $3::uuid"
	}
	baseQuery += " ORDER BY id LIMIT $2"

	var args []interface{}
	if cursor != "" {
		args = []interface{}{since, limit, cursor}
	} else {
		args = []interface{}{since, limit}
	}

	rows, err := s.pool.Query(ctx, baseQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	fieldDescs := rows.FieldDescriptions()
	var results []map[string]interface{}
	for rows.Next() {
		vals, err := rows.Values()
		if err != nil {
			return nil, err
		}
		record := make(map[string]interface{}, len(fieldDescs))
		for i, fd := range fieldDescs {
			record[string(fd.Name)] = vals[i]
		}
		results = append(results, record)
	}
	return results, rows.Err()
}
