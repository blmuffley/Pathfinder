# Avennorth Pathfinder — API Reference

## Service Endpoints

| Service | Port | Base URL | Auth |
|---------|------|----------|------|
| Gateway | 8443 | gRPC (protobuf) | Enrollment token (JWT) |
| Shared AI Engine | 8080 | `http://host:8080` | None (internal) |
| Integration Intelligence | 8081 | `http://host:8081` | None (internal) |
| CMDB Ops Agent | 8082 | `http://host:8082` | None (internal) |
| Service Map Intelligence | 8083 | `http://host:8083` | None (internal) |
| ServiceNow REST API | 443 | `https://instance/api/x_avnth/pathfinder/v1` | OAuth2 Bearer |

---

## 1. Gateway — gRPC Service

**Proto file:** `src/proto/pathfinder.proto`
**Service:** `pathfinder.PathfinderGateway`

### Enroll

Registers a new agent with the gateway.

```protobuf
rpc Enroll(EnrollmentRequest) returns (EnrollmentResponse);

message EnrollmentRequest {
  string enrollment_token = 1;  // JWT enrollment token
  string hostname = 2;          // Agent hostname
  string os_type = 3;           // "linux", "windows", "k8s"
  string agent_version = 4;     // Semantic version
}

message EnrollmentResponse {
  string agent_id = 1;          // UUID assigned by gateway
  string gateway_cert = 2;      // TLS cert (if mTLS enabled)
}
```

### SendFlows

Client-streaming RPC. Agent sends batches of flow records.

```protobuf
rpc SendFlows(stream FlowBatch) returns (Ack);

message FlowBatch {
  repeated FlowRecord flows = 1;
}

message FlowRecord {
  string agent_id = 1;
  string src_ip = 2;
  uint32 src_port = 3;
  string dst_ip = 4;
  uint32 dst_port = 5;
  string protocol = 6;        // "tcp", "udp"
  uint64 bytes_sent = 7;
  uint64 bytes_received = 8;
  int64  timestamp_ns = 9;
  string process_name = 10;
  uint32 process_pid = 11;
}

message Ack {
  bool success = 1;
  string message = 2;
}
```

### Heartbeat

Agent sends periodic heartbeat (every 30s).

```protobuf
rpc Heartbeat(AgentHeartbeat) returns (Ack);

message AgentHeartbeat {
  string agent_id = 1;
  string hostname = 2;
  string os_type = 3;
  string agent_version = 4;
  int64  uptime_seconds = 5;
  int64  timestamp_ns = 6;
}
```

---

## 2. Shared AI Engine (Port 8080)

### GET /health

```json
Response 200: { "status": "ok", "service": "shared-ai-engine" }
```

### POST /api/v1/analyze

Run an AI analysis on an integration.

**Request:**
```json
{
  "analysis_type": "summarize|health_score|rationalize|change_impact|classification_review",
  "integration": {
    "source_app": "Order Service",
    "target_app": "Payment Gateway",
    "integration_type": "API",
    "classification_confidence": 0.95,
    "flow_count": 48200,
    "first_discovered": "2026-01-15T00:00:00Z",
    "last_observed": "2026-03-29T12:00:00Z",
    "health_score": 92,
    "health_status": "Healthy",
    "interfaces": [
      { "protocol": "HTTPS", "port": 443, "direction": "Outbound", "pattern": "Request-Reply", "flow_count": 48200, "latency_p50_ms": 45.0, "error_rate": 0.03 }
    ],
    "health_metrics": [
      { "metric_type": "Availability", "metric_value": 99.97, "unit": "percent", "recorded_at": "2026-03-29T12:00:00Z" }
    ]
  },
  "additional_context": {}
}
```

**Response 200:**
```json
{
  "analysis_type": "summarize",
  "result": {
    "summary": "High-frequency HTTPS integration...",
    "key_findings": ["99.97% availability", "Stable latency"],
    "recommendations": ["No action needed"]
  },
  "tokens_used": 1250,
  "model": "claude-sonnet-4-20250514",
  "cached": false
}
```

**Error responses:** 400 (unsupported type), 502 (AI parse failure), 503 (AI unavailable)

### POST /api/v1/anomaly

Detect anomalies in a time series using rolling Z-score.

**Request:**
```json
{
  "metric_name": "latency_ms",
  "series": [
    { "timestamp": "2026-03-01T00:00:00Z", "value": 45.2 },
    { "timestamp": "2026-03-02T00:00:00Z", "value": 48.1 }
  ],
  "z_threshold": 2.5,
  "window_size": 20
}
```

**Response 200:**
```json
{
  "metric_name": "latency_ms",
  "total_points": 30,
  "anomaly_count": 2,
  "anomalies": [
    { "timestamp": "2026-03-28T00:00:00Z", "value": 340.0, "expected": 52.3, "z_score": 8.4, "direction": "above" }
  ],
  "mean": 55.2,
  "std_dev": 12.8,
  "has_anomalies": true
}
```

### GET /api/v1/usage

```json
Response 200: { "total_input_tokens": 45000, "total_output_tokens": 12000, "total_tokens": 57000 }
```

---

## 3. Integration Intelligence (Port 8081)

### POST /api/v1/health-score

Compute composite health score.

**Request:**
```json
{
  "metrics": [
    { "metric_type": "Availability", "metric_value": 99.95 },
    { "metric_type": "Latency", "metric_value": 80.0 },
    { "metric_type": "ErrorRate", "metric_value": 0.05 }
  ],
  "last_observed": "2026-03-29T12:00:00Z",
  "latency_baseline_ms": 100.0
}
```

**Response 200:**
```json
{
  "overall_score": 92,
  "availability_score": 100,
  "latency_score": 100,
  "error_rate_score": 100,
  "staleness_score": 100,
  "status": "Healthy",
  "explanation": "Health is Healthy."
}
```

**Scoring weights:** Availability 40%, Latency 30%, Error Rate 20%, Staleness 10%

### POST /api/v1/reconcile

Match integrations against EA relationships.

**Request:**
```json
{
  "integrations": [
    { "source_app": "App A", "target_app": "App B", "source_ci": "ci_a", "target_ci": "ci_b" }
  ],
  "ea_relationships": [
    { "parent": "ci_a", "child": "ci_b", "parent_name": "App A", "child_name": "App B", "sys_id": "ea_001" }
  ]
}
```

**Response 200:**
```json
{
  "results": {
    "App A → App B": [
      { "ea_relationship": "ea_001", "confidence": 1.0, "match_reason": "Exact match...", "mapping_status": "Suggested" }
    ]
  },
  "total_integrations": 1,
  "total_matched": 1
}
```

**Matching strategies:** Exact CI (1.0), Fuzzy Levenshtein ≤2 (0.7-0.9), Business service group (0.5)

### POST /api/v1/duplicates

```json
Request:  { "integrations": [ { "source_app": "A", "target_app": "B", "name": "A → B" }, ... ] }
Response: { "duplicates": [ { "type": "bidirectional_candidate", "integrations": [...], ... } ], "count": 1 }
```

---

## 4. CMDB Ops Agent (Port 8082)

### GET /api/v1/agents

List all 8 available agents.

```json
Response 200: {
  "agents": [
    { "name": "duplicate_detector", "description": "Finds and merges duplicate Integration CIs" },
    { "name": "stale_record_reaper", "description": "Identifies inactive CIs..." },
    ...
  ]
}
```

### POST /api/v1/run

Run a single agent.

**Request:**
```json
{
  "agent_name": "duplicate_detector",
  "autonomy_level": 1,
  "dry_run": false,
  "context": {
    "integrations": [ { "sys_id": "...", "name": "...", "source_ci": "...", ... } ]
  }
}
```

**Response 200:**
```json
{
  "agent_name": "duplicate_detector",
  "started_at": "2026-03-29T12:00:00",
  "completed_at": "2026-03-29T12:00:01",
  "autonomy_level": 1,
  "findings_count": 2,
  "diagnoses_count": 2,
  "recommendations_count": 2,
  "actions_count": 0,
  "findings": [ { "finding_type": "exact_duplicate", "severity": "high", "ci_sys_id": "...", ... } ],
  "diagnoses": [...],
  "recommendations": [...]
}
```

**Autonomy levels:** 0=Report only, 1=Recommend (default), 2=Act with approval, 3=Fully autonomous

### POST /api/v1/run-all

Run all 8 agents in sequence (orchestrator last).

```json
Request:  { "autonomy_level": 1, "dry_run": true, "context": { "integrations": [...], "valid_ci_ids": [...] } }
Response: { "total_agents": 8, "total_findings": 15, "total_recommendations": 12, "results": [...] }
```

---

## 5. Service Map Intelligence (Port 8083)

### POST /api/v1/coverage

Analyze agent coverage across server population.

**Request:**
```json
{
  "servers": [ { "sys_id": "s1", "name": "srv1", "environment": "production", "is_critical": true, "integration_count": 5 } ],
  "agents": [ { "agent_id": "a1", "server_id": "s1", "status": "Active", "coverage_tier": 2, "last_heartbeat": "2026-03-29T12:00:00Z" } ],
  "required_tier": 2
}
```

**Response 200:**
```json
{
  "total_servers": 10,
  "covered_servers": 8,
  "coverage_percent": 80.0,
  "gap_count": 2,
  "gaps_by_type": { "NoAgent": 1, "StaleAgent": 1, "WrongTier": 0 },
  "gaps_by_priority": { "Critical": 0, "High": 1, "Medium": 1, "Low": 0 },
  "gaps": [ { "server_id": "s2", "gap_type": "NoAgent", "priority": "High", ... } ]
}
```

### POST /api/v1/risk

Score risk for all applications.

```json
Request:  { "applications": [ { "app_name": "Order Service", "integrations": [...], "coverage_gaps": 0, "total_servers": 5, "criticality": "Critical" } ] }
Response: { "total_applications": 5, "critical_count": 1, "applications": [ { "app_name": "...", "overall_risk": 75, "risk_level": "Critical", ... } ] }
```

**Risk weights:** Health 35%, Coverage 25%, Integration density 20%, Criticality 20%

### POST /api/v1/change-impact

Analyze blast radius of a change.

```json
Request:  { "target_app": "OrderService", "change_description": "Database migration", "integrations": [...], "max_hops": 2 }
Response: { "target_app": "OrderService", "direct_impact_count": 3, "indirect_impact_count": 2, "total_affected": 5, "direct_impacts": [...], "indirect_impacts": [...] }
```

### POST /api/v1/health-summary

```json
Request:  { "integrations": [...], "outlier_threshold": 40 }
Response: { "total_integrations": 14, "avg_health_score": 81.2, "health_distribution": {...}, "trend": "stable", "outliers": [...] }
```

---

## 6. ServiceNow Scripted REST API

**Base:** `https://instance/api/x_avnth/pathfinder/v1`
**Auth:** OAuth2 Bearer token

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/integrations` | Upsert integration CIs (batch) |
| GET | `/integrations/{sys_id}` | Get integration CI by sys_id |
| POST | `/interfaces` | Upsert interface CIs (batch) |
| POST | `/agents` | Upsert agent records (batch) |
| POST | `/health-logs` | Ingest health telemetry (batch) |
| GET | `/coverage-gaps` | List open coverage gaps |
| POST | `/integrations/{sys_id}/summary` | Set AI summary + health score |

See `src/servicenow/scripted-rest/pathfinder_api_v1.js` for full request/response schemas.
