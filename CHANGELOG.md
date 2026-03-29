# Changelog

All notable changes to the Avennorth Pathfinder + Intelligence Platform.

Format based on [Keep a Changelog](https://keepachangelog.com/). This project uses [Semantic Versioning](https://semver.org/).

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
