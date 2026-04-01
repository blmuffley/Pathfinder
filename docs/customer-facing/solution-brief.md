# Avennorth Pathfinder — Solution Brief

## The Problem

Your ServiceNow CMDB is only as good as the data in it. Most organizations struggle with:

- **Blind spots** — Unknown integrations between applications that aren't documented
- **Stale data** — Relationships that were entered years ago and never updated
- **Manual effort** — Analysts spending days mapping integrations by hand
- **No health visibility** — No way to know if an integration is healthy or degraded until there's an incident
- **EA reconciliation gaps** — Enterprise Architecture documents don't match what's actually running

## The Solution

Avennorth Pathfinder discovers every integration between your applications **automatically** using kernel-level network observation, classifies them with confidence scoring, enriches them with **AI-powered intelligence**, and feeds everything directly into your **ServiceNow CMDB**.

### Four Products, One Platform

| Product | What It Does | Value |
|---------|-------------|-------|
| **Pathfinder Discovery** | eBPF/ETW agents observe network traffic at the kernel level. Zero code changes. <1% overhead. | Accurate service map in minutes, not weeks |
| **Integration Intelligence** | AI-powered health scoring, natural language summaries, EA reconciliation | Know which integrations are healthy and which need attention |
| **CMDB Ops Agent** | 8 autonomous agents continuously clean your CMDB — duplicates, stale records, orphans, compliance | CMDB quality improves automatically, not manually |
| **Service Map Intelligence** | Coverage gap detection, risk scoring per application, change impact analysis | Know your blast radius before making changes |

### How It Works

1. **Deploy agents** on your servers (Linux, Windows, Kubernetes) — 5 minutes per server
2. **Agents observe** TCP/UDP connections at the kernel level — no code changes, no configuration
3. **Gateway classifies** every connection into integration types (API, Database, Messaging, etc.) with confidence scores
4. **AI enriches** each integration with health scores, natural language summaries, and EA match suggestions
5. **ServiceNow receives** Integration CIs, Interface CIs, and health data in a Polaris workspace

### What You See in ServiceNow

- **Overview dashboard** — KPIs, health distribution, recent discoveries
- **Integration explorer** — Searchable list with AI summary, health trend, interfaces, EA mapping
- **Agent fleet** — Status of every deployed agent with heartbeat monitoring
- **Coverage gaps** — Kanban board for triage and remediation
- **EA reconciliation** — Side-by-side view to confirm or reject AI-suggested EA matches
- **Health dashboard** — Time-series trends, anomaly detection, risk heatmap

### Packaging & Pricing

Pathfinder is sold in two packages, priced annually by Managed Node count:

| Package | What's Included |
|---------|-----------------|
| **Standard** | Pathfinder Discovery Engine + CMDB Ops (automated hygiene, CI lifecycle, stale record cleanup) + agentless network device discovery (free) |
| **Professional** | Everything in Standard + Integration Intelligence (data flow analysis, anomaly detection) + Service Map Intelligence (dependency mapping, unmapped service detection) |

| Tier | Managed Nodes | Standard (starting at) | Professional (starting at) |
|------|---------------|----------------------|--------------------------|
| S | Up to 500 | $50,000/yr | $100,000/yr |
| M | 501 – 2,000 | $90,000/yr | $175,000/yr |
| L | 2,001 – 5,000 | $150,000/yr | $250,000/yr |
| XL | 5,001+ | Starting at $200,000/yr | Custom |

**Managed Node** = any endpoint running a Pathfinder agent (servers, VMs, cloud instances). Network devices, desktops, and agentless discoveries are included free.

### Deployment Timeline

| Stage | Timeline | What You Get |
|-------|----------|-------------|
| **Crawl** | Weeks 1-4 | 10-20 servers, validate accuracy, build workspace |
| **Walk** | Weeks 5-12 | All production servers, AI intelligence enabled, EA reconciliation started |
| **Run** | Weeks 13-24 | Non-production added, autonomous CMDB agents, self-healing |
| **Fly** | Week 25+ | 100% coverage, fully autonomous operations |

### Why Avennorth

- **Zero code changes** — Kernel-level observation, not application instrumentation
- **Native ServiceNow** — Polaris workspace, not a separate tool
- **AI-powered** — Claude-driven summarization and health scoring
- **Autonomous** — 8 CMDB agents that work while you sleep
- **Complements Discovery** — Works alongside ServiceNow native Discovery, not a replacement

---

*Contact: sales@avennorth.com | avennorth.com/pathfinder*
