# 03 — CMDB Quality & Agentic Operations

## 1. Purpose

This document defines the 8 autonomous AI agents that continuously monitor, diagnose, and remediate CMDB quality issues. Together they form the **CMDB Ops Agent** product — an agentic system that moves CMDB management from reactive to autonomous.

---

## 2. Agent Architecture

### 2.1 Standard Agent Interface

Every agent implements the same 5-phase lifecycle:

```
observe() → diagnose() → recommend() → act() → verify()
```

| Phase | Purpose | Input | Output |
|-------|---------|-------|--------|
| **observe()** | Scan CMDB for issues in this agent's domain | CMDB query results | `list[Finding]` |
| **diagnose()** | Analyze root cause of each finding | Findings | `list[Diagnosis]` |
| **recommend()** | Generate recommended actions | Diagnoses | `list[Recommendation]` |
| **act()** | Execute actions (gated by autonomy level) | Recommendations | `list[Action]` |
| **verify()** | Confirm actions had intended effect | Actions | `list[VerificationResult]` |

### 2.2 Data Models

```python
class Finding:
    agent_name: str
    finding_type: str         # e.g., "duplicate", "orphan", "stale"
    severity: str             # critical, high, medium, low
    affected_ci: str          # sys_id of the CI
    description: str
    evidence: dict            # supporting data
    found_at: datetime

class Diagnosis:
    finding: Finding
    root_cause: str
    confidence: float         # 0.0-1.0
    ai_explanation: str       # Claude-generated explanation

class Recommendation:
    diagnosis: Diagnosis
    action_type: str          # merge, delete, update, reassign, escalate
    target_ci: str            # sys_id to act on
    proposed_changes: dict    # field → new_value
    risk_level: str           # high, medium, low
    requires_approval: bool

class Action:
    recommendation: Recommendation
    executed: bool
    execution_method: str     # api, change_request, manual
    result: str
    executed_at: datetime

class VerificationResult:
    action: Action
    verified: bool
    verification_method: str
    discrepancies: list[str]
    verified_at: datetime
```

### 2.3 Autonomy Levels

| Level | Name | Behavior |
|-------|------|----------|
| 0 | **Report Only** | Runs observe() + diagnose(). Logs findings. No action. |
| 1 | **Recommend** | Runs through recommend(). Creates recommendations in SN. Awaits human approval. |
| 2 | **Act with Approval** | Creates a Change Request in SN with proposed changes. Executes only after CR approval. |
| 3 | **Fully Autonomous** | Executes act() immediately. Creates Change Request retroactively for audit trail. |

Each agent has an independently configurable autonomy level. Default: Level 1 for all agents.

### 2.4 Guardrails

Even at Level 3 (autonomous), agents must respect:
- **Blast radius limit:** Max CIs affected per run (default: 50)
- **Cool-down period:** Min time between actions on same CI (default: 24h)
- **Exclusion list:** CIs tagged with `x_avnth_ops_exclude=true` are never touched
- **Rollback window:** All changes logged; manual rollback possible within 7 days
- **Kill switch:** Global `x_avnth_cmdb_ops_enabled` system property. Set to false = all agents stop.

---

## 3. The 8 Agents

### 3.1 Duplicate Detector

**Purpose:** Find Integration CIs that represent the same real-world connection.

**observe():**
- Query all Integration CIs
- Group by (source_ci, target_ci) — exact duplicates
- Group by fuzzy application name match — near duplicates
- Use Shared AI Engine for semantic similarity on `ai_summary` fields

**diagnose():**
- Exact match: confidence 1.0, root cause = "duplicate creation"
- Fuzzy match: confidence varies, root cause = "naming inconsistency" or "different discovery sources"

**recommend():**
- Merge duplicates: keep the CI with more flow data, merge health history
- Update references: reassign child Interface CIs to the surviving CI

**act():**
- Call SN API to update Interface CI parent references
- Call SN API to retire the duplicate CI
- Merge flow_count and preserve earliest first_discovered

**Metrics:**
- Duplicates found per run
- Duplicates resolved per run
- False positive rate (tracked via rejected recommendations)

---

### 3.2 Orphan Finder

**Purpose:** Find CIs with broken or missing relationships.

**observe():**
- Interface CIs with no parent Integration (broken FK)
- Integration CIs with no child Interfaces
- Integration CIs where source_ci or target_ci reference deleted/retired apps
- Agent records with no matching server CI

**diagnose():**
- Interface orphan: parent Integration was merged or deleted without cleanup
- Integration with no Interfaces: created manually but never observed by Pathfinder
- Dangling reference: referenced application was decommissioned

**recommend():**
- Reassign orphan Interfaces to correct parent (if identifiable by port/IP match)
- Flag empty Integrations for review
- Retire Integrations with dangling references

---

### 3.3 Stale Record Reaper

**Purpose:** Identify CIs that haven't been observed recently and may no longer be active.

**observe():**
- Integration CIs where `last_observed` > 90 days ago
- Interface CIs where `last_observed` > 90 days ago
- Agent records where `last_heartbeat` > 7 days ago

**Staleness tiers:**
| Days Since Observed | Tier | Action |
|---------------------|------|--------|
| 90–180 | Warning | Flag for review |
| 180–365 | Stale | Recommend retirement |
| >365 | Expired | Auto-retire (at autonomy ≥2) |

**diagnose():**
- Check if the source/target applications are still active
- Check if the agent for this network segment is still running
- Distinguish "integration stopped" vs "agent lost coverage"

---

### 3.4 Relationship Validator

**Purpose:** Verify structural integrity of CI relationships.

**observe():**
- Integration CIs where source_ci == target_ci (self-reference)
- Integration CIs where source_ci or target_ci is not type `cmdb_ci_appl` or `cmdb_ci_service`
- Interface CIs where port is 0 or null
- Circular relationships: A→B and B→A with same type (may be valid but worth flagging)

**diagnose():**
- Self-reference: data entry error or misclassified loopback traffic
- Wrong CI type: agent reported IP-level flows but IP wasn't resolved to an application

**recommend():**
- Self-references: delete or reassign
- Wrong CI type: attempt to resolve the IP to the correct application CI

---

### 3.5 Classification Auditor

**Purpose:** Verify that Gateway's automated classifications are accurate.

**observe():**
- Integration CIs where classification doesn't match port/protocol evidence
  - e.g., port 5432 classified as "API" instead of "Database"
- Interface CIs where protocol field contradicts port
- Low-confidence classifications (< 0.6) that were auto-created

**diagnose():**
- Use Shared AI Engine to evaluate: given the port, protocol, process_name, and byte patterns, does the classification make sense?
- Compare against the classification rules in doc 01 §4

**recommend():**
- Reclassify with corrected type
- Lower confidence threshold for the specific rule that misfired
- Flag for human review if AI is uncertain

---

### 3.6 Compliance Checker

**Purpose:** Ensure all CIs meet governance requirements.

**observe():**
- Integration CIs missing required fields: owner, support_group, criticality, data_classification
- Integration CIs with health_status = "Unknown" for > 7 days
- Integration CIs with ea_status = "Unmapped" for > 30 days
- Interface CIs missing pattern or data_format

**diagnose():**
- New discovery: fields not yet populated (grace period: 7 days)
- Governance gap: CI exists > 7 days without required fields

**recommend():**
- Auto-populate from templates (if application CI has default values)
- Assign to application owner for review
- Escalate to EA team if ea_status unmapped > 60 days

---

### 3.7 Health Scorer

**Purpose:** Continuously update health scores using the Integration Intelligence engine.

**observe():**
- Integration CIs where health_score is null or stale (> 24h since computation)
- Integration CIs with health_status = "Unknown"

**diagnose():**
- No health data: agent may not be reporting, or Gateway sync is delayed
- Stale score: scoring job may have failed

**recommend():**
- Trigger health score recomputation via Integration Intelligence API
- If no telemetry exists, recommend agent deployment to source/target servers

**Note:** This agent delegates to Integration Intelligence's health_scorer service. It's the bridge between the intelligence product and the agentic framework.

---

### 3.8 Remediation Orchestrator

**Purpose:** Meta-agent that coordinates remediation across all other agents' findings.

**observe():**
- Aggregate all open recommendations from agents 3.1–3.7
- Identify conflicts (e.g., Duplicate Detector wants to merge CI that Stale Reaper wants to retire)
- Prioritize by severity and blast radius

**diagnose():**
- Conflict resolution: which recommendation should take priority?
- Dependency analysis: does Action A need to complete before Action B?

**recommend():**
- Create an ordered remediation plan
- Group related actions into a single Change Request
- Estimate blast radius and risk for the plan

**act():**
- Submit the remediation plan as a SN Change Request
- Track progress as individual actions complete
- Report completion status

---

## 4. Scheduling & Orchestration

### 4.1 Run Schedule

| Agent | Default Schedule | Max Duration |
|-------|-----------------|--------------|
| Duplicate Detector | Daily 02:00 UTC | 30 min |
| Orphan Finder | Daily 02:30 UTC | 15 min |
| Stale Record Reaper | Daily 03:00 UTC | 15 min |
| Relationship Validator | Weekly Sun 04:00 UTC | 30 min |
| Classification Auditor | Daily 04:00 UTC | 20 min |
| Compliance Checker | Daily 05:00 UTC | 20 min |
| Health Scorer | Every 4 hours | 30 min |
| Remediation Orchestrator | Daily 06:00 UTC (after all others) | 30 min |

### 4.2 Orchestration Flow

```
┌──────────────┐
│   Scheduler   │
│  (cron-like)  │
└──────┬───────┘
       │ triggers
       ▼
┌──────────────┐     ┌──────────────┐
│  Agent Run   │────►│ Shared AI    │
│  Instance    │     │ Engine       │
└──────┬───────┘     └──────────────┘
       │ results
       ▼
┌──────────────┐     ┌──────────────┐
│  ServiceNow  │◄────│ Remediation  │
│  (findings,  │     │ Orchestrator │
│  CRs, CIs)  │     └──────────────┘
└──────────────┘
```

### 4.3 Observability

Each agent run produces:
- **Run log:** Start time, duration, findings count, actions taken, errors
- **Metrics:** Exported to Prometheus-compatible endpoint at `/metrics`
  - `cmdb_ops_agent_run_duration_seconds{agent="duplicate_detector"}`
  - `cmdb_ops_agent_findings_total{agent="...", severity="..."}`
  - `cmdb_ops_agent_actions_total{agent="...", status="success|failed"}`

---

## 5. ServiceNow Integration

### 5.1 Tables Used by CMDB Ops

| Table | Usage |
|-------|-------|
| `x_avnth_cmdb_ci_integration` | Primary target for all agents |
| `x_avnth_cmdb_ci_interface` | Orphan/relationship/classification checks |
| `x_avnth_pathfinder_agent` | Stale agent detection |
| `x_avnth_integration_ea_map` | Compliance (EA mapping) checks |
| `change_request` | Create CRs for Level 2+ actions |
| `task` | Track remediation tasks |

### 5.2 REST API Calls

```
GET  /api/x_avnth/pathfinder/v1/integrations?sysparm_query=...
GET  /api/x_avnth/pathfinder/v1/integrations/{sys_id}/interfaces
POST /api/x_avnth/pathfinder/v1/integrations/{sys_id}
POST /api/now/table/change_request
```

---

## 6. Configuration

```yaml
cmdb_ops:
  enabled: true
  global_autonomy_level: 1          # Override per-agent below
  blast_radius_limit: 50
  cooldown_hours: 24
  exclusion_tag: x_avnth_ops_exclude

  agents:
    duplicate_detector:
      enabled: true
      autonomy_level: 1
      schedule: "0 2 * * *"
      fuzzy_match_threshold: 0.8

    orphan_finder:
      enabled: true
      autonomy_level: 1
      schedule: "30 2 * * *"

    stale_record_reaper:
      enabled: true
      autonomy_level: 2
      schedule: "0 3 * * *"
      warning_days: 90
      stale_days: 180
      expired_days: 365

    relationship_validator:
      enabled: true
      autonomy_level: 1
      schedule: "0 4 * * 0"

    classification_auditor:
      enabled: true
      autonomy_level: 1
      schedule: "0 4 * * *"

    compliance_checker:
      enabled: true
      autonomy_level: 1
      schedule: "0 5 * * *"
      grace_period_days: 7
      ea_escalation_days: 60

    health_scorer:
      enabled: true
      autonomy_level: 2
      schedule: "0 */4 * * *"

    remediation_orchestrator:
      enabled: true
      autonomy_level: 1
      schedule: "0 6 * * *"
```
