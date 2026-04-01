# 10 — Avennorth Shared Data Model

## 1. Purpose

This document defines the shared data model used across all Avennorth products. Every product reads from and writes to ServiceNow CMDB using CSDM-aligned tables. The schema is designed so that Pathfinder, Contour, Bearing, Vantage, and Meridian/Ledger can operate independently but produce a unified, CSDM-compliant service model when deployed together.

**Design principle:** Any product can be deployed standalone. When multiple products are deployed, their data composes automatically through shared CMDB relationships. No product-to-product API calls required — ServiceNow is the integration bus.

---

## 2. CSDM Layer Model

The Common Service Data Model defines four service layers. Avennorth products populate different layers:

```
┌─────────────────────────────────────────────────────────────────────┐
│  BUSINESS SERVICE LAYER                                             │
│  cmdb_ci_service_auto / cmdb_ci_service_manual                      │
│                                                                     │
│  "Online Patient Portal"         "E-Commerce Operations"            │
│                                                                     │
│  Populated by: Contour (AI-suggested, human-confirmed)              │
├─────────────────────────────────────────────────────────────────────┤
│  BUSINESS APPLICATION LAYER                                         │
│  cmdb_ci_business_app                                               │
│                                                                     │
│  "Patient Portal App"            "Order Processing System"          │
│                                                                     │
│  Populated by: Contour (clustered from app instances)               │
├─────────────────────────────────────────────────────────────────────┤
│  TECHNICAL SERVICE LAYER                                            │
│  cmdb_ci_service_technical                                          │
│                                                                     │
│  "Portal Backend Services"       "Payment Processing Chain"         │
│                                                                     │
│  Populated by: Contour (integration density clustering)             │
├─────────────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE LAYER                                               │
│  cmdb_ci_app_server, cmdb_ci_server, cmdb_ci_cloud_service,        │
│  cmdb_ci_medical_device, x_avnth_* tables                          │
│                                                                     │
│  Servers, VMs, containers, cloud services, medical devices, IoT     │
│                                                                     │
│  Populated by: Pathfinder (Base, Clinical, IoT, Cloud modules)      │
│  Assessed by: Bearing                                               │
│  Incident response: Vantage                                         │
│  Workforce mapping: Meridian                                        │
│  Compliance: Ledger                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Product Data Ownership

Each product owns specific tables and relationship types. Products can READ any table but only WRITE to their owned tables.

| Product | Owns (Write) | Reads From | Relationship Types Created |
|---------|-------------|-----------|--------------------------|
| **Pathfinder Base** | `x_avnth_pathfinder_agent`, `x_avnth_cmdb_ci_integration`, `x_avnth_cmdb_ci_interface`, `x_avnth_integration_health_log` | `cmdb_ci`, `cmdb_ci_server` | `Discovered::DiscoveredBy`, `IntegratesWith::IntegratedWith` |
| **Pathfinder Clinical** | `x_avnth_clinical_device`, `x_avnth_device_tier_config` | `cmdb_ci_medical_device` | `MonitoredBy::Monitors` |
| **Pathfinder Cloud** | `x_avnth_cloud_service`, `x_avnth_cloud_account`, `x_avnth_cloud_dependency` | `cmdb_ci_cloud_service` | `Uses::UsedBy`, `AuthenticatesVia` |
| **Pathfinder IoT** | `x_avnth_iot_device` | `cmdb_ci` | `ControlledBy::Controls` |
| **Discovery Normalization** | `x_avnth_discovery_source`, `x_avnth_normalized_device` | All CI tables | `NormalizedFrom::NormalizedTo` |
| **Contour** | `cmdb_ci_service_auto`, `cmdb_ci_business_app`, `cmdb_ci_service_technical`, `x_avnth_service_model` | All Pathfinder tables | `Contains::ContainedBy`, `DependsOn::DependedOnBy`, `ProvidedBy::Provides` |
| **Bearing** | `x_avnth_bearing_assessment`, `x_avnth_bearing_finding`, `x_avnth_bearing_score` | All CI tables | `AssessedBy::Assesses` |
| **Vantage** | `x_avnth_vantage_incident`, `x_avnth_vantage_escalation` | All CI tables, Contour service maps | `IncidentOn::HasIncident` |
| **Vantage Clinical** | `x_avnth_vantage_clinical_incident`, `x_avnth_vantage_maude_match` | Pathfinder Clinical, Meridian | `ClinicalIncidentOn` |
| **Meridian** | `x_avnth_workforce_mapping`, `x_avnth_clinical_workflow`, `x_avnth_maintenance_window` | Pathfinder Clinical, UKG Pro | `CertifiedOn::HasCertifiedOperator` |
| **Ledger** | `x_avnth_compliance_finding`, `x_avnth_compliance_report` | All CI tables | `ComplianceFindingOn` |

---

## 4. Shared Table Definitions

### 4.1 Infrastructure Layer (Pathfinder-Owned)

**x_avnth_pathfinder_agent** — Enrolled agents

| Field | Type | Description |
|-------|------|-------------|
| agent_id | String (UUID) | Unique agent identifier |
| hostname | String | Server hostname |
| ip_address | String | Primary IP |
| os_type | Choice | Linux / Windows / K8s |
| os_version | String | Kernel/OS version |
| agent_version | String | Pathfinder agent version |
| status | Choice | Active / Stale / Decommissioned |
| coverage_tier | Integer (1-4) | Assigned monitoring tier |
| device_tier | Integer (1-4) | Device classification tier |
| last_heartbeat | DateTime | Most recent heartbeat |
| flows_collected | Integer | Total flows observed |
| module_license | String | Active modules ("base,clinical,cloud") |
| facility | Reference | Facility this agent belongs to |

**x_avnth_cmdb_ci_integration** — Discovered integrations (extends cmdb_ci)

| Field | Type | Description |
|-------|------|-------------|
| source_ci | Reference (cmdb_ci) | Source application/server |
| target_ci | Reference (cmdb_ci) | Target application/server |
| integration_type | Choice | API / Database / Messaging / Email / Directory / File Transfer / Clinical / Cloud |
| classification_confidence | Decimal | 0.0 - 1.0 |
| health_status | Choice | Healthy / Degraded / Critical / Unknown |
| health_score | Integer | 0-100 |
| ai_summary | String (4000) | Claude-generated summary |
| ea_status | Choice | Unmapped / Suggested / Confirmed / Disputed |
| discovery_source | String | Which discovery source |
| first_observed | DateTime | First seen |
| last_observed | DateTime | Most recent |
| flow_count | Integer | Total flows |

**x_avnth_cloud_service** — Discovered cloud/SaaS services (extends cmdb_ci_cloud_service)

| Field | Type | Description |
|-------|------|-------------|
| service_name | String | "Salesforce Sales Cloud" |
| provider | Choice | AWS / Azure / GCP / SaaS / Other |
| service_type | Choice | Compute / Database / Storage / Messaging / Identity / Application / Analytics |
| endpoint_pattern | String | `*.salesforce.com` |
| region | String | Cloud region if applicable |
| unique_clients | Integer | How many on-prem apps connect |
| connection_pattern | Choice | Polling / Event-Driven / Batch / Continuous |
| csdm_category | Choice | Business Application / Technical Service / Infrastructure |
| confidence | Decimal | 0.0 - 1.0 |

**x_avnth_clinical_device** — Clinical device context (extends cmdb_ci_medical_device)

| Field | Type | Description |
|-------|------|-------------|
| fda_product_code | String | FDA classification |
| gmdn_code | String | Global Medical Device Nomenclature |
| udi | String | Unique Device Identifier |
| device_class | Choice | I / II / III |
| life_critical | Boolean | Tier 4 flag |
| department | Reference | Clinical department |
| care_area | String | ICU, OR, ED, etc. |
| last_calibration | Date | Last calibration date |
| calibration_due | Date | Next calibration due |
| clinical_protocol | Choice | HL7 / FHIR / DICOM / IEEE 11073 |

### 4.2 Service Layer (Contour-Owned)

These tables are owned by Contour but defined here so Pathfinder can create the foundation records and Contour can promote them.

**x_avnth_service_model** — Contour's service model metadata

| Field | Type | Description |
|-------|------|-------------|
| model_version | Integer | Version of the service model |
| last_computed | DateTime | When Contour last ran |
| total_business_services | Integer | Count |
| total_business_apps | Integer | Count |
| total_technical_services | Integer | Count |
| confidence_avg | Decimal | Average model confidence |
| status | Choice | Draft / Reviewed / Published |

**Contour writes to standard CSDM tables:**
- `cmdb_ci_service_auto` — Business Services (auto-discovered by Contour)
- `cmdb_ci_business_app` — Business Applications
- `cmdb_ci_service_technical` — Technical Services
- Relationships via `cmdb_rel_ci` with Avennorth-specific relationship types

### 4.3 Assessment Layer (Bearing-Owned)

**x_avnth_bearing_assessment** — Assessment snapshots

| Field | Type | Description |
|-------|------|-------------|
| assessment_id | String (UUID) | Unique assessment run |
| scope | Choice | Full / Targeted / Incremental |
| target_ci | Reference (cmdb_ci) | What was assessed (service, app, or infrastructure) |
| score | Integer (0-100) | Bearing health/maturity score |
| findings_count | Integer | Number of findings |
| run_date | DateTime | When assessment ran |

**x_avnth_bearing_finding** — Individual findings

| Field | Type | Description |
|-------|------|-------------|
| assessment | Reference | Parent assessment |
| finding_type | Choice | Gap / Risk / Recommendation / Positive |
| severity | Choice | Critical / High / Medium / Low / Info |
| category | Choice | Data Quality / Coverage / Relationships / Compliance / Performance |
| description | String (4000) | Finding detail |
| affected_ci | Reference (cmdb_ci) | Which CI is affected |
| remediation | String (2000) | Recommended fix |

### 4.4 Incident Layer (Vantage-Owned)

**x_avnth_vantage_incident** — AI-investigated incidents

| Field | Type | Description |
|-------|------|-------------|
| incident | Reference (incident) | ServiceNow incident |
| investigation_status | Choice | Analyzing / Root Cause Found / Escalated / Resolved |
| root_cause_ci | Reference (cmdb_ci) | Identified root cause |
| blast_radius | JSON | Affected CIs, services, users |
| ai_analysis | String (4000) | Claude analysis |
| confidence | Decimal | Root cause confidence |

### 4.5 Cross-Product Relationship Types

| Relationship | Created By | From | To | Description |
|-------------|-----------|------|-----|-------------|
| `Discovered::DiscoveredBy` | Pathfinder | Agent | CI | Agent discovered this CI |
| `IntegratesWith::IntegratedWith` | Pathfinder | CI | CI | Integration relationship |
| `Uses::UsedBy` | Pathfinder Cloud | CI | Cloud Service | On-prem uses cloud service |
| `Contains::ContainedBy` | Contour | Technical Service | App Instance | Service contains this app |
| `ProvidedBy::Provides` | Contour | Business Service | Technical Service | Business service provided by tech service |
| `DependsOn::DependedOnBy` | Contour | Business App | Business App | Application dependency |
| `AssessedBy::Assesses` | Bearing | CI | Assessment | CI was assessed |
| `IncidentOn::HasIncident` | Vantage | Incident | CI | Incident affects this CI |
| `CertifiedOn::HasCertifiedOperator` | Meridian | Staff | Device | Staff certified on device |
| `ComplianceFindingOn` | Ledger | Finding | CI | Compliance finding on CI |

---

## 5. Data Flow Between Products

```
Pathfinder Base ──────────────────────────────────────┐
  Discovers: servers, apps, integrations              │
  Creates: agent CIs, integration CIs, interfaces     │
                                                       │
Pathfinder Cloud ─────────────────────────────────────┤
  Discovers: SaaS, PaaS, IaaS dependencies            │
  Creates: cloud service CIs, dependency relationships │
                                                       │
Pathfinder Clinical ──────────────────────────────────┤
  Discovers: medical devices, clinical protocols       │
  Creates: clinical device CIs, FDA classification     │
                                                       │
                           ┌───────────────────────────┤
                           │     ServiceNow CMDB       │
                           │    (shared data store)    │
                           ├───────────────────────────┤
                           │                           │
Contour ◄──────────────────┤  Reads Pathfinder data    │
  Assembles: CSDM hierarchy│  Writes: service model    │
  Creates: Business Services, Business Apps, Tech Svcs │
                           │                           │
Bearing ◄──────────────────┤  Reads all CI data        │
  Assesses: CMDB health    │  Writes: scores, findings │
  Consumes: Pathfinder     │                           │
  confidence feed          │                           │
                           │                           │
Vantage ◄──────────────────┤  Reads service maps,      │
  Investigates: incidents  │  CI relationships          │
  Consumes: Pathfinder     │  Writes: investigations   │
  behavioral data          │                           │
                           │                           │
Meridian ◄─────────────────┤  Reads clinical devices   │
  Correlates: workforce    │  + UKG workforce data     │
  Writes: cert mappings    │                           │
                           │                           │
Ledger ◄───────────────────┤  Reads all CIs            │
  Evaluates: compliance    │  Writes: findings, reports│
  Rules + evidence         │                           │
                           └───────────────────────────┘
```

---

## 6. Shared Scoped App Definition

All Avennorth products share a single ServiceNow scoped app: `x_avnth`. This ensures:

- All tables are in the same namespace
- Cross-table relationships work natively
- Single update set deployment per customer
- Shared roles and access control

| Role | Access | Products |
|------|--------|----------|
| `x_avnth.admin` | Full CRUD on all Avennorth tables | All |
| `x_avnth.pathfinder_user` | Read all, write Pathfinder tables | Pathfinder |
| `x_avnth.contour_user` | Read all, write Contour tables | Contour |
| `x_avnth.bearing_user` | Read all, write Bearing tables | Bearing |
| `x_avnth.vantage_user` | Read all, write Vantage tables | Vantage |
| `x_avnth.clinical_user` | Read all, write clinical + Meridian + Ledger | Clinical Extension |
| `x_avnth.analyst` | Read-only on all tables | Any |

---

## 7. Webhook / Event Bus

Products that need real-time notifications use the same webhook publisher pattern established by Pathfinder's Bearing integration:

| Event | Publisher | Consumer(s) | Payload |
|-------|----------|-------------|---------|
| `ci.created` | Pathfinder | Contour, Bearing | CI sys_id, type, confidence |
| `ci.updated` | Pathfinder | Contour, Vantage | CI sys_id, changed fields |
| `ci.health_changed` | Pathfinder | Vantage, Ledger | CI sys_id, old/new health |
| `integration.discovered` | Pathfinder | Contour | Integration CI details |
| `cloud_service.discovered` | Pathfinder Cloud | Contour | Cloud service CI details |
| `service_model.updated` | Contour | Bearing, Vantage | Model version, changed services |
| `assessment.completed` | Bearing | Contour (re-score) | Assessment results |
| `incident.created` | Vantage | Meridian (escalation) | Incident details |
| `compliance.finding` | Ledger | Vantage (if critical) | Finding details |

---

*Avennorth Shared Data Model — v1.0*
*Cross-Product Schema Reference — April 2026*
