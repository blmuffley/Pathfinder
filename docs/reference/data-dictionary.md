# Avennorth Pathfinder — Data Dictionary

## ServiceNow Tables (6)

### x_avnth_cmdb_ci_integration (extends cmdb_ci)

Integration CI — one record per unique directed (source, target) pair.

| Field | Type | Mandatory | Default | Constraint | Description |
|-------|------|-----------|---------|------------|-------------|
| source_ci | reference → cmdb_ci | Yes | | | Source application |
| target_ci | reference → cmdb_ci | Yes | | | Target application |
| integration_type | choice | Yes | | API, Database, File Transfer, Messaging, Email, Directory, Remote Access, Custom | Auto-classified type |
| classification_confidence | decimal(3,2) | | | 0.00-1.00 | Gateway confidence score |
| discovery_method | choice | Yes | Pathfinder | Pathfinder, Manual, Import | How discovered |
| first_discovered | glide_date_time | | | | First flow observation |
| last_observed | glide_date_time | | | | Most recent flow |
| flow_count | integer | | 0 | | Total flows across all interfaces |
| health_status | choice | | Unknown | Healthy, Degraded, Critical, Unknown | Derived from health_score |
| health_score | integer | | | 0-100 | Composite weighted score |
| ai_summary | string(4000) | | | | Claude-generated summary |
| ea_status | choice | | Unmapped | Mapped, Unmapped, Disputed | EA reconciliation state |
| ea_relationship | reference → cmdb_rel_ci | | | | Link to EA record |
| criticality | choice | | Unknown | Critical, High, Medium, Low, Unknown | Business criticality |
| data_classification | choice | | | Public, Internal, Confidential, Restricted | Data sensitivity |
| owner | reference → sys_user | | | | Integration owner |
| support_group | reference → sys_user_group | | | | Responsible team |

**Unique constraint:** (source_ci, target_ci)

### x_avnth_cmdb_ci_interface (extends cmdb_ci)

Interface CI — specific data exchange pathway within an integration. 1:M child of Integration CI.

| Field | Type | Mandatory | Default | Constraint | Description |
|-------|------|-----------|---------|------------|-------------|
| integration | reference → x_avnth_cmdb_ci_integration | Yes | | | Parent integration |
| protocol | choice | Yes | | TCP, UDP, HTTP, HTTPS, gRPC, AMQP, MQTT | Transport protocol |
| port | integer | Yes | | | Destination port |
| direction | choice | Yes | | Inbound, Outbound, Bidirectional | Flow direction |
| pattern | choice | | | Request-Reply, Fire-and-Forget, Pub-Sub, Batch, Streaming | Communication pattern |
| data_format | choice | | | JSON, XML, Binary, CSV, Protobuf, Avro, Unknown | Payload format |
| process_name | string(255) | | | | Source process name |
| avg_bytes_per_flow | integer | | | | Average payload size |
| flow_count | integer | | 0 | | Flows for this interface |
| first_discovered | glide_date_time | | | | |
| last_observed | glide_date_time | | | | |
| latency_p50_ms | decimal | | | | Median latency |
| latency_p99_ms | decimal | | | | 99th percentile latency |
| error_rate | decimal(3,2) | | | 0.00-1.00 | Observed error rate |

**Unique constraint:** (integration, protocol, port, direction)

### x_avnth_integration_health_log

Time-series health telemetry.

| Field | Type | Mandatory | Default | Description |
|-------|------|-----------|---------|-------------|
| integration | reference → integration CI | Yes | | Parent integration |
| interface | reference → interface CI | | | Optional (null = integration-level) |
| metric_type | choice | Yes | | Latency, Throughput, ErrorRate, Availability |
| metric_value | decimal | Yes | | Measured value |
| unit | string(20) | | | ms, bytes/s, percent, requests/s |
| recorded_at | glide_date_time | Yes | | Measurement timestamp |
| source | choice | | Agent | Agent, Gateway, Synthetic |

### x_avnth_coverage_gap

Coverage gap remediation tracker.

| Field | Type | Mandatory | Default | Description |
|-------|------|-----------|---------|-------------|
| server | reference → cmdb_ci_server | Yes | | Server missing coverage |
| gap_type | choice | Yes | | NoAgent, StaleAgent, WrongTier |
| required_tier | integer | | | Expected tier |
| current_tier | integer | | 0 | Actual tier (0=none) |
| detected_at | glide_date_time | Yes | | Detection time |
| remediation_status | choice | Yes | Open | Open, InProgress, Resolved, Waived, Failed |
| remediation_method | choice | | | AutoDeploy, ManualDeploy, ChangeRequest, Waived |
| remediation_cr | reference → change_request | | | Associated CR |
| resolved_at | glide_date_time | | | Resolution time |
| waived_by | reference → sys_user | | | Who waived |
| waive_reason | string(500) | | | Waiver justification |
| priority | choice | | Medium | Critical, High, Medium, Low |

### x_avnth_pathfinder_agent

Agent inventory with heartbeat tracking.

| Field | Type | Mandatory | Unique | Default | Description |
|-------|------|-----------|--------|---------|-------------|
| agent_id | string(64) | Yes | Yes | | UUID from enrollment |
| hostname | string(255) | Yes | | | Agent hostname |
| server | reference → cmdb_ci_server | | | | Linked CMDB server |
| os_type | choice | Yes | | | Linux, Windows, Kubernetes |
| agent_version | string(50) | Yes | | | Semantic version |
| last_heartbeat | glide_date_time | | | | Last heartbeat time |
| status | choice | Yes | | Active | Active, Stale, Decommissioned |
| deployment_model | choice | | | | Standalone, Managed, SaaS |
| coverage_tier | integer | | | 2 | 0-4 (None through Full) |
| enrolled_at | glide_date_time | Yes | | | Enrollment time |
| flows_collected | integer | | | 0 | Total flows collected |

### x_avnth_integration_ea_map

EA reconciliation matches.

| Field | Type | Mandatory | Default | Description |
|-------|------|-----------|---------|-------------|
| integration | reference → integration CI | Yes | | Discovered integration |
| ea_relationship | reference → cmdb_rel_ci | Yes | | EA relationship record |
| mapping_status | choice | Yes | Suggested | Confirmed, Suggested, Rejected |
| confidence | decimal(3,2) | | | 0.00-1.00 match confidence |
| mapped_by | reference → sys_user | | | Who confirmed/rejected |
| mapped_at | glide_date_time | | | When confirmed/rejected |
| match_reason | string(1000) | | | Why the match was suggested |

---

## PostgreSQL Tables (6)

### agents

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Internal ID |
| agent_id | VARCHAR(64) | UNIQUE NOT NULL | Enrollment UUID |
| hostname | VARCHAR(255) | NOT NULL | |
| os_type | VARCHAR(20) | NOT NULL, CHECK (linux/windows/k8s) | |
| agent_version | VARCHAR(50) | NOT NULL | |
| enrolled_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| last_heartbeat | TIMESTAMPTZ | | |
| status | VARCHAR(20) | NOT NULL DEFAULT 'active' | active, stale, decommissioned |
| sn_sys_id | VARCHAR(32) | | ServiceNow sys_id after sync |

### raw_flows (partitioned by captured_at, monthly)

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | BIGSERIAL | PK (with captured_at) | |
| agent_id | VARCHAR(64) | NOT NULL, FK → agents | |
| src_ip | INET | NOT NULL | |
| src_port | INTEGER | NOT NULL | |
| dst_ip | INET | NOT NULL | |
| dst_port | INTEGER | NOT NULL | |
| protocol | VARCHAR(10) | NOT NULL | tcp, udp |
| bytes_sent | BIGINT | DEFAULT 0 | |
| bytes_received | BIGINT | DEFAULT 0 | |
| process_name | VARCHAR(255) | | |
| process_pid | INTEGER | | |
| captured_at | TIMESTAMPTZ | NOT NULL | |
| ingested_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| classified | BOOLEAN | NOT NULL DEFAULT FALSE | |

### classified_integrations

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | UUID | PK | |
| source_app | VARCHAR(255) | NOT NULL | |
| target_app | VARCHAR(255) | NOT NULL | |
| integration_type | VARCHAR(50) | NOT NULL | |
| classification_confidence | DECIMAL(3,2) | NOT NULL, 0-1 | |
| first_seen | TIMESTAMPTZ | NOT NULL | |
| last_seen | TIMESTAMPTZ | NOT NULL | |
| flow_count | BIGINT | NOT NULL DEFAULT 0 | |
| synced_to_sn | BOOLEAN | NOT NULL DEFAULT FALSE | |
| sn_sys_id | VARCHAR(32) | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Auto-updated by trigger |

**Unique:** (source_app, target_app)

### classified_interfaces

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | UUID | PK | |
| integration_id | UUID | NOT NULL, FK → classified_integrations ON DELETE CASCADE | |
| protocol | VARCHAR(20) | NOT NULL | |
| port | INTEGER | NOT NULL | |
| direction | VARCHAR(20) | NOT NULL, CHECK (Inbound/Outbound/Bidirectional) | |
| pattern | VARCHAR(30) | | |
| process_name | VARCHAR(255) | | |
| avg_bytes | BIGINT | DEFAULT 0 | |
| flow_count | BIGINT | NOT NULL DEFAULT 0 | |
| first_seen / last_seen | TIMESTAMPTZ | | |
| synced_to_sn | BOOLEAN | NOT NULL DEFAULT FALSE | |
| sn_sys_id | VARCHAR(32) | | |

**Unique:** (integration_id, protocol, port, direction)

### health_metrics (partitioned by recorded_at, monthly)

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | BIGSERIAL | PK (with recorded_at) | |
| integration_id | UUID | FK → classified_integrations | |
| interface_id | UUID | FK → classified_interfaces | |
| metric_type | VARCHAR(30) | NOT NULL, CHECK | Latency, Throughput, ErrorRate, Availability |
| metric_value | DECIMAL(12,4) | NOT NULL | |
| recorded_at | TIMESTAMPTZ | NOT NULL | |

### sn_sync_log

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| id | BIGSERIAL | PK | |
| entity_type | VARCHAR(50) | NOT NULL | integration, interface, agent, health_log |
| entity_id | UUID | NOT NULL | |
| sn_sys_id | VARCHAR(32) | | |
| operation | VARCHAR(20) | NOT NULL | create, update, delete |
| status | VARCHAR(20) | NOT NULL | success, failed, pending |
| error_message | TEXT | | |
| synced_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | |
