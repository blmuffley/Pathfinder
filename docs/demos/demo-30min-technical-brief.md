# Avennorth Pathfinder — 30-Minute Technical Demo Script

**Duration:** 30 minutes (28 min demo + 2 min buffer)
**Audience:** IT Directors, CMDB Managers, Clinical Engineering Directors, ServiceNow Platform Owners, Technical Decision-Makers
**Prototype:** http://localhost:4200
**Demo Data:** Mercy Health System (3 facilities, 6,425 devices)
**Version:** 2026-03-31

---

## Pre-Demo Setup

### Technical Checklist

- [ ] Prototype running at **http://localhost:4200** (`cd docs/prototypes/workspace-app && npm run dev`)
- [ ] Browser: Chrome or Edge, maximized (minimum 1400px wide)
- [ ] Starting tab: Overview page, Overview sub-tab
- [ ] No browser notifications or pop-ups enabled
- [ ] Screen sharing configured and tested (if remote)
- [ ] Backup: screenshots of every key screen saved locally in case of prototype failure
- [ ] No other Avennorth apps running on conflicting ports (4200, 8080-8083, 8443)
- [ ] Browser zoom at 100% (Cmd+0 / Ctrl+0 to reset)

### Theme Selection

The prototype supports light and dark mode via the toggle at the bottom of the sidebar.

| Audience | Recommended Theme |
|----------|-------------------|
| IT Directors, ServiceNow platform owners | **Dark** — reinforces the "modern observability" positioning |
| Clinical Engineering, biomed managers | **Light** — more familiar, less intimidating, better for projected screens |
| Mixed / unsure | **Dark** — default; switch to light if someone asks or the projector washes out |

### Audience Profile Card

Before the demo, confirm which audience segments are present. This changes emphasis:

| Segment | Emphasize | De-Emphasize |
|---------|-----------|--------------|
| **IT Directors** | Cost savings vs ITOM Visibility, autonomous ops, coverage gaps | Clinical device detail, compliance frameworks |
| **CMDB Managers** | CI quality, EA reconciliation, classification confidence, multi-source | Clinical extension, pricing |
| **Clinical Engineering Directors** | Tier 4 monitoring, Meridian workforce, Ledger compliance, Vantage Clinical | Gateway architecture, eBPF internals |
| **ServiceNow Platform Owners** | Native scoped app, Polaris workspace, cmdb_ci extension, Flow Designer | Clinical specifics, pricing |
| **Mixed technical** | Full demo as scripted below | Nothing — run all six acts |

> **Presenter note:** If the audience is heavily clinical (biomed directors, clinical engineering), extend Act 4 by 2 minutes and shorten Acts 5 and 6 by 1 minute each. If the audience is purely IT/ServiceNow, condense Act 4 to 3 minutes and expand Act 3 to 6 minutes.

---

## Opening — Architecture Context (2 minutes)

**[0:00 - 2:00]**

**Screen:** Overview page, Overview sub-tab (landing page)

> "Thank you for the time. I'm going to walk you through Avennorth Pathfinder — what it is, how it works technically, and what it looks like in practice. This is a working prototype against demo data from a fictional three-hospital health system, Mercy Health. Three facilities, 6,425 devices."

**Pause. Let the dashboard register.**

> "Before I click anything, let me explain the architecture in one sentence."

**Draw the pipeline in the air with your hand, or use a whiteboard if available:**

> "eBPF agents sit in the Linux kernel on your servers. They passively observe every TCP and UDP connection — source, destination, port, process name, bytes transferred. Those raw flows stream over mTLS gRPC to a Go gateway that classifies them, groups them into integrations, resolves them to CMDB CIs, and syncs everything into your ServiceNow instance. On top of that, a Python intelligence layer runs AI analysis — health scoring, anomaly detection, EA reconciliation, compliance checks."

**Key phrase (say it slowly):**

> "Passive observation at the kernel level. No code changes. No pattern libraries. No active scanning. We watch what your systems actually do."

> "On Windows, we use ETW instead of eBPF. On Kubernetes, a DaemonSet. Same data model, same gateway, same ServiceNow output."

> **Presenter note (IT audience):** If the audience includes infrastructure engineers, add: "The agent requires CAP_BPF, CAP_PERFMON, and CAP_NET_ADMIN — not root. Less than 1% CPU, under 50 MB RAM at steady state."

> **Presenter note (ServiceNow audience):** If the audience includes SN platform owners, add: "Everything lands in a scoped app with the x_avnth_ prefix. We extend cmdb_ci — we don't create shadow tables. Polaris workspace. Flow Designer for automation. No integrationHub dependency."

---

## Act 1: Discovery Engine (5 minutes)

**[2:00 - 7:00]**

### 1a. Discovery Pipeline Visualization

**Click:** Overview tab at the top, then click the **Discovery** sub-tab.

> "This is the discovery pipeline — what happens between a raw network packet and a CMDB CI."

**Walk through the pipeline visualization left to right:**

> "Start with raw flows. In this demo environment, Pathfinder observed 14.8 million raw TCP/UDP flows across our three facilities. Those flows get classified — is this an API call, a database connection, a message queue, or something clinical like HL7 or DICOM? Then grouped — thousands of flows between the same two endpoints become one integration. Then resolved to endpoints — IP addresses mapped to actual servers and applications in the CMDB. And finally, the output: CMDB Configuration Items. Integration CIs and Interface CIs, written directly into ServiceNow."

**Point to the funnel numbers:**

> "14.8 million flows became 12 integrations with 28 interfaces. That's the signal extraction. Your analysts see 12 things to govern, not 14.8 million things to drown in."

### 1b. Classification Rules

> "How does classification work? The gateway applies rules in priority order."

**If the Discovery tab shows classification detail, point to it. Otherwise, explain verbally:**

> "Priority one: port-exact match. Port 5432 is PostgreSQL, confidence 0.90. Priority two: process name match. A process named 'postgres' on an unusual port, confidence 0.85. Priority three: clinical protocol rules — HL7 on port 2575, DICOM on port 104 or 11112, IEEE 11073 for bedside devices. Priority four: heuristic analysis. Priority five: if nothing matches, it's marked Custom with low confidence, and an analyst reviews it."

> "The confidence score travels with the CI forever. You always know how sure Pathfinder was about what it found."

### 1c. Multi-Source Normalization

**Click:** **Discovery Sources** in the left sidebar (under Clinical Extension).

> "Here's the key differentiator. Pathfinder is discovery-agnostic by design."

**Point to the source table:**

> "Five discovery sources feeding this environment. Two Pathfinder eBPF agents — one at Main Campus, one at West Hospital. Armis covering all facilities. ServiceNow Discovery. And a manual biomed import from a CSV."

**Point to the confidence weights:**

> "Each source has a confidence weight. Pathfinder eBPF is 1.0 — kernel-level observation is the highest-fidelity data you can get. Armis is 0.70. ServiceNow Discovery is 0.60. Manual import is 0.30."

> "When two sources report the same device with conflicting attributes — say Armis says a device is a printer and Pathfinder says it's an infusion pump — the higher-confidence source wins. But the conflict is logged, and an analyst can review it."

**Key phrase:**

> "We work with Armis, not against it. If you already have Armis, Claroty, Medigate, Ordr — keep them. Pathfinder normalizes everything into one device model. Discovery-agnostic by design."

> **Presenter note (if Armis is in the room):** Soften the competitive framing. Say: "Armis is excellent at agentless device identification. Pathfinder adds kernel-level behavioral observation on servers where you can install an agent. Together, they give you complete coverage." Never position as a replacement unless the customer brings it up.

---

## Act 2: Application Mapping (5 minutes)

**[7:00 - 12:00]**

### 2a. Epic EHR Integration Engine

**Click:** **Applications** in the left sidebar.

**Click:** **Epic EHR Integration Engine** in the application list (first row, APP-001).

> "This is the application dependency diagram for Epic EHR's integration engine — the Mirth Connect instance that routes HL7, FHIR, and DICOM traffic across the hospital."

**The diagram loads in radial layout by default. Let it render.**

> "Sixteen dependencies, discovered automatically. Pathfinder inferred this application from behavioral patterns — it saw the same source IP communicating with PACS over DICOM, with the lab system over HL7, with pharmacy over HL7, with imaging devices over DICOM. It grouped those flows and said: this is an integration engine."

**Point to the shape legend:**

> "Notice the shapes. Squares are servers and services. Diamonds are databases or, in red, life-critical devices. Hexagons are message brokers. Crosses are clinical devices. Triangles are IoT. Clouds are external services."

> "Every color and shape tells you the device tier and type at a glance."

### 2b. Layout Switching

**Click:** **Top-Down** layout button.

> "Same data, different perspective. Top-down shows the flow direction — Epic at the top, dependencies below. This is useful for architecture reviews."

**Click:** Back to **Radial** layout.

### 2c. Filtering

**Click:** Toggle off **Server** in the device type filter. Toggle off **Directory**. Toggle off **External**. Leave only **Clinical** and **Life-Critical** visible.

> "Now I'm looking at only the clinical and life-critical dependencies. CT scanners, MRI, ultrasound, infusion pumps, patient monitors, ventilators, neonatal monitors. This is the clinical blast radius of this integration engine."

**Let this sink in for 3 seconds.**

> "If Epic goes down, these are the devices that lose their upstream connection. Patient monitors stop sending vitals to the EHR. Infusion pump drug libraries stop syncing. This is why we tier devices and why Tier 4 gets 1-second monitoring."

**Toggle all device types back on.**

### 2d. Simpler Application Map

**Click:** **Order Processing Service** in the application list (APP-002).

> "Compare that to a standard IT application. Six dependencies — payment gateway, Kafka, a database, notification service, analytics, Active Directory. Clean, simple. Notice the Notification Service node is red — health score 34, critical. That's our SendGrid problem. We'll see that in a moment."

### 2e. CSDM Bridge

> "One more thing. What Pathfinder discovers here — applications, their dependencies, their health — feeds directly into Contour, our CSDM modeling product. Contour takes these discovered applications and automatically builds Business Services, Technical Services, and Application Services in the ServiceNow CSDM framework. No manual CSDM entry."

> **Presenter note:** Do not deep-dive Contour here. It is a separate product with a separate demo. The mention should take 15 seconds.

---

## Act 3: Integration Intelligence (5 minutes)

**[12:00 - 17:00]**

### 3a. Integration List

**Click:** **Overview** in the sidebar, then click the **Integration** sub-tab.

> "This is every discovered integration, with real-time health status."

**Point to the table columns:**

> "Name, type, health status, health score, confidence, flow count. All auto-populated. Sort by health score — the critical SendGrid integration floats to the top."

### 3b. Critical Integration Deep-Dive

**Click:** the **Notification Svc to SendGrid** row (Critical, score 34).

> "This is the integration in trouble. Let me walk through what the AI is telling us."

**Point to the AI Summary card (red border):**

> "The AI — Claude, via our Shared AI Engine — analyzed the health metrics and wrote this summary: 4.8% error rate trending upward, availability dropped to 96.2%, likely hitting SendGrid rate limits during peak notification volume. Recommendation: review sending volume, implement exponential backoff, consider upgrading the SendGrid plan."

> "This was generated automatically. No analyst wrote this. No one filed a ticket. The AI saw the pattern and explained it in plain English."

**Point to the health scoring breakdown:**

> "Health scoring uses four metrics with fixed weights. Availability at 40% weight. Latency at 30%. Error rate at 20%. Data staleness at 10%. Those weights are tunable per integration, but the defaults work for 90% of cases."

### 3c. Healthy Integration Comparison

**Click:** the **Event Bus to Kafka** row (Healthy, score 96).

> "Compare that to a healthy integration. Score 96. 890,000 flows. The AI summary says zero message loss in 90 days across 12 Kafka partitions. That's confidence in your event backbone."

### 3d. AI Insights Feed

**Click:** the **Insights** sub-tab at the top of the Overview page.

> "This is the intelligence feed from six AI engines working in parallel. Integration Intelligence, Service Map Intelligence, Vantage Clinical, Meridian, Ledger, and Analytics."

**Point to the top 3-4 insights:**

> "Critical: SendGrid error rate spiking. High: LDAP latency increased 4x. High: Infusion pump communication retries up 300%, matching an FDA MAUDE pattern. Medium: three new servers discovered with no agents."

> "This is not a dashboard you check. These are findings that find you. In production, each of these generates a ServiceNow notification or a Flow Designer trigger."

### 3e. EA Reconciliation

**Click:** **EA Reconciliation** in the left sidebar.

> "Enterprise Architecture teams maintain documentation of how systems connect. That documentation is usually wrong — or at least incomplete. This page bridges the gap."

**Point to the KPIs:**

> "Five unmapped integrations, five mapped, one suggested, one disputed. The progress bar shows 36% reconciled."

**Click:** an integration in the left panel (e.g., Auth Service to LDAP Directory).

> "The AI found two potential EA matches. The first at 85% confidence — fuzzy name match: 'auth service' matches 'authentication service.' The second at 52% — group match because both belong to the Identity & Access Management business service."

> "One click to confirm. In ServiceNow, this links the Integration CI to the EA relationship record. The analyst just closed a reconciliation gap in 5 seconds that used to take a spreadsheet exercise."

> "Your Enterprise Architecture documentation, validated by real network behavior."

---

## Act 4: Clinical Extension (5 minutes)

**[17:00 - 22:00]**

> **Presenter note (clinical audience):** This is your marquee section. Slow down, let the clinical detail register. If the audience is IT-only, condense to 3 minutes and focus on the device tiering concept rather than individual device detail.

### 4a. Clinical Device Fleet

**Click:** **Clinical Devices** in the left sidebar.

> "Everything we've seen so far applies to standard IT. Now let me show you what happens when you add clinical devices."

**Click the Tier 4 filter** (or filter to Life-Critical).

> "Tier 4: life-critical devices. Ventilators, anesthesia machines, cardiac monitors, neonatal monitors. These are the devices where a failure has direct patient safety implications."

**Click:** **ICU Ventilator #3** (DEV-V003, Degraded, health 72).

> "This Getinge Servo-u ventilator in the Medical ICU. Health score 72 — degraded. Look at the detail."

**Point to the device attributes:**

> "Manufacturer: Getinge. Model: Servo-u. FDA product code: BTD. FDA Class III — the highest risk classification. Calibration last performed November 10, 2025. Calibration was due February 10, 2026. It's 49 days overdue."

> "Pathfinder discovered this device through behavioral observation — it saw IEEE 11073 protocol traffic from this IP, matched the OUI to Getinge, and classified it as Tier 4 life-critical. The calibration data came from the biomed import, normalized through the Discovery Normalization Layer."

> "Tiered monitoring means this device gets 1-second continuous observation. Not a 5-minute polling interval. One second. If this ventilator stops communicating, an alert fires immediately."

### 4b. Meridian — Workforce Intelligence

**Click:** **Meridian** in the left sidebar.

> "Meridian is the clinical operations graph. It answers the question: who is certified to operate which device, and are they on shift right now?"

**Point to the Staff Coverage tab (or the default view showing staff-device mapping):**

> "This data comes from UKG Pro — shift schedules, certifications, training records. Meridian correlates it with the device graph from Pathfinder."

> "Sarah Chen, Respiratory Therapist, Cardiac ICU. Certified on Philips IntelliVent, Getinge Servo-u, and Draeger Infinity ventilators. Currently on shift — day shift, 7am to 7pm."

> "James Rodriguez, also a Respiratory Therapist, but in Medical ICU on the night shift. Certified on Philips IntelliVent and Getinge Servo-u. Not currently on shift."

**Explain the impact analysis concept:**

> "If ICU Ventilator #3 goes offline right now at this time of day — who's affected? Three patients in MICU Bay 4. Which certified staff are on shift? Sarah Chen in CICU can cover, but she'd need to move. What's the backup device? Ventilator #1 in CICU Bay 1 is available, health score 98."

> "UKG Pro integration. We know who's certified on which device and who's on shift right now. No other platform has this data."

> **Presenter note (clinical audience):** This is usually the moment that gets the strongest reaction from clinical engineering directors. Let the silence land. If they ask "How do you get UKG data?" the answer is: "UKG Pro has a REST API for shift schedules and certifications. Meridian polls it every 15 minutes and correlates with the device graph."

### 4c. Ledger — Compliance Automation

**Click:** **Ledger** in the left sidebar.

**Point to the Dashboard tab — the compliance heatmap:**

> "Compliance posture across every framework and every facility. Joint Commission, CMS Conditions of Participation, FDA Postmarket Surveillance, State Department of Health, Cyber Insurance attestations."

> "Green means compliant. Red means a finding is open. Amber means pending review."

**Click a non-compliant finding** (e.g., Joint Commission EC.02.04.03 — the ventilator calibration):

> "Joint Commission EC.02.04.03 — equipment inspection and testing schedule. Finding: ICU Ventilator #3 calibration overdue by 49 days. Life-critical device. Remediation: emergency calibration required. Due date: April 5th. Owner: Mike Thompson, Biomedical Engineer."

> "This finding was generated automatically by Ledger evaluating device metadata against Joint Commission rules. The remediation plan was written by the AI. The due date was set based on the severity and the framework's remediation timeline requirements."

**Key phrase:**

> "Automated survey prep. Your biomed team stops compiling binders and starts fixing problems."

> **Presenter note:** If a Clinical Engineering Director is present, add: "Every finding is timestamped and audit-trailed. When the Joint Commission surveyor asks for your EC.02.04 documentation, you hand them a report generated 30 seconds ago with current data, not a binder assembled 6 months ago."

---

## Act 5: Agent Fleet and Operations (3 minutes)

**[22:00 - 25:00]**

### 5a. Agent Fleet

**Click:** **Agent Fleet** in the left sidebar.

> "Every server running a Pathfinder agent. Linux, Windows, and Kubernetes nodes."

**Point to the key elements:**

> "12 active agents, 2 stale. Each agent gets a UUID on enrollment that persists across restarts. Stale agents — like staging-web-01, no heartbeat in 3 days — automatically create coverage gap records."

**Point to the OS distribution:**

> "One agent binary, three deployment models. Linux eBPF, Windows ETW, Kubernetes DaemonSet. Same data format, same gateway, same classification engine."

### 5b. Coverage Gap Self-Healing

**Click:** **Coverage Gaps** in the left sidebar.

> "This is the Kanban board for coverage remediation."

**Walk through the lanes quickly:**

> "Open — 6 servers that need agents, prioritized by criticality. In Progress — change requests created, agents being deployed. Resolved — self-healing worked, agents deployed, verified, gap closed. Waived — dev servers that don't need coverage. Failed — one deployment that needs manual intervention."

**Key phrase:**

> "Self-healing coverage. Gap detected. Change request created automatically in ServiceNow. Agent deployed via your existing deployment tooling. Enrollment verified. Gap closed. No human in the loop for standard deployments."

### 5c. Health Dashboard and Analytics

**Click:** **Health Dashboard** in the left sidebar.

> "The executive view. 30-day trends across all integrations. 99.7% average availability, 72ms average latency, 0.8% error rate."

**Point to the anomaly:**

> "See the error rate spike in the last few days? That's our SendGrid integration. And the latency trend? The LDAP degradation. The AI identified both of these before they became incidents."

**Click:** **Analytics** in the left sidebar.

> "Facility comparison, device distribution, cost analysis. This is where leadership sees the operational picture across all three Mercy Health facilities."

---

## Act 6: Architecture and Integration (3 minutes)

**[25:00 - 28:00]**

> "Let me pull back from the screens for a moment and talk about how this is built."

### 6a. The Stack

> "Four layers. Tier 1: Go agents with eBPF on Linux, ETW on Windows. Tier 2: Go gateway — classification engine, CI resolution, ServiceNow sync, all compiled into a single binary. Tier 3: Python intelligence services — Integration Intelligence, CMDB Ops Agent with 8 autonomous agents, Service Map Intelligence, and the clinical modules: Meridian, Ledger, Vantage Clinical. Tier 4: ServiceNow scoped app."

### 6b. Native ServiceNow

> "This is not a connector. We extend cmdb_ci directly. Integration CIs, Interface CIs, Health Logs, Coverage Gaps, Agent Inventory — all native ServiceNow tables in the x_avnth scope. Polaris workspace. Flow Designer for all automation. Performance Analytics dashboards. Your CMDB analysts never leave ServiceNow."

### 6c. Discovery-Agnostic Design

> "The Discovery Normalization Layer accepts data from any source. Pathfinder eBPF agents, Armis, ServiceNow Discovery, Claroty, Medigate, Ordr, or a CSV import. Every downstream intelligence module — Meridian, Ledger, Vantage Clinical — consumes the Unified Device Model. They never need to know how a device was discovered."

### 6d. Cloud Service Discovery

> "One more thing. When your servers make outbound connections to Salesforce, Workday, AWS services, Azure AD — Pathfinder sees that traffic. It classifies those as External Service integrations and creates CIs for your SaaS and PaaS dependencies. Your Salesforce, Workday, and AWS dependencies — discovered automatically from outbound traffic patterns."

### 6e. CSDM Alignment

> "Pathfinder discovers the infrastructure and application layers. Contour — our CSDM product — takes that data and builds the Business Service, Technical Service, and Application Service layers automatically. Together, they give you a complete CSDM implementation without manual data entry."

---

## Close (2 minutes)

**[28:00 - 30:00]**

**Navigate back to Overview page.**

> "Let me summarize what you just saw."

> "One: Zero-code discovery. eBPF agents find every integration and every device automatically. No code changes, no pattern libraries, no active scanning."

> "Two: AI intelligence. Claude-powered health scoring, natural language summaries, anomaly detection, and remediation recommendations."

> "Three: Clinical extension. Tier 4 life-critical device monitoring at 1-second intervals. Workforce certification mapping from UKG Pro. Automated compliance evidence against Joint Commission, CMS, FDA, and cyber insurance frameworks."

> "Four: Self-healing operations. Coverage gaps detected, change requests created, agents deployed, verified, and closed — automatically."

> "Five: Native ServiceNow. Not a connector. Not a shadow system. Your CMDB, your workflows, your Polaris workspace."

### Pricing

> "Pathfinder starts at $50,000 per year for up to 500 managed nodes. The Pathfinder plus Contour bundle — which replaces ITOM Visibility and Service Mapping — starts at $70,000. That's an 85% cost reduction compared to the ServiceNow native stack."

> "Clinical extensions — device tiering, Meridian, Ledger, Vantage Clinical — are priced per facility. A 500-bed hospital at mid-tier runs approximately $30,000 to $50,000 per facility per month for the full clinical stack."

### Implementation

> "Two weeks to deploy. Agents go on servers in minutes — RPM, MSI, or DaemonSet. Gateway is a single Docker container or Helm chart. Value on day one — you see integrations within the first hour of agent deployment. Full production coverage in 30 days."

### Call to Action

> "Here's what I'd recommend as a next step. Let us run a Bearing assessment on your CMDB — it's a free read-only analysis of your current integration coverage, stale records, and duplicate CIs. Takes 48 hours. Then we deploy a 20-server pilot in your environment and show you real data from your network within a week."

**Pause.**

> "Questions?"

---

## Talking Points for Q&A

### eBPF Security Model

**Q:** "How do eBPF agents access kernel-level data? Do they run as root?"

**A:** "No. The agent runs as a non-root service account with three Linux capabilities: CAP_BPF to load eBPF programs, CAP_PERFMON to access performance events, and CAP_NET_ADMIN for network socket access. The eBPF programs themselves are verified by the kernel's built-in eBPF verifier before they're allowed to load — the verifier proves they can't crash the system, access arbitrary memory, or loop indefinitely. This is the same security model used by Cilium, Falco, and every major eBPF-based observability tool in production today."

### Performance Overhead

**Q:** "What's the CPU and memory impact on production servers?"

**A:** "Less than 1% CPU at steady state. Under 50 MB RAM. We budget for 2% CPU as the ceiling, but in practice it's well under 1%. The eBPF programs run in kernel space with zero-copy ring buffers — there's no context switching or packet copying. On Windows with ETW, the overhead is comparable. We have benchmarks we can share from load testing with 10,000 concurrent connections per second."

### Encrypted Traffic

**Q:** "Can Pathfinder see inside encrypted traffic?"

**A:** "We don't need to. Pathfinder operates at the socket level, not the packet level. We see source IP, destination IP, port, protocol, process name, bytes transferred, and connection duration. We don't see payload content. For classification, port and process name are sufficient — port 5432 with process name 'postgres' is a PostgreSQL connection regardless of whether TLS is enabled. For clinical protocols, HL7 typically runs on port 2575 and DICOM on port 104 or 11112, which are identifiable without payload inspection."

### HIPAA Compliance

**Q:** "Does Pathfinder capture PHI? What about HIPAA?"

**A:** "No PHI is captured, transmitted, or stored. Pathfinder collects network metadata — IP addresses, ports, process names, byte counts, connection timestamps. None of that constitutes Protected Health Information. We don't inspect packet payloads. We don't capture patient data. The metadata we collect is equivalent to what a firewall log contains. We have a HIPAA compliance whitepaper we can provide, and we'll sign a BAA if your legal team requires one for network metadata."

### ServiceNow Version Requirements

**Q:** "What ServiceNow version do you require?"

**A:** "Tokyo or later. We use Polaris workspace, which was introduced in San Diego, and Flow Designer features that stabilized in Tokyo. We test against Tokyo, Utah, Vancouver, Washington, and Xanadu. The scoped app is compatible with all of them. If you're on an older release, the core functionality works on Rome, but you lose Polaris workspace and some Flow Designer features."

### Classification Rule Updates

**Q:** "How are classification rules updated? Do we need to update agents?"

**A:** "Classification happens at the gateway, not the agent. The agent collects raw flows and streams them to the gateway. The gateway applies classification rules. When we update rules — for example, adding a new clinical protocol or a new SaaS service signature — you update the gateway. The agents don't change. Gateway updates are a Docker image swap or a Helm chart upgrade. Rule updates can also be hot-loaded via the gateway's REST API without a restart."

### Multi-Tenant and Multi-Facility

**Q:** "How does multi-facility work? Do we need a gateway per facility?"

**A:** "One gateway handles all facilities. Agents are tagged with a facility identifier on enrollment. The gateway routes data to facility-specific buckets in the classification and CI resolution pipeline. In ServiceNow, every CI carries a facility reference. Meridian, Ledger, and Analytics all support per-facility views and cross-facility aggregation. For large deployments with network segmentation between facilities, you can deploy gateway instances per facility with a shared PostgreSQL backend."

### Armis Coexistence

**Q:** "We already have Armis. How does Pathfinder work alongside it?"

**A:** "Armis is excellent at agentless device identification, especially on clinical VLANs where you can't install an agent. Pathfinder adds kernel-level behavioral observation on servers where you can install agents. The Discovery Normalization Layer accepts data from both — Armis at confidence weight 0.70, Pathfinder eBPF at 1.0. When both sources report the same device, the higher-confidence source wins for conflicting attributes, but all source data is retained for audit. After ServiceNow's acquisition of Armis, we expect Armis data to flow natively through Service Graph Connectors — our normalization layer is already designed for that pattern."

### Integration with Existing ITSM Workflows

**Q:** "How does this integrate with our existing incident management and change management processes?"

**A:** "Entirely through ServiceNow native capabilities. Coverage gaps create standard or normal change requests via Flow Designer. Health alerts create incidents or events via the Event Management integration. Compliance findings from Ledger create Problem records or tasks. Everything flows through your existing approval workflows, SLAs, and routing rules. We don't bypass your ITSM processes — we feed them."

### Deployment Models

**Q:** "What are the deployment options?"

**A:** "Three models. Standalone: you own everything — agents, gateway, PostgreSQL, AI engine — all on your infrastructure. Managed: we manage the agents and gateway remotely, but data stays on your infrastructure. SaaS: we host everything. Most healthcare customers start with Standalone or Managed because of data sovereignty requirements. The agent installs via RPM on RHEL/CentOS/Amazon Linux, DEB on Ubuntu/Debian, MSI on Windows Server, or DaemonSet on Kubernetes."

### Data Retention and Storage

**Q:** "How much data does Pathfinder store? What are the retention policies?"

**A:** "Raw flow data is aggregated at the gateway — we don't store individual packets. Aggregated flow records are retained in PostgreSQL for 90 days by default, configurable up to 365 days. Integration CIs and Interface CIs in ServiceNow are permanent — they follow your CMDB lifecycle policies. Health logs are time-series data retained for 90 days in ServiceNow. Disk usage is approximately 1 GB per 1,000 managed nodes per month at the gateway level."

### AI Model and Token Costs

**Q:** "What AI model do you use? What are the token costs?"

**A:** "Claude via the Anthropic API, orchestrated through our Shared AI Engine. The AI processes structured context — integration metadata, health metrics, interface details — not raw network data. Token usage is approximately 2,000-4,000 tokens per integration analysis, running on scheduled cycles (every 4 hours by default for health scoring, on-demand for EA reconciliation). For a 500-node deployment with 50 integrations, expect approximately $50-100 per month in Claude API costs. Customers can use their own Anthropic API key or we include API costs in the managed pricing."

### Patent Protection

**Q:** "Is this technology patented?"

**A:** "We have patent applications filed covering the clinical device behavioral classification system, the tiered monitoring model for life-critical devices, and the workforce-to-device certification graph (Meridian). The combination of eBPF-based discovery with AI-powered CMDB governance in a ServiceNow-native scoped app is novel — there's no competing product that assembles this stack. Our provisional patents are filed and we're in the utility patent process."

### Roadmap

**Q:** "What's on the roadmap?"

**A:** "Three priorities. First, Contour CSDM — the automated Business Service modeling product that takes Pathfinder's discovered applications and builds CSDM layers automatically. That's in beta now. Second, expanded vertical rule packs for Ledger — HITRUST, SOC 2, ISO 27001 in addition to the healthcare frameworks we ship today. Third, additional discovery adapters — Claroty, Medigate, Ordr, and Nozomi for OT environments."

### What If Discovery Sources Disagree

**Q:** "What happens when Pathfinder and Armis report different information about the same device?"

**A:** "The Discovery Normalization Layer uses a confidence-weighted merge. Each source has a base weight — eBPF 1.0, Armis 0.70, SN Discovery 0.60. Weights are adjusted by recency (more recent data scores higher) and by behavioral consistency (a source that consistently reports the same values gets a stability bonus). For each attribute — hostname, IP, manufacturer, model, device type — the highest-confidence source wins. Conflicts are logged in a reconciliation table that analysts can review. In practice, most conflicts are benign — different naming conventions or stale data from one source."

### How Fast Do You See Results

**Q:** "How quickly after deploying an agent do we see data?"

**A:** "Within minutes. The agent starts observing connections immediately after enrollment. The first flow records hit the gateway within the heartbeat interval (30 seconds default). Classification and CI creation happen in the next gateway processing cycle (every 60 seconds). So within 2-3 minutes of agent deployment, you'll see discovered integrations in ServiceNow. Health scoring requires a baseline period — typically 24 hours of observation before confidence scores stabilize. The AI summary is available after the first health scoring cycle."

---

## Demo Recovery Playbook

If the prototype fails during the demo:

| Failure | Recovery |
|---------|----------|
| Prototype won't start | Use the backup screenshots. Say: "Let me show you the screens while we troubleshoot." |
| Page loads blank | Refresh the browser (Cmd+R). If that fails, restart: `npm run dev` in a terminal. |
| Theme toggle breaks layout | Refresh the page. The theme state resets to dark. |
| Application diagram doesn't render | Switch to a different application and back. D3 occasionally needs a re-render. |
| Audience asks to see real data | "This is demo data. The Bearing assessment — our free CMDB audit — runs against your real ServiceNow instance and produces a report with your actual data. That's the best way to see what Pathfinder finds in your environment." |
