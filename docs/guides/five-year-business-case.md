# Avennorth Pathfinder + Intelligence Platform — Five-Year Business Case

## Executive Summary

Avennorth Pathfinder is a 4-product platform for CMDB-first integration discovery, AI-powered intelligence, autonomous CMDB governance, and service map analytics — built for ServiceNow environments.

**The thesis:** Build once with Claude-assisted development, sell through Compass, operate with 14 people, reach $40M ARR by Year 5.

This business case quantifies how Avennorth's three structural advantages — an existing ServiceNow consulting team, AI-multiplied engineering, and Compass as zero-sales-team distribution — create a capital-efficient business that is bootstrappable from existing cash flow.

---

## 1. The Avennorth Advantage

### 1.1 Existing Team Leverage

Avennorth's ServiceNow consulting practice provides three team members allocated to Pathfinder at no incremental cost:

| Role | Already On Payroll | Pathfinder Contribution |
|------|-------------------|------------------------|
| ServiceNow Developer | Yes | Scoped app, 6 tables, Polaris workspace (6 pages), Flow Designer, business rules, scripted REST API |
| QA / DevOps | Yes | CI/CD (GitHub Actions, 11 jobs), Helm charts, agent packaging, multi-OS testing |
| Founder / Architect | Yes | Product vision, CSDM architecture, customer relationships, sales |

**Annual cost allocated to Pathfinder:** ~$420,000 (already budgeted)
**Incremental Year 1 investment:** ~$610,000 (2 new engineers + infrastructure)

### 1.2 Claude-Assisted Development

The entire Pathfinder platform was built using Claude Code as an AI development partner. Measured productivity impact:

| Metric | Without AI | With Claude Code | Multiplier |
|--------|-----------|-----------------|------------|
| Phases built | 3-4 phases in 9 months | 10 phases complete | 2.5-3x |
| Test coverage | ~40 tests | 104+ tests, all passing | 2.5x |
| Languages shipped | 1-2 | 4 (Go, Python, C/eBPF, JS/SN) | — |
| Products shipped | 1 | 4 (Discovery + 3 Intelligence) | 4x |

**What this means:** Two engineers + Claude Code delivered what traditionally requires 5-7 engineers. This multiplier persists — every future feature, bug fix, and extension benefits from AI-assisted development.

### 1.3 Compass as Distribution Engine

Avennorth's Compass platform for ServiceNow consulting firms becomes Pathfinder's zero-cost distribution channel:

| Traditional SaaS | Avennorth via Compass |
|-------------------|----------------------|
| 4-6 AEs by Year 3 ($600k-$1.2M/yr) | 1-2 channel managers ($140-290k/yr) |
| 6-month enterprise sales cycle | 2-4 week SOW line item |
| $35-50k CAC | $8-15k CAC |
| 120-130% NRR | 145-165% NRR (intelligence drives expansion) |

**Every consulting firm using Compass to scope ServiceNow engagements is a Pathfinder reseller.** They don't need to be convinced — Pathfinder is a line item that makes their implementations succeed faster.

---

## 2. Product Portfolio

### 2.1 Four Products, One Platform

| Product | What It Does | Pricing Tier | Built? |
|---------|-------------|-------------|--------|
| **Pathfinder Discovery** | eBPF/ETW/K8s agents → Gateway → Classification → ServiceNow sync | Starter ($15/host) | Yes — Phases 1-3 |
| **Integration Intelligence** | AI health scoring, summarization, EA reconciliation, rationalization | Professional ($28/host) | Yes — Phases 4-5 |
| **CMDB Ops Agent** | 8 autonomous agents for CMDB quality (duplicate, stale, orphan, compliance) | Enterprise ($38/host) | Yes — Phase 6 |
| **Service Map Intelligence** | Coverage analysis, risk scoring, change impact, self-healing loop | Enterprise ($38/host) | Yes — Phase 7 |

### 2.2 The Intelligence Moat

Discovery is table stakes — ServiceNow's native Discovery and Service Mapping already do it. Avennorth's differentiation is the **intelligence layer**:

1. **AI-powered health scoring** — 4-metric weighted composite with linear interpolation. No competitor does this natively.
2. **Autonomous CMDB agents** — 8 agents with observe/diagnose/recommend/act/verify lifecycle. No manual effort.
3. **Change impact analysis** — BFS graph traversal shows blast radius of any change. Integrates into CAB workflow.
4. **EA reconciliation** — 3-strategy matching (exact CI, fuzzy Levenshtein, business service group). Automates what's currently a manual spreadsheet exercise.

These features only produce value when fed by Pathfinder's discovery data, creating a **flywheel that deepens the moat** with every deployment.

### 2.3 Technical Build Summary

| Metric | Value |
|--------|-------|
| Go services | 5 binaries (gateway + 3 agents + mock) |
| Python services | 4 FastAPI apps (AI engine + 3 intelligence) |
| ServiceNow artifacts | 6 tables, 7 REST endpoints, 6 business rules, 6 workspace pages, 3 flows |
| eBPF programs | TCP connect/close tracepoints, UDP kprobe, ring buffer |
| Autonomous agents | 8 (with 4 autonomy levels and guardrails) |
| Tests | 104+ unit + integration, all passing |
| CI/CD | GitHub Actions, 11 parallel jobs |
| Helm charts | Gateway (Deployment) + Agent (DaemonSet) |
| Deployment doc | 55-story WBS across Crawl/Walk/Run/Fly |

---

## 3. Five-Year Financial Model

### 3.1 Revenue Projections (Base Case — Compass Channel)

| | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 |
|---|--------|--------|--------|--------|--------|
| **Compass Partners** | 0 | 15 | 40 | 75 | 110 |
| **Direct Clients** | 3 | 8 | 20 | 35 | 55 |
| **Channel Clients** | 0 | 25 | 90 | 220 | 440 |
| **Total Clients** | 3 | 33 | 110 | 255 | 495 |
| **Avg Hosts/Client** | 100 | 150 | 200 | 280 | 320 |
| **Avg Price/Host** | $18 | $24 | $28 | $32 | $35 |
| **End ARR** | $65k | $1.5M | $5.8M | $15.5M | $40.0M |
| **Revenue** | $25k | $900k | $4.2M | $11.5M | $29.5M |

**Key drivers:**
- Intelligence products push 60%+ of clients to Professional tier by Year 2
- CMDB Ops agents drive Enterprise adoption from Year 3
- NRR 140-165% from host expansion + tier upgrades
- Compass partner count: 0 → 15 → 40 → 75 → 110

### 3.2 Cost Model

| | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 |
|---|--------|--------|--------|--------|--------|
| **Headcount** | 5 | 7 | 9 | 11 | 14 |
| **New Hire Cost** | $375k | $320k | $250k | $340k | $455k |
| **Existing Team** | $420k | $420k | $420k | $420k | $420k |
| **Prior Salaries** | $0 | $375k | $695k | $945k | $1.29M |
| **Infrastructure** | $48k | $60k | $84k | $108k | $144k |
| **AI Tokens (Claude)** | $24k | $48k | $72k | $96k | $120k |
| **Legal + Patent** | $90k | $15k | $10k | $25k | $10k |
| **Marketing + Partner** | $65k | $55k | $70k | $90k | $110k |
| **Total OpEx** | $1.03M | $1.31M | $1.62M | $2.05M | $2.58M |

### 3.3 Cash Flow

| | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 |
|---|--------|--------|--------|--------|--------|
| **Revenue** | $25k | $900k | $4.2M | $11.5M | $29.5M |
| **OpEx** | $1.03M | $1.31M | $1.62M | $2.05M | $2.58M |
| **Cash Flow** | -$1.01M | -$410k | +$2.58M | +$9.45M | +$26.92M |
| **Cumulative** | -$1.01M | -$1.42M | +$1.16M | +$10.61M | +$37.53M |

**Break-even: Late Year 2 / Early Year 3.**
**5-year cumulative profit: ~$37.5M.**
**Funding required: $0.** Bootstrappable from Avennorth consulting cash flow.

### 3.4 Scenario Analysis

| Metric | Conservative (0.7x) | Base Case | Aggressive (1.4x) |
|--------|---------------------|-----------|-------------------|
| Y5 ARR | $28.0M | $40.0M | $56.0M |
| Y5 Clients | 347 | 495 | 693 |
| Break-even | Early Y3 | Late Y2 | Mid Y2 |
| 5-Year Cum. Profit | $18.5M | $37.5M | $63.4M |
| Funding Required | Maybe $500k | None | None |

---

## 4. Capital Efficiency

### 4.1 ARR per Employee

| | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 |
|---|--------|--------|--------|--------|--------|
| Headcount | 5 | 7 | 9 | 11 | 14 |
| ARR | $65k | $1.5M | $5.8M | $15.5M | $40.0M |
| **ARR/Employee** | $13k | $214k | $644k | $1.41M | **$2.86M** |

**Industry comparison at $40M ARR:**
| Metric | Typical SaaS | Avennorth Pathfinder |
|--------|-------------|---------------------|
| Headcount | 150-250 | 14 |
| ARR/Employee | $150-250k | $2.86M |
| Sales team | 15-30 people | 0 (Compass) |
| Marketing spend | $3-5M/yr | $110k/yr |
| Gross margin | 70-80% | 85-90% |

### 4.2 Why This Works

1. **No sales team.** Compass partners sell. Avennorth enables. Two channel managers replace 15-30 AEs/SDRs/SEs.
2. **No support org.** Consulting partners handle tier-1 during implementation. One support engineer handles escalations.
3. **AI-multiplied engineering.** Each engineer ships 2-3x with Claude Code. The 5 Go binaries + 4 Python services + SN scoped app were built by a lean team.
4. **Intelligence is the margin.** Discovery is commodity. AI health scoring, autonomous CMDB agents, and change impact analysis are high-margin features with near-zero marginal cost.
5. **Claude API pass-through.** AI token costs (~$120k/yr at scale) are 0.3% of revenue. The value-add from summarization and scoring justifies 100x the token cost.

---

## 5. Compass Channel Economics

### 5.1 Partner Deal Flow

```
Pilot (Month 1-3)     →  75 hosts  × $15 Starter     = $1,125/mo
Expand (Month 4-8)    →  300 hosts × $28 Professional = $8,400/mo
Full Estate (Month 9+) →  800 hosts × $38 Enterprise  = $30,400/mo
```

**Single client lifetime value:** $364,800/yr Avennorth ARR.
**Partner earns:** $96,000/yr ongoing (25% markup).
**Both parties incentivized to expand.**

### 5.2 Flywheel

1. Consultant scopes SN engagement in Compass
2. Adds Pathfinder as SOW line item (one click)
3. Deploys agents during implementation week 1-2
4. Client sees live integration map with AI health scores
5. Pilot expands: Starter → Professional → Enterprise
6. Consultant repeats on next 10 engagements

### 5.3 Channel-Enabling Features Still Needed

| Feature | Effort | Priority |
|---------|--------|----------|
| Multi-tenant management | 4-6 weeks | Year 2 |
| Partner billing / usage metering | 3-4 weeks | Year 2 |
| Partner portal + deployment playbooks | 2-3 weeks | Year 2 |
| White-label option for large SIs | 2-3 weeks | Year 3 |
| Usage-based API access controls | 1-2 weeks | Year 2 |

---

## 6. Competitive Positioning

### 6.1 vs. ServiceNow Native Discovery

| Capability | SN Discovery | Avennorth Pathfinder |
|-----------|-------------|---------------------|
| Discovery method | Credential-based, agent-optional | eBPF/ETW kernel-level, agentless for network |
| CMDB integration | Native | Native (extends cmdb_ci) |
| AI intelligence | None | Health scoring, summarization, rationalization |
| Autonomous CMDB quality | None | 8 agents with 4 autonomy levels |
| Change impact analysis | Basic (service map) | Graph traversal with blast radius + criticality |
| EA reconciliation | Manual | AI-powered 3-strategy matching |
| Self-healing | None | Coverage gap auto-remediation flow |
| Pricing | Included with ITOM | $15-38/host/mo (additive) |

**Positioning:** Avennorth is not a replacement for SN Discovery. It's the intelligence layer that makes Discovery data actionable. Complement, not compete.

### 6.2 vs. APM Vendors (Datadog, Dynatrace, AppDynamics)

| Capability | APM Vendors | Avennorth Pathfinder |
|-----------|------------|---------------------|
| Primary goal | Application performance | CMDB accuracy + governance |
| CMDB integration | Afterthought (connector) | Native (primary data store) |
| ServiceNow workspace | None | Full Polaris workspace |
| Autonomous CMDB ops | None | 8 agents |
| Price | $33-100+/host/mo | $15-38/host/mo |
| Deployment | Code changes, SDK | Zero-code kernel observation |

**Positioning:** APM watches applications. Avennorth watches the relationships between them. Different problem, different buyer, compatible deployment.

---

## 7. Risk Factors

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| ServiceNow builds competing feature | Medium | High | Intelligence layer (AI agents, health scoring) is 2+ years ahead of SN product roadmap. Patent protection on confidence model + agent lifecycle. |
| Compass adoption slower than projected | Medium | Medium | Direct sales channel remains viable (modeled as Conservative scenario). Can hire 2-3 AEs if needed. |
| Claude API pricing increases | Low | Low | AI tokens are 0.3% of revenue. 10x price increase = 3% of revenue. Switchable to other LLMs. |
| eBPF kernel compatibility issues | Low | Medium | Build-tagged stubs for non-Linux. Windows uses ETW (no eBPF dependency). K8s uses host namespace. |
| Enterprise security concerns (kernel agent) | Medium | Medium | CAP_BPF (not privileged), read-only observation, no code injection. SOC 2 compliance planned. |

---

## 8. Investment Ask

### Bootstrappable Path (Recommended)

| Item | Amount |
|------|--------|
| 2 new engineers (Year 1) | $375k |
| Infrastructure + AI tokens | $72k |
| Legal + patents | $90k |
| Marketing + partner | $65k |
| **Total incremental Year 1** | **$602k** |

Avennorth's existing consulting revenue absorbs this. No external funding required. Break-even late Year 2.

### Optional Seed Round (Accelerated)

$1.5-2.0M seed for:
- Hire 2 additional engineers (accelerate extended collectors, multi-tenancy)
- Dedicated channel manager from day 1
- Conference presence (Knowledge, ServiceNow partner events)
- 18-month runway to profitability

---

## 9. Next Steps

| # | Action | Owner | Timeline |
|---|--------|-------|----------|
| 1 | Validate with 3-5 design partners | Founder | Weeks 1-4 |
| 2 | Hire Go/Systems engineer | Founder | Month 1 |
| 3 | Hire Python/AI engineer | Founder | Month 1-2 |
| 4 | File provisional patents (confidence model + agent lifecycle) | Legal | Month 2-3 |
| 5 | Build Compass integration module | Engineering | Month 6-9 |
| 6 | First paying customer | Sales | Month 9-10 |
| 7 | 15 Compass partners trained | Channel | Year 2 Q1 |

---

*Avennorth Pathfinder + Intelligence Platform — Confidential*
*Version: Business Case v1.0 — March 2026*
