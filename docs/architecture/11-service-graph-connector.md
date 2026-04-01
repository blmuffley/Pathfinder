# 11 — Pathfinder Service Graph Connector for ServiceNow

## 1. Purpose

This document specifies a **free, certified Service Graph Connector (SGC)** that publishes Pathfinder's discovered infrastructure, applications, integrations, cloud services, and clinical devices into ServiceNow CMDB using the standard Identification and Reconciliation Engine (IRE). This replaces the current proprietary REST API push (`/api/x_avnth/pathfinder/v1/*`) with ServiceNow's supported integration pattern.

**Why free:** The SGC is a distribution strategy, not a revenue stream. A free, certified connector on the ServiceNow Store:
- Removes the #1 barrier to adoption ("how does it integrate with our SN instance?")
- Gets Avennorth's name in front of every ServiceNow customer browsing the Store
- Generates inbound leads (install SGC → see the data model → want the full product)
- Positions Pathfinder as ServiceNow-native (not a bolt-on)
- Makes Compass partner deployments trivial (install from Store, configure OAuth, done)

---

## 2. Service Graph Connector Framework

### 2.1 What Is an SGC?

A ServiceNow Service Graph Connector is a certified integration that:
1. Ingests data from an external source into the CMDB
2. Uses the **Identification and Reconciliation Engine (IRE)** to create/update CIs
3. Handles deduplication, reconciliation, and relationship mapping automatically
4. Follows CSDM-compliant CI class mapping
5. Is published on the ServiceNow Store and certified by ServiceNow

### 2.2 Pathfinder SGC Scope

| CI Type | CSDM Class | Source | What It Populates |
|---------|-----------|--------|------------------|
| Servers | `cmdb_ci_server`, `cmdb_ci_linux_server`, `cmdb_ci_win_server` | Pathfinder Base | Hostname, IP, OS, discovered apps, agent status |
| Application Instances | `cmdb_ci_app_server` | Pathfinder Base | Process name, port, runtime, behavioral profile |
| Integrations | `cmdb_ci_service_auto` + `cmdb_rel_ci` | Pathfinder Base | Source→target relationships with type, confidence, health |
| Cloud Services | `cmdb_ci_cloud_service`, `cmdb_ci_cloud_service_account` | Pathfinder Cloud | SaaS/PaaS/IaaS dependencies from outbound traffic |
| Medical Devices | `cmdb_ci_medical_device` | Pathfinder Clinical | FDA code, UDI, tier, department, care area |
| IoT Devices | `cmdb_ci_ip_device` | Pathfinder IoT | BACnet/Modbus/ONVIF devices |
| Network Devices | `cmdb_ci_netgear` | Agentless discovery | Routers, switches, firewalls (free, not counted) |

### 2.3 Architecture

```
Pathfinder Gateway (Go)
  │
  │ Classified integrations, devices, cloud services
  │ stored in PostgreSQL
  │
  ▼
SGC Publisher (Go module in gateway)
  │
  │ Transforms classified records into IRE payloads
  │ Batch size: 100 CIs per request (configurable)
  │ Sync interval: 60 seconds (configurable)
  │
  │ Uses ServiceNow APIs:
  │ POST /api/now/identifyreconcile (IRE)
  │ POST /api/now/cmdb/instance/{class} (CMDB API)
  │
  ▼
ServiceNow Instance
  │
  ├─ Identification & Reconciliation Engine (IRE)
  │   ├─ Identification rules (match by hostname+IP, serial, MAC)
  │   ├─ Reconciliation rules (Pathfinder wins on behavioral data)
  │   ├─ Deduplication (automatic)
  │   └─ CSDM class mapping (automatic)
  │
  ├─ Service Graph Connector Scoped App
  │   ├─ Connection configuration (OAuth2 credentials)
  │   ├─ Data source record (discovery_source)
  │   ├─ Scheduled import jobs
  │   ├─ Identification rules (custom for Pathfinder)
  │   ├─ Reconciliation rules (confidence-weighted)
  │   ├─ Transform maps (Pathfinder → CMDB)
  │   └─ Health check dashboard
  │
  └─ CMDB (populated CIs with full CSDM compliance)
```

---

## 3. IRE Integration

### 3.1 Identification Rules

The IRE uses identification rules to match incoming data against existing CIs. Pathfinder registers these rules:

| Rule Name | CI Class | Match Criteria | Priority |
|-----------|----------|---------------|----------|
| `Pathfinder Server ID` | `cmdb_ci_server` | hostname + ip_address | 1 |
| `Pathfinder App Instance ID` | `cmdb_ci_app_server` | name + host + port | 1 |
| `Pathfinder Integration ID` | `cmdb_rel_ci` | parent + child + type | 1 |
| `Pathfinder Cloud Service ID` | `cmdb_ci_cloud_service` | name + service_type + region | 2 |
| `Pathfinder Medical Device ID` | `cmdb_ci_medical_device` | serial_number OR (mac_address + ip_address) | 1 |
| `Pathfinder IoT Device ID` | `cmdb_ci_ip_device` | mac_address + ip_address | 2 |

### 3.2 Reconciliation Rules

When Pathfinder data conflicts with existing CI data, these reconciliation rules determine which source wins:

| Attribute | Pathfinder Wins If | Existing Wins If | Notes |
|-----------|-------------------|------------------|-------|
| `operational_status` | Pathfinder has behavioral data (confidence > 0.7) | Manual override flag set | Pathfinder's real-time observation is more current |
| `ip_address` | Always (real-time observation) | Never | IP is directly observed |
| `os_version` | Agent-reported | Never | Agent has authoritative OS info |
| `used_for` | Never | Always | Business context is human-assigned |
| `assigned_to` | Never | Always | Ownership is human-assigned |
| `x_avnth_*` fields | Always | N/A | Pathfinder-specific fields always from Pathfinder |

### 3.3 Data Source Configuration

```javascript
// Service Graph Connector - Data Source Record
{
  name: "Avennorth Pathfinder",
  type: "Service Graph Connector",
  vendor: "Avennorth",
  connection_type: "oauth2_client_credentials",
  connection_url: "${PF_GATEWAY_ADDRESS}",  // Customer's Pathfinder gateway
  client_id: "${PF_SN_CLIENT_ID}",
  client_secret: "${PF_SN_CLIENT_SECRET}",
  sync_interval: 60,  // seconds
  batch_size: 100,
  status: "Active",
  last_sync: "2026-04-01T12:00:00Z",
  discovery_source: "Pathfinder"
}
```

---

## 4. CI Class Mapping

### 4.1 Server Discovery

Pathfinder agents report host information. The SGC maps this to standard CSDM server classes:

| Pathfinder Field | CMDB Field | CSDM Class |
|-----------------|-----------|-----------|
| `hostname` | `name` | `cmdb_ci_server` |
| `ip_address` | `ip_address` | |
| `os_type` ("Linux") | → class | `cmdb_ci_linux_server` |
| `os_type` ("Windows") | → class | `cmdb_ci_win_server` |
| `os_version` | `os_version` | |
| `agent_id` | `x_avnth_agent_id` | |
| `agent_version` | `x_avnth_agent_version` | |
| `coverage_tier` | `x_avnth_coverage_tier` | |
| `last_heartbeat` | `last_discovered` | |
| `flows_collected` | `x_avnth_flows_collected` | |

### 4.2 Application Instance Discovery

Pathfinder infers applications from behavioral observation:

| Pathfinder Field | CMDB Field | CSDM Class |
|-----------------|-----------|-----------|
| `app_name` (inferred) | `name` | `cmdb_ci_app_server` |
| `process_name` | `x_avnth_process` | |
| `port` | `tcp_port` | |
| `runtime` (inferred) | `version` | |
| `confidence` | `x_avnth_confidence` | |
| `host` | `host` (reference) | |
| `discovery_source` | `discovery_source` | "Pathfinder" |

### 4.3 Integration / Relationship Discovery

Integrations map to CMDB relationships:

| Pathfinder Field | CMDB Field | Table |
|-----------------|-----------|-------|
| `source_ci` | `parent` | `cmdb_rel_ci` |
| `target_ci` | `child` | `cmdb_rel_ci` |
| `integration_type` | `type` (reference) | maps to `cmdb_rel_type` |
| `confidence` | `x_avnth_confidence` | |
| `health_score` | `x_avnth_health_score` | |
| `flow_count` | `x_avnth_flow_count` | |
| `first_observed` | `x_avnth_first_observed` | |
| `last_observed` | `x_avnth_last_observed` | |

**Relationship Type Mapping:**

| Pathfinder Type | CMDB Relationship Type |
|----------------|----------------------|
| API | `Depends on::Used by` |
| Database | `Depends on::Used by` |
| Messaging | `Sends data to::Receives data from` |
| Email | `Sends data to::Receives data from` |
| Directory | `Depends on::Used by` |
| File Transfer | `Sends data to::Receives data from` |
| Clinical (HL7) | `Depends on::Used by` + `x_avnth_clinical_integration` |
| Cloud Service | `Depends on::Used by` + `x_avnth_cloud_dependency` |

### 4.4 Cloud Service Discovery

| Pathfinder Field | CMDB Field | CSDM Class |
|-----------------|-----------|-----------|
| `service_name` | `name` | `cmdb_ci_cloud_service` |
| `provider` | `cloud_provider` | |
| `service_type` | `service_type` | |
| `endpoint_pattern` | `x_avnth_endpoint` | |
| `region` | `cloud_region` | |
| `connection_pattern` | `x_avnth_pattern` | |

### 4.5 Medical Device Discovery

| Pathfinder Field | CMDB Field | CSDM Class |
|-----------------|-----------|-----------|
| `device_name` | `name` | `cmdb_ci_medical_device` |
| `manufacturer` | `manufacturer` | |
| `model` | `model_id` | |
| `serial_number` | `serial_number` | |
| `fda_product_code` | `x_avnth_fda_code` | |
| `udi` | `x_avnth_udi` | |
| `device_class` | `x_avnth_fda_class` | |
| `life_critical` | `x_avnth_life_critical` | |
| `department` | `department` (reference) | |
| `care_area` | `x_avnth_care_area` | |
| `device_tier` | `x_avnth_device_tier` | |
| `clinical_protocol` | `x_avnth_protocol` | |

---

## 5. Gateway SGC Publisher (Go)

### 5.1 New Module: `src/gateway/internal/sgc/`

```go
// Package sgc implements the Service Graph Connector publisher
// that pushes discovered CIs to ServiceNow via the IRE API.
package sgc

// Publisher sends classified data to ServiceNow using the
// Identification and Reconciliation Engine (IRE).
type Publisher struct {
    client     *http.Client
    config     Config
    store      *store.Store
    logger     *zap.Logger
    metrics    *Metrics
}

type Config struct {
    InstanceURL   string        // https://customer.service-now.com
    ClientID      string        // OAuth2 client ID
    ClientSecret  string        // OAuth2 client secret
    SyncInterval  time.Duration // default 60s
    BatchSize     int           // default 100
    Enabled       bool          // feature flag
}

// Run starts the SGC publisher loop
func (p *Publisher) Run(ctx context.Context) error {
    ticker := time.NewTicker(p.config.SyncInterval)
    for {
        select {
        case <-ctx.Done():
            return nil
        case <-ticker.C:
            p.syncServers(ctx)
            p.syncAppInstances(ctx)
            p.syncIntegrations(ctx)
            p.syncCloudServices(ctx)
            p.syncMedicalDevices(ctx)
        }
    }
}

// syncServers pushes discovered server CIs via IRE
func (p *Publisher) syncServers(ctx context.Context) {
    servers, err := p.store.GetUnsyncedServers(ctx, p.config.BatchSize)
    if err != nil { ... }

    for _, batch := range chunk(servers, 100) {
        payload := p.buildIREPayload("cmdb_ci_server", batch)
        resp, err := p.postToIRE(ctx, payload)
        if err != nil { ... }
        p.store.MarkServersSynced(ctx, resp.SysIDs)
    }
}

// buildIREPayload creates the IRE-compliant JSON payload
func (p *Publisher) buildIREPayload(ciClass string, items []interface{}) IREPayload {
    return IREPayload{
        Items: mapToIREItems(ciClass, items),
        Relations: extractRelations(items),
        Source: "Pathfinder",
    }
}

// postToIRE calls POST /api/now/identifyreconcile
func (p *Publisher) postToIRE(ctx context.Context, payload IREPayload) (*IREResponse, error) {
    url := fmt.Sprintf("%s/api/now/identifyreconcile", p.config.InstanceURL)
    // ... OAuth2 authenticated POST
}
```

### 5.2 IRE Payload Format

```json
{
  "items": [
    {
      "className": "cmdb_ci_linux_server",
      "values": {
        "name": "prod-web-01",
        "ip_address": "10.1.10.21",
        "os_version": "Ubuntu 22.04",
        "discovery_source": "Pathfinder",
        "x_avnth_agent_id": "a1b2c3d4",
        "x_avnth_coverage_tier": "2",
        "x_avnth_confidence": "0.95"
      },
      "lookup": [
        { "column": "name", "value": "prod-web-01" },
        { "column": "ip_address", "value": "10.1.10.21" }
      ]
    }
  ],
  "relations": [
    {
      "parent": { "className": "cmdb_ci_app_server", "lookup": [{ "column": "name", "value": "Order Processing" }] },
      "child": { "className": "cmdb_ci_app_server", "lookup": [{ "column": "name", "value": "Payment Gateway" }] },
      "type": "Depends on::Used by",
      "values": {
        "x_avnth_confidence": "0.95",
        "x_avnth_health_score": "92",
        "x_avnth_flow_count": "48200",
        "x_avnth_integration_type": "API"
      }
    }
  ]
}
```

---

## 6. ServiceNow Scoped App Components

### 6.1 SGC Connector Definition

```json
{
  "name": "Avennorth Pathfinder Service Graph Connector",
  "scope": "x_avnth_pathfinder_sgc",
  "version": "1.0.0",
  "vendor": "Avennorth LLC",
  "type": "Service Graph Connector",
  "minimum_sn_version": "Utah",
  "license": "Free",
  "description": "Discovers application integrations, cloud services, and medical devices using kernel-level behavioral observation (eBPF/ETW). Populates CMDB with confidence-scored CIs via the Identification and Reconciliation Engine.",
  "categories": ["CMDB", "Discovery", "ITOM", "Healthcare"],
  "connector_config": {
    "connection_type": "oauth2",
    "data_direction": "inbound",
    "scheduled_import": true,
    "real_time_updates": true
  }
}
```

### 6.2 Scheduled Import Job

```javascript
// Scheduled Import - Pathfinder SGC
// Runs every 60 seconds (configurable)
// Pulls latest data from Pathfinder Gateway and pushes through IRE

var connector = new GlideRecord('x_avnth_pathfinder_sgc_connection');
connector.addActiveQuery();
connector.query();

while (connector.next()) {
    var import_set = new PathfinderImportSet(connector);
    import_set.pullFromGateway();    // GET /api/v1/sgc/export
    import_set.transformAndLoad();    // IRE createOrUpdateCI
    import_set.updateSyncStatus();    // Mark records synced
}
```

### 6.3 Transform Maps

| Source Table | Target Table | Key Mapping |
|-------------|-------------|-------------|
| `x_avnth_sgc_import_server` | `cmdb_ci_server` | hostname + ip_address |
| `x_avnth_sgc_import_app` | `cmdb_ci_app_server` | name + host + port |
| `x_avnth_sgc_import_integration` | `cmdb_rel_ci` | parent + child + type |
| `x_avnth_sgc_import_cloud` | `cmdb_ci_cloud_service` | name + provider + region |
| `x_avnth_sgc_import_medical` | `cmdb_ci_medical_device` | serial_number OR mac+ip |

### 6.4 Health Check Dashboard

The SGC includes a ServiceNow dashboard showing:
- Connection status (green/amber/red)
- Last sync time and duration
- CIs created/updated/failed in last sync
- Total CIs managed by Pathfinder
- Sync error log
- Configuration summary

---

## 7. Gateway Export API

The Pathfinder Gateway exposes a new API endpoint for the SGC to pull data:

### 7.1 Endpoint: `GET /api/v1/sgc/export`

```
GET /api/v1/sgc/export?since={timestamp}&type={ci_type}&limit={n}

Parameters:
  since     - ISO 8601 timestamp, return records modified after this time
  type      - CI type filter: server|app|integration|cloud|medical|iot|all
  limit     - Max records per response (default 500)

Response:
{
  "items": [...],         // CI records in IRE payload format
  "relations": [...],     // Relationship records
  "cursor": "...",        // Pagination cursor for next batch
  "total": 342,           // Total records matching query
  "sync_id": "uuid"       // Sync transaction ID for audit
}
```

### 7.2 Endpoint: `POST /api/v1/sgc/ack`

```
POST /api/v1/sgc/ack
{
  "sync_id": "uuid",
  "items_synced": ["sys_id_1", "sys_id_2", ...],
  "items_failed": [
    { "id": "...", "error": "duplicate detected" }
  ]
}
```

Marks records as synced in the gateway's PostgreSQL store.

---

## 8. Migration from Proprietary API

### 8.1 Migration Path

| Phase | Current State | SGC State |
|-------|-------------|-----------|
| 1 | Proprietary REST push only | Add SGC publisher alongside (dual-write) |
| 2 | Both running | Validate SGC data matches proprietary |
| 3 | SGC validated | Deprecate proprietary endpoints |
| 4 | SGC only | Remove proprietary code |

### 8.2 Backward Compatibility

- The proprietary `/api/x_avnth/pathfinder/v1/*` endpoints remain functional during migration
- Existing customers can migrate at their own pace
- New customers get SGC by default
- Gateway config flag: `sgc_enabled: true` (default for new installs)

---

## 9. ServiceNow Store Listing

### 9.1 Store Page Content

**Title:** Avennorth Pathfinder — Service Graph Connector

**Tagline:** Discover every integration, cloud service, and medical device on your network. Automatically. With confidence scores.

**Price:** Free

**Description:**
Pathfinder uses kernel-level behavioral observation (eBPF on Linux, ETW on Windows) to passively discover application integrations, cloud service dependencies, and medical device connections. This free Service Graph Connector pushes discovered data into your CMDB via the Identification and Reconciliation Engine (IRE), ensuring CSDM-compliant CI creation with automatic deduplication and reconciliation.

**What It Discovers:**
- Server-to-server integrations (API, Database, Messaging, File Transfer)
- SaaS dependencies (Salesforce, Workday, ServiceNow, 200+ services)
- Cloud infrastructure (AWS, Azure, GCP services)
- Medical devices (HL7, DICOM, IEEE 11073 protocols)
- IoT/OT devices (BACnet, Modbus, ONVIF)

**What You Need:**
- Pathfinder Gateway (deployed on your infrastructure)
- Pathfinder Agents (deployed on servers to observe)
- ServiceNow Utah or later

**CSDM Compliance:**
- Maps to standard CMDB classes (cmdb_ci_server, cmdb_ci_app_server, cmdb_ci_cloud_service, cmdb_ci_medical_device)
- Uses standard relationship types (Depends on, Sends data to)
- Extends with Avennorth-specific attributes (confidence, health score, behavioral profile) in x_avnth namespace

### 9.2 Certification Requirements

| Requirement | Status | Notes |
|-------------|--------|-------|
| CSDM-compliant CI mapping | Yes | Maps to standard classes, extends with x_avnth fields |
| IRE integration | Yes | Uses identifyreconcile API |
| Scoped application | Yes | x_avnth_pathfinder_sgc scope |
| No global scope modifications | Yes | All changes in scoped app |
| Documentation | Yes | Installation guide, admin guide |
| Security review | Pending | OAuth2 only, no stored credentials in code |
| Performance testing | Pending | Batch processing, configurable rate limiting |
| Utah+ compatibility | Yes | Tested on Utah, Vancouver, Washington |

---

## 10. Why Free?

### 10.1 Strategic Rationale

| Benefit | Impact |
|---------|--------|
| **ServiceNow Store visibility** | Every SN customer browsing "Service Graph Connector" sees Avennorth |
| **Zero-friction adoption** | Install from Store → configure OAuth → data flowing in minutes |
| **Partner enablement** | Compass partners install SGC as part of standard SN implementation |
| **Upsell gateway** | Free connector shows basic discovery → customer wants intelligence layers (paid) |
| **Competitive moat** | Being on the ServiceNow Store as a certified connector is a trust signal competitors lack |
| **Armis coexistence** | SGC + Armis data both flow through IRE → customer sees unified CMDB |

### 10.2 What's Free vs. Paid

| Component | Price | Included In |
|-----------|-------|------------|
| **Service Graph Connector** (this doc) | **Free** | ServiceNow Store |
| Pathfinder Base (agents + gateway) | $50K+/yr | Pathfinder subscription |
| Contour (service mapping) | $50K+/yr (or bundle) | Contour subscription |
| Clinical Extension (Tier 3-4 devices) | $8-25/dev/mo | Pathfinder Clinical add-on |
| Intelligence modules (Meridian, Ledger) | $3-20K/facility/mo | Add-on subscriptions |

The SGC is the connector. The value is in what generates the data (Pathfinder) and what you do with it (Contour, intelligence modules).

---

*Pathfinder Service Graph Connector — v1.0*
*Avennorth Confidential — April 2026*
