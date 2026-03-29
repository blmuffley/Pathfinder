# Avennorth Pathfinder — Workspace User Guide

## For Integration Analysts Using the Pathfinder Workspace Daily

### Accessing the Workspace

Navigate to: `https://your-instance.service-now.com/now/x_avnth/pathfinder`

Required role: `x_avnth_pathfinder.viewer` (read-only) or `x_avnth_pathfinder.analyst` (manage)

---

## Overview Page

Your landing page. Shows the health of your entire integration estate at a glance.

**KPI tiles** — Click any tile to navigate to the relevant page.
- Red numbers need attention (Critical integrations, Open gaps)
- Watch "Avg Health" trending — dropping score means degradation

**Health Distribution donut** — Ratio of Healthy / Degraded / Critical integrations. Healthy should be >80%.

**Recently Discovered** — New integrations found by agents. Review to confirm they're real (not scanners or health checks).

---

## Integrations Page

Your primary working view. Split into list (left) and detail (right).

### Finding Integrations

- **Search bar** — Type any part of integration name, source app, or target app
- **Health filter** — Click Healthy / Degraded / Critical to filter
- **Type filter** — Click API / Database / Messaging / etc.
- **Sort** — Click column headers to sort

### Understanding an Integration Record

When you click a row, the detail panel opens with 5 tabs:

**Overview tab:**
- **AI Summary** — Claude-generated natural language description. Click "Refresh" to regenerate with latest data.
- **Classification** — Source, target, type, confidence. Confidence >0.9 = high trust. <0.7 = review manually.
- **Governance** — Owner, support group, criticality, data classification. Amber fields = missing data that needs assignment.

**Interfaces tab:**
- Each interface = one protocol:port combination
- Watch **Error Rate** column — >1% needs investigation
- Watch **P50 latency** — compare to your baseline

**Health tab:**
- 30-day trend chart showing Availability, Latency, Error Rate
- Spikes or drops = anomalies worth investigating

**EA tab:**
- Shows AI-suggested matches to EA relationship records
- **Confirm** matches you agree with (updates EA status to "Mapped")
- **Reject** matches that are wrong

**Activity tab:**
- Timeline of all changes to this integration

### Common Tasks

| Task | How |
|------|-----|
| Assign owner to integration | Open detail → Overview → Governance → click Owner field |
| Set criticality | Open detail → Overview → Governance → Criticality dropdown |
| Refresh AI summary | Open detail → Overview → click "Refresh" button |
| Confirm EA mapping | Open detail → EA tab → click "Confirm" on a suggestion |
| Report false positive | Set integration's operational_status to "Non-Operational" |

---

## Agent Fleet Page

Shows all enrolled Pathfinder agents and their health.

**What to watch:**
- **Stale agents** (amber) — No heartbeat in 5+ minutes. Server may be down or agent crashed.
- **Version column** — All agents should be on the same version. Mixed versions = upgrade needed.
- **Flows column** — An agent with 0 flows after 24 hours needs investigation.

**Decommission an agent:**
- Click the power icon on the agent row
- Confirm in the dialog
- This may create a coverage gap if the server still needs monitoring

---

## Coverage Gaps Page (Kanban)

Triage board for servers that should have agents but don't.

### Lanes

| Lane | Meaning | Your Action |
|------|---------|-------------|
| **Open** | Server needs an agent. No action taken yet. | Create CR or Waive |
| **In Progress** | Change request created. Agent being deployed. | Wait for deployment |
| **Resolved** | Agent deployed and verified. | No action needed |
| **Waived** | Intentionally excluded from coverage. | Review periodically |
| **Failed** | Auto-deploy attempted and failed. | Manual intervention needed |

### Priority Guide

- **Critical** — Production server running critical applications. Fix within 24 hours.
- **High** — Production server with many integrations. Fix within 48 hours.
- **Medium** — Production server, lower risk. Fix within 1 week.
- **Low** — Non-production. Fix when convenient or waive.

### Actions

- **Create CR** — Creates a ServiceNow change request for agent deployment
- **Waive** — Marks the gap as intentionally unmonitored (must provide reason)

---

## EA Reconciliation Page

Two-panel view for matching discovered integrations to Enterprise Architecture records.

### Left Panel: Unmapped Integrations

These are integrations Pathfinder discovered but haven't been linked to EA documentation. Sorted by flow count (highest traffic first = most important to reconcile).

### Right Panel: Match Suggestions

When you click an unmapped integration, the AI shows potential EA matches with confidence scores.

| Confidence | Meaning | Action |
|------------|---------|--------|
| >90% | Very likely correct | Confirm |
| 70-90% | Probable match, review | Confirm or reject after checking |
| 50-70% | Possible, lower certainty | Investigate before deciding |
| <50% | Weak match | Usually reject |

**If no suggestions appear:** Click "Create Manual Mapping" to link to an EA record yourself.

### Goal

Get the "Reconciliation Progress" bar to 100%. This means every discovered integration is linked to EA documentation — or explicitly flagged as new/undocumented.

---

## Health Dashboard

Executive-level view of integration health across your estate.

### Time Range Selector

Toggle between 24h / 7d / 30d views. Use 7d for daily monitoring, 30d for trend analysis.

### What to Watch

- **Health Score Trend** — Declining average = systemic issue
- **Error Rate sparkline** — Spikes = outage or degradation in progress
- **Latency sparkline** — Gradual increase = capacity issue building
- **Attention Required list** — These integrations need investigation now

### Escalation Guide

| Health Score | Status | Action |
|-------------|--------|--------|
| 80-100 | Healthy | No action. Monitor trends. |
| 60-79 | Degraded | Investigate within 24 hours. Check interfaces for error rates. |
| 0-59 | Critical | Escalate immediately. Check AI summary for diagnosis. |

---

## Daily Workflow (Recommended)

| Time | Task | Duration |
|------|------|----------|
| Morning | Check Overview KPIs. Any new Critical? | 2 min |
| Morning | Review Health Dashboard. Any trend changes? | 3 min |
| Morning | Triage Open coverage gaps (Kanban). Create CRs or waive. | 5 min |
| Weekly | Review unmapped integrations in EA Reconciliation. Confirm/reject 10-20 matches. | 15 min |
| Weekly | Review CMDB Ops Agent recommendations (if autonomy level 1). | 10 min |
| Monthly | Check Agent Fleet for stale agents or version drift. | 5 min |
| Monthly | Review overall coverage % and EA reconciliation progress. Report to management. | 10 min |
