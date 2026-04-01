# 04 — Portfolio Architecture

## 1. Purpose

This document maps the full Avennorth product portfolio, defines how Pathfinder and the Intelligence products relate, and outlines the pricing and channel strategy.

---

## 2. Avennorth Portfolio Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AVENNORTH PLATFORM                                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    DISCOVERY LAYER                                  │    │
│  │                                                                     │    │
│  │  ┌─────────────────────────────────────────────────────────────┐   │    │
│  │  │              PATHFINDER                                     │   │    │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │   │    │
│  │  │  │ Linux    │  │ Windows  │  │ K8s      │  │ Gateway  │  │   │    │
│  │  │  │ Agent    │  │ Agent    │  │ Agent    │  │          │  │   │    │
│  │  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │   │    │
│  │  └─────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                  INTELLIGENCE LAYER                                 │    │
│  │                                                                     │    │
│  │  ┌──────────────────┐ ┌──────────────────┐ ┌────────────────────┐ │    │
│  │  │ Integration      │ │ CMDB Ops         │ │ Service Map        │ │    │
│  │  │ Intelligence     │ │ Agent            │ │ Intelligence       │ │    │
│  │  │                  │ │                  │ │                    │ │    │
│  │  │ • Health scoring │ │ • 8 AI agents    │ │ • Coverage gaps    │ │    │
│  │  │ • Summarization  │ │ • Dedup/orphan   │ │ • Risk scoring     │ │    │
│  │  │ • Rationalization│ │ • Stale cleanup  │ │ • Change impact    │ │    │
│  │  │ • EA reconcile   │ │ • Compliance     │ │ • Health analytics │ │    │
│  │  └──────────────────┘ └──────────────────┘ └────────────────────┘ │    │
│  │                                                                     │    │
│  │  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │  │              SHARED AI ENGINE (Claude)                       │  │    │
│  │  │  LLM orchestration • Anomaly detection • Prompt management  │  │    │
│  │  └──────────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                  SERVICENOW LAYER                                   │    │
│  │  Scoped App (x_avnth_) • Tables • REST API • Flows • Dashboards   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Product Definitions

### 3.1 Pathfinder (Discovery)

**Value proposition:** Automatically discover all application-to-application integrations by observing actual network traffic. No manual documentation. No stale spreadsheets.

| Component | What it does |
|-----------|-------------|
| Agents (Linux/Win/K8s) | Capture network flows at the kernel level |
| Gateway | Classify flows, resolve to CIs, sync to ServiceNow |
| ServiceNow Scoped App | CMDB tables, dashboards, REST API |

**Buyer:** CMDB Manager, IT Operations, Service Management

**Key metrics:**
- Integrations discovered vs. manually documented
- Time to discover new integration (minutes vs. months)
- CMDB accuracy improvement (% of integrations with current data)

### 3.2 Integration Intelligence

**Value proposition:** AI-powered health monitoring, summarization, and rationalization for every integration in the CMDB.

| Capability | What it does |
|-----------|-------------|
| Health Scoring | Real-time composite health score (0–100) per integration |
| AI Summarization | Natural-language summaries updated daily |
| Rationalization | Identify redundant integrations, recommend consolidation |
| EA Reconciliation | Match discovered integrations to EA-managed relationships |

**Buyer:** Enterprise Architect, Integration Architect, Application Portfolio Manager

**Key metrics:**
- Mean time to detect integration degradation
- % of integrations with health scores
- EA mapping coverage (% mapped)
- Rationalization savings (redundant integrations retired)

### 3.3 CMDB Ops Agent

**Value proposition:** Autonomous AI agents that continuously clean, validate, and improve CMDB data quality — reducing manual effort by 80%.

| Agent | What it does |
|-------|-------------|
| Duplicate Detector | Find and merge duplicate CIs |
| Orphan Finder | Find CIs with broken relationships |
| Stale Record Reaper | Retire outdated CIs |
| Relationship Validator | Verify CI relationship integrity |
| Classification Auditor | Validate automated classifications |
| Compliance Checker | Enforce governance field requirements |
| Health Scorer | Keep health scores current |
| Remediation Orchestrator | Coordinate cross-agent remediation |

**Buyer:** CMDB Manager, Data Quality Lead, ITSM Process Owner

**Key metrics:**
- CMDB data quality score (% compliant CIs)
- Manual CMDB maintenance hours saved per month
- Duplicate/orphan/stale CI reduction rate
- Autonomy level progression (L0 → L3)

### 3.4 Service Map Intelligence

**Value proposition:** Understand your service map coverage, risk, and change impact before incidents happen.

| Capability | What it does |
|-----------|-------------|
| Coverage Analysis | Which servers/apps have agent coverage? Where are gaps? |
| Risk Scoring | Per-application risk based on integration health + coverage |
| Change Impact | Predict blast radius before making changes |
| Health Analytics | Aggregate trends, detect systemic patterns |

**Buyer:** Change Manager, Service Owner, Risk & Compliance

**Key metrics:**
- Agent coverage % (servers with agents / total servers)
- Mean risk score across portfolio
- Change success rate (with vs. without impact analysis)
- MTTR improvement with service map context

---

## 4. Product Packaging & Tiers

### 4.1 Two-Tier Package Structure

Pathfinder is sold in two packages:

| Package | Products Included | Target Customer |
|---------|-------------------|----------------|
| **Pathfinder Standard** | Pathfinder Discovery Engine + CMDB Ops (automated hygiene, CI lifecycle, stale record detection) | Mid-market to enterprise, CMDB accuracy and governance |
| **Pathfinder Professional** | Everything in Standard + Integration Intelligence + Service Map Intelligence | Enterprise with integration complexity and service map requirements |

### 4.2 Managed Node Definition

A **Managed Node** is any endpoint where the Pathfinder agent is deployed:

- Physical servers
- Virtual machines (VMs)
- Cloud compute instances (EC2, Azure VMs, GCE, etc.)
- Any endpoint running a supported OS (Linux via eBPF, Windows via ETW)

**Not counted as Managed Nodes** (discovered free, no license cost):

- Network devices (routers, switches, firewalls, load balancers)
- Endpoints and desktops
- Any infrastructure discovered through agentless observation

> **Sales one-liner:** "If our agent runs on it, it's a Managed Node. Everything else we discover is free."

### 4.3 Pricing by Managed Node Tier

| Tier | Managed Nodes | Standard (starting at) | Professional (starting at) |
|------|---------------|----------------------|--------------------------|
| **S** | Up to 500 | $50,000/yr | $100,000/yr |
| **M** | 501 – 2,000 | $90,000/yr | $175,000/yr |
| **L** | 2,001 – 5,000 | $150,000/yr | $250,000/yr |
| **XL** | 5,001+ | Starting at $200,000/yr | Custom |

**Key pricing notes:**

- All prices are "starting at" — per-node cost decreases at higher tiers
- XL engagements are bespoke with $200K+ as the qualifying floor
- The ~2x multiplier from Standard to Professional is intentional and consistent across tiers
- Node counts are measured directly from the Pathfinder platform — no self-reporting, no ambiguity

### 4.4 Package Contents

**Standard Package:**

- Pathfinder Discovery Engine (eBPF/ETW agent deployment, behavioral confidence scoring)
- CMDB Ops (automated hygiene, CI lifecycle management, stale record detection & cleanup)
- Agentless network device discovery (free, not counted toward Managed Nodes)

**Professional Package** (everything in Standard, plus):

- Integration Intelligence (cross-platform data flow analysis, integration anomaly detection)
- Service Map Intelligence (dependency mapping & validation, unmapped service detection)

---

## 5. Channel Strategy

### 5.1 Go-to-Market Channels

| Channel | Strategy |
|---------|----------|
| **ServiceNow Store** | List Pathfinder SN scoped app. Primary discovery channel. |
| **Direct Sales** | Enterprise accounts via Avennorth sales team. |
| **ServiceNow Partner** | Build/Co-Sell partnership with ServiceNow. |
| **MSP/SI Partners** | Enable managed service providers to resell + manage. |
| **AWS/Azure/GCP Marketplace** | List Gateway + AI Engine as container offerings. |

### 5.2 Partner Enablement

| Partner Type | What They Get |
|-------------|---------------|
| **Technology Partner** | API access, co-marketing, joint roadmap input |
| **Implementation Partner** | Training, deployment playbooks, margin on licenses |
| **Managed Service Partner** | Multi-tenant management console, volume pricing |

### 5.3 ServiceNow Alignment

Pathfinder is designed to complement — not compete with — ServiceNow's native capabilities:

| ServiceNow Native | Pathfinder Adds |
|-------------------|----------------|
| Service Mapping (pattern-based) | Network-level flow discovery (eBPF) |
| Discovery (agent-based CI scan) | Integration/Interface CI types |
| CMDB Health Dashboard | AI-powered health scoring + autonomous remediation |
| Flow Designer | Pre-built remediation flows for coverage gaps |

**Positioning:** "Pathfinder discovers what Service Mapping can't see — the actual network connections between applications, classified and health-scored by AI."

---

## 6. Competitive Landscape

| Competitor | Approach | Pathfinder Differentiator |
|-----------|----------|--------------------------|
| ServiceNow Service Mapping | Pattern-based, requires pattern library | eBPF kernel-level, zero config |
| Dynatrace/AppDynamics | APM-focused, requires app instrumentation | Agentless at network level, CMDB-first |
| Flexera/Snow | License/asset management | Integration-centric, not asset-centric |
| Custom scripts | Manual, brittle | Autonomous, AI-powered, continuous |

---

## 7. Roadmap Alignment

| Quarter | Focus |
|---------|-------|
| Q1 | Pathfinder Essentials (agents + gateway + SN app) |
| Q2 | Integration Intelligence + Service Map Intelligence |
| Q3 | CMDB Ops Agent |
| Q4 | Enterprise packaging, partner enablement, marketplace listings |

This maps to the Crawl/Walk/Run/Fly deployment methodology (see doc 05).
