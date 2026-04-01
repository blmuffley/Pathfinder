# Pathfinder Technical Deep Dive Demo Script — 50 Minutes

**Duration:** 50 minutes + Q&A
**Audience:** ServiceNow architects, CMDB engineers, clinical engineering, security teams, implementation partners
**Demo environment:** http://localhost:4200 (Mercy Health System prototype data — 3 facilities, 6,425 devices)
**Last updated:** 2026-03-31

---

## Pre-Demo Setup

### Full Checklist

- [ ] Prototype running at http://localhost:4200 — verify ALL pages load (sidebar fully expanded, click through every page)
- [ ] Browser: Chrome or Edge, fullscreen (F11), zoom 100%
- [ ] Starting page: PATHFINDER > Overview > Overview subtab
- [ ] Second monitor with this script visible to presenter only
- [ ] Terminal window open to `~/Code/Pathfinder/` for optional code walkthroughs
- [ ] Architecture docs loaded in tabs (optional, for deep Q&A):
  - `docs/architecture/01-integration-interface-intelligence.md`
  - `docs/architecture/02-physical-architecture.md`
  - `docs/architecture/07-discovery-normalization-layer.md`
- [ ] Sidebar navigation fully expanded so the audience sees the full page structure

### Optional: Code & Architecture Readiness

These are for audiences that want to see real implementation, not just the UI.

- [ ] Terminal tab 1: `~/Code/Pathfinder/src/agent/linux/ebpf/` — have `flow_tracker.c` ready to show
- [ ] Terminal tab 2: `~/Code/Pathfinder/src/gateway/internal/classify/` — have `rules.go` and `engine.go` ready
- [ ] Terminal tab 3: `~/Code/Pathfinder/src/intelligence/cmdb-ops-agent/agents/` — agent list visible
- [ ] Terminal tab 4: `~/Code/Pathfinder/src/servicenow/` — table definitions, business rules, scripted REST
- [ ] Architecture diagram image (from `docs/architecture/02-physical-architecture.md` four-tier diagram) on clipboard or printout

### Audience Profile & Customization

Read the room before you start. Adjust emphasis based on who is present.

| Audience Segment | What They Care About | Adjust |
|------------------|---------------------|--------|
| **ServiceNow Architects** | Data model, CSDM alignment, scoped app design, REST APIs, Flow Designer | Spend more time on Act 5 (SN Integration). Show table JSON definitions. Walk through business rules. |
| **CMDB Engineers** | Classification accuracy, deduplication, confidence scoring, stale detection | Spend more time on Act 2-3 (Classification + Normalization). Show the 5-priority rule cascade in detail. |
| **Clinical Engineering** | Device tiers, FDA/UDI, HL7/DICOM, patient safety, compliance | Spend more time on Act 7-8 (Clinical + Meridian/Ledger). Shorten Act 5 to 3 minutes. |
| **Security Teams** | eBPF capabilities, encrypted traffic visibility, HIPAA, data sovereignty | Spend more time on Act 1 (eBPF). Emphasize no-PHI, no-DPI. Cover deployment models in Act 10. |
| **Implementation Partners** | Deployment methodology, sizing, integration patterns, partner economics | Spend more time on Act 10 (Deployment). Reference the 55-story WBS. Pricing in the Close. |

**Mixed audience rule:** If the audience is mixed, follow the script as written. The acts are balanced. Use the Q&A to go deeper on their specific interests.

---

## Opening — 2 minutes

> **[Stay on Overview > Overview. Sidebar expanded. Don't touch the mouse yet.]**

### Presenter Notes

Set the frame: this is not a sales demo. This is a technical deep dive into every layer of the platform.

> "Thank you for the time. This session is different from a typical product demo — we're going to open the hood on every layer of Pathfinder. Architecture, data model, classification engine, AI pipeline, CSDM integration, clinical protocols, deployment. By the end, you'll understand exactly how this works, not just what it does."

### Product Context

> "Quick context on where Pathfinder sits in the Avennorth portfolio. Four products, each independent, each composable:"

Draw or describe the portfolio flow:

```
Bearing          Pathfinder          Contour            Vantage
(CMDB            (Discovery +        (CSDM Service      (Incident
 Assessment)      Classification)     Mapping)            Intelligence)
    │                  │                   │                   │
    └──── Assess ──────┴──── Discover ─────┴──── Map ─────────┴──── Respond
```

> "Bearing assesses your CMDB health — it's the wedge, often free. Pathfinder discovers everything and classifies it. Contour takes Pathfinder's discovered integrations and builds CSDM-compliant service maps — Business Services, Technical Services, Business Applications. Vantage provides incident intelligence using those maps."

> "Today we're going deep on Pathfinder specifically, but I'll show you where Contour and Vantage connect."

### Architecture Overview

> "Here's the four-tier architecture. Everything flows bottom-up:"

Describe (or show the diagram from `docs/architecture/02-physical-architecture.md`):

> "Tier 1: Agents — eBPF on Linux, ETW on Windows, DaemonSet on Kubernetes. Kernel-level network observation. Tier 2: Gateway — Go binary that receives agent telemetry, runs the classification engine, resolves CIs, and syncs to ServiceNow. Tier 3: Intelligence — four Python FastAPI services running Claude-powered AI for health scoring, CMDB ops, and service map analytics. Tier 4: ServiceNow — scoped app with custom tables extending cmdb_ci, REST APIs, Flow Designer workflows, Polaris workspace."

> "Let me show you every layer."

---

## Act 1: eBPF Observation Engine — 5 minutes

**[00:02–00:07]**

> **[Click "Agent Fleet" in sidebar under PATHFINDER]**

### How eBPF Works

> "Let's start at the foundation. Pathfinder agents use eBPF — extended Berkeley Packet Filter — to observe network connections at the Linux kernel level. This is not packet capture. We're not running tcpdump or Wireshark. We attach probes to kernel tracepoints."

> "Specifically, we hook three kernel functions:"

| Tracepoint | What It Tells Us |
|-------------|-----------------|
| `tcp_connect` | A new outbound TCP connection was initiated — we get source IP, dest IP, dest port, process name, PID |
| `inet_sock_set_state` | A TCP socket changed state (ESTABLISHED, CLOSE_WAIT, etc.) — we get connection lifecycle and duration |
| `udp_sendmsg` | A UDP datagram was sent — we get DNS queries, syslog, SNMP, HL7 over UDP |

> "The eBPF program runs in kernel space, compiled from C. The actual source is at `src/agent/linux/ebpf/flow_tracker.c`. It produces FlowRecords — structured data about every network connection."

**[Optional: If audience wants to see code, switch to terminal and show `flow_tracker.c` briefly]**

### FlowRecord Structure

> "Each FlowRecord contains:"

| Field | Description |
|-------|-------------|
| Source IP:port | Where the connection originated |
| Destination IP:port | Where it's going |
| Protocol | TCP or UDP, L7 classification added by gateway |
| Process name | The binary that opened the socket — `java`, `postgres`, `nginx`, `hl7-router` |
| PID | Process ID for container/pod correlation |
| Bytes sent/received | Volume of data exchanged |
| Duration | How long the connection was open |
| Timestamp | Kernel-precision timestamp |

> "This is why eBPF matters: we see process names and byte counts on encrypted connections. TLS, mTLS, SSH tunnels — doesn't matter. We're below the encryption layer. We see that `java` connected to port 5432 on the database server and exchanged 2MB over 45 seconds. We don't see what data was exchanged — and we never will. That's a feature, not a limitation. It's why we're HIPAA-compliant by design."

### Why This Matters

> "Three things eBPF gives you that no other approach does:"

1. **Encrypted traffic visibility** — Armis, network taps, and SPAN ports see encrypted blobs. We see the process, port, and pattern.
2. **Container-to-container** — Two pods on the same node communicating over localhost? Network monitoring sees nothing. eBPF sees every connection.
3. **Zero instrumentation** — No code changes, no sidecars, no agents inside the application. The kernel already knows about every socket.

### Agent Fleet Page Walkthrough

> **[Point to the Agent Fleet page on screen]**

> "Here's the agent fleet for Mercy Health. 12 agents across three deployment models:"

- 6 Linux agents (RPM) — data center servers
- 3 Windows agents (ETW/MSI) — Windows application servers
- 3 K8s agents (DaemonSet) — Kubernetes cluster nodes

> "Each agent shows hostname, OS, version, status, last heartbeat, and flows collected. The K8s agents also show pod count and namespace coverage."

### Enrollment and Security

> "Agent enrollment uses gRPC with mutual TLS. The enrollment flow: you generate a one-time JWT enrollment token on the gateway. The agent presents that token on first connect. The gateway validates it, generates a permanent agent UUID, stores it in `/var/lib/pathfinder/agent-id`, and issues the agent a client certificate for all future communication."

> "After enrollment, all agent-to-gateway traffic is mTLS gRPC on port 8443. The protobuf contract is defined in `src/proto/pathfinder.proto`."

### Resource Consumption

> "Agents are designed to be invisible to the host OS:"

| Metric | Budget |
|--------|--------|
| CPU | <1% at steady state, <2% during flow aggregation bursts |
| RAM | <50 MB |
| Network | 1-10 KB/s to gateway (aggregated FlowRecords, not raw packets) |
| Disk | ~5 MB binary + state file |

> "We aggregate flows locally before sending. The agent doesn't stream every SYN/ACK — it batches and summarizes. That's why network overhead is kilobytes, not megabytes."

---

## Act 2: Gateway Classification Engine — 5 minutes

**[00:07–00:12]**

> **[Click "Discovery" in sidebar > "Classification Pipeline" tab]**

### Classification Pipeline

> "The gateway receives FlowRecords from all agents and runs them through the classification engine. This is the core IP of Pathfinder — it turns raw network observations into typed, confidence-scored integration CIs."

> "Classification uses a 5-priority rule cascade. Rules are evaluated in order. First match wins."

| Priority | Rule Type | Logic | Base Confidence |
|----------|-----------|-------|----------------|
| 1 | **Port-exact match** | `dst_port` matches a known service port (e.g., 5432 = PostgreSQL, 443 = HTTPS, 2575 = HL7) | 0.90 |
| 2 | **Port-range match** | `dst_port` falls in a known range + process name confirms (e.g., 8080-8099 + `java` = Application Server) | 0.75 |
| 3 | **Process-name match** | `process_name` matches a known application binary (e.g., `mongod` = MongoDB, `rabbitmq-server` = RabbitMQ) | 0.85 |
| 4 | **Protocol heuristic** | Byte pattern analysis — request/reply ratios, connection timing, payload sizes | 0.60 |
| 5 | **Default** | Unclassified — assigned type `Custom` | 0.30 |

> "The actual rule definitions are in `src/gateway/internal/classify/rules.go`. The engine is in `engine.go`. It's pure Go, no external dependencies."

**[Point to the Classification Pipeline tab — show the rule list with module badges]**

> "Notice the module badges on each rule: Base, Clinical, IoT. We ship 40+ base classification rules covering standard IT protocols. The Clinical module adds healthcare-specific rules."

### Healthcare Protocol Rules

| Protocol | Port | Classification | Module |
|----------|------|---------------|--------|
| HL7 v2.x | 2575 | `Clinical > HL7` | Clinical |
| DICOM | 104 | `Clinical > DICOM` | Clinical |
| IEEE 11073 | varies | `Clinical > BioMedical` | Clinical |
| FHIR (HTTP) | 443/80 | `API > FHIR` | Clinical |
| ASTM E1381 | 1234 | `Clinical > Laboratory` | Clinical |

> "The HL7 rule on port 2575 is priority 1 — port-exact match at 0.90 confidence. But if we also see the process name is `mirth-connect` or `rhapsody`, confidence bumps to 0.95 because we have behavioral confirmation."

### Confidence Modifiers

> "Base confidence is the starting point. Modifiers adjust it based on behavioral evidence:"

| Modifier | Effect | Example |
|----------|--------|---------|
| **Flow count** | More flows = higher confidence | 1,000 flows to port 5432 from `java` → +0.05 |
| **Consistency** | Same pattern over time = higher confidence | Same connection seen daily for 30 days → +0.03 |
| **Process confirmation** | Process name matches expected application → higher confidence | Port 5432 + process `postgres` → +0.05 |
| **Ephemeral port detection** | Source port >49152 reduces source-side classification confidence | High source port → -0.10 on source classification |
| **Recency** | More recent observations weighted higher | Last seen 2 hours ago vs 90 days ago |

> "Final confidence = base confidence + sum(modifiers), clamped to [0.0, 1.0]. A PostgreSQL connection seen 1,000 times with the `postgres` process running might end up at 0.98."

### Direction Inference

> "We also infer direction from byte ratios:"

| Pattern | Byte Ratio (sent:received) | Classification |
|---------|---------------------------|---------------|
| Outbound request | Low sent, high received (1:10+) | Client → Server |
| Inbound service | High received, low sent | Server ← Client |
| Bidirectional | Roughly equal | Peer-to-peer or streaming |
| Fire-and-forget | High sent, zero/minimal received | Syslog, metrics push, notification |

### Communication Pattern Detection

> "Beyond direction, we detect communication patterns:"

| Pattern | Signal | Example |
|---------|--------|---------|
| **Request-reply** | Short-lived connections, alternating send/receive | REST API calls, database queries |
| **Streaming** | Long-lived connections, continuous data flow | Kafka consumer, WebSocket, HL7 feed |
| **Fire-and-forget** | One-directional bursts, no response expected | Syslog, SNMP trap, metric push |
| **Batch** | Periodic high-volume transfers on a schedule | Nightly ETL, file transfer jobs |

### Cloud Service Classification

> "For outbound connections to the internet, we use TLS SNI extraction. The ClientHello message in every TLS handshake contains the hostname in plaintext — before encryption starts. We match that against 500+ SaaS and PaaS patterns."

> "Examples: `*.salesforce.com` maps to Salesforce, `sqs.us-east-1.amazonaws.com` maps to AWS SQS, `login.microsoftonline.com` maps to Azure AD. All passive, no DPI. This is defined in `docs/architecture/09-cloud-saas-paas-discovery.md`."

---

## Act 3: Discovery Normalization Layer — 5 minutes

**[00:12–00:17]**

> **[Click "Discovery Sources" in sidebar]**

### Multi-Source Architecture

> "No customer runs a single discovery tool. Mercy Health has three sources feeding into Pathfinder:"

| Source | Weight | What It Provides |
|--------|--------|-----------------|
| Pathfinder eBPF agents | 1.0 | Behavioral profile, process names, flow patterns, TLS fingerprints |
| Armis (agentless) | 0.70 | Device identification, MAC, manufacturer, device type, CVE risk |
| ServiceNow Discovery | 0.60 | Active probing, installed software, CI attributes from credentials |
| Manual / CSV import | 0.30 | Static data from biomed inventories, spreadsheet migrations |

> "The Discovery Normalization Layer — defined in `docs/architecture/07-discovery-normalization-layer.md` — is the single translation boundary. Every source adapter implements a standard Go interface in `src/gateway/internal/adapters/`. Raw records come in, canonical Unified Device Model records come out."

### Deduplication Engine

> "The deduplication engine uses a 4-level matching hierarchy. It tries each level in order — first match wins:"

| Level | Match Key | Confidence | Example |
|-------|----------|------------|---------|
| 1 | **MAC address** (exact) | Highest | Same MAC from eBPF and Armis = same device |
| 2 | **IP + hostname** (exact) | High | Same IP and hostname from eBPF and SN Discovery |
| 3 | **Serial / UDI** (exact) | High | Same serial number from Armis and CSV import |
| 4 | **Fuzzy match** (Levenshtein) | Medium | Hostname `srv-epic-prod-01` vs `SRV-EPIC-PROD-01.mercy.local` |

> "When two sources see the same device, the deduplication engine merges them into a single record. The merge rule: highest confidence wins per field, newest timestamp breaks ties."

### Conflict Resolution

> **[Point to the conflict resolution panel on the Discovery Sources page]**

> "Here's where it gets interesting. See these flagged devices? These are cases where sources disagree."

Walk through a specific example:

> "This device — eBPF says it's a PostgreSQL database server running on RHEL 9, confidence 0.92. Armis says it's a generic Linux host, confidence 0.70. The classification: PostgreSQL wins because 0.92 > 0.70. But Armis contributes the MAC address and manufacturer that eBPF doesn't have. The merged record is richer than either source alone."

> "The source confidence weights also decay with recency. An Armis observation from 6 months ago carries less weight than an eBPF observation from 2 hours ago. The formula is: `effective_weight = source_weight * recency_factor * behavioral_confirmation`."

### Armis Coexistence Deep Dive

> "This is critical for every ServiceNow shop post-acquisition. ServiceNow bought Armis for $7.75 billion. Armis will become native to ServiceNow. Here's how we coexist:"

| Capability | Armis (Inside ServiceNow) | Pathfinder |
|-----------|---------------------------|------------|
| Discovery method | Agentless network monitoring | eBPF kernel-level agents |
| Encrypted traffic | Sees encrypted blob, classifies by IP/port | Sees process name, byte patterns, TLS SNI, connection lifecycle |
| Container visibility | Limited (no kernel access) | Full (eBPF runs on the node) |
| CMDB writing | Yes (native after integration) | Yes (REST API + scoped app) |
| Clinical intelligence | No | Yes (Meridian, Ledger, Vantage Clinical) |

> "We don't compete with Armis on basic device discovery. We complement it. A hospital running Armis on clinical VLANs and Pathfinder agents on IT infrastructure gets the best of both — Armis device classification merged with Pathfinder behavioral intelligence, all through the normalization layer."

---

## Act 4: Application Discovery & Service Mapping — 5 minutes

**[00:17–00:22]**

> **[Click "Applications" in sidebar > Select "Epic EHR" from the application list]**

### Application View

> "This is the application-centric view. We've selected Epic EHR — the core clinical application. Everything you see here was discovered automatically from network behavior, not manually configured."

### Layout Modes

> **[Demonstrate each layout mode by clicking the layout toggle]**

| Mode | Best For |
|------|----------|
| **Radial** | Executive presentations — shows the "solar system" of dependencies around a core application |
| **Top-Down** | Hierarchical analysis — shows upstream/downstream flow |
| **Left-Right** | Integration pipeline view — source on left, target on right |
| **Grouped** | Architecture analysis — clusters by application type (database, middleware, API, clinical) |

> "The radial view is what most people screenshot for architecture reviews. But the grouped view is the one architects actually use — it shows you the technology stack at a glance."

### Filters

> **[Click filter controls — toggle off "Servers", enable only "Clinical" and "Life-Critical"]**

> "Filters let you focus. I've toggled off standard servers and I'm showing only clinical and life-critical connections. Now you see Epic's clinical integration footprint: HL7 feeds to lab systems, DICOM connections to PACS, FHIR APIs to the patient portal."

### Application Inference

> "How do we know this is 'Epic EHR' and not just a collection of IP addresses? Application inference:"

1. **Process fingerprint** — The agent sees `epic-*` process names, or `java` running on known Epic ports
2. **Port signature** — Epic uses specific port ranges for Interconnect, Bridges, Chronicles
3. **Behavioral pattern** — Request/reply patterns, connection frequency, byte volume profiles
4. **DNS/hostname** — Server hostnames containing `epic`, `hyperspace`, `caboodle`

> "The inference produces an application identity with a confidence score. High confidence means multiple signals agree. Low confidence means we saw a connection but couldn't confidently attribute it to a named application."

### Dependency Detail

> **[Click on a specific dependency line to show the detail table]**

> "Each dependency shows:"

| Field | Description |
|-------|-------------|
| Direction | Outbound, Inbound, or Bidirectional |
| Type | API, Database, File Transfer, Messaging, Clinical |
| Protocol | HTTP/S, TCP, HL7, DICOM, etc. |
| Health | Healthy / Degraded / Critical based on AI health scoring |
| Flows | Total flow count observed |
| Last Seen | Most recent observation timestamp |
| Confidence | Classification confidence (0.0–1.0) |

### CSDM Inference

> "Here's the bridge to Contour. Pathfinder discovers at the infrastructure layer: servers, connections, processes. From that, we can infer the CSDM hierarchy:"

```
Infrastructure (Pathfinder)     →  App Instance (inferred)
App Instance                    →  Business Application (Contour)
Business Application            →  Technical Service (Contour)
Technical Service               →  Business Service (Contour)
```

> "Pathfinder provides the foundation data. Contour automates the CSDM mapping. Together, they replace ITOM Visibility + Service Mapping at 85-90% lower cost. If someone asks about CSDM in Q&A, that's the answer: Pathfinder is the infrastructure layer, Contour is the service layers."

---

## Act 5: ServiceNow Integration Deep Dive — 5 minutes

**[00:22–00:27]**

> **[For this act, you may want to split between the prototype and terminal/architecture docs]**

### Data Model

> "Pathfinder's scoped app uses the `x_avnth_` prefix. Six core tables, all defined as JSON in `src/servicenow/tables/`:"

| Table | Extends | Purpose |
|-------|---------|---------|
| `x_avnth_pathfinder_agent` | `cmdb_ci` | Every enrolled agent — hostname, OS, version, heartbeat, flows collected |
| `x_avnth_cmdb_ci_integration` | `cmdb_ci` | Discovered integrations — source app, target app, type, confidence, health score |
| `x_avnth_cmdb_ci_interface` | `cmdb_ci` | Interface CIs — child of Integration (1:M), carries protocol/port/direction |
| `x_avnth_integration_health_log` | — | Time-series health telemetry — written by gateway, consumed by AI |
| `x_avnth_integration_ea_map` | — | EA reconciliation — links discovered integrations to EA relationship records |
| `x_avnth_coverage_gap` | — | Servers missing agents — feeds the self-healing remediation loop |

> "Extended tables for clinical and cloud modules:"

| Table | Purpose |
|-------|---------|
| `x_avnth_clinical_device` | Clinical device enrichment — tier, FDA codes, calibration |
| `x_avnth_normalized_device` | Unified Device Model output from normalization layer |
| `x_avnth_cloud_service` | Discovered SaaS/PaaS/IaaS endpoints |
| `x_avnth_compliance_finding` | Compliance findings from Ledger |

### CSDM Alignment

> "Every table that extends `cmdb_ci` inherits the full CMDB CI lifecycle: operational status, lifecycle management, change management, relationships. We don't create shadow tables — we extend the platform. Your existing CMDB workflows, reports, and dashboards see Pathfinder CIs natively."

### REST API

> "Seven endpoints under `/api/x_avnth/pathfinder/v1/`, defined in `src/servicenow/scripted-rest/pathfinder_api_v1.js`:"

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/agents` | GET, POST | List agents, register new agent |
| `/agents/{id}/heartbeat` | POST | Agent heartbeat — gateway calls this every 60 seconds |
| `/integrations` | GET, POST | List/create integration CIs |
| `/integrations/{id}/health` | POST | Write health telemetry |
| `/interfaces` | GET, POST | List/create interface CIs |
| `/coverage-gaps` | GET | List coverage gaps |
| `/ea-reconciliation` | GET, POST | List EA matches, confirm/reject |

> "The gateway authenticates to ServiceNow via OAuth 2.0 (client credentials grant). The environment variables are `PF_SN_INSTANCE`, `PF_SN_CLIENT_ID`, `PF_SN_CLIENT_SECRET`."

### Business Rules

> "Six business rules in `src/servicenow/business-rules/`:"

| Rule | Trigger | What It Does |
|------|---------|-------------|
| `integration_auto_name.js` | Before insert on Integration CI | Auto-generates name: `{source_app} -> {target_app}` |
| `interface_auto_name.js` | Before insert on Interface CI | Auto-generates name: `{integration} / {protocol}:{port}` |
| `integration_health_status.js` | After update on health_log | Recalculates health status from latest health score |
| `integration_stale_check.js` | Scheduled (daily) | Marks integrations not seen in 90 days as `stale` |
| `agent_stale_heartbeat.js` | Scheduled (every 5 min) | Marks agents with no heartbeat in 10 minutes as `stale` |
| `coverage_gap_on_agent_decommission.js` | After update on agent | Creates coverage gap when agent status changes to `decommissioned` |

### Flow Designer: Coverage Gap Self-Healing

> **[Click "Coverage Gaps" in sidebar — show the Kanban board]**

> "This is the coverage gap self-healing flow. It's defined in `src/servicenow/flows/coverage_gap_remediation_flow.json` with two subflows:"

```
Detect gap → Create Change Request → Deploy agent (subflow) → Verify enrollment (subflow) → Close gap
```

> "The flow uses Flow Designer, not custom scripts. The deployment subflow can trigger Ansible Tower, SCCM, or a Helm install depending on the target OS. The verification subflow watches for the agent's first heartbeat. If enrollment doesn't happen within 24 hours, the flow escalates to the assigned support group."

> **[Point to the Kanban board columns: Detected → CR Created → Deploying → Verifying → Closed]**

> "Mercy Health has 4 open coverage gaps right now. Two are in 'Deploying' — the Change Request was approved and the agent package is being pushed. One is in 'Verifying' — agent was installed, waiting for first heartbeat."

---

## Act 6: Intelligence Suite — 5 minutes

**[00:27–00:32]**

> **[Click "Overview" in sidebar > "Insights" subtab]**

### Intelligence Architecture

> "The intelligence layer is four Python FastAPI services, all in `src/intelligence/`:"

| Service | Path | Purpose |
|---------|------|---------|
| Shared AI Engine | `src/intelligence/shared-ai-engine/` | Claude API wrapper, prompt management, token tracking, anomaly detection |
| Integration Intelligence | `src/intelligence/integration-intelligence/` | Health scoring, AI summarization, EA reconciliation |
| CMDB Ops Agent | `src/intelligence/cmdb-ops-agent/` | 8 autonomous AI agents for CMDB lifecycle management |
| Service Map Intelligence | `src/intelligence/service-map-suite/` | Coverage analysis, risk scoring, change impact prediction |

> "All four share the Shared AI Engine for LLM calls. The engine manages prompt templates, tracks token usage per customer, handles rate limiting, and provides a consistent interface to Claude."

### Integration Intelligence: Health Scoring

> "Health scores use a 4-metric weighted composite:"

| Metric | Weight | Source |
|--------|--------|--------|
| Availability | 40% | Connection success rate from flow data |
| Latency | 30% | Response time percentiles (p50, p95, p99) |
| Error rate | 20% | Failed connections / total connections |
| Staleness | 10% | Time since last observed flow |

> "Formula: `health_score = (avail * 0.40) + (latency_score * 0.30) + (error_score * 0.20) + (freshness * 0.10)`, normalized to 0-100."

> **[Point to a specific integration on the Insights page — show its health score breakdown]**

> "This integration — Epic to the lab system over HL7 — has a health score of 92. Availability: 99.8%, Latency p95: 120ms, Error rate: 0.1%, Last seen: 3 minutes ago. All green."

### AI Summarization

> "Claude generates natural-language summaries for every integration CI. The AI summary field (`ai_summary`, 4000 chars) is updated on a configurable schedule. The prompt includes the integration's type, health history, interface details, and connected applications. The summary explains what the integration does, its current health, and any concerns — in plain English that a service owner can understand without reading telemetry."

### EA Reconciliation

> **[Click "EA Reconciliation" in sidebar — show the match table]**

> "EA reconciliation links discovered integrations to Enterprise Architecture relationship records. Three matching strategies, tried in order:"

| Strategy | Logic | Confidence |
|----------|-------|------------|
| **Exact CI match** | Source and target CIs match an existing `cmdb_rel_ci` record exactly | 0.95 |
| **Fuzzy Levenshtein** | Application names are within edit distance 3 of EA record names | 0.70 |
| **Business service group** | Both apps belong to the same business service in EA | 0.50 |

> "The EA Reconciliation page shows all matches. Each row has a confidence score and Confirm/Reject buttons. Confirmed matches create a permanent link. Rejected matches train the algorithm to avoid similar false positives."

### CMDB Ops: 8 Autonomous Agents

> "The CMDB Ops Agent runs 8 specialized AI agents, each in its own Python module under `src/intelligence/cmdb-ops-agent/agents/`:"

| Agent | File | Purpose |
|-------|------|---------|
| Duplicate Detector | `duplicate_detector.py` | Finds CIs that represent the same entity (fuzzy name, same IP, overlapping attributes) |
| Stale Record Reaper | `stale_record_reaper.py` | Identifies CIs not seen in 90+ days, recommends retirement |
| Orphan Finder | `orphan_finder.py` | Finds CIs with no relationships — possible ghosts |
| Compliance Checker | `compliance_checker.py` | Validates CIs against required field completeness, naming standards |
| Health Scorer | `health_scorer.py` | Aggregate CMDB health metrics across all CIs |
| Classification Auditor | `classification_auditor.py` | Verifies classification accuracy, flags misclassified CIs |
| Relationship Validator | `relationship_validator.py` | Checks relationship integrity — orphaned references, circular dependencies |
| Remediation Orchestrator | `remediation_orchestrator.py` | Coordinates cross-agent remediation actions |

> "Every agent implements the same 5-phase interface: `observe()`, `diagnose()`, `recommend()`, `act()`, `verify()`. Each has an independently configurable autonomy level:"

| Level | Behavior |
|-------|----------|
| 0 — Report Only | Observe + diagnose. Log findings. No action. |
| 1 — Recommend | Create recommendations in ServiceNow. Await human approval. |
| 2 — Act with Approval | Create a Change Request. Execute only after CR approval. |
| 3 — Fully Autonomous | Execute immediately. Create CR retroactively for audit trail. |

> "Default is Level 1 for all agents. Most customers promote the Stale Record Reaper to Level 2 first — it's low-risk and high-volume."

### Service Map Intelligence

> "The Service Map suite provides coverage analysis (which parts of the environment are instrumented), risk scoring (which integrations carry the most business risk), and change impact prediction. Change impact uses BFS traversal across the integration graph — if you change this CI, what's the blast radius? We'll see blast radius in action in Act 8."

---

## Act 7: Clinical Extension Deep Dive — 5 minutes

**[00:32–00:37]**

> **[Click "Clinical Devices" in sidebar under CLINICAL EXTENSION]**

**Audience adaptation:** If the audience is heavy on clinical engineering or biomed, spend 7-8 minutes here and take 2 minutes from Act 5.

### Clinical Device Inventory

> **[Filter the device list to show Tier 3 and Tier 4 devices only]**

> "Every networked medical device in the environment, classified by clinical risk tier. The tier assignment uses a cascading logic:"

| Tier | Category | Monitoring Interval | Examples |
|------|----------|-------------------|---------|
| 1 | Standard IT | 5 minutes | Workstations, printers, network gear |
| 2 | IoT / OT | 2 minutes | Building automation, environmental sensors |
| 3 | Clinical / Medical | 30 seconds | Imaging systems, lab analyzers, nurse call |
| 4 | Life-Critical | 1 second (continuous) | Ventilators, infusion pumps, anesthesia, patient monitors |

> "Tier assignment cascades: first from device classification (if it's an FDA Class III device, it's automatically Tier 4), then from clinical context (if it's in an ICU or OR, it gets bumped up), then from manual override (biomed can always promote a device)."

### Healthcare Protocol Parsers

> "The classification engine includes healthcare-specific protocol rules:"

| Protocol | Port | What We Detect |
|----------|------|---------------|
| **HL7 v2.x** | 2575 (TCP) | ADT messages (patient admit/discharge/transfer), lab results, orders. We classify the message type from connection patterns — not by reading PHI. |
| **DICOM** | 104 (TCP) | Medical imaging transfers. We see the connection pattern (large outbound = image push, request/reply = query/retrieve) but never the images themselves. |
| **IEEE 11073** | Varies | Point-of-care device communication — bedside monitors, infusion pumps reporting to clinical systems. |
| **FHIR** | 443/80 (HTTP) | RESTful clinical data exchange. Identified by TLS SNI or URL pattern matching on the path (`/fhir/r4/Patient`). |

> "We never parse message content. We classify by port, process name, connection pattern, and byte volume. A 50KB outbound burst on port 104 is almost certainly a DICOM C-STORE, but we don't open the DICOM envelope to check."

### FDA/UDI Correlation

> "For Tier 3-4 devices, the clinical module enriches with FDA data:"

| Data Source | What It Provides |
|-------------|-----------------|
| **FDA Product Codes** | Device classification (e.g., `DRE` = Ventilator, `MHX` = Infusion Pump) |
| **GMDN** (Global Medical Device Nomenclature) | Standardized device naming |
| **UDI** (Unique Device Identifier) | Manufacturer, model, serial, lot, production date |
| **MAUDE database** | Adverse event reports — "has this device model had safety issues?" |
| **Safety Communications** | Active FDA recalls and safety alerts for this device model |

> "This enrichment happens at normalization time. If Armis identifies a device as 'Philips IntelliVue MX800' and provides its MAC address, the clinical module looks up the FDA product code, checks MAUDE for adverse events, and adds all of that to the CMDB record."

### Clinical Context Enrichment

> "Beyond FDA data, we capture operational clinical context:"

- **Department** — Which clinical department owns this device (ICU, OR, Cath Lab, Radiology)
- **Care area** — More specific than department (ICU Bay 3, OR Suite 2)
- **Manufacturer** — From UDI or Armis identification
- **Calibration status** — Last calibrated date, next due date, overdue flag
- **Network segment** — Which VLAN, whether it's on a clinical DMZ

### Discovery-Agnostic Design

> "This is architecturally important: the clinical extension works with ANY discovery source. If you have Armis on your clinical VLANs and no Pathfinder agents there — fine. The clinical module enriches Armis-discovered devices exactly the same way. If you have both eBPF and Armis, you get the merged record through the normalization layer. The intelligence doesn't care how the device was found."

### HIPAA by Design

> "We never capture Protected Health Information. eBPF agents observe connection metadata: source IP, destination IP, port, protocol, process name, byte count, duration. We don't inspect packet payloads. We don't read HL7 message content. We don't see DICOM images. We don't capture patient identifiers. This is architectural — the eBPF program literally doesn't have the code to extract payload data."

---

## Act 8: Meridian & Ledger — 5 minutes

**[00:37–00:42]**

> **[Click "Meridian" in sidebar under CLINICAL EXTENSION]**

**Audience adaptation:** If the audience is heavy on clinical engineering, this is the act that differentiates Pathfinder from everything else on the market. Spend extra time here.

### Meridian: Tab 1 — Staff Coverage

> **[Click the "Staff Coverage" tab]**

> "Meridian integrates with UKG Pro — the workforce management system most health systems use. This tab shows which biomedical technicians are certified on which device types, their shift schedules, and current availability."

> "This is structurally impossible for ServiceNow + Armis to replicate. UKG Pro is a workforce platform — it's not in ServiceNow's data model. Meridian bridges the gap between device intelligence and workforce intelligence."

### Meridian: Tab 2 — Impact Analysis

> **[Click the "Impact Analysis" tab > Select a device from the list]**

> "Select this ventilator in ICU Bay 3. Meridian calculates the blast radius:"

- **Direct impact:** 2 patients currently on this ventilator (from clinical context)
- **Backup availability:** 3 backup ventilators on this floor, 1 currently in use
- **Certified staff:** 2 biomed techs certified on this model currently on shift, 1 on call
- **Estimated response time:** 8 minutes (based on tech location and current workload from UKG)

> "This calculation combines Pathfinder device data, clinical context, UKG workforce data, and ServiceNow CMDB relationships. No single system has all of this."

### Meridian: Tab 3 — Maintenance Windows

> **[Click the "Maintenance Windows" tab]**

> "The maintenance window optimizer scores proposed maintenance windows based on:"

- Patient census during the window (from ADT/HL7 feeds)
- Backup device availability
- Certified staff availability (from UKG shift schedules)
- Historical incident frequency during similar windows

> "A score of 85+ means the window is safe. Below 60, it recommends rescheduling. This replaces the manual process of checking with nursing, biomed, and IT separately."

### Meridian: Tab 4 — Cert Gaps

> **[Click the "Cert Gaps" tab]**

> "Cross-training risk identification. This tab shows devices where only one technician is certified. If that person is on PTO or leaves the organization, there's no backup. Mercy Health has 12 single-point-of-failure certifications right now — flagged in red."

### Ledger: Tab 1 — Dashboard

> **[Click "Ledger" in sidebar > "Dashboard" tab]**

> "Compliance heatmap — frameworks on the Y-axis (Joint Commission, CMS CoP, FDA 21 CFR Part 820, HIPAA Security Rule), facilities on the X-axis. Color indicates compliance percentage. Green is 90%+, yellow is 70-89%, red is below 70%."

### Ledger: Tab 2 — Findings

> **[Click the "Findings" tab]**

> "Individual compliance findings with remediation steps. Each finding references a specific regulation section, the affected device or process, the current gap, and a recommended remediation. Findings can be assigned, tracked, and closed — standard ServiceNow task lifecycle."

### Ledger: Tab 3 — Survey Prep

> **[Click the "Survey Prep" tab]**

> "Joint Commission survey readiness score, broken down by standard. The score is calculated from: device inventory completeness, maintenance schedule compliance, staff certification coverage, incident response documentation, and corrective action closure rate."

> "Survey prep that used to take a biomed team 3 months of manual evidence gathering now takes 3 clicks. The evidence is continuously maintained, not assembled after-the-fact."

### Ledger: Tab 4 — FDA Alerts

> **[Click the "FDA Alerts" tab]**

> "MAUDE behavioral pattern matching. We monitor the FDA MAUDE database for adverse event reports. When a report matches a device model in your inventory, Ledger creates an alert. But we go further — we correlate MAUDE reports with behavioral anomalies. If MAUDE reports say a specific infusion pump model has a flow rate accuracy issue, and Pathfinder observes unusual communication patterns from that model in your environment, Ledger flags it as a proactive alert."

---

## Act 9: Vantage Clinical & Analytics — 3 minutes

**[00:42–00:45]**

> **[Click "Vantage Clinical" in sidebar]**

### Active Incidents

> **[Click the "Active Incidents" tab]**

> "Vantage Clinical provides clinical incident intelligence. This active incident is on a patient monitor in the cardiac step-down unit."

### Patient Safety Impact Score (PSIS)

> "The PSIS combines:"

| Factor | Weight | Source |
|--------|--------|--------|
| Device tier | 30% | Tier 4 = highest impact |
| Patient count | 25% | Number of patients dependent on this device |
| Backup availability | 20% | Are alternative devices available and functional? |
| Time of day | 15% | Night shift = fewer staff = higher risk |
| Historical severity | 10% | Past incidents on this device class |

> "This incident scores 78 — high. Tier 4 device, 2 patients dependent, night shift, 1 backup monitor available."

### Blast Radius Visualization

> "The blast radius tree shows the full impact chain: Device → Patients → Care team → Dependent workflows → Upstream/downstream integrations. It uses BFS traversal across the CMDB relationship graph — the same engine from Service Map Intelligence."

### RACI-Driven Escalation

> "Escalation uses a RACI matrix built from three data sources: ServiceNow (assignment groups, on-call schedules), UKG Pro (who's physically on shift right now and certified), and Pathfinder device certifications. The result: the right person gets paged, not just the on-call engineer who might not be certified on this device."

### MAUDE Monitoring

> "Vantage Clinical continuously monitors for behavioral patterns that match known MAUDE adverse events. If the FDA reports that a specific device model has communication dropouts before a failure mode, and Pathfinder observes that pattern on one of your devices, Vantage creates a proactive alert before the failure occurs."

### Analytics Page

> **[Click "Analytics" in sidebar]**

> "Analytics provides the operational and financial views:"

- **Facility comparison** — device counts, health scores, coverage percentages across Mercy's 3 facilities
- **Tier distribution** — how many devices at each tier, by facility
- **Source coverage** — what percentage of devices are seen by eBPF vs Armis vs SN Discovery
- **Cost analysis** — devices by tier multiplied by per-device pricing = estimated ACV. This is also the quoting tool for sales.

---

## Act 10: Deployment & Operations — 3 minutes

**[00:45–00:48]**

### Deployment Methodology

> "Pathfinder follows a Crawl-Walk-Run-Fly methodology. The full WBS is a 55-story deployment plan in `docs/methodology/`."

| Phase | Duration | What Gets Deployed |
|-------|----------|-------------------|
| **Crawl** | 4 weeks | 20-50 agents, gateway, SN scoped app, basic classification |
| **Walk** | 12 weeks | Full agent deployment, clinical module, normalization layer, first intelligence services |
| **Run** | 24 weeks | Full intelligence suite, Meridian/Ledger/Vantage Clinical, autonomy level promotions |
| **Fly** | Ongoing | Fully autonomous CMDB ops, proactive clinical alerting, Contour integration |

### Component Deployment

| Component | Deployment Method | Notes |
|-----------|------------------|-------|
| Linux agents | RPM or DEB package | `rpm -i pathfinder-agent-*.rpm`, systemd service |
| Windows agents | MSI package | Standard MSI, runs as Windows service |
| K8s agents | Helm chart DaemonSet | `helm install pathfinder-agent charts/agent/` |
| Gateway | Docker or K8s Deployment | `docker build -t pathfinder-gateway -f src/gateway/Dockerfile .` |
| PostgreSQL | Customer-managed | RDS, Cloud SQL, or on-prem. Gateway's `PF_DB_URL` env var. |
| Intelligence services | 4 Python FastAPI containers | One container per service, each has its own Dockerfile |
| ServiceNow scoped app | Update set XML or sn-cli push | `cd src/servicenow && sn push --instance your-instance.service-now.com` |

### Infrastructure Sizing

| Size | Agents | Gateway | PostgreSQL | Intelligence |
|------|--------|---------|-----------|-------------|
| **Small** | 1-50 | 1 replica, 2 CPU, 4 GB | db.t3.medium | 1 replica each |
| **Medium** | 51-500 | 2 replicas, 4 CPU, 8 GB | db.r5.large | 2 replicas each |
| **Large** | 501-2,000 | 4 replicas, 8 CPU, 16 GB | db.r5.xlarge | 4 replicas each |
| **XL** | 2,000+ | 8+ replicas, autoscaling | db.r5.2xlarge + read replica | Autoscaling |

### Monitoring & HA

> "The gateway exposes health endpoints. Agent heartbeats are expected every 60 seconds — missing heartbeats trigger stale status after 10 minutes. The SN sync backlog is monitored — if the queue exceeds 1,000 pending writes, the gateway alerts."

> "High availability: gateway replicas behind a load balancer (agents connect to any replica), PostgreSQL standby for failover, intelligence services are stateless (scale horizontally). The agents themselves are resilient — if the gateway is unreachable, they buffer FlowRecords locally and replay on reconnect."

### Three Deployment Models

> "We support three deployment models, defined in `docs/architecture/05-acc-models-self-healing.md`:"

| Model | Who Manages | Data Location |
|-------|------------|---------------|
| **Standalone** | Customer manages everything | Customer infrastructure |
| **Managed** | Avennorth manages agents + gateway | Customer infrastructure, remote management |
| **SaaS** | Avennorth hosts everything | Avennorth cloud |

> "Healthcare customers almost always start with Standalone or Managed for data sovereignty. SaaS is available for non-regulated verticals."

---

## Close — 2 minutes

**[00:48–00:50]**

> **[Return to Overview > Overview subtab so the KPI dashboard is the backdrop]**

### Pricing Architecture

> "Pricing is modular. Starting at $50K/year for Pathfinder Base (up to 500 nodes). The primary offering is the Pathfinder + Contour bundle at $70K for S-tier — that replaces ITOM Visibility + Service Mapping."

> "Device tier add-ons: $8-25 per device per month depending on tier and volume. Intelligence modules (Meridian, Ledger, Vantage Clinical) are per-facility — $3K-20K per facility per month."

### Land-and-Expand Economics

> "$50K entry point — below most procurement thresholds. A fully expanded health system runs $3M ACV. The platform fee is 7% of revenue; the intelligence layers are 93%."

### Implementation

> "Partner deployment playbook: 40-80 hours for the Crawl phase. Two weeks to deploy agents and gateway, two more weeks for ServiceNow configuration and validation. Value on day 1 — the moment agents are running, you're discovering integrations the CMDB never knew about."

### Patent Portfolio

> "Five provisional patent claims filed:"

1. Behavioral classification of network connections using eBPF kernel telemetry
2. Multi-source confidence-weighted device normalization
3. Clinical operations graph combining device, workforce, and compliance data
4. Autonomous CMDB lifecycle management via agentic AI
5. Patient Safety Impact Score calculation from device dependency and workforce data

### Roadmap

> "Next: Contour CSDM automation — takes Pathfinder's discovered infrastructure and builds the full CSDM service model. Future: Industrial/Edge verticals using the same platform architecture with industry-specific classification rules and compliance frameworks."

### Call to Action

> "Here's the next step: a 20-server pilot with a Bearing assessment. We install 20 agents, run the gateway, and show you what your CMDB is missing — in your environment, with your data. Two weeks to deploy, value on day 1. The Bearing assessment is free."

> "Questions?"

---

## Appendix: Complete Q&A Reference

### Architecture & Security

**Q1: How does eBPF differ from packet capture or network taps?**

Packet capture (tcpdump, Wireshark) and network taps operate at Layer 2-3 and see raw packets including payloads. They require SPAN ports or TAP hardware, they can't see traffic that doesn't cross a physical wire (container-to-container, localhost), and they see encrypted traffic as opaque blobs. eBPF operates inside the Linux kernel at the socket and transport layers. It sees connection metadata (source, destination, port, process, bytes, duration) for every connection — including encrypted connections, container-to-container, and localhost. It runs on the host itself, not on the network. The tradeoff: eBPF doesn't see payload content (by design, this is how we maintain HIPAA compliance). It sees that `java` connected to `10.0.1.50:5432` and exchanged 2MB over 45 seconds. It doesn't see the SQL queries. For discovery and classification, the metadata is sufficient. For content inspection (DLP, IDS), you still need other tools.

**Q2: What kernel version is required for eBPF?**

Linux kernel 5.8+ for full BPF features (CO-RE, BTF, ring buffer). The agent uses BPF CO-RE (Compile Once, Run Everywhere), so the same binary works across kernel versions without recompilation. The `vmlinux.h` header in `src/agent/linux/ebpf/` provides kernel structure definitions. For older kernels (4.15-5.7), we support a fallback mode with reduced features (no ring buffer, higher CPU usage). Red Hat / CentOS 8+ and Ubuntu 20.04+ meet the requirement out of the box.

**Q3: What happens if the gateway goes down?**

Agents buffer FlowRecords locally in an on-disk queue (configurable, default 100MB). When the gateway reconnects, agents replay buffered records in order. No data is lost during gateway outages up to the buffer limit. The gateway itself is stateless — multiple replicas behind a load balancer provide HA. Agent enrollment state (UUID, certificates) persists on disk at `/var/lib/pathfinder/agent-id`, so agents survive restarts.

**Q4: How do you handle multi-tenant environments?**

Each customer gets their own gateway instance and ServiceNow scoped app. In the Managed and SaaS deployment models, tenant isolation is enforced at the gateway level — each gateway connects to exactly one ServiceNow instance. Agent-to-gateway mTLS certificates are scoped per tenant. The intelligence services are stateless and can be shared across tenants in SaaS mode with API key isolation.

**Q5: What's the network overhead of agents?**

1-10 KB/s at steady state. Agents aggregate FlowRecords locally — they don't stream raw connection events. A server handling 10,000 connections/second produces roughly 5 KB/s of aggregated telemetry to the gateway. The gRPC stream uses protobuf serialization (compact binary format) and mTLS compression. In practice, agent traffic is invisible on a 1 Gbps network.

**Q6: How do you handle HIPAA compliance?**

By architecture, not policy. The eBPF programs observe connection metadata only — source/destination IP, port, protocol, process name, byte count, duration. The kernel program does not have code to extract packet payloads. HL7 messages on port 2575 are classified by port, process name, and connection pattern — not by reading message content. DICOM transfers on port 104 are classified by byte volume patterns — not by opening DICOM envelopes. No PHI is ever captured, transmitted, or stored. All telemetry stays within the customer's environment (Standalone/Managed models) or in a SOC 2 Type II certified Avennorth cloud tenant (SaaS model).

**Q7: What data leaves the customer's network?**

In Standalone mode: nothing. All components run on customer infrastructure. In Managed mode: encrypted management traffic (agent status, gateway health) to Avennorth's NOC — no customer data, no CMDB content, no flow records. In SaaS mode: aggregated telemetry (not raw packets) flows to Avennorth's cloud, encrypted in transit (mTLS) and at rest (AES-256). AI engine calls to Claude use the Anthropic API with no PHI in prompts — prompts contain CI names, health metrics, and classification data only.

**Q8: Can I run the AI engine without sending data to Claude?**

Yes. The Shared AI Engine supports pluggable LLM backends. You can point it at a local LLM (Llama, Mistral) via an OpenAI-compatible API endpoint. Health scoring and anomaly detection work without any LLM — they use statistical models. The LLM is only required for natural-language summarization and some diagnostic explanations. Customers with strict air-gap requirements run the statistical engine only.

### ServiceNow Integration

**Q9: Does this work on ServiceNow Tokyo/Utah/Vancouver/Washington/Xanadu?**

The scoped app is built on baseline ServiceNow APIs and uses standard extensions of `cmdb_ci`. It has been validated on Utah, Vancouver, Washington, and Xanadu. Tokyo works but lacks some Polaris workspace features (the workspace degrades gracefully to Classic). We target N-1 support — the current release and one version back.

**Q10: How does the scoped app handle upgrades?**

The scoped app is delivered as an update set. Upgrades are applied through System Update Sets — the standard ServiceNow upgrade path. Custom tables (`x_avnth_*`) are owned by the scoped app and upgraded atomically. We never modify platform tables (`cmdb_ci`, `incident`, etc.) — we only extend them. Customer customizations outside the `x_avnth_` scope are not affected by upgrades.

**Q11: Can I customize the classification rules in ServiceNow?**

Classification rules are managed in the gateway (`src/gateway/internal/classify/rules.go`), not in ServiceNow. The gateway is the engine; ServiceNow is the system of record. However, the scoped app includes a Classification Rule table (`x_avnth_classification_rule`) that allows ServiceNow admins to add custom rules. Custom rules are synced to the gateway at the next configuration refresh (every 5 minutes). This lets CMDB engineers add organization-specific rules without touching Go code.

**Q12: How does Pathfinder interact with ServiceNow Discovery?**

ServiceNow Discovery is a discovery source, just like eBPF and Armis. The normalization layer consumes SN Discovery data (via the CMDB itself — we read CIs that Discovery created) and merges it with eBPF and Armis data. SN Discovery carries a confidence weight of 0.60. When SN Discovery and Pathfinder eBPF both see the same server, the merged record uses the highest-confidence value per field. SN Discovery often provides installed software and hardware inventory that eBPF doesn't — so the merged record is richer than either source alone.

**Q13: What about CSDM compliance?**

Pathfinder populates the Infrastructure layer of the CSDM model — servers, integrations, interfaces, devices. These are all proper `cmdb_ci` extensions with correct class hierarchies. The Application Instance layer is partially inferred (Pathfinder identifies applications from behavioral patterns). The Business Application, Technical Service, and Business Service layers are the domain of Contour, our CSDM automation product. Together, Pathfinder + Contour produce a fully CSDM-compliant service model. Pathfinder alone gives you a complete, accurate infrastructure layer — which is prerequisite for everything above it.

### Clinical / Healthcare

**Q14: How do you handle devices that aren't on the network?**

Pathfinder discovers networked devices. For devices that are completely offline (no network connection), they won't appear in eBPF or Armis feeds. However, CSV import (confidence weight 0.30) supports manual entry of offline devices. The clinical module enriches these manual entries the same way — FDA codes, tier assignment, calibration tracking. The coverage gap system can also flag clinical areas where expected device counts don't match discovered device counts.

**Q15: Can this replace our CMMS (Nuvolo, TMS, AIMS)?**

It can for networked device inventory and tracking. Pathfinder + Meridian + Ledger covers device inventory, maintenance scheduling, staff certification tracking, and compliance evidence — all within ServiceNow. The advantage is a single platform. The limitation is that Pathfinder doesn't manage physical maintenance workflows (work orders, parts inventory, PM checklists) the way a dedicated CMMS does. Most customers run both initially and evaluate consolidation over 6-12 months.

**Q16: How do you handle device mobility (e.g., infusion pumps that move between floors)?**

eBPF agents are on the servers, not on the devices. So when an infusion pump moves from the ICU to the step-down unit, we see it appear on a different network segment (different source IP range in flow data). The normalization layer recognizes it by MAC address and updates its location. If Armis is also present, Armis provides more precise location (AP association). The clinical module updates the care area assignment based on the new network location.

**Q17: What about FDA 21 CFR Part 820 compliance?**

Ledger includes a compliance framework for 21 CFR Part 820 (Quality System Regulation). It tracks: device identification and traceability (UDI), corrective and preventive actions (CAPA), installation and servicing records, and complaint handling (MAUDE correlation). The compliance score for Part 820 is calculated the same way as Joint Commission — per-requirement completeness scoring with evidence links.

**Q18: How does the tier assignment work for custom/proprietary medical devices?**

Default tier assignment is based on FDA product code mapping. If the FDA product code maps to a Class III device, it's Tier 4. Class II is Tier 3. Class I is Tier 2. Unknown classification defaults to Tier 1. Biomed teams can override any tier assignment manually, and the override persists through future discovery cycles. Custom rules can also be added — for example, "any device in the ICU is minimum Tier 3 regardless of FDA classification."

### Deployment & Operations

**Q19: What's the minimum viable deployment?**

One Linux server with the gateway (Docker or bare binary), one agent on a target server, and the ServiceNow scoped app installed. That's a single-server proof of concept. You'll see integrations being discovered within minutes of agent startup. Add more agents to expand coverage. The gateway handles up to 50 agents on a single 2-CPU instance.

**Q20: How do you handle air-gapped environments?**

Standalone deployment model with no internet access. The gateway, agents, and intelligence services all run on-prem. The AI engine can use a local LLM or run in statistical-only mode (no Claude API calls). Agent packages are distributed via internal repositories (Artifactory, Satellite). Update sets are imported manually. The only thing you lose in an air-gapped deployment is Claude-powered summarization — everything else works.

**Q21: What's the agent update process?**

Agent updates are delivered as new RPM/DEB/MSI packages or Helm chart versions. The gateway tracks agent versions and can flag out-of-date agents. For automated updates: Linux agents via Ansible/Puppet/Chef, Windows via SCCM/Intune, K8s via Helm chart rollout. The agent binary is backward-compatible with the gateway — older agents work with newer gateways. Gateway-initiated agent upgrades are on the roadmap but not yet implemented.

**Q22: How long does a full deployment take?**

Crawl phase (20-50 agents, basic classification): 4 weeks. That includes agent installation, gateway setup, SN scoped app, validation. Walk phase (full agent deployment + clinical module): 12 weeks. Run phase (intelligence suite + Meridian/Ledger/Vantage): 24 weeks. Most customers see value in the first 2 weeks of Crawl — the moment agents are running, you're discovering integrations.

### Business & Pricing

**Q23: How does pricing compare to ITOM Visibility + Service Mapping?**

ServiceNow ITOM Visibility is $60-100 per node per month. Service Mapping is additional. For 500 nodes, that's $360K-600K per year before Service Mapping. Pathfinder + Contour bundle for 500 nodes: $70K per year. That's 85-90% lower. The intelligence modules (Meridian, Ledger, Vantage) are additional, but they provide capabilities that ITOM doesn't offer at any price.

**Q24: What's the partner model?**

Implementation partners get a deployment playbook (40-80 hours for Crawl phase), training on the platform, and a referral/resale margin. Partners typically deliver the Crawl and Walk phases. Avennorth provides L2/L3 support. The 55-story WBS in `docs/methodology/` is the partner delivery framework.

**Q25: What's the contract structure?**

Annual subscription, billed annually or quarterly. No multi-year commitment required (though we offer discounts for 2-3 year terms). The Bearing assessment is free (or low-cost, depending on scope). Pilot pricing: 20-server Crawl phase at $0 for 60 days with a conversion agreement. Post-pilot, pricing is per the tier schedule.

**Q26: What ROI should we present to the CFO?**

Three buckets. (1) Labor savings: $300K-500K per year in manual CMDB maintenance effort that Pathfinder eliminates. This is the FTE cost of people who manually enter, reconcile, and update CIs today. (2) Incident prevention: $50K-200K per avoided P1 incident in a clinical environment. Pathfinder's health scoring catches integration degradation before it becomes an outage. (3) Compliance efficiency: Reduce Joint Commission survey prep from 3 months to continuous readiness. Quantify as the cost of the biomed/compliance team's time during survey prep cycles. Most customers hit full ROI in 6-12 months.

**Q27: Why not just wait for ServiceNow to build this with Armis?**

Three reasons. First, Armis is security-focused — device identification, CVE scoring, threat detection. It was not designed for CMDB lifecycle management, integration health scoring, or clinical operations. Second, ServiceNow's integration of Armis will take 12-24 months post-close (H2 2026 at earliest). Pathfinder deploys in weeks. Third, Pathfinder's clinical intelligence (Meridian, Ledger, Vantage Clinical) requires cross-platform data that ServiceNow doesn't own — UKG workforce data, FDA/MAUDE correlation, clinical workflow context. These products are structurally impossible for ServiceNow to replicate by integrating Armis.

---

## Demo Recovery Notes

| Issue | Recovery |
|-------|----------|
| Prototype won't load | Switch to terminal and walk through the architecture docs and code structure. "Let me show you how this is built." Open `docs/architecture/02-physical-architecture.md` and the codebase. |
| A specific page is slow or crashes | Skip it, describe what the audience would see. "In production, this page renders in under 2 seconds. Let me describe the data and move forward." |
| Audience wants to see code | Switch to terminal. Key files: `src/agent/linux/ebpf/flow_tracker.c` (eBPF), `src/gateway/internal/classify/rules.go` (classification), `src/intelligence/cmdb-ops-agent/agents/` (AI agents), `src/servicenow/tables/` (SN data model). |
| Audience wants to see architecture diagrams | Open `docs/architecture/02-physical-architecture.md` (four-tier), `docs/architecture/06-modular-platform-architecture.md` (discovery-agnostic), `docs/architecture/07-discovery-normalization-layer.md` (normalization). |
| Time is cut short (30 min available) | Run Acts 1-2-4-5-7 at 4 min each, skip Acts 3-6-8-9, compress Act 10 into the Close. Cover: eBPF, classification, applications, SN integration, clinical. |
| Time is cut short (20 min available) | Run Acts 1-4-7 at 5 min each, compress Close to 3 min. This gives them the three pillars: how we observe, what we discover, and how it applies to clinical. |
| Audience is deeply technical and wants more | Offer to open a terminal and pair-walk through the codebase. Show `go.mod` for dependencies, the protobuf definitions in `src/proto/pathfinder.proto`, the AI agent interface in `src/intelligence/cmdb-ops-agent/agents/`. |
| Someone asks about a product not in this demo (Contour, Bearing) | "Contour/Bearing is a separate product with its own deep dive. Today we're focused on Pathfinder. Happy to schedule that session. In brief: [one-sentence description]." |
