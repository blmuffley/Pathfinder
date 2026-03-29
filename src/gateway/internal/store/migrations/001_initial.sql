-- Pathfinder Gateway — Initial Schema Migration
-- Version: 001
-- Description: Core tables for agent management, flow capture, classification, and SN sync.

BEGIN;

-- ============================================================================
-- Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ============================================================================
-- Table: agents
-- Tracks enrolled Pathfinder agents and their heartbeat status.
-- ============================================================================
CREATE TABLE agents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        VARCHAR(64) UNIQUE NOT NULL,
    hostname        VARCHAR(255) NOT NULL,
    os_type         VARCHAR(20) NOT NULL CHECK (os_type IN ('linux', 'windows', 'k8s')),
    agent_version   VARCHAR(50) NOT NULL,
    enrolled_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_heartbeat  TIMESTAMPTZ,
    status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'stale', 'decommissioned')),
    sn_sys_id       VARCHAR(32)
);

CREATE INDEX idx_agents_status ON agents (status);
CREATE INDEX idx_agents_last_heartbeat ON agents (last_heartbeat);

-- ============================================================================
-- Table: raw_flows
-- Raw network flow records as captured by agents.
-- Partitioned by captured_at (monthly) for retention management.
-- ============================================================================
CREATE TABLE raw_flows (
    id              BIGSERIAL,
    agent_id        VARCHAR(64) NOT NULL REFERENCES agents(agent_id),
    src_ip          INET NOT NULL,
    src_port        INTEGER NOT NULL,
    dst_ip          INET NOT NULL,
    dst_port        INTEGER NOT NULL,
    protocol        VARCHAR(10) NOT NULL,
    bytes_sent      BIGINT DEFAULT 0,
    bytes_received  BIGINT DEFAULT 0,
    process_name    VARCHAR(255),
    process_pid     INTEGER,
    captured_at     TIMESTAMPTZ NOT NULL,
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    classified      BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (id, captured_at)
) PARTITION BY RANGE (captured_at);

-- Create initial partitions (3 months)
CREATE TABLE raw_flows_2026_01 PARTITION OF raw_flows
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE raw_flows_2026_02 PARTITION OF raw_flows
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE raw_flows_2026_03 PARTITION OF raw_flows
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE raw_flows_2026_04 PARTITION OF raw_flows
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE raw_flows_2026_05 PARTITION OF raw_flows
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE raw_flows_2026_06 PARTITION OF raw_flows
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE INDEX idx_raw_flows_agent_captured ON raw_flows (agent_id, captured_at);
CREATE INDEX idx_raw_flows_dst ON raw_flows (dst_ip, dst_port);
CREATE INDEX idx_raw_flows_unclassified ON raw_flows (classified) WHERE classified = FALSE;

-- ============================================================================
-- Table: classified_integrations
-- Aggregated integration records: one per unique (source_app, target_app) pair.
-- ============================================================================
CREATE TABLE classified_integrations (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_app                  VARCHAR(255) NOT NULL,
    target_app                  VARCHAR(255) NOT NULL,
    integration_type            VARCHAR(50) NOT NULL,
    classification_confidence   DECIMAL(3,2) NOT NULL CHECK (classification_confidence BETWEEN 0 AND 1),
    first_seen                  TIMESTAMPTZ NOT NULL,
    last_seen                   TIMESTAMPTZ NOT NULL,
    flow_count                  BIGINT NOT NULL DEFAULT 0,
    synced_to_sn                BOOLEAN NOT NULL DEFAULT FALSE,
    sn_sys_id                   VARCHAR(32),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_app, target_app)
);

CREATE INDEX idx_classified_integrations_sync ON classified_integrations (synced_to_sn) WHERE synced_to_sn = FALSE;
CREATE INDEX idx_classified_integrations_last_seen ON classified_integrations (last_seen);

-- ============================================================================
-- Table: classified_interfaces
-- Specific data exchange pathways within an integration.
-- ============================================================================
CREATE TABLE classified_interfaces (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id  UUID NOT NULL REFERENCES classified_integrations(id) ON DELETE CASCADE,
    protocol        VARCHAR(20) NOT NULL,
    port            INTEGER NOT NULL,
    direction       VARCHAR(20) NOT NULL CHECK (direction IN ('Inbound', 'Outbound', 'Bidirectional')),
    pattern         VARCHAR(30),
    process_name    VARCHAR(255),
    avg_bytes       BIGINT DEFAULT 0,
    flow_count      BIGINT NOT NULL DEFAULT 0,
    first_seen      TIMESTAMPTZ NOT NULL,
    last_seen       TIMESTAMPTZ NOT NULL,
    synced_to_sn    BOOLEAN NOT NULL DEFAULT FALSE,
    sn_sys_id       VARCHAR(32),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (integration_id, protocol, port, direction)
);

CREATE INDEX idx_classified_interfaces_integration ON classified_interfaces (integration_id);
CREATE INDEX idx_classified_interfaces_sync ON classified_interfaces (synced_to_sn) WHERE synced_to_sn = FALSE;

-- ============================================================================
-- Table: health_metrics
-- Time-series health telemetry for integrations and interfaces.
-- Partitioned by recorded_at (monthly).
-- ============================================================================
CREATE TABLE health_metrics (
    id              BIGSERIAL,
    integration_id  UUID REFERENCES classified_integrations(id) ON DELETE SET NULL,
    interface_id    UUID REFERENCES classified_interfaces(id) ON DELETE SET NULL,
    metric_type     VARCHAR(30) NOT NULL CHECK (metric_type IN ('Latency', 'Throughput', 'ErrorRate', 'Availability')),
    metric_value    DECIMAL(12,4) NOT NULL,
    recorded_at     TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

-- Create initial partitions
CREATE TABLE health_metrics_2026_01 PARTITION OF health_metrics
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE health_metrics_2026_02 PARTITION OF health_metrics
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE health_metrics_2026_03 PARTITION OF health_metrics
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE health_metrics_2026_04 PARTITION OF health_metrics
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE health_metrics_2026_05 PARTITION OF health_metrics
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE health_metrics_2026_06 PARTITION OF health_metrics
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE INDEX idx_health_metrics_integration ON health_metrics (integration_id, recorded_at);
CREATE INDEX idx_health_metrics_interface ON health_metrics (interface_id, recorded_at);

-- ============================================================================
-- Table: sn_sync_log
-- Audit log of all sync operations to ServiceNow.
-- ============================================================================
CREATE TABLE sn_sync_log (
    id              BIGSERIAL PRIMARY KEY,
    entity_type     VARCHAR(50) NOT NULL CHECK (entity_type IN ('integration', 'interface', 'agent', 'health_log')),
    entity_id       UUID NOT NULL,
    sn_sys_id       VARCHAR(32),
    operation       VARCHAR(20) NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
    status          VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    error_message   TEXT,
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sn_sync_log_entity ON sn_sync_log (entity_type, entity_id);
CREATE INDEX idx_sn_sync_log_status ON sn_sync_log (status) WHERE status = 'failed';

-- ============================================================================
-- Function: update_updated_at
-- Auto-update the updated_at timestamp on row modification.
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_classified_integrations_updated
    BEFORE UPDATE ON classified_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_classified_interfaces_updated
    BEFORE UPDATE ON classified_interfaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMIT;
