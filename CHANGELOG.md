# Changelog

All notable changes to the Avennorth Pathfinder + Intelligence Platform.

Format based on [Keep a Changelog](https://keepachangelog.com/). This project uses [Semantic Versioning](https://semver.org/).

## [0.3.0] - 2026-04-01

### Added — Service Graph Connector
- **Free Service Graph Connector (SGC)** for ServiceNow Store — uses IRE `identifyreconcile` API instead of proprietary REST endpoints
- Gateway SGC publisher module (`src/gateway/internal/sgc/`) — 4 files, 1,960 lines, 13 tests all passing
- ServiceNow SGC scoped app (`src/servicenow/sgc/`) — connector definition, IRE identification/reconciliation rules, scheduled import, health check, transform maps
- CI class mapping: servers → `cmdb_ci_linux_server`/`cmdb_ci_win_server`, apps → `cmdb_ci_app_server`, cloud → `cmdb_ci_cloud_service`, medical → `cmdb_ci_medical_device`
- Standard CSDM relationship types: `Depends on::Used by`, `Sends data to::Receives data from`
- Gateway export API (`GET /api/v1/sgc/export`, `POST /api/v1/sgc/ack`) for SN pull model
- SGC enabled by default (`PF_SGC_ENABLED`); legacy sync available via `PF_LEGACY_SYNC=true`

### Added — Clinical Extension
- Modular platform architecture with 4-tier device classification (T1 IT, T2 IoT, T3 Clinical, T4 Life-Critical)
- Discovery Normalization Layer — multi-source (eBPF + Armis + SN Discovery + manual) with confidence weighting
- Pathfinder Cloud module — SaaS/PaaS discovery from outbound traffic (500+ patterns, included in Base)
- Meridian (Clinical Operations Graph) — UKG Pro workforce correlation, schedule-aware impact analysis
- Ledger (Compliance Automation) — rule engine with healthcare (JC/CMS/FDA) + general (SOC 2/ISO) packs
- Vantage Clinical extension spec — PSIS scoring, blast radius, RACI escalation, MAUDE matching
- 5 provisional patent claims drafted (clinical ops graph, discovery-agnostic platform, behavioral classification)
- Competitive analysis vs Armis, Claroty, Cynerio, Ordr
- Shared data model (`docs/architecture/10-shared-data-model.md`) — cross-product CSDM-aligned schema

### Added — Demo & Sales
- 13-page interactive prototype with light/dark theme toggle (http://localhost:4200)
- Applications page with visual dependency diagram (4 layout modes, device type filters, legend)
- Demo data package: Mercy Health System (3 facilities, 6,425 devices, 22 clinical devices, 8 staff)
- 3 demo scripts: 10-min executive, 30-min technical, 50-min deep dive
- 5 sales materials: one-pager, battlecard, ROI calculator, objection handling, partner pitch
- Contour and Bearing project prompts for separate repo builds
- Master port registry for all Avennorth solutions

### Changed
- Pricing restructured: 2 packages (Standard/Professional) with annual pricing by managed node bands (S/M/L/XL)
- Revenue model: penetration pricing as base plan (Likely ~$97.5M Y5 ARR) with Bear/Bull/Best scenarios
- Five-year business case rewritten to investor/CFO grade (P&L, cash flow, unit economics, portfolio shared costs)
- Business case adds: stickiness analysis (7 switching cost layers), exit optionality (SN acquisition at 15-25x ARR)
- Pathfinder + Contour bundle as primary offering ($70K S-tier, 30% discount)

### Deprecated
- Proprietary REST API (`/api/x_avnth/pathfinder/v1/*`) — use SGC for new deployments
- `src/gateway/internal/snsync/` — legacy sync loop, enable with `PF_LEGACY_SYNC=true`

## [0.2.0] - 2026-03-31

### Added
- Customer-facing docs: solution brief, FAQ
- Partner enablement guide with SOW template
- Internal product strategy document
- Five-year business case v1.0

## [0.1.0] - 2026-03-29

### Added

**Phase 0: Foundation**
- 5 architecture documents (data model, physical architecture, CMDB ops, portfolio, self-healing)
- PostgreSQL schema with 6 tables (agents, raw_flows, classified_integrations/interfaces, health_metrics, sn_sync_log)
- ServiceNow table definitions (6 JSON specs for x_avnth_ tables)
- 10 architecture diagrams (SVG)

**Phase 1: Gateway Core**
- gRPC server with Enroll, SendFlows (streaming), Heartbeat RPCs
- Classification engine: 40+ port rules, process-name rules, confidence scoring with 4 modifiers
- PostgreSQL store layer (pgx) with embedded migrations
- ServiceNow OAuth2 sync client + batch sync loop
- Mock agent CLI for testing
- Gateway Dockerfile (multi-stage Alpine build)

**Phase 2: Linux Agent**
- eBPF flow tracker (tcp_connect tracepoint, inet_sock_set_state, udp_sendmsg kprobe)
- Ring buffer reader with FlowRecord parsing
- macOS development stub (mock flow source)
- gRPC client with enrollment, flow streaming, heartbeat
- Flow batcher (size + interval flush)

**Phase 3: ServiceNow Scoped App**
- 6 business rules (auto-name, health status derivation, stale check, agent lifecycle, coverage gap creation)
- Scripted REST API (7 endpoints under /api/x_avnth/pathfinder/v1/)
- ServiceNow sync loop in gateway (OAuth2 + batch upsert)

**Phase 4: Shared AI Engine**
- Claude API client wrapper (retry, token tracking, structured JSON output)
- Z-score anomaly detection on time series
- 5 prompt templates (summarize, health_score, rationalize, change_impact, classification_review)
- FastAPI app with /analyze, /anomaly, /usage endpoints

**Phase 5: Integration Intelligence**
- Health scorer (4-metric weighted: Availability 40%, Latency 30%, Error Rate 20%, Staleness 10%)
- AI summarization via Shared AI Engine
- EA reconciliation (3-strategy matching: exact CI, fuzzy Levenshtein, business service group)
- Integration rationalization (duplicate detection, redundant interface finder)

**Phase 6: CMDB Ops Agent**
- Agent base class with 5-phase lifecycle (observe/diagnose/recommend/act/verify)
- 8 autonomous agents: DuplicateDetector, StaleRecordReaper, OrphanFinder, RelationshipValidator, ClassificationAuditor, ComplianceChecker, HealthScorer, RemediationOrchestrator
- 4 autonomy levels (Report/Recommend/ActWithApproval/Autonomous)
- Guardrails: 50 CI blast radius, 24h cooldown, kill switch

**Phase 7: Service Map Intelligence**
- Coverage analyzer (NoAgent, StaleAgent, WrongTier gap detection)
- Per-application risk scorer (health 35%, coverage 25%, density 20%, criticality 20%)
- Change impact analyzer (BFS graph traversal, direct + indirect impacts)
- Health analytics (distribution, trends, outlier detection)

**Phase 8: Windows + K8s Agents + Helm**
- Shared gRPC client library (src/agent/shared/)
- Windows ETW agent scaffold
- Kubernetes DaemonSet agent with K8s API enrichment
- Gateway Helm chart (Deployment + Service + ConfigMap)
- Agent Helm chart (DaemonSet + RBAC + hostNetwork + BPF capabilities)

**Phase 9: Polish**
- Integration test suite (gateway pipeline end-to-end)
- GitHub Actions CI/CD (11 parallel jobs)
- Full docker-compose.yml (6 services)
- Deployment methodology (55-story WBS)

**ServiceNow UI (Post-Phase)**
- Polaris workspace definition (6 pages: Overview, Integrations, Agent Fleet, Coverage Gaps Kanban, EA Reconciliation, Health Dashboard)
- 6 declarative actions with server scripts
- 3 form variants, 5 UI policies, 5 client scripts
- Application menu (18 modules), 3 roles
- Flow Designer: coverage gap remediation + 2 subflows
- 8 scheduled jobs, 5 notification events
- 10 system properties
- 2 update set XMLs for import
- 2 dashboard definitions

**Documentation**
- Installation guide, operations runbook, implementation playbook
- API reference, sequence diagrams, security architecture, data dictionary
- Network/firewall diagram, capacity planning guide
- Partner enablement guide, workspace user guide
- 5-year business case, 3 business model documents (updated + PDFs)
- Interactive workspace prototype (React + Recharts) + demo script
- Architecture decision records

**Testing**
- 104+ unit tests across Go (gateway classify, SN sync, agent capture, agent client) and Python (AI engine, integration intelligence, CMDB ops, service map)
- All passing

### Technical Details
- Languages: Go 1.22, Python 3.11, C (eBPF), JavaScript (ServiceNow)
- Dependencies: gRPC, pgx/v5, cilium/ebpf, zap, FastAPI, anthropic SDK, Pydantic, numpy
- Proto: pathfinder.proto with 6 messages + PathfinderGateway service
- Database: PostgreSQL 16 with monthly partitions + triggers
