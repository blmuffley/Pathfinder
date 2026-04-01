# Patent Claims — Pathfinder Clinical Extension

## Filing Priority: Tier 1 — File Before Armis Close (H2 2026)

These five provisional patent claims should be filed before ServiceNow's Armis acquisition closes to establish prior art and IP protection for Pathfinder's unique innovations.

---

## Claim 1: Clinical Operations Graph Construction

### Title
System and Method for Constructing Unified Clinical Operations Intelligence by Correlating Medical Device Behavioral Data with Workforce Scheduling and Credential Data Across Multiple Enterprise Platforms

### Abstract
A computer-implemented method for creating a cross-platform clinical operations graph by: (1) receiving medical device behavioral observation data from a CMDB-integrated discovery system, (2) receiving workforce scheduling, certification, and credential data from an enterprise workforce management system, (3) constructing a graph data structure with nodes representing medical devices, clinical staff, departments, care areas, clinical workflows, and procedures, connected by typed edges representing relationships including device-to-clinician certification, shift assignment, workflow support, backup designation, and procedure scheduling, (4) computing schedule-aware impact analysis when a device status change occurs by traversing the graph to identify affected staff, procedures, and backup equipment in real-time, and (5) presenting unified cross-platform query results that combine device operational status with workforce availability and certification validity.

### Key Claims
1. A method for correlating medical device configuration item data from a ServiceNow CMDB instance with workforce scheduling data from an external workforce management system (UKG Pro, Kronos, Workday) to produce a unified clinical operations graph stored as a set of related records in the ServiceNow platform.

2. The method of claim 1, wherein the clinical operations graph enables schedule-aware impact analysis by: receiving a device incident event, identifying the affected device's clinical workflow associations, querying the workforce management system for staff currently on shift who hold valid certifications for the affected device type, identifying backup devices of the same type within the same facility, and producing a ranked response plan combining device availability with certified operator availability.

3. The method of claim 1, wherein the cross-platform graph enables maintenance window optimization by: cross-referencing device maintenance schedules with workforce scheduling data, computing an impact score for each candidate maintenance window based on affected procedure count, staff availability, and backup equipment readiness, and recommending optimal windows that minimize clinical disruption.

### Prior Art Differentiation
No existing system correlates ServiceNow CMDB device data with UKG Pro workforce scheduling/credential data in a unified graph. Armis provides device discovery. ServiceNow provides CMDB. UKG provides workforce. No product connects all three for clinical operations intelligence.

---

## Claim 2: Cross-Platform Clinical Incident Escalation

### Title
System and Method for Automated Clinical Incident Escalation Using Multi-Source RACI Resolution Combining Device Ownership Records, Workforce Scheduling Data, and Device-Specific Certification Requirements

### Abstract
A computer-implemented system for routing medical device incidents to appropriate responders by: (1) detecting a device incident through behavioral pattern analysis, (2) classifying the incident type (security compromise, device failure, communication disruption, calibration drift, environmental), (3) determining the patient safety impact score based on device tier, active procedure count, backup availability, and FDA adverse event pattern matching, (4) resolving the escalation path by combining RACI relationship data from a ServiceNow-based EA Stakeholder Hub, real-time on-call and shift data from an external workforce management system, and device-specific certification requirements from a training management system, and (5) executing tiered escalation with automatic failover when primary contacts are unavailable.

### Key Claims
1. A method for automated clinical incident routing that combines device ownership data from ServiceNow with real-time workforce availability from UKG Pro and device-specific certification requirements to identify the optimal responder who is: (a) on shift, (b) certified for the specific device manufacturer and model, and (c) designated in the RACI matrix for the device's department and criticality tier.

2. The method of claim 1, further comprising a patient safety impact scoring algorithm that assigns a score from 0-100 based on: device tier (life-critical = 40 base points), active procedure count in the next 4 hours, backup device availability and readiness, certified operator availability on current shift, FDA adverse event pattern match, and produces escalation priority (P1-P4) from the score.

3. The method of claim 1, further comprising automated backup device identification that: queries the device inventory for same-type devices at the same facility, filters by operational status and calibration currency, cross-references with workforce data to verify certified operators are available, and ranks backup options by proximity, availability, and staff coverage.

### Prior Art Differentiation
Existing clinical engineering systems (Nuvolo, TMS) manage maintenance schedules but do not perform real-time incident escalation using live workforce scheduling data. ITSM incident routing (ServiceNow, PagerDuty) does not incorporate device-specific clinical certifications or patient safety impact scoring.

---

## Claim 3: Behavioral Medical Device Classification

### Title
Method and System for Passive Classification of Medical Devices Using Kernel-Level Behavioral Observation of Healthcare-Specific Network Protocol Patterns Without Active Network Scanning

### Abstract
A computer-implemented method for classifying medical devices on a clinical network by: (1) deploying kernel-level observation probes (eBPF on Linux, ETW on Windows) on network infrastructure or gateway appliances with visibility into clinical network segments, (2) capturing connection metadata (source/destination IP, port, protocol, process identifier, connection timing, byte volume) without inspecting packet payload content, (3) applying healthcare protocol inference rules that identify HL7 v2.x, FHIR, DICOM, and IEEE 11073 communication patterns from connection characteristics including port assignments, message timing patterns, session duration, and bidirectional flow characteristics, (4) correlating inferred protocol patterns with FDA product code databases and manufacturer behavioral fingerprints to classify discovered devices into a tiered medical device taxonomy (clinical, life-critical), and (5) assigning confidence scores using a multi-factor model that weights protocol match confidence, manufacturer correlation strength, behavioral consistency over observation time, and corroboration from additional discovery sources.

### Key Claims
1. A method for passively identifying medical devices on a network by analyzing kernel-level connection metadata to infer healthcare-specific protocol usage, wherein the method does not perform active scanning, packet injection, or payload inspection, and wherein inference is based on connection timing patterns, port assignments, session characteristics, and bidirectional flow analysis.

2. The method of claim 1, wherein the tiered confidence scoring applies different weighting algorithms to different device tiers, with life-critical devices (Tier 4) requiring higher confidence thresholds (>0.90) for classification confirmation and triggering enhanced monitoring parameters including sub-second observation cycles and immediate anomaly alerting.

3. The method of claim 1, further comprising a multi-source confidence composition method that combines behavioral observation confidence with data from agentless discovery systems (e.g., Armis), active discovery systems (e.g., ServiceNow Discovery), and manual device registries, using source-specific confidence weights and recency-adjusted scoring to produce a composite device classification with full source provenance.

### Prior Art Differentiation
Armis uses agentless network monitoring — passive but without kernel-level visibility. Claroty/Medigate use network taps with DPI. No existing system uses eBPF kernel-level observation specifically for medical device behavioral classification with healthcare protocol inference from metadata alone (no DPI).

---

## Claim 4: Discovery-Agnostic Clinical Intelligence Platform

### Title
System and Architecture for Providing Clinical Operations Intelligence Independent of Device Discovery Source Through a Normalization Layer That Translates and Confidence-Weights Data From Heterogeneous Discovery Systems

### Abstract
A computer-implemented platform for delivering clinical device intelligence that operates independently of the underlying device discovery mechanism by: (1) defining a discovery normalization layer with pluggable source adapters that accept device inventory data from multiple heterogeneous discovery systems including kernel-level behavioral observation agents, agentless network monitoring systems, active credential-based discovery systems, and manual import, (2) translating each source's native data format into a unified device model with a canonical schema, (3) performing cross-source deduplication using a priority cascade of hardware identifiers (MAC address), network identifiers (IP + hostname), device identifiers (serial number, UDI), and fuzzy matching (manufacturer + model + network segment), (4) computing composite confidence scores by weighting each source's contribution based on its observation methodology (kernel-level > agentless > active scan > manual), with recency and behavioral confirmation adjustments, (5) resolving conflicts between sources using a highest-confidence-wins strategy with newest-timestamp tiebreaking, and (6) providing the normalized, deduplicated, confidence-scored device model to downstream clinical intelligence consumers (operations graphs, compliance engines, incident response systems) that require no knowledge of which discovery source produced the data.

### Key Claims
1. A discovery normalization layer that enables clinical intelligence layers to operate without dependency on any specific device discovery technology, comprising source adapters for at least: agent-based behavioral observation, agentless network monitoring, active credential-based discovery, and manual import, where each adapter translates native data formats to a canonical unified device model.

2. The normalization layer of claim 1, further comprising a cross-source deduplication engine that identifies the same physical device reported by different discovery sources using a priority cascade of hardware identifiers, network identifiers, device-specific identifiers, and fuzzy matching, and merges data from multiple sources into a single canonical device record with per-field confidence attribution.

3. The normalization layer of claim 1, further comprising a composite confidence scoring method that weights each discovery source's contribution based on its methodology (kernel-level observation receiving highest weight, manual import receiving lowest), applies recency adjustments (newer data receives bonus, stale data receives penalty), and produces a single confidence score for each field in the unified device model.

### Prior Art Differentiation
No existing clinical device intelligence platform is designed to be discovery-source-agnostic. Claroty, Cynerio, Ordr, and Armis all provide tightly coupled discovery + intelligence. Pathfinder's normalization layer is architecturally novel — it decouples intelligence from discovery, allowing it to layer on top of ANY discovery source including competitors.

---

## Claim 5: Behavioral Confidence Scoring for Service Dependencies

### Title
Method for Generating Confidence-Scored Service Dependency Maps Using Kernel-Level Behavioral Observation Without Pattern Libraries, Active Scanning, or Application Instrumentation

### Abstract
A computer-implemented method for discovering and scoring service-to-service dependencies by: (1) deploying kernel-level observation probes (eBPF tracepoints on Linux, ETW providers on Windows) that capture TCP and UDP connection events including source/destination addresses, ports, process identifiers, connection timestamps, byte volumes, and connection duration, (2) grouping observed connections by unique source-destination-port tuples over configurable observation windows, (3) applying a multi-factor confidence scoring model that evaluates: port classification match (base confidence from known port assignments), process name confirmation (bonus when process name corroborates port classification), flow volume and consistency (higher flow counts and regular patterns increase confidence), directional analysis (request-reply vs. streaming vs. fire-and-forget pattern inference), connection persistence (long-lived connections scored differently than ephemeral), and multi-source corroboration (bonus when multiple discovery sources confirm the same dependency), (4) creating service dependency records as configuration items in a CMDB with confidence scores, behavioral profiles, and full observation provenance, and (5) continuously updating confidence scores as new behavioral data is observed, with scores increasing for consistently observed dependencies and decreasing for dependencies that become intermittent or cease.

### Key Claims
1. A method for generating service dependency maps without requiring pattern libraries, credential-based probing, or application instrumentation, using only passively observed kernel-level connection metadata, wherein confidence scores are dynamically computed from observable behavioral characteristics and updated continuously as new data is collected.

2. The method of claim 1, wherein the confidence scoring model differentiates between standard IT service dependencies and healthcare-specific clinical device dependencies by applying tier-specific scoring algorithms with different confidence thresholds, observation windows, and anomaly sensitivity levels for life-critical medical devices versus standard infrastructure.

3. The method of claim 1, wherein the behavioral service dependency discovery operates in encrypted network environments where packet payload inspection is not possible, by relying exclusively on connection metadata (IP addresses, ports, process names, timing, and volume) observable at the kernel level below the encryption layer.

### Prior Art Differentiation
ServiceNow Service Mapping requires pattern libraries maintained by SN engineers. Dynatrace/AppDynamics require application instrumentation (OneAgent, SDK). Armis observes network traffic but does not produce CMDB-native confidence-scored service dependency maps. Pathfinder's approach — kernel-level behavioral observation producing CMDB CIs with dynamic confidence scores and no pattern maintenance — is novel. The encrypted environment capability (observing below the TLS layer) is a specific differentiator vs. all agentless approaches.

---

## Filing Timeline

| Claim | Priority | Target Filing Date | Rationale |
|-------|---------|-------------------|-----------|
| 1 — Clinical Operations Graph | **Highest** | Before May 2026 | Unique cross-platform innovation. No prior art. |
| 2 — Clinical Incident Escalation | **Highest** | Before May 2026 | Multi-source RACI is novel. |
| 4 — Discovery-Agnostic Platform | **High** | Before June 2026 | Architectural innovation. File before Armis close. |
| 3 — Behavioral Device Classification | **High** | Before June 2026 | eBPF + medical device is unique combination. |
| 5 — Behavioral Confidence Scoring | **Medium** | Before July 2026 | Strengthens existing provisional. Update before Armis close. |

---

*Avennorth Patent Claims — Clinical Extension — Confidential*
*Prepared for provisional patent filings — March 2026*
