# Vantage Clinical — Product Specification

**Product:** Vantage Clinical
**Type:** Extension module of Avennorth Vantage (AI-powered major incident investigation)
**Tagline:** *"Spots wrong turns. Reroutes clinical operations."*
**Version:** 1.0 Draft
**Date:** 2026-03-31

> **Codebase note:** Vantage Clinical lives in the Vantage codebase, NOT in the Pathfinder repo. This spec is maintained here because Pathfinder is the upstream data provider.

---

## 1. Product Overview

Vantage Clinical is a named extension of the existing Avennorth Vantage product that adds healthcare-specific incident response capabilities. It transforms device behavioral telemetry from Pathfinder into actionable clinical incident intelligence — classifying device events, calculating patient safety impact, identifying backup equipment, and routing escalations through clinically-aware RACI chains.

Vantage Clinical is **discovery-agnostic**. It consumes device data from any source via the Discovery Normalization Layer in Pathfinder, meaning it works regardless of whether device data originates from Pathfinder agents, ServiceNow Discovery, Claroty, Medigate, Ordr, or any other clinical/OT discovery tool.

### Prerequisites

| Requirement | Type | Description |
|-------------|------|-------------|
| Pathfinder Base | Required | Discovery Normalization Layer, Gateway webhook publishing |
| Pathfinder Clinical | Required | Medical device CI model, device tiering, clinical context enrichment |
| Vantage (base product) | Required | Incident investigation engine, AI summarization, root cause analysis |
| Meridian | Optional | Workforce-aware escalation via UKG Pro integration (shift/certification data) |

### Pricing

| Metric | Range |
|--------|-------|
| Per facility per month | $3,000 – $8,000 |
| Per facility per year | $36,000 – $96,000 |
| Pricing factors | Facility bed count, device count, device tier mix |

---

## 2. Incident Classification

Medical device incidents are classified into five categories using behavioral patterns from Pathfinder, historical incident data, and the FDA MAUDE failure mode library.

| # | Category | Description | Example Signals |
|---|----------|-------------|-----------------|
| 1 | **Security Compromise** | Unauthorized access, malware, lateral movement | Unexpected outbound connections, credential probing, anomalous protocol usage |
| 2 | **Device Failure** | Hardware malfunction, software crash, calibration loss | Sudden communication drop, restart loops, error code bursts |
| 3 | **Communication Disruption** | Network loss, protocol error, HL7/DICOM failure | Timeout spikes, retransmission storms, HL7 ACK failures, DICOM association rejects |
| 4 | **Calibration Drift** | Gradual degradation detected via behavioral pattern analysis | Slowly increasing response latency, output variance trending upward, periodic micro-faults |
| 5 | **Environmental** | Power loss, temperature excursion, physical damage indicators | UPS event correlation, sudden multi-device dropout in same zone, intermittent connectivity |

### Classification Flow

```
Pathfinder Gateway
  │
  ▼ (webhook: anomaly_detected, health_degraded, etc.)
Vantage Clinical Ingestion
  │
  ├─ Behavioral pattern matching (Pathfinder telemetry)
  ├─ Historical incident correlation (past incidents on same device model)
  ├─ FDA MAUDE failure mode library (known adverse event patterns)
  │
  ▼
Incident Classification Engine
  │
  ▼
Classified Incident (1 of 5 categories)
  │
  ├─► Clinical Blast Radius Analysis
  ├─► Patient Safety Impact Scoring
  ├─► RACI-Driven Escalation
  └─► Backup Device Identification
```

---

## 3. Clinical Blast Radius Analysis

When an incident is created, Vantage Clinical automatically calculates the clinical blast radius — the full scope of impact across devices, procedures, patients, staff, and downstream equipment.

### Blast Radius Components

| Component | Source | Calculation |
|-----------|--------|-------------|
| **Affected devices** | Pathfinder CMDB relationships | Direct dependencies: same network segment, shared services, chained workflows |
| **Affected procedures** | Procedure scheduling system | Scheduled procedures in next 24 hours that require the affected device |
| **Affected patients** | Procedure scheduling system | Count of patients with scheduled procedures — **count only, no patient identifiers** |
| **Affected staff** | EA Stakeholder Hub + Meridian | Clinical staff assigned to affected procedures/devices |
| **Downstream equipment** | Pathfinder integration map | Devices that depend on the affected device's output (e.g., lab analyzer feeds pharmacy system) |
| **Blast radius score** | Composite calculation | 0–100 combining device criticality, patient count, procedure urgency, time sensitivity |

### Blast Radius Score Formula

```
blast_radius_score = (
    device_criticality_weight        # Tier 4 = 40, Tier 3 = 25, Tier 2 = 10, Tier 1 = 5
  + (affected_procedure_count * 3)   # Capped at 30
  + (downstream_device_count * 2)    # Capped at 20
  + time_sensitivity_modifier        # +10 if device actively in use during procedure
)
# Clamped to 0–100
```

### Example

> A Tier 3 CT scanner goes offline at 08:00. Blast radius analysis:
> - **Affected devices:** 1 (the scanner) + 2 downstream (PACS server, radiology workstation)
> - **Affected procedures:** 6 CT scans scheduled in the next 24h, 2 within 4h
> - **Affected patients:** 6 (count only)
> - **Affected staff:** 2 radiology techs, 1 radiologist
> - **Downstream equipment:** PACS image routing paused; radiology workstation showing stale images
> - **Blast radius score:** 57 (High)

---

## 4. RACI-Driven Clinical Escalation

Incident routing uses a multi-source RACI matrix that resolves the right responders in real time.

### RACI Data Sources

| Source | Data Provided | Availability |
|--------|--------------|--------------|
| **EA Stakeholder Hub** (ServiceNow) | Device owner, maintainer, department head, vendor contact | Always available |
| **UKG Pro** (via Meridian) | Who is on call NOW, who is certified on this device and currently on shift | Requires Meridian |
| **Device certification records** | Biomedical engineers certified for specific manufacturer/model | Always available |

### Escalation Tiers

| Priority | Criteria | Escalation Path | Target Response |
|----------|----------|-----------------|-----------------|
| **P1** | Life-critical device, Tier 4 | Immediate page: on-call biomed + department head + risk management + patient safety officer | < 5 minutes |
| **P2** | Clinical device, Tier 3 | Alert: on-call biomed + department charge nurse | < 15 minutes |
| **P3** | Clinical device, non-critical (Tier 2) | Ticket to biomed queue + notification to department | < 1 hour |
| **P4** | IoT/OT in clinical setting (Tier 1) | Standard IT ticket + biomed FYI | Standard SLA |

### Escalation Resolution Flow

```
Incident Created
  │
  ├─ Query EA Stakeholder Hub ─► Device owner, maintainer, dept head
  ├─ Query Meridian (if available) ─► On-call staff, shift-aware certified operators
  ├─ Query device certifications ─► Certified biomed engineers
  │
  ▼
RACI Matrix Resolution
  │
  ├─ R (Responsible): Certified biomed engineer on shift (Meridian) or on-call biomed
  ├─ A (Accountable): Device owner from EA Stakeholder Hub
  ├─ C (Consulted): Vendor contact (for Tier 3/4), clinical department head
  ├─ I (Informed): Department charge nurse, risk management (P1 only)
  │
  ▼
Priority-Based Routing
  │
  ├─ P1: Simultaneous page to all parties, 3-minute escalation timer
  ├─ P2: Alert to R + A, 10-minute escalation timer
  ├─ P3: Ticket assignment to R, standard escalation
  └─ P4: Ticket to IT queue, FYI to biomed
```

---

## 5. Automated Backup Device Identification

When a device incident occurs, Vantage Clinical automatically identifies and ranks backup equipment options.

### Identification Process

| Step | Action | Data Source |
|------|--------|-------------|
| 1 | Query device inventory for same-type devices in same facility | CMDB (Pathfinder Clinical device model) |
| 2 | Filter by operational status: online, healthy | Pathfinder health telemetry |
| 3 | Filter by location proximity: same building, same floor | CMDB location attributes |
| 4 | Check calibration status: last calibration date, calibration due date | Biomedical equipment records |
| 5 | Check operator certification: certified operators currently on shift | Meridian (if available) |
| 6 | Rank by composite score: proximity + availability + staff coverage | Vantage Clinical ranking engine |

### Ranking Score

```
backup_score = (
    proximity_score          # Same room = 30, same floor = 20, same building = 10
  + availability_score       # Online + healthy = 30, online + degraded = 15
  + calibration_score        # Current calibration = 20, due within 7 days = 10
  + staff_coverage_score     # Certified operator on shift = 20, certified but off shift = 5
)
# Max: 100
```

### Output

The incident responder receives a ranked list of backup options:

| Rank | Device | Location | Status | Calibration | Certified Staff On Shift | Score |
|------|--------|----------|--------|-------------|--------------------------|-------|
| 1 | CT-Scanner-04 | Bldg A, Floor 2, Room 214 | Online / Healthy | Current (2026-03-15) | 2 techs on shift | 95 |
| 2 | CT-Scanner-07 | Bldg A, Floor 3, Room 310 | Online / Healthy | Current (2026-03-20) | 1 tech on shift | 85 |
| 3 | CT-Scanner-02 | Bldg B, Floor 1, Room 108 | Online / Healthy | Due 2026-04-02 | 0 (nearest certified: 20 min) | 55 |

Each option includes a **one-click reassignment** action that updates procedure scheduling references and notifies affected staff.

---

## 6. FDA MAUDE Integration

Vantage Clinical integrates with the FDA Manufacturer and User Facility Device Experience (MAUDE) database to enable proactive failure detection.

### Batch Import Pipeline

| Stage | Frequency | Description |
|-------|-----------|-------------|
| **Import** | Monthly | Automated download of new MAUDE adverse event reports |
| **Parse** | On import | Extract device identifiers, failure modes, event narratives |
| **Pattern extraction** | On import | AI-driven extraction of behavioral failure signatures from event narratives |
| **Pattern library update** | On import | Append new failure mode patterns to the behavioral matching library |

### Behavioral Pattern Matching

The MAUDE integration operates in two modes:

**Retrospective matching** — When a new MAUDE report is imported, compare the extracted failure signature against the historical behavioral data for all matching device models in the facility. Flag any devices that have already exhibited the failure pattern.

**Real-time matching** — Continuously compare incoming device behavioral telemetry from Pathfinder against the full MAUDE pattern library. When a match confidence exceeds the threshold (default: 75%), generate a pre-incident alert.

### Example: Proactive Failure Detection

```
┌─────────────────────────────────────────────────────────────────────────┐
│ MAUDE Pattern Match Alert                                               │
│                                                                         │
│ Severity: WARNING (pre-incident)                                        │
│ Pattern confidence: 82%                                                 │
│                                                                         │
│ MAUDE Report: #12345678                                                 │
│ Device type: Infusion pump, Model X                                     │
│ Known failure mode: Intermittent communication drops 24–72h before      │
│   complete lockout event                                                │
│                                                                         │
│ Matched devices (this facility):                                        │
│   • INF-PUMP-1042 (ICU, Bed 4) — 6 comm retries in last 8h (baseline: 0)│
│   • INF-PUMP-1087 (ICU, Bed 9) — 4 comm retries in last 12h (baseline: 0)│
│   • INF-PUMP-1103 (PCU, Bed 2) — 3 comm retries in last 6h (baseline: 1)│
│                                                                         │
│ Recommended action: Schedule preventive inspection/swap before           │
│   potential clinical impact                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Patient Safety Impact Scoring

Every incident receives a Patient Safety Impact Score (PSIS) from 0 to 100. This score drives escalation priority, regulatory reporting decisions, and post-incident review requirements.

### Scoring Factors

| Factor | Points | Condition |
|--------|--------|-----------|
| Device tier weight | 40 | Tier 4 (life-critical) |
| | 20 | Tier 3 (clinical) |
| | 5 | Tier 2 (clinical support) |
| | 0 | Tier 1 (IoT/OT) |
| Active patient procedures | +2 per procedure | Scheduled procedures in next 4 hours requiring affected device |
| Backup availability | -10 | Qualified backup device immediately available |
| | 0 | No qualified backup available |
| Staff coverage | -5 | Certified operator currently on shift |
| | 0 | No certified operator on shift |
| Time sensitivity | +15 | Device currently in use during an active procedure |
| FDA alert match | +20 | Behavioral pattern matches a known FDA MAUDE adverse event |

### Score Ranges and Response

| Range | Severity | Response Protocol |
|-------|----------|-------------------|
| **0–20** | Low | Standard incident process |
| **21–50** | Moderate | Expedited response, biomed notification |
| **51–80** | High | Immediate biomed dispatch, department head notification |
| **81–100** | Critical | All-hands clinical response: risk management, patient safety officer, potential regulatory reporting |

### Example Calculation

> Tier 4 ventilator (40 pts) with 3 procedures in next 4h (+6 pts), no backup available (0 pts), certified respiratory therapist on shift (-5 pts), device NOT actively in use (0 pts), no FDA match (0 pts).
>
> **PSIS = 40 + 6 + 0 - 5 + 0 + 0 = 41 (Moderate)**

> Same ventilator, but device IS in active use (+15 pts) and behavioral pattern matches FDA MAUDE report (+20 pts), no backup (0 pts), no certified staff on shift (0 pts).
>
> **PSIS = 40 + 6 + 0 + 0 + 15 + 20 = 81 (Critical)**

---

## 8. Data Model

All tables reside in the **Vantage codebase** and consume Pathfinder data via webhook/API. Tables use the Vantage scope prefix.

### Tables

#### `x_avnth_vantage_clinical_incident`

Extends `incident`. Core clinical incident record.

| Field | Type | Description |
|-------|------|-------------|
| `classification` | Choice | Security Compromise, Device Failure, Communication Disruption, Calibration Drift, Environmental |
| `psis_score` | Integer (0–100) | Patient Safety Impact Score |
| `blast_radius_score` | Integer (0–100) | Clinical blast radius composite score |
| `affected_device_count` | Integer | Count of directly and indirectly affected devices |
| `affected_procedure_count` | Integer | Scheduled procedures impacted in next 24h |
| `affected_patient_count` | Integer | Patient count (no identifiers) |
| `affected_staff_count` | Integer | Clinical staff impacted |
| `device_tier` | Reference | Device tier from Pathfinder Clinical |
| `maude_match` | Reference | FDA MAUDE match record, if applicable |
| `backup_identified` | Boolean | Whether a qualified backup device was found |
| `pathfinder_event_id` | String | Source event ID from Pathfinder webhook |

#### `x_avnth_vantage_escalation`

Escalation path with RACI resolution and response tracking.

| Field | Type | Description |
|-------|------|-------------|
| `clinical_incident` | Reference | Parent clinical incident |
| `escalation_tier` | Choice | P1, P2, P3, P4 |
| `responsible` | Reference (sys_user) | Resolved R from RACI |
| `accountable` | Reference (sys_user) | Resolved A from RACI |
| `consulted` | List (sys_user) | Resolved C from RACI |
| `informed` | List (sys_user) | Resolved I from RACI |
| `raci_source` | Choice | EA Stakeholder Hub, Meridian, Device Certifications, Manual |
| `contact_attempts` | Integer | Number of contact attempts |
| `first_response_time` | Duration | Time from escalation to first human response |
| `resolution_time` | Duration | Time from escalation to resolution |

#### `x_avnth_vantage_backup_device`

Backup device identification results.

| Field | Type | Description |
|-------|------|-------------|
| `clinical_incident` | Reference | Parent clinical incident |
| `backup_device` | Reference (cmdb_ci) | Candidate backup device |
| `rank` | Integer | Ranking position (1 = best) |
| `proximity_score` | Integer | Location proximity score component |
| `availability_score` | Integer | Operational status score component |
| `calibration_score` | Integer | Calibration currency score component |
| `staff_coverage_score` | Integer | Certified operator availability score component |
| `composite_score` | Integer (0–100) | Total backup suitability score |
| `selected` | Boolean | Whether this backup was selected by the responder |

#### `x_avnth_vantage_maude_match`

FDA MAUDE behavioral pattern matches.

| Field | Type | Description |
|-------|------|-------------|
| `maude_report_number` | String | FDA MAUDE report identifier |
| `device_model` | String | Device manufacturer and model from MAUDE report |
| `failure_mode` | String (2000) | Extracted failure mode description |
| `behavioral_signature` | String (4000) | Machine-readable behavioral pattern signature |
| `matched_device` | Reference (cmdb_ci) | Facility device that matched the pattern |
| `match_confidence` | Decimal (0–1) | Confidence score of the behavioral pattern match |
| `match_timestamp` | DateTime | When the match was detected |
| `clinical_incident` | Reference | Resulting clinical incident, if threshold was met |
| `status` | Choice | New, Acknowledged, Under Investigation, Resolved, False Positive |

---

## 9. Webhook Integration with Pathfinder

Vantage Clinical consumes Pathfinder data using the same webhook pattern as the Bearing integration.

### Event Flow

```
Pathfinder Gateway
  │
  │  POST /api/x_avnth/vantage/v1/clinical-event
  │  Authorization: Bearer <service_account_token>
  │  Content-Type: application/json
  │
  ▼
Vantage Clinical Webhook Endpoint
  │
  ├─ Validate payload + authenticate
  ├─ Enrich with CMDB context (device tier, location, relationships)
  ├─ Run incident classification engine
  │
  ▼
  Threshold met? ─── No ──► Log event, update device behavioral profile
  │
  Yes
  │
  ▼
Create Clinical Incident
  ├─ Calculate PSIS
  ├─ Calculate blast radius
  ├─ Identify backup devices
  ├─ Resolve RACI escalation path
  └─ Execute escalation
```

### Event Types

| Event Type | Description | Typical Action |
|------------|-------------|----------------|
| `anomaly_detected` | Behavioral anomaly identified by Pathfinder AI engine | Classify and evaluate threshold |
| `device_stale` | Device stopped reporting telemetry beyond expected interval | Evaluate as potential Device Failure or Communication Disruption |
| `health_degraded` | Device health score dropped below threshold | Classify and evaluate threshold |
| `communication_failure` | Persistent communication failure detected | Classify as Communication Disruption, evaluate severity |
| `classification_changed` | Device behavioral classification changed | Re-evaluate device risk profile, check MAUDE patterns |

### Webhook Payload Example

```json
{
  "event_id": "evt_20260331_142355_a8f2c",
  "event_type": "anomaly_detected",
  "timestamp": "2026-03-31T14:23:55Z",
  "source": "pathfinder-gateway",
  "device": {
    "ci_sys_id": "abc123def456",
    "device_type": "infusion_pump",
    "manufacturer": "Acme Medical",
    "model": "InfuseMax 3000",
    "serial_number": "SN-2024-08-1042",
    "location": {
      "facility": "Main Campus",
      "building": "A",
      "floor": "3",
      "room": "ICU-4"
    },
    "tier": 4
  },
  "anomaly": {
    "type": "communication_pattern_change",
    "description": "Communication retry rate increased 600% over 8-hour baseline",
    "severity": "warning",
    "metrics": {
      "baseline_retries_per_hour": 0.2,
      "current_retries_per_hour": 1.4,
      "trend": "increasing"
    }
  },
  "pathfinder_context": {
    "discovery_source": "pathfinder_agent",
    "normalized": true,
    "relationships": [
      {"target_ci": "def789ghi012", "type": "communicates_with", "protocol": "HL7v2"},
      {"target_ci": "jkl345mno678", "type": "depends_on", "protocol": "TCP"}
    ]
  }
}
```

---

## 10. HIPAA Compliance

Vantage Clinical is designed to operate entirely outside the PHI boundary. It processes device metadata and operational data, never protected health information.

### Compliance Boundaries

| Data Type | Handled | Notes |
|-----------|---------|-------|
| Device identifiers (serial, model, CI) | Yes | Not PHI |
| Device telemetry (network flows, health metrics) | Yes | Not PHI |
| Staff names and schedules | Yes | Employment data, not PHI |
| Device certifications | Yes | Employment data, not PHI |
| Patient count (aggregate) | Yes | De-identified aggregate count |
| Patient identifiers | **Never** | Not collected, not stored, not transmitted |
| Patient records / diagnoses | **Never** | Not collected, not stored, not transmitted |
| Procedure types (aggregate) | Yes | "3 CT scans" — not tied to patients |
| Individual procedure details | **Never** | Not collected, not stored, not transmitted |

### Design Principles

1. **Count, don't identify.** Blast radius shows "3 procedures affected in next 4 hours" — never "patient John Doe's cardiac procedure."
2. **Device-centric, not patient-centric.** All incident records reference device IDs and procedure types, never patient records.
3. **Aggregate only.** Patient impact is measured by procedure count. No patient demographics, no medical record numbers, no diagnosis codes.
4. **No PHI in transit.** Webhook payloads from Pathfinder contain device telemetry only. The Vantage Clinical webhook endpoint rejects any payload containing PHI-indicative fields.
5. **Audit trail.** All data access is logged and auditable. RACI resolution logs which data sources were queried and what was returned.

---

## Appendix A: Product Dependency Map

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌──────────────────┐    ┌─────────────────────────────┐    │
│  │ Pathfinder Base   │───►│ Pathfinder Clinical          │    │
│  │ (Discovery +      │    │ (Medical device CI model,    │    │
│  │  Normalization    │    │  device tiering, clinical    │    │
│  │  Layer)           │    │  context enrichment)         │    │
│  └──────────────────┘    └──────────┬──────────────────┘    │
│                                      │ webhook/API          │
│                                      ▼                      │
│  ┌──────────────────┐    ┌─────────────────────────────┐    │
│  │ Vantage (Base)    │───►│ Vantage Clinical             │    │
│  │ (Incident         │    │ (Healthcare incident         │    │
│  │  investigation,   │    │  response, PSIS, blast       │    │
│  │  AI summarization)│    │  radius, MAUDE, escalation)  │    │
│  └──────────────────┘    └──────────┬──────────────────┘    │
│                                      │ optional             │
│                           ┌──────────▼──────────────────┐   │
│                           │ Meridian                     │   │
│                           │ (UKG Pro integration,        │   │
│                           │  shift-aware escalation,     │   │
│                           │  operator certification)     │   │
│                           └─────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Appendix B: Comparison with Base Vantage

| Capability | Vantage (Base) | Vantage Clinical |
|------------|----------------|------------------|
| Incident investigation | All IT incidents | Medical device + clinical IT incidents |
| Classification | Standard ITIL categories | 5 clinical categories (security, failure, communication, calibration, environmental) |
| Impact analysis | Service dependency map | Clinical blast radius (devices, procedures, patients, staff, downstream equipment) |
| Impact scoring | Business impact score | Patient Safety Impact Score (PSIS) |
| Escalation | ITIL-based RACI | Clinical RACI with real-time shift awareness and device certification |
| Backup identification | N/A | Automated backup device ranking with calibration and staff coverage |
| Regulatory integration | N/A | FDA MAUDE behavioral pattern matching and proactive alerting |
| Compliance | Standard | HIPAA-aware design (no PHI processing) |

---

*Avennorth Confidential — Internal Use Only*
*Copyright 2026 Avennorth. All rights reserved.*
