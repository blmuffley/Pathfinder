# Ledger — Compliance Automation

**"The compliance record of truth."**

| Field | Value |
|-------|-------|
| Product | Ledger |
| Type | Pathfinder intelligence module (add-on) |
| Requires | Pathfinder Base; Pathfinder Clinical (for healthcare rule packs) |
| Pricing | $5,000 -- $10,000 / facility / month ($60K -- $120K / yr per facility) |
| Deployment | Python FastAPI service (`src/intelligence/ledger/`) |
| ServiceNow Scope | `x_avnth_` (shared Pathfinder scope) |
| Status | Specification |

---

## 1. Product Overview

Ledger is a compliance automation module that plugs into the Pathfinder platform to continuously compile regulatory compliance evidence from device discovery data, generate audit-ready reports, and monitor compliance posture in real time.

### 1.1 Core Value Proposition

Hospitals and enterprises spend hundreds of hours per year manually gathering evidence for regulatory surveys, audits, and cyber-insurance attestations. Ledger eliminates that labor by:

1. **Automated evidence compilation** — every discovery cycle produces timestamped, audit-ready documentation tied to specific regulatory controls.
2. **Continuous compliance monitoring** — compliance posture is evaluated on every discovery cycle, not once per year before a survey.
3. **Framework-native reporting** — reports are formatted for the specific audience (Joint Commission surveyors, CMS auditors, SOC 2 assessors, insurance underwriters).
4. **Discovery-agnostic** — Ledger consumes the Unified Device Model from the Discovery Normalization Layer. It works with Pathfinder eBPF agents, Armis, ServiceNow native Discovery, Claroty, Ordr, or any combination.

### 1.2 What Ledger Is NOT

- **Not a vulnerability scanner.** Ledger evaluates compliance posture against regulatory frameworks using device metadata. It does not scan for CVEs or perform penetration testing.
- **Not a standalone product.** Ledger requires Pathfinder Base for the Discovery Normalization Layer and Unified Device Model.
- **Not a PHI processor.** Ledger operates on device metadata (make, model, location, maintenance status, network segment) — none of which constitutes Protected Health Information. See Section 7.

---

## 2. Architecture: Horizontal Engine + Vertical Rule Packs

Ledger separates the **compliance engine** (horizontal) from the **regulatory knowledge** (vertical rule packs). The engine is framework-agnostic; all regulatory specifics live in pluggable rule packs.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LEDGER MODULE                               │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    RULE PACK LIBRARY                           │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐  │  │
│  │  │   Joint    │ │    CMS     │ │    FDA     │ │   State   │  │  │
│  │  │ Commission │ │   CoP      │ │ Postmarket │ │   DoH     │  │  │
│  │  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬─────┘  │  │
│  │  ┌─────┴──────┐ ┌─────┴──────┐ ┌─────┴──────┐ ┌─────┴─────┐  │  │
│  │  │   Cyber    │ │   SOC 2    │ │ ISO 27001  │ │  (Future) │  │  │
│  │  │ Insurance  │ │            │ │            │ │           │  │  │
│  │  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬─────┘  │  │
│  └────────┼──────────────┼──────────────┼──────────────┼─────────┘  │
│           │              │              │              │             │
│  ┌────────▼──────────────▼──────────────▼──────────────▼─────────┐  │
│  │                CORE COMPLIANCE ENGINE                          │  │
│  │  • Rule evaluation framework                                  │  │
│  │  • Evidence compilation & timestamping                        │  │
│  │  • Finding lifecycle management                               │  │
│  │  • Report generation pipeline                                 │  │
│  │  • Audit trail recorder                                       │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                      │
│  ┌───────────────────────────▼───────────────────────────────────┐  │
│  │              DISCOVERY NORMALIZATION LAYER                     │  │
│  │              (Unified Device Model — from Pathfinder Base)     │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.1 Core Compliance Engine

The engine evaluates device metadata against rule definitions and produces compliance findings.

**Evaluation pipeline:**

1. **Ingest** — receive device update event from Discovery Normalization Layer (webhook or polling).
2. **Match** — identify which rule packs apply to the device based on device type, classification, facility, and customer configuration.
3. **Evaluate** — execute each applicable rule against device metadata. Each rule is a predicate that produces a pass/fail with evidence.
4. **Record** — create or update a compliance finding in ServiceNow (`x_avnth_compliance_finding`).
5. **Compile** — aggregate findings into per-framework evidence packages.
6. **Notify** — fire ServiceNow Flow Designer triggers for new Critical/High findings.

**Continuous monitoring:** The engine re-evaluates on every discovery cycle. A device that was compliant last week but has since missed a maintenance window will generate a finding automatically.

**Finding lifecycle:**

```
Open → Acknowledged → Remediation In Progress → Resolved → Verified
  │                                                           │
  └──── (auto-reopen if condition recurs) ◄──────────────────┘
```

| State | Description | Transition Trigger |
|-------|-------------|-------------------|
| Open | Rule evaluation detected non-compliance | Automatic (engine) |
| Acknowledged | Owner has reviewed the finding | Manual (owner action) |
| Remediation In Progress | Fix underway, owner + due date assigned | Manual (owner action) |
| Resolved | Owner reports remediation complete | Manual (owner action) |
| Verified | Engine re-evaluated and confirms compliance | Automatic (engine, next cycle) |

**Audit trail:** Every finding carries a complete provenance record:

```json
{
  "finding_id": "FND-2026-003412",
  "audit_trail": [
    {
      "timestamp": "2026-03-15T08:22:14Z",
      "action": "created",
      "actor": "system:ledger-engine",
      "detail": "Rule JC-EC.02.04.01-R003 evaluated against device DEV-1847. PM overdue by 14 days.",
      "rule_version": "jc-healthcare-v2.1",
      "source_confidence": 0.95
    },
    {
      "timestamp": "2026-03-15T10:45:00Z",
      "action": "acknowledged",
      "actor": "user:jsmith@hospital.org",
      "detail": "Acknowledged. Scheduling PM with vendor."
    },
    {
      "timestamp": "2026-03-18T14:12:33Z",
      "action": "status_change",
      "actor": "user:jsmith@hospital.org",
      "from_status": "Acknowledged",
      "to_status": "Remediation In Progress",
      "detail": "Vendor PM scheduled 2026-03-22. Work order WO-8834.",
      "remediation_due_date": "2026-03-22"
    },
    {
      "timestamp": "2026-03-22T16:00:00Z",
      "action": "status_change",
      "actor": "user:jsmith@hospital.org",
      "from_status": "Remediation In Progress",
      "to_status": "Resolved",
      "detail": "PM completed. Vendor report attached."
    },
    {
      "timestamp": "2026-03-23T02:15:00Z",
      "action": "verified",
      "actor": "system:ledger-engine",
      "detail": "Re-evaluated. Device DEV-1847 PM date now current. Finding closed."
    }
  ]
}
```

### 2.2 Rule Pack Architecture

Each rule pack is a self-contained Python module registered with the engine at startup. Rule packs are versioned independently and can be hot-loaded without restarting the service.

**Rule pack structure:**

```
src/intelligence/ledger/rule_packs/
├── joint_commission/
│   ├── __init__.py
│   ├── framework.yaml          # Framework metadata
│   ├── controls.yaml           # Control catalog
│   ├── rules/
│   │   ├── ec_02_04_01.py      # Rule definitions for EC.02.04.01
│   │   ├── ec_02_04_03.py
│   │   ├── ic_02_02_01.py
│   │   └── ls_02_01_30.py
│   ├── evidence_templates/
│   │   └── ec_maintenance.jinja2
│   └── report_templates/
│       └── survey_prep.jinja2
├── cms_cop/
│   ├── ...
├── fda_postmarket/
│   ├── ...
├── cyber_insurance/
│   ├── ...
├── soc2/
│   ├── ...
└── iso27001/
    ├── ...
```

**Framework definition (`framework.yaml`):**

```yaml
name: "Joint Commission"
code: "JC"
version: "2026.1"
controlling_body: "The Joint Commission"
survey_cycle: "36 months"
applies_to:
  - healthcare
requires_module: "pathfinder-clinical"
description: >
  Accreditation standards for hospitals and health systems.
  Ledger covers equipment-related standards in EC, IC, and LS chapters.
```

**Control catalog (`controls.yaml`):**

```yaml
controls:
  - id: "EC.02.04.01"
    name: "Medical Equipment Maintenance Program"
    chapter: "Environment of Care"
    description: >
      The hospital manages medical equipment risks by maintaining,
      inspecting, and testing all medical equipment.
    evidence_required:
      - equipment_inventory
      - pm_schedule_adherence
      - pm_completion_records

  - id: "EC.02.04.03"
    name: "Equipment Inspection and Testing"
    chapter: "Environment of Care"
    description: >
      The hospital inspects, tests, and maintains medical equipment
      before initial use and on an ongoing basis.
    evidence_required:
      - initial_inspection_records
      - ongoing_test_results
```

**Rule definition example (`ec_02_04_01.py`):**

```python
from ledger.engine.rule import Rule, Finding, Severity

class PMScheduleAdherence(Rule):
    """EC.02.04.01-R003: All medical equipment must have
    preventive maintenance completed within scheduled window."""

    framework = "JC"
    control_id = "EC.02.04.01"
    rule_id = "JC-EC.02.04.01-R003"
    version = "2.1"

    def evaluate(self, device: UnifiedDevice) -> Finding | None:
        if not device.is_medical_equipment:
            return None

        if device.pm_due_date is None:
            return Finding(
                severity=Severity.HIGH,
                summary="No PM schedule defined",
                detail=f"Device {device.name} ({device.make} {device.model}) "
                       f"has no preventive maintenance schedule.",
                evidence={
                    "device_id": device.id,
                    "device_name": device.name,
                    "make": device.make,
                    "model": device.model,
                    "location": device.location,
                    "pm_due_date": None,
                    "checked_at": datetime.utcnow().isoformat(),
                },
            )

        if device.pm_due_date < datetime.utcnow():
            days_overdue = (datetime.utcnow() - device.pm_due_date).days
            severity = Severity.CRITICAL if days_overdue > 30 else Severity.HIGH
            return Finding(
                severity=severity,
                summary=f"PM overdue by {days_overdue} days",
                detail=f"Device {device.name} PM was due "
                       f"{device.pm_due_date.date()}. Now {days_overdue} "
                       f"days overdue.",
                evidence={
                    "device_id": device.id,
                    "device_name": device.name,
                    "make": device.make,
                    "model": device.model,
                    "location": device.location,
                    "pm_due_date": device.pm_due_date.isoformat(),
                    "days_overdue": days_overdue,
                    "checked_at": datetime.utcnow().isoformat(),
                },
            )

        return None  # Compliant
```

### 2.3 Available Rule Packs

#### Healthcare Rule Packs (require Pathfinder Clinical)

##### Joint Commission

Standards from the Environment of Care (EC), Infection Control (IC), and Life Safety (LS) chapters that apply to medical equipment management.

| Control ID | Control Name | Rule Count | Severity Range |
|-----------|-------------|-----------|---------------|
| EC.02.04.01 | Medical Equipment Maintenance Program | 5 | Critical -- High |
| EC.02.04.03 | Equipment Inspection and Testing | 4 | Critical -- High |
| EC.02.06.01 | Equipment Management Plan | 3 | High -- Medium |
| EC.02.06.05 | Utility Systems Management | 2 | High -- Medium |
| IC.02.02.01 | Infection Prevention Device Requirements | 3 | Critical -- High |
| IC.01.05.01 | Infection Control Program Scope | 2 | High -- Medium |
| LS.02.01.10 | Building Maintenance and Testing | 2 | High -- Medium |
| LS.02.01.30 | Fire Safety Equipment Inspection | 3 | Critical -- High |
| LS.02.01.35 | Utility Equipment Maintenance | 2 | High -- Medium |
| HR.01.05.03 | Staff Competency (Equipment Training) | 2 | Medium |
| PC.01.03.01 | Patient Care Equipment Availability | 3 | High -- Medium |
| PI.01.01.01 | Performance Improvement Data (Equipment) | 2 | Medium -- Low |

**Rule definitions (detail for key controls):**

- **EC.02.04.01-R001:** All medical equipment must appear in the managed equipment inventory. _Devices discovered on clinical VLANs without an inventory record trigger a High finding._
- **EC.02.04.01-R002:** Risk classification (critical/non-critical) must be assigned. _Unclassified equipment triggers a Medium finding._
- **EC.02.04.01-R003:** Preventive maintenance must be completed within the scheduled window. _Overdue >30 days = Critical; overdue 1-30 days = High._
- **EC.02.04.01-R004:** Equipment failure incidents must be documented. _Devices with network anomalies but no incident record trigger a High finding._
- **EC.02.04.01-R005:** Alternate equipment plan must exist for life-critical devices. _Life-support devices without a redundancy plan trigger a High finding._
- **EC.02.04.03-R001:** Initial inspection before first clinical use. _Newly discovered devices without an acceptance testing record trigger a Critical finding._
- **EC.02.04.03-R002:** Ongoing safety testing per manufacturer schedule. _Overdue safety test = High._
- **EC.02.04.03-R003:** Performance testing after repair or modification. _Devices with recent maintenance events but no post-repair test record = High._
- **EC.02.04.03-R004:** Testing documentation retained per retention policy. _Missing documentation = Medium._
- **IC.02.02.01-R001:** Reusable medical devices must have cleaning/disinfection protocols assigned. _Devices without an assigned protocol = High._
- **IC.02.02.01-R002:** Single-use device reprocessing must be tracked if applicable. _Reprocessed devices without third-party reprocessor documentation = Critical._
- **IC.02.02.01-R003:** High-level disinfection equipment must have current validation. _Overdue validation = High._

##### CMS Conditions of Participation

Federal conditions that hospitals must meet to participate in Medicare/Medicaid. Equipment-related conditions:

| CFR Reference | Condition | Rule Count | Severity Range |
|--------------|-----------|-----------|---------------|
| 42 CFR 482.41(c)(2) | Physical Environment — Equipment Maintenance | 3 | Critical -- High |
| 42 CFR 482.41(c)(4) | Physical Environment — Emergency Power Testing | 2 | Critical -- High |
| 42 CFR 482.41(d) | Physical Environment — Safety from Fire | 2 | High -- Medium |
| 42 CFR 482.25(b)(6) | Pharmaceutical Services — Dispensing Systems | 2 | High -- Medium |
| 42 CFR 482.26 | Radiologic Services — Equipment Compliance | 3 | Critical -- High |
| 42 CFR 482.53 | Nuclear Medicine — Equipment Calibration | 2 | Critical -- High |
| 42 CFR 482.54 | Outpatient Services — Equipment Standards | 1 | High |
| 42 CFR 482.62(d)(2) | Special Provisions — Seclusion Monitoring Devices | 1 | High |

**Rule definitions (detail for key conditions):**

- **CMS-482.41c2-R001:** All patient-care equipment must be maintained per manufacturer recommendations. _No maintenance record in 12 months = Critical._
- **CMS-482.41c2-R002:** Equipment deficiency reports must generate corrective action. _Open deficiency >30 days without action = High._
- **CMS-482.41c2-R003:** Equipment inventory must be current and accurate. _Discovered devices not in inventory = High._
- **CMS-482.41c4-R001:** Emergency power systems must be tested per NFPA 110. _Overdue test = Critical._
- **CMS-482.41c4-R002:** Transfer switch testing documentation must be current. _Missing documentation = High._
- **CMS-482.25b6-R001:** Automated dispensing cabinets must have current calibration. _Overdue calibration = High._
- **CMS-482.25b6-R002:** Dispensing system access controls must be active. _Devices with default credentials detected = High._
- **CMS-482.26-R001:** Radiologic equipment must have current state registration. _Expired registration = Critical._
- **CMS-482.26-R002:** Radiation safety inspections must be current. _Overdue inspection = Critical._
- **CMS-482.26-R003:** Quality control testing per ACR standards. _Overdue QC = High._

##### FDA Postmarket Surveillance

Automated tracking of FDA safety communications, recalls, and field corrections matched against the customer's discovered device inventory.

| Capability | Rule Count | Severity Range |
|-----------|-----------|---------------|
| Safety communication matching | 3 | Critical -- High |
| Recall status tracking | 3 | Critical -- High |
| Field correction monitoring | 2 | High -- Medium |
| MDS2 tracking | 3 | High -- Medium |
| 510(k) clearance verification | 2 | Medium -- Informational |

**Rule definitions:**

- **FDA-RECALL-R001:** Class I recall issued for device in inventory. _Critical. Immediate notification to clinical engineering + risk management._
- **FDA-RECALL-R002:** Class II recall issued for device in inventory. _High. Notification with 48-hour acknowledgment SLA._
- **FDA-RECALL-R003:** Class III recall issued for device in inventory. _Medium. Notification with 7-day acknowledgment SLA._
- **FDA-SAFETY-R001:** FDA Safety Communication references device manufacturer/model in inventory. _High._
- **FDA-SAFETY-R002:** Device has unresolved safety communication >30 days. _Critical._
- **FDA-SAFETY-R003:** Field correction notice applies to device in inventory. _High._
- **FDA-MDS2-R001:** Medical device lacks MDS2 on file. _Medium._
- **FDA-MDS2-R002:** MDS2 on file is older than device firmware version. _Medium._
- **FDA-MDS2-R003:** MDS2 indicates unsupported OS and no compensating controls documented. _High._
- **FDA-510K-R001:** Discovered device model not found in FDA 510(k) database. _Medium (may indicate uncleared device or data gap)._
- **FDA-510K-R002:** Device 510(k) clearance predates current predicate device recall. _Informational._

##### State Department of Health

Configurable per-state rule engine for state-specific hospital licensing and inspection requirements.

- **Template framework** that accepts state-specific requirements as YAML configuration.
- **Pre-built packs** for top 10 states by hospital count: California, Texas, Florida, New York, Pennsylvania, Illinois, Ohio, North Carolina, Georgia, Michigan.
- Each state pack covers: equipment maintenance mandates, inspection frequencies, documentation retention periods, reporting obligations.
- Customers in other states can request new state packs or configure the template engine directly.

#### General Rule Packs (no Clinical module required)

##### Cyber Insurance Attestation

Maps discovered device data to common cyber-insurance questionnaire requirements.

| Control Area | Rule Count | Severity Range |
|-------------|-----------|---------------|
| Device inventory completeness | 3 | High -- Medium |
| Vulnerability remediation | 3 | Critical -- High |
| Network segmentation | 3 | High -- Medium |
| Endpoint protection coverage | 2 | High -- Medium |
| Patch currency | 2 | Critical -- High |

##### SOC 2 (Type II)

Maps to Trust Services Criteria relevant to asset management and monitoring.

| Control ID | Control Name | Rule Count |
|-----------|-------------|-----------|
| CC6.1 | Logical and Physical Access — Asset Inventory | 3 |
| CC6.6 | System Boundaries — Network Segmentation | 2 |
| CC7.1 | Monitoring — System Monitoring | 2 |
| CC7.2 | Monitoring — Anomaly Detection | 2 |
| CC8.1 | Change Management — Asset Changes | 3 |

##### ISO 27001:2022

Annex A controls related to asset management.

| Control ID | Control Name | Rule Count |
|-----------|-------------|-----------|
| A.5.9 | Inventory of Information and Other Associated Assets | 3 |
| A.5.10 | Acceptable Use of Information and Other Associated Assets | 2 |
| A.5.11 | Return of Assets | 1 |
| A.7.8 | Equipment Siting and Protection | 2 |
| A.7.9 | Security of Assets Off-Premises | 1 |
| A.7.13 | Equipment Maintenance | 3 |
| A.8.1 | User Endpoint Devices | 2 |

#### Future Rule Packs

| Framework | Target Release | Notes |
|-----------|---------------|-------|
| PCI-DSS v4.0 | 2026 Q4 | Network segmentation, cardholder data environment scoping |
| FedRAMP / NIST 800-53 | 2027 Q1 | Continuous monitoring controls (CA, CM, SI families) |
| CMMC Level 2 | 2027 Q2 | Defense contractor maturity model, asset management practices |
| HITRUST CSF | 2027 Q2 | Cross-maps to multiple healthcare frameworks |

---

## 3. Compliance Finding Data Model

### 3.1 ServiceNow Table: `x_avnth_compliance_finding`

| Field | Type | Description |
|-------|------|-------------|
| `finding_id` | String (auto) | Unique finding identifier. Format: `FND-YYYY-NNNNNN` |
| `framework` | String | Framework code (e.g., `JC`, `CMS`, `FDA`, `SOC2`) |
| `control_id` | String | Control identifier within the framework (e.g., `EC.02.04.01`) |
| `control_name` | String | Human-readable control name |
| `rule_id` | String | Specific rule that generated this finding (e.g., `JC-EC.02.04.01-R003`) |
| `rule_version` | String | Version of the rule pack at evaluation time |
| `device` | Reference | FK to Unified Device Model CI (`x_avnth_cmdb_ci_device`) |
| `facility` | Reference | FK to facility record (`cmn_location`) |
| `severity` | Choice | `Critical` / `High` / `Medium` / `Low` / `Informational` |
| `status` | Choice | `Open` / `Acknowledged` / `Remediation In Progress` / `Resolved` / `Verified` |
| `summary` | String (256) | Short finding description |
| `detail` | String (4000) | Full finding narrative |
| `evidence` | JSON | Structured evidence payload (what was checked, what was found) |
| `remediation_plan` | String (4000) | Description of planned corrective action |
| `remediation_owner` | Reference | FK to `sys_user` |
| `remediation_due_date` | Date | Target completion date for remediation |
| `audit_trail` | JSON | Array of status changes with timestamps, actors, and details |
| `first_detected` | DateTime | When the finding was first created |
| `last_evaluated` | DateTime | Most recent engine evaluation timestamp |
| `source_confidence` | Decimal | Confidence score of the underlying discovery source (0.0 -- 1.0) |
| `created_by` | String | Always `system:ledger-engine` for auto-detected findings |

### 3.2 Evidence Payload Schema

```json
{
  "rule_id": "JC-EC.02.04.01-R003",
  "rule_version": "2.1",
  "evaluated_at": "2026-03-15T08:22:14Z",
  "device": {
    "id": "DEV-1847",
    "name": "Infusion Pump Station 4B-12",
    "make": "Baxter",
    "model": "Sigma Spectrum",
    "serial": "BSS-2024-78923",
    "location": "4th Floor, Bed 12, Building B",
    "facility": "Main Hospital Campus"
  },
  "condition_checked": "Preventive maintenance due date vs. current date",
  "expected": "PM due date >= current date",
  "actual": "PM due date 2026-03-01; current date 2026-03-15",
  "result": "FAIL",
  "discovery_source": "pathfinder-ebpf",
  "source_confidence": 0.95
}
```

### 3.3 Related Tables

| Table | Purpose |
|-------|---------|
| `x_avnth_compliance_framework` | Registered frameworks with metadata and version |
| `x_avnth_compliance_control` | Control catalog per framework |
| `x_avnth_compliance_rule` | Rule definitions with version history |
| `x_avnth_compliance_evidence_pkg` | Compiled evidence packages for audit submission |
| `x_avnth_compliance_report` | Generated reports with output artifacts |
| `x_avnth_compliance_survey` | Upcoming survey/audit dates per facility per framework |

---

## 4. Report Generation

### 4.1 Report Types

| Report | Audience | Content | Trigger |
|--------|----------|---------|---------|
| Survey Preparation | Clinical engineering, compliance | Readiness score per framework; gap analysis with prioritized remediation list | On-demand or scheduled (e.g., 90/60/30 days before survey) |
| Evidence Package | Surveyors, auditors | Complete documentation for a specific framework: every control with evidence, finding history, remediation records | On-demand (pre-survey) |
| Executive Summary | C-suite, board | Traffic-light compliance dashboard; trend arrows; top risks | Scheduled (monthly/quarterly) |
| Device Compliance Detail | Clinical engineering | Per-device compliance status across all applicable frameworks | On-demand or filtered by device/location |
| Remediation Tracking | Compliance officers, managers | Open findings by severity, age, owner, facility; SLA adherence | Scheduled (weekly) or on-demand |
| Trend Report | Compliance leadership | Compliance posture over time; improving/degrading indicators per framework per facility | Scheduled (monthly/quarterly) |

### 4.2 Output Formats

| Format | Library | Use Case |
|--------|---------|----------|
| PDF | FPDF2 (`fpdf2`) | Formal audit submissions, board presentations |
| DOCX | `python-docx` | Editable reports for internal review and annotation |
| ServiceNow Report | Native SN reporting | In-platform dashboards and scheduled distribution |
| API JSON | FastAPI response | Programmatic access for downstream systems |

### 4.3 Survey Preparation Report Structure

```
1. Executive Summary
   - Overall readiness score (0-100)
   - Framework: Joint Commission 2026 Survey
   - Facility: Main Hospital Campus
   - Report date / survey window

2. Readiness by Chapter
   - EC (Environment of Care): 87/100 — 3 open findings
   - IC (Infection Control): 94/100 — 1 open finding
   - LS (Life Safety): 91/100 — 2 open findings

3. Open Findings (prioritized)
   - Critical: 0
   - High: 4
   - Medium: 2
   Each with: control reference, device, location, age,
   remediation plan, owner, due date

4. Recently Resolved Findings
   - Findings closed in last 90 days with evidence

5. Evidence Completeness Matrix
   - Control × evidence requirement grid
   - Green = evidence on file, Yellow = partial, Red = missing

6. Recommended Actions
   - Prioritized list to close gaps before survey window
```

---

## 5. FDA Integration

Ledger integrates with four FDA data sources to automate postmarket surveillance compliance.

### 5.1 FDA MAUDE Database (Adverse Event Reports)

- **Source:** FDA MAUDE (Manufacturer and User Facility Device Experience)
- **Frequency:** Monthly batch import
- **Method:** Bulk download from FDA MAUDE data files (CSV/delimited)
- **Matching logic:** Manufacturer name + product code against Unified Device Model. Fuzzy matching with manual review queue for low-confidence matches.
- **Output:** Findings linked to specific devices in inventory when adverse events reference matching manufacturer/model combinations.

### 5.2 FDA Safety Communications

- **Source:** FDA Safety Communications RSS feed + openFDA API
- **Frequency:** Weekly polling
- **Method:** RSS parsing for new communications; openFDA device recall API for structured data
- **Matching logic:** Device recall records matched by product code, manufacturer, and model number against Unified Device Model.
- **Output:** Immediate findings generated for Class I recalls (Critical severity). Dashboard alert for Class II/III.

### 5.3 FDA 510(k) Database

- **Source:** openFDA 510(k) clearance database
- **Frequency:** Monthly refresh
- **Method:** openFDA API query by manufacturer and product code
- **Matching logic:** Verify that discovered medical devices have valid 510(k) clearances on record.
- **Output:** Informational/Medium findings for devices without matching 510(k) records (may indicate uncleared device, data gap, or exempt device class).

### 5.4 MDS2 Tracking

- **Source:** Manufacturer Disclosure Statement for Medical Device Security (IEC 80001-2-2)
- **Frequency:** On device discovery + annual review
- **Method:** MDS2 document repository (customer-uploaded or manufacturer portal integration)
- **Matching logic:** Device make + model → MDS2 document. Version checked against current device firmware.
- **Output:** Findings for missing MDS2 statements, outdated MDS2 relative to firmware version, or MDS2-indicated risks without compensating controls.

```
┌─────────────────────────────────────────────────────────────┐
│                    FDA INTEGRATION PIPELINE                   │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│  │  MAUDE   │  │  Safety  │  │  510(k)  │  │    MDS2     │  │
│  │ Database │  │  Comms   │  │ Database │  │  Repository │  │
│  │ (monthly)│  │ (weekly) │  │ (monthly)│  │ (on-demand) │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘  │
│       │              │              │               │         │
│  ┌────▼──────────────▼──────────────▼───────────────▼──────┐  │
│  │              FDA DATA NORMALIZATION                       │  │
│  │  • Manufacturer name normalization                       │  │
│  │  • Product code / model cross-reference                  │  │
│  │  • Confidence scoring on device match                    │  │
│  └──────────────────────┬──────────────────────────────────┘  │
│                         │                                      │
│  ┌──────────────────────▼──────────────────────────────────┐  │
│  │           UNIFIED DEVICE MODEL (match)                    │  │
│  └──────────────────────┬──────────────────────────────────┘  │
│                         │                                      │
│  ┌──────────────────────▼──────────────────────────────────┐  │
│  │           COMPLIANCE ENGINE → Findings                    │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Dashboard

### 6.1 ServiceNow Polaris Workspace Page

Ledger provides a dedicated Polaris workspace page (`x_avnth_compliance_dashboard`) with the following components:

| Component | Type | Description |
|-----------|------|-------------|
| Compliance Posture Heatmap | Matrix (frameworks x facilities) | Color-coded cells: Green (>90%), Yellow (70-90%), Red (<70%). Click-through to framework detail. |
| Finding Severity Distribution | Donut chart | Breakdown of all open findings by severity (Critical, High, Medium, Low, Informational). |
| Open Finding Aging | Stacked bar chart | Open findings bucketed by age: 0-7 days, 8-30 days, 31-60 days, 60+ days. Stacked by severity. |
| Upcoming Surveys | Table with indicators | Next survey/audit dates per facility per framework. Readiness score with trend arrow. Days until survey. |
| Recent FDA Alerts | Feed | FDA safety communications from the past 30 days that match devices in inventory. Severity badge + affected device count. |
| Remediation SLA Tracker | Gauge + table | Percentage of findings remediated within SLA. Table of overdue items by owner. |
| Compliance Trend | Line chart | 90-day rolling compliance score per framework. Improving/degrading trendline. |

### 6.2 Notification Channels

| Event | Channel | Audience |
|-------|---------|----------|
| Critical finding opened | ServiceNow notification + email | Facility compliance officer, clinical engineering manager |
| FDA Class I recall match | ServiceNow notification + email + SMS | Risk management, clinical engineering director |
| Survey window <90 days | Scheduled email | Compliance team, facility director |
| Readiness score drops below threshold | ServiceNow notification | Compliance officer |
| Weekly remediation digest | Scheduled email | Finding owners, managers |

---

## 7. HIPAA Compliance

Ledger processes the following data categories:

| Data Category | Examples | PHI? |
|--------------|---------|------|
| Device metadata | Make, model, serial number, firmware version | No |
| Device location | Building, floor, room, department | No |
| Maintenance records | PM dates, test results, work order references | No |
| Compliance findings | Rule evaluations, evidence payloads | No |
| Network telemetry | IP address, MAC address, VLAN, traffic volume | No |
| FDA data | Recalls, safety communications, 510(k) clearances | No |
| Audit trail | User actions, timestamps, status changes | No |

**None of the data processed by Ledger constitutes Protected Health Information.** Device identifiers (make, model, serial number, location, maintenance status) are not PHI under the HIPAA Privacy Rule. No patient data, patient identifiers, treatment records, or clinical outcomes are referenced in any compliance finding, evidence payload, or report.

Ledger does not:
- Access electronic health records (EHR/EMR)
- Process patient demographic data
- Store or transmit individually identifiable health information
- Interact with clinical systems that contain PHI

Ledger operates entirely within the device management and compliance documentation domain. A Business Associate Agreement (BAA) is not required for the Ledger module's data processing, though customers deploying Ledger within a covered entity environment will typically include it under their existing Avennorth BAA as a matter of organizational policy.

---

## 8. API Reference

### 8.1 FastAPI Endpoints (Ledger Service)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/evaluate` | Trigger evaluation for a specific device or facility |
| `GET` | `/api/v1/findings` | List findings (filterable by framework, facility, severity, status) |
| `GET` | `/api/v1/findings/{finding_id}` | Get finding detail with full audit trail |
| `PATCH` | `/api/v1/findings/{finding_id}` | Update finding status, remediation plan, owner |
| `GET` | `/api/v1/frameworks` | List registered frameworks and rule pack versions |
| `GET` | `/api/v1/frameworks/{code}/controls` | List controls for a framework |
| `POST` | `/api/v1/reports/generate` | Generate a report (type, framework, facility, format) |
| `GET` | `/api/v1/reports/{report_id}` | Download generated report |
| `GET` | `/api/v1/posture/{facility_id}` | Compliance posture summary for a facility |
| `GET` | `/api/v1/fda/alerts` | Recent FDA alerts matching inventory |
| `POST` | `/api/v1/fda/sync` | Trigger FDA data sync (MAUDE, recalls, 510k) |

### 8.2 ServiceNow Scripted REST API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/x_avnth/pathfinder/v1/compliance/findings` | ServiceNow-native finding query |
| `GET` | `/api/x_avnth/pathfinder/v1/compliance/posture` | Facility compliance posture |
| `POST` | `/api/x_avnth/pathfinder/v1/compliance/evaluate` | Trigger evaluation from ServiceNow |

---

*Avennorth, Inc. -- Confidential. This document contains proprietary product specifications. Distribution is restricted to authorized personnel.*
