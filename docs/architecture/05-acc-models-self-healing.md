# 05 — ACC Deployment Models & Self-Healing

## 1. Purpose

This document defines the three ACC (Agent-Controlled Configuration) deployment models for Pathfinder and the coverage gap self-healing loop that automatically remediates missing agent coverage.

---

## 2. ACC Deployment Models

Pathfinder supports three deployment models, each with different levels of agent management, data sovereignty, and operational complexity.

### 2.1 Model Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  MODEL 1: STANDALONE          MODEL 2: MANAGED        MODEL 3: SaaS│
│                                                                     │
│  Customer owns everything     Avennorth manages        Avennorth    │
│  On-prem / private cloud      agents + gateway         hosts all    │
│                                                                     │
│  ┌────────┐ ┌────────┐       ┌────────┐ ┌────────┐   ┌──────────┐ │
│  │ Agents │ │Gateway │       │ Agents │ │Gateway │   │ Agents   │ │
│  │ (cust) │ │(cust)  │       │ (Aven) │ │(Aven)  │   │ (Aven)   │ │
│  └───┬────┘ └───┬────┘       └───┬────┘ └───┬────┘   └───┬──────┘ │
│      │          │                │          │             │        │
│  ┌───┴──────────┴───┐       ┌───┴──────────┴───┐   ┌────┴──────┐ │
│  │  Customer Infra  │       │  Customer Infra  │   │ Avennorth │ │
│  │  (PostgreSQL)    │       │  (Aven-managed)  │   │ Cloud     │ │
│  └──────────────────┘       └──────────────────┘   └───────────┘ │
│                                                                     │
│  Data stays on-prem          Data on-prem,           Data in       │
│  Full control                remote management       Aven cloud    │
│  Self-supported              Aven-supported          Fully managed │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Model 1: Standalone

**Target customer:** Enterprises with strict data sovereignty requirements, large IT operations teams, or existing infrastructure management tooling.

| Aspect | Details |
|--------|---------|
| **Agent deployment** | Customer installs and manages agents (RPM/DEB/MSI) |
| **Gateway** | Customer deploys (Docker/K8s/VM) on their infrastructure |
| **PostgreSQL** | Customer-managed (their RDS, Cloud SQL, or on-prem) |
| **AI Engine** | Customer deploys, provides their own `ANTHROPIC_API_KEY` |
| **ServiceNow** | Customer's instance, scoped app installed via update set |
| **Updates** | Customer pulls new versions from Avennorth registry |
| **Support** | Documentation + community; premium support available |

**Configuration:**
```yaml
deployment:
  model: standalone
  agent_management: customer
  gateway_management: customer
  data_location: customer_infrastructure
  ai_key_provider: customer
```

### 2.3 Model 2: Managed

**Target customer:** Enterprises that want the benefits of on-prem data storage but don't want to manage the Pathfinder infrastructure.

| Aspect | Details |
|--------|---------|
| **Agent deployment** | Avennorth deploys and manages via remote management |
| **Gateway** | Avennorth deploys on customer infra (or Avennorth-managed VPC) |
| **PostgreSQL** | Avennorth-managed (dedicated instance in customer's cloud account) |
| **AI Engine** | Avennorth-managed, shared `ANTHROPIC_API_KEY` |
| **ServiceNow** | Customer's instance, Avennorth assists with scoped app setup |
| **Updates** | Avennorth pushes updates automatically (with change window) |
| **Support** | Included: 24/7 monitoring, SLA-backed response times |

**Agent management features:**
- Remote agent installation via SSH/WinRM or Configuration Management (Ansible/SCCM)
- Centralized agent configuration pushed from Gateway
- Automatic agent updates (rolling, canary, or blue-green)
- Health monitoring and auto-restart of failed agents

**Configuration:**
```yaml
deployment:
  model: managed
  agent_management: avennorth
  gateway_management: avennorth
  data_location: customer_cloud_account
  ai_key_provider: avennorth
  update_strategy: rolling
  change_window: "02:00-04:00 UTC"
```

### 2.4 Model 3: SaaS

**Target customer:** Mid-market companies, cloud-native organizations, or those wanting the fastest time-to-value.

| Aspect | Details |
|--------|---------|
| **Agent deployment** | Customer installs lightweight agent; connects to Avennorth cloud |
| **Gateway** | Multi-tenant, hosted by Avennorth |
| **PostgreSQL** | Avennorth-managed, tenant-isolated |
| **AI Engine** | Shared, multi-tenant |
| **ServiceNow** | Customer's instance, OAuth integration to Avennorth cloud |
| **Updates** | Continuous delivery, zero-downtime |
| **Support** | Included: SLA-backed |

**Data flow in SaaS model:**
```
Customer Server                  Avennorth Cloud
┌──────────┐                    ┌─────────────────────┐
│  Agent   │──── gRPC/TLS ────►│  Gateway (shared)   │
│          │    (outbound 443)  │  ┌───────────────┐  │
└──────────┘                    │  │ Tenant Router  │  │
                                │  └───────┬───────┘  │
                                │          ▼          │
                                │  ┌───────────────┐  │
                                │  │ PostgreSQL    │  │
                                │  │ (per-tenant)  │  │
                                │  └───────────────┘  │
                                │          │          │
                                │          ▼          │
                                │  ┌───────────────┐  │     ┌────────────┐
                                │  │   SN Sync     │──┼────►│ ServiceNow │
                                │  └───────────────┘  │     │ (customer) │
                                └─────────────────────┘     └────────────┘
```

**Tenant isolation:**
- Separate PostgreSQL schemas per tenant
- Agent-to-tenant mapping via enrollment token
- API keys scoped to tenant
- No cross-tenant data access

**Configuration:**
```yaml
deployment:
  model: saas
  agent_management: customer_install_avennorth_manage
  gateway_management: avennorth
  data_location: avennorth_cloud
  tenant_id: "cust-abc123"
  region: us-east-1
```

### 2.5 Model Comparison

| Feature | Standalone | Managed | SaaS |
|---------|-----------|---------|------|
| Data sovereignty | Full control | Customer cloud | Avennorth cloud |
| Setup time | Days–weeks | Hours–days | Minutes–hours |
| Operational burden | High (customer) | Low (Avennorth) | None |
| Customization | Full | Moderate | Limited |
| Multi-tenancy | N/A | Dedicated | Shared |
| Pricing | License only | License + management fee | All-inclusive subscription |
| Compliance (HIPAA, SOC2) | Customer responsible | Shared responsibility | Avennorth responsible |
| Agent updates | Manual | Automated | Automated |
| Minimum commitment | 100 agents | 250 agents | 10 agents |

---

## 3. Coverage Tiers

Each server/application monitored by Pathfinder is assigned a coverage tier that determines the depth of monitoring.

### 3.1 Tier Definitions

| Tier | Name | Agent Required | Monitoring Depth |
|------|------|---------------|-----------------|
| 0 | **None** | No | No monitoring (opted out or excluded) |
| 1 | **Basic** | Yes | Flow capture only (connections, ports, protocols) |
| 2 | **Standard** | Yes | Flow + process enrichment (process name, PID, cmdline) |
| 3 | **Enhanced** | Yes | Standard + byte-level metrics (throughput, payload size) |
| 4 | **Full** | Yes | Enhanced + latency measurement + health telemetry |

### 3.2 Tier Assignment

Default tier: **2 (Standard)** for all monitored servers.

Override via:
- Agent config: `coverage_tier: 3`
- ServiceNow CI attribute: `x_avnth_coverage_tier` on `cmdb_ci_server`
- Bulk assignment: ServiceNow business rule based on server classification

---

## 4. Coverage Gap Self-Healing Loop

The self-healing loop ensures that every server that *should* have a Pathfinder agent actually *does*. When gaps are detected, automated remediation kicks in.

### 4.1 Loop Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    SELF-HEALING LOOP                              │
│                                                                  │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │ DETECT   │───►│ RECORD       │───►│ REMEDIATE            │   │
│  │          │    │              │    │                      │   │
│  │ Compare: │    │ Create:      │    │ Flow Designer:       │   │
│  │ Agent    │    │ Coverage Gap │    │ 1. Check auto-deploy │   │
│  │ Inventory│    │ Record       │    │ 2. Deploy agent      │   │
│  │ vs.      │    │ (x_avnth_   │    │ 3. Verify enrollment │   │
│  │ Server   │    │ coverage_gap)│    │ 4. Close gap         │   │
│  │ Population│    │              │    │                      │   │
│  └──────────┘    └──────────────┘    └───────────┬──────────┘   │
│       ▲                                          │              │
│       │                                          ▼              │
│  ┌────┴─────┐                            ┌──────────────┐       │
│  │ VERIFY   │◄───────────────────────────│ MONITOR      │       │
│  │          │                            │              │       │
│  │ Agent    │                            │ Track:       │       │
│  │ enrolled?│                            │ - Deploy     │       │
│  │ Flows    │                            │   progress   │       │
│  │ arriving?│                            │ - Enrollment │       │
│  └──────────┘                            │ - First flow │       │
│                                          └──────────────┘       │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 Gap Detection (Service Map Intelligence)

The Coverage Analyzer in Service Map Intelligence runs on schedule (default: every 4 hours).

**Algorithm:**
1. Query all `cmdb_ci_server` records where `operational_status = Operational`
2. Query all `x_avnth_pathfinder_agent` records where `status = Active`
3. Left join: servers without a matching agent = **coverage gap**
4. Also detect:
   - **Stale Agent:** Agent exists but `last_heartbeat` > 7 days ago → `gap_type = StaleAgent`
   - **Wrong Tier:** Agent exists but `coverage_tier` < server's required tier → `gap_type = WrongTier`
   - **No Agent:** No agent record for this server → `gap_type = NoAgent`

### 4.3 Coverage Gap Record — `x_avnth_coverage_gap`

| Field | Type | Description |
|-------|------|-------------|
| `server` | reference → cmdb_ci_server | The server missing coverage |
| `gap_type` | choice | `NoAgent`, `StaleAgent`, `WrongTier` |
| `required_tier` | integer | Expected coverage tier for this server |
| `current_tier` | integer | Actual coverage tier (0 if no agent) |
| `detected_at` | glide_date_time | When the gap was first detected |
| `remediation_status` | choice | `Open`, `InProgress`, `Resolved`, `Waived`, `Failed` |
| `remediation_method` | choice | `AutoDeploy`, `ManualDeploy`, `ChangeRequest`, `Waived` |
| `remediation_cr` | reference → change_request | Associated CR (if applicable) |
| `resolved_at` | glide_date_time | When the gap was closed |
| `waived_by` | reference → sys_user | Who waived the gap (if waived) |
| `waive_reason` | string (500) | Why the gap was waived |
| `priority` | choice | `Critical`, `High`, `Medium`, `Low` |

### 4.4 Gap Prioritization

| Server Classification | Integration Count | Priority |
|-----------------------|-------------------|----------|
| Production + critical app | Any | Critical |
| Production + non-critical | > 5 integrations | High |
| Production + non-critical | ≤ 5 integrations | Medium |
| Non-production | Any | Low |

### 4.5 Remediation Flow (Flow Designer)

**Flow:** `x_avnth_coverage_gap_remediation`

**Trigger:** New `x_avnth_coverage_gap` record inserted with `remediation_status = Open`

**Steps:**

```
1. EVALUATE
   ├─ Is auto-deploy enabled for this server's group?
   │  ├─ YES → Continue to step 2
   │  └─ NO  → Create notification task for server owner → END
   │
2. CHECK PREREQUISITES
   ├─ Can we reach the server? (ping/SSH check)
   ├─ Does the server meet minimum requirements? (OS, kernel version for eBPF)
   ├─ Is there an active change freeze?
   │  ├─ All clear → Continue to step 3
   │  └─ Blocked  → Set status = "InProgress", create notification → RETRY after freeze
   │
3. CREATE CHANGE REQUEST
   ├─ CR type: Standard (pre-approved) if Priority ≤ Medium
   ├─ CR type: Normal if Priority = High or Critical
   ├─ Wait for CR approval (Standard = auto-approved)
   │
4. DEPLOY AGENT
   ├─ Deployment method based on OS:
   │  ├─ Linux: Ansible playbook / SSH + RPM/DEB install
   │  ├─ Windows: SCCM / WinRM + MSI install
   │  └─ K8s: DaemonSet already covers → verify node tolerations
   ├─ Configure agent with enrollment token and gateway address
   │
5. VERIFY ENROLLMENT
   ├─ Wait up to 10 minutes for:
   │  ├─ Agent record to appear in x_avnth_pathfinder_agent
   │  ├─ First heartbeat received
   │  ├─ First flow data received
   │  ├─ All three confirmed → status = "Resolved", close CR
   │  └─ Timeout → status = "Failed", escalate to support group
   │
6. CLOSE GAP
   ├─ Update coverage_gap: remediation_status = "Resolved", resolved_at = NOW()
   ├─ Update CR: close with success notes
   └─ Send confirmation notification
```

### 4.6 Waiver Process

Not all gaps need remediation. Servers may be intentionally excluded:

| Waiver Reason | Example |
|---------------|---------|
| `Security exclusion` | Server in a restricted zone, agent not permitted |
| `End of life` | Server being decommissioned within 30 days |
| `Not applicable` | Network appliance, not an application server |
| `Cost decision` | Low-priority server, not worth the agent license |

Waivers require manager approval and expire after 90 days (re-evaluation required).

### 4.7 Metrics & KPIs

| Metric | Target |
|--------|--------|
| Coverage % (agents / servers) | > 95% for production |
| Mean time to remediate (gap → resolved) | < 48 hours for Critical, < 7 days for High |
| Auto-remediation success rate | > 90% |
| Waiver rate | < 5% of total servers |
| Gap recurrence rate | < 2% (gaps that reopen within 30 days) |

---

## 5. Crawl / Walk / Run / Fly Deployment Methodology

Each Pathfinder deployment follows a progressive maturity model:

### 5.1 Crawl (Weeks 1–4)

**Goal:** Prove value with minimal footprint.

- Deploy agents to 10–20 servers (representative sample)
- Standalone Gateway + PostgreSQL
- Basic ServiceNow tables installed
- Manual review of discovered integrations
- No intelligence products yet
- Coverage tier: 1 (Basic)

**Success criteria:** Discovered integrations match or exceed manually documented ones.

### 5.2 Walk (Weeks 5–12)

**Goal:** Expand coverage, add intelligence.

- Deploy agents to all production servers
- Enable Integration Intelligence (health scoring, summaries)
- Enable Service Map Intelligence (coverage analysis)
- EA reconciliation begins
- Coverage tier: 2 (Standard)
- Self-healing loop enabled (notification only, no auto-deploy)

**Success criteria:** > 80% coverage of production servers. Health scores on all integrations.

### 5.3 Run (Weeks 13–24)

**Goal:** Autonomous operations.

- Deploy to non-production environments
- Enable CMDB Ops Agent (autonomy level 1 → 2)
- Self-healing loop with auto-deploy for Standard CRs
- Coverage tier: 3 (Enhanced)
- EA reconciliation at > 90% mapped

**Success criteria:** CMDB quality score > 90%. Manual maintenance hours reduced by 50%.

### 5.4 Fly (Week 25+)

**Goal:** Full platform maturity.

- All servers covered (production + non-production)
- CMDB Ops Agent at autonomy level 2–3
- Full self-healing (auto-deploy, auto-remediate)
- Coverage tier: 4 (Full) for critical applications
- Change impact analysis integrated into change management process

**Success criteria:** > 95% coverage. CMDB quality score > 95%. Manual maintenance reduced by 80%.

---

## 6. Configuration: Self-Healing

```yaml
self_healing:
  enabled: true
  detection_interval: "0 */4 * * *"   # Every 4 hours

  auto_deploy:
    enabled: true
    max_concurrent_deploys: 10
    allowed_os:
      - linux
      - windows
    blocked_during_freeze: true

  remediation:
    standard_cr_auto_approve: true     # Auto-approve Standard CRs
    enrollment_timeout_minutes: 10
    max_retries: 3
    retry_interval_hours: 4

  waivers:
    require_approval: true
    expiry_days: 90
    max_waiver_percent: 5              # Alert if > 5% servers waived

  notifications:
    gap_detected: true
    deploy_started: true
    deploy_completed: true
    deploy_failed: true
    waiver_expiring: true              # 7 days before expiry
```
