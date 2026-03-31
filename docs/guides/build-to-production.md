# Avennorth Pathfinder — Build to Production Guide

## For the Engineer Taking This to Production, Testing, and Release

### Current State

The platform is **code-complete across 10 phases** with 104+ passing tests. What remains is hardening, packaging, and deployment to a real environment.

---

## Step 1: Environment Setup

### 1.1 Prerequisites

```bash
# Verify toolchain
go version          # 1.22+
python3 --version   # 3.11+
docker --version    # 24+
helm version        # 3.14+
protoc --version    # 5+ (brew install protobuf protoc-gen-go protoc-gen-go-grpc)
```

### 1.2 Clone and Verify

```bash
git clone https://github.com/blmuffley/Pathfinder.git
cd Pathfinder
make test           # Should print: 104+ tests, all passing
```

### 1.3 Local Stack

```bash
make docker-up      # Start PostgreSQL
make dev-gateway    # Terminal 1: Gateway on :8443
make dev-mock-agent # Terminal 2: Synthetic flows
make dev-ai-engine  # Terminal 3: AI Engine on :8080 (needs ANTHROPIC_API_KEY)
```

Verify: `SELECT COUNT(*) FROM classified_integrations;` should show growing count.

---

## Step 2: Items That Need Finishing

### 2.1 Windows ETW Agent (3-4 weeks)

**File:** `src/agent/windows/internal/capture/etw_windows.go`
**Status:** Scaffold with TODOs

What to implement:
1. Open ETW trace session: `StartTraceW` with provider GUID `{7DD42A49-5329-4832-8DFD-43D979153A88}`
2. Enable events: EventID 10 (TCP connect IPv4), 12 (TCP disconnect), 15 (UDP send)
3. Process events in callback → emit `shared.FlowRecord`
4. WMI enrichment: `SELECT Name FROM Win32_Process WHERE ProcessId = <pid>`

Reference: The mock in `etw_stub.go` shows the exact `FlowRecord` shape expected.

### 2.2 K8s Agent eBPF Wiring (1 week)

**File:** `src/agent/k8s/cmd/main.go` line ~97
**Status:** Blocks on `<-ctx.Done()` in non-mock mode

What to implement:
1. Import the Linux eBPF loader from `src/agent/linux/internal/capture/`
2. The K8s agent runs in host network namespace — same eBPF programs work
3. Add K8s enricher output to `ProcessName` field before sending to gateway

### 2.3 SN Sync — Interfaces + Agents (2 days)

**File:** `src/gateway/internal/snsync/loop.go`
**Status:** Only syncs integrations. Interfaces, agents, and health logs not wired.

What to add to `syncOnce()`:
```go
l.syncIntegrations(ctx)  // exists
l.syncInterfaces(ctx)    // add: query classified_interfaces WHERE synced_to_sn=FALSE
l.syncAgents(ctx)        // add: query agents WHERE sn_sys_id IS NULL
```

The SN client already has `UpsertInterfaces()` and `UpsertAgents()` methods.

### 2.4 Linux Agent → Shared Client Migration (1 day)

**Current:** `src/agent/linux/internal/client/client.go` is a copy of shared client.
**Target:** Import `src/agent/shared/` instead. Delete duplicate. Update `go.mod` replace directive.

### 2.5 Gateway Rate Limiting (2 days)

Add per-agent rate limiting on gRPC `SendFlows`:
```go
// In server/grpc.go, before inserting flows:
if flowsPerSecond(agentID) > maxFlowsPerSec {
    return status.Errorf(codes.ResourceExhausted, "rate limit exceeded")
}
```

---

## Step 3: Production Hardening

### 3.1 TLS Configuration

```yaml
# config/gateway-prod.yaml
server:
  port: 8443
  tls: true
  cert_file: /etc/pathfinder/tls/server.crt
  key_file: /etc/pathfinder/tls/server.key
  ca_file: /etc/pathfinder/tls/ca.crt  # for mTLS
```

Generate certs:
```bash
# Self-signed CA
openssl genrsa -out ca.key 4096
openssl req -new -x509 -key ca.key -out ca.crt -days 3650 -subj "/CN=Pathfinder CA"

# Server cert
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -subj "/CN=pathfinder-gateway"
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 365
```

### 3.2 PostgreSQL Production Config

```sql
-- Verify partitions exist for next 3 months
-- Add a cron job or migration to create future partitions:
CREATE TABLE raw_flows_2026_07 PARTITION OF raw_flows
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
-- Repeat for each month

-- Tune for production
ALTER SYSTEM SET work_mem = '256MB';
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '4GB';  -- 25% of RAM
```

### 3.3 Health Endpoints

Add HTTP health endpoint to gateway (currently gRPC only):
```go
// In cmd/main.go, alongside gRPC server:
http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("ok"))
})
go http.ListenAndServe(":8080", nil)  // Use different port than gRPC
```

### 3.4 Structured Logging Verification

All services already log JSON. Verify log aggregation:
```bash
# Gateway logs
kubectl logs -l app.kubernetes.io/name=pathfinder-gateway --tail=5 | jq .

# Agent logs
journalctl -u pathfinder-agent -n 5 --output=json | jq .
```

---

## Step 4: Testing Checklist

### 4.1 Unit Tests (already passing)

```bash
make test  # 104+ tests
```

### 4.2 Integration Test

```bash
make docker-up  # Start PostgreSQL
# Start gateway in background
PF_DB_URL="postgres://pathfinder:localdev@localhost:5432/pathfinder?sslmode=disable" \
  go run src/gateway/cmd/ --config config/gateway-dev.yaml &

# Run integration test
cd tests/integration && go test -tags=integration -v -timeout 60s
```

**What it verifies:** Enroll → Send flows → Heartbeat → PostgreSQL writes → Classification loop → Classified integrations appear.

### 4.3 Manual Smoke Test

| # | Test | How | Expected |
|---|------|-----|----------|
| 1 | Agent enrolls | Start agent, check gateway logs | "agent enrolled" with UUID |
| 2 | Flows ingested | `SELECT COUNT(*) FROM raw_flows` | Growing count |
| 3 | Classification | `SELECT * FROM classified_integrations` | Records within 60s |
| 4 | SN sync | Check `sn_sync_log` | `status='success'` entries |
| 5 | Health scoring | `POST :8081/api/v1/health-score` with sample metrics | JSON with overall_score |
| 6 | Anomaly detection | `POST :8080/api/v1/anomaly` with sample series | Anomalies detected |
| 7 | CMDB Ops | `POST :8082/api/v1/run` with duplicate_detector | Findings returned |
| 8 | Coverage analysis | `POST :8083/api/v1/coverage` with sample data | Gaps detected |
| 9 | Bearing push | Set `BEARING_WEBHOOK_URL`, trigger push | Feed sent, 200 response |

### 4.4 Load Test

```bash
# Run 10 mock agents simultaneously
for i in $(seq 1 10); do
  go run src/gateway/cmd/mock-agent/ --gateway localhost:8443 --rate 100 --interval 5s --hostname "load-test-$i" &
done

# Monitor:
# - Gateway CPU/memory
# - PostgreSQL connection count
# - Classification backlog: SELECT COUNT(*) FROM raw_flows WHERE classified=FALSE
# - Flows/sec: watch -n1 "psql -c 'SELECT COUNT(*) FROM raw_flows'"
```

Target: Gateway handles 10 agents × 100 flows/batch × 12 batches/min = 12,000 flows/min without degradation.

---

## Step 5: Build & Package

### 5.1 Go Binaries

```bash
# Production builds (static, stripped)
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/pathfinder-gateway-linux ./src/gateway/cmd/
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/pathfinder-agent-linux ./src/agent/linux/cmd/
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o bin/pathfinder-agent-windows.exe ./src/agent/windows/cmd/
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/pathfinder-agent-k8s ./src/agent/k8s/cmd/
```

### 5.2 Docker Images

```bash
docker build -t avennorth/pathfinder-gateway:0.1.0 -f src/gateway/Dockerfile .
docker build -t avennorth/pathfinder-ai-engine:0.1.0 -f src/intelligence/shared-ai-engine/Dockerfile src/intelligence/shared-ai-engine/
docker build -t avennorth/pathfinder-integ-intel:0.1.0 -f src/intelligence/integration-intelligence/Dockerfile src/intelligence/integration-intelligence/
docker build -t avennorth/pathfinder-cmdb-ops:0.1.0 -f src/intelligence/cmdb-ops-agent/Dockerfile src/intelligence/cmdb-ops-agent/
docker build -t avennorth/pathfinder-service-map:0.1.0 -f src/intelligence/service-map-suite/Dockerfile src/intelligence/service-map-suite/
```

### 5.3 Helm Deploy

```bash
# Push images to registry
docker push avennorth/pathfinder-gateway:0.1.0
# ... push all images

# Deploy
helm install pathfinder-gateway charts/gateway/ \
  --namespace pathfinder-system \
  --set image.repository=avennorth/pathfinder-gateway \
  --set image.tag=0.1.0

helm install pathfinder-agent charts/agent/ \
  --namespace pathfinder-system \
  --set image.repository=avennorth/pathfinder-agent \
  --set image.tag=0.1.0 \
  --set gateway.address=pathfinder-gateway:8443
```

### 5.4 Linux RPM/DEB Package (optional)

```bash
# Use nfpm or fpm to package the agent binary
nfpm package --packager rpm --target bin/pathfinder-agent-0.1.0.rpm
nfpm package --packager deb --target bin/pathfinder-agent-0.1.0.deb
```

---

## Step 6: ServiceNow Deployment

See [installation-guide.md](installation-guide.md) Steps 1-6 for detailed SN setup.

**Quick version:**
1. Import 2 update set XMLs → creates tables + fields + properties
2. Paste 6 business rules + 7 REST endpoints
3. Create OAuth app → configure in gateway.yaml
4. Build workspace in UI Builder (use JSON blueprints)
5. Create Flow Designer flows (use JSON definitions)
6. Create scheduled jobs + notifications

---

## Step 7: Release Checklist

- [ ] All 104+ unit tests passing
- [ ] Integration test passing against live PostgreSQL
- [ ] Load test: 10 agents × 100 flows = 12k flows/min sustained
- [ ] TLS configured and tested (agent → gateway, gateway → SN)
- [ ] PostgreSQL partitions created for next 6 months
- [ ] SN update sets imported and validated
- [ ] SN workspace built and accessible
- [ ] SN OAuth configured and gateway syncing
- [ ] Health endpoints responding on all services
- [ ] Structured logging verified in log aggregator
- [ ] Monitoring/alerting configured (agent heartbeat, classification backlog, sync failures)
- [ ] Docker images pushed to registry
- [ ] Helm charts validated (`helm lint`)
- [ ] Bearing integration configured (if applicable)
- [ ] Backup/restore tested for PostgreSQL
- [ ] Documentation reviewed and current
- [ ] CHANGELOG.md updated
- [ ] Git tag created: `git tag -a v0.1.0 -m "Initial release"`
- [ ] Design partners notified
