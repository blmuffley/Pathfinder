# Avennorth Pathfinder — Implementation Playbook

## Overview

This playbook guides a Pathfinder deployment from first agent to full autonomous operations using the **Crawl / Walk / Run / Fly** methodology. Each stage has clear entry criteria, steps, and exit criteria.

**Typical timeline:** 12-16 weeks to Walk stage. 24 weeks to Run. Fly by 6 months.

---

## Stage 1: Crawl (Weeks 1-4)

### Goal
Proof of concept on 10-20 servers. Validate discovery accuracy.

### Entry Criteria
- [ ] ServiceNow instance available (Utah+)
- [ ] PostgreSQL provisioned
- [ ] 10-20 target servers identified (production, mix of OS)
- [ ] Network access: agents → gateway on port 8443

### Week 1: Infrastructure

| Step | Action | Owner | Duration |
|------|--------|-------|----------|
| 1.1 | Deploy PostgreSQL (docker-compose or managed) | DevOps | 1 hour |
| 1.2 | Deploy Gateway | DevOps | 1 hour |
| 1.3 | Import SN update sets (Tier 1) | SN Admin | 2 hours |
| 1.4 | Create SN OAuth application | SN Admin | 30 min |
| 1.5 | Configure Gateway → SN sync | DevOps | 30 min |
| 1.6 | Create business rules (paste 6 JS files) | SN Dev | 1 hour |
| 1.7 | Create Scripted REST API (7 endpoints) | SN Dev | 2 hours |
| 1.8 | Verify: mock-agent → gateway → PostgreSQL → SN | DevOps | 1 hour |

### Week 2: Agent Deployment

| Step | Action | Owner | Duration |
|------|--------|-------|----------|
| 2.1 | Install Linux agents on 5 servers | DevOps | 2 hours |
| 2.2 | Install Windows agents on 3 servers | DevOps | 2 hours |
| 2.3 | Deploy K8s DaemonSet (if applicable) | DevOps | 1 hour |
| 2.4 | Verify all agents enrolled | DevOps | 30 min |
| 2.5 | Monitor: flows appearing in PostgreSQL | DevOps | Ongoing |
| 2.6 | Expand to remaining 10-20 servers | DevOps | 2 hours |

### Week 3: Validation

| Step | Action | Owner | Duration |
|------|--------|-------|----------|
| 3.1 | Compare discovered integrations vs. known documentation | Analyst | 4 hours |
| 3.2 | Review classification accuracy (spot-check 20 integrations) | Analyst | 2 hours |
| 3.3 | Tune confidence threshold if needed (default 0.8) | Architect | 1 hour |
| 3.4 | Verify Integration CIs in ServiceNow | SN Admin | 1 hour |
| 3.5 | Document false positives and missed integrations | Analyst | 2 hours |
| 3.6 | Add port/process rules for custom applications | Engineer | As needed |

### Week 4: SN Workspace

| Step | Action | Owner | Duration |
|------|--------|-------|----------|
| 4.1 | Build Pathfinder workspace in UI Builder | SN Dev | 4 hours |
| 4.2 | Build Overview landing page | SN Dev | 3 hours |
| 4.3 | Build Integration Explorer (split-view) | SN Dev | 4 hours |
| 4.4 | Build Agent Fleet page | SN Dev | 2 hours |
| 4.5 | Configure roles and ACLs | SN Admin | 1 hour |
| 4.6 | Crawl stage sign-off demo | PM | 1 hour |

### Exit Criteria
- [ ] ≥ 80% of known integrations discovered
- [ ] < 5% false positive rate at confidence ≥ 0.9
- [ ] Integration CIs visible in ServiceNow workspace
- [ ] All agents healthy (heartbeats < 5 min old)

---

## Stage 2: Walk (Weeks 5-12)

### Goal
Production coverage + intelligence enabled. >80% coverage.

### Entry Criteria
- [ ] Crawl sign-off complete
- [ ] ANTHROPIC_API_KEY provisioned
- [ ] AI Engine deployed

### Weeks 5-6: Expand Coverage

| Step | Action |
|------|--------|
| 5.1 | Deploy agents to all production Linux servers |
| 5.2 | Deploy agents to all production Windows servers |
| 5.3 | Deploy K8s DaemonSet to all clusters |
| 5.4 | Verify coverage > 80% of production servers |
| 5.5 | Create coverage gaps for remaining servers |

### Weeks 7-8: Enable Intelligence

| Step | Action |
|------|--------|
| 7.1 | Deploy Shared AI Engine (`ANTHROPIC_API_KEY` configured) |
| 7.2 | Deploy Integration Intelligence service |
| 7.3 | Run health scoring on all discovered integrations |
| 7.4 | Verify health scores appear on Integration CIs in SN |
| 7.5 | Trigger AI summarization for top 20 critical integrations |
| 7.6 | Verify AI summaries appear in SN workspace |

### Weeks 9-10: EA Reconciliation + Coverage

| Step | Action |
|------|--------|
| 9.1 | Export EA relationship records from SN (`cmdb_rel_ci`) |
| 9.2 | Run EA reconciliation batch |
| 9.3 | Review suggested matches in SN workspace |
| 9.4 | Train analysts to confirm/reject EA mappings |
| 9.5 | Deploy Service Map Intelligence |
| 9.6 | Build Coverage Gaps Kanban page in workspace |
| 9.7 | Build Health Dashboard page |

### Weeks 11-12: Dashboards + Notifications

| Step | Action |
|------|--------|
| 11.1 | Build EA Reconciliation two-panel page |
| 11.2 | Configure notification events (gap detected, health critical, agent stale) |
| 11.3 | Create Flow Designer coverage gap remediation flow (notification-only mode) |
| 11.4 | Train integration analysts on full workspace |
| 11.5 | Walk stage sign-off |

### Exit Criteria
- [ ] > 80% production server coverage
- [ ] Health scores on all integrations
- [ ] EA reconciliation started (> 20% mapped)
- [ ] Workspace fully built (6 pages)
- [ ] Notifications firing for critical health + coverage gaps

---

## Stage 3: Run (Weeks 13-24)

### Goal
Autonomous CMDB operations. Non-production coverage. >90% coverage.

### Weeks 13-16: CMDB Ops Agents

| Step | Action |
|------|--------|
| 13.1 | Deploy CMDB Ops Agent service |
| 13.2 | Enable DuplicateDetector at autonomy level 1 (recommend) |
| 13.3 | Enable StaleRecordReaper at autonomy level 1 |
| 13.4 | Enable ComplianceChecker at autonomy level 1 |
| 13.5 | Review recommendations for 2 weeks |
| 13.6 | Promote to autonomy level 2 (creates CRs) for low-risk agents |
| 13.7 | Create scheduled jobs for all 8 agents |

### Weeks 17-20: Expand + Self-Healing

| Step | Action |
|------|--------|
| 17.1 | Deploy agents to non-production environments |
| 17.2 | Enable auto-deploy for Low/Medium priority coverage gaps |
| 17.3 | Enable coverage gap self-healing flow |
| 17.4 | Configure change freeze windows |
| 17.5 | Enable change impact analysis |
| 17.6 | Tune risk scoring thresholds |

### Weeks 21-24: Maturity

| Step | Action |
|------|--------|
| 21.1 | Enable remaining CMDB agents (OrphanFinder, RelationshipValidator, ClassificationAuditor) |
| 21.2 | Enable RemediationOrchestrator for cross-agent coordination |
| 21.3 | Enable rationalization analysis |
| 21.4 | Run stage sign-off |

### Exit Criteria
- [ ] > 90% total server coverage (prod + non-prod)
- [ ] CMDB quality > 90% (measured by ComplianceChecker findings trending down)
- [ ] Auto-deploy resolving > 50% of Low/Medium gaps
- [ ] 50% reduction in manual CMDB effort

---

## Stage 4: Fly (Week 25+)

### Goal
Full autonomous operations. 100% coverage. Continuous improvement.

| Step | Action |
|------|--------|
| F.1 | Achieve 100% production coverage |
| F.2 | Promote CMDB Ops agents to autonomy level 2-3 |
| F.3 | Enable auto-deploy for all priority levels |
| F.4 | Coverage tier 4 (Full telemetry) for critical applications |
| F.5 | Enable anomaly-driven alerting |
| F.6 | Build executive reporting dashboards |
| F.7 | Ongoing: tune, optimize, expand |

### Exit Criteria
- [ ] > 95% total coverage
- [ ] CMDB quality > 95%
- [ ] 80% reduction in manual CMDB effort
- [ ] Auto-remediation success rate > 90%
