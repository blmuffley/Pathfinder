# Avennorth Bearing — Complete Project Prompt

> Paste this entire document into a new Claude conversation to build the Bearing product from scratch.

---

## 1. Context

### 1.1 Avennorth Brand System

Avennorth is a ServiceNow-focused product company. All products work independently but compose through the ServiceNow CMDB when deployed together.

**Brand:**
- Colors: Obsidian (#1C1917) + Electric Lime (#39FF14)
- Typography: Syne (headings), DM Sans (body), Space Mono (code/data)
- Naming convention: Navigational metaphors (Bearing, Pathfinder, Contour, Vantage, Compass)
- Scope prefix: `x_avnth_` (shared across all products)

### 1.2 Product Portfolio

| Product | Metaphor | Function |
|---------|----------|----------|
| **Bearing** | "Measures where you are" | CMDB health assessment, maturity scoring, technical debt quantification |
| **Pathfinder** | "Finds the path" | Behavioral discovery — eBPF/ETW agents observe network traffic, classify integrations, populate CMDB |
| **Contour** | "Maps the terrain" | Service mapping — assembles CSDM hierarchy from Pathfinder's discovered CIs |
| **Vantage** | "Sees from above" | AI-powered incident investigation, blast radius analysis |
| **Compass** | "Guides the journey" | CoreX consulting platform — engagement management, methodology delivery |
| **Meridian** | "Aligns workforce" | Clinical workforce correlation (healthcare vertical) |
| **Ledger** | "Records compliance" | Compliance automation (healthcare vertical) |

### 1.3 Bearing's Position

Bearing is the **wedge product**. It exists to:

1. Get in the door — free or low-cost assessment that any organization can run
2. Reveal the problem — quantify CMDB gaps in terms the C-suite understands (dollars, risk, maturity level)
3. Sell the fix — Pathfinder + Contour are the obvious remediation once Bearing shows the damage
4. Measure progress — re-run Bearing after deployment to prove ROI

Bearing is **never the primary revenue driver**. It is the diagnostic that makes Pathfinder an obvious purchase.

### 1.4 The Sales Motion

This is the core reason Bearing exists:

1. CoreX consultant deploys Bearing assessment (free) during initial engagement
2. Bearing reveals: "Your CMDB is 34% healthy. 70% of integrations are undocumented. Estimated technical debt: $2.4M in manual effort."
3. Consultant says: "Pathfinder fixes this automatically. $50K/yr, deployed in 2 weeks."
4. Customer buys Pathfinder. 30 days later, re-run Bearing: "CMDB now 82% healthy. 6,400 CIs discovered. Technical debt reduced by $1.8M."
5. Consultant says: "Now let's map this into CSDM with Contour."
6. Flywheel continues.

### 1.5 Product Relationships

```
Bearing ←── reads all CMDB tables (read-only analysis)
Bearing ←── consumes Pathfinder confidence feed (webhook)
Bearing ←── consumes Contour service model events (webhook)
Bearing ───→ writes assessment results to Bearing-owned tables
Bearing ───→ publishes assessment.completed events for other products
```

- **Pathfinder → Bearing:** Pathfinder publishes a confidence feed via webhook. Bearing consumes it to produce "fusion findings" — insights only visible by comparing CMDB records with live behavioral observation.
- **Contour → Bearing:** When Contour builds/updates a service model, Bearing can assess CSDM layer completeness.
- **CoreX/Compass → Bearing:** Consultants use Bearing as a diagnostic during every engagement.
- **Critical constraint:** Bearing MUST work WITHOUT Pathfinder (standalone CMDB assessment). When Pathfinder IS deployed, Bearing gets richer (confidence feed, fusion findings, shadow IT detection).

### 1.6 ServiceNow Acquisition Context

ServiceNow acquired Armis for $7.75B, signaling massive investment in device discovery. Bearing's design must be **discovery-agnostic** — it assesses CMDB quality regardless of which discovery tool populated the data (ServiceNow Discovery, Armis, Pathfinder, BMC, manual entry). Bearing never assumes Pathfinder is the discovery source; it works with any CMDB data.

---

## 2. What Bearing Does

### 2.1 CMDB Health Assessment

Score the quality of existing CMDB data across eight dimensions. Each dimension produces a 0-100 score. The overall health score is a weighted composite.

| Dimension | Weight | What It Measures |
|-----------|--------|-----------------|
| **Completeness** | 20% | What percentage of CIs have required fields populated (name, class, IP, owner, support group, environment) |
| **Accuracy** | 15% | Do CIs match what discovery tools (Pathfinder, Armis, SN Discovery) actually observe? Requires Pathfinder confidence feed or SN Discovery data for full scoring. Without discovery data, this dimension scores based on internal consistency checks only. |
| **Currency** | 15% | How stale is the data — last_update, last_discovered dates. CIs not updated in 90+ days flagged as stale. |
| **Relationships** | 15% | Are service dependencies mapped? What percentage of CIs have at least one relationship? Are relationships bidirectional? |
| **CSDM Compliance** | 10% | Which CSDM layers are populated (Business Service, Business App, Technical Service, Infrastructure)? What percentage of infrastructure CIs are mapped up to a business service? |
| **Classification Quality** | 10% | Are CIs in the correct classes? Are there servers classified as generic `cmdb_ci` instead of `cmdb_ci_linux_server`? |
| **Orphan Analysis** | 10% | CIs with zero relationships — no parents, no children, no dependencies. These are invisible to service impact analysis. |
| **Duplicate Detection** | 5% | Potential duplicate CIs based on name similarity, IP address overlap, serial number matches. |

**Scoring algorithm:**

```python
# Per-dimension scoring
dimension_score = (passing_checks / total_checks) * 100

# Overall health score
overall_score = sum(dimension.score * dimension.weight for dimension in dimensions)

# Letter grade mapping
# A: 90-100, B: 75-89, C: 60-74, D: 40-59, F: 0-39
```

### 2.2 Technical Debt Quantification

Translate CMDB gaps into business risk using dollar-value estimates.

**Debt categories:**

| Finding | Risk Statement | Cost Formula |
|---------|---------------|-------------|
| Servers with no application mapping | Change risk is unquantified — every change is blind | `count * avg_hours_to_map_manually * hourly_rate` |
| Undocumented integrations | Incident MTTR is 3x longer when integration maps don't exist | `count * avg_additional_mttr_hours * hourly_rate * incidents_per_year` |
| Orphaned CIs | Service impact analysis misses these — P1 blast radius is understated | `count * risk_exposure_per_ci_per_year` |
| Stale CIs | Decisions based on outdated data — capacity planning, security posture | `count * avg_hours_to_validate * hourly_rate` |
| Missing CSDM mapping | Cannot produce accurate service maps — every outage requires manual triage | `unmapped_count * avg_mapping_hours * hourly_rate` |
| Duplicate CIs | License overcounting, inaccurate reporting, confused support teams | `duplicate_count * avg_resolution_hours * hourly_rate` |

**Default cost assumptions** (customer-configurable):

| Parameter | Default Value |
|-----------|--------------|
| `hourly_rate` | $150/hr (fully loaded IT staff cost) |
| `avg_hours_to_map_manually` | 2 hours per CI |
| `avg_additional_mttr_hours` | 1.5 hours per incident |
| `incidents_per_year` | 12 per undocumented integration |
| `risk_exposure_per_ci_per_year` | $5,000 |
| `avg_hours_to_validate` | 1 hour per stale CI |
| `avg_mapping_hours` | 3 hours per CSDM mapping |
| `avg_resolution_hours` | 1.5 hours per duplicate |

### 2.3 Maturity Model Scoring

Five-level CMDB maturity model. Bearing assesses current level and provides a roadmap to the next level.

| Level | Name | Criteria |
|-------|------|----------|
| **1** | Ad-hoc | Manual CI entry, spreadsheet-based tracking, no discovery tools, no CSDM, health score < 30 |
| **2** | Managed | Some discovery running (SN Discovery, Armis, or equivalent), basic CI population, some relationships, health score 30-54 |
| **3** | Defined | CSDM partially adopted (2+ layers populated), service maps emerging, automated discovery covering 60%+ of estate, health score 55-74 |
| **4** | Measured | Confidence scores on CIs, health monitoring active, automated governance (dedup, stale detection), 80%+ coverage, health score 75-89 |
| **5** | Optimized | Full CSDM adoption (all 4 layers), autonomous CMDB operations (AI-driven remediation), continuous assessment, health score 90+ |

**Level determination algorithm:**

```python
def determine_maturity_level(assessment: Assessment) -> int:
    score = assessment.overall_score
    has_discovery = assessment.discovery_sources_count > 0
    csdm_layers = assessment.populated_csdm_layers
    has_governance = assessment.has_automated_governance
    has_autonomous = assessment.has_autonomous_operations
    coverage_pct = assessment.discovery_coverage_percent

    if score >= 90 and csdm_layers >= 4 and has_autonomous:
        return 5
    elif score >= 75 and has_governance and coverage_pct >= 80:
        return 4
    elif score >= 55 and csdm_layers >= 2 and coverage_pct >= 60:
        return 3
    elif score >= 30 and has_discovery:
        return 2
    else:
        return 1
```

### 2.4 Pathfinder Confidence Feed Integration

When Pathfinder is deployed, it publishes a confidence feed to Bearing via webhook. This enables **fusion findings** — insights only possible by comparing CMDB records with live behavioral observation.

**Confidence feed webhook:** `POST /api/webhooks/pathfinder`

**Feed payload schema (from Pathfinder's Go types):**

```json
{
  "schema_version": "1.0",
  "pathfinder_instance_id": "pf-prod-01",
  "servicenow_instance_url": "https://customer.service-now.com",
  "observation_window_hours": 24,
  "generated_at": "2026-03-31T12:00:00Z",
  "ci_confidence_records": [
    {
      "ci_sys_id": "abc123...",
      "ci_class": "cmdb_ci_app_server",
      "confidence_score": 90,
      "traffic_state": "active",
      "last_observation": "2026-03-31T11:45:00Z",
      "observation_count": 1247,
      "communication_partners": [
        {
          "partner_ci_sys_id": "def456...",
          "protocol": "tcp",
          "port": 5432,
          "last_seen": "2026-03-31T11:44:00Z",
          "traffic_volume_bytes_24h": 52428800
        }
      ],
      "relationship_confirmations": [
        {
          "rel_ci_sys_id": "rel789...",
          "parent_ci_sys_id": "abc123...",
          "child_ci_sys_id": "def456...",
          "rel_type": "IntegratesWith::IntegratedWith",
          "confirmed": true,
          "confidence": 95
        }
      ],
      "behavioral_classification": {
        "suggested_class": "cmdb_ci_app_server",
        "classification_confidence": 80,
        "reasoning": "Receiving HTTP/HTTPS traffic from multiple sources — likely a web/application server"
      }
    }
  ],
  "coverage_summary": {
    "total_monitored_hosts": 1247,
    "active_cis": 1100,
    "idle_cis": 89,
    "deprecated_cis": 34,
    "unknown_cis": 24,
    "monitored_subnets": ["10.0.1.0/24", "10.0.2.0/24"],
    "unmonitored_subnets_detected": ["10.0.5.0/24"]
  }
}
```

**Authentication:** `X-Bearing-API-Key` header.

**Fusion finding types enabled by Pathfinder data:**

| Finding Type | Description |
|-------------|-------------|
| **Shadow IT** | CIs Pathfinder observes on the network that have no CMDB record (sys_id starts with `pf_unknown_`) |
| **Ghost CIs** | CIs in the CMDB that Pathfinder never observes (traffic_state = deprecated or no record) |
| **Misclassified CIs** | Pathfinder's behavioral classification disagrees with CMDB class |
| **Unconfirmed Relationships** | CMDB relationships with no observed traffic backing them |
| **Missing Relationships** | Pathfinder observes communication partners not in any CMDB relationship |
| **Confidence Gaps** | CIs with low Pathfinder confidence scores despite being marked "operational" in CMDB |

**Traffic state classification (from Pathfinder):**

| State | Meaning |
|-------|---------|
| `active` | Meaningful traffic in current observation window |
| `idle` | CI is reachable but minimal/no application traffic |
| `deprecated` | Was active previously, zero traffic for 7+ days |
| `unknown` | Insufficient data to classify |

### 2.5 Executive Reporting

Generate board-ready and CIO-ready reports.

**Report types:**

1. **CMDB Health Scorecard** — Single page. Overall score, eight dimension scores as traffic lights (red/amber/green), top 5 findings, maturity level. PDF and DOCX.

2. **Technical Debt Summary** — Dollar-value estimate of CMDB technical debt by category. Chart showing cost breakdown. Comparison to industry benchmarks. PDF and DOCX.

3. **Maturity Model Report** — Current level with detailed criteria assessment. Roadmap to next level with specific actions. Timeline estimate. PDF and DOCX.

4. **Recommendation Report** — Prioritized list of remediation actions. Estimated effort and impact for each. Grouped by dimension. Includes Pathfinder/Contour recommendations where applicable. PDF and DOCX.

5. **Before/After Comparison** — Side-by-side of two assessment runs. Delta scores per dimension. Findings resolved vs. new findings. ROI calculation. PDF and DOCX.

6. **AI Analysis Summary** — Claude-generated narrative analysis of the assessment. Plain-English explanation of what the numbers mean. Suitable for executive presentations. Embedded in all reports as a summary section.

### 2.6 Continuous Assessment

Bearing is not just a one-time scan.

- **Scheduled runs:** Weekly, monthly, or quarterly assessments on a configurable schedule
- **Trend tracking:** Historical scores stored in `x_avnth_bearing_trend`. Charts showing score progression over time.
- **Degradation alerts:** When any dimension score drops more than 10 points between runs, generate an alert
- **Pathfinder integration:** When Pathfinder's CMDB Ops agents remediate findings, Bearing's next run captures the improvement automatically

---

## 3. Technical Architecture

### 3.1 System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      Bearing Backend (Python/FastAPI)              │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Assessment    │  │ Scoring      │  │ Report Generator      │  │
│  │ Engine        │  │ Engine       │  │ (PDF, DOCX, SN)       │  │
│  │              │  │              │  │                       │  │
│  │ • Scheduler   │  │ • 8 dims     │  │ • fpdf2 (PDF)         │  │
│  │ • Orchestrator│  │ • Weights    │  │ • python-docx (DOCX)  │  │
│  │ • Data fetch  │  │ • Maturity   │  │ • SN Report API       │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘  │
│         │                  │                       │              │
│  ┌──────┴──────────────────┴───────────────────────┴──────────┐  │
│  │                    Core Services                            │  │
│  │  • ServiceNow REST Client (reads CMDB, writes Bearing)      │  │
│  │  • Claude API Client (AI analysis, summaries, recommendations│  │
│  │  • Pathfinder Webhook Receiver (confidence feed consumer)    │  │
│  │  • Trend Storage (assessment history)                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    API Layer (FastAPI)                      │   │
│  │  POST /api/v1/assessments          — trigger assessment    │   │
│  │  GET  /api/v1/assessments/{id}     — get assessment        │   │
│  │  GET  /api/v1/assessments          — list assessments      │   │
│  │  GET  /api/v1/scores/{id}          — dimension scores      │   │
│  │  GET  /api/v1/findings/{id}        — findings for run      │   │
│  │  GET  /api/v1/trends               — historical trends     │   │
│  │  POST /api/v1/reports/{id}/pdf     — generate PDF          │   │
│  │  POST /api/v1/reports/{id}/docx    — generate DOCX         │   │
│  │  POST /api/webhooks/pathfinder     — confidence feed       │   │
│  │  POST /api/webhooks/contour        — service model events  │   │
│  │  GET  /api/v1/health               — service health check  │   │
│  └────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────┐
│ ServiceNow CMDB │ │ Claude API      │ │ Pathfinder Gateway  │
│ (REST API)      │ │ (Anthropic SDK) │ │ (webhook publisher) │
└─────────────────┘ └─────────────────┘ └─────────────────────┘
```

### 3.2 Technology Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| Backend framework | FastAPI (Python 3.11+) | Async, OpenAPI docs auto-generated |
| Data models | Pydantic v2 | All request/response models, config validation |
| ServiceNow client | `requests` + OAuth2 | Token refresh, rate limiting, pagination |
| AI analysis | `anthropic` SDK | Claude for summaries, recommendations, narrative |
| PDF generation | `fpdf2` | Branded PDF reports with charts |
| DOCX generation | `python-docx` | Branded Word documents |
| Charts | `matplotlib` | Dimension score charts, trend lines, heatmaps |
| Scheduling | `APScheduler` | Cron-based assessment scheduling |
| Database | PostgreSQL (optional) | Local trend storage; can also use SN tables only |
| Testing | `pytest` + `pytest-asyncio` | 80%+ coverage target |
| Linting | `ruff` | Fast Python linter |
| Type checking | `mypy` | Strict mode |

### 3.3 No Go Components

Bearing is pure analysis — no kernel-level observation, no agents, no gRPC. The entire product is Python + ServiceNow. This keeps the deployment simple: a single container or serverless function.

---

## 4. Data Model (Bearing-Owned ServiceNow Tables)

All tables use the `x_avnth_` scope prefix. Bearing only WRITES to its own tables. It READS from all CMDB tables but never modifies them.

### 4.1 x_avnth_bearing_assessment

Assessment run metadata. One record per assessment execution.

| Field | Type | Description |
|-------|------|-------------|
| `assessment_id` | String (UUID) | Unique assessment run identifier |
| `name` | String | Human-readable name ("Q1 2026 Full Assessment") |
| `scope` | Choice | `full` / `targeted` / `incremental` |
| `target_scope` | String | CI query filter (empty = full CMDB) |
| `overall_score` | Integer (0-100) | Weighted composite health score |
| `maturity_level` | Integer (1-5) | Assessed maturity level |
| `maturity_label` | String | "Ad-hoc" / "Managed" / "Defined" / "Measured" / "Optimized" |
| `findings_count` | Integer | Total findings generated |
| `critical_findings` | Integer | Critical severity finding count |
| `technical_debt_estimate` | Currency | Dollar estimate of total technical debt |
| `ci_count_assessed` | Integer | Total CIs analyzed |
| `has_pathfinder_data` | Boolean | Whether Pathfinder confidence feed was available |
| `has_contour_data` | Boolean | Whether Contour service model data was available |
| `run_date` | DateTime | Assessment start time |
| `completed_date` | DateTime | Assessment completion time |
| `status` | Choice | `pending` / `running` / `completed` / `failed` |
| `ai_summary` | String (8000) | Claude-generated executive summary |
| `triggered_by` | Choice | `manual` / `scheduled` / `api` / `corex` |

### 4.2 x_avnth_bearing_finding

Individual findings. One record per gap, risk, or recommendation discovered.

| Field | Type | Description |
|-------|------|-------------|
| `finding_id` | String (UUID) | Unique finding identifier |
| `assessment` | Reference (x_avnth_bearing_assessment) | Parent assessment run |
| `finding_type` | Choice | `gap` / `risk` / `recommendation` / `positive` / `fusion` |
| `severity` | Choice | `critical` / `high` / `medium` / `low` / `info` |
| `dimension` | Choice | `completeness` / `accuracy` / `currency` / `relationships` / `csdm` / `classification` / `orphans` / `duplicates` |
| `category` | String | Sub-category within dimension |
| `title` | String | Short finding title |
| `description` | String (4000) | Detailed finding description |
| `affected_ci` | Reference (cmdb_ci) | Specific CI this finding applies to (optional) |
| `affected_ci_class` | String | CI class for aggregated findings |
| `affected_count` | Integer | Number of CIs affected (for aggregate findings) |
| `remediation` | String (2000) | Recommended fix |
| `estimated_effort_hours` | Decimal | Estimated hours to remediate manually |
| `estimated_cost` | Currency | Dollar cost to remediate |
| `avennorth_product` | Choice | `none` / `pathfinder` / `contour` / `pathfinder+contour` | Which Avennorth product addresses this |
| `automation_potential` | Choice | `full` / `partial` / `manual` | Can this be automated? |
| `fusion_source` | Choice | `cmdb_only` / `pathfinder_only` / `fusion` | Data source for this finding |

### 4.3 x_avnth_bearing_score

Per-dimension scores for each assessment. Eight records per assessment run.

| Field | Type | Description |
|-------|------|-------------|
| `score_id` | String (UUID) | Unique score identifier |
| `assessment` | Reference (x_avnth_bearing_assessment) | Parent assessment |
| `dimension` | Choice | One of the 8 dimensions |
| `score` | Integer (0-100) | Dimension score |
| `weight` | Decimal | Weight used in composite (0.05 - 0.20) |
| `checks_passed` | Integer | Number of checks that passed |
| `checks_total` | Integer | Total checks run |
| `details` | String (4000) | Breakdown of what was checked |

### 4.4 x_avnth_bearing_trend

Historical score tracking. One record per dimension per assessment run, enabling trend charts.

| Field | Type | Description |
|-------|------|-------------|
| `trend_id` | String (UUID) | Unique identifier |
| `assessment` | Reference (x_avnth_bearing_assessment) | Source assessment |
| `dimension` | Choice | Dimension or `overall` |
| `score` | Integer (0-100) | Score at this point in time |
| `run_date` | DateTime | When this score was captured |
| `delta_from_previous` | Integer | Change from previous assessment (-100 to +100) |

### 4.5 x_avnth_bearing_recommendation

Prioritized remediation recommendations. Generated per assessment, ranked by impact and effort.

| Field | Type | Description |
|-------|------|-------------|
| `recommendation_id` | String (UUID) | Unique identifier |
| `assessment` | Reference (x_avnth_bearing_assessment) | Source assessment |
| `priority` | Integer | Rank order (1 = highest priority) |
| `title` | String | Short recommendation title |
| `description` | String (4000) | Detailed recommendation |
| `dimension` | Choice | Primary dimension addressed |
| `impact_score` | Integer (1-10) | Expected impact on health score |
| `effort` | Choice | `low` / `medium` / `high` |
| `estimated_hours` | Decimal | Estimated hours to implement |
| `estimated_cost_savings` | Currency | Annual savings if implemented |
| `avennorth_product` | Choice | Which product automates this |
| `automation_potential` | Choice | `full` / `partial` / `manual` |

---

## 5. Shared Data Model Reference

Bearing operates within the Avennorth shared data model. Key points:

### 5.1 Data Ownership Rules

- Bearing READS from all `cmdb_ci*` tables and `x_avnth_*` tables
- Bearing WRITES only to `x_avnth_bearing_*` tables
- Bearing creates `AssessedBy::Assesses` relationships between CIs and assessment records
- Bearing NEVER modifies CMDB data — it is strictly read-only analysis

### 5.2 Cross-Product Tables Bearing Reads

| Table | Owner | What Bearing Uses It For |
|-------|-------|------------------------|
| `cmdb_ci` | ServiceNow | Base CI data for all dimension checks |
| `cmdb_ci_server` | ServiceNow | Server completeness, classification |
| `cmdb_ci_app_server` | ServiceNow | Application mapping analysis |
| `cmdb_ci_service_auto` | Contour | CSDM compliance — business services |
| `cmdb_ci_business_app` | Contour | CSDM compliance — business apps |
| `cmdb_ci_service_technical` | Contour | CSDM compliance — technical services |
| `cmdb_rel_ci` | ServiceNow | Relationship analysis, orphan detection |
| `x_avnth_cmdb_ci_integration` | Pathfinder | Integration documentation completeness |
| `x_avnth_pathfinder_agent` | Pathfinder | Coverage analysis |
| `x_avnth_service_model` | Contour | Service model completeness |

### 5.3 Webhook Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `ci.created` | Pathfinder → Bearing | CI sys_id, type, confidence |
| `ci.updated` | Pathfinder → Bearing | CI sys_id, changed fields |
| `service_model.updated` | Contour → Bearing | Model version, changed services |
| `assessment.completed` | Bearing → All | Assessment ID, scores, summary |

### 5.4 Shared Roles

| Role | Bearing Access |
|------|---------------|
| `x_avnth.admin` | Full CRUD on all Bearing tables |
| `x_avnth.bearing_user` | Read all CMDB, write Bearing tables |
| `x_avnth.analyst` | Read-only on all tables including Bearing |

---

## 6. Pricing

| Offering | Price | Purpose |
|----------|-------|---------|
| **Bearing Assessment (one-time)** | Free / $5K | The wedge. Get in the door. Run once, generate the report, reveal the problem. |
| **Bearing Continuous** | $2-5K/month | Ongoing scheduled assessments + trend tracking + degradation alerts |
| **Bearing + Pathfinder Bundle** | Assessment free | Bearing assessment included when customer purchases Pathfinder subscription |
| **CoreX Engagement** | Included | Every CoreX consulting engagement includes Bearing assessment as the diagnostic tool |

Bearing's purpose is demand generation for Pathfinder ($50-150K/yr) and Contour (bundled). The $5K one-time fee barely covers delivery cost — the ROI is in the Pathfinder sale that follows.

---

## 7. ServiceNow Workspace (Polaris)

Design Bearing's ServiceNow presence as Polaris workspace pages. These are the views available inside ServiceNow.

### 7.1 Assessment Dashboard

The primary landing page.

- **Overall health score** — large donut chart, color-coded (red < 40, amber 40-74, green 75+)
- **Eight dimension scores** — horizontal bar chart or radar chart
- **Maturity level indicator** — visual 1-5 scale with current position highlighted
- **Trend sparkline** — last 6 assessments, overall score trend
- **Critical findings count** — prominent badge
- **Technical debt estimate** — dollar value, prominent display
- **Last assessment date** and next scheduled run
- **Quick actions:** Run Assessment, Generate Report, View Findings

### 7.2 Findings Explorer

Browse all findings from the most recent (or any selected) assessment.

- **Filter bar:** severity, dimension, finding type, fusion source, affected CI class
- **Sortable table:** title, severity, dimension, affected count, estimated cost, automation potential
- **Finding detail panel:** full description, remediation, affected CIs list, cost estimate
- **Bulk actions:** Export to CSV, Generate report for selected findings
- **Avennorth product badges:** shows which product can automate remediation

### 7.3 CMDB Health Map

Visual heatmap of CMDB quality organized by CI class.

- **Tree map or grid:** each cell is a CI class, sized by CI count, colored by health score
- **Drill-down:** click a class to see dimension breakdown for that class
- **Comparison toggle:** show current vs. previous assessment
- **Filters:** by environment (production/non-prod), by support group, by location

### 7.4 Maturity Model

Current maturity level with progression roadmap.

- **5-level visual scale** — current level highlighted, criteria checklist per level
- **Gap analysis:** what's needed to reach the next level
- **Recommended actions** with effort estimates
- **Timeline projection:** estimated time to next level based on current improvement rate

### 7.5 Executive Report

One-click generation of board-ready documents.

- **Report type selector:** Health Scorecard, Technical Debt, Maturity, Recommendations, Before/After
- **Format selector:** PDF, DOCX
- **Preview panel** — rendered preview before download
- **Scheduling:** configure recurring report delivery via email

### 7.6 Pathfinder Fusion

Findings only visible when Pathfinder data is available. This page is hidden when no Pathfinder confidence feed has been received.

- **Shadow IT list** — CIs Pathfinder sees that aren't in the CMDB
- **Ghost CI list** — CMDB records with no observed traffic
- **Misclassification findings** — behavioral class vs. CMDB class
- **Relationship validation** — confirmed vs. unconfirmed relationships
- **Confidence gap analysis** — CIs marked operational but with low confidence scores
- **Coverage map** — monitored vs. unmonitored subnets

---

## 8. Interactive Prototype

### 8.1 Requirements

- **Framework:** React 18+ with Vite
- **Port:** 4201 (Avennorth port registry: Pathfinder=4200, Bearing=4201, Contour=4202, Vantage=4203)
- **Styling:** Tailwind CSS with Avennorth theme tokens
- **Theme:** Dark mode (default) and light mode toggle
- **Charts:** Recharts or similar React charting library
- **Routing:** React Router v6

### 8.2 Theme System

```css
/* Dark theme (default) */
--color-bg-primary: #0A0A0A;
--color-bg-secondary: #1C1917;      /* Obsidian */
--color-bg-tertiary: #292524;
--color-accent: #39FF14;            /* Electric Lime */
--color-accent-muted: #39FF1440;
--color-text-primary: #FAFAF9;
--color-text-secondary: #A8A29E;
--color-text-tertiary: #78716C;
--color-border: #44403C;
--color-success: #22C55E;
--color-warning: #F59E0B;
--color-danger: #EF4444;
--color-info: #3B82F6;

/* Light theme */
--color-bg-primary: #FAFAF9;
--color-bg-secondary: #F5F5F4;
--color-bg-tertiary: #E7E5E4;
--color-accent: #15803D;            /* Darker green for light mode */
--color-text-primary: #1C1917;
--color-text-secondary: #57534E;
--color-border: #D6D3D1;

/* Typography */
--font-heading: 'Syne', sans-serif;
--font-body: 'DM Sans', sans-serif;
--font-mono: 'Space Mono', monospace;
```

### 8.3 Demo Data: Mercy Health System

Fictional customer used for all demo scenarios.

**Organization profile:**
- Name: Mercy Health System
- Industry: Healthcare
- ServiceNow instance: mercy-health.service-now.com
- Total CIs: ~18,000
- Servers: ~4,200
- Applications: ~340
- Integrations documented: ~120 (actual: ~400+)

**Pre-Pathfinder Assessment (baseline):**
- Overall score: **34/100** (Grade: F)
- Maturity level: **1 — Ad-hoc**
- Dimension scores:
  - Completeness: 42
  - Accuracy: 18 (no discovery validation)
  - Currency: 28
  - Relationships: 31
  - CSDM Compliance: 12
  - Classification Quality: 55
  - Orphan Analysis: 38
  - Duplicate Detection: 48
- Critical findings: 47
- Total findings: 214
- Technical debt estimate: **$2.4M**
- Key findings:
  - 2,800 servers with no application mapping
  - 68% of integrations undocumented (280+ missing)
  - 4,100 orphaned CIs with zero relationships
  - 1,200 CIs not updated in 180+ days
  - No CSDM Business Service layer populated
  - 340 potential duplicate CIs detected

**Post-Pathfinder Assessment (30 days later):**
- Overall score: **82/100** (Grade: B)
- Maturity level: **3 — Defined**
- Dimension scores:
  - Completeness: 88
  - Accuracy: 91 (Pathfinder confidence feed validating)
  - Currency: 85
  - Relationships: 78
  - CSDM Compliance: 45 (Contour not yet deployed)
  - Classification Quality: 89
  - Orphan Analysis: 82
  - Duplicate Detection: 94
- Critical findings: 8
- Total findings: 62
- Technical debt estimate: **$620K** (reduced by $1.8M)
- Key improvements:
  - 6,400 CIs discovered/validated by Pathfinder
  - 382 integrations discovered (vs. 120 documented)
  - Orphaned CIs reduced from 4,100 to 680
  - 98% of CIs now current (last 30 days)
  - 290 duplicates auto-resolved by CMDB Ops agents
- Fusion findings (Pathfinder-enabled):
  - 34 shadow IT systems discovered
  - 89 ghost CIs identified (in CMDB but no traffic)
  - 23 misclassified CIs corrected
  - 156 relationships confirmed by traffic observation

### 8.4 Prototype Pages

1. **Assessment Dashboard** — overall score donut, dimension bar chart, maturity indicator, trend line, debt estimate, finding badges
2. **Findings Explorer** — filterable/sortable table of all findings, detail panel, severity breakdown chart
3. **CMDB Health Map** — tree map visualization by CI class, colored by health score
4. **Maturity Model** — 5-level visual progression, current position, criteria checklist, gap analysis
5. **Executive Report** — report preview with type/format selector, sample rendered report
6. **Fusion Findings** — shadow IT table, ghost CIs, misclassifications, relationship validation (only shown when Pathfinder data toggle is on)
7. **Before/After Comparison** — side-by-side assessment comparison, delta visualization, ROI calculation

### 8.5 Prototype Interactions

- Toggle between pre-Pathfinder and post-Pathfinder assessment data
- Toggle Pathfinder fusion data on/off (shows what Bearing looks like standalone vs. with Pathfinder)
- Dark/light theme switch
- Click-through from dashboard to findings to individual finding detail
- Dimension drill-down from health map
- Report generation simulation (shows PDF preview)

---

## 9. Deliverables

Build these in order. Each deliverable should be a complete, working artifact.

| # | Deliverable | Format | Description |
|---|-------------|--------|-------------|
| 1 | **Architecture Spec** | Markdown + Diagram | Full technical architecture document. FastAPI backend, ServiceNow integration patterns, deployment model. |
| 2 | **Assessment Engine Spec** | Markdown | Detailed specification of all 8 dimension scoring algorithms, including ServiceNow queries used, check definitions, weight calculations. |
| 3 | **Maturity Model Definition** | Markdown | Complete 5-level maturity model with criteria, progression rules, gap analysis logic. |
| 4 | **Pathfinder Confidence Feed Integration Spec** | Markdown | Webhook consumer spec, fusion finding algorithms, handling of feed data when Pathfinder is/isn't present. |
| 5 | **ServiceNow Table Definitions** | XML/JSON | Complete table definitions for all 5 Bearing tables, ready for ServiceNow import. |
| 6 | **Report Templates** | Python | Report generation code for PDF (fpdf2) and DOCX (python-docx). Branded with Avennorth visual identity. |
| 7 | **Product Spec** | Markdown | Product specification with pricing, competitive positioning, buyer personas, key metrics. |
| 8 | **Interactive Prototype** | React/Vite | Full prototype on port 4201 with all 7 pages, demo data, theme toggle, Pathfinder data toggle. |
| 9 | **Demo Data Package** | JSON | Complete before/after demo data for Mercy Health System. |
| 10 | **Business Case** | Markdown | ROI model, cost-benefit analysis, competitive comparison. |

---

## 10. Project Structure

```
bearing/
├── README.md
├── pyproject.toml
├── Dockerfile
├── docker-compose.yml
├── Makefile
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── src/
│   ├── bearing/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI application entry point
│   │   ├── config.py                  # Pydantic settings
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── routes.py              # API route definitions
│   │   │   ├── webhooks.py            # Webhook endpoints (Pathfinder, Contour)
│   │   │   └── schemas.py            # Pydantic request/response models
│   │   ├── assessment/
│   │   │   ├── __init__.py
│   │   │   ├── engine.py              # Assessment orchestrator
│   │   │   ├── dimensions/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── base.py            # Base dimension scorer interface
│   │   │   │   ├── completeness.py
│   │   │   │   ├── accuracy.py
│   │   │   │   ├── currency.py
│   │   │   │   ├── relationships.py
│   │   │   │   ├── csdm_compliance.py
│   │   │   │   ├── classification.py
│   │   │   │   ├── orphan_analysis.py
│   │   │   │   └── duplicate_detection.py
│   │   │   ├── maturity.py            # Maturity model scorer
│   │   │   ├── debt.py                # Technical debt calculator
│   │   │   └── recommendations.py     # Recommendation engine
│   │   ├── fusion/
│   │   │   ├── __init__.py
│   │   │   ├── pathfinder.py          # Pathfinder confidence feed processor
│   │   │   ├── contour.py             # Contour service model processor
│   │   │   └── findings.py            # Fusion finding generator
│   │   ├── servicenow/
│   │   │   ├── __init__.py
│   │   │   ├── client.py              # ServiceNow REST API client
│   │   │   ├── auth.py                # OAuth2 token management
│   │   │   ├── queries.py             # CMDB query builders
│   │   │   └── writer.py              # Write assessment results to SN
│   │   ├── reports/
│   │   │   ├── __init__.py
│   │   │   ├── pdf.py                 # PDF report generator (fpdf2)
│   │   │   ├── docx.py                # DOCX report generator (python-docx)
│   │   │   ├── charts.py             # matplotlib chart generation
│   │   │   └── templates/
│   │   │       ├── health_scorecard.py
│   │   │       ├── technical_debt.py
│   │   │       ├── maturity_report.py
│   │   │       ├── recommendations.py
│   │   │       └── before_after.py
│   │   ├── ai/
│   │   │   ├── __init__.py
│   │   │   ├── client.py              # Claude API client (anthropic SDK)
│   │   │   ├── prompts.py             # Prompt templates for analysis
│   │   │   └── analysis.py            # AI-powered analysis generation
│   │   └── scheduler/
│   │       ├── __init__.py
│   │       └── jobs.py                # APScheduler job definitions
│   └── tests/
│       ├── conftest.py
│       ├── test_assessment/
│       │   ├── test_engine.py
│       │   ├── test_completeness.py
│       │   ├── test_accuracy.py
│       │   ├── test_currency.py
│       │   ├── test_relationships.py
│       │   ├── test_csdm.py
│       │   ├── test_classification.py
│       │   ├── test_orphans.py
│       │   ├── test_duplicates.py
│       │   ├── test_maturity.py
│       │   └── test_debt.py
│       ├── test_fusion/
│       │   ├── test_pathfinder.py
│       │   └── test_findings.py
│       ├── test_reports/
│       │   ├── test_pdf.py
│       │   └── test_docx.py
│       └── test_api/
│           ├── test_routes.py
│           └── test_webhooks.py
├── prototype/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   ├── public/
│   │   └── avennorth-logo.svg
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── theme.ts                   # Avennorth theme tokens
│       ├── data/
│       │   ├── demo-pre-pathfinder.ts  # Mercy Health baseline data
│       │   └── demo-post-pathfinder.ts # Mercy Health post-deployment data
│       ├── components/
│       │   ├── Layout.tsx
│       │   ├── Sidebar.tsx
│       │   ├── ThemeToggle.tsx
│       │   ├── ScoreDonut.tsx
│       │   ├── DimensionBar.tsx
│       │   ├── MaturityScale.tsx
│       │   ├── TrendChart.tsx
│       │   ├── FindingsTable.tsx
│       │   ├── HealthMap.tsx
│       │   ├── DebtCard.tsx
│       │   └── FusionToggle.tsx
│       └── pages/
│           ├── Dashboard.tsx
│           ├── Findings.tsx
│           ├── HealthMap.tsx
│           ├── MaturityModel.tsx
│           ├── ExecutiveReport.tsx
│           ├── FusionFindings.tsx
│           └── BeforeAfter.tsx
├── docs/
│   ├── architecture.md
│   ├── assessment-engine.md
│   ├── maturity-model.md
│   ├── pathfinder-integration.md
│   ├── product-spec.md
│   └── business-case.md
└── servicenow/
    ├── tables/
    │   ├── x_avnth_bearing_assessment.xml
    │   ├── x_avnth_bearing_finding.xml
    │   ├── x_avnth_bearing_score.xml
    │   ├── x_avnth_bearing_trend.xml
    │   └── x_avnth_bearing_recommendation.xml
    ├── workspace/
    │   ├── bearing_dashboard.json
    │   ├── findings_explorer.json
    │   ├── health_map.json
    │   ├── maturity_model.json
    │   ├── executive_report.json
    │   └── pathfinder_fusion.json
    └── rest_api/
        └── bearing_api_v1.js
```

---

## 11. Coding Conventions

### 11.1 Python

- Python 3.11+ required
- Type hints on all functions and variables
- Pydantic v2 for all data models
- FastAPI with async endpoints
- `anthropic` SDK for Claude API calls
- Docstrings on all public functions (Google style)
- `ruff` for linting, `mypy --strict` for type checking
- `pytest` for testing, `pytest-asyncio` for async tests
- Target 80%+ test coverage

### 11.2 ServiceNow

- Scope prefix: `x_avnth_`
- All tables use `sys_id` as primary key (standard SN behavior)
- Scripted REST API versioned under `/api/x_avnth/bearing/v1/`
- Polaris workspace for all UI
- Flow Designer for automated workflows (scheduled assessments, alert on degradation)
- No display business rules that use GlideRecord

### 11.3 React Prototype

- TypeScript strict mode
- Functional components with hooks
- Tailwind CSS with design tokens from theme system
- Recharts for data visualization
- React Router v6 for navigation
- No external UI component libraries — build from Avennorth design system

### 11.4 General

- Git: conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`)
- CI/CD: GitHub Actions
- Docker: multi-stage builds, non-root user
- Environment variables for all configuration (12-factor)
- No hardcoded ServiceNow instance URLs, API keys, or credentials

---

## 12. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BEARING_SN_INSTANCE` | Yes | ServiceNow instance URL (e.g., `https://customer.service-now.com`) |
| `BEARING_SN_CLIENT_ID` | Yes | ServiceNow OAuth2 client ID |
| `BEARING_SN_CLIENT_SECRET` | Yes | ServiceNow OAuth2 client secret |
| `BEARING_SN_USERNAME` | Yes | ServiceNow service account username |
| `BEARING_SN_PASSWORD` | Yes | ServiceNow service account password |
| `ANTHROPIC_API_KEY` | Yes | Claude API key for AI analysis |
| `BEARING_API_KEY` | Yes | API key for Bearing's own endpoints (used by Pathfinder webhook) |
| `BEARING_DB_URL` | No | PostgreSQL URL for local trend storage (optional, uses SN tables if not set) |
| `BEARING_PORT` | No | Server port (default: 8080) |
| `BEARING_LOG_LEVEL` | No | Logging level (default: INFO) |
| `BEARING_SCHEDULE_CRON` | No | Cron expression for scheduled assessments (default: disabled) |

---

## 13. Constraints

These are non-negotiable design constraints:

1. **Standalone operation:** Bearing MUST work without Pathfinder, Contour, or any other Avennorth product. It is a standalone CMDB assessment tool that gets richer when other products are present.

2. **Read-only CMDB access:** Bearing NEVER modifies CMDB data. It reads CI tables and writes only to its own `x_avnth_bearing_*` tables.

3. **Discovery-agnostic:** Bearing assesses CMDB quality regardless of the discovery source. It works with ServiceNow Discovery, Armis, Pathfinder, BMC, or manual data entry. The Accuracy dimension adapts its scoring when no discovery validation data is available.

4. **Shared namespace:** All ServiceNow tables use the `x_avnth_` scope prefix, shared with the rest of the Avennorth portfolio.

5. **ServiceNow Utah+ compatibility:** All ServiceNow components must be compatible with Utah and later releases.

6. **No kernel-level components:** Bearing is pure application-layer software. No agents, no eBPF, no ETW, no kernel modules.

7. **Pathfinder feed is additive:** The Pathfinder confidence feed enriches Bearing but is never required. If the feed stops, Bearing continues operating with CMDB-only data. Fusion findings simply stop being generated.

8. **AI analysis is optional:** If `ANTHROPIC_API_KEY` is not set, Bearing operates without AI summaries. All scoring algorithms are deterministic and do not require Claude. AI enhances the output but is not a dependency for core functionality.

9. **Report branding:** All generated reports (PDF, DOCX) must use Avennorth brand assets — Obsidian/Electric Lime colors, Syne headings, DM Sans body text.

10. **Port 4201:** The prototype MUST run on port 4201 per the Avennorth port registry.

---

## 14. File Output Rules

When generating files in conversations that build Bearing:

1. **Code goes in the Bearing Git repo.** Python, TypeScript, JavaScript, ServiceNow XML — all in the repo.
2. **Generated documents** (specs, business cases, reports intended for sharing) go to iCloud: `~/Library/Mobile Documents/com~apple~CloudDocs/Projects/Avennorth/Solutions/Bearing/`
3. **Shareable documents** get a `.docx` companion. Markdown goes in a `markdown/` subfolder; the `.docx` goes in the parent folder.
4. **Brand assets** are sourced from `~/Library/Mobile Documents/com~apple~CloudDocs/Projects/Avennorth/Brand/` — never copied into the repo.
5. **Corporate-level docs** go to `~/Library/Mobile Documents/com~apple~CloudDocs/Projects/Avennorth/Corporate/`, NOT into the Bearing folder.

| Category | Destination |
|----------|------------|
| Bearing docs | `Avennorth/Solutions/Bearing/Docs/` |
| Bearing diagrams | `Avennorth/Solutions/Bearing/Diagrams/` |
| Bearing financials | `Avennorth/Solutions/Bearing/Financial/` |
| Bearing presentations | `Avennorth/Solutions/Bearing/Presentations/` |

---

*Avennorth Bearing — Complete Project Prompt v1.0*
*Generated 2026-03-31*
