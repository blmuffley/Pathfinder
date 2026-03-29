# 02 — Physical Architecture

## 1. Purpose

This document describes the four-tier deployment model for Pathfinder, the communication protocols between tiers, the PostgreSQL intermediate schema, and the ServiceNow integration pattern.

---

## 2. Four-Tier Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        TIER 4: ServiceNow                       │
│  ┌─────────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Scoped App      │  │ Flow Designer│  │ PA Dashboards     │  │
│  │ x_avnth_ tables │  │ Workflows    │  │ Health / Coverage │  │
│  └────────┬────────┘  └──────────────┘  └───────────────────┘  │
│           │ REST API /api/x_avnth/pathfinder/v1/                │
├───────────┼─────────────────────────────────────────────────────┤
│           │          TIER 3: Intelligence                       │
│  ┌────────┴────────┐  ┌────────────────┐  ┌─────────────────┐  │
│  │ Shared AI Engine│  │ Integration    │  │ CMDB Ops Agent  │  │
│  │ (Claude API)    │  │ Intelligence   │  │ (8 agents)      │  │
│  └────────┬────────┘  └────────────────┘  └─────────────────┘  │
│           │ HTTP                                                │
├───────────┼─────────────────────────────────────────────────────┤
│           │          TIER 2: Gateway                            │
│  ┌────────┴─────────────────────────────────────────────────┐   │
│  │              Pathfinder Gateway (Go)                      │   │
│  │  ┌──────────┐ ┌──────────────┐ ┌────────┐ ┌──────────┐  │   │
│  │  │ gRPC     │ │ Classifica-  │ │ SN     │ │ Health   │  │   │
│  │  │ Server   │ │ tion Engine  │ │ Sync   │ │ Logger   │  │   │
│  │  └──────────┘ └──────────────┘ └────────┘ └──────────┘  │   │
│  └────────┬─────────────────────────────┬───────────────────┘   │
│           │ gRPC (mTLS)                 │ PostgreSQL             │
├───────────┼─────────────────────────────┼───────────────────────┤
│           │          TIER 1: Agents     │                       │
│  ┌────────┴────────┐ ┌─────────────┐ ┌─┴───────────────────┐   │
│  │ Linux Agent     │ │ Windows     │ │ K8s Agent           │   │
│  │ (eBPF)          │ │ Agent (ETW) │ │ (DaemonSet + eBPF)  │   │
│  └─────────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Tier 1 — Agents

### 3.1 Linux Agent

| Attribute | Value |
|-----------|-------|
| Binary | `pathfinder-agent` |
| Language | Go 1.22+ |
| Capture method | eBPF (kprobe on tcp_connect, tcp_close, inet_sock_set_state) |
| Capabilities required | `CAP_BPF`, `CAP_PERFMON`, `CAP_NET_ADMIN` |
| Data collected | Source/dest IP:port, protocol, bytes, process name, PID |
| Output | gRPC stream → Gateway |
| State file | `/var/lib/pathfinder/agent-id` (persists agent UUID) |
| Config | `/etc/pathfinder/agent.yaml` |
| Package formats | RPM, DEB, Docker image |
| Resource budget | <2% CPU, <50MB RAM at steady state |

### 3.2 Windows Agent

| Attribute | Value |
|-----------|-------|
| Binary | `pathfinder-agent.exe` |
| Capture method | ETW (`Microsoft-Windows-Kernel-Network` provider) |
| Capabilities required | Administrator (for ETW) |
| State file | `C:\ProgramData\Pathfinder\agent-id` |
| Config | `C:\ProgramData\Pathfinder\agent.yaml` |
| Package formats | MSI, Docker image (Windows containers) |

### 3.3 K8s Agent

| Attribute | Value |
|-----------|-------|
| Deployment | DaemonSet in `pathfinder-system` namespace |
| Capture method | eBPF (same as Linux) |
| K8s enrichment | Pod name, namespace, service, deployment, labels |
| RBAC | ServiceAccount with `get/list/watch` on pods, services, endpoints |
| Tolerations | All taints (must run on every node) |
| Host networking | Required (for eBPF access) |

### 3.4 Agent Enrollment Flow

```
Agent                              Gateway
  │                                   │
  │── EnrollmentRequest ─────────────►│
  │   (enrollment_token, hostname,    │
  │    os_type, agent_version)        │
  │                                   │
  │   [Validate JWT token]            │
  │   [Generate UUID agent_id]        │
  │   [Insert into agents table]      │
  │                                   │
  │◄── EnrollmentResponse ───────────│
  │   (agent_id, gateway_cert)        │
  │                                   │
  │   [Save agent_id to state file]   │
  │                                   │
  │── Heartbeat (every 30s) ────────►│
  │── SendFlows (stream) ───────────►│
```

### 3.5 Flow Data Pipeline

```
Agent captures flow ──► Batch (100 flows or 10s) ──► gRPC SendFlows
                                                          │
Gateway receives ──► Insert raw_flows ──► Classification Engine
                                               │
                          ┌────────────────────┤
                          ▼                    ▼
                  classified_integrations  classified_interfaces
                          │                    │
                          ▼                    ▼
                     SN Sync Loop ──► ServiceNow REST API
```

---

## 4. Tier 2 — Gateway

### 4.1 Component Overview

| Component | Responsibility |
|-----------|---------------|
| **gRPC Server** | Accept agent connections (Enroll, SendFlows, Heartbeat) |
| **Classification Engine** | Classify raw flows into Integration/Interface candidates |
| **SN Sync** | Periodically push classified data to ServiceNow via REST |
| **Health Logger** | Compute and store health telemetry from flow metrics |
| **Config Loader** | Parse YAML config with env var overrides |
| **Migration Runner** | Apply PostgreSQL schema migrations on startup |

### 4.2 Gateway Configuration

```yaml
server:
  port: 8443              # gRPC listen port
  tls: true               # Enable mTLS (false for dev)
  cert_file: /etc/pathfinder/tls/server.crt
  key_file: /etc/pathfinder/tls/server.key
  ca_file: /etc/pathfinder/tls/ca.crt

database:
  url: postgres://...     # Or via PF_DB_URL env var
  max_connections: 25
  migration_dir: internal/store/migrations

servicenow:
  instance: https://xxx.service-now.com   # Or PF_SN_INSTANCE
  auth: oauth                              # oauth or basic
  client_id: ...                           # Or PF_SN_CLIENT_ID
  client_secret: ...                       # Or PF_SN_CLIENT_SECRET
  sync_interval: 60s
  batch_size: 50

classification:
  confidence_threshold: 0.8    # Min confidence to auto-create CIs
  dedup_window: 5m             # Flow dedup time window
  app_lookup: config           # config | cmdb (pull from SN)

enrollment:
  token_secret: ...            # JWT signing key for enrollment tokens

logging:
  level: info
  format: json
```

### 4.3 Deployment

| Method | Details |
|--------|---------|
| Docker | `docker build -f src/gateway/Dockerfile .` → port 8443 |
| Kubernetes | Helm chart at `charts/gateway/` — Deployment + Service + ConfigMap |
| Bare metal | Binary + systemd unit file |

Resource requirements: 2 vCPU, 2GB RAM, 10GB disk (for PostgreSQL).

---

## 5. PostgreSQL Schema

The Gateway uses PostgreSQL as an intermediate store. Data is eventually synced to ServiceNow but PostgreSQL is the operational truth store for real-time queries.

### 5.1 Table: `agents`

| Column | Type | Constraint |
|--------|------|------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `agent_id` | VARCHAR(64) | UNIQUE NOT NULL |
| `hostname` | VARCHAR(255) | NOT NULL |
| `os_type` | VARCHAR(20) | NOT NULL (linux, windows, k8s) |
| `agent_version` | VARCHAR(50) | NOT NULL |
| `enrolled_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| `last_heartbeat` | TIMESTAMPTZ | |
| `status` | VARCHAR(20) | NOT NULL DEFAULT 'active' |
| `sn_sys_id` | VARCHAR(32) | ServiceNow sys_id after sync |

### 5.2 Table: `raw_flows`

| Column | Type | Constraint |
|--------|------|------------|
| `id` | BIGSERIAL | PRIMARY KEY |
| `agent_id` | VARCHAR(64) | NOT NULL, FK → agents.agent_id |
| `src_ip` | INET | NOT NULL |
| `src_port` | INTEGER | NOT NULL |
| `dst_ip` | INET | NOT NULL |
| `dst_port` | INTEGER | NOT NULL |
| `protocol` | VARCHAR(10) | NOT NULL |
| `bytes_sent` | BIGINT | DEFAULT 0 |
| `bytes_received` | BIGINT | DEFAULT 0 |
| `process_name` | VARCHAR(255) | |
| `process_pid` | INTEGER | |
| `captured_at` | TIMESTAMPTZ | NOT NULL |
| `ingested_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| `classified` | BOOLEAN | NOT NULL DEFAULT FALSE |

**Indexes:** `(agent_id, captured_at)`, `(dst_ip, dst_port)`, `(classified)` partial index where FALSE.

**Partitioning:** Partition by `captured_at` (monthly) for retention management. Drop partitions older than 90 days.

### 5.3 Table: `classified_integrations`

| Column | Type | Constraint |
|--------|------|------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `source_app` | VARCHAR(255) | NOT NULL |
| `target_app` | VARCHAR(255) | NOT NULL |
| `integration_type` | VARCHAR(50) | NOT NULL |
| `classification_confidence` | DECIMAL(3,2) | NOT NULL |
| `first_seen` | TIMESTAMPTZ | NOT NULL |
| `last_seen` | TIMESTAMPTZ | NOT NULL |
| `flow_count` | BIGINT | NOT NULL DEFAULT 0 |
| `synced_to_sn` | BOOLEAN | NOT NULL DEFAULT FALSE |
| `sn_sys_id` | VARCHAR(32) | ServiceNow sys_id after sync |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

**Unique constraint:** `(source_app, target_app)`

### 5.4 Table: `classified_interfaces`

| Column | Type | Constraint |
|--------|------|------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| `integration_id` | UUID | NOT NULL, FK → classified_integrations.id |
| `protocol` | VARCHAR(20) | NOT NULL |
| `port` | INTEGER | NOT NULL |
| `direction` | VARCHAR(20) | NOT NULL |
| `pattern` | VARCHAR(30) | |
| `process_name` | VARCHAR(255) | |
| `avg_bytes` | BIGINT | DEFAULT 0 |
| `flow_count` | BIGINT | NOT NULL DEFAULT 0 |
| `first_seen` | TIMESTAMPTZ | NOT NULL |
| `last_seen` | TIMESTAMPTZ | NOT NULL |
| `synced_to_sn` | BOOLEAN | NOT NULL DEFAULT FALSE |
| `sn_sys_id` | VARCHAR(32) | |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

**Unique constraint:** `(integration_id, protocol, port, direction)`

### 5.5 Table: `sn_sync_log`

| Column | Type | Constraint |
|--------|------|------------|
| `id` | BIGSERIAL | PRIMARY KEY |
| `entity_type` | VARCHAR(50) | NOT NULL (integration, interface, agent) |
| `entity_id` | UUID | NOT NULL |
| `sn_sys_id` | VARCHAR(32) | |
| `operation` | VARCHAR(20) | NOT NULL (create, update, delete) |
| `status` | VARCHAR(20) | NOT NULL (success, failed, pending) |
| `error_message` | TEXT | |
| `synced_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

### 5.6 Table: `health_metrics`

| Column | Type | Constraint |
|--------|------|------------|
| `id` | BIGSERIAL | PRIMARY KEY |
| `integration_id` | UUID | FK → classified_integrations.id |
| `interface_id` | UUID | FK → classified_interfaces.id (nullable) |
| `metric_type` | VARCHAR(30) | NOT NULL |
| `metric_value` | DECIMAL(12,4) | NOT NULL |
| `recorded_at` | TIMESTAMPTZ | NOT NULL |

**Partitioning:** By `recorded_at` (monthly).

---

## 6. Tier 3 — Intelligence

### 6.1 Shared AI Engine

| Attribute | Value |
|-----------|-------|
| Framework | FastAPI (Python 3.11+) |
| Port | 8080 |
| LLM | Claude (via `anthropic` SDK) |
| Database | Shares PostgreSQL with Gateway |
| Endpoints | `/health`, `/analyze`, `/detect-anomalies` |

### 6.2 Intelligence Products

All three intelligence products are FastAPI services that:
1. Read data from PostgreSQL (or query ServiceNow REST API)
2. Call the Shared AI Engine for LLM and anomaly detection
3. Write results back to ServiceNow via REST API

| Product | Port | Responsibilities |
|---------|------|-----------------|
| Integration Intelligence | 8081 | Health scoring, summarization, rationalization |
| CMDB Ops Agent | 8082 | 8 autonomous agents, scheduled runs |
| Service Map Intelligence | 8083 | Coverage analysis, risk scoring, change impact |

### 6.3 Inter-Service Communication

```
Intelligence Products ──HTTP──► Shared AI Engine ──HTTP──► Claude API
                      ──SQL──► PostgreSQL
                      ──HTTP──► ServiceNow REST API
```

No service mesh or message broker needed at this scale. Direct HTTP calls with retry logic.

---

## 7. Tier 4 — ServiceNow

### 7.1 Scoped App: `x_avnth_pathfinder`

The ServiceNow scoped app provides:
- **6 custom tables** (see doc 01 for schema)
- **Scripted REST API** under `/api/x_avnth/pathfinder/v1/`
- **Business rules** for CI lifecycle automation
- **Flow Designer workflows** for remediation
- **Performance Analytics dashboards**

### 7.2 Integration Pattern

```
Gateway ──► SN REST API (OAuth2)
         POST /api/x_avnth/pathfinder/v1/integrations
         POST /api/x_avnth/pathfinder/v1/agents

Intelligence ──► SN REST API (OAuth2)
              POST /api/x_avnth/pathfinder/v1/integrations/{id}/health-score
              POST /api/x_avnth/pathfinder/v1/integrations/{id}/summary
```

### 7.3 Authentication

All external callers use **OAuth2 client credentials** flow:
1. `POST /oauth_token.do` with `client_id` + `client_secret`
2. Receive `access_token` (Bearer)
3. Include `Authorization: Bearer {token}` on all API calls
4. Token refresh handled automatically by Gateway's SN client

---

## 8. Network Requirements

| Source | Destination | Port | Protocol | Purpose |
|--------|-------------|------|----------|---------|
| Agent | Gateway | 8443 | gRPC/TLS | Flow streaming, enrollment, heartbeat |
| Gateway | PostgreSQL | 5432 | TCP | Data storage |
| Gateway | ServiceNow | 443 | HTTPS | CI sync |
| Intelligence | PostgreSQL | 5432 | TCP | Data queries |
| Intelligence | AI Engine | 8080 | HTTP | LLM orchestration |
| AI Engine | api.anthropic.com | 443 | HTTPS | Claude API |
| Intelligence | ServiceNow | 443 | HTTPS | Results push |

---

## 9. High Availability

### 9.1 Gateway HA

- **Stateless:** All state in PostgreSQL. Run 2+ Gateway instances behind a load balancer.
- **gRPC LB:** Use L4 load balancing (agents maintain persistent connections; connection-level balancing is sufficient).
- **DB connection pool:** Each instance uses pgx pool with max 25 connections.

### 9.2 Agent Resilience

- **Offline buffering:** If Gateway is unreachable, buffer flows locally (max 10,000 events, ~5MB). Flush on reconnect.
- **Reconnect:** Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (cap).
- **State persistence:** `agent-id` file survives restarts. Re-enrollment only if file is missing.

### 9.3 PostgreSQL HA

- Production: Use managed PostgreSQL (AWS RDS, GCP Cloud SQL, Azure Database).
- Dev: Single-instance Docker container (provided in docker-compose.yml).
