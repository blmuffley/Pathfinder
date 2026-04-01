package sgc

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"go.uber.org/zap"

	"github.com/blmuffley/Pathfinder/src/gateway/internal/store"
)

// Config holds SGC publisher configuration.
type Config struct {
	InstanceURL   string        `yaml:"instance_url"`
	ClientID      string        `yaml:"client_id"`
	ClientSecret  string        `yaml:"client_secret"`
	SyncInterval  time.Duration `yaml:"sync_interval"`
	BatchSize     int           `yaml:"batch_size"`
	Enabled       bool          `yaml:"enabled"`
	RetryAttempts int           `yaml:"retry_attempts"`
	RetryDelay    time.Duration `yaml:"retry_delay"`
}

// Publisher pushes discovered CIs to ServiceNow via the IRE API.
type Publisher struct {
	config     Config
	store      *store.Store
	httpClient *http.Client
	logger     *zap.Logger

	mu          sync.Mutex
	accessToken string
	tokenExpiry time.Time
}

// NewPublisher creates an SGC publisher that syncs CIs to ServiceNow's IRE.
func NewPublisher(config Config, store *store.Store, logger *zap.Logger) *Publisher {
	if config.BatchSize <= 0 {
		config.BatchSize = 100
	}
	if config.SyncInterval <= 0 {
		config.SyncInterval = 60 * time.Second
	}
	if config.RetryAttempts <= 0 {
		config.RetryAttempts = 3
	}
	if config.RetryDelay <= 0 {
		config.RetryDelay = 5 * time.Second
	}

	return &Publisher{
		config:     config,
		store:      store,
		httpClient: &http.Client{Timeout: 30 * time.Second},
		logger:     logger,
	}
}

// Run starts the periodic sync loop. Blocks until ctx is cancelled.
func (p *Publisher) Run(ctx context.Context) error {
	if !p.config.Enabled {
		p.logger.Info("SGC publisher disabled")
		return nil
	}

	ticker := time.NewTicker(p.config.SyncInterval)
	defer ticker.Stop()

	p.logger.Info("SGC publisher started",
		zap.String("instance", p.config.InstanceURL),
		zap.Duration("interval", p.config.SyncInterval),
		zap.Int("batch_size", p.config.BatchSize),
	)

	for {
		select {
		case <-ctx.Done():
			p.logger.Info("SGC publisher stopped")
			return ctx.Err()
		case <-ticker.C:
			p.syncAll(ctx)
		}
	}
}

// syncAll runs all sync functions in sequence, logging errors without stopping.
func (p *Publisher) syncAll(ctx context.Context) {
	syncFns := []struct {
		name string
		fn   func(context.Context) error
	}{
		{"servers", p.syncServers},
		{"app_instances", p.syncAppInstances},
		{"integrations", p.syncIntegrations},
		{"cloud_services", p.syncCloudServices},
		{"medical_devices", p.syncMedicalDevices},
	}

	for _, sf := range syncFns {
		if err := sf.fn(ctx); err != nil {
			p.logger.Error("SGC sync failed",
				zap.String("type", sf.name),
				zap.Error(err),
			)
		}
	}
}

// syncServers fetches unsynced server records and publishes them to the IRE.
func (p *Publisher) syncServers(ctx context.Context) error {
	rows, err := p.store.GetUnsyncedSGCRecords(ctx, "servers", p.config.BatchSize)
	if err != nil {
		return fmt.Errorf("get unsynced servers: %w", err)
	}
	if len(rows) == 0 {
		return nil
	}

	p.logger.Info("syncing servers to IRE", zap.Int("count", len(rows)))

	batches := splitIntoBatches(rows, p.config.BatchSize)
	for _, batch := range batches {
		payload := p.buildIREPayload("cmdb_ci_server", batch)
		resp, err := p.postToIREWithRetry(ctx, payload)
		if err != nil {
			return fmt.Errorf("post servers to IRE: %w", err)
		}
		p.processIREResponse(ctx, "server", batch, resp)
	}

	return nil
}

// syncAppInstances fetches unsynced application instances and publishes them to the IRE.
func (p *Publisher) syncAppInstances(ctx context.Context) error {
	rows, err := p.store.GetUnsyncedSGCRecords(ctx, "app_instances", p.config.BatchSize)
	if err != nil {
		return fmt.Errorf("get unsynced app instances: %w", err)
	}
	if len(rows) == 0 {
		return nil
	}

	p.logger.Info("syncing app instances to IRE", zap.Int("count", len(rows)))

	batches := splitIntoBatches(rows, p.config.BatchSize)
	for _, batch := range batches {
		payload := p.buildIREPayload("cmdb_ci_app_server", batch)
		resp, err := p.postToIREWithRetry(ctx, payload)
		if err != nil {
			return fmt.Errorf("post app instances to IRE: %w", err)
		}
		p.processIREResponse(ctx, "app_instance", batch, resp)
	}

	return nil
}

// syncIntegrations fetches unsynced integrations and publishes them as relationships to the IRE.
func (p *Publisher) syncIntegrations(ctx context.Context) error {
	rows, err := p.store.GetUnsyncedSGCRecords(ctx, "integrations", p.config.BatchSize)
	if err != nil {
		return fmt.Errorf("get unsynced integrations: %w", err)
	}
	if len(rows) == 0 {
		return nil
	}

	p.logger.Info("syncing integrations to IRE", zap.Int("count", len(rows)))

	batches := splitIntoBatches(rows, p.config.BatchSize)
	for _, batch := range batches {
		payload := p.buildIREPayload("cmdb_rel_ci", batch)
		resp, err := p.postToIREWithRetry(ctx, payload)
		if err != nil {
			return fmt.Errorf("post integrations to IRE: %w", err)
		}
		p.processIREResponse(ctx, "integration", batch, resp)
	}

	return nil
}

// syncCloudServices fetches unsynced cloud service records and publishes them to the IRE.
func (p *Publisher) syncCloudServices(ctx context.Context) error {
	rows, err := p.store.GetUnsyncedSGCRecords(ctx, "cloud_services", p.config.BatchSize)
	if err != nil {
		return fmt.Errorf("get unsynced cloud services: %w", err)
	}
	if len(rows) == 0 {
		return nil
	}

	p.logger.Info("syncing cloud services to IRE", zap.Int("count", len(rows)))

	batches := splitIntoBatches(rows, p.config.BatchSize)
	for _, batch := range batches {
		payload := p.buildIREPayload("cmdb_ci_cloud_service", batch)
		resp, err := p.postToIREWithRetry(ctx, payload)
		if err != nil {
			return fmt.Errorf("post cloud services to IRE: %w", err)
		}
		p.processIREResponse(ctx, "cloud_service", batch, resp)
	}

	return nil
}

// syncMedicalDevices fetches unsynced medical device records and publishes them to the IRE.
func (p *Publisher) syncMedicalDevices(ctx context.Context) error {
	rows, err := p.store.GetUnsyncedSGCRecords(ctx, "medical_devices", p.config.BatchSize)
	if err != nil {
		return fmt.Errorf("get unsynced medical devices: %w", err)
	}
	if len(rows) == 0 {
		return nil
	}

	p.logger.Info("syncing medical devices to IRE", zap.Int("count", len(rows)))

	batches := splitIntoBatches(rows, p.config.BatchSize)
	for _, batch := range batches {
		payload := p.buildIREPayload("cmdb_ci_medical_device", batch)
		resp, err := p.postToIREWithRetry(ctx, payload)
		if err != nil {
			return fmt.Errorf("post medical devices to IRE: %w", err)
		}
		p.processIREResponse(ctx, "medical_device", batch, resp)
	}

	return nil
}

// buildIREPayload constructs an IRE-formatted payload from a set of generic record maps.
// The ciClass parameter determines how each record is mapped.
func (p *Publisher) buildIREPayload(ciClass string, items []map[string]interface{}) *IREPayload {
	payload := &IREPayload{
		Items:     make([]IREItem, 0, len(items)),
		Relations: make([]IRERelation, 0),
	}

	for _, item := range items {
		switch ciClass {
		case "cmdb_ci_server":
			agent := mapToAgentRecord(item)
			payload.Items = append(payload.Items, ServerToIREItem(agent))

		case "cmdb_ci_app_server":
			app := mapToAppRecord(item)
			payload.Items = append(payload.Items, AppInstanceToIREItem(app))

		case "cmdb_rel_ci":
			integ := mapToIntegrationRecord(item)
			payload.Relations = append(payload.Relations, IntegrationToIRERelation(integ))

		case "cmdb_ci_cloud_service":
			svc := mapToCloudServiceRecord(item)
			payload.Items = append(payload.Items, CloudServiceToIREItem(svc))

		case "cmdb_ci_medical_device":
			dev := mapToMedicalDeviceRecord(item)
			payload.Items = append(payload.Items, MedicalDeviceToIREItem(dev))
		}
	}

	return payload
}

// postToIRE sends a single IRE payload to ServiceNow.
func (p *Publisher) postToIRE(ctx context.Context, payload *IREPayload) (*IREResponse, error) {
	if err := p.authenticate(ctx); err != nil {
		return nil, fmt.Errorf("authenticate: %w", err)
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal IRE payload: %w", err)
	}

	instanceURL := strings.TrimRight(p.config.InstanceURL, "/")
	req, err := http.NewRequestWithContext(ctx, "POST", instanceURL+"/api/now/identifyreconcile", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create IRE request: %w", err)
	}

	p.mu.Lock()
	req.Header.Set("Authorization", "Bearer "+p.accessToken)
	p.mu.Unlock()
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("IRE request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read IRE response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("IRE returned HTTP %d: %s", resp.StatusCode, truncate(string(respBody), 500))
	}

	var ireResp IREResponse
	if err := json.Unmarshal(respBody, &ireResp); err != nil {
		return nil, fmt.Errorf("decode IRE response: %w", err)
	}

	return &ireResp, nil
}

// postToIREWithRetry wraps postToIRE with configurable retry logic.
func (p *Publisher) postToIREWithRetry(ctx context.Context, payload *IREPayload) (*IREResponse, error) {
	var lastErr error
	for attempt := 0; attempt < p.config.RetryAttempts; attempt++ {
		if attempt > 0 {
			p.logger.Warn("retrying IRE request",
				zap.Int("attempt", attempt+1),
				zap.Error(lastErr),
			)
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(p.config.RetryDelay * time.Duration(attempt)):
			}
		}

		resp, err := p.postToIRE(ctx, payload)
		if err == nil {
			return resp, nil
		}
		lastErr = err
	}
	return nil, fmt.Errorf("IRE request failed after %d attempts: %w", p.config.RetryAttempts, lastErr)
}

// authenticate performs OAuth2 client credentials flow against ServiceNow.
func (p *Publisher) authenticate(ctx context.Context) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	// Return cached token if still valid.
	if p.accessToken != "" && time.Now().Before(p.tokenExpiry) {
		return nil
	}

	instanceURL := strings.TrimRight(p.config.InstanceURL, "/")

	form := url.Values{
		"grant_type":    {"client_credentials"},
		"client_id":     {p.config.ClientID},
		"client_secret": {p.config.ClientSecret},
	}

	req, err := http.NewRequestWithContext(ctx, "POST", instanceURL+"/oauth_token.do", strings.NewReader(form.Encode()))
	if err != nil {
		return fmt.Errorf("create token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("token request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("token request failed (%d): %s", resp.StatusCode, string(body))
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return fmt.Errorf("decode token response: %w", err)
	}

	p.accessToken = tokenResp.AccessToken
	// Refresh 60 seconds before actual expiry.
	p.tokenExpiry = time.Now().Add(time.Duration(tokenResp.ExpiresIn-60) * time.Second)

	p.logger.Info("SGC OAuth token acquired",
		zap.Int("expires_in", tokenResp.ExpiresIn),
	)

	return nil
}

// processIREResponse logs results and marks records as synced in the store.
func (p *Publisher) processIREResponse(ctx context.Context, entityType string, records []map[string]interface{}, resp *IREResponse) {
	for i, result := range resp.Result.Items {
		if result.Error != "" {
			p.logger.Error("IRE item error",
				zap.String("entity_type", entityType),
				zap.String("class", result.ClassName),
				zap.String("error", result.Error),
			)
			if i < len(records) {
				if id, ok := records[i]["id"].(string); ok {
					p.store.InsertSyncLog(ctx, entityType, id, "", result.Operation, "error", result.Error)
				}
			}
			continue
		}

		p.logger.Info("IRE item synced",
			zap.String("entity_type", entityType),
			zap.String("sys_id", result.SysID),
			zap.String("class", result.ClassName),
			zap.String("operation", result.Operation),
		)

		if i < len(records) {
			if id, ok := records[i]["id"].(string); ok {
				if err := p.store.MarkSGCRecordSynced(ctx, entityType, id, result.SysID); err != nil {
					p.logger.Error("failed to mark record synced",
						zap.String("entity_type", entityType),
						zap.String("id", id),
						zap.Error(err),
					)
				}
				p.store.InsertSyncLog(ctx, entityType, id, result.SysID, result.Operation, "success", "")
			}
		}
	}
}

// --- helpers ---

// splitIntoBatches divides a slice of records into chunks of at most batchSize.
func splitIntoBatches(items []map[string]interface{}, batchSize int) [][]map[string]interface{} {
	if batchSize <= 0 {
		batchSize = 100
	}
	var batches [][]map[string]interface{}
	for i := 0; i < len(items); i += batchSize {
		end := i + batchSize
		if end > len(items) {
			end = len(items)
		}
		batches = append(batches, items[i:end])
	}
	return batches
}

// truncate shortens a string to at most maxLen characters.
func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

// mapToAgentRecord converts a generic map (from store) to an AgentRecord.
func mapToAgentRecord(m map[string]interface{}) AgentRecord {
	r := AgentRecord{}
	if v, ok := m["id"].(string); ok {
		r.ID = v
	}
	if v, ok := m["agent_id"].(string); ok {
		r.AgentID = v
	}
	if v, ok := m["hostname"].(string); ok {
		r.Hostname = v
	}
	if v, ok := m["os_type"].(string); ok {
		r.OSType = v
	}
	if v, ok := m["ip_address"].(string); ok {
		r.IPAddress = v
	}
	if v, ok := m["serial_number"].(string); ok {
		r.SerialNumber = v
	}
	if v, ok := m["cpu_count"].(int); ok {
		r.CPUCount = v
	}
	if v, ok := m["ram_mb"].(int); ok {
		r.RAMMb = v
	}
	return r
}

// mapToAppRecord converts a generic map to an AppRecord.
func mapToAppRecord(m map[string]interface{}) AppRecord {
	r := AppRecord{}
	if v, ok := m["id"].(string); ok {
		r.ID = v
	}
	if v, ok := m["name"].(string); ok {
		r.Name = v
	}
	if v, ok := m["version"].(string); ok {
		r.Version = v
	}
	if v, ok := m["vendor"].(string); ok {
		r.Vendor = v
	}
	if v, ok := m["host_sys_id"].(string); ok {
		r.HostSysID = v
	}
	if v, ok := m["listen_port"].(int); ok {
		r.ListenPort = v
	}
	if v, ok := m["install_path"].(string); ok {
		r.InstallPath = v
	}
	return r
}

// mapToIntegrationRecord converts a generic map to an IntegrationRecord.
func mapToIntegrationRecord(m map[string]interface{}) IntegrationRecord {
	r := IntegrationRecord{}
	if v, ok := m["id"].(string); ok {
		r.ID = v
	}
	if v, ok := m["source_app"].(string); ok {
		r.SourceApp = v
	}
	if v, ok := m["target_app"].(string); ok {
		r.TargetApp = v
	}
	if v, ok := m["integration_type"].(string); ok {
		r.IntegrationType = v
	}
	if v, ok := m["port"].(int); ok {
		r.Port = v
	}
	if v, ok := m["confidence"].(float64); ok {
		r.Confidence = v
	}
	return r
}

// mapToCloudServiceRecord converts a generic map to a CloudServiceRecord.
func mapToCloudServiceRecord(m map[string]interface{}) CloudServiceRecord {
	r := CloudServiceRecord{}
	if v, ok := m["id"].(string); ok {
		r.ID = v
	}
	if v, ok := m["name"].(string); ok {
		r.Name = v
	}
	if v, ok := m["service_type"].(string); ok {
		r.ServiceType = v
	}
	if v, ok := m["provider_name"].(string); ok {
		r.ProviderName = v
	}
	if v, ok := m["fqdn"].(string); ok {
		r.FQDN = v
	}
	if v, ok := m["ip_address"].(string); ok {
		r.IPAddress = v
	}
	if v, ok := m["region"].(string); ok {
		r.Region = v
	}
	if v, ok := m["account_id"].(string); ok {
		r.AccountID = v
	}
	return r
}

// mapToMedicalDeviceRecord converts a generic map to a MedicalDeviceRecord.
func mapToMedicalDeviceRecord(m map[string]interface{}) MedicalDeviceRecord {
	r := MedicalDeviceRecord{}
	if v, ok := m["id"].(string); ok {
		r.ID = v
	}
	if v, ok := m["name"].(string); ok {
		r.Name = v
	}
	if v, ok := m["manufacturer"].(string); ok {
		r.Manufacturer = v
	}
	if v, ok := m["model_number"].(string); ok {
		r.ModelNumber = v
	}
	if v, ok := m["serial_number"].(string); ok {
		r.SerialNumber = v
	}
	if v, ok := m["ip_address"].(string); ok {
		r.IPAddress = v
	}
	if v, ok := m["mac_address"].(string); ok {
		r.MACAddress = v
	}
	if v, ok := m["device_class"].(string); ok {
		r.DeviceClass = v
	}
	if v, ok := m["fda_classification"].(string); ok {
		r.FDAClassification = v
	}
	if v, ok := m["operating_system"].(string); ok {
		r.OperatingSystem = v
	}
	return r
}
