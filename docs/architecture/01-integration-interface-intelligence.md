# 01 — Integration & Interface Intelligence

## 1. Purpose

This document defines the data model, classification taxonomy, and reconciliation logic for Pathfinder's core CI types: **Integration CIs** and **Interface CIs**. These represent discovered connections between applications and the specific data exchange pathways that compose them.

---

## 2. Conceptual Model

```
┌─────────────┐         ┌──────────────────────────┐         ┌─────────────┐
│ Application │◄────────│   Integration CI (1:M)   │────────►│ Application │
│  (source)   │         │  x_avnth_cmdb_ci_integ   │         │  (target)   │
└─────────────┘         └──────────┬───────────────┘         └─────────────┘
                                   │
                        ┌──────────┼──────────┐
                        ▼          ▼          ▼
                  ┌──────────┐ ┌──────────┐ ┌──────────┐
                  │Interface │ │Interface │ │Interface │
                  │  CI #1   │ │  CI #2   │ │  CI #3   │
                  │ REST/443 │ │ DB/5432  │ │ SFTP/22  │
                  └──────────┘ └──────────┘ └──────────┘
```

- **Integration CI** — A logical connection between two applications. One Integration CI exists per unique (source_app, target_app) pair.
- **Interface CI** — A specific data exchange pathway within an Integration. One Interface CI exists per unique (integration, protocol, port, direction) tuple.

Relationship: Integration CI → Interface CI is **1:M** (one-to-many).

---

## 3. Integration CI — `x_avnth_cmdb_ci_integration`

Extends `cmdb_ci`.

### 3.1 Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string (inherited) | Auto-generated: `{source_app} → {target_app}` |
| `source_ci` | reference → cmdb_ci | The application initiating connections |
| `target_ci` | reference → cmdb_ci | The application receiving connections |
| `integration_type` | choice | Primary classification (see §4) |
| `classification_confidence` | decimal (0.00–1.00) | Gateway's confidence in the classification |
| `discovery_method` | choice | `Pathfinder`, `Manual`, `Import` |
| `first_discovered` | glide_date_time | Timestamp of first flow observation |
| `last_observed` | glide_date_time | Timestamp of most recent flow |
| `flow_count` | integer | Total flows observed across all interfaces |
| `health_status` | choice | `Healthy`, `Degraded`, `Critical`, `Unknown` |
| `health_score` | integer (0–100) | Composite score from Integration Intelligence |
| `ai_summary` | string (4000) | AI-generated natural-language summary |
| `ea_status` | choice | `Mapped`, `Unmapped`, `Disputed` |
| `ea_relationship` | reference → cmdb_rel_ci | Link to EA relationship record |
| `criticality` | choice | `Critical`, `High`, `Medium`, `Low`, `Unknown` |
| `data_classification` | choice | `Public`, `Internal`, `Confidential`, `Restricted` |
| `owner` | reference → sys_user | Integration owner |
| `support_group` | reference → sys_user_group | Responsible support group |
| `operational_status` | choice (inherited) | `Operational`, `Non-Operational`, `Retired` |

### 3.2 Unique Constraint

`(source_ci, target_ci)` — One Integration CI per directed app pair. If traffic flows both ways, two Integration CIs exist (A→B and B→A).

### 3.3 Derived Fields (computed, not stored directly)

- `interface_count` — Count of child Interface CIs
- `days_since_last_observed` — `NOW() - last_observed`
- `is_stale` — `days_since_last_observed > 90`

---

## 4. Classification Taxonomy

The `integration_type` field uses a two-level hierarchy: **Category → Subtype**.

### 4.1 Categories

| Category | Description | Example Ports |
|----------|-------------|---------------|
| `API` | Request-response over HTTP/gRPC | 80, 443, 8080, 8443 |
| `Database` | Direct database connections | 5432, 3306, 1433, 1521, 27017, 6379 |
| `File Transfer` | File-based data exchange | 21, 22, 990 |
| `Messaging` | Async message queues/streams | 5672, 9092, 61616, 4222 |
| `Email` | SMTP/IMAP communication | 25, 465, 587, 143, 993 |
| `Directory` | LDAP/AD lookups | 389, 636 |
| `Remote Access` | RDP, SSH, VNC management | 22, 3389, 5900 |
| `Custom` | Unclassified or proprietary | Any |

### 4.2 Classification Rules (applied by Gateway)

Rules are evaluated in priority order. First match wins.

| Priority | Rule Type | Logic | Confidence |
|----------|-----------|-------|------------|
| 1 | **Port-exact** | `dst_port` matches known service port | 0.90 |
| 2 | **Port-range** | `dst_port` in known ephemeral range + process name match | 0.75 |
| 3 | **Process-name** | `process_name` matches known application (e.g., `postgres`, `nginx`) | 0.85 |
| 4 | **Protocol-heuristic** | Byte pattern analysis (future: DPI) | 0.60 |
| 5 | **Default** | Unclassified → `Custom` | 0.30 |

### 4.3 Port → Classification Map

```
443, 8443          → API (HTTPS)
80, 8080           → API (HTTP)
5432               → Database (PostgreSQL)
3306               → Database (MySQL)
1433               → Database (MSSQL)
1521               → Database (Oracle)
27017              → Database (MongoDB)
6379               → Database (Redis)
5672, 15672        → Messaging (RabbitMQ)
9092               → Messaging (Kafka)
61616              → Messaging (ActiveMQ)
4222               → Messaging (NATS)
21, 990            → File Transfer (FTP)
22                 → File Transfer (SFTP) or Remote Access (SSH) *
25, 465, 587       → Email (SMTP)
143, 993           → Email (IMAP)
389, 636           → Directory (LDAP)
3389               → Remote Access (RDP)
5900               → Remote Access (VNC)
```

*Port 22 ambiguity: resolved by process_name. `sshd` with file transfer patterns → SFTP; interactive sessions → SSH.*

### 4.4 Confidence Scoring

Base confidence comes from the rule type (§4.2). Modifiers:

| Factor | Modifier |
|--------|----------|
| Flow count > 100 | +0.05 |
| Consistent over 7+ days | +0.05 |
| Process name confirms port classification | +0.10 |
| Multiple ports for same src→dst pair | −0.05 per extra port |
| Ephemeral/high port (>32768) | −0.15 |

Final confidence = clamp(base + Σ modifiers, 0.0, 1.0)

---

## 5. Interface CI — `x_avnth_cmdb_ci_interface`

Extends `cmdb_ci`.

### 5.1 Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string (inherited) | Auto-generated: `{protocol}:{port} ({direction})` |
| `integration` | reference → x_avnth_cmdb_ci_integration | Parent Integration CI |
| `protocol` | choice | `TCP`, `UDP`, `HTTP`, `HTTPS`, `gRPC`, `AMQP`, `MQTT` |
| `port` | integer | Destination port |
| `direction` | choice | `Inbound`, `Outbound`, `Bidirectional` |
| `pattern` | choice | `Request-Reply`, `Fire-and-Forget`, `Pub-Sub`, `Batch`, `Streaming` |
| `data_format` | choice | `JSON`, `XML`, `Binary`, `CSV`, `Protobuf`, `Avro`, `Unknown` |
| `process_name` | string | Source process name from agent |
| `avg_bytes_per_flow` | integer | Average payload size |
| `flow_count` | integer | Total flows observed for this interface |
| `first_discovered` | glide_date_time | First observation |
| `last_observed` | glide_date_time | Most recent observation |
| `latency_p50_ms` | decimal | Median latency (when measurable) |
| `latency_p99_ms` | decimal | 99th percentile latency |
| `error_rate` | decimal (0.00–1.00) | Observed error rate |
| `operational_status` | choice (inherited) | `Operational`, `Non-Operational`, `Retired` |

### 5.2 Unique Constraint

`(integration, protocol, port, direction)` — One Interface CI per unique pathway within an Integration.

### 5.3 Behavioral Classification

The `pattern` field is inferred from flow behavior:

| Pattern | Detection Logic |
|---------|----------------|
| `Request-Reply` | Bidirectional flows with roughly symmetric byte counts |
| `Fire-and-Forget` | Unidirectional flows, no response observed |
| `Pub-Sub` | One source IP, many destination IPs on same port |
| `Batch` | Flows occur in regular time intervals with large payloads |
| `Streaming` | Long-lived connections with continuous small payloads |

---

## 6. EA Reconciliation

### 6.1 EA Reconciliation Map — `x_avnth_integration_ea_map`

| Field | Type | Description |
|-------|------|-------------|
| `integration` | reference → x_avnth_cmdb_ci_integration | Discovered integration |
| `ea_relationship` | reference → cmdb_rel_ci | EA-managed relationship record |
| `mapping_status` | choice | `Confirmed`, `Suggested`, `Rejected` |
| `confidence` | decimal (0.00–1.00) | Match confidence |
| `mapped_by` | reference → sys_user | User who confirmed/rejected |
| `mapped_at` | glide_date_time | Confirmation timestamp |
| `match_reason` | string (1000) | Explanation of why match was suggested |

### 6.2 Matching Algorithm

1. **Exact match:** `source_ci` + `target_ci` on Integration CI match `parent` + `child` on EA relationship.
2. **Name fuzzy match:** Application names match within Levenshtein distance ≤ 2.
3. **Group match:** Applications belong to same business service; EA relationship exists at service level.

Match confidence: exact = 1.0, fuzzy name = 0.7, group = 0.5.

### 6.3 Reconciliation States

```
Discovered Integration ──► [Auto-match] ──► Suggested (confidence ≥ 0.7)
                                         ──► Unmapped  (confidence < 0.7)

Suggested ──► [User confirms] ──► Confirmed
          ──► [User rejects]  ──► Rejected ──► remains Unmapped

Confirmed ──► [EA record deleted] ──► Disputed
```

---

## 7. Health Telemetry — `x_avnth_integration_health_log`

| Field | Type | Description |
|-------|------|-------------|
| `integration` | reference → x_avnth_cmdb_ci_integration | Parent integration |
| `interface` | reference → x_avnth_cmdb_ci_interface | Specific interface (optional) |
| `metric_type` | choice | `Latency`, `Throughput`, `ErrorRate`, `Availability` |
| `metric_value` | decimal | The measured value |
| `unit` | string | `ms`, `bytes/s`, `percent`, `requests/s` |
| `recorded_at` | glide_date_time | Measurement timestamp |
| `source` | choice | `Agent`, `Gateway`, `Synthetic` |

### 7.1 Health Score Computation

The Integration Intelligence product computes a composite health score (0–100) using weighted metrics:

| Metric | Weight | Scoring |
|--------|--------|---------|
| Availability | 40% | 100 if >99.9%, linear decay to 0 at 95% |
| Latency | 30% | 100 if p99 < baseline×1.5, linear decay to 0 at baseline×5 |
| Error Rate | 20% | 100 if <0.1%, linear decay to 0 at 5% |
| Staleness | 10% | 100 if observed in last 24h, linear decay to 0 at 30 days |

`health_score = Σ(weight × metric_score)`

### 7.2 Health Status Mapping

| Score Range | Status |
|-------------|--------|
| 80–100 | `Healthy` |
| 60–79 | `Degraded` |
| 0–59 | `Critical` |
| No data | `Unknown` |

---

## 8. Lifecycle

### 8.1 Integration CI Lifecycle

```
[Flows Observed] → Created (discovery_method=Pathfinder, operational_status=Operational)
                 → Updated on each observation (last_observed, flow_count)
                 → Stale after 90 days no observation
                 → Retired by CMDB Ops Agent or manual action
```

### 8.2 Interface CI Lifecycle

Same as Integration CI, tied to parent. If parent is Retired, all child Interfaces are also Retired.

### 8.3 Deduplication

The Gateway deduplicates before creating CIs:
1. **Flow-level:** Collapse raw flows into (src_ip, dst_ip, dst_port, protocol) tuples per time window.
2. **Interface-level:** Match tuples to existing Interface CIs by unique constraint.
3. **Integration-level:** Match (source_app, target_app) pairs to existing Integration CIs.

New CIs are only created when no match exists. Updates increment counters and refresh `last_observed`.

---

## 9. Workspace — Polaris UI Builder

The Pathfinder scoped app uses a **Configurable Workspace** built with the ServiceNow **Polaris design framework** and **UI Builder**. All UI components follow the Next Experience standard.

### 9.1 Workspace Pages

| Page | Type | Layout | Purpose |
|------|------|--------|---------|
| Overview | Landing | Fluid | KPI tiles, health distribution donuts, recent activity lists |
| Integration Explorer | List | Split-content | Filterable list + tabbed detail panel (Overview, Interfaces, Health, EA, Activity) |
| Agent Fleet | List | Split-content | Agent status grid with header KPIs and OS/version distribution charts |
| Coverage Gaps | Board | Kanban | Swim lanes: Open → InProgress → Resolved / Waived / Failed |
| EA Reconciliation | Custom | Two-panel | Left: unmapped integrations; Right: AI match suggestions with confirm/reject |
| Health Dashboard | Dashboard | Fluid | Time-series charts, metric sparklines, heatmap, anomaly list |

### 9.2 Declarative Actions

All actions are implemented as **Declarative Actions** (no client scripts):
- Confirm / Reject EA Mapping
- Decommission Agent (with confirmation dialog)
- Create Change Request for coverage gap
- Waive Coverage Gap (with reason dialog)
- Refresh AI Summary (REST call to Intelligence Engine)

### 9.3 Roles

| Role | Access |
|------|--------|
| `x_avnth_pathfinder.admin` | Full access, settings, decommission, waive |
| `x_avnth_pathfinder.analyst` | Manage integrations, confirm EA, triage gaps |
| `x_avnth_pathfinder.viewer` | Read-only workspace access |

### 9.4 Diagrams

- ERD: `docs/diagrams/09-servicenow-data-model.svg`
- Workspace navigation: `docs/diagrams/10-workspace-navigation.svg`
- Workspace definition files: `src/servicenow/workspace/`
