# 07 — Discovery Normalization Layer: Technical Specification

## 1. Purpose

The Discovery Normalization Layer (DNL) is the single translation boundary between raw device telemetry from multiple discovery sources and the Unified Device Model stored in ServiceNow CMDB. Its job is to accept data in any supported format, deduplicate it, score it, and produce one canonical device record per physical or virtual asset.

This layer exists because no customer runs a single discovery tool. A typical healthcare deployment may have Pathfinder eBPF agents on IT infrastructure, Armis on clinical VLANs (post-ServiceNow acquisition, Armis will become a native SN capability), ServiceNow Discovery on data center servers, and CSV imports for legacy biomedical equipment that cannot be scanned. All of these must collapse into one device graph.

**Design constraint:** Every downstream intelligence module — Meridian (workforce safety), Ledger (compliance), Vantage Clinical (care continuity), and Pathfinder Base (integration governance) — consumes the Unified Device Model. None of them reference raw source data. If the DNL does its job correctly, the intelligence layer never needs to know how a device was discovered.

**Scope:** This specification covers:

- Source adapter contracts for four discovery sources
- Deduplication engine logic and matching hierarchy
- Confidence scoring formula with source weights, recency, and behavioral adjustments
- Unified Device Model schema (ServiceNow table definition)
- REST API contract with request/response examples
- Processing pipeline (ingest through CMDB upsert)
- Armis coexistence patterns for the post-acquisition landscape

---

## 2. Source Adapters

Each source adapter is a standalone Go module in `src/gateway/internal/adapters/` that implements the `SourceAdapter` interface:

```go
type SourceAdapter interface {
    Name() string
    Weight() float64
    Ingest(ctx context.Context) (<-chan RawDeviceRecord, error)
    Transform(raw RawDeviceRecord) (IntermediateDevice, error)
    HealthCheck(ctx context.Context) error
}
```

### 2.1 Pathfinder eBPF Agent Adapter

| Property | Value |
|----------|-------|
| **Adapter ID** | `pathfinder_ebpf` |
| **Input format** | gRPC stream (protobuf) |
| **Transport** | mTLS gRPC on port 8443 |
| **Push/Poll** | Push — agents stream observations in real time |
| **Confidence weight** | **1.0** (highest — kernel-level, tamper-resistant) |
| **Module path** | `src/gateway/internal/adapters/ebpf/` |

**Fields extracted:**

| Source Field | UDM Mapping | Notes |
|-------------|-------------|-------|
| `agent_id` | `primary_source_id` | Unique agent enrollment ID |
| `observed_mac` | `mac_address` | From eBPF socket filter |
| `observed_ip` | `ip_address` | IPv4 or IPv6 |
| `hostname` | `hostname` | Reverse DNS or mDNS |
| `process_name` | `behavioral_profile.processes[]` | Kernel-level process tree |
| `protocol` | `protocol_metadata` | L4/L7 protocol classification |
| `flow_records[]` | `behavioral_profile.flows[]` | Source/dest/port/bytes/duration |
| `tls_fingerprint` | `behavioral_profile.tls_ja3` | JA3/JA3S hash |
| `manufacturer_oui` | `manufacturer` | Derived from MAC OUI lookup |
| `uptime_seconds` | `last_seen` | Computed from first/last observation |

**gRPC message (simplified):**

```protobuf
message DeviceObservation {
  string agent_id = 1;
  bytes  mac_address = 2;
  string ip_address = 3;
  string hostname = 4;
  repeated FlowRecord flows = 5;
  repeated ProcessInfo processes = 6;
  string tls_ja3_hash = 7;
  google.protobuf.Timestamp observed_at = 8;
}
```

**Behavioral richness:** This adapter is the only source that provides kernel-level behavioral data (process names, flow patterns, TLS fingerprints). This is why it carries a 1.0 confidence weight — the data is both deep and difficult to spoof.

---

### 2.2 Armis Adapter

| Property | Value |
|----------|-------|
| **Adapter ID** | `armis` |
| **Input format** | REST API (JSON) — transitioning to SN table query post-acquisition |
| **Transport** | HTTPS with API key or OAuth |
| **Push/Poll** | Poll — 5-minute default interval (configurable) |
| **Confidence weight** | **0.70** (agentless — inferred classification) |
| **Module path** | `src/gateway/internal/adapters/armis/` |

**Fields extracted:**

| Source Field | UDM Mapping | Notes |
|-------------|-------------|-------|
| `id` | `source_records[].source_id` | Armis internal device ID |
| `macAddress` | `mac_address` | Primary hardware identifier |
| `ipAddress` | `ip_address` | Current IP |
| `name` | `hostname` | Armis-resolved device name |
| `type` | `device_category` | Armis device type taxonomy |
| `manufacturer` | `manufacturer` | Device manufacturer |
| `model` | `model` | Device model |
| `operatingSystem` | `os_name` | Detected OS |
| `riskLevel` | `risk_score` | Armis risk rating (1-10) |
| `vulnerabilities[]` | `vulnerability_data` | CVE list with severity |
| `networkSegment` | `network_segment` | VLAN/subnet identifier |
| `lastSeen` | `last_seen` | Last observation timestamp |
| `category` | `device_subcategory` | Armis subcategory |
| `serialNumber` | `serial_number` | If available via SNMP/API |

**Armis API call:**

```http
GET https://api.armis.com/api/v1/devices?after={cursor}&length=1000
Authorization: Bearer {api_key}
Accept: application/json
```

**Post-acquisition path:** When Armis becomes a native ServiceNow capability, this adapter will switch from REST API polling to querying the `sn_armis_device` table (or equivalent). The adapter interface remains unchanged; only the transport layer is swapped.

---

### 2.3 ServiceNow Native Discovery Adapter

| Property | Value |
|----------|-------|
| **Adapter ID** | `sn_discovery` |
| **Input format** | ServiceNow Table API (GlideRecord / REST) |
| **Transport** | HTTPS with OAuth 2.0 |
| **Push/Poll** | Poll — queries `cmdb_ci` and subclass tables on schedule |
| **Confidence weight** | **0.60** (active probing — reliable but shallow) |
| **Module path** | `src/gateway/internal/adapters/sn_discovery/` |

**Fields extracted:**

| Source Field | UDM Mapping | Notes |
|-------------|-------------|-------|
| `sys_id` | `source_records[].source_id` | ServiceNow sys_id |
| `mac_address` | `mac_address` | From `cmdb_ci_hardware` |
| `ip_address` | `ip_address` | From `cmdb_ci_ip_address` |
| `name` | `hostname` | CI name |
| `manufacturer` | `manufacturer` | From `cmdb_ci_hardware` |
| `model_number` | `model` | Hardware model |
| `serial_number` | `serial_number` | Asset serial |
| `os` | `os_name` | Discovered OS |
| `os_version` | `os_version` | OS version string |
| `discovery_source` | — | Used for provenance tracking |
| `last_discovered` | `last_seen` | Last successful discovery probe |
| `sys_class_name` | `device_category` | Maps SN CI class to UDM category |

**ServiceNow REST query:**

```http
GET https://{instance}.service-now.com/api/now/table/cmdb_ci_hardware
  ?sysparm_query=last_discovered>=javascript:gs.daysAgoStart(7)
  &sysparm_fields=sys_id,name,mac_address,ip_address,manufacturer,model_number,serial_number,os,os_version,last_discovered,sys_class_name
  &sysparm_limit=500
Authorization: Bearer {oauth_token}
Accept: application/json
```

---

### 2.4 Generic Import Adapter

| Property | Value |
|----------|-------|
| **Adapter ID** | `generic_import` |
| **Input format** | CSV or JSON file upload |
| **Transport** | REST API file upload or filesystem watch directory |
| **Push/Poll** | Push — file uploaded triggers processing |
| **Confidence weight** | **0.30** (manual — no verification, high error rate) |
| **Module path** | `src/gateway/internal/adapters/generic_import/` |

**Fields extracted (CSV column mapping):**

| CSV Column | UDM Mapping | Required |
|-----------|-------------|----------|
| `mac_address` | `mac_address` | Recommended |
| `ip_address` | `ip_address` | Yes |
| `hostname` | `hostname` | Yes |
| `manufacturer` | `manufacturer` | No |
| `model` | `model` | No |
| `serial_number` | `serial_number` | No |
| `device_type` | `device_category` | No |
| `location` | `location` | No |
| `department` | `department` | No |
| `notes` | `import_notes` | No |

**JSON import schema:**

```json
{
  "source_name": "biomedical_inventory_2026",
  "import_date": "2026-03-31T00:00:00Z",
  "devices": [
    {
      "mac_address": "00:1A:2B:3C:4D:5E",
      "ip_address": "10.50.12.100",
      "hostname": "infusion-pump-icu-04",
      "manufacturer": "Baxter",
      "model": "Sigma Spectrum",
      "serial_number": "BSP-2024-00412",
      "device_type": "infusion_pump",
      "department": "ICU",
      "fda_product_code": "FRN",
      "udi": "(01)00850003042400(21)BSP-2024-00412"
    }
  ]
}
```

**Validation rules for generic import:**

- At minimum, `ip_address` + `hostname` must be provided
- MAC addresses validated against IEEE OUI format
- Duplicate rows within the same file are collapsed before ingestion
- Import records tagged with `import_batch_id` for traceability and rollback

---

## 3. Deduplication Engine

The deduplication engine runs after every adapter transforms its data to the intermediate format. Its job is to determine whether an incoming record represents a device already in the Unified Device Model or a new device.

### 3.1 Matching Hierarchy

Matching proceeds through four tiers. The engine stops at the first tier that produces a single unambiguous match.

| Tier | Match Key | Confidence | Notes |
|------|-----------|------------|-------|
| **1 — Primary** | MAC address | 0.99 | Most reliable hardware identifier. Handles multi-NIC devices by tracking all MACs per device. |
| **2 — Secondary** | IP address + hostname | 0.85 | Used when MAC unavailable (some agentless scans). Anchored by hostname to avoid DHCP false matches. |
| **3 — Tertiary** | Serial number or UDI | 0.90 | Primary match for medical devices where serial/UDI is the gold standard identifier. |
| **4 — Fuzzy** | Manufacturer + model + network segment | 0.50 | Last resort. Used for devices with no hardware identifiers. Requires manual confirmation if fuzzy score < 0.70. |

### 3.2 Matching Algorithm

```
FUNCTION match_device(incoming):
    # Tier 1: MAC address
    IF incoming.mac_address IS NOT NULL:
        candidates = query_udm(mac_address = incoming.mac_address)
        IF candidates.count == 1:
            RETURN (candidates[0], match_tier=1, match_confidence=0.99)
        IF candidates.count > 1:
            LOG warning "Multiple devices share MAC {incoming.mac_address}"
            RETURN (best_candidate(candidates, incoming), match_tier=1, match_confidence=0.90)

    # Tier 2: IP + hostname
    IF incoming.ip_address IS NOT NULL AND incoming.hostname IS NOT NULL:
        candidates = query_udm(ip_address = incoming.ip_address, hostname = incoming.hostname)
        IF candidates.count == 1:
            RETURN (candidates[0], match_tier=2, match_confidence=0.85)

    # Tier 3: Serial number / UDI
    IF incoming.serial_number IS NOT NULL:
        candidates = query_udm(serial_number = incoming.serial_number)
        IF candidates.count == 1:
            RETURN (candidates[0], match_tier=3, match_confidence=0.90)
    IF incoming.udi IS NOT NULL:
        candidates = query_udm(udi = incoming.udi)
        IF candidates.count == 1:
            RETURN (candidates[0], match_tier=3, match_confidence=0.95)

    # Tier 4: Fuzzy
    IF incoming.manufacturer IS NOT NULL AND incoming.model IS NOT NULL:
        candidates = fuzzy_query_udm(
            manufacturer = incoming.manufacturer,
            model = incoming.model,
            network_segment = incoming.network_segment
        )
        IF candidates.count == 1 AND candidates[0].fuzzy_score >= 0.70:
            RETURN (candidates[0], match_tier=4, match_confidence=candidates[0].fuzzy_score)
        IF candidates.count >= 1 AND candidates[0].fuzzy_score < 0.70:
            FLAG for_manual_review(incoming, candidates)
            RETURN (NULL, match_tier=4, match_confidence=0.0)

    # No match
    RETURN (NULL, match_tier=0, match_confidence=0.0)
```

### 3.3 Merge Strategy

When a match is found, the existing device record is updated using confidence-weighted field resolution:

1. **For each field in the incoming record:**
   - Compute the incoming field's effective confidence (source weight x recency adjustment x behavioral bonus)
   - Compare against the existing field's stored confidence
   - If incoming confidence > existing confidence: overwrite the field
   - If incoming confidence <= existing confidence: retain existing value, store incoming as an alternate in `source_records[]`

2. **Source record linkage:** Every incoming observation is appended to the device's `source_records[]` array, preserving full provenance regardless of whether it won any field-level merge.

3. **Multi-MAC handling:** Devices with multiple NICs (servers, network appliances) maintain a `mac_addresses[]` array. A match on any MAC in the array links to the same device.

4. **IP volatility:** IP addresses are stored with a `last_confirmed` timestamp. IPs not confirmed within 24 hours are marked `stale`. IPs not confirmed within 7 days are moved to `historical_ips[]`.

---

## 4. Confidence Scoring

### 4.1 Formula

The composite confidence score for each field on a device record is calculated as:

```
composite_confidence = (source_weight * field_confidence) + recency_bonus + behavioral_bonus
```

Where:

| Component | Calculation |
|-----------|-------------|
| `source_weight` | Fixed per adapter: eBPF=1.0, Armis=0.70, SN Discovery=0.60, Generic=0.30 |
| `field_confidence` | Adapter-specific certainty for that particular field (0.0-1.0). E.g., Armis may report manufacturer with 0.95 but OS with 0.60. |
| `recency_bonus` | +0.05 if data updated within 24 hours. 0.00 if 1-7 days old. -0.10 if older than 7 days. -0.20 if older than 30 days. |
| `behavioral_bonus` | +0.10 when behavioral patterns observed by eBPF match the device's current classification. 0.00 otherwise. |

### 4.2 Source Weight Table

| Source | Base Weight | Rationale |
|--------|-------------|-----------|
| Pathfinder eBPF | **1.00** | Kernel-level observation. Cannot be spoofed without root. Process-level behavioral data provides highest fidelity. |
| Armis | **0.70** | Agentless passive monitoring. Strong device fingerprinting but inference-based — no kernel access. |
| ServiceNow Discovery | **0.60** | Active probing (SNMP, WMI, SSH). Reliable for IT assets but limited protocol depth. No behavioral profiling. |
| Generic Import | **0.30** | Manual data. No automated verification. Prone to stale entries and human error. |

### 4.3 Recency Adjustments

| Data Age | Adjustment | Rationale |
|----------|------------|-----------|
| < 24 hours | +0.05 | Fresh data is more trustworthy |
| 1-7 days | 0.00 | Baseline — no adjustment |
| 7-30 days | -0.10 | Starting to go stale |
| > 30 days | -0.20 | Significantly stale — may reflect a device that has moved, been decommissioned, or changed |

### 4.4 Behavioral Confirmation Bonus

When Pathfinder eBPF agents observe a device's network behavior and that behavior matches the device's current classification, a +0.10 bonus is applied to all fields on that device record. This bonus reflects the fact that behavioral observation has independently confirmed the classification.

**Example:** A device classified as `infusion_pump` (Tier 3 clinical) is observed by eBPF communicating on HL7 port 2575 with flow patterns consistent with medication delivery protocols. The behavioral match triggers +0.10 across all fields.

### 4.5 Conflict Resolution

When two or more sources provide different values for the same field:

1. Compute composite confidence for each source's value
2. The value with the highest composite confidence wins and becomes the canonical value
3. If two values have identical composite confidence (within 0.01 tolerance), the more recently observed value wins
4. All losing values are preserved in `source_records[]` for audit and override capability
5. If the confidence gap between winner and runner-up is less than 0.15, the field is flagged as `low_confidence_resolution` for human review

**Example conflict resolution:**

| Field | eBPF Value | Armis Value | Winner |
|-------|-----------|-------------|--------|
| `manufacturer` | (not observed) | "Baxter" (0.70 x 0.95 + 0.05 = 0.715) | Armis — only source |
| `device_category` | "infusion_pump" (1.0 x 1.0 + 0.05 + 0.10 = 1.15) | "medical_device" (0.70 x 0.80 + 0.05 = 0.61) | eBPF — higher composite, more specific |
| `ip_address` | "10.50.12.100" (1.0 x 1.0 + 0.05 = 1.05) | "10.50.12.100" (0.70 x 1.0 + 0.05 = 0.75) | Agreement — eBPF confidence stored |

---

## 5. Unified Device Model Schema

ServiceNow table: `x_avnth_unified_device` (extends `cmdb_ci`)

### 5.1 Identity Fields

| Field | Column Name | Type | Max Length | Description |
|-------|------------|------|------------|-------------|
| Device ID | `device_id` | String (UUID) | 36 | System-generated canonical identifier |
| Hostname | `hostname` | String | 255 | Resolved device hostname |
| MAC Address (primary) | `mac_address` | String | 17 | Primary MAC (XX:XX:XX:XX:XX:XX) |
| MAC Addresses (all) | `mac_addresses` | JSON | 4000 | Array of all observed MACs |
| IP Address (current) | `ip_address` | String | 45 | Current primary IP (v4 or v6) |
| Historical IPs | `historical_ips` | JSON | 4000 | Array of previous IPs with timestamps |
| Serial Number | `serial_number` | String | 128 | Hardware serial number |
| Manufacturer | `manufacturer` | String | 255 | Device manufacturer (OUI or reported) |
| Model | `model` | String | 255 | Device model identifier |
| OS Name | `os_name` | String | 128 | Operating system name |
| OS Version | `os_version` | String | 64 | Operating system version |

### 5.2 Classification Fields

| Field | Column Name | Type | Values | Description |
|-------|------------|------|--------|-------------|
| Device Tier | `device_tier` | Integer | 1-4 | Criticality tier (1=network infra, 2=standard IT, 3=clinical, 4=life-critical) |
| Device Category | `device_category` | String (choice) | See taxonomy | Primary device classification |
| Device Subcategory | `device_subcategory` | String (choice) | See taxonomy | Specific device type within category |
| Classification Method | `classification_method` | String (choice) | `behavioral`, `fingerprint`, `manual`, `imported` | How classification was determined |
| Classification Confidence | `classification_confidence` | Decimal | 0.00-1.00 | Composite confidence in the classification |

### 5.3 Source Tracking Fields

| Field | Column Name | Type | Description |
|-------|------------|------|-------------|
| Primary Source | `primary_source` | String (choice) | Adapter ID of the highest-confidence source |
| Source Count | `source_count` | Integer | Number of distinct sources that have observed this device |
| Source Records | `source_records` | JSON | Per-source observation details (see schema below) |
| First Seen | `first_seen` | DateTime | Earliest observation across all sources |
| Last Seen | `last_seen` | DateTime | Most recent observation across all sources |
| Last Reconciled | `last_reconciled` | DateTime | Last time dedup engine processed this record |

**`source_records` JSON schema:**

```json
[
  {
    "source_adapter": "pathfinder_ebpf",
    "source_id": "agent-7f3a-east-icu-04",
    "first_seen": "2026-02-15T08:30:00Z",
    "last_seen": "2026-03-31T14:22:00Z",
    "observation_count": 48291,
    "field_confidences": {
      "mac_address": 1.0,
      "ip_address": 1.0,
      "hostname": 0.95,
      "device_category": 1.0,
      "manufacturer": 0.80
    }
  },
  {
    "source_adapter": "armis",
    "source_id": "armis-device-98234",
    "first_seen": "2026-01-10T12:00:00Z",
    "last_seen": "2026-03-31T14:15:00Z",
    "observation_count": 1247,
    "field_confidences": {
      "mac_address": 0.95,
      "ip_address": 0.90,
      "manufacturer": 0.95,
      "model": 0.95,
      "vulnerability_data": 0.85
    }
  }
]
```

### 5.4 Clinical Fields

| Field | Column Name | Type | Description |
|-------|------------|------|-------------|
| FDA Product Code | `fda_product_code` | String (10) | FDA product classification code |
| GMDN Code | `gmdn_code` | String (10) | Global Medical Device Nomenclature code |
| UDI | `udi` | String (128) | Unique Device Identifier (GS1 or HIBCC format) |
| Life Critical | `life_critical` | Boolean | True if device directly supports life-sustaining care |
| Department | `department` | Reference | ServiceNow `cmn_department` reference |
| Care Area | `care_area` | String (choice) | `icu`, `or`, `ed`, `nicu`, `general`, `imaging`, `lab`, `pharmacy` |
| Clinical Workflow | `clinical_workflow` | String | Associated clinical workflow identifier |
| Patient Data Capable | `patient_data_capable` | Boolean | Whether device can store or transmit PHI |

### 5.5 Behavioral Fields

| Field | Column Name | Type | Description |
|-------|------------|------|-------------|
| Behavioral Profile | `behavioral_profile` | JSON | Full behavioral fingerprint (see schema below) |
| Protocol Metadata | `protocol_metadata` | JSON | Observed L4/L7 protocols and ports |
| Last Behavioral Update | `last_behavioral_update` | DateTime | When behavioral profile was last refreshed |
| Behavioral Baseline | `behavioral_baseline` | JSON | Established "normal" behavior for anomaly detection |
| Behavioral Drift Score | `behavioral_drift_score` | Decimal | 0.0 (stable) to 1.0 (fully anomalous) |

**`behavioral_profile` JSON schema:**

```json
{
  "processes": ["hl7_listener", "dicom_scp", "https_client"],
  "flows": [
    {
      "dest_ip": "10.50.1.10",
      "dest_port": 2575,
      "protocol": "HL7v2",
      "avg_bytes_per_hour": 42000,
      "pattern": "periodic_push",
      "interval_seconds": 300
    }
  ],
  "tls_ja3": "e7d705a3286e19ea42f587b344ee6865",
  "dns_queries": ["ehr.hospital.local", "ntp.hospital.local"],
  "listening_ports": [2575, 11112],
  "communication_peers_count": 4,
  "profile_generated_at": "2026-03-31T12:00:00Z"
}
```

### 5.6 Lifecycle Fields

| Field | Column Name | Type | Description |
|-------|------------|------|-------------|
| Firmware Version | `firmware_version` | String (64) | Current firmware/software version |
| Last Patch | `last_patch` | DateTime | Date of most recent patch or update |
| End of Life Date | `end_of_life_date` | Date | Manufacturer end-of-life date |
| End of Support Date | `end_of_support_date` | Date | Manufacturer end-of-support date |
| Lifecycle Stage | `lifecycle_stage` | String (choice) | `active`, `maintenance`, `end_of_sale`, `end_of_life`, `decommissioned` |
| Replacement Device | `replacement_device` | Reference | Points to recommended replacement in UDM |

### 5.7 Compliance Fields

| Field | Column Name | Type | Description |
|-------|------------|------|-------------|
| Compliance Status | `compliance_status` | String (choice) | `compliant`, `non_compliant`, `exempt`, `pending_review` |
| Last Compliance Check | `last_compliance_check` | DateTime | Most recent compliance evaluation |
| Compliance Frameworks | `compliance_frameworks` | JSON | Applicable frameworks and per-framework status |
| Risk Score | `risk_score` | Integer (1-10) | Aggregated risk score across all sources |
| Vulnerability Data | `vulnerability_data` | JSON | CVE list with severity and remediation status |

**`compliance_frameworks` JSON schema:**

```json
[
  {
    "framework": "HIPAA",
    "status": "compliant",
    "last_assessed": "2026-03-15T00:00:00Z",
    "findings": []
  },
  {
    "framework": "FDA_PATCH",
    "status": "non_compliant",
    "last_assessed": "2026-03-15T00:00:00Z",
    "findings": ["firmware_outdated_by_180_days"]
  }
]
```

---

## 6. API Contract

Base URL: `https://{gateway_host}:8443/api/v1/normalize`

All endpoints require a valid Bearer token issued by the Pathfinder gateway authentication service.

### 6.1 POST /ingest — Bulk Ingest

Accepts device records from any source adapter. The adapter ID determines which transformation rules apply.

**Request:**

```http
POST /api/v1/normalize/ingest
Content-Type: application/json
Authorization: Bearer {token}
```

```json
{
  "source_adapter": "armis",
  "batch_id": "armis-poll-20260331-1422",
  "devices": [
    {
      "source_id": "armis-device-98234",
      "mac_address": "00:1A:2B:3C:4D:5E",
      "ip_address": "10.50.12.100",
      "hostname": "infusion-pump-icu-04",
      "manufacturer": "Baxter",
      "model": "Sigma Spectrum",
      "device_type": "infusion_pump",
      "risk_level": 7,
      "vulnerabilities": [
        {"cve": "CVE-2025-3891", "severity": "HIGH"}
      ],
      "last_seen": "2026-03-31T14:15:00Z"
    }
  ]
}
```

**Response (200 OK):**

```json
{
  "batch_id": "armis-poll-20260331-1422",
  "processed": 1,
  "results": [
    {
      "source_id": "armis-device-98234",
      "action": "merged",
      "device_id": "d7f3a1b2-4e5c-6d7e-8f9a-0b1c2d3e4f5a",
      "match_tier": 1,
      "match_confidence": 0.99,
      "fields_updated": ["vulnerability_data", "risk_score", "last_seen"],
      "fields_retained": ["device_category", "manufacturer"]
    }
  ],
  "errors": []
}
```

**Response (207 Multi-Status — partial success):**

```json
{
  "batch_id": "import-batch-20260331",
  "processed": 50,
  "results": [
    {"source_id": "row-1", "action": "created", "device_id": "..."},
    {"source_id": "row-2", "action": "merged", "device_id": "..."}
  ],
  "errors": [
    {
      "source_id": "row-47",
      "error": "VALIDATION_FAILED",
      "message": "Missing required field: ip_address"
    }
  ]
}
```

---

### 6.2 GET /device/{id} — Get Unified Device Record

**Request:**

```http
GET /api/v1/normalize/device/d7f3a1b2-4e5c-6d7e-8f9a-0b1c2d3e4f5a
Authorization: Bearer {token}
```

**Response (200 OK):**

```json
{
  "device_id": "d7f3a1b2-4e5c-6d7e-8f9a-0b1c2d3e4f5a",
  "hostname": "infusion-pump-icu-04",
  "mac_address": "00:1A:2B:3C:4D:5E",
  "ip_address": "10.50.12.100",
  "serial_number": "BSP-2024-00412",
  "manufacturer": "Baxter",
  "model": "Sigma Spectrum",
  "device_tier": 4,
  "device_category": "infusion_pump",
  "device_subcategory": "large_volume_pump",
  "classification_confidence": 0.97,
  "classification_method": "behavioral",
  "primary_source": "pathfinder_ebpf",
  "source_count": 2,
  "first_seen": "2026-01-10T12:00:00Z",
  "last_seen": "2026-03-31T14:22:00Z",
  "fda_product_code": "FRN",
  "udi": "(01)00850003042400(21)BSP-2024-00412",
  "life_critical": true,
  "department": "ICU",
  "care_area": "icu",
  "behavioral_profile": {
    "processes": ["hl7_listener"],
    "flows": [
      {
        "dest_ip": "10.50.1.10",
        "dest_port": 2575,
        "protocol": "HL7v2",
        "pattern": "periodic_push"
      }
    ],
    "communication_peers_count": 4
  },
  "compliance_status": "non_compliant",
  "compliance_frameworks": [
    {"framework": "FDA_PATCH", "status": "non_compliant"}
  ],
  "risk_score": 7,
  "lifecycle_stage": "active",
  "source_records": [
    {
      "source_adapter": "pathfinder_ebpf",
      "source_id": "agent-7f3a-east-icu-04",
      "last_seen": "2026-03-31T14:22:00Z",
      "observation_count": 48291
    },
    {
      "source_adapter": "armis",
      "source_id": "armis-device-98234",
      "last_seen": "2026-03-31T14:15:00Z",
      "observation_count": 1247
    }
  ]
}
```

---

### 6.3 GET /devices — Filtered Query

**Request:**

```http
GET /api/v1/normalize/devices?tier=3&source=armis&limit=50&offset=0
Authorization: Bearer {token}
```

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `tier` | Integer | Filter by device tier (1-4) |
| `source` | String | Filter by source adapter ID |
| `category` | String | Filter by device category |
| `care_area` | String | Filter by care area |
| `compliance_status` | String | Filter by compliance status |
| `min_confidence` | Decimal | Minimum classification confidence |
| `last_seen_after` | ISO 8601 | Only devices seen after this timestamp |
| `limit` | Integer | Page size (default 50, max 500) |
| `offset` | Integer | Pagination offset |

**Response (200 OK):**

```json
{
  "total": 142,
  "limit": 50,
  "offset": 0,
  "devices": [
    {
      "device_id": "d7f3a1b2-4e5c-6d7e-8f9a-0b1c2d3e4f5a",
      "hostname": "infusion-pump-icu-04",
      "device_tier": 3,
      "device_category": "infusion_pump",
      "primary_source": "pathfinder_ebpf",
      "source_count": 2,
      "classification_confidence": 0.97,
      "last_seen": "2026-03-31T14:22:00Z"
    }
  ]
}
```

---

### 6.4 POST /reconcile — Trigger Manual Reconciliation

Forces the dedup engine to re-evaluate all devices (or a subset) across sources. Use after a large import or when source adapter configurations change.

**Request:**

```http
POST /api/v1/normalize/reconcile
Content-Type: application/json
Authorization: Bearer {token}
```

```json
{
  "scope": "source",
  "source_adapter": "armis",
  "force_rematch": false,
  "dry_run": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `scope` | String | `all`, `source`, `tier`, `stale` |
| `source_adapter` | String | Required when scope is `source` |
| `device_tier` | Integer | Required when scope is `tier` |
| `force_rematch` | Boolean | Re-run dedup even on previously confirmed matches |
| `dry_run` | Boolean | Preview changes without applying them |

**Response (202 Accepted):**

```json
{
  "reconciliation_id": "recon-20260331-001",
  "scope": "source:armis",
  "status": "running",
  "estimated_devices": 3400,
  "dry_run": true,
  "status_url": "/api/v1/normalize/reconcile/recon-20260331-001"
}
```

**Status poll response (200 OK):**

```json
{
  "reconciliation_id": "recon-20260331-001",
  "status": "completed",
  "started_at": "2026-03-31T15:00:00Z",
  "completed_at": "2026-03-31T15:02:34Z",
  "results": {
    "devices_evaluated": 3400,
    "new_merges": 12,
    "reclassifications": 3,
    "conflicts_flagged": 7,
    "no_change": 3378
  }
}
```

---

### 6.5 GET /conflicts — List Source Disagreements

Returns devices where two or more sources provide conflicting values for the same field and the confidence gap is less than 0.15 (low-confidence resolution).

**Request:**

```http
GET /api/v1/normalize/conflicts?status=open&limit=25
Authorization: Bearer {token}
```

**Response (200 OK):**

```json
{
  "total": 7,
  "conflicts": [
    {
      "conflict_id": "conf-a1b2c3",
      "device_id": "d7f3a1b2-4e5c-6d7e-8f9a-0b1c2d3e4f5a",
      "hostname": "unknown-device-radiology-02",
      "field": "device_category",
      "status": "open",
      "values": [
        {
          "source": "armis",
          "value": "imaging_system",
          "composite_confidence": 0.68
        },
        {
          "source": "sn_discovery",
          "value": "workstation",
          "composite_confidence": 0.62
        }
      ],
      "confidence_gap": 0.06,
      "current_winner": "armis",
      "flagged_at": "2026-03-31T10:15:00Z"
    }
  ]
}
```

---

### 6.6 GET /stats — Normalization Statistics

**Request:**

```http
GET /api/v1/normalize/stats
Authorization: Bearer {token}
```

**Response (200 OK):**

```json
{
  "generated_at": "2026-03-31T15:00:00Z",
  "total_devices": 14823,
  "by_source": {
    "pathfinder_ebpf": {"devices": 8234, "exclusive": 3102},
    "armis": {"devices": 9412, "exclusive": 4891},
    "sn_discovery": {"devices": 6201, "exclusive": 1544},
    "generic_import": {"devices": 412, "exclusive": 86}
  },
  "by_tier": {
    "1": 1203,
    "2": 7891,
    "3": 4122,
    "4": 1607
  },
  "dedup_stats": {
    "total_source_records": 24259,
    "unique_devices": 14823,
    "dedup_ratio": 1.64,
    "multi_source_devices": 5814,
    "single_source_devices": 9009
  },
  "confidence_distribution": {
    "high_confidence_gt_080": 11234,
    "medium_confidence_050_080": 2891,
    "low_confidence_lt_050": 698
  },
  "open_conflicts": 7,
  "last_reconciliation": "2026-03-31T15:00:00Z"
}
```

---

## 7. Processing Pipeline

### 7.1 Pipeline Flow

```
                                  INGEST
                                    │
         ┌──────────┬───────────────┼──────────────┬──────────────┐
         │          │               │              │              │
    ┌────▼────┐ ┌───▼────┐  ┌──────▼─────┐  ┌────▼────┐         │
    │Pathfinder│ │ Armis  │  │SN Discovery│  │ Generic │         │
    │  eBPF   │ │Adapter │  │  Adapter   │  │ Import  │         │
    └────┬────┘ └───┬────┘  └──────┬─────┘  └────┬────┘         │
         │          │               │              │              │
         └──────────┴───────────────┴──────────────┘              │
                                    │                             │
                         ┌──────────▼──────────┐                  │
                         │   TRANSFORM         │                  │
                         │ (to intermediate    │                  │
                         │  format)            │                  │
                         └──────────┬──────────┘                  │
                                    │                             │
                         ┌──────────▼──────────┐                  │
                         │   DEDUP ENGINE      │                  │
                         │ Match: MAC → IP+host│                  │
                         │  → Serial → Fuzzy   │                  │
                         └────┬─────────┬──────┘                  │
                              │         │                         │
                         MATCH FOUND  NO MATCH                    │
                              │         │                         │
                    ┌─────────▼───┐  ┌──▼───────────┐            │
                    │   MERGE     │  │  CREATE       │            │
                    │ (confidence │  │  (new device  │            │
                    │  weighted)  │  │   record)     │            │
                    └─────────┬───┘  └──┬───────────┘            │
                              │         │                         │
                              └────┬────┘                         │
                                   │                              │
                         ┌─────────▼──────────┐                   │
                         │  TIER ASSIGNMENT   │                   │
                         │ Protocol → FDA →   │                   │
                         │ Manufacturer →     │                   │
                         │ Fallback           │                   │
                         └─────────┬──────────┘                   │
                                   │                              │
                         ┌─────────▼──────────┐                   │
                         │ CLINICAL ENRICHMENT│                   │
                         │ (if clinical module │                   │
                         │  is active)        │                   │
                         └─────────┬──────────┘                   │
                                   │                              │
                         ┌─────────▼──────────┐                   │
                         │   CMDB UPSERT      │                   │
                         │ (ServiceNow CI     │                   │
                         │  pipeline)         │                   │
                         └─────────┬──────────┘                   │
                                   │                              │
                         ┌─────────▼──────────┐                   │
                         │   EMIT CHANGE      │                   │
                         │   EVENT            │                   │
                         │ → Meridian         │                   │
                         │ → Ledger           │                   │
                         │ → Vantage Clinical │                   │
                         └────────────────────┘                   │
```

### 7.2 Step-by-Step Detail

**Step 1 — Source Adapter Receives Data**

Each adapter operates independently. Push-based adapters (eBPF, generic import) process data as it arrives. Poll-based adapters (Armis, SN Discovery) run on configurable schedules:

| Adapter | Trigger | Default Interval |
|---------|---------|-----------------|
| Pathfinder eBPF | gRPC stream (continuous) | Real-time |
| Armis | Scheduled poll | 5 minutes |
| SN Discovery | Scheduled poll | 15 minutes |
| Generic Import | File upload event | On-demand |

**Step 2 — Transform to Intermediate Format**

Each adapter maps its native fields to the `IntermediateDevice` struct:

```go
type IntermediateDevice struct {
    SourceAdapter    string                 `json:"source_adapter"`
    SourceID         string                 `json:"source_id"`
    MACAddress       string                 `json:"mac_address,omitempty"`
    IPAddress        string                 `json:"ip_address,omitempty"`
    Hostname         string                 `json:"hostname,omitempty"`
    SerialNumber     string                 `json:"serial_number,omitempty"`
    UDI              string                 `json:"udi,omitempty"`
    Manufacturer     string                 `json:"manufacturer,omitempty"`
    Model            string                 `json:"model,omitempty"`
    DeviceCategory   string                 `json:"device_category,omitempty"`
    NetworkSegment   string                 `json:"network_segment,omitempty"`
    ObservedAt       time.Time              `json:"observed_at"`
    RawFields        map[string]interface{} `json:"raw_fields"`
    FieldConfidences map[string]float64     `json:"field_confidences"`
}
```

Field validation occurs at this stage. Records failing validation are rejected with detailed error messages in the ingest response.

**Step 3 — Deduplication Engine Matches Against Existing Devices**

The matching algorithm described in Section 3 executes. The engine queries the gateway's local device cache (synced from CMDB) to avoid per-record API calls to ServiceNow.

**Step 4 — Merge (Match Found)**

Confidence-weighted field resolution as described in Section 3.3. Each field is independently evaluated. The merge produces a diff of changed fields for the CMDB upsert.

**Step 5 — Create (No Match)**

A new `device_id` (UUIDv4) is generated. All incoming fields are accepted at their source confidence. The device enters the pipeline as a new record.

**Step 6 — Tier Assignment Engine**

The tier assignment engine classifies the device into one of four tiers using a cascade:

| Priority | Method | Example |
|----------|--------|---------|
| 1 | Protocol analysis | Device communicating on HL7/DICOM ports → Tier 3 or 4 |
| 2 | FDA product code lookup | Product code `FRN` (infusion pump) → Tier 4 (life-critical) |
| 3 | Manufacturer database | Manufacturer "Baxter" + model "Sigma Spectrum" → Tier 4 |
| 4 | Armis/source classification | Armis type "medical_device" → Tier 3 (default clinical) |
| 5 | Fallback | No clinical indicators → Tier 2 (standard IT) |

**Step 7 — Clinical Enrichment**

If the Vantage Clinical module is licensed and active:

- FDA product code lookup against the FDA device database
- GMDN code mapping
- UDI parsing and validation
- Care area inference from network segment + department mapping
- Life-critical flag assignment based on tier + device category

**Step 8 — CMDB Upsert**

The normalized device record is written to ServiceNow via the existing Pathfinder CI pipeline (`src/gateway/internal/sn/ci_pipeline.go`). The upsert uses `device_id` as the correlation ID on `x_avnth_unified_device`.

- New devices: INSERT via ServiceNow Table API
- Updated devices: PATCH with only changed fields
- Batch optimization: records are batched in groups of 100 for bulk API calls

**Step 9 — Emit Change Event**

After successful CMDB upsert, a change event is published to the gateway's internal event bus:

```json
{
  "event_type": "device.updated",
  "device_id": "d7f3a1b2-4e5c-6d7e-8f9a-0b1c2d3e4f5a",
  "timestamp": "2026-03-31T14:22:05Z",
  "changes": {
    "vulnerability_data": {"action": "updated", "source": "armis"},
    "risk_score": {"action": "updated", "old": 5, "new": 7}
  },
  "consumers": ["meridian", "ledger", "vantage_clinical"]
}
```

Downstream consumers subscribe to these events:

| Consumer | Events of Interest |
|----------|-------------------|
| Meridian | `device.created`, `device.tier_changed`, `device.lifecycle_changed` |
| Ledger | `device.compliance_changed`, `device.vulnerability_updated` |
| Vantage Clinical | `device.created` (Tier 3-4), `device.clinical_enriched`, `device.behavioral_drift` |
| Pathfinder Base | All events (integration/interface impact analysis) |

---

## 8. Armis Coexistence Patterns

With ServiceNow's acquisition of Armis, many Pathfinder customers will have both tools deployed. The DNL handles every combination.

### 8.1 Both eBPF and Armis See the Same Device

**Scenario:** An infusion pump on a clinical VLAN is discovered by both an eBPF agent (on the VLAN gateway) and Armis (passive network monitoring).

**Behavior:**

| Field | eBPF Provides | Armis Provides | Resolution |
|-------|--------------|----------------|------------|
| MAC address | Yes (1.0) | Yes (0.70) | eBPF wins — stored as canonical |
| IP address | Yes (1.0) | Yes (0.70) | eBPF wins |
| Device category | "infusion_pump" (1.0 + behavioral) | "medical_device" (0.70) | eBPF wins — more specific, higher confidence |
| Manufacturer | Via OUI only (0.80) | "Baxter" (0.95 x 0.70 = 0.665) | eBPF wins on weight but Armis may win on field confidence if eBPF OUI is ambiguous |
| Vulnerability data | Not available | CVE list (0.70) | Armis — only source for this field |
| Risk score | Not available | 7 (0.70) | Armis — only source |
| Behavioral profile | Full (1.0) | Not available | eBPF — only source |

**Result:** The canonical record uses eBPF for classification and behavioral data, Armis for vulnerability enrichment. This is the ideal outcome — each source contributes its strengths.

### 8.2 Only Armis Sees a Device (No Agent on Segment)

**Scenario:** A wireless patient monitor on an isolated clinical VLAN with no eBPF agent deployed.

**Behavior:**

- Armis data accepted at 0.70 base confidence
- Classification based on Armis device fingerprinting (no behavioral confirmation possible)
- Device flagged with `classification_method: fingerprint` (not `behavioral`)
- Coverage gap record created in `x_avnth_coverage_gap` table indicating this network segment lacks eBPF coverage
- Device is fully functional in all intelligence modules but at reduced confidence
- Recommended action surfaced in Pathfinder dashboard: "Deploy eBPF agent to VLAN 50.12 to increase confidence for 23 clinical devices"

### 8.3 eBPF Agent Deployed Later on Armis-Discovered Device

**Scenario:** A customer deploys an eBPF agent on a network segment that previously only had Armis coverage.

**Behavior:**

1. eBPF agent starts streaming observations
2. DNL matches incoming eBPF data to existing Armis-discovered devices (Tier 1 MAC match)
3. For each matched device:
   - `primary_source` changes from `armis` to `pathfinder_ebpf`
   - `source_count` increments from 1 to 2
   - Classification confidence upgrades (e.g., 0.70 to 1.0+)
   - `classification_method` changes from `fingerprint` to `behavioral` once behavioral baseline is established (typically 24-48 hours)
   - Behavioral profile begins populating
4. Coverage gap record for that segment is closed
5. Change events emitted for all affected devices — downstream modules recalculate risk/compliance with higher confidence data

**Confidence timeline:**

| Time | Source(s) | Classification Confidence |
|------|-----------|--------------------------|
| Day 0 | Armis only | 0.70 |
| Day 1 | Armis + eBPF (learning) | 0.85 (eBPF weight but no behavioral confirmation yet) |
| Day 3 | Armis + eBPF (baselined) | 1.05 (eBPF 1.0 + recency 0.05 + behavioral not yet confirmed) |
| Day 7 | Armis + eBPF (confirmed) | 1.15 (eBPF 1.0 + recency 0.05 + behavioral 0.10) |

### 8.4 Armis Removed by Customer

**Scenario:** A customer cancels their Armis license or migrates away from Armis after deploying Pathfinder agents across their environment.

**Behavior:**

1. Armis adapter stops receiving data (poll returns errors or is disabled)
2. Existing Armis-sourced data is NOT deleted — it remains in `source_records[]`
3. Recency penalties begin applying to Armis-sourced fields:
   - After 7 days: -0.10 penalty
   - After 30 days: -0.20 penalty
4. For devices that also have eBPF coverage: no impact — eBPF data already wins all field-level merges
5. For devices that ONLY had Armis coverage (no other source):
   - Device record retained at last-known confidence minus recency penalties
   - `primary_source` remains `armis` but flagged as `source_stale`
   - Device added to re-validation queue
   - Dashboard alert: "47 devices have no active discovery source — last seen via Armis"
6. After 90 days with no fresh data from any source, devices are flagged `lifecycle_stage: decommissioned_candidate` and surfaced for manual review
7. Devices are NEVER automatically deleted — only a human operator can decommission a device record

### 8.5 Armis Becomes Native ServiceNow (Post-Acquisition)

**Scenario:** After the acquisition closes, Armis data appears in ServiceNow tables rather than a separate API.

**Behavior:**

- The Armis adapter is reconfigured to query SN tables (`sn_armis_device` or equivalent) instead of the Armis REST API
- The adapter ID remains `armis` for continuity — all historical source records maintain their provenance
- Confidence weight remains 0.70 — the data quality does not change because the transport changed
- If ServiceNow merges Armis data into native CMDB `cmdb_ci` records, the SN Discovery adapter will begin seeing Armis-enriched data. The DNL handles this gracefully because dedup is keyed on MAC/IP/hostname, not on source adapter.

---

## Appendix A: Configuration Reference

The DNL is configured via `config/normalization.yaml`:

```yaml
normalization:
  adapters:
    pathfinder_ebpf:
      enabled: true
      weight: 1.0
      grpc_port: 8443
      tls_cert: /etc/pathfinder/certs/gateway.crt
      tls_key: /etc/pathfinder/certs/gateway.key

    armis:
      enabled: true
      weight: 0.70
      mode: "rest_api"  # or "sn_table" post-acquisition
      api_url: "https://api.armis.com/api/v1"
      api_key_env: "ARMIS_API_KEY"
      poll_interval: "5m"
      batch_size: 1000

    sn_discovery:
      enabled: true
      weight: 0.60
      instance_env: "PF_SN_INSTANCE"
      poll_interval: "15m"
      tables:
        - "cmdb_ci_hardware"
        - "cmdb_ci_server"
        - "cmdb_ci_ip_switch"
        - "cmdb_ci_medical_device"

    generic_import:
      enabled: true
      weight: 0.30
      watch_directory: "/var/pathfinder/imports/"
      accepted_formats: ["csv", "json"]

  dedup:
    fuzzy_match_threshold: 0.70
    ip_stale_hours: 24
    ip_archive_days: 7

  confidence:
    recency_fresh_hours: 24
    recency_stale_days: 7
    recency_very_stale_days: 30
    behavioral_bonus: 0.10
    conflict_flag_threshold: 0.15

  pipeline:
    cmdb_batch_size: 100
    event_bus: "internal"  # or "kafka" for high-throughput deployments
    reconciliation_schedule: "0 2 * * *"  # daily at 2 AM
```

---

## Appendix B: Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `DNL_001` | 400 | Invalid source adapter ID |
| `DNL_002` | 400 | Validation failed — missing required fields |
| `DNL_003` | 400 | Invalid MAC address format |
| `DNL_004` | 409 | Reconciliation already in progress |
| `DNL_005` | 404 | Device not found |
| `DNL_006` | 422 | Unprocessable file format (generic import) |
| `DNL_007` | 500 | CMDB upsert failed — ServiceNow unreachable |
| `DNL_008` | 500 | Dedup engine internal error |
| `DNL_009` | 207 | Partial success — some records failed validation |
| `DNL_010` | 429 | Rate limit exceeded (per-adapter throttle) |

---

**Version:** 1.0
**Date:** 2026-03-31
**Author:** Avennorth Engineering
**Classification:** Avennorth Confidential — Do Not Distribute
**Review cadence:** Quarterly or upon material change in Armis integration model
