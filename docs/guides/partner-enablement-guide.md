# Avennorth Pathfinder — Compass Partner Enablement Guide

## For ServiceNow Consulting Firms Deploying Pathfinder

### What Is Pathfinder?

Avennorth Pathfinder discovers integrations between applications automatically using kernel-level network observation (eBPF/ETW), classifies them, scores their health with AI, and populates ServiceNow CMDB — all without code changes or manual configuration.

**Your role:** Deploy Pathfinder as part of your ServiceNow implementation. The client gets an accurate service map on day one. You look like a hero. You earn 20-30% markup on every license.

---

## Scoping Guide

### When to Include Pathfinder

| Engagement Type | Include? | Tier | Why |
|----------------|----------|------|-----|
| ITSM implementation | Yes | Starter | CMDB accuracy from day one. No manual CI entry. |
| ITOM / Service Mapping | Yes | Professional | Complements native Discovery. AI intelligence is the differentiator. |
| CMDB health / cleanup | Yes | Enterprise | 8 autonomous agents do what manual audits can't. |
| CSM / HR / SecOps only | Maybe | Starter | Useful if project touches CMDB at all. |
| Pure workflow (no CMDB) | No | — | No value if CMDB isn't part of scope. |

### Sizing the Deal

| Client Environment | Hosts | Recommended Tier | Monthly | Annual |
|-------------------|-------|-----------------|---------|--------|
| Mid-market (50-150 servers) | 100 | Starter $15 | $1,500 | $18,000 |
| Enterprise pilot | 100 | Professional $28 | $2,800 | $33,600 |
| Enterprise production | 500 | Professional $28 | $14,000 | $168,000 |
| Large enterprise (full) | 2,000 | Enterprise $38 | $76,000 | $912,000 |

**Your markup:** Add 20-30% to list price. Client pays you. You remit list price to Avennorth.

### SOW Language Template

```
Avennorth Pathfinder Integration Discovery
- Deploy Pathfinder agents to [N] production servers
- Configure Gateway and ServiceNow scoped app integration
- Validate discovered integrations against known documentation
- Enable health scoring and AI summarization [Professional/Enterprise only]
- Train client team on Pathfinder workspace
- Monthly license: [N] hosts × $[price]/host = $[total]/month
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
| Enable CMDB Ops (Enterprise) | 2 | Deploy CMDB Ops Agent, set autonomy level |
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

### Year 1 Per-Client Economics

```
Pilot:       100 hosts × $35/host (your price) × 3 months  = $10,500
Expansion:   500 hosts × $35/host × 9 months              = $157,500
Annual total:                                               = $168,000

Your revenue:  $168,000 (client pays you)
Avennorth:     $140,000 (you remit list price $28/host)
Your margin:   $28,000 (20% markup)

Implementation services: 80 hours × $250/hour = $20,000
Total partner revenue per client: ~$48,000/year
```

### Portfolio Math

| Deployments/Year | Partner Revenue | Avennorth Revenue |
|-----------------|----------------|-------------------|
| 2 | $96,000 | $280,000 |
| 5 | $240,000 | $700,000 |
| 10 | $480,000 | $1,400,000 |

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
