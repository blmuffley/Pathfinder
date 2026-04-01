# Pathfinder Clinical — Competitive Analysis

## 1. Market Landscape Post-Armis Acquisition

ServiceNow's $7.75B acquisition of Armis (closing H2 2026) reshapes the competitive landscape. Armis becomes ServiceNow's native device discovery and security platform. This eliminates Armis as an independent competitor but creates a new dynamic: Pathfinder must complement Armis/ServiceNow, not compete.

---

## 2. Competitor Overview

| Vendor | Founded | Funding / Exit | Focus | Device Count | Key Customers |
|--------|---------|---------------|-------|-------------|---------------|
| **Armis** (now SN) | 2015 | $7.75B (SN acq.) | Agentless device security | 3B+ devices tracked | Fortune 100 enterprises |
| **Claroty / Medigate** | 2015/2017 | $400M+ (Medigate acq. by Claroty) | OT/IoT/medical device security | Healthcare + industrial | Top 20 health systems |
| **Cynerio** | 2017 | $90M raised | Healthcare IoT security | Healthcare-specific | 500+ hospitals |
| **Ordr** | 2015 | $90M raised | AI device classification | Cross-vertical | Large enterprises |
| **Asimily** | 2017 | $50M raised | Medical device risk | Healthcare-specific | 1,000+ hospitals |
| **Pathfinder Clinical** | 2026 | Bootstrapped | Clinical operations intelligence | Discovery-agnostic | Target: SN customers |

---

## 3. Feature Comparison Matrix

### 3.1 Discovery Capabilities

| Capability | Armis (SN) | Claroty | Cynerio | Ordr | Asimily | Pathfinder Clinical |
|-----------|-----------|---------|---------|------|---------|-------------------|
| Agentless discovery | Yes | Yes | Yes | Yes | Yes | Via Armis/SN data |
| eBPF behavioral observation | No | No | No | No | No | **Yes (unique)** |
| Encrypted traffic visibility | No | No | No | No | No | **Yes (kernel-level)** |
| Pattern-free classification | No | Partial | Partial | Partial | Partial | **Yes** |
| CMDB-native CI creation | Post-acq (SN) | Connector | Connector | Connector | Connector | **Native (extends cmdb_ci)** |
| Discovery-agnostic | N/A | No | No | No | No | **Yes** |

### 3.2 Clinical Intelligence

| Capability | Armis (SN) | Claroty | Cynerio | Ordr | Asimily | Pathfinder Clinical |
|-----------|-----------|---------|---------|------|---------|-------------------|
| Medical device classification | Yes | Yes (Medigate) | Yes | Partial | Yes | **Yes + FDA/UDI** |
| Healthcare protocol parsing | Basic | Yes | Yes | Basic | Yes | **Yes (HL7/FHIR/DICOM/11073)** |
| UKG workforce correlation | **No** | **No** | **No** | **No** | **No** | **Yes (Meridian)** |
| Schedule-aware impact analysis | **No** | **No** | **No** | **No** | **No** | **Yes (Meridian)** |
| Compliance automation (JC/CMS/FDA) | **No** | Basic | Partial | **No** | Partial | **Yes (Ledger)** |
| Clinical incident response | **No** | Basic alerts | Basic alerts | **No** | Risk alerts | **Yes (Vantage Clinical)** |
| Patient safety scoring | **No** | **No** | **No** | **No** | **No** | **Yes (0-100 PSIS)** |
| FDA MAUDE behavioral matching | **No** | **No** | **No** | **No** | Partial (static) | **Yes (behavioral)** |
| Service dependency mapping | Post-acq (SN SM) | **No** | **No** | **No** | **No** | **Yes (Contour)** |
| Confidence scoring (dynamic) | **No** | **No** | **No** | Partial | **No** | **Yes (multi-source)** |

### 3.3 Operational Intelligence

| Capability | Armis (SN) | Claroty | Cynerio | Ordr | Asimily | Pathfinder Clinical |
|-----------|-----------|---------|---------|------|---------|-------------------|
| Device-to-clinician mapping | **No** | **No** | **No** | **No** | **No** | **Yes** |
| Maintenance window optimization | **No** | **No** | **No** | **No** | **No** | **Yes** |
| Backup device identification | **No** | **No** | **No** | **No** | **No** | **Yes (+ staff)** |
| Cross-platform search | Limited | Limited | Limited | Limited | Limited | **Full (device+staff+schedule)** |
| Clinical operations dashboard | **No** | Basic | Basic | **No** | Basic | **Full Polaris workspace** |
| Automated compliance evidence | **No** | Basic PDF | Partial | **No** | Partial | **Full (Ledger)** |

---

## 4. The "Structurally Impossible" Differentiators

These capabilities are structurally impossible for competitors to replicate:

### 4.1 UKG Workforce Correlation (Meridian)
**Why competitors can't do this:** ServiceNow does not own UKG data. Armis doesn't have workforce integrations. Claroty/Cynerio/Ordr are security tools — they don't know who is certified on which device or who is on shift. Building this requires a purpose-built UKG integration that none of these companies have incentive to create.

### 4.2 Discovery-Agnostic Intelligence
**Why competitors can't do this:** Every competitor's intelligence is tightly coupled to their own discovery engine. Claroty's clinical analytics only work on Claroty-discovered devices. Cynerio's dashboards only show Cynerio data. Pathfinder Clinical's normalization layer accepts data from ANY source — including competitors' data. A hospital running Armis + Pathfinder Clinical gets Armis's agentless discovery PLUS Pathfinder's clinical intelligence layers. This makes Pathfinder Clinical additive, not competitive.

### 4.3 eBPF Behavioral Depth (When Deployed)
**Why competitors can't do this:** All competitors use network-level passive monitoring or active scanning. None observe at the kernel level. eBPF sees connections that are invisible to network taps (localhost, container-to-container, encrypted east-west traffic). This produces higher-confidence classifications in environments where Pathfinder agents are deployed alongside Armis.

### 4.4 ServiceNow-Native Architecture
**Why competitors can't match this:** Pathfinder extends `cmdb_ci`, uses Polaris workspace, integrates with Flow Designer, and runs business rules natively. Competitors push data into ServiceNow via connectors/integrations that are always one step removed from native.

---

## 5. Pricing Comparison

### 5.1 Per-Device Pricing (Medical Devices)

| Vendor | Per-Device/Month | Platform Fee | Total (1,000 devices) |
|--------|-----------------|-------------|----------------------|
| Claroty/Medigate | $40-70 | None | $480K-840K/yr |
| Cynerio | $25-50 | $10-20K setup | $300K-600K/yr |
| Ordr | $20-40 | None | $240K-480K/yr |
| Asimily | $15-35 | None | $180K-420K/yr |
| **Pathfinder Clinical** | **$8-25** | **$70K (+ Contour)** | **$166K-370K/yr** |

### 5.2 Total Cost of Ownership (Large Health System, 5 Facilities)

| Component | Claroty | Cynerio | Pathfinder Clinical |
|-----------|---------|---------|-------------------|
| Device discovery (4,000 clinical + life-critical) | $2.4M/yr | $1.5M/yr | $700K/yr |
| Compliance automation | Not included | Partial ($200K add-on) | $420K/yr (Ledger) |
| Workforce correlation | Not available | Not available | $900K/yr (Meridian) |
| Clinical incident response | Not available | Not available | $300K/yr (Vantage Clinical) |
| Platform (base + service mapping) | Separate SN license | Separate SN license | $200K/yr (PF + Contour) |
| **Total** | **$2.4M/yr** | **$1.7M/yr** | **$2.5M/yr** |

**Pathfinder Clinical is price-competitive while providing 3 intelligence layers that competitors don't offer at any price.** Without Meridian/Ledger/Vantage Clinical, Pathfinder is 40-70% cheaper. With them, total ACV is comparable but the value delivered is significantly broader.

---

## 6. Positioning by Buyer

| Buyer | Competitor Pitch | Pathfinder Clinical Pitch |
|-------|-----------------|--------------------------|
| **CISO / Security** | "We find every device and assess vulnerabilities" (Armis, Claroty) | "We add clinical intelligence to your existing device security data. Armis finds the devices — we map them to your clinical operations." |
| **Clinical Engineering / Biomed** | "We inventory your medical devices" (Cynerio, Asimily) | "We connect your device inventory to your workforce scheduling. Know who's certified, who's on shift, and what the backup plan is — in real-time." |
| **Compliance / Risk** | "We help with device security compliance" (general) | "Ledger automates Joint Commission, CMS, and FDA evidence compilation. Survey prep in days, not months." |
| **CIO / VP IT** | "We reduce device risk" (all competitors) | "We create a unified clinical operations graph. Device status + staff availability + compliance posture + incident response — one platform, native in ServiceNow." |

---

## 7. Competitive Narrative

### Against Armis (post-SN acquisition)
> "Armis is now built into ServiceNow — great for device discovery and security. Pathfinder Clinical adds what Armis can't: clinical operations intelligence. We consume Armis data, enrich it with UKG workforce correlation, automate your Joint Commission compliance, and give you patient safety scoring for device incidents. We don't replace Armis — we complete it."

### Against Claroty/Medigate
> "Claroty is a security tool. They find devices and assess vulnerabilities. Pathfinder Clinical is an operations intelligence platform. We tell you which staff are certified on which devices, optimize your maintenance windows around your clinical schedule, and automate your compliance evidence. Different problem, different buyer, compatible deployment."

### Against Cynerio
> "Cynerio focuses on healthcare IoT security. Pathfinder Clinical focuses on healthcare operations intelligence. When a device goes down in your ICU, Cynerio tells you it's offline. Pathfinder Clinical tells you which patients are affected, which backup is available, who's certified to operate it, and whether they're on shift. That's the difference between a security alert and a clinical response plan."

---

## 8. Win/Loss Scenarios

| Scenario | Outcome | Why |
|----------|---------|-----|
| Customer has Armis (SN native) | **Win** — layer on top | Discovery-agnostic. Meridian/Ledger/Vantage Clinical are additive. |
| Customer evaluating Claroty | **Win** — different buyer | Position to CISO: keep Claroty for security. Position to Biomed: add Pathfinder for operations. |
| Customer evaluating Cynerio | **Compete** — overlapping healthcare focus | Win on price ($8-25 vs $25-50/device) + intelligence breadth (UKG, compliance, incident response). |
| Customer wants single-vendor | **Challenge** — Armis covers more out of box | Win on intelligence depth. Lose if customer prioritizes vendor consolidation over capability. |
| Customer is a ServiceNow shop | **Strong win** — native architecture | Only solution that extends cmdb_ci natively, uses Polaris workspace, integrates with Flow Designer. |

---

*Pathfinder Clinical Competitive Analysis — v1.0*
*Avennorth Confidential — March 2026*
