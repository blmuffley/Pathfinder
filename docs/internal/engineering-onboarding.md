# Avennorth Pathfinder — Engineering Onboarding Guide

## For New Engineers Joining the Pathfinder Team

### Quick Start

```bash
git clone https://github.com/blmuffley/Pathfinder.git
cd Pathfinder
cat CLAUDE.md         # Project overview, conventions, env vars
cat SOLUTION-INDEX.md # Complete file inventory
make test             # Run all 117 tests
```

### Architecture in 60 Seconds

```
Agents (Go, eBPF/ETW) → gRPC → Gateway (Go) → PostgreSQL → Classification Loop
                                     ↓
                              ServiceNow Sync → SN Scoped App (6 tables, Polaris workspace)
                                     ↓
                              Bearing Push → Fusion findings

Intelligence Layer (Python, FastAPI):
  Shared AI Engine (Claude API) → Integration Intelligence → CMDB Ops Agent → Service Map Intelligence
```

### Language Map

| Language | What | Where |
|----------|------|-------|
| Go 1.22 | Gateway, agents, shared client | `src/gateway/`, `src/agent/` |
| C (eBPF) | Kernel flow capture | `src/agent/linux/ebpf/` |
| Python 3.11 | Intelligence services | `src/intelligence/` |
| JavaScript | ServiceNow scoped app | `src/servicenow/` |
| Protobuf | gRPC service contract | `src/proto/` |

### Key Files to Read First

1. `CLAUDE.md` — Project conventions and build instructions
2. `docs/architecture/02-physical-architecture.md` — How all the pieces fit together
3. `src/proto/pathfinder.proto` — The gRPC contract between agents and gateway
4. `src/gateway/internal/classify/engine.go` — Classification logic (the brain)
5. `src/intelligence/cmdb-ops-agent/models/agent_base.py` — The 5-phase agent lifecycle
6. `docs/reference/architecture-decision-records.md` — Why we made the choices we did

### How to Make Changes

**Gateway/Agent changes (Go):**
```bash
cd src/gateway && go test ./... -cover     # Test
cd src/gateway && go build ./cmd/          # Build
make dev-gateway                            # Run locally
```

**Intelligence changes (Python):**
```bash
cd src/intelligence/shared-ai-engine
python3 -m pytest tests/ -v                # Test
python3 main.py                             # Run locally
```

**Proto changes:**
```bash
cd src/proto && make generate              # Regenerate Go code
cd src/gateway && go mod tidy              # Update deps
cd src/agent/linux && go mod tidy
```

### Testing

```bash
make test              # All 117 tests (Go + Python)
make test-go           # Go only (gateway + agent)
make test-python       # Python only (4 intelligence products)
make test-integration  # E2E (requires docker-compose up)
```

### What Needs Work

See `docs/guides/build-to-production.md` for the complete list. Top priorities:

1. Windows ETW agent (scaffold → real implementation)
2. K8s agent eBPF wiring (mock → real)
3. SN sync for interfaces + agents (integration-only → full)
4. Linux agent → shared client migration
5. Gateway rate limiting

### Coding Conventions

**Go:** Standard project layout. `internal/` for non-exported. gRPC for agent comms. `go test ./...` for tests.
**Python:** Type hints required. Pydantic for models. FastAPI for APIs. `pytest` for tests.
**ServiceNow:** Scope prefix `x_avnth_`. Business rules use `current`/`previous`. REST versioned under `/v1/`.

### Environment Variables

| Variable | Service | Purpose |
|----------|---------|---------|
| `PF_DB_URL` | Gateway | PostgreSQL connection string |
| `PF_SN_INSTANCE` | Gateway | ServiceNow instance URL |
| `PF_SN_CLIENT_ID` / `_SECRET` | Gateway | SN OAuth credentials |
| `PF_GATEWAY_ADDRESS` | Agents | Gateway host:port |
| `PF_ENROLLMENT_TOKEN` | Agents | JWT enrollment token |
| `ANTHROPIC_API_KEY` | AI Engine | Claude API key |
| `BEARING_WEBHOOK_URL` | Gateway | Bearing webhook (optional) |
| `BEARING_API_KEY` | Gateway | Bearing auth key (optional) |
