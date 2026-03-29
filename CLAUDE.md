# CLAUDE.md — Pathfinder + Intelligence Platform

## Project Overview

This is the Avennorth Pathfinder + Intelligence Platform monorepo. It contains four products that work together to provide CMDB-first service discovery, integration governance, autonomous CMDB management, and service map intelligence for ServiceNow environments.

### Products in This Repo

| Product | Path | Language | Description |
|---------|------|----------|-------------|
| Pathfinder Agent (Linux) | `src/agent/linux/` | Go + eBPF (C) | Kernel-level network observer using eBPF |
| Pathfinder Agent (Windows) | `src/agent/windows/` | Go (ETW) | Windows ETW-based network observer |
| Pathfinder Agent (K8s) | `src/agent/k8s/` | Go + eBPF | DaemonSet wrapper with K8s API client |
| Pathfinder Gateway | `src/gateway/` | Go | Classification engine, CI resolution, SN sync |
| ServiceNow Scoped App | `src/servicenow/` | JavaScript (SN) | Tables, business rules, REST APIs, flows, dashboards |
| Integration Intelligence | `src/intelligence/integration-intelligence/` | Python | AI summarization, health scoring, rationalization |
| CMDB Ops Agent | `src/intelligence/cmdb-ops-agent/` | Python | 8 autonomous AI agents for CMDB lifecycle |
| Service Map Intelligence | `src/intelligence/service-map-suite/` | Python | Coverage, risk, change impact, health analytics |
| Shared AI Engine | `src/intelligence/shared-ai-engine/` | Python | LLM orchestration, anomaly detection, shared services |

### Architecture Docs

All architecture documentation is in `docs/architecture/`. Read these before making changes:

- `01-integration-interface-intelligence.md` — Data model for Integration/Interface CIs, classification engine, EA reconciliation
- `02-physical-architecture.md` — Four-tier deployment model, agent specs, gateway, SN integration
- `03-cmdb-quality-agentic-ops.md` — Duplicate/orphan/stale detection, 8 AI agents, autonomy levels
- `04-portfolio-architecture.md` — Full Avennorth portfolio map, pricing, channel strategy
- `05-acc-models-self-healing.md` — Three ACC deployment models, coverage gap self-healing loop

## Build & Development

### Prerequisites

```bash
# Go 1.22+ (agent + gateway)
go version

# Python 3.11+ (intelligence products)
python3 --version

# Node.js 20+ (ServiceNow dev tooling)
node --version

# Docker & Docker Compose (local development)
docker --version

# eBPF toolchain (Linux agent development only)
# Install: apt install clang llvm libbpf-dev bpftool
clang --version
bpftool version
```

### Quick Start

```bash
# 1. Start local infrastructure (PostgreSQL, mock SN instance)
docker-compose up -d

# 2. Build gateway
cd src/gateway && go build -o pathfinder-gateway ./cmd/

# 3. Build Linux agent (requires Linux with eBPF support)
cd src/agent/linux && make build

# 4. Run gateway locally
./pathfinder-gateway --config config/gateway-dev.yaml

# 5. Run agent locally (requires CAP_BPF)
sudo ./pathfinder-agent --config config/agent-dev.yaml

# 6. Start AI engine (for intelligence products)
cd src/intelligence/shared-ai-engine && pip install -r requirements.txt && python main.py
```

### ServiceNow Development

The `src/servicenow/` directory contains the scoped app definition. To deploy:

```bash
# Option 1: ServiceNow CLI (sn-cli)
cd src/servicenow && sn push --instance your-instance.service-now.com

# Option 2: Manual — import update set XML
# Copy src/servicenow/update-sets/*.xml to your instance via System Update Sets
```

## Coding Conventions

### Go (Agent + Gateway)
- Follow Go standard project layout
- Use `internal/` for non-exported packages
- eBPF C code in `src/agent/linux/ebpf/` — compiled with clang, embedded via go:embed
- gRPC for agent → gateway communication (proto files in `src/proto/`)
- Tests: `go test ./...` — aim for 80%+ coverage on gateway logic

### Python (Intelligence Products)
- Python 3.11+, type hints required
- Use `pydantic` for data models
- Use `anthropic` SDK for Claude API calls
- Each AI agent is a separate module with a standard interface: `observe()`, `diagnose()`, `recommend()`, `act()`, `verify()`
- Tests: `pytest` — aim for 80%+ coverage

### ServiceNow (Scoped App)
- Scope prefix: `x_avnth_`
- All tables extend `cmdb_ci` where applicable
- Business rules: use `current` and `previous` objects, never GlideRecord in display business rules
- Scripted REST: version all endpoints under `/api/x_avnth/pathfinder/v1/`
- Flow Designer: use for all automated workflows (coverage loop, triage, remediation)

## Key Data Models

### Integration CI: `x_avnth_cmdb_ci_integration`
Extends `cmdb_ci`. Represents a logical connection between two applications. See `docs/architecture/01-integration-interface-intelligence.md` Section 1.3 for full field list.

### Interface CI: `x_avnth_cmdb_ci_interface`
Extends `cmdb_ci`. Child of Integration CI (1:M). Represents a specific data exchange pathway. Carries behavioral classification attributes.

### Health Log: `x_avnth_integration_health_log`
Time-series telemetry. Written by Pathfinder gateway, consumed by Integration Intelligence for health scoring.

### Coverage Gap: `x_avnth_coverage_gap`
Tracks servers that should have agents but don't. Feeds self-healing remediation loop.

### Agent Inventory: `x_avnth_pathfinder_agent`
Every enrolled agent with heartbeat status, deployment model, coverage tier.

### EA Reconciliation Map: `x_avnth_integration_ea_map`
Links discovered integrations to EA relationship records.

## Testing

```bash
# Run all tests
make test

# Run specific product tests
make test-gateway
make test-agent-linux
make test-intelligence

# Integration tests (requires docker-compose up)
make test-integration
```

## Deployment

See `docs/methodology/pathfinder-deployment-methodology.md` for the full 55-story WBS covering Crawl/Walk/Run/Fly deployment phases.

### Gateway Deployment
```bash
# Docker
docker build -t pathfinder-gateway -f src/gateway/Dockerfile .
docker run -d --name gateway -p 8443:8443 pathfinder-gateway

# Kubernetes
helm install pathfinder-gateway charts/gateway/ --values config/gateway-prod.yaml
```

### Agent Deployment
```bash
# Linux (RPM)
rpm -i pathfinder-agent-*.rpm
systemctl enable pathfinder-agent && systemctl start pathfinder-agent

# Kubernetes DaemonSet
helm install pathfinder-agent charts/agent/ --namespace pathfinder-system
```

## Environment Variables

| Variable | Component | Description |
|----------|-----------|-------------|
| `PF_GATEWAY_ADDRESS` | Agent | Gateway address (host:port) |
| `PF_ENROLLMENT_TOKEN` | Agent | One-time enrollment JWT |
| `PF_DB_URL` | Gateway | PostgreSQL connection string |
| `PF_SN_INSTANCE` | Gateway | ServiceNow instance URL |
| `PF_SN_CLIENT_ID` | Gateway | ServiceNow OAuth client ID |
| `PF_SN_CLIENT_SECRET` | Gateway | ServiceNow OAuth client secret |
| `ANTHROPIC_API_KEY` | AI Engine | Claude API key for intelligence products |
| `PF_AI_ENGINE_URL` | SN Scoped App | Avennorth AI engine endpoint |
