# Avennorth Pathfinder + Intelligence Platform — Solution Index

## Complete File Inventory

### Root

| File | Description |
|------|-------------|
| `CLAUDE.md` | Project overview, coding conventions, build instructions, env vars |
| `CHANGELOG.md` | Version history (v0.1.0 release notes) |
| `SOLUTION-INDEX.md` | This file — complete inventory of every file and its purpose |
| `Makefile` | 20+ build/test/dev targets for the entire platform |
| `docker-compose.yml` | Local dev stack: PostgreSQL, gateway, 4 intelligence services |
| `.env.example` | Template for all environment variables |
| `.gitignore` | Go/Python/Node/eBPF exclusions |

---

### Source Code: Gateway (`src/gateway/`)

| File | Description |
|------|-------------|
| `cmd/main.go` | Gateway entry point — config, PostgreSQL, classifier, SN sync, Bearing push, gRPC server |
| `cmd/mock-agent/main.go` | Mock agent CLI — generates synthetic flows for 13 simulated app pairs |
| `Dockerfile` | Multi-stage Alpine build for gateway container |
| `go.mod` / `go.sum` | Go module with deps: grpc, pgx, zap, yaml, uuid |
| `internal/config/config.go` | YAML config loader with env var overrides (PF_DB_URL, PF_SN_*, etc.) |
| `internal/store/store.go` | PostgreSQL layer — pgx pool, embedded migrations, CRUD for agents/flows/integrations/interfaces/sync |
| `internal/store/migrations/001_initial.sql` | Schema: 6 tables, partitions, indexes, triggers |
| `internal/classify/rules.go` | 40+ port rules + process-name rules with confidence values |
| `internal/classify/engine.go` | Classification engine — groups flows, applies rules, confidence modifiers, direction/pattern detection |
| `internal/classify/loop.go` | Background loop — polls unclassified flows, classifies, upserts results |
| `internal/classify/engine_test.go` | 8 tests: port rules, grouping, confidence modifiers, direction, patterns |
| `internal/server/grpc.go` | gRPC server — Enroll, SendFlows (streaming), Heartbeat handlers |
| `internal/snsync/client.go` | ServiceNow OAuth2 REST client — token caching, upsert integrations/interfaces/agents |
| `internal/snsync/loop.go` | Background SN sync loop — pushes unsynced data on interval |
| `internal/snsync/client_test.go` | 5 tests: upsert, auth, token caching, auth failure |
| `internal/bearing/types.go` | Bearing webhook payload types (PathfinderConfidenceFeed schema) |
| `internal/bearing/resolver.go` | CI-to-SysID resolver — SN CMDB REST lookup + local cache + shadow IT hashing |
| `internal/bearing/classifier.go` | Traffic state classifier + 12 behavioral classification rules |
| `internal/bearing/publisher.go` | Bearing feed builder + HTTP publisher with scheduling |
| `internal/bearing/classifier_test.go` | 13 tests: traffic state, behavioral inference, hashing, subnets |

---

### Source Code: Agents (`src/agent/`)

| File | Description |
|------|-------------|
| **Shared** (`shared/`) | |
| `client.go` | Platform-agnostic gRPC client — Enroll, SendFlows, Heartbeat, agent ID persistence |
| `batcher.go` | Flow batcher — flush by size or interval |
| `go.mod` | Shared module |
| **Linux** (`linux/`) | |
| `cmd/main.go` | Linux agent entry — config, enroll, heartbeat, eBPF/mock capture, batcher, sender |
| `Makefile` | eBPF compile (clang), bpf2go generate, build, test |
| `ebpf/flow_tracker.c` | eBPF program — tcp_connect tracepoint, inet_sock_set_state, udp_sendmsg kprobe |
| `ebpf/vmlinux.h` | Minimal kernel type definitions for eBPF compilation |
| `internal/capture/source.go` | FlowSource interface + FlowRecord type + Batcher |
| `internal/capture/ebpf_linux.go` | eBPF loader (cilium/ebpf), ring buffer reader, event parsing |
| `internal/capture/ebpf_stub.go` | macOS dev stub — falls back to MockSource |
| `internal/capture/mock.go` | Mock flow source — 8 simulated app pairs |
| `internal/capture/source_test.go` | 5 tests: mock source, batcher flush-by-size/interval, IP conversion, stub |
| `internal/client/client.go` | gRPC client (pre-shared library, to be migrated) |
| `internal/client/client_test.go` | 5 tests: enroll, heartbeat, send flows, skip-enroll, empty flows |
| `internal/config/config.go` | Agent YAML config loader |
| **Windows** (`windows/`) | |
| `cmd/main.go` | Windows agent entry — shared client, ETW capture |
| `internal/capture/etw.go` | FlowSource interface for Windows |
| `internal/capture/etw_windows.go` | ETW scaffold (TODOs for real implementation) |
| `internal/capture/etw_stub.go` | Mock source for non-Windows dev (6 Windows-style app pairs) |
| **Kubernetes** (`k8s/`) | |
| `cmd/main.go` | K8s agent — DaemonSet wrapper, K8s enricher, shared client |
| `internal/enrichment/k8s.go` | K8s API enrichment — pod IP → name, namespace, service, deployment, labels |

---

### Source Code: Proto (`src/proto/`)

| File | Description |
|------|-------------|
| `pathfinder.proto` | gRPC service definition — 6 messages + PathfinderGateway service |
| `pathfinder.pb.go` | Generated Go message types (protoc-gen-go) |
| `pathfinder_grpc.pb.go` | Generated Go gRPC stubs (protoc-gen-go-grpc) |
| `Makefile` | Proto code generation target |
| `go.mod` | Proto module |

---

### Source Code: Intelligence (`src/intelligence/`)

| File | Description |
|------|-------------|
| **Shared AI Engine** (`shared-ai-engine/`) | |
| `main.py` | FastAPI app — /analyze, /anomaly, /usage endpoints |
| `services/claude_client.py` | Claude API wrapper — retry, token tracking, structured JSON output |
| `services/anomaly.py` | Z-score rolling window anomaly detection |
| `prompts/templates.py` | 5 prompt templates: summarize, health_score, rationalize, change_impact, classification_review |
| `models/analysis.py` | Pydantic models: AnalysisRequest/Response, IntegrationContext, HealthMetric |
| `models/anomaly.py` | Pydantic models: AnomalyRequest/Response, TimeSeriesPoint |
| `routers/analysis.py` | FastAPI router dispatching to Claude API or anomaly detector |
| `tests/test_anomaly.py` | 8 tests: spikes, dips, trends, short series, statistics |
| `tests/test_api.py` | 6 tests: health, anomaly endpoint, validation, usage, graceful degradation |
| `Dockerfile` | Python 3.11 slim container |
| **Integration Intelligence** (`integration-intelligence/`) | |
| `main.py` | FastAPI app — /health-score, /reconcile, /duplicates |
| `services/health_scorer.py` | 4-metric weighted health scoring (Avail 40%, Latency 30%, Error 20%, Stale 10%) |
| `services/summarizer.py` | AI summarization via Shared AI Engine |
| `services/ea_reconciler.py` | 3-strategy EA matching: exact CI, fuzzy Levenshtein, business service group |
| `services/rationalizer.py` | Duplicate detection (exact, reverse, name similarity), redundant interface finder |
| `tests/test_health_scorer.py` | 10 tests: perfect/degraded/critical/unknown, component scoring |
| `tests/test_ea_reconciler.py` | 9 tests: exact, fuzzy, reverse, group, batch, sorted matching |
| `tests/test_api.py` | 5 tests: health, health-score, reconcile, duplicates endpoints |
| `Dockerfile` | Python 3.11 slim container |
| **CMDB Ops Agent** (`cmdb-ops-agent/`) | |
| `main.py` | FastAPI app — /agents, /run, /run-all |
| `models/types.py` | Finding, Diagnosis, Recommendation, Action, VerificationResult, enums |
| `models/agent_base.py` | CMDBAgent ABC — 5-phase lifecycle, autonomy gating, guardrails |
| `agents/duplicate_detector.py` | Exact, reverse, name-similar duplicate detection |
| `agents/stale_record_reaper.py` | 90/180/365-day staleness tiers |
| `agents/orphan_finder.py` | Broken source_ci/target_ci reference detection |
| `agents/relationship_validator.py` | Self-reference and circular dependency detection (DFS) |
| `agents/classification_auditor.py` | Low-confidence and unclassified-active CI detection |
| `agents/compliance_checker.py` | Missing governance fields (owner, support_group, criticality) |
| `agents/health_scorer.py` | Stale/missing health score detection |
| `agents/remediation_orchestrator.py` | Meta-agent: deconflicts, prioritizes, batches cross-agent actions |
| `tests/test_agents.py` | 18 tests: all 8 agents + autonomy levels + dry run |
| `tests/test_api.py` | 5 tests: health, list agents, run single, run unknown, run all |
| `Dockerfile` | Python 3.11 slim container |
| **Service Map Intelligence** (`service-map-suite/`) | |
| `main.py` | FastAPI app — /coverage, /risk, /change-impact, /health-summary |
| `services/coverage_analyzer.py` | NoAgent/StaleAgent/WrongTier gap detection with priority rules |
| `services/risk_scorer.py` | Per-app risk: health 35%, coverage 25%, density 20%, criticality 20% |
| `services/change_impact.py` | BFS graph traversal — direct + indirect impacts |
| `services/health_analytics.py` | Distribution, trends, outlier detection |
| `tests/test_services.py` | 15 tests: coverage, risk, impact, health analytics |
| `tests/test_api.py` | 5 tests: all 4 endpoints |
| `Dockerfile` | Python 3.11 slim container |

---

### Source Code: ServiceNow (`src/servicenow/`)

| File | Description |
|------|-------------|
| **Tables** (`tables/`) | 6 JSON table definitions with all fields |
| **Business Rules** (`business-rules/`) | 6 JS files: auto-name, health status, stale check, agent heartbeat, coverage gap |
| **Scripted REST** (`scripted-rest/pathfinder_api_v1.js`) | 7 endpoints under /api/x_avnth/pathfinder/v1/ |
| **Workspace** (`workspace/`) | |
| `ux-app-config.json` | Workspace shell: routes, nav menu, badges, roles, theme |
| `ux-pages/pf_overview.json` | Landing page: KPIs, donuts, lists with component tree |
| `ux-pages/pf_integration_list.json` | Split-view list + 5-tab detail panel |
| `ux-pages/pf_agent_fleet.json` | Agent grid with header KPIs + charts |
| `ux-pages/pf_coverage_gaps.json` | Kanban board with 5 lanes |
| `ux-pages/pf_ea_reconciliation.json` | Two-panel: unmapped ↔ suggestions |
| `ux-pages/pf_health_dashboard.json` | Time-series, sparklines, heatmap |
| `ux-declarative-actions.json` | 6 actions with server scripts |
| `ux-form-variants.json` | 3 workspace form layouts |
| **Flows** (`flows/`) | |
| `coverage_gap_remediation_flow.json` | Main self-healing flow: 7 steps, 6 stages |
| `subflow_deploy_agent.json` | OS-specific agent deployment |
| `subflow_verify_enrollment.json` | Agent enrollment verification |
| **Other** | |
| `scheduled-jobs/cmdb_ops_schedules.json` | 8 cron jobs for CMDB Ops agents |
| `notifications/notification_definitions.json` | 5 events + 5 emails + 3 event-firing rules |
| `ui-policies/ui_policies.js` | 5 conditional field visibility rules |
| `client-scripts/reference_qualifiers.js` | 5 reference qualifier + field behavior scripts |
| `menus/application_menu.json` | Classic UI menu with 18 modules |
| `update-sets/pathfinder_tier1_base.xml` | Importable: app, roles, Integration CI, 10 properties |
| `update-sets/pathfinder_tier1_tables_remaining.xml` | Importable: remaining 4 tables |

---

### Helm Charts (`charts/`)

| File | Description |
|------|-------------|
| `gateway/Chart.yaml` | Chart metadata |
| `gateway/values.yaml` | Replicas, image, config, DB/SN secrets |
| `gateway/templates/deployment.yaml` | Deployment with config volume, health probes |
| `gateway/templates/service.yaml` | ClusterIP :8443 |
| `gateway/templates/configmap.yaml` | Gateway YAML from values |
| `gateway/templates/_helpers.tpl` | Name/label helpers |
| `agent/Chart.yaml` | Chart metadata |
| `agent/values.yaml` | Image, gateway, BPF capabilities, tolerations |
| `agent/templates/daemonset.yaml` | DaemonSet with hostNetwork, BPF caps, /sys mounts |
| `agent/templates/rbac.yaml` | ServiceAccount + ClusterRole (pods/services/endpoints) |
| `agent/templates/_helpers.tpl` | Name/label helpers |

---

### Configuration (`config/`)

| File | Description |
|------|-------------|
| `gateway-dev.yaml` | Dev gateway config: port 8443, PG localhost, mock SN, debug logging |
| `agent-dev.yaml` | Dev agent config: gateway localhost:8443, 10s flush, 30s heartbeat |

---

### Tests (`tests/`)

| File | Description |
|------|-------------|
| `integration/gateway_pipeline_test.go` | E2E: enroll → send flows → heartbeat → verify PG → verify classification |
| `integration/go.mod` | Integration test module |

---

### CI/CD (`.github/`)

| File | Description |
|------|-------------|
| `workflows/ci.yml` | 11 parallel jobs: 5 Go builds, 4 Python test suites, E2E test, Helm lint |

---

### Documentation (`docs/`)

| File | Description |
|------|-------------|
| **Architecture** (`architecture/`) | |
| `01-integration-interface-intelligence.md` | Data model, classification, EA reconciliation, health scoring, workspace |
| `02-physical-architecture.md` | 4-tier deployment, gRPC, PostgreSQL schema, agent specs |
| `03-cmdb-quality-agentic-ops.md` | 8 CMDB agents, autonomy levels, scheduling, guardrails |
| `04-portfolio-architecture.md` | Product portfolio, pricing, channel strategy |
| `05-acc-models-self-healing.md` | ACC deployment models, coverage gap self-healing, Crawl/Walk/Run/Fly |
| **Diagrams** (`diagrams/`) | 10 SVGs + Figma import specs |
| **Guides** (`guides/`) | |
| `installation-guide.md` (.docx) | Prerequisites, quick start, K8s/bare metal/Windows, SN setup |
| `operations-runbook.md` (.docx) | Health checks, troubleshooting, monitoring, backup, scaling |
| `implementation-playbook.md` (.docx) | Crawl/Walk/Run/Fly step-by-step with weeks/owners/criteria |
| `partner-enablement-guide.md` (.docx) | Compass partner scoping, SOW template, revenue model |
| `user-guide-workspace.md` (.docx) | Daily analyst workflow, page-by-page workspace instructions |
| `five-year-business-case.md` (.docx, .pdf) | Avennorth model, $40M ARR, 14 people, bootstrappable |
| `build-to-production.md` | Engineering guide: finish items, hardening, testing, packaging, release |
| **Reference** (`reference/`) | |
| `api-reference.md` (.docx) | All 6 service APIs with request/response schemas |
| `sequence-diagrams.md` (.docx) | 8 key flows: enrollment, classification, sync, health, CMDB ops, self-healing |
| `security-architecture.md` (.docx) | Auth, encryption, agent security, guardrails, compliance |
| `data-dictionary.md` (.docx) | All 12 tables (6 SN + 6 PG) with every field documented |
| `network-firewall-diagram.md` (.docx) | ASCII topology, firewall rules, ports, DNS, TLS |
| `capacity-planning.md` (.docx) | Sizing 100-10k hosts, PG tuning, Claude token budget, HA |
| `architecture-decision-records.md` (.docx) | 8 ADRs: eBPF, Go+Python, PostgreSQL, confidence, CSDM, agents, Compass, Claude |
| **Methodology** (`methodology/`) | |
| `pathfinder-deployment-methodology.md` (.docx) | 55-story WBS across 4 stages |
| **Business Models** (`business-models/`) | |
| `current/v03-business-case.jsx` (.pdf) | Pricing, capabilities, 5-year revenue (updated) |
| `current/v04-compass-channel.jsx` (.pdf) | Channel economics, deal flow (updated) |
| `current/v05-lean-model.jsx` (.pdf) | Lean staffing, capital efficiency (updated) |
| `archive/v01-*.jsx`, `archive/v02-*.jsx` | Archived early-stage models |
| **Prototype** (`prototypes/`) | |
| `pathfinder-workspace-prototype.jsx` | Standalone React component (6 pages, interactive) |
| `DEMO-SCRIPT.md` (.docx) | 15-min scripted walkthrough with talking points |
| `workspace-app/` | Vite React app (port 4200) for running the prototype |
| **Customer-Facing** (`customer-facing/`) | |
| `diagrams/01-solution-overview.svg` | 4-step discovery pipeline + pricing tiers |
| `diagrams/02-deployment-journey.svg` | Crawl/Walk/Run/Fly timeline |
| **Generators** | |
| `generate_all_docs.py` | Regenerate all 15+ DOCX files from markdown |
| `business-models/generate_pdfs.py` | Regenerate business model PDFs |
| `guides/generate_guide_pdfs.py` | Regenerate business case PDF |

---

### Test Summary

| Module | Tests | Coverage |
|--------|-------|----------|
| Gateway classify | 8 | 69% |
| Gateway snsync | 5 | 54% |
| Gateway bearing | 13 | 11% |
| Agent capture | 5 | 76% |
| Agent client | 5 | 65% |
| Shared AI Engine | 14 | — |
| Integration Intelligence | 24 | — |
| CMDB Ops Agent | 23 | — |
| Service Map Intelligence | 20 | — |
| **Total** | **117** | **All passing** |

---

### Port Assignments

| Port | Service | Notes |
|------|---------|-------|
| 4200 | Workspace prototype | Dev only |
| 5432 | PostgreSQL | Private |
| 8080 | Shared AI Engine | Internal |
| 8081 | Integration Intelligence | Internal |
| 8082 | CMDB Ops Agent | Internal |
| 8083 | Service Map Intelligence | Internal |
| 8443 | Gateway (gRPC) | Agents connect here |
