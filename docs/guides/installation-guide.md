# Avennorth Pathfinder — Installation & Configuration Guide

## Prerequisites

### Infrastructure
| Component | Version | Purpose |
|-----------|---------|---------|
| PostgreSQL | 16+ | Gateway data store (flows, classifications, sync log) |
| Docker + Compose | 24+ | Local development and containerized deployment |
| Kubernetes | 1.28+ | Production deployment (optional — bare metal also supported) |
| Helm | 3.14+ | K8s chart deployment |

### Development Tools
| Tool | Version | Purpose |
|------|---------|---------|
| Go | 1.22+ | Gateway + agents |
| Python | 3.11+ | Intelligence products (3.9 minimum, 3.11 recommended) |
| Node.js | 20+ | ServiceNow dev tooling |
| protoc | 5+ | Proto code generation (install: `brew install protobuf protoc-gen-go protoc-gen-go-grpc`) |
| clang + libbpf | — | eBPF compilation (Linux agent development only) |

### ServiceNow
| Requirement | Detail |
|-------------|--------|
| Instance | Utah+ release |
| Plugins | CMDB, Service Mapping (recommended) |
| Roles | `admin` for initial setup |
| OAuth | Client credentials application registered |

### API Keys
| Key | Required For |
|-----|-------------|
| `ANTHROPIC_API_KEY` | Claude API — Shared AI Engine (summarization, health scoring) |
| ServiceNow OAuth credentials | Gateway → SN sync |

---

## Quick Start (Local Development)

```bash
# 1. Clone and enter repo
git clone <repo-url> && cd Pathfinder

# 2. Start PostgreSQL
make docker-up
# Verify: psql postgres://pathfinder:localdev@localhost:5432/pathfinder

# 3. Build and start Gateway
make dev-gateway
# Gateway listens on :8443 (gRPC)
# Migrations run automatically on startup

# 4. Start mock agent (generates synthetic flows)
make dev-mock-agent
# Sends flows every 10s to Gateway
# Check PostgreSQL: SELECT COUNT(*) FROM raw_flows;

# 5. Start AI Engine (optional — requires ANTHROPIC_API_KEY)
export ANTHROPIC_API_KEY=sk-ant-...
make dev-ai-engine
# Listens on :8080

# 6. Start Intelligence products (optional)
make dev-integration-intel  # :8081
make dev-cmdb-ops           # :8082
make dev-service-map         # :8083

# 7. Run all tests
make test
# Expected: 104+ tests, all passing
```

---

## Production Deployment

### Option A: Kubernetes (Recommended)

#### Step 1: Create namespace and secrets

```bash
kubectl create namespace pathfinder-system

# Database credentials
kubectl create secret generic pathfinder-db-credentials \
  --namespace pathfinder-system \
  --from-literal=PF_DB_URL="postgres://user:pass@db-host:5432/pathfinder?sslmode=require"

# ServiceNow credentials
kubectl create secret generic pathfinder-sn-credentials \
  --namespace pathfinder-system \
  --from-literal=PF_SN_INSTANCE="https://your-instance.service-now.com" \
  --from-literal=PF_SN_CLIENT_ID="your-client-id" \
  --from-literal=PF_SN_CLIENT_SECRET="your-client-secret"

# Agent enrollment token
kubectl create secret generic pathfinder-enrollment \
  --namespace pathfinder-system \
  --from-literal=PF_ENROLLMENT_TOKEN="your-enrollment-jwt"
```

#### Step 2: Deploy Gateway

```bash
helm install pathfinder-gateway charts/gateway/ \
  --namespace pathfinder-system \
  --set image.repository=your-registry/pathfinder-gateway \
  --set image.tag=0.1.0 \
  --set config.servicenow.syncInterval=60s \
  --set config.classification.confidenceThreshold=0.8
```

#### Step 3: Deploy Agent DaemonSet

```bash
helm install pathfinder-agent charts/agent/ \
  --namespace pathfinder-system \
  --set image.repository=your-registry/pathfinder-agent \
  --set image.tag=0.1.0 \
  --set gateway.address=pathfinder-gateway:8443
```

#### Step 4: Verify

```bash
# Check gateway is running
kubectl get pods -n pathfinder-system -l app.kubernetes.io/name=pathfinder-gateway

# Check agents are running on all nodes
kubectl get pods -n pathfinder-system -l app.kubernetes.io/name=pathfinder-agent -o wide

# Check agent logs for enrollment
kubectl logs -n pathfinder-system -l app.kubernetes.io/name=pathfinder-agent --tail=20

# Check gateway logs for flow ingestion
kubectl logs -n pathfinder-system -l app.kubernetes.io/name=pathfinder-gateway --tail=20
```

### Option B: Linux Bare Metal

```bash
# 1. Install gateway
rpm -i pathfinder-gateway-0.1.0.rpm  # or dpkg -i .deb
cp /path/to/gateway-prod.yaml /etc/pathfinder/gateway.yaml
# Edit: set database.url, servicenow.instance, servicenow.client_id/secret
systemctl enable pathfinder-gateway && systemctl start pathfinder-gateway

# 2. Install agent on each server
rpm -i pathfinder-agent-0.1.0.rpm
echo "PF_GATEWAY_ADDRESS=gateway-host:8443" >> /etc/pathfinder/agent.env
echo "PF_ENROLLMENT_TOKEN=your-token" >> /etc/pathfinder/agent.env
systemctl enable pathfinder-agent && systemctl start pathfinder-agent

# 3. Verify enrollment
journalctl -u pathfinder-agent | grep "enrolled"
```

### Option C: Windows

```powershell
# Install MSI
msiexec /i pathfinder-agent-0.1.0.msi /quiet `
  PF_GATEWAY_ADDRESS=gateway-host:8443 `
  PF_ENROLLMENT_TOKEN=your-token

# Verify
Get-Service PathfinderAgent
Get-Content C:\ProgramData\Pathfinder\agent-id
```

---

## Gateway Configuration Reference

```yaml
# /etc/pathfinder/gateway.yaml

server:
  port: 8443              # gRPC listen port
  tls: true               # Enable mTLS (false for dev)
  cert_file: /etc/pathfinder/tls/server.crt
  key_file: /etc/pathfinder/tls/server.key

database:
  url: postgres://...     # Or PF_DB_URL env var
  max_connections: 25

servicenow:
  instance: https://xxx.service-now.com  # Or PF_SN_INSTANCE
  auth: oauth
  client_id: ...          # Or PF_SN_CLIENT_ID
  client_secret: ...      # Or PF_SN_CLIENT_SECRET
  sync_interval: 60s      # How often to push to SN
  batch_size: 50           # Max records per sync batch

classification:
  confidence_threshold: 0.8  # Min confidence to create CIs

logging:
  level: info              # debug, info, warn, error
  format: json
```

### Environment Variable Overrides

| Variable | Overrides | Example |
|----------|-----------|---------|
| `PF_DB_URL` | `database.url` | `postgres://user:pass@host:5432/pathfinder` |
| `PF_SN_INSTANCE` | `servicenow.instance` | `https://dev12345.service-now.com` |
| `PF_SN_CLIENT_ID` | `servicenow.client_id` | OAuth client ID |
| `PF_SN_CLIENT_SECRET` | `servicenow.client_secret` | OAuth client secret |
| `PF_ENROLLMENT_TOKEN_SECRET` | `enrollment.token_secret` | JWT signing key |
| `ANTHROPIC_API_KEY` | — | Claude API key for AI Engine |

---

## ServiceNow Setup

### Step 1: Import Update Sets

```
System Update Sets → Retrieved Update Sets → Import from XML
  1. pathfinder_tier1_base.xml          → Scoped app, roles, Integration CI table, system properties
  2. pathfinder_tier1_tables_remaining.xml → Remaining 4 tables with all fields
```

### Step 2: Create Business Rules

Navigate to `x_avnth_pathfinder` scope, then for each file in `src/servicenow/business-rules/`:
1. System Definition → Business Rules → New
2. Set table, when (before/after), and insert/update triggers per file header comments
3. Paste script body

### Step 3: Create Scripted REST API

1. System Web Services → Scripted REST APIs → New
2. Name: `Pathfinder API v1`, API ID: `pathfinder`, namespace: `x_avnth`
3. Create 7 resources matching `src/servicenow/scripted-rest/pathfinder_api_v1.js`

### Step 4: Create OAuth Application

1. System OAuth → Application Registry → New
2. Type: OAuth API endpoint for external clients
3. Name: `Pathfinder Gateway`
4. Note the Client ID and Client Secret → configure in gateway.yaml

### Step 5: Configure System Properties

Navigate to `sys_properties_list.do?sysparm_query=nameLIKEx_avnth` and set:

| Property | Recommended Value |
|----------|------------------|
| `x_avnth.auto_deploy_enabled` | `false` (enable in Run stage) |
| `x_avnth.cmdb_ops_enabled` | `true` |
| `x_avnth.classification_confidence_threshold` | `0.8` |
| `x_avnth.stale_threshold_days` | `90` |
| `x_avnth.ai_engine_url` | `http://ai-engine-host:8080` |
| `x_avnth.cmdb_ops_autonomy_level` | `1` (recommend only) |

### Step 6: Build Workspace in UI Builder

Use the JSON definitions in `src/servicenow/workspace/ux-pages/` as blueprints:
1. App Engine Studio → Create Workspace → "Pathfinder"
2. Add pages: Overview, Integrations, Agent Fleet, Coverage Gaps, EA Reconciliation, Health Dashboard
3. Configure declarative actions from `ux-declarative-actions.json`
4. Set form variants from `ux-form-variants.json`

---

## Verification Checklist

| Check | Command / Location | Expected |
|-------|-------------------|----------|
| Gateway health | `curl localhost:8443` (gRPC) | Connection accepted |
| PostgreSQL schema | `\dt` in psql | 6+ tables (agents, raw_flows, classified_*, health_metrics, sn_sync_log) |
| Agent enrolled | `SELECT * FROM agents` | Agent record with status='active' |
| Flows ingested | `SELECT COUNT(*) FROM raw_flows` | Growing count |
| Classification running | `SELECT * FROM classified_integrations` | Records appearing within 60s |
| SN sync | `SELECT * FROM sn_sync_log WHERE status='success'` | Successful sync entries |
| AI Engine health | `curl localhost:8080/health` | `{"status": "ok"}` |
| SN Integration CIs | Navigate to `x_avnth_cmdb_ci_integration.list` | Records from gateway |
