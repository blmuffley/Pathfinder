# Avennorth Pathfinder — Security Architecture

## 1. Threat Model Overview

```
                    Internet
                       |
                 [ServiceNow Cloud]
                       |  OAuth2 (TLS 1.2+)
                       |
               ┌───────┴───────┐
               │   Gateway     │  DMZ / Private subnet
               │   :8443       │
               └───┬───────┬───┘
                   |       |
          gRPC (mTLS)   PostgreSQL (TLS)
                   |       |
          ┌────────┘       └────────┐
          │                         │
    ┌─────┴─────┐           ┌──────┴──────┐
    │  Agents   │           │  PostgreSQL  │
    │  (hosts)  │           │  (private)   │
    └───────────┘           └─────────────┘
```

## 2. Authentication & Authorization

### 2.1 Agent → Gateway

| Mechanism | Detail |
|-----------|--------|
| **Enrollment** | One-time JWT enrollment token. Token contains scope (org/environment), expiry, and allowed OS types. |
| **Post-enrollment** | Agent uses assigned `agent_id` (UUID) in every gRPC call. Gateway validates against `agents` table. |
| **mTLS (production)** | Gateway presents server cert. Agents validate against CA. Optional client cert for mutual auth. |
| **Transport** | gRPC over TLS 1.2+ on port 8443. Plaintext only in dev (`tls: false`). |

### 2.2 Gateway → ServiceNow

| Mechanism | Detail |
|-----------|--------|
| **OAuth2** | Client credentials flow. `POST /oauth_token.do` with `client_id` + `client_secret`. |
| **Token caching** | Cached until 60s before expiry. Auto-refresh. |
| **Transport** | HTTPS only. TLS 1.2+. |
| **Scoping** | OAuth app scoped to `x_avnth_pathfinder` tables only. Cannot read/write outside scope. |

### 2.3 Gateway → PostgreSQL

| Mechanism | Detail |
|-----------|--------|
| **Auth** | Username/password via connection string. Stored in K8s Secret or env var. |
| **Transport** | `sslmode=require` in production. `sslmode=disable` only in local dev. |
| **Permissions** | Dedicated `pathfinder` database user with access only to Pathfinder tables. |

### 2.4 Intelligence Services

| Mechanism | Detail |
|-----------|--------|
| **Internal only** | Ports 8080-8083 not exposed to internet. Private subnet / ClusterIP service. |
| **No auth** | Trust boundary is the network perimeter. Service mesh (Istio) optional for mTLS between services. |
| **Claude API** | `ANTHROPIC_API_KEY` stored as K8s Secret. Never logged, never in config files. |

### 2.5 ServiceNow Workspace

| Mechanism | Detail |
|-----------|--------|
| **Roles** | `x_avnth_pathfinder.admin` (full), `.analyst` (manage), `.viewer` (read-only) |
| **ACLs** | Table-level read/write/create/delete per role per table |
| **Declarative actions** | Role-gated. Decommission = admin only. Waive gap = admin only. Confirm EA = admin + analyst. |

## 3. Data Protection

### 3.1 Data at Rest

| Data | Location | Protection |
|------|----------|------------|
| Raw flows | PostgreSQL `raw_flows` | Database-level encryption (cloud-managed PG). Monthly partitions with retention policy. |
| Classified integrations | PostgreSQL | Same as above |
| Agent IDs | Host filesystem (`/var/lib/pathfinder/agent-id`) | File permissions 0600 (owner read/write only) |
| SN credentials | K8s Secrets / env vars | Encrypted etcd (K8s). Never in config YAML. |
| Claude API key | K8s Secret | Never logged. Not in config files. |
| ServiceNow CIs | ServiceNow platform | ServiceNow's native encryption and access controls |

### 3.2 Data in Transit

| Path | Protocol | Encryption |
|------|----------|------------|
| Agent → Gateway | gRPC | TLS 1.2+ (mTLS optional) |
| Gateway → PostgreSQL | PostgreSQL wire protocol | TLS (`sslmode=require`) |
| Gateway → ServiceNow | HTTPS | TLS 1.2+ |
| AI Engine → Claude API | HTTPS | TLS 1.3 |
| Intelligence services (internal) | HTTP | Plaintext (private network). Istio mTLS optional. |

### 3.3 Data Classification

| Data Type | Classification | Handling |
|-----------|---------------|----------|
| Flow metadata (IPs, ports, process names) | Internal | No payload inspection. Only connection metadata. |
| Integration CI records | Per-integration `data_classification` field | Confidential/Restricted integrations flagged in governance |
| AI summaries | Same as parent integration | Generated text does not contain raw flow data |
| Health metrics | Internal | Aggregated statistics only |
| Agent enrollment tokens | Secret | Short-lived JWT. Rotate after use. |

## 4. Agent Security Model

### 4.1 eBPF Capabilities (Linux)

| Capability | Purpose | Risk |
|-----------|---------|------|
| `CAP_BPF` | Load and manage eBPF programs | Required for kernel probes. Read-only observation — no packet modification. |
| `CAP_PERFMON` | Access performance monitoring | Required for ring buffer events. |
| `CAP_NET_ADMIN` | Network namespace access | Required for container-aware flow capture. |

**Not required:** `CAP_SYS_ADMIN`, `privileged: true`
**The agent never:** modifies packets, injects code, reads payload contents, or alters kernel state.

### 4.2 ETW (Windows)

| Requirement | Purpose |
|------------|---------|
| Administrator | Required for ETW trace session (Microsoft-Windows-Kernel-Network provider) |
| No kernel driver | ETW is a built-in Windows facility. No third-party driver needed. |

### 4.3 Kubernetes DaemonSet

| Setting | Value | Purpose |
|---------|-------|---------|
| `hostNetwork: true` | Required | Capture host-level network flows |
| `hostPID: true` | Required | Resolve PIDs to process names |
| `privileged: false` | Explicit | Not running as privileged container |
| `capabilities.add` | BPF, PERFMON, NET_ADMIN | Minimum required for eBPF |
| RBAC | get/list/watch pods, services, endpoints | K8s API enrichment only. No write access. |

## 5. Guardrails & Kill Switches

| Guardrail | Location | Purpose |
|-----------|----------|---------|
| `x_avnth.cmdb_ops_enabled` | SN system property | Global kill switch for all CMDB Ops agents |
| `x_avnth.auto_deploy_enabled` | SN system property | Enable/disable coverage gap auto-remediation |
| `x_avnth.max_cis_per_agent_run` | SN system property (default: 50) | Blast radius limit per agent run |
| 24-hour cooldown | Agent base class | Same CI cannot be acted on twice in 24 hours |
| Confidence threshold | Gateway config (default: 0.8) | Only high-confidence integrations become CIs |
| Autonomy levels (0-3) | Per-agent configuration | Controls how far each agent can act autonomously |
| Change freeze detection | Flow Designer prerequisite step | Auto-deploy respects change freeze windows |

## 6. Compliance Considerations

| Standard | Status | Notes |
|----------|--------|-------|
| SOC 2 Type II | Planned (Year 2) | Audit trail via `sn_sync_log`, agent lifecycle tracking, role-based access |
| GDPR | By design | No PII in flow data (IPs + ports only). No payload inspection. Data residency per PostgreSQL deployment region. |
| PCI-DSS | N/A | Pathfinder does not process, store, or transmit cardholder data. Integration CIs may reference PCI-scoped systems — governed by SN `data_classification` field. |
| HIPAA | N/A | Same as PCI. No PHI in flow metadata. |

## 7. Incident Response

| Scenario | Detection | Response |
|----------|-----------|----------|
| Compromised agent | Unexpected enrollment, abnormal flow volume | Revoke agent_id. Rotate enrollment token. Audit `raw_flows` for the agent. |
| Compromised gateway | SN sync anomalies, unauthorized CI changes | Rotate SN OAuth credentials. Review `sn_sync_log`. Disable gateway. |
| Claude API key leaked | Anthropic usage alert | Rotate key immediately. Audit `GET /api/v1/usage` for unexpected consumption. |
| SN credential leak | Failed auth in gateway logs | Rotate OAuth app credentials in SN. Audit SN access logs. |
