# Pathfinder Deployment Methodology

## Crawl / Walk / Run / Fly

### Stage 1: Crawl (Weeks 1-4)
**Goal:** Proof of concept — 10-20 servers, manual review

| # | Story | Product | Acceptance Criteria |
|---|-------|---------|-------------------|
| 1 | Deploy PostgreSQL + Gateway to staging | Gateway | Gateway starts, migrations run, health endpoint responds |
| 2 | Deploy Linux agents to 10 representative servers | Agent | Agents enroll, heartbeats received |
| 3 | Verify flow capture on each agent | Agent | Raw flows appear in PostgreSQL within 60s |
| 4 | Validate classification engine accuracy | Gateway | >80% of known integrations correctly classified |
| 5 | Configure ServiceNow scoped app tables | SN App | 6 tables created, fields match spec |
| 6 | Enable gateway → SN sync | Gateway | Integration CIs appear in ServiceNow |
| 7 | Deploy Pathfinder workspace in SN | SN App | Workspace accessible, navigation works |
| 8 | Manual review of discovered integrations | Analyst | Compare against known integration documentation |
| 9 | Tune classification confidence threshold | Gateway | False positive rate < 5% |
| 10 | Crawl stage sign-off | PM | Discovered integrations match/exceed manual docs |

**KPIs:** Discovery accuracy > 80%, Zero false positives at confidence ≥ 0.9

---

### Stage 2: Walk (Weeks 5-12)
**Goal:** Production coverage + intelligence enabled

| # | Story | Product | Acceptance Criteria |
|---|-------|---------|-------------------|
| 11 | Expand agents to all production servers | Agent | >80% production server coverage |
| 12 | Deploy Shared AI Engine | AI Engine | Health endpoint responds, Claude API connected |
| 13 | Enable Integration Intelligence health scoring | IntegIntel | Health scores computed for all integrations |
| 14 | Enable AI summarization | IntegIntel | AI summaries appear on Integration CIs in SN |
| 15 | Enable EA reconciliation | IntegIntel | Unmapped integrations get match suggestions |
| 16 | Deploy health dashboard in SN | SN App | Dashboard renders with live data |
| 17 | Deploy Service Map Intelligence | SvcMap | Coverage gaps detected and surfaced |
| 18 | Enable coverage gap notifications | SN App | Flow Designer sends email/Slack on new gaps |
| 19 | Train integration analysts on workspace | Training | Analysts can triage gaps, confirm EA mappings |
| 20 | Configure risk scoring thresholds | SvcMap | Risk scores align with organization's risk model |
| 21 | Enable change impact analysis | SvcMap | Change requests show integration impact |
| 22 | Walk stage sign-off | PM | >80% coverage, health scores on all integrations |

**KPIs:** Coverage > 80%, Health scores populated > 95%, EA mapping started

---

### Stage 3: Run (Weeks 13-24)
**Goal:** Autonomous operations + non-production

| # | Story | Product | Acceptance Criteria |
|---|-------|---------|-------------------|
| 23 | Expand agents to non-production environments | Agent | Dev/staging/QA servers enrolled |
| 24 | Deploy CMDB Ops Agent at autonomy level 1 | CMDB Ops | 8 agents running, recommendations generated |
| 25 | Enable DuplicateDetector agent | CMDB Ops | Duplicates flagged, merge recommendations |
| 26 | Enable StaleRecordReaper agent | CMDB Ops | Stale CIs identified at 90/180/365-day tiers |
| 27 | Enable OrphanFinder agent | CMDB Ops | Broken references detected |
| 28 | Enable ComplianceChecker agent | CMDB Ops | Missing governance fields flagged |
| 29 | Promote CMDB Ops to autonomy level 2 | CMDB Ops | Change requests created automatically |
| 30 | Enable coverage gap auto-deploy (standard CRs) | SN App | Low/medium priority gaps auto-remediated |
| 31 | Deploy Windows agents | Agent | Windows servers covered with ETW capture |
| 32 | Deploy K8s DaemonSet agents | Agent | K8s nodes covered with pod enrichment |
| 33 | Tune health scoring baselines | IntegIntel | Baselines calibrated per integration type |
| 34 | Enable rationalization analysis | IntegIntel | Redundant integrations identified |
| 35 | Configure change freeze windows | SN App | Auto-deploy respects freeze schedules |
| 36 | Run stage sign-off | PM | >90% coverage, CMDB quality >90% |

**KPIs:** Coverage > 90%, CMDB quality > 90%, 50% reduction in manual effort

---

### Stage 4: Fly (Week 25+)
**Goal:** Full platform maturity — autonomous operations

| # | Story | Product | Acceptance Criteria |
|---|-------|---------|-------------------|
| 37 | 100% server coverage (prod + non-prod) | Agent | All servers enrolled and reporting |
| 38 | Promote CMDB Ops to autonomy level 2-3 | CMDB Ops | Agents act autonomously with retroactive CRs |
| 39 | Enable full self-healing loop | SN App | Auto-deploy for all priority levels |
| 40 | Coverage tier 4 for critical applications | Agent | Full: enhanced + latency + health telemetry |
| 41 | Enable RemediationOrchestrator coordination | CMDB Ops | Cross-agent conflict resolution automated |
| 42 | Integration with change management CAB | SN App | High/critical changes routed through CAB |
| 43 | Enable anomaly-driven alerting | AI Engine | Z-score anomalies trigger ServiceNow events |
| 44 | Build executive reporting dashboard | SN App | Monthly KPI reports auto-generated |
| 45 | Performance tuning and capacity planning | Ops | System handles 10x current flow volume |
| 46 | Disaster recovery runbook | Ops | DR tested, RTO < 4h, RPO < 1h |
| 47 | SOC 2 compliance documentation | Compliance | Audit trail complete, access controls verified |
| 48 | Agent auto-update mechanism | Agent | Agents update without manual intervention |
| 49 | Multi-instance SN support | Gateway | Gateway syncs to multiple SN instances |
| 50 | API rate limiting and throttling | Gateway | Gateway handles burst traffic gracefully |
| 51 | Tenant isolation for SaaS model | Platform | Data isolation verified for multi-tenant |
| 52 | Customer onboarding automation | Platform | New customer provisioned in < 1 hour |
| 53 | SLA monitoring and reporting | Platform | 99.9% uptime SLA tracked |
| 54 | Penetration testing | Security | No critical/high vulnerabilities |
| 55 | Fly stage sign-off | PM | >95% coverage, >95% CMDB quality, 80% reduction |

**KPIs:** Coverage > 95%, CMDB quality > 95%, 80% reduction in manual effort

---

## Architecture Reference

See `docs/architecture/` for detailed specifications:
- `01-integration-interface-intelligence.md` — Data model, classification, EA reconciliation
- `02-physical-architecture.md` — Four-tier deployment, gRPC, PostgreSQL
- `03-cmdb-quality-agentic-ops.md` — 8 CMDB agents, autonomy levels
- `04-portfolio-architecture.md` — Portfolio map, pricing, channels
- `05-acc-models-self-healing.md` — ACC models, coverage gap self-healing
