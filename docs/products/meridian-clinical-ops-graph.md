# Meridian — Clinical Operations Graph

**Product Specification v1.0**
**Date:** 2026-03-31
**Status:** Draft
**Owner:** Avennorth Product Team

> *"Where clinical data converges."*

---

## 1. Product Overview

### 1.1 Identity

| Field | Value |
|-------|-------|
| **Name** | Meridian |
| **Type** | Pathfinder intelligence module (add-on) |
| **Tagline** | "Where clinical data converges" |
| **Category** | Clinical Operations Intelligence |
| **Deployment** | Python FastAPI service (`src/intelligence/meridian/`) |

### 1.2 Prerequisites

Meridian requires the following Avennorth components:

| Requirement | Purpose |
|-------------|---------|
| **Pathfinder Base** (Standard or Professional) | Device discovery data in ServiceNow CMDB |
| **Pathfinder Clinical** | Clinical device classification, biomedical equipment CI extensions |
| **UKG Pro integration** | Workforce data: staff rosters, shift schedules, certifications |

### 1.3 Pricing

| Metric | Range |
|--------|-------|
| Per facility, per month | $10,000 - $20,000 |
| Per facility, per year | $120,000 - $240,000 |
| Pricing factors | Facility bed count, device fleet size, number of integrated UKG tenants |

Pricing is additive to the Pathfinder base subscription. A 500-bed hospital system with 3 facilities at mid-tier pricing ($15K/facility/month) generates $540K ARR from Meridian alone.

### 1.4 Strategic Position

**Why this is uncontested:** ServiceNow does not own UKG workforce data. Armis does not own UKG workforce data. Neither vendor has the structural incentive or the data access to build a device-to-clinician graph. ServiceNow + Armis together can map devices to the network; Meridian maps devices to the people who operate them, the shifts those people work, and the certifications that authorize them.

This is not a feature gap. It is a structural impossibility for the incumbent stack.

### 1.5 Discovery Agnosticism

Meridian does not require Pathfinder agents as the device discovery source. The Discovery Normalization Layer accepts device data from:

- **Pathfinder eBPF agents** (native)
- **Armis** (via ServiceNow integration or direct API)
- **ServiceNow Discovery / Service Graph Connectors**
- **Any CMDB-resident device CI** regardless of discovery source

The graph correlates *workforce data with device data*. The source of the device data is irrelevant.

---

## 2. The Clinical Operations Graph

Meridian constructs a property graph that connects clinical devices, staff, departments, workflows, and certifications into a queryable structure.

### 2.1 Node Types

| Node Type | Source | Description |
|-----------|--------|-------------|
| **Device** | ServiceNow CMDB (`cmdb_ci_medical_device`, `cmdb_ci`) | Clinical equipment: infusion pumps, CT scanners, ventilators, monitors |
| **Staff** | UKG Pro via `sys_user` mapping | Clinicians, technicians, biomedical engineers, nursing staff |
| **Department** | UKG Pro via `cmn_department` mapping | Organizational units: Radiology, Cardiac ICU, Emergency, OR |
| **Care Area** | ServiceNow location + department composite | Physical zone: Building A Floor 3 Cardiac ICU |
| **Clinical Workflow** | `x_avnth_clinical_workflow` | Procedure definitions with device and staff requirements |
| **Procedure** | Clinical workflow instances | Scheduled or recurring procedure executions |
| **Certification** | UKG Pro certifications API | Training records, equipment authorizations, license credentials |

### 2.2 Edge Types

| Edge | From | To | Properties |
|------|------|----|------------|
| `certified_on` | Staff | Device (type) | `certification_id`, `issued_date`, `expiry_date`, `competency_level` (novice/proficient/expert), `issuing_authority` |
| `assigned_to` | Device | Department | `assignment_type` (permanent/float/shared), `priority` (primary/backup) |
| `supports_workflow` | Device | Clinical Workflow | `role` (primary/auxiliary/monitoring), `required` (boolean) |
| `backup_for` | Device | Device | `equivalence_class`, `location_proximity`, `switch_time_minutes` |
| `located_in` | Device / Staff | Care Area | `assignment_type` (permanent/shift-based/float), `effective_date` |
| `scheduled_for` | Staff | Procedure | `shift_id`, `role` (primary_operator/assistant/supervisor), `start_time`, `end_time` |
| `maintains` | Staff | Device (type) | `service_level` (preventive/corrective/calibration), `vendor_certified` (boolean) |
| `supervises` | Staff | Staff | `scope` (clinical/administrative), `delegation_level` |

### 2.3 Graph Storage

The graph is maintained in two tiers:

1. **ServiceNow relational tables** — Source of record for all node and edge data. Standard ServiceNow GlideRecord access for business rules, flows, and dashboards.
2. **In-memory graph (Python NetworkX / igraph)** — Built on service startup from ServiceNow data. Used for path queries, impact analysis, and optimization algorithms. Refreshed on sync cycle.

### 2.4 Example Graph Fragment

```
[CT Scanner 3] ──certified_on──▶ [Dr. Sarah Chen]
       │                              │
       │                              ├──scheduled_for──▶ [Chest CT, Tue 2pm]
       │                              │
       ├──assigned_to──▶ [Radiology]  ├──located_in──▶ [Building A, Radiology]
       │                              │
       ├──supports_workflow──▶ [CT Diagnostic Imaging]
       │
       ├──backup_for──▶ [CT Scanner 1]
       │                      │
       │                      └──certified_on──▶ [Dr. Sarah Chen]
       │                      └──certified_on──▶ [Tech. James Polk]
       │
       └──located_in──▶ [Building A, Radiology Suite 2]
```

---

## 3. UKG Pro Integration

### 3.1 Authentication

Meridian authenticates to UKG Pro using OAuth2 client credentials flow.

**Token Request:**

```http
POST https://{ukg_host}/auth/oauth/v2/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id={PF_UKG_CLIENT_ID}
&client_secret={PF_UKG_CLIENT_SECRET}
&scope=personnel.read timekeeping.read
```

**Token Response:**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "personnel.read timekeeping.read"
}
```

Tokens are cached and refreshed 5 minutes before expiry. All API calls include:

```http
Authorization: Bearer {access_token}
Us-Customer-Api-Key: {PF_UKG_API_KEY}
```

### 3.2 Endpoints Consumed

#### 3.2.1 Employee Roster

```http
GET https://{ukg_host}/personnel/v1/employees
  ?status=active
  &per_page=250
  &page={page}
```

**Response (abbreviated):**

```json
{
  "employees": [
    {
      "employee_id": "EMP-004821",
      "first_name": "Sarah",
      "last_name": "Chen",
      "job_title": "Diagnostic Radiologist",
      "department": {
        "id": "DEPT-RAD-001",
        "name": "Radiology"
      },
      "location": {
        "id": "LOC-BLD-A",
        "name": "Building A"
      },
      "hire_date": "2019-03-15",
      "email": "sarah.chen@example-health.org",
      "employee_status": "active"
    }
  ],
  "pagination": {
    "total_records": 2847,
    "page": 1,
    "per_page": 250,
    "total_pages": 12
  }
}
```

**Sync frequency:** Daily at 02:00 local facility time.

#### 3.2.2 Shift Schedules

```http
GET https://{ukg_host}/timekeeping/v1/schedules
  ?start_date={today}
  &end_date={today+7}
  &department_id={dept_id}
  &per_page=500
```

**Response (abbreviated):**

```json
{
  "schedules": [
    {
      "employee_id": "EMP-004821",
      "schedule_date": "2026-04-01",
      "shift": {
        "start_time": "07:00",
        "end_time": "19:00",
        "shift_code": "DAY-12"
      },
      "department_id": "DEPT-RAD-001",
      "location_id": "LOC-BLD-A",
      "schedule_status": "confirmed"
    }
  ]
}
```

**Sync frequency:** Every 15 minutes during operating hours (06:00-22:00 local), hourly overnight.

#### 3.2.3 Certifications

```http
GET https://{ukg_host}/personnel/v1/certifications
  ?employee_id={emp_id}
  &status=active,expiring
```

**Response (abbreviated):**

```json
{
  "certifications": [
    {
      "certification_id": "CERT-2024-08421",
      "employee_id": "EMP-004821",
      "certification_name": "CT Scanner Operation — GE Revolution",
      "certification_type": "equipment_operation",
      "issued_date": "2024-06-15",
      "expiry_date": "2026-06-15",
      "competency_level": "expert",
      "issuing_authority": "GE Healthcare Training",
      "status": "active"
    },
    {
      "certification_id": "CERT-2024-08422",
      "employee_id": "EMP-004821",
      "certification_name": "MRI Safety Officer",
      "certification_type": "safety",
      "issued_date": "2025-01-10",
      "expiry_date": "2027-01-10",
      "competency_level": "proficient",
      "issuing_authority": "ABMRS",
      "status": "active"
    }
  ]
}
```

**Sync frequency:** Daily at 03:00 local facility time.

#### 3.2.4 Credentials

```http
GET https://{ukg_host}/personnel/v1/credentials
  ?employee_id={emp_id}
```

**Response (abbreviated):**

```json
{
  "credentials": [
    {
      "credential_id": "CRED-00291",
      "employee_id": "EMP-004821",
      "credential_type": "medical_license",
      "credential_number": "MD-2019-48210",
      "state": "VA",
      "expiry_date": "2027-12-31",
      "status": "active"
    }
  ]
}
```

**Sync frequency:** Daily at 03:00 local facility time (batched with certifications).

#### 3.2.5 Organization Levels

```http
GET https://{ukg_host}/common/v1/org-levels
  ?type=department
```

**Response (abbreviated):**

```json
{
  "org_levels": [
    {
      "id": "DEPT-RAD-001",
      "name": "Radiology",
      "parent_id": "DIV-DIAG-001",
      "parent_name": "Diagnostic Services",
      "level": 3,
      "location_id": "LOC-BLD-A"
    }
  ]
}
```

**Sync frequency:** Daily at 02:00 local facility time (batched with roster).

### 3.3 Data Mapping

| UKG Entity | ServiceNow Target | Matching Strategy |
|------------|-------------------|-------------------|
| Employee | `sys_user` | Email address (primary), employee ID (secondary) |
| Department | `cmn_department` | Department name + location composite key |
| Location | `cmn_location` | Location code or name fuzzy match, confirmed during onboarding |
| Certification | `x_avnth_workforce_mapping` | New record per employee-device-certification triple |
| Schedule | In-memory graph + `x_avnth_workforce_mapping.current_shift` | Ephemeral — not persisted as individual SN records |

### 3.4 Error Handling

| Scenario | Behavior |
|----------|----------|
| UKG API returns 401 | Re-authenticate. If token refresh fails, alert and fall back to cached data. |
| UKG API returns 429 (rate limit) | Exponential backoff: 1s, 2s, 4s, 8s, max 60s. Log rate limit headers. |
| UKG API returns 5xx | Retry 3 times with backoff. If all fail, use cached data and set `ukg_data_stale=true` on all affected graph nodes. |
| UKG API unreachable | Use cached data. Set staleness flag. Alert after 30 minutes of continuous failure. |
| Schedule data older than 30 minutes | Flag as stale in all query responses. Dashboard shows amber "Schedule data delayed" indicator. |
| Roster data older than 48 hours | Flag as stale. Suppress certification-dependent recommendations. Alert facility admin. |

### 3.5 Environment Variables

| Variable | Description |
|----------|-------------|
| `PF_UKG_HOST` | UKG Pro API hostname |
| `PF_UKG_CLIENT_ID` | OAuth2 client ID |
| `PF_UKG_CLIENT_SECRET` | OAuth2 client secret |
| `PF_UKG_API_KEY` | Customer API key |
| `PF_UKG_SYNC_SCHEDULE_INTERVAL` | Schedule sync interval in minutes (default: 15) |
| `PF_UKG_SYNC_CERT_CRON` | Certification sync cron expression (default: `0 3 * * *`) |
| `PF_UKG_SYNC_ROSTER_CRON` | Roster sync cron expression (default: `0 2 * * *`) |

---

## 4. Core Capabilities

### 4.1 Device-to-Clinician Mapping

**Problem:** A hospital has 3,000 clinical devices and 2,400 clinical staff. No single system knows which staff members are certified to operate which equipment. Certification records live in UKG. Device inventories live in ServiceNow (or Armis). The mapping between them exists only in spreadsheets, if at all.

**What Meridian does:**

1. **Builds the certification graph.** Maps UKG certification records to device types in the CMDB. A certification for "GE Revolution CT Scanner Operation" links to all GE Revolution CT Scanner CIs in the CMDB.

2. **Tracks certification expiry.** Alerts fire at 90, 60, and 30 days before expiry. Escalation:
   - 90 days: informational notification to staff member and department manager
   - 60 days: task created in ServiceNow assigned to department manager
   - 30 days: high-priority alert to clinical operations and biomedical engineering

3. **Identifies cross-training gaps.** For every device on every shift, Meridian calculates the *certified operator depth*:
   - **Red:** 0 certified operators scheduled on a shift (compliance risk)
   - **Amber:** 1 certified operator scheduled (single point of failure)
   - **Green:** 2+ certified operators scheduled

**Example query and response:**

```http
POST /api/v1/meridian/query
Content-Type: application/json

{
  "query_type": "cross_training_gaps",
  "filters": {
    "department": "Radiology",
    "shift": "current",
    "min_severity": "amber"
  }
}
```

```json
{
  "gaps": [
    {
      "device_type": "GE Revolution CT Scanner",
      "device_instances": ["CT-003", "CT-007"],
      "care_area": "Building A, Radiology Suite 2",
      "current_shift": {
        "start": "2026-04-01T07:00:00",
        "end": "2026-04-01T19:00:00"
      },
      "certified_operators_on_shift": [
        {
          "employee_id": "EMP-004821",
          "name": "Dr. Sarah Chen",
          "competency_level": "expert",
          "certification_expiry": "2026-06-15"
        }
      ],
      "severity": "amber",
      "reason": "Single certified operator for 2 device instances on current shift",
      "recommendation": "Schedule cross-training for CT operation. Nearest qualified float: Tech. James Polk (Building B, next on shift 2026-04-02 07:00)."
    }
  ],
  "summary": {
    "total_gaps": 1,
    "red": 0,
    "amber": 1,
    "department": "Radiology",
    "shift": "DAY-12 (07:00-19:00)"
  }
}
```

### 4.2 Schedule-Aware Impact Analysis

**Problem:** When a clinical device goes offline — planned or unplanned — the immediate question is: *Who and what is affected?* Answering this today requires a phone tree: check the procedure schedule (EHR), check the staffing schedule (UKG), check device inventory (CMDB), check for backup equipment (facilities). This takes 30-60 minutes and involves 4-6 people.

**What Meridian does:**

Given a device and a time window, Meridian traverses the graph to calculate the full impact:

1. **Affected procedures** — Scheduled workflows that require this device
2. **Affected staff** — Operators assigned to those procedures
3. **Backup equipment** — Devices in the same equivalence class with available capacity
4. **Available operators** — Staff certified on backup equipment AND on shift at the affected time
5. **Mitigation plan** — Ranked options with estimated switch time and staffing feasibility

**Example query and response:**

```http
POST /api/v1/meridian/impact
Content-Type: application/json

{
  "device_ci": "CT-003",
  "offline_start": "2026-04-01T14:00:00",
  "offline_end": "2026-04-01T18:00:00",
  "include_mitigation": true
}
```

```json
{
  "device": {
    "ci_id": "CT-003",
    "name": "CT Scanner 3",
    "type": "GE Revolution CT Scanner",
    "location": "Building A, Radiology Suite 2"
  },
  "time_window": {
    "start": "2026-04-01T14:00:00",
    "end": "2026-04-01T18:00:00"
  },
  "affected_procedures": [
    {
      "procedure": "Chest CT with Contrast",
      "scheduled_time": "2026-04-01T14:30:00",
      "duration_minutes": 45,
      "assigned_operator": {
        "employee_id": "EMP-004821",
        "name": "Dr. Sarah Chen"
      }
    },
    {
      "procedure": "Abdominal CT",
      "scheduled_time": "2026-04-01T16:00:00",
      "duration_minutes": 60,
      "assigned_operator": {
        "employee_id": "EMP-004821",
        "name": "Dr. Sarah Chen"
      }
    }
  ],
  "affected_staff": [
    {
      "employee_id": "EMP-004821",
      "name": "Dr. Sarah Chen",
      "role": "primary_operator",
      "shift_end": "2026-04-01T19:00:00"
    }
  ],
  "backup_equipment": [
    {
      "ci_id": "CT-001",
      "name": "CT Scanner 1",
      "type": "GE Revolution CT Scanner",
      "location": "Building A, Radiology Suite 1",
      "status": "operational",
      "current_utilization": "60%",
      "available_slots": ["14:30-15:15", "16:00-17:00"],
      "switch_time_minutes": 5
    },
    {
      "ci_id": "CT-005",
      "name": "CT Scanner 5",
      "type": "Siemens SOMATOM Force",
      "location": "Building B, Radiology",
      "status": "operational",
      "current_utilization": "40%",
      "available_slots": ["14:00-18:00"],
      "switch_time_minutes": 15
    }
  ],
  "certified_operators_on_shift": [
    {
      "employee_id": "EMP-004821",
      "name": "Dr. Sarah Chen",
      "certified_on": ["CT-001", "CT-003"],
      "competency_level": "expert",
      "currently_assigned": true
    },
    {
      "employee_id": "EMP-003107",
      "name": "Tech. James Polk",
      "certified_on": ["CT-001", "CT-005"],
      "competency_level": "proficient",
      "currently_assigned": false
    }
  ],
  "mitigation_options": [
    {
      "rank": 1,
      "action": "Relocate procedures to CT Scanner 1",
      "feasibility": "high",
      "operator": "Dr. Sarah Chen (already assigned, certified on CT-001)",
      "switch_time_minutes": 5,
      "notes": "Same building, same floor. Minimal patient disruption."
    },
    {
      "rank": 2,
      "action": "Relocate procedures to CT Scanner 5",
      "feasibility": "medium",
      "operator": "Tech. James Polk (available, certified on CT-005)",
      "switch_time_minutes": 15,
      "notes": "Different building. Requires patient transport. Polk is proficient, not expert."
    }
  ],
  "impact_score": 72,
  "impact_summary": "2 scheduled procedures affected. 1 staff member impacted. High-feasibility mitigation available via CT Scanner 1 with zero operator change."
}
```

### 4.3 Maintenance Window Optimization

**Problem:** Scheduling maintenance for clinical equipment is a negotiation between biomedical engineering, clinical operations, and vendor service teams. The optimal window must satisfy: fewest affected procedures, backup equipment available, certified maintenance staff on shift, and vendor service rep available.

**What Meridian does:**

For a given device and maintenance duration, Meridian scores every possible window over the next N days:

```http
POST /api/v1/meridian/maintenance/optimize
Content-Type: application/json

{
  "device_ci": "CT-003",
  "maintenance_duration_hours": 4,
  "search_window_days": 14,
  "constraints": {
    "require_certified_maintainer_on_shift": true,
    "require_backup_equipment_available": true,
    "exclude_hours": ["06:00-08:00", "17:00-19:00"]
  }
}
```

```json
{
  "recommended_windows": [
    {
      "rank": 1,
      "start": "2026-04-06T22:00:00",
      "end": "2026-04-07T02:00:00",
      "impact_score": 8,
      "details": {
        "affected_procedures": 0,
        "affected_staff": 0,
        "backup_available": true,
        "backup_device": "CT-001",
        "certified_maintainer_on_shift": {
          "employee_id": "EMP-007832",
          "name": "Eng. Maria Santos",
          "certification": "GE CT Preventive Maintenance Level III"
        }
      },
      "day_of_week": "Sunday",
      "notes": "Overnight window. Zero procedure impact. Certified maintainer on night shift."
    },
    {
      "rank": 2,
      "start": "2026-04-08T12:00:00",
      "end": "2026-04-08T16:00:00",
      "impact_score": 23,
      "details": {
        "affected_procedures": 1,
        "affected_staff": 1,
        "backup_available": true,
        "backup_device": "CT-001",
        "certified_maintainer_on_shift": {
          "employee_id": "EMP-007832",
          "name": "Eng. Maria Santos",
          "certification": "GE CT Preventive Maintenance Level III"
        }
      },
      "day_of_week": "Wednesday",
      "notes": "Lunch window. 1 reschedulable procedure. Maintainer available on day shift."
    }
  ],
  "scoring_weights": {
    "affected_procedures": 0.35,
    "affected_staff_count": 0.20,
    "backup_availability": 0.20,
    "maintainer_availability": 0.15,
    "time_of_day_preference": 0.10
  }
}
```

**Impact score formula:** 0 (no impact) to 100 (maximum disruption). Weights are configurable per facility.

### 4.4 Cross-Platform Search

Meridian exposes a natural language query interface that searches across the unified graph.

```http
POST /api/v1/meridian/search
Content-Type: application/json

{
  "query": "Show all ventilators in Cardiac ICU with certified operators on current shift",
  "facility_id": "FAC-001"
}
```

```json
{
  "query_interpreted": {
    "device_type": "ventilator",
    "location": "Cardiac ICU",
    "join": "certified_operators",
    "time_filter": "current_shift"
  },
  "results": [
    {
      "device": {
        "ci_id": "VENT-012",
        "name": "Ventilator 12",
        "type": "Draeger Evita V800",
        "status": "operational",
        "location": "Cardiac ICU, Bay 3"
      },
      "certified_operators_on_shift": [
        {
          "name": "RN Lisa Martinez",
          "competency_level": "expert",
          "shift_end": "2026-04-01T19:00:00"
        },
        {
          "name": "RT David Kim",
          "competency_level": "proficient",
          "shift_end": "2026-04-01T19:00:00"
        }
      ]
    },
    {
      "device": {
        "ci_id": "VENT-014",
        "name": "Ventilator 14",
        "type": "Draeger Evita V800",
        "status": "operational",
        "location": "Cardiac ICU, Bay 7"
      },
      "certified_operators_on_shift": [
        {
          "name": "RN Lisa Martinez",
          "competency_level": "expert",
          "shift_end": "2026-04-01T19:00:00"
        }
      ]
    }
  ],
  "result_count": 2,
  "data_freshness": {
    "device_data": "2026-04-01T13:45:00 (live)",
    "schedule_data": "2026-04-01T13:30:00 (15 min ago)",
    "certification_data": "2026-04-01T03:00:00 (daily sync)"
  }
}
```

**Additional example queries:**

| Natural Language Query | Graph Traversal |
|----------------------|-----------------|
| "Which infusion pumps in Building A have certifications expiring in 30 days?" | Device(type=infusion_pump, location=Building A) -> certified_on(expiry < now+30d) -> Staff |
| "Find all devices maintained by GE Healthcare with scheduled procedures tomorrow" | Device(vendor=GE Healthcare) -> supports_workflow -> Procedure(date=tomorrow) |
| "Who can operate the backup MRI if MRI-002 goes down right now?" | Device(MRI-002) -> backup_for -> Device -> certified_on -> Staff(on_shift=true) |
| "Show departments with the most certification gaps this week" | Department -> Staff -> certified_on(expiry < now+7d) GROUP BY department ORDER BY gap_count DESC |

The natural language layer uses the Shared AI Engine (Claude) for query interpretation. Parsed queries execute as deterministic graph traversals — the LLM interprets intent, it does not generate answers.

### 4.5 Clinical Operations Dashboard

Meridian provides a ServiceNow Polaris workspace page as the primary operational interface.

**Workspace:** `x_avnth_meridian_workspace`
**URL path:** `/now/workspace/meridian`

#### Dashboard Panels

| Panel | Content | Refresh |
|-------|---------|---------|
| **Device Fleet Status** | Operational/degraded/offline counts by device type and care area. Heat map by location. | Real-time (ServiceNow event-driven) |
| **Staffing Coverage** | Certified operator depth per device type per shift. Red/amber/green indicators. | Every 15 minutes (schedule sync) |
| **Certification Gaps** | Expiring certifications by department, severity, and timeline. Drill-down to individual staff. | Daily |
| **Maintenance Windows** | Next 14 days of recommended maintenance windows with impact scores. Accept/reject/reschedule actions. | On demand + daily recalculation |
| **Active Alerts** | Cross-training gaps on current shift, stale data warnings, certification expirations. | Real-time |
| **Impact Simulator** | Interactive: select a device, set a time window, see the full impact analysis inline. | On demand |

**Filters (persistent across panels):**

- Facility
- Department
- Care Area (building/floor/zone)
- Device Tier (critical/standard/auxiliary)
- Time Window (current shift / next shift / custom)

---

## 5. Data Model

### 5.1 ServiceNow Tables

#### `x_avnth_workforce_mapping`

Links staff to device types with certification context.

| Field | Type | Description |
|-------|------|-------------|
| `sys_id` | GUID | Primary key |
| `staff` | Reference (`sys_user`) | Certified staff member |
| `device_type` | String (256) | Normalized device type key (e.g., `ge_revolution_ct`) |
| `device_model_id` | Reference (`cmdb_model`) | CMDB hardware model reference |
| `certification_id` | String (64) | UKG certification record ID |
| `competency_level` | Choice | `novice`, `proficient`, `expert` |
| `issued_date` | Date | Certification issue date |
| `expiry_date` | Date | Certification expiry date |
| `issuing_authority` | String (256) | Training provider or vendor |
| `status` | Choice | `active`, `expiring_soon`, `expired`, `revoked` |
| `ukg_last_sync` | DateTime | Last successful sync from UKG |
| `department` | Reference (`cmn_department`) | Staff department at time of certification |

#### `x_avnth_clinical_workflow`

Procedure definitions with device and staff requirements.

| Field | Type | Description |
|-------|------|-------------|
| `sys_id` | GUID | Primary key |
| `name` | String (256) | Workflow name (e.g., "CT with Contrast — Chest") |
| `workflow_type` | Choice | `diagnostic`, `therapeutic`, `monitoring`, `surgical_support` |
| `primary_device_type` | String (256) | Required primary device type |
| `auxiliary_device_types` | String (1024) | Comma-separated auxiliary device types |
| `min_operator_competency` | Choice | Minimum `competency_level` for primary operator |
| `staff_roles_required` | JSON | Array of `{ role, certification_type, count }` |
| `avg_duration_minutes` | Integer | Typical procedure duration |
| `department` | Reference (`cmn_department`) | Owning department |
| `active` | Boolean | Whether workflow is currently in use |

#### `x_avnth_maintenance_window`

Optimized maintenance windows with impact assessments.

| Field | Type | Description |
|-------|------|-------------|
| `sys_id` | GUID | Primary key |
| `device_ci` | Reference (`cmdb_ci`) | Target device |
| `window_start` | DateTime | Recommended start time |
| `window_end` | DateTime | Recommended end time |
| `impact_score` | Integer (0-100) | Calculated impact score |
| `affected_procedure_count` | Integer | Number of affected scheduled procedures |
| `affected_staff_count` | Integer | Number of affected staff members |
| `backup_device` | Reference (`cmdb_ci`) | Recommended backup device |
| `certified_maintainer` | Reference (`sys_user`) | Available certified maintenance staff |
| `status` | Choice | `recommended`, `accepted`, `rejected`, `completed`, `expired` |
| `generated_date` | DateTime | When this recommendation was generated |
| `accepted_by` | Reference (`sys_user`) | Who approved the window |

#### `x_avnth_meridian_query_log`

Audit trail and saved queries for the cross-platform search.

| Field | Type | Description |
|-------|------|-------------|
| `sys_id` | GUID | Primary key |
| `query_text` | String (4096) | Original natural language query |
| `parsed_query` | JSON | Structured interpretation of the query |
| `result_count` | Integer | Number of results returned |
| `execution_time_ms` | Integer | Query execution time |
| `queried_by` | Reference (`sys_user`) | User who ran the query |
| `facility` | Reference (`cmn_location`) | Facility context |
| `saved` | Boolean | Whether user saved this query |
| `saved_name` | String (256) | User-assigned name for saved query |

### 5.2 Table Relationships

```
sys_user ◀── x_avnth_workforce_mapping ──▶ cmdb_model
                      │
                      ▼
              cmn_department

cmdb_ci ◀── x_avnth_maintenance_window ──▶ sys_user (maintainer)
                      │
                      ▼
              cmdb_ci (backup)

x_avnth_clinical_workflow ──▶ cmn_department
```

---

## 6. General-Purpose Extraction

The Meridian correlation engine — mapping workforce data to equipment data via certification and scheduling graphs — is not intrinsically healthcare-specific. The core pattern is:

> **Regulated equipment** + **Certified operators** + **Shift-based staffing** = Meridian

### 6.1 Future Vertical Packs

| Vertical | Equipment Source | Workforce Source | Use Cases |
|----------|-----------------|-----------------|-----------|
| **Manufacturing** | SCADA/MES device CIs in CMDB | UKG Pro / Kronos | Machine operator certification tracking, shift-aware production line impact analysis, maintenance window optimization around production schedules |
| **Utilities** | Substation/grid equipment CIs | UKG Pro / custom HR | Field technician certification tracking, on-call rotation aware dispatching, regulatory compliance for equipment operation |
| **Oil & Gas** | Wellhead/pipeline monitoring CIs | UKG Pro / SAP SuccessFactors | Safety certification tracking (H2S, confined space), crew rotation-aware equipment assignments, regulatory audit support |
| **Higher Education** | Lab equipment / research instruments | UKG Pro / Workday | Researcher access certifications (biosafety, radiation), equipment scheduling around academic calendar, shared instrument management |
| **Data Centers** | Server/network/power infrastructure | UKG Pro / custom | Technician certification (vendor-specific hardware), shift-aware incident response routing, maintenance window optimization around change freezes |

### 6.2 Abstraction Layer

The core engine operates on three abstract concepts:

1. **Asset** — Any CI in the CMDB with an operational status and a location
2. **Operator** — Any `sys_user` with certifications/training records linked to asset types
3. **Schedule** — Shift assignments from any workforce management system

Healthcare is the first vertical because clinical operations have the highest urgency (patient safety), the strictest certification requirements (regulatory), and the largest workforce management gap (no existing integration between device management and staff scheduling).

---

## 7. HIPAA Compliance

### 7.1 What Meridian Processes

| Data Type | Source | PHI? | Handling |
|-----------|--------|------|----------|
| Staff names and schedules | UKG Pro | **No** — workforce data | Stored in ServiceNow `sys_user` and in-memory graph |
| Staff certifications and credentials | UKG Pro | **No** — employment records | Stored in `x_avnth_workforce_mapping` |
| Device operational status | ServiceNow CMDB | **No** — infrastructure data | Standard CMDB CI attributes |
| Device behavioral telemetry | Pathfinder agents | **No** — network flow metadata | Processed by Pathfinder gateway, not Meridian |
| Procedure types and time slots | Clinical scheduling interface | **No** — procedure metadata only | Meridian receives procedure type (e.g., "Chest CT") and time slot, never patient identity |
| Department and location data | UKG Pro + ServiceNow | **No** — organizational data | Standard ServiceNow reference tables |

### 7.2 What Meridian Never Processes

- Patient names, MRNs, or demographic data
- Diagnosis codes or clinical notes
- Treatment plans or physician orders
- Insurance or billing information
- Any data element defined as PHI under 45 CFR 160.103

### 7.3 Architectural Safeguards

1. **No EHR integration.** Meridian does not connect to Epic, Cerner, or any electronic health record system. Procedure schedules are provided as anonymized time-slot blocks (procedure type + time + device + operator), never linked to patient records.

2. **Query constraints.** The natural language search layer is constrained to return device, staff, schedule, and certification context. The query parser rejects any query referencing patient-identifying terms. Rejected queries are logged.

3. **Data residency.** All Meridian data resides within the customer's ServiceNow instance and the Meridian FastAPI service running in the customer's infrastructure (or Avennorth-managed cloud with BAA). No data is transmitted to Avennorth or third parties.

4. **Access controls.** ServiceNow ACLs on all `x_avnth_` tables. Meridian API endpoints require ServiceNow OAuth tokens with `x_avnth_meridian.user` or `x_avnth_meridian.admin` roles.

5. **Audit logging.** All queries logged in `x_avnth_meridian_query_log`. All data sync operations logged with timestamps and record counts.

### 7.4 Compliance Posture

Meridian is designed to operate **outside the PHI boundary**. It processes workforce data and infrastructure data, both of which are non-PHI. This design is intentional: by never ingesting PHI, Meridian avoids triggering HIPAA Security Rule requirements for the data it handles, reducing compliance burden for both Avennorth and the customer.

If a customer requires Meridian to be deployed within a HIPAA-covered environment (e.g., shared infrastructure with PHI-processing systems), Avennorth supports execution of a Business Associate Agreement (BAA) covering the infrastructure layer, even though Meridian itself does not process PHI.

---

## 8. Technical Architecture

### 8.1 Service Deployment

```
src/intelligence/meridian/
├── main.py                    # FastAPI application entry point
├── config/
│   ├── settings.py            # Pydantic settings model
│   └── meridian-dev.yaml      # Development configuration
├── api/
│   ├── routes/
│   │   ├── query.py           # /search, /impact, /maintenance/optimize
│   │   ├── graph.py           # /graph/nodes, /graph/edges, /graph/stats
│   │   └── health.py          # /health, /readiness
│   └── middleware/
│       ├── auth.py            # ServiceNow OAuth token validation
│       └── logging.py         # Request/response audit logging
├── graph/
│   ├── builder.py             # Graph construction from SN + UKG data
│   ├── traversal.py           # Impact analysis, path queries
│   ├── optimizer.py           # Maintenance window scoring
│   └── models.py              # Node and edge Pydantic models
├── integrations/
│   ├── ukg/
│   │   ├── client.py          # UKG Pro API client
│   │   ├── auth.py            # OAuth2 token management
│   │   ├── sync.py            # Scheduled sync orchestrator
│   │   └── mapping.py         # UKG → ServiceNow data mapping
│   └── servicenow/
│       ├── client.py          # ServiceNow REST API client
│       └── tables.py          # Table-specific read/write operations
├── nlp/
│   ├── parser.py              # Natural language → structured query
│   └── constraints.py         # PHI-term rejection, query validation
├── tests/
│   ├── test_graph_builder.py
│   ├── test_impact_analysis.py
│   ├── test_maintenance_optimizer.py
│   ├── test_ukg_sync.py
│   └── test_nlp_parser.py
└── requirements.txt
```

### 8.2 Runtime Dependencies

| Dependency | Purpose |
|------------|---------|
| FastAPI + Uvicorn | HTTP API framework |
| Pydantic v2 | Settings and data model validation |
| NetworkX | In-memory graph storage and traversal |
| httpx | Async HTTP client for UKG Pro and ServiceNow APIs |
| APScheduler | Cron-based sync scheduling |
| anthropic | Claude API client for NLP query parsing (via Shared AI Engine) |

---

*This document is confidential and proprietary to Avennorth. Distribution outside the Avennorth team and authorized partners is prohibited. All product specifications are subject to change.*

*Avennorth Confidential -- v1.0 -- 2026-03-31*
