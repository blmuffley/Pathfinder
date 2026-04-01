# 06 — Modular Platform Architecture (Armis-Aware)

## 1. Purpose

This document defines Pathfinder's modular platform architecture following ServiceNow's $7.75B acquisition of Armis (announced December 2025, closing H2 2026). The core architectural principle is **discovery-agnostic intelligence**: Pathfinder's clinical and operational intelligence layers work with ANY device discovery source — Pathfinder eBPF agents, Armis, ServiceNow native Discovery, or third-party tools.

**Strategic position:** Pathfinder Base competes on behavioral intelligence (eBPF depth, encrypted environment visibility, confidence scoring), NOT on basic discovery. The clinical extension products (Meridian, Ledger, Vantage Clinical) are structurally impossible for ServiceNow + Armis to replicate because they require cross-platform data (UKG workforce, clinical workflows) that ServiceNow does not own.

---

## 2. Discovery-Agnostic Architecture

### 2.1 Core Principle

Every Pathfinder intelligence layer operates on a **Unified Device Model** fed by a **Discovery Normalization Layer**. The intelligence never assumes eBPF is the source. If a hospital has Armis deployed on clinical VLANs and Pathfinder agents on IT infrastructure, both feeds merge into one device graph.

```
┌──────────────────────────────────────────────────────────────────────┐
│                      DISCOVERY SOURCES                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │Pathfinder│  │  Armis   │  │ServiceNow│  │  Other   │            │
│  │  eBPF    │  │(agentless│  │  native  │  │(Claroty, │            │
│  │  agents  │  │ post-SN  │  │ Discovery│  │ Ordr,etc)│            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
│       │              │              │              │                  │
│  ┌────▼──────────────▼──────────────▼──────────────▼────┐            │
│  │           DISCOVERY NORMALIZATION LAYER                │            │
│  │  • Multi-format translation to Unified Device Model   │            │
│  │  • Cross-source deduplication (MAC, IP, hostname)     │            │
│  │  • Source confidence weighting                        │            │
│  │  • Conflict resolution (newest + highest confidence)  │            │
│  └──────────────────────┬───────────────────────────────┘            │
│                         │                                             │
│  ┌──────────────────────▼───────────────────────────────┐            │
│  │           UNIFIED DEVICE MODEL (ServiceNow CMDB)      │            │
│  │  • Device identity + classification + tier            │            │
│  │  • Behavioral profile (if eBPF source)                │            │
│  │  • FDA / GMDN / UDI (if clinical module active)       │            │
│  │  • Clinical context (dept, care area, workflow)        │            │
│  │  • Confidence score (source-weighted composite)        │            │
│  └──────────────────────┬───────────────────────────────┘            │
│                         │                                             │
│  ┌──────────┬───────────┼───────────┬───────────┬──────────┐        │
│  │ServiceNow│ Meridian  │ Ledger    │ Vantage   │Pathfinder│        │
│  │CMDB CI   │(Clinical  │(Compliance│ Clinical  │Clinical  │        │
│  │Pipeline  │ Ops Graph)│ Automation│(Incidents)│Dashboards│        │
│  └──────────┘    ↕      └───────────┘───────────┘──────────┘        │
│              UKG Pro                                                  │
│           (workforce)                                                 │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 Source Confidence Weighting

| Source | Weight | Rationale |
|--------|--------|-----------|
| Pathfinder eBPF (full behavioral profile) | 1.00 | Kernel-level, encrypted traffic visible, behavioral patterns |
| Pathfinder eBPF (basic, <48h observation) | 0.85 | Agent deployed, insufficient observation time |
| Armis / agentless | 0.70 | Network-level, no kernel visibility, no encrypted insight |
| ServiceNow native Discovery | 0.60 | Active probing, credential-dependent, pattern-based |
| Manual / CSV import | 0.30 | Static, no behavioral validation |

When sources conflict, the system uses: **highest confidence wins, newest timestamp breaks ties.** If Pathfinder eBPF says a device is a PostgreSQL server (0.92 confidence) and Armis says it's a generic Linux host (0.70), the PostgreSQL classification stands.

### 2.3 Why This Architecture Defeats Armis Competition

| Armis (Inside ServiceNow) | Pathfinder Clinical (Discovery-Agnostic) |
|---------------------------|------------------------------------------|
| Discovers devices via agentless network monitoring | Consumes Armis data AND adds behavioral intelligence from eBPF |
| Security-focused: CVE, vulnerability, risk scoring | Clinical operations: workflow mapping, workforce correlation, compliance |
| No UKG workforce integration | Deep UKG Pro integration (Meridian) — structurally impossible for SN |
| No clinical workflow context | Device-to-procedure-to-staff graph |
| No compliance automation | Automated Joint Commission / CMS / FDA evidence (Ledger) |
| No cross-platform incident response | Clinical blast radius + patient safety scoring (Vantage Clinical) |

**Pathfinder Clinical doesn't compete with Armis — it completes it.** A hospital running Armis (now built into ServiceNow) can layer Pathfinder Clinical on top and get the operational intelligence that Armis was never designed to provide.

---

## 3. Platform Structure

### 3.1 Products and Modules

| Component | Type | Dependency | What It Does |
|-----------|------|------------|-------------|
| **Pathfinder Base** | Platform | None | eBPF/ETW behavioral discovery, confidence scoring, CMDB CI pipeline |
| **Pathfinder + Contour Bundle** | Primary offering | None | Base + service mapping intelligence. Default sale. |
| **Pathfinder Clinical** | Add-on module | Base or Armis data | Healthcare protocol parsing, FDA classification, clinical context |
| **Pathfinder IoT** | Add-on module | Base | OT protocol parsing (BACnet, Modbus). Deprioritized post-Armis. |
| **Meridian** | Intelligence module | Base + Clinical + UKG | Clinical Operations Graph. Cross-platform workforce correlation. |
| **Ledger** | Intelligence module | Base + Clinical | Compliance automation. Regulatory rule engine + evidence compilation. |
| **Vantage Clinical** | Vantage extension | Base + Clinical + Vantage | Clinical incident response. Patient safety scoring. Separate product. |

### 3.2 Module Architecture

Meridian and Ledger are **Pathfinder add-on modules** (not standalone products). They deploy as Python FastAPI intelligence services alongside the existing stack (`src/intelligence/`). Both are **horizontal engines with vertical rule packs**:

```
Meridian (Workforce Correlation Module)
├── Core engine: device-to-operator correlation, schedule-aware impact analysis
├── Healthcare rule pack: UKG Pro + clinical certifications + patient workflows
├── [Future] Manufacturing pack: shift schedules + machine certifications
└── [Future] Utilities pack: field tech + substation equipment

Ledger (Compliance Module)
├── Core engine: rule evaluation, evidence compilation, audit trail
├── Healthcare rule pack: Joint Commission, CMS, FDA, state DoH
├── General rule pack: SOC 2, ISO 27001, cyber insurance (available NOW)
├── [Future] Financial pack: SOX, PCI-DSS, GLBA
└── [Future] Federal pack: FedRAMP, NIST 800-53, CMMC
```

Vantage Clinical lives in the **Vantage codebase** and consumes Pathfinder data via webhook/API (same pattern as Bearing integration).

---

## 4. Tiered Device Classification

### 4.1 Device Tiers

| Tier | Category | Examples | Price | Monitoring | Value Driver |
|------|----------|---------|-------|-----------|-------------|
| **1** | Standard IT | Servers, workstations, network, printers, storage | Included in Base | 10s batch, 30s heartbeat | CMDB accuracy, service mapping |
| **2** | IoT / OT | BMS, HVAC, cameras, badge readers, sensors, PDUs | $8-14/device/mo | 10s batch, elevated alerts | Inventory, attack surface reduction |
| **3** | Clinical | Infusion pumps, monitors, imaging, lab, pharmacy dispensers | $8-15/device/mo | 5s batch, high alerting | Compliance, clinical workflow |
| **4** | Life-Critical | ICU ventilators, anesthesia, cardiac, neonatal, surgical nav | $15-25/device/mo | 1s continuous, critical alert | Patient life dependency |

**Note on Tier 3-4 pricing vs. original:** Prices reduced from $18-50 to $8-25 range because in an Armis world, the discovery itself is partially commoditized. The premium is for clinical intelligence (context, compliance, workforce correlation), not discovery alone.

### 4.2 Automatic Tier Assignment

Priority cascade in the classification engine:

```
1. Healthcare protocol match (highest confidence)
   HL7v2 on port 2575 → Tier 3
   DICOM on port 104/11112 → Tier 3
   IEEE 11073 patterns → Tier 4 (bedside life-critical)

2. FDA product code / UDI correlation
   Life-sustaining category → Tier 4
   General medical device → Tier 3

3. Manufacturer + behavioral fingerprint
   GE Healthcare imaging → Tier 3
   Philips IntelliVue monitors → Tier 4
   Honeywell BMS → Tier 2

4. OT protocol match
   BACnet (47808), Modbus (502) → Tier 2

5. Standard IT fallback
   Well-known IT ports → Tier 1 (included in Base)
```

### 4.3 Tier-Specific Monitoring

| Parameter | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|-----------|--------|--------|--------|--------|
| Observation frequency | 10s | 10s | 5s | 1s continuous |
| Heartbeat interval | 30s | 30s | 15s | 5s |
| Stale threshold | 7 days | 3 days | 24 hours | 1 hour |
| Health score update | Hourly | Hourly | 15 min | 5 min |
| Anomaly sensitivity | 3 sigma | 3 sigma | 2 sigma | 1.5 sigma |
| Compliance logging | Basic | Segmentation | FDA + JC + CMS | All + real-time audit |

### 4.4 Medical Device Classification Taxonomy

```
Tier 3 — Clinical Devices
├── Imaging: CT, MRI, X-Ray, Ultrasound, PACS/VNA
├── Laboratory: Analyzers, blood gas, pathology
├── Pharmacy: Automated dispensing, IV compounding
├── Therapeutic: Infusion pumps, radiation therapy, dialysis
├── Monitoring (non-critical): Telemetry, nurse call, RTLS
└── Clinical IT: EHR workstations, dictation, clinical printers

Tier 4 — Life-Critical Devices
├── ICU ventilators
├── Anesthesia machines
├── Cardiac monitors / defibrillators
├── Neonatal monitors
├── Surgical navigation systems
├── ECMO circuits
├── Intra-aortic balloon pumps
└── Heart-lung machines
```

---

## 5. Healthcare Protocol Parsers

All parsers analyze **connection metadata only** — ports, timing, message sizes, protocol negotiation. They NEVER capture PHI content.

| Protocol | Standard | Ports | Discovery Method | Confidence |
|----------|----------|-------|-----------------|------------|
| HL7 v2.x | Health Level Seven | 2575 TCP | Message type headers (ADT, ORM, ORU) via connection patterns | 0.92 |
| FHIR R4 | HL7 FHIR | 443/8080 HTTPS | RESTful path patterns (/Patient, /Observation, /MedicationRequest) | 0.88 |
| DICOM | Digital Imaging | 104, 11112 TCP | Association negotiation preamble, C-STORE/C-FIND patterns | 0.95 |
| IEEE 11073 | Medical Device Comm | Varies | Connection timing patterns characteristic of bedside device polling | 0.93 |
| BACnet | Building Automation | 47808 UDP | BACnet/IP header patterns | 0.90 |

### 5.1 Discovery-Agnostic Protocol Analysis

When Pathfinder eBPF agents are deployed, protocol parsers run on the agent and produce rich behavioral metadata. When only Armis data is available, the Clinical module applies protocol inference from the normalized device model (port assignments, traffic volume patterns, manufacturer data) with lower confidence.

| Scenario | Protocol Analysis Source | Behavioral Profile | Confidence Adjustment |
|----------|------------------------|-------------------|----------------------|
| eBPF agent on clinical VLAN | Agent-side protocol parser | Full (connection patterns, timing, volume) | No adjustment (1.0x) |
| Armis data only | Gateway inference from normalized model | Limited (port + manufacturer + traffic stats) | 0.7x multiplier |
| eBPF + Armis (both available) | Agent parser primary, Armis enrichment | Full + Armis vulnerability data | 1.0x + security enrichment |

---

## 6. ServiceNow Data Model Extensions

### 6.1 New Tables

| Table | Extends | Purpose |
|-------|---------|---------|
| `x_avnth_discovery_source` | — | Track discovery sources, confidence weights, last sync |
| `x_avnth_normalized_device` | `cmdb_ci` | Unified device model: identity, tier, sources, composite confidence |
| `x_avnth_clinical_device` | `cmdb_ci_medical_device` | Clinical context: FDA code, UDI, department, care area, life-critical |
| `x_avnth_device_tier_config` | — | Tier definitions (1-4) with monitoring parameters, pricing rules |
| `x_avnth_compliance_finding` | — | Compliance findings: framework, control, evidence, remediation status |
| `x_avnth_compliance_report` | — | Generated reports: type, scope, findings, audit trail |
| `x_avnth_workforce_mapping` | — | Device-to-operator: staff ID, certification, expiry, source (UKG) |
| `x_avnth_facility` | `cmn_location` | Facility-level: licensing scope, compliance frameworks, device counts |

### 6.2 Discovery Source Record

```javascript
{
  "source_id": "armis-prod-01",
  "source_type": "armis",          // pathfinder_ebpf | armis | sn_discovery | manual | other
  "source_name": "Armis Production",
  "confidence_weight": 0.70,
  "last_sync": "2026-04-01T14:30:00Z",
  "devices_reported": 3847,
  "sync_frequency": "real-time",
  "api_endpoint": "https://armis.service-now.com/api/...",
  "status": "active"
}
```

### 6.3 Unified Device Model Fields

| Field | Type | Source | Purpose |
|-------|------|--------|---------|
| `device_id` | String (UUID) | Normalization layer | Canonical device identifier |
| `primary_source` | Reference (discovery_source) | Highest confidence source | Which source is authoritative |
| `source_count` | Integer | Normalization layer | How many sources report this device |
| `composite_confidence` | Decimal (0-1) | Weighted calculation | Overall classification confidence |
| `device_tier` | Integer (1-4) | Classification engine | Pricing and monitoring tier |
| `tier_override` | Integer (nullable) | Manual | Admin override of auto-assigned tier |
| `behavioral_profile` | JSON | eBPF agent (if available) | Connection patterns, protocol metadata |
| `fda_product_code` | String | Clinical module | FDA regulatory classification |
| `gmdn_code` | String | Clinical module | Global Medical Device Nomenclature |
| `udi` | String | Clinical module / UDI correlation | Unique Device Identifier |
| `life_critical` | Boolean | Tier assignment | Tier 4 flag |
| `department` | Reference (cmn_department) | Clinical context enrichment | Which department owns this device |
| `care_area` | String | Network segment mapping | ICU, OR, ED, NICU, etc. |
| `manufacturer` | String | Protocol fingerprint / Armis / UDI | Device manufacturer |
| `model` | String | UDI + behavioral fingerprint | Specific device model |

---

## 7. Air-Gapped and Segmented Network Support

| Scenario | Solution |
|----------|---------|
| Isolated clinical VLAN | Deploy eBPF agent on gateway appliance with clinical VLAN visibility. OR rely on Armis (agentless) for that segment. |
| Air-gapped network | Agent stores flows locally; periodic export. License uses offline cached key. |
| Firewall-restricted | Single outbound gRPC (8443). No inbound required. |
| Mixed eBPF + Armis | Normalization layer merges both. eBPF takes confidence priority where deployed. |

**Critical constraint:** All Pathfinder observation is passive. No active scanning, no packet injection, no ARP manipulation. Armis may do active probing — that's Armis's responsibility, not Pathfinder's.

---

## 8. Module Activation Framework

### 8.1 License Key

```go
type License struct {
    CustomerID    string            `json:"customer_id"`
    FacilityID    string            `json:"facility_id"`       // for facility-licensed modules
    Modules       []string          `json:"modules"`           // ["base", "clinical", "meridian", "ledger"]
    DeviceLimits  map[int]int       `json:"device_limits"`     // {2: 500, 3: 200, 4: 50}
    Sources       []string          `json:"discovery_sources"` // ["pathfinder", "armis", "sn_discovery"]
    ExpiresAt     time.Time         `json:"expires_at"`
    Signature     string            `json:"signature"`
}
```

### 8.2 Activation Flow

1. License key installed via gateway config or ServiceNow system property
2. Gateway validates signature against Avennorth public key
3. Activated modules register their protocol parsers, classification rules, and enrichers
4. Discovery Normalization Layer enables adapters for licensed sources
5. Intelligence modules (Meridian, Ledger) start their scheduled processing
6. Metered device counts reported monthly for billing

No agent redeployment needed. Module code is present in agent binary but gated. For intelligence modules (Meridian, Ledger), activation deploys the Python FastAPI service container.

---

## 9. Pathfinder + Contour Bundle

The **primary offering** is Pathfinder Base + Contour service mapping at a 30% bundle discount:

| Component | Standalone | Bundle Price |
|-----------|-----------|-------------|
| Pathfinder Base (S-tier, ≤500 nodes) | $50K/yr | $35K/yr |
| Contour (service mapping intelligence) | $50K/yr | $35K/yr |
| **Bundle total** | $100K/yr | **$70K/yr** |

**Positioning:** Replaces ITOM Visibility + Service Mapping at 85-90% lower cost. Behavioral service maps in 30 days vs. 12-24 months for SN Service Mapping pattern library.

This bundle is the default. Sales should never quote Pathfinder Base alone unless the customer explicitly requests discovery-only.

---

## 10. Example: Large Health System Deployment

5 facilities, 15,000 devices across all tiers.

| Component | Quantity | Unit Price | Annual |
|-----------|---------|-----------|--------|
| Pathfinder + Contour Bundle (XL) | 1 | Custom | $200K |
| Tier 2 — IoT/OT devices | 4,000 | $10/dev/mo | $480K |
| Tier 3 — Clinical devices | 3,500 | $12/dev/mo | $504K |
| Tier 4 — Life-critical devices | 500 | $20/dev/mo | $120K |
| Meridian (Workforce Correlation) | 5 facilities | $15K/facility/mo | $900K |
| Ledger (Compliance Automation) | 5 facilities | $7K/facility/mo | $420K |
| Vantage Clinical | 5 facilities | $5K/facility/mo | $300K |
| **Total ACV** | | | **$2,924K/yr** |

A single large health system: **~$3M ACV**. The base platform fee ($200K) is 7% of total — the intelligence layers and per-device tiers are 93%.

---

*Pathfinder Modular Platform Architecture (Armis-Aware) — v2.0*
*Avennorth Confidential — March 2026*
