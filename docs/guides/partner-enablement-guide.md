# Avennorth Pathfinder — Compass Partner Enablement Guide

## For ServiceNow Consulting Firms Deploying Pathfinder

### What Is Pathfinder?

Avennorth Pathfinder discovers integrations between applications automatically using kernel-level network observation (eBPF/ETW), classifies them, scores their health with AI, and populates ServiceNow CMDB — all without code changes or manual configuration.

**Your role:** Deploy Pathfinder as part of your ServiceNow implementation. The client gets an accurate service map on day one. You look like a hero. You earn 20-30% markup on every license.

---

## Scoping Guide

### When to Include Pathfinder

| Engagement Type | Include? | Package | Why |
|----------------|----------|---------|-----|
| ITSM implementation | Yes | Standard | CMDB accuracy from day one. No manual CI entry. Automated hygiene. |
| ITOM / Service Mapping | Yes | Professional | Complements native Discovery. AI intelligence + service map analytics. |
| CMDB health / cleanup | Yes | Standard | CMDB Ops automates what manual audits can't. |
| Integration governance | Yes | Professional | Cross-platform data flow analysis, anomaly detection. |
| CSM / HR / SecOps only | Maybe | Standard | Useful if project touches CMDB at all. |
| Pure workflow (no CMDB) | No | — | No value if CMDB isn't part of scope. |

### Sizing the Deal

| Client Environment | Managed Nodes | Recommended Package | Annual (starting at) |
|-------------------|---------------|--------------------|--------------------|
| Mid-market (up to 500 servers) | S tier | Standard | $50,000/yr |
| Enterprise pilot | S tier | Standard | $50,000/yr |
| Enterprise production | M tier (501-2,000) | Standard | $90,000/yr |
| Enterprise + intelligence | M tier | Professional | $175,000/yr |
| Large enterprise (full) | L tier (2,001-5,000) | Professional | $250,000/yr |
| XL enterprise (5,001+) | XL tier | Standard $200K+ / Professional Custom | Custom |

**Managed Node** = any endpoint running a Pathfinder agent. Network devices, desktops, and agentless discoveries are free.

**Your markup:** Add 20-30% to Avennorth list price. Client pays you. You remit list price to Avennorth.

### SOW Language Template

```
Avennorth Pathfinder Integration Discovery
- Deploy Pathfinder agents to [N] production servers ([S/M/L/XL] tier)
- Configure Gateway and ServiceNow scoped app integration
- Validate discovered integrations against known documentation
- Enable Integration Intelligence and Service Map Intelligence [Professional only]
- Train client team on Pathfinder workspace
- Annual license: Pathfinder [Standard/Professional], [S/M/L/XL] tier = $[amount]/yr
- Implementation services: [40-80] hours at $[rate]/hour
```

---

## Deployment Playbook (Partner Edition)

### Week 1: Setup (8-12 hours)

| Task | Hours | Notes |
|------|-------|-------|
| Import SN update sets | 1 | 2 XML files + business rules |
| Create OAuth app | 0.5 | For gateway → SN auth |
| Deploy gateway (Docker or K8s) | 2 | Use Helm chart for K8s |
| Install agents on 10-20 pilot servers | 2 | RPM/DEB for Linux, MSI for Windows |
| Configure gateway → SN sync | 1 | Test with mock-agent first |
| Verify flows and classifications | 1 | Check PostgreSQL + SN CIs |
| Build workspace (UI Builder) | 4 | Use UX page JSON blueprints |

### Week 2: Validation (4-8 hours)

| Task | Hours | Notes |
|------|-------|-------|
| Compare discoveries vs. client documentation | 3 | Client provides known integration list |
| Tune confidence threshold | 1 | Default 0.8, lower if missing known integrations |
| Add custom port/process rules | 1 | For proprietary applications |
| Client walkthrough of workspace | 2 | Demo the 6 pages |

### Week 3+: Expansion (2-4 hours/week)

| Task | Hours | Notes |
|------|-------|-------|
| Expand to full production | 2 | Automate with Ansible/SCCM |
| Enable intelligence (Professional) | 2 | Deploy AI Engine, configure ANTHROPIC_API_KEY |
| Enable CMDB Ops (Standard) | 2 | Deploy CMDB Ops Agent, set autonomy level |
| Client training | 4 | Analyst workflow, EA reconciliation, gap triage |

### Handoff Checklist

- [ ] All production servers covered (>80%)
- [ ] Gateway running and syncing to SN every 60s
- [ ] Workspace accessible to analyst team
- [ ] Health scores populated on all integrations
- [ ] Notifications configured (gap detected, health critical)
- [ ] Client admin trained on system properties
- [ ] Support escalation path documented

---

## Partner Revenue Model

### Year 1 Per-Client Economics (Example: M-Tier Standard → Professional Upgrade)

```
Pilot (Q1-Q2):    Standard S-tier (up to 500 nodes)       = $50,000/yr
Expand (Q3):       Standard M-tier (501-2,000 nodes)       = $90,000/yr
Upgrade (Q4):      Professional M-tier                      = $175,000/yr

Your price to client (25% markup):                          = $218,750/yr
Avennorth list price:                                       = $175,000/yr
Your margin:                                                = $43,750/yr

Implementation services: 80 hours × $250/hour              = $20,000
Total partner revenue per client: ~$63,750/year
```

### Portfolio Math

| Deployments/Year | Partner Margin (25% markup) | Avennorth Revenue |
|-----------------|---------------------------|-------------------|
| 2 | $87,500 | $350,000 |
| 5 | $218,750 | $875,000 |
| 10 | $437,500 | $1,750,000 |

---

## Support Model

| Tier | Handled By | Scope |
|------|-----------|-------|
| Tier 1 | Partner | Agent installation, basic troubleshooting, workspace questions |
| Tier 2 | Avennorth | Classification issues, gateway errors, SN sync failures |
| Tier 3 | Avennorth Engineering | eBPF compatibility, performance, feature requests |

**Escalation:** email support@avennorth.com with agent logs + gateway logs + SN error screenshots.

---

## Training Resources

| Resource | Format | Duration |
|----------|--------|----------|
| Partner onboarding | Video + hands-on lab | 4 hours |
| Technical deep-dive | Architecture walkthrough | 2 hours |
| Demo script | [docs/prototypes/DEMO-SCRIPT.md] | 15 minutes |
| Interactive prototype | React app at localhost:4200 | Self-guided |
| Installation guide | [docs/guides/installation-guide.md] | Reference |
| Implementation playbook | [docs/guides/implementation-playbook.md] | Reference |
