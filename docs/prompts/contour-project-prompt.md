# Avennorth Contour — Complete Project Prompt

Use this prompt to build the Avennorth Contour product from scratch in its own repository. This document is self-contained — you do not need the Pathfinder repo open.

---

## 1. Context

### 1.1 Avennorth Brand System

Avennorth is a ServiceNow-focused product portfolio. All products share a unified brand and design system.

**Brand colors:**

| Token | Hex | Usage |
|-------|-----|-------|
| Obsidian | `#1C1917` | Primary background, text |
| Electric Lime | `#39FF14` | Primary accent, active states, data viz |
| Stone-700 | `#44403C` | Secondary surfaces, borders |
| Stone-400 | `#A8A29E` | Muted text, labels |
| White | `#FFFFFF` | Light-mode primary, dark-mode text |

**Typography:**

| Font | Role | Usage |
|------|------|-------|
| Syne | Display | Headlines, product names, hero text |
| DM Sans | Body | Paragraphs, UI labels, tables |
| Space Mono | Code/Data | Metrics, sys_ids, code blocks, port numbers |

**Naming convention:** All products use navigational/topographic metaphors:

- **Bearing** — "know where you stand" (assessment/readiness)
- **Pathfinder** — "chart unknown territory" (discovery)
- **Contour** — "reveals the landscape shape" (service modeling)
- **Vantage** — "see farther, respond faster" (incident response)
- **Compass** — "trusted direction" (consulting platform)
- **Meridian** — "clinical operations graph" (workforce + device mapping)
- **Ledger** — "compliance automation" (audit + evidence)

### 1.2 Contour's Position in the Portfolio

Contour sits between Pathfinder (discovery) and the rest of the portfolio (assessment, incident response, compliance). It takes raw infrastructure data — servers, integrations, cloud services, clinical devices — and assembles them into CSDM-aligned service maps.

```
Pathfinder discovers ──► Contour models ──► Bearing assesses
                                          ──► Vantage responds
                                          ──► Ledger audits
```

**Contour's tagline:** "Reveals the landscape shape"

**What it does in one sentence:** Contour automatically builds CSDM-compliant service maps from any discovery source, using AI to suggest business service groupings and maintain a living service model.

### 1.3 Relationship to Other Products

| Product | Relationship to Contour |
|---------|------------------------|
| **Pathfinder** | Primary data source. Contour reads Pathfinder's discovered CIs (servers, integrations, cloud services, clinical devices) from ServiceNow CMDB. No direct API calls between products. |
| **Bearing** | Consumer. Bearing assesses the health/maturity of Contour's service model. Contour publishes `service_model.updated` events that Bearing subscribes to. |
| **Vantage** | Consumer. Vantage uses Contour's service maps to calculate blast radius during incident investigation. Reads Contour's dependency graph to identify affected business services. |
| **Meridian** | Peer. Meridian maps clinical workforce to devices; Contour maps those devices into technical/business services. |
| **Ledger** | Consumer. Ledger evaluates compliance posture at the service level using Contour's CSDM hierarchy. |

### 1.4 ServiceNow Armis Acquisition Context

ServiceNow acquired Armis for $7.75B. This means ServiceNow now has its own discovery engine. Contour MUST be discovery-agnostic:

- Works with Pathfinder discovery data (primary)
- Works with Armis discovery data
- Works with ServiceNow native Discovery/Service Mapping
- Works with any third-party discovery tool that populates CMDB
- The input contract is: "CIs exist in the CMDB with relationships" — Contour does not care who put them there

**Design principle:** Contour reads from standard CMDB tables (`cmdb_ci_server`, `cmdb_ci_app_server`, `cmdb_ci_cloud_service`, `cmdb_rel_ci`) plus Avennorth extension tables (`x_avnth_*`). If Avennorth tables are empty (no Pathfinder deployed), Contour still functions using standard CMDB data alone.

### 1.5 Shared Data Model Reference

All Avennorth products share a single ServiceNow scoped app namespace: `x_avnth`. Products communicate through CMDB — ServiceNow is the integration bus. No product-to-product API calls required.

**CSDM layer model:**

```
BUSINESS SERVICE LAYER
  cmdb_ci_service_auto / cmdb_ci_service_manual
  "Online Patient Portal"    "E-Commerce Operations"
  Populated by: Contour (AI-suggested, human-confirmed)

BUSINESS APPLICATION LAYER
  cmdb_ci_business_app
  "Patient Portal App"       "Order Processing System"
  Populated by: Contour (clustered from app instances)

TECHNICAL SERVICE LAYER
  cmdb_ci_service_technical
  "Portal Backend Services"  "Payment Processing Chain"
  Populated by: Contour (integration density clustering)

INFRASTRUCTURE LAYER
  cmdb_ci_app_server, cmdb_ci_server, cmdb_ci_cloud_service,
  cmdb_ci_medical_device, x_avnth_* tables
  Servers, VMs, containers, cloud services, medical devices, IoT
  Populated by: Pathfinder (or any discovery source)
```

**Product data ownership (write access):**

| Product | Owns (Write) |
|---------|-------------|
| Pathfinder Base | `x_avnth_pathfinder_agent`, `x_avnth_cmdb_ci_integration`, `x_avnth_cmdb_ci_interface`, `x_avnth_integration_health_log` |
| Pathfinder Clinical | `x_avnth_clinical_device`, `x_avnth_device_tier_config` |
| Pathfinder Cloud | `x_avnth_cloud_service`, `x_avnth_cloud_account`, `x_avnth_cloud_dependency` |
| Contour | `cmdb_ci_service_auto`, `cmdb_ci_business_app`, `cmdb_ci_service_technical`, `x_avnth_service_model`, `x_avnth_app_instance` |
| Bearing | `x_avnth_bearing_assessment`, `x_avnth_bearing_finding`, `x_avnth_bearing_score` |
| Vantage | `x_avnth_vantage_incident`, `x_avnth_vantage_escalation` |

**Cross-product relationship types (via `cmdb_rel_ci`):**

| Relationship | Created By | From | To |
|-------------|-----------|------|-----|
| `Discovered::DiscoveredBy` | Pathfinder | Agent | CI |
| `IntegratesWith::IntegratedWith` | Pathfinder | CI | CI |
| `Uses::UsedBy` | Pathfinder Cloud | CI | Cloud Service |
| `Contains::ContainedBy` | Contour | Technical Service | App Instance |
| `ProvidedBy::Provides` | Contour | Business Service | Technical Service |
| `DependsOn::DependedOnBy` | Contour | Business App | Business App |
| `AssessedBy::Assesses` | Bearing | CI | Assessment |
| `IncidentOn::HasIncident` | Vantage | Incident | CI |

---

## 2. What Contour Does

### 2.1 The 5-Step CSDM Service Modeling Pipeline

Contour's core algorithm transforms flat infrastructure data into a layered CSDM service model. It runs continuously (event-driven) or on a scheduled cadence.

#### Step 1: Application Instance Detection

**Input:** Servers (`cmdb_ci_server`, `cmdb_ci_app_server`), processes, ports, integrations (`x_avnth_cmdb_ci_integration`)

**Logic:**
- Group (process_name + listening_port + server) tuples into application instances
- Use process signatures to identify known applications (e.g., `java` on port 8080 with `tomcat` in the cmdline = "Tomcat Web Server")
- Maintain a pattern library of ~200 common application signatures
- For unknown processes, create generic instances with low confidence
- Each app instance is a unique (application_type, server, port_set) tuple

**Output:** `x_avnth_app_instance` records with `Contains::ContainedBy` relationships to their host server

```
Pseudocode:
for each server in cmdb_ci_server:
    processes = get_listening_processes(server)  # from discovery data
    for each (process_name, port_set) in processes:
        app_type = match_application_signature(process_name, port_set)
        instance = find_or_create_app_instance(app_type, server, port_set)
        create_relationship(server, "Contains", instance)
```

#### Step 2: Business Application Clustering

**Input:** App instances from Step 1, integration relationships

**Logic:**
- Group identical app instances (same application_type) across different servers
- These represent a single "Business Application" deployed on multiple servers
- Example: 4 servers all running "Epic Hyperspace" = 1 Business Application "Epic Hyperspace" with 4 instances
- Use integration patterns to disambiguate (same process name but different integration patterns = different applications)
- Confidence scoring based on signature match quality and instance count

**Output:** `cmdb_ci_business_app` records with `Hosts::HostedOn` relationships to app instances

```
Pseudocode:
app_groups = group_by(app_instances, key=application_type)
for each group in app_groups:
    if integration_patterns_match(group):
        biz_app = find_or_create_business_app(group.application_type)
        for each instance in group:
            create_relationship(biz_app, "Hosts", instance)
    else:
        sub_groups = split_by_integration_pattern(group)
        for each sub in sub_groups:
            biz_app = find_or_create_business_app(sub.derived_name)
            ...
```

#### Step 3: Technical Service Assembly

**Input:** Business applications from Step 2, integration density between them

**Logic:**
- Build an integration density graph: nodes = business apps, edges = integration count between them
- Apply community detection (Louvain algorithm) to find tightly-connected clusters
- Each cluster becomes a Technical Service
- Singleton applications (no integrations) become their own Technical Service
- Name Technical Services based on their dominant application type or function

**Output:** `cmdb_ci_service_technical` records with `Contains::ContainedBy` relationships to business applications

```
Pseudocode:
graph = build_integration_graph(business_apps, integrations)
clusters = louvain_community_detection(graph, resolution=1.0)
for each cluster in clusters:
    tech_service = create_technical_service(
        name = derive_service_name(cluster),
        apps = cluster.members
    )
    for each app in cluster.members:
        create_relationship(tech_service, "Contains", app)
```

#### Step 4: Business Service Suggestion (AI)

**Input:** Technical services from Step 3, application metadata, organizational context

**Logic:**
- Send technical service clusters to Claude API with organizational context
- Claude suggests: business service name, description, service owner (department), criticality
- Each suggestion includes a confidence score and reasoning
- Suggestions are created as DRAFT records — human confirmation required before publishing
- Re-runs incorporate human feedback (accepted/rejected suggestions) as fine-tuning context

**Output:** `cmdb_ci_service_auto` records (status=Draft) with `ProvidedBy::Provides` relationships to technical services

```
Pseudocode:
for each tech_service in technical_services:
    context = {
        apps: tech_service.business_apps,
        integrations: tech_service.integration_patterns,
        org_context: get_organizational_context(),
        previous_suggestions: get_feedback_history()
    }
    suggestion = claude_api.suggest_business_service(context)
    biz_service = create_business_service(
        name = suggestion.name,
        description = suggestion.description,
        status = "Draft",
        confidence = suggestion.confidence
    )
    create_relationship(biz_service, "ProvidedBy", tech_service)
```

**Claude prompt template for business service suggestion:**

```
You are an IT service management expert. Given the following technical service
cluster, suggest a business service name and description.

Technical Service: {tech_service_name}
Contains these business applications:
{for each app: app.name, app.type, app.instance_count, app.integration_count}

Integration patterns:
{for each integration: source_app -> target_app, type, flow_count}

Organization context:
{industry, department mapping, existing business services}

Respond with:
- business_service_name: A clear, business-facing name (not technical jargon)
- description: 2-3 sentence description of what this service provides
- suggested_owner: Department most likely to own this service
- criticality: Critical / High / Medium / Low
- confidence: 0.0-1.0 (how confident are you in this grouping)
- reasoning: Why you grouped these this way
```

#### Step 5: CSDM Record Creation

**Input:** All records from Steps 1-4

**Logic:**
- Sync all records to ServiceNow CMDB via REST API
- Use sys_id-based idempotent upserts (create if new, update if exists)
- Create all relationship records in `cmdb_rel_ci`
- Version the service model (increment `x_avnth_service_model.model_version`)
- Publish `service_model.updated` webhook event

**Output:** Complete CSDM hierarchy in ServiceNow, versioned service model metadata

### 2.2 Additional Capabilities

#### Service Dependency Graph

Build and maintain a visual dependency graph showing how business services depend on each other through their underlying technical services and integrations. This powers the Service Map workspace page and is consumed by Vantage for blast radius calculation.

**Data structure:** Directed acyclic graph (DAG) stored as `cmdb_rel_ci` records with `DependsOn::DependedOnBy` relationship type.

#### Change Impact Analysis

Given a CI (server, application, or service), calculate the blast radius:

```
Pseudocode:
function calculate_blast_radius(ci):
    affected = set()
    queue = [ci]
    while queue is not empty:
        current = queue.pop()
        if current in affected: continue
        affected.add(current)
        # Walk UP the CSDM hierarchy
        parents = get_relationships(current, type="ContainedBy")
        parents += get_relationships(current, type="Provides")
        parents += get_relationships(current, type="DependedOnBy")
        queue.extend(parents)
    return {
        infrastructure: [x for x in affected if x.layer == "infrastructure"],
        technical_services: [x for x in affected if x.layer == "technical"],
        business_apps: [x for x in affected if x.layer == "application"],
        business_services: [x for x in affected if x.layer == "business"],
        estimated_users: sum(s.estimated_users for s in affected if s.layer == "business")
    }
```

#### Service Health Aggregation

Roll up health scores from infrastructure through to business services:

- Infrastructure health: from Pathfinder health logs (`x_avnth_integration_health_log`)
- Application health: worst-of health across all instances
- Technical service health: weighted average of member application health
- Business service health: worst-of health across providing technical services

Health propagates upward: if a critical database server is degraded, the business service that depends on it shows degraded.

#### SaaS/PaaS Service Mapping

Cloud services discovered by Pathfinder Cloud (`x_avnth_cloud_service`) are mapped into the CSDM hierarchy:

- SaaS applications (Salesforce, Workday, etc.) become Business Applications
- PaaS services (AWS RDS, Azure SQL, etc.) become Technical Services
- IaaS resources (EC2, Azure VMs) remain at Infrastructure layer
- Cloud-to-on-prem integrations create cross-boundary dependency relationships

#### EA Reconciliation at Service Level

Map discovered services to the Enterprise Architecture portfolio:

- Compare Contour's discovered business services against EA-registered services
- Identify: matched (confirmed), unmatched-discovered (shadow IT), unmatched-EA (paper-only services)
- Provide reconciliation workflow: auto-match by name similarity, manual review for ambiguous cases

---

## 3. Technical Architecture

### 3.1 Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTOUR ARCHITECTURE                          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Go Backend (Contour Engine)                   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │ Webhook      │  │ CSDM         │  │ SN Sync      │   │   │
│  │  │ Consumer     │  │ Pipeline     │  │ Engine       │   │   │
│  │  │ (events in)  │  │ (5-step)     │  │ (REST API)   │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │ Dependency   │  │ Impact       │  │ Health       │   │   │
│  │  │ Graph        │  │ Calculator   │  │ Aggregator   │   │   │
│  │  │ Builder      │  │              │  │              │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  │  ┌──────────────┐                                        │   │
│  │  │ Webhook      │  Port 8110 (API)                       │   │
│  │  │ Publisher    │  Port 8111 (Mapping Engine)             │   │
│  │  │ (events out) │                                        │   │
│  │  └──────────────┘                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           Python Intelligence (FastAPI)                    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │ Business Svc │  │ EA           │  │ Service Name │   │   │
│  │  │ Suggestion   │  │ Reconciler   │  │ Generator    │   │   │
│  │  │ (Claude API) │  │              │  │              │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         ServiceNow Scoped App (x_avnth)                   │   │
│  │  Tables, Business Rules, REST APIs, Flow Designer,        │   │
│  │  Polaris Workspace Pages                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Go Backend

The Go backend is the core engine. It follows the same patterns as the Pathfinder gateway.

**Project layout:**

```
contour/
  cmd/
    contour-engine/
      main.go                 # Entry point
  internal/
    config/
      config.go               # YAML config loading
    pipeline/
      step1_app_instance.go   # Application instance detection
      step2_biz_app.go        # Business application clustering
      step3_tech_service.go   # Technical service assembly
      step4_biz_service.go    # Business service suggestion (calls Python)
      step5_csdm_sync.go      # CSDM record creation in ServiceNow
      pipeline.go             # Orchestrator
    graph/
      dependency.go           # Dependency graph builder
      impact.go               # Change impact calculator
      health.go               # Health aggregation
    webhook/
      consumer.go             # Inbound webhook handler
      publisher.go            # Outbound event publisher
    servicenow/
      client.go               # ServiceNow REST API client
      tables.go               # Table-specific CRUD
      relationships.go        # cmdb_rel_ci management
    model/
      app_instance.go         # App instance data model
      business_app.go         # Business application data model
      tech_service.go         # Technical service data model
      business_service.go     # Business service data model
      service_model.go        # Service model metadata
      relationship.go         # Relationship types
    patterns/
      signatures.go           # Application signature library
      community.go            # Louvain community detection
  config/
    contour-dev.yaml          # Development config
    contour-prod.yaml         # Production config
  go.mod
  go.sum
  Dockerfile
  Makefile
```

**Key dependencies (Go):**

```go
// go.mod
module github.com/avennorth/contour

go 1.22

require (
    go.uber.org/zap v1.27.0          // Structured logging
    github.com/jackc/pgx/v5 v5.6.0   // PostgreSQL driver
    gopkg.in/yaml.v3 v3.0.1          // Config parsing
    google.golang.org/grpc v1.64.0    // gRPC (if needed for internal comms)
    github.com/gin-gonic/gin v1.10.0  // HTTP API
)
```

### 3.3 Python Intelligence Service

A FastAPI service that handles AI-powered operations: business service suggestion, EA reconciliation, and intelligent naming.

**Project layout:**

```
contour/
  intelligence/
    main.py                   # FastAPI app entry
    config.py                 # Settings via pydantic
    routers/
      suggestion.py           # POST /suggest-business-service
      reconciliation.py       # POST /reconcile-ea
      naming.py               # POST /generate-service-name
    services/
      claude_client.py        # Anthropic SDK wrapper
      suggestion_engine.py    # Business service suggestion logic
      ea_reconciler.py        # EA reconciliation logic
      naming_engine.py        # Service name generation
    models/
      request.py              # Pydantic request models
      response.py             # Pydantic response models
      service.py              # Service domain models
    requirements.txt
    Dockerfile
```

**Key dependencies (Python):**

```
fastapi>=0.115.0
uvicorn>=0.30.0
anthropic>=0.39.0
pydantic>=2.9.0
httpx>=0.27.0
```

### 3.4 ServiceNow Scoped App

Contour's ServiceNow components live within the shared `x_avnth` scoped app. These include tables, business rules, REST APIs, Flow Designer workflows, and Polaris workspace pages.

### 3.5 Data Flow — No Direct Product-to-Product Calls

Contour NEVER calls Pathfinder's API directly. All data flows through ServiceNow CMDB:

1. Pathfinder discovers infrastructure and writes CIs to CMDB
2. Pathfinder publishes webhook events (`ci.created`, `integration.discovered`, `cloud_service.discovered`)
3. Contour's webhook consumer receives events
4. Contour reads the full CI data from ServiceNow CMDB via REST API
5. Contour runs the 5-step pipeline
6. Contour writes service model records to ServiceNow CMDB
7. Contour publishes `service_model.updated` webhook event
8. Bearing, Vantage, and Ledger consume that event

---

## 4. CSDM Tables Owned by Contour

### 4.1 x_avnth_service_model — Service Model Metadata

Tracks the overall state of Contour's service model. One active record at a time.

| Field | Type | Description |
|-------|------|-------------|
| `model_version` | Integer | Auto-incrementing version number |
| `last_computed` | DateTime | When the pipeline last completed |
| `total_business_services` | Integer | Count of business services |
| `total_business_apps` | Integer | Count of business applications |
| `total_technical_services` | Integer | Count of technical services |
| `total_app_instances` | Integer | Count of application instances |
| `confidence_avg` | Decimal (0.00-1.00) | Average confidence across all records |
| `status` | Choice | Draft / Reviewed / Published |
| `discovery_sources` | String | Comma-separated: "Pathfinder,Armis,SN Discovery" |
| `computed_by` | String | "contour-engine v{version}" |

### 4.2 x_avnth_app_instance — Application Instances

Represents a specific running instance of an application on a server.

| Field | Type | Description |
|-------|------|-------------|
| `name` | String | Auto-generated: "{app_type} on {hostname}" |
| `application_type` | String | Detected application (e.g., "Apache Tomcat", "PostgreSQL") |
| `host_server` | Reference (cmdb_ci_server) | Server this instance runs on |
| `process_name` | String | Primary process name |
| `listening_ports` | String | Comma-separated ports (e.g., "8080,8443") |
| `business_app` | Reference (cmdb_ci_business_app) | Parent business application |
| `confidence` | Decimal (0.00-1.00) | Detection confidence |
| `signature_match` | String | Which pattern matched (e.g., "tomcat-default") |
| `discovery_source` | String | Which discovery source provided the data |
| `first_detected` | DateTime | When first detected |
| `last_confirmed` | DateTime | When last confirmed running |
| `status` | Choice | Active / Stale / Decommissioned |

### 4.3 Standard CSDM Tables (Contour writes to these)

**cmdb_ci_service_auto** — Business Services (auto-discovered)

Contour writes to the standard ServiceNow table. Key fields Contour populates:

| Field | Source | Description |
|-------|--------|-------------|
| `name` | AI-suggested | Business-friendly service name |
| `short_description` | AI-suggested | 2-3 sentence description |
| `service_status` | Computed | Operational / Degraded / Non-Operational |
| `busines_criticality` | AI-suggested | Critical / High / Medium / Low |
| `owned_by` | AI-suggested | Suggested department/owner |
| `u_contour_confidence` | Pipeline | 0.00-1.00 model confidence |
| `u_contour_model_version` | Pipeline | Service model version that created this |
| `u_contour_status` | Workflow | Draft / Reviewed / Published |
| `u_contour_source` | Pipeline | "contour-engine" |

**cmdb_ci_business_app** — Business Applications

| Field | Source | Description |
|-------|--------|-------------|
| `name` | Derived | Application name from signature matching |
| `short_description` | Generated | Description of the application |
| `u_instance_count` | Computed | Number of running instances |
| `u_contour_confidence` | Pipeline | Detection confidence |
| `u_contour_model_version` | Pipeline | Service model version |

**cmdb_ci_service_technical** — Technical Services

| Field | Source | Description |
|-------|--------|-------------|
| `name` | Derived | Cluster name from community detection |
| `short_description` | Generated | Description of the technical service |
| `u_app_count` | Computed | Number of member applications |
| `u_integration_density` | Computed | Integration count within cluster |
| `u_contour_confidence` | Pipeline | Clustering confidence |
| `u_contour_model_version` | Pipeline | Service model version |

### 4.4 Relationship Types Created by Contour

All relationships are stored in `cmdb_rel_ci` using these relationship types:

| Parent | Child | Relationship Type | Meaning |
|--------|-------|-------------------|---------|
| Server | App Instance | `Contains::ContainedBy` | Server hosts this app instance |
| Business App | App Instance | `Hosts::HostedOn` | App has these running instances |
| Technical Service | Business App | `Contains::ContainedBy` | Tech service contains these apps |
| Business Service | Technical Service | `ProvidedBy::Provides` | Business service is provided by tech services |
| Business App | Business App | `DependsOn::DependedOnBy` | Application dependency (via integration) |
| Business Service | Business Service | `DependsOn::DependedOnBy` | Service dependency (derived from app dependencies) |

---

## 5. Webhook Events

### 5.1 Events Contour Consumes (from Pathfinder)

```json
// ci.created — A new CI was added to CMDB
{
  "event": "ci.created",
  "source": "pathfinder",
  "timestamp": "2026-03-31T12:00:00Z",
  "payload": {
    "sys_id": "abc123",
    "ci_class": "cmdb_ci_app_server",
    "name": "prod-web-01",
    "discovery_source": "pathfinder-ebpf",
    "confidence": 0.95
  }
}

// integration.discovered — A new integration was found
{
  "event": "integration.discovered",
  "source": "pathfinder",
  "timestamp": "2026-03-31T12:00:00Z",
  "payload": {
    "sys_id": "def456",
    "source_ci": "abc123",
    "target_ci": "ghi789",
    "integration_type": "API",
    "confidence": 0.90,
    "ports": [443],
    "process_name": "nginx"
  }
}

// cloud_service.discovered — A cloud/SaaS service was detected
{
  "event": "cloud_service.discovered",
  "source": "pathfinder-cloud",
  "timestamp": "2026-03-31T12:00:00Z",
  "payload": {
    "sys_id": "jkl012",
    "service_name": "Salesforce Sales Cloud",
    "provider": "SaaS",
    "service_type": "Application",
    "unique_clients": 12,
    "confidence": 0.92
  }
}
```

### 5.2 Events Contour Publishes

```json
// service_model.updated — Contour completed a pipeline run
{
  "event": "service_model.updated",
  "source": "contour",
  "timestamp": "2026-03-31T12:05:00Z",
  "payload": {
    "model_version": 42,
    "status": "Draft",
    "changes": {
      "business_services_created": 2,
      "business_services_updated": 5,
      "business_apps_created": 8,
      "technical_services_updated": 3,
      "app_instances_created": 15,
      "relationships_created": 47
    },
    "confidence_avg": 0.84,
    "discovery_sources": ["pathfinder", "armis"]
  }
}
```

### 5.3 Webhook Registration

Contour registers as a webhook subscriber in the Avennorth webhook registry:

```yaml
# contour webhook subscription config
subscriptions:
  - event: "ci.created"
    source: "*"                    # Any discovery source
    endpoint: "/webhooks/ci-created"
    filter:
      ci_class:
        - "cmdb_ci_server"
        - "cmdb_ci_app_server"
        - "cmdb_ci_cloud_service"
        - "cmdb_ci_medical_device"
  - event: "integration.discovered"
    source: "*"
    endpoint: "/webhooks/integration-discovered"
  - event: "cloud_service.discovered"
    source: "*"
    endpoint: "/webhooks/cloud-service-discovered"
  - event: "assessment.completed"
    source: "bearing"
    endpoint: "/webhooks/assessment-completed"
```

---

## 6. Pricing

### 6.1 Standalone Pricing

Contour standalone pricing by managed node tier:

| Tier | Managed Nodes | Annual Price |
|------|---------------|-------------|
| **S** | Up to 500 | $50,000/yr |
| **M** | 501-2,000 | $100,000/yr |
| **L** | 2,001-5,000 | $150,000/yr |
| **XL** | 5,001+ | Custom |

### 6.2 Bundle Pricing (Primary Offering)

The Pathfinder + Contour bundle is the primary sales motion. It replaces ServiceNow ITOM Visibility + Service Mapping at 85-90% lower cost.

| Tier | Managed Nodes | Pathfinder + Contour Bundle | Savings vs. Standalone |
|------|---------------|---------------------------|----------------------|
| **S** | Up to 500 | $70,000/yr | 30% discount |
| **M** | 501-2,000 | $140,000/yr | 30% discount |
| **L** | 2,001-5,000 | $210,000/yr | 30% discount |
| **XL** | 5,001+ | Custom | Volume discount |

**Sales one-liner:** "Pathfinder discovers your integrations. Contour builds your service map. Together, they replace ITOM Visibility + Service Mapping at a fraction of the cost."

### 6.3 Professional Add-On

**Contour Professional: AI Business Service Suggestion**

- $2,000-5,000/month (based on model run frequency and CMDB size)
- Includes: Claude-powered business service naming and grouping, EA reconciliation, service description generation
- Requires: `ANTHROPIC_API_KEY` (customer provides) or Avennorth-managed AI service

### 6.4 Competitive Positioning

| Competitor | Annual Cost (1,000 nodes) | What You Get |
|-----------|--------------------------|-------------|
| ServiceNow ITOM Visibility | $800K-1.2M/yr | Discovery + Service Mapping |
| ServiceNow Service Mapping alone | $400K-600K/yr | Pattern-based mapping only |
| **Avennorth Pathfinder + Contour** | **$140K/yr** | Discovery + AI Service Mapping |
| **Cost savings** | **85-90%** | Same outcome, fraction of the cost |

---

## 7. ServiceNow Workspace

Contour includes Polaris workspace pages for ServiceNow. These are built using the ServiceNow UI Builder (Polaris experience) and follow the Avennorth design system.

### 7.1 Service Catalog Page

**Purpose:** Browse all discovered services organized by CSDM layer.

**Layout:**
- Top: Summary cards (total business services, business apps, technical services, app instances)
- Left: CSDM layer filter (Business Service / Business App / Technical Service / Infrastructure)
- Center: Searchable/filterable table of services at the selected layer
- Right: Detail panel (selected service details, relationships, health, confidence)

**Key interactions:**
- Click a business service to drill down into its technical services, then apps, then instances
- Filter by confidence level, discovery source, status (Draft/Reviewed/Published)
- Bulk actions: approve draft services, assign owners, set criticality

### 7.2 Service Map Page

**Purpose:** Interactive visual graph showing service dependencies.

**Layout:**
- Full-width graph visualization (force-directed or hierarchical layout)
- Top toolbar: layout mode (hierarchy/force/radial), zoom, search, filter
- Nodes: colored by CSDM layer (business service = blue, tech service = green, app = purple, infrastructure = gray)
- Edges: colored by health (green = healthy, yellow = degraded, red = critical)
- Click a node to see detail panel with relationships, health, and impact

**Key interactions:**
- Drill down: click a business service to expand its sub-graph
- Highlight path: select two nodes to show all paths between them
- Isolate: right-click a node to show only its dependencies (upstream and downstream)
- Export: SVG or PNG of current view

### 7.3 Service Health Page

**Purpose:** Aggregated health view from infrastructure up through business services.

**Layout:**
- Top: Health distribution chart (pie: healthy/degraded/critical/unknown)
- Center: Heatmap grid — rows = business services, columns = health dimensions (availability, performance, integration health, coverage)
- Bottom: Health trend over time (line chart, last 30 days)

**Key interactions:**
- Click a cell in the heatmap to see which underlying CIs are driving the health score
- Filter by criticality, owner, CSDM layer
- Set health thresholds for alerting

### 7.4 CSDM Coverage Page

**Purpose:** Which CSDM layers are populated? Where are gaps?

**Layout:**
- Top: CSDM coverage summary (4 layer bars showing % populated)
- Center: Gap analysis table — CIs that exist at infrastructure layer but have no parent business app or service
- Right: Coverage trend over time

**Key interactions:**
- Click a gap to see the unmapped CI and get Contour's suggestion for where it belongs
- Bulk-assign unmapped CIs to existing services
- Run on-demand pipeline for specific CIs

### 7.5 Change Impact Page

**Purpose:** Simulate "what if this CI goes offline?" across the service graph.

**Layout:**
- Top: Search/select a CI to simulate taking offline
- Center: Blast radius visualization (same graph as Service Map, but affected nodes highlighted in red)
- Right: Impact summary — affected business services, estimated users, downstream dependencies
- Bottom: Table of all affected CIs with their CSDM layer and criticality

**Key interactions:**
- Select one or more CIs to simulate simultaneous failure
- Toggle between "direct impact" (immediate dependencies) and "transitive impact" (full blast radius)
- Export impact report (PDF/XLSX) for change advisory board

---

## 8. Prototype Requirements

### 8.1 Technology

- **Framework:** React 18+ with Vite
- **Port:** 4202 (per Avennorth port registry)
- **Styling:** Tailwind CSS with Avennorth design tokens
- **Graph visualization:** Use `reactflow` (formerly React Flow) or `d3-force` for service map
- **Charts:** Recharts
- **Icons:** Lucide React
- **Routing:** React Router v6
- **State:** React hooks (no Redux needed for prototype)

### 8.2 Theme System

Support dark mode (default) and light mode, matching the Pathfinder prototype theme:

```javascript
const theme = {
  dark: {
    bg: '#0C0A09',           // stone-950
    surface: '#1C1917',      // stone-900 (obsidian)
    surfaceHover: '#292524',  // stone-800
    border: '#44403C',        // stone-700
    text: '#FFFFFF',
    textMuted: '#A8A29E',    // stone-400
    accent: '#39FF14',        // electric lime
    accentDim: '#39FF1433',   // electric lime at 20% opacity
    healthy: '#22C55E',       // green-500
    degraded: '#EAB308',      // yellow-500
    critical: '#EF4444',      // red-500
    unknown: '#6B7280',       // gray-500
    // CSDM layer colors
    businessService: '#3B82F6',   // blue-500
    businessApp: '#8B5CF6',       // violet-500
    technicalService: '#10B981',  // emerald-500
    infrastructure: '#6B7280',    // gray-500
  },
  light: {
    bg: '#FFFFFF',
    surface: '#F5F5F4',      // stone-100
    surfaceHover: '#E7E5E4',  // stone-200
    border: '#D6D3D1',        // stone-300
    text: '#1C1917',          // obsidian
    textMuted: '#78716C',     // stone-500
    accent: '#15803D',        // green-700 (dark lime for legibility)
    // ... same semantic colors
  }
};
```

### 8.3 Demo Data — Mercy Health System

Use the same fictional organization as Pathfinder: **Mercy Health System**, a multi-facility hospital network.

**Business Services (auto-discovered by Contour):**

| Name | Criticality | Status | Technical Services | Health |
|------|-------------|--------|-------------------|--------|
| Online Patient Portal | Critical | Published | Portal Backend, Authentication Services | Healthy |
| Electronic Health Records | Critical | Published | Epic Hyperspace Cluster, Clinical Integration Hub | Healthy |
| Medical Device Management | Critical | Published | Device Monitoring Services, Biomedical Workflow | Degraded |
| Revenue Cycle Operations | High | Published | Billing Engine, Claims Processing, Payment Gateway | Healthy |
| Staff Scheduling & Workforce | Medium | Reviewed | UKG Pro Integration, Scheduling Services | Healthy |
| Laboratory Information Services | High | Published | Lab Instrument Cluster, Results Distribution | Healthy |
| Pharmacy Operations | Critical | Draft | Pharmacy Dispensing, Drug Interaction Services | Healthy |
| Supply Chain Management | Medium | Draft | Procurement Services, Inventory Management | Unknown |

**Business Applications:**

| Name | Type | Instances | Integrations | CSDM Layer |
|------|------|-----------|-------------|------------|
| Epic Hyperspace | EHR | 6 | 24 | Business App |
| Epic Cabernet | Revenue Cycle | 3 | 12 | Business App |
| Alaris Infusion System | Medical Device | 47 | 8 | Business App |
| McKesson Pharmacy | Pharmacy | 2 | 6 | Business App |
| UKG Pro | Workforce | 1 (SaaS) | 5 | Business App |
| Salesforce Health Cloud | CRM | 1 (SaaS) | 7 | Business App |
| Azure AD | Identity | 1 (SaaS) | 14 | Business App |
| Apache Tomcat (Portal) | Web Server | 4 | 8 | Business App |
| PostgreSQL (Portal DB) | Database | 2 | 4 | Business App |
| RabbitMQ (Integration Bus) | Messaging | 3 | 18 | Business App |

**Technical Services:**

| Name | Member Apps | Integration Density | Health |
|------|-----------|-------------------|--------|
| Portal Backend Services | Tomcat, PostgreSQL, RabbitMQ | 30 integrations | Healthy |
| Authentication Services | Azure AD, LDAP Proxy | 14 integrations | Healthy |
| Epic Hyperspace Cluster | Epic Hyperspace, Epic Cabernet | 36 integrations | Healthy |
| Clinical Integration Hub | RabbitMQ, HL7 Translator, FHIR Gateway | 22 integrations | Healthy |
| Device Monitoring Services | Alaris Infusion, GE Monitors, Device Gateway | 15 integrations | Degraded |
| Biomedical Workflow | Maintenance Scheduler, Calibration Tracker | 6 integrations | Healthy |
| Lab Instrument Cluster | Analyzer Interface, LIS Gateway | 10 integrations | Healthy |

**Prototype pages to implement:**

1. **Service Catalog** — Table/card view of all services by CSDM layer with drill-down
2. **Service Map** — Interactive graph visualization of service dependencies
3. **Service Health** — Health heatmap and trend charts
4. **CSDM Coverage** — Layer-by-layer coverage bars and gap analysis
5. **Change Impact** — CI selector with blast radius visualization

### 8.4 Navigation

Sidebar navigation matching Avennorth workspace pattern:

```
Contour
  Service Catalog
  Service Map
  Service Health
  CSDM Coverage
  Change Impact
  ──────────────
  Settings
```

Header: Avennorth logo (left), product name "Contour" with tagline, theme toggle (right).

---

## 9. Deliverables

Build these deliverables in this order:

### 9.1 Architecture Spec

A markdown document covering:
- Component architecture (Go backend + Python intelligence + ServiceNow scoped app)
- Data flow diagrams
- API contracts (webhook consumer + publisher)
- Deployment model (Docker, K8s, standalone)
- Security model (mTLS, OAuth, RBAC)

### 9.2 CSDM Service Modeling Pipeline Spec

A markdown document with:
- Detailed algorithm for each of the 5 pipeline steps
- Pseudocode for each step
- Input/output data contracts
- Confidence scoring methodology
- Error handling and retry logic
- Performance considerations (batch sizes, rate limiting)

### 9.3 ServiceNow Table Definitions

A markdown document with:
- Full table definitions (all fields, types, constraints)
- Relationship type definitions
- Business rule specifications
- ACL definitions
- Scripted REST API definitions

### 9.4 API Contracts

A markdown document (or OpenAPI spec) with:
- Webhook consumer endpoints (what Contour receives)
- Webhook publisher events (what Contour sends)
- Internal API between Go backend and Python intelligence service
- ServiceNow REST API usage patterns

### 9.5 Product Spec with Pricing

A markdown document with:
- Product positioning and value proposition
- Feature matrix (standalone vs. bundle vs. professional)
- Pricing tables
- Competitive comparison
- Target buyer personas
- Sales playbook outline

### 9.6 Interactive Prototype

A Vite React application:
- Port 4202
- 5 pages (Service Catalog, Service Map, Service Health, CSDM Coverage, Change Impact)
- Dark/light theme
- Mercy Health System demo data
- Responsive layout
- No backend required — all demo data is static/mocked

### 9.7 Demo Data Package

A JSON/JavaScript module containing:
- Complete Mercy Health System service model
- All CSDM layers populated with realistic data
- Integration relationships between all services
- Health scores and trends (30-day mock data)
- Change impact scenarios (pre-computed blast radius for key CIs)

### 9.8 Business Case

A markdown document using the Avennorth financial template:
- Problem statement (cost of manual service mapping, ITOM Visibility pricing)
- Solution overview (Pathfinder + Contour bundle)
- TCO comparison (3-year: Avennorth vs. ServiceNow native)
- ROI model (time saved, accuracy improved, incident response accelerated)
- Risk analysis

---

## 10. Coding Conventions

### 10.1 Go (Backend Engine)

- Go 1.22+ with modules
- Follow Go standard project layout (`cmd/`, `internal/`, `pkg/`)
- Use `internal/` for all non-exported packages
- Structured logging with `go.uber.org/zap`
- PostgreSQL with `jackc/pgx/v5`
- Configuration via YAML files parsed with `gopkg.in/yaml.v3`
- HTTP API with `gin-gonic/gin`
- gRPC with `google.golang.org/grpc` (for internal service communication if needed)
- Context propagation on all function signatures
- Error wrapping with `fmt.Errorf("operation: %w", err)`
- Tests: `go test ./...` with 80%+ coverage on pipeline logic
- Linting: `golangci-lint run`

### 10.2 Python (Intelligence Service)

- Python 3.11+
- Type hints on all function signatures
- Data models with `pydantic` v2
- API framework: `FastAPI` with `uvicorn`
- Claude API calls via `anthropic` SDK
- HTTP client: `httpx` (async)
- Tests: `pytest` with 80%+ coverage
- Formatting: `black` + `isort`
- Linting: `ruff`

### 10.3 ServiceNow (Scoped App)

- Scope prefix: `x_avnth_`
- All custom tables in `x_avnth` scope
- Use standard CSDM tables (`cmdb_ci_service_auto`, `cmdb_ci_business_app`, `cmdb_ci_service_technical`) where they exist — do not create custom tables for standard CSDM entities
- Business rules: use `current` and `previous` objects, never GlideRecord in display business rules
- Scripted REST: version all endpoints under `/api/x_avnth/contour/v1/`
- Flow Designer: use for all automated workflows (model review, approval, publication)
- Polaris workspace: use UI Builder for all workspace pages
- Utah+ compatibility required

### 10.4 React Prototype

- Vite + React 18
- Tailwind CSS for styling
- Component files: PascalCase (e.g., `ServiceCatalog.jsx`)
- Data files: camelCase (e.g., `demoData.js`)
- One component per file
- Props destructuring in function signature
- No class components — hooks only

### 10.5 CI/CD

- GitHub Actions for all pipelines
- Go: `go test`, `go vet`, `golangci-lint`
- Python: `pytest`, `ruff`, `mypy`
- React: `vitest` (unit), Playwright (e2e if needed)
- Docker builds for Go backend and Python service
- Helm charts for Kubernetes deployment

---

## 11. Constraints

These are non-negotiable design constraints:

1. **Discovery-agnostic:** Contour works with data from Pathfinder, Armis, ServiceNow Discovery, or any source that populates CMDB. The only hard dependency is that CIs exist in `cmdb_ci` with relationships in `cmdb_rel_ci`.

2. **No discovery duplication:** Contour NEVER discovers infrastructure. It only consumes discovery data from other sources. If no discovery data exists, Contour has nothing to model.

3. **CSDM compliance:** Use standard ServiceNow CSDM tables where they exist. Only create custom `x_avnth_` tables for metadata that has no CSDM equivalent (service model metadata, app instances).

4. **Shared namespace:** All ServiceNow components use the `x_avnth` scoped app. Contour does not get its own scope.

5. **ServiceNow Utah+ compatibility:** All ServiceNow components must work on Utah and later releases.

6. **Human-in-the-loop for business services:** AI-suggested business services are ALWAYS created as Draft. They require human review and approval before being Published. The pipeline never auto-publishes business services.

7. **Idempotent pipeline:** Running the pipeline multiple times with the same data produces the same result. No duplicate records. No orphaned relationships.

8. **Versioned model:** Every pipeline run produces a new model version. Previous versions are retained for rollback and audit.

9. **Performance:** The pipeline must handle 10,000+ CIs and 50,000+ relationships within a 30-minute window.

10. **No product-to-product API calls:** Contour communicates with other Avennorth products only through ServiceNow CMDB and the webhook event bus. No direct HTTP/gRPC calls to Pathfinder, Bearing, or Vantage.

---

## 12. Environment Variables

| Variable | Component | Description |
|----------|-----------|-------------|
| `CONTOUR_DB_URL` | Go Backend | PostgreSQL connection string |
| `CONTOUR_SN_INSTANCE` | Go Backend | ServiceNow instance URL |
| `CONTOUR_SN_CLIENT_ID` | Go Backend | ServiceNow OAuth client ID |
| `CONTOUR_SN_CLIENT_SECRET` | Go Backend | ServiceNow OAuth client secret |
| `CONTOUR_WEBHOOK_SECRET` | Go Backend | Shared secret for webhook HMAC validation |
| `CONTOUR_INTELLIGENCE_URL` | Go Backend | URL of the Python intelligence service |
| `ANTHROPIC_API_KEY` | Python Intelligence | Claude API key for business service suggestion |
| `CONTOUR_LOG_LEVEL` | Both | debug / info / warn / error |
| `CONTOUR_PIPELINE_INTERVAL` | Go Backend | Cron expression for scheduled pipeline runs |
| `CONTOUR_PIPELINE_BATCH_SIZE` | Go Backend | Number of CIs to process per batch (default: 500) |

---

## 13. Repository Structure

```
contour/
  README.md
  LICENSE
  Makefile
  docker-compose.yml
  .github/
    workflows/
      ci.yml
      release.yml
  cmd/
    contour-engine/
      main.go
  internal/
    config/
    pipeline/
    graph/
    webhook/
    servicenow/
    model/
    patterns/
  config/
    contour-dev.yaml
    contour-prod.yaml
  intelligence/
    main.py
    config.py
    routers/
    services/
    models/
    requirements.txt
    Dockerfile
  servicenow/
    tables/
    business_rules/
    rest_api/
    flows/
    workspace/
    update_sets/
  charts/
    contour/
      Chart.yaml
      values.yaml
      templates/
  prototype/
    package.json
    vite.config.js
    tailwind.config.js
    index.html
    src/
      main.jsx
      App.jsx
      theme.js
      data/
        demoData.js
        mercyHealthServices.js
      components/
        Layout.jsx
        Sidebar.jsx
        Header.jsx
        ServiceGraph.jsx
        HealthHeatmap.jsx
        BlastRadius.jsx
      pages/
        ServiceCatalog.jsx
        ServiceMap.jsx
        ServiceHealth.jsx
        CSDMCoverage.jsx
        ChangeImpact.jsx
  docs/
    architecture.md
    pipeline-spec.md
    table-definitions.md
    api-contracts.md
    product-spec.md
    business-case.md
  tests/
    go/
    python/
    prototype/
  Dockerfile
  go.mod
  go.sum
```

---

## 14. Pathfinder Data Model Reference

This section provides the complete Pathfinder data model that Contour reads from. You need this to build Contour without the Pathfinder repo.

### 14.1 x_avnth_pathfinder_agent — Enrolled Agents

| Field | Type | Description |
|-------|------|-------------|
| `agent_id` | String (UUID) | Unique agent identifier |
| `hostname` | String | Server hostname |
| `ip_address` | String | Primary IP |
| `os_type` | Choice | Linux / Windows / K8s |
| `os_version` | String | Kernel/OS version |
| `agent_version` | String | Pathfinder agent version |
| `status` | Choice | Active / Stale / Decommissioned |
| `coverage_tier` | Integer (1-4) | Assigned monitoring tier |
| `device_tier` | Integer (1-4) | Device classification tier |
| `last_heartbeat` | DateTime | Most recent heartbeat |
| `flows_collected` | Integer | Total flows observed |
| `module_license` | String | Active modules ("base,clinical,cloud") |
| `facility` | Reference | Facility this agent belongs to |

### 14.2 x_avnth_cmdb_ci_integration — Discovered Integrations

Extends `cmdb_ci`. Represents a logical connection between two applications.

| Field | Type | Description |
|-------|------|-------------|
| `source_ci` | Reference (cmdb_ci) | Source application/server |
| `target_ci` | Reference (cmdb_ci) | Target application/server |
| `integration_type` | Choice | API / Database / Messaging / Email / Directory / File Transfer / Clinical / Cloud |
| `classification_confidence` | Decimal | 0.0-1.0 |
| `health_status` | Choice | Healthy / Degraded / Critical / Unknown |
| `health_score` | Integer | 0-100 |
| `ai_summary` | String (4000) | Claude-generated summary |
| `ea_status` | Choice | Unmapped / Suggested / Confirmed / Disputed |
| `discovery_source` | String | Which discovery source |
| `first_observed` | DateTime | First seen |
| `last_observed` | DateTime | Most recent |
| `flow_count` | Integer | Total flows |

### 14.3 x_avnth_cmdb_ci_interface — Data Exchange Pathways

Extends `cmdb_ci`. Child of Integration CI (1:M). Represents a specific protocol/port pathway.

| Field | Type | Description |
|-------|------|-------------|
| `integration` | Reference (x_avnth_cmdb_ci_integration) | Parent integration |
| `protocol` | String | TCP, UDP, etc. |
| `port` | Integer | Destination port |
| `process_name` | String | Server-side process name |
| `direction` | Choice | Inbound / Outbound / Bidirectional |
| `bytes_in` | Long | Total bytes received |
| `bytes_out` | Long | Total bytes sent |
| `classification` | String | Specific protocol classification (e.g., "HTTPS", "PostgreSQL", "HL7") |

### 14.4 x_avnth_cloud_service — Cloud/SaaS Services

Extends `cmdb_ci_cloud_service`.

| Field | Type | Description |
|-------|------|-------------|
| `service_name` | String | "Salesforce Sales Cloud" |
| `provider` | Choice | AWS / Azure / GCP / SaaS / Other |
| `service_type` | Choice | Compute / Database / Storage / Messaging / Identity / Application / Analytics |
| `endpoint_pattern` | String | `*.salesforce.com` |
| `region` | String | Cloud region if applicable |
| `unique_clients` | Integer | How many on-prem apps connect |
| `connection_pattern` | Choice | Polling / Event-Driven / Batch / Continuous |
| `csdm_category` | Choice | Business Application / Technical Service / Infrastructure |
| `confidence` | Decimal | 0.0-1.0 |

### 14.5 x_avnth_clinical_device — Clinical Devices

Extends `cmdb_ci_medical_device`.

| Field | Type | Description |
|-------|------|-------------|
| `fda_product_code` | String | FDA classification |
| `gmdn_code` | String | Global Medical Device Nomenclature |
| `udi` | String | Unique Device Identifier |
| `device_class` | Choice | I / II / III |
| `life_critical` | Boolean | Tier 4 flag |
| `department` | Reference | Clinical department |
| `care_area` | String | ICU, OR, ED, etc. |
| `clinical_protocol` | Choice | HL7 / FHIR / DICOM / IEEE 11073 |

### 14.6 x_avnth_integration_health_log — Health Telemetry

| Field | Type | Description |
|-------|------|-------------|
| `integration` | Reference | Parent integration CI |
| `timestamp` | DateTime | When this measurement was taken |
| `health_score` | Integer (0-100) | Computed health score |
| `latency_ms` | Integer | Average latency in milliseconds |
| `error_rate` | Decimal | Error rate (0.0-1.0) |
| `throughput` | Integer | Flows per minute |
| `anomaly_detected` | Boolean | Whether anomaly detection flagged this |

---

## 15. Port Registry

Contour's assigned ports in the Avennorth development environment:

| Port | Service | Notes |
|------|---------|-------|
| 4202 | Prototype (Vite React) | Development only |
| 8110 | Contour API | Go backend REST API |
| 8111 | Mapping Engine | Service mapping pipeline |

Other Avennorth ports (avoid conflicts):

| Port | Product | Service |
|------|---------|---------|
| 4200 | Pathfinder | Prototype |
| 4201 | Bearing | Prototype |
| 4203 | Vantage | Prototype |
| 4210 | Portfolio | Hub |
| 8080 | Pathfinder | Shared AI Engine |
| 8081-8086 | Pathfinder | Intelligence services |
| 8100-8101 | Bearing | API + Assessment Engine |
| 8120-8122 | Vantage | API + Incident Engine |
| 8443 | Pathfinder | Gateway gRPC |
| 5432 | Pathfinder | PostgreSQL |

---

*Avennorth Contour — Complete Project Prompt*
*Generated: 2026-03-31*
*Source: Pathfinder repository shared data model + portfolio architecture*
