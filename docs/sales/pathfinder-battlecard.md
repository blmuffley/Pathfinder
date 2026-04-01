# Pathfinder vs. Competition -- Internal Sales Battlecard

**INTERNAL ONLY -- NOT FOR DISTRIBUTION TO CUSTOMERS OR PARTNERS**

---

## Our Positioning

Pathfinder is the only CMDB-first discovery platform that observes real network behavior at the kernel level, classifies it with AI, and syncs it natively into ServiceNow -- without replacing existing tools. We complete your discovery stack; we don't compete with it.

---

## Why We Win

1. **eBPF depth** -- Kernel-level observation sees connections that network taps, port scans, and agentless tools miss entirely: localhost traffic, container-to-container, encrypted east-west flows.
2. **Discovery-agnostic** -- We consume data from Armis, ServiceNow Discovery, Claroty, or any source. Customers never have to rip and replace. We make their existing tools more valuable.
3. **CMDB-native** -- We extend `cmdb_ci` directly. No connectors, no middleware, no sync jobs. Our data is ServiceNow data.
4. **Clinical intelligence layers** -- Meridian (workforce correlation), Ledger (compliance automation), and Vantage Clinical (incident response) are structurally impossible for security-focused competitors to replicate.
5. **Price** -- 30-70% cheaper per device than Claroty, Cynerio, and Ordr. $50K starting price lands below procurement thresholds.

---

## Competitive Matrix

| Capability | Pathfinder | Armis (post-SN) | Claroty/Medigate | Cynerio | SN Service Mapping |
|-----------|-----------|-----------------|-----------------|---------|-------------------|
| eBPF kernel-level discovery | **Yes** | No | No | No | No |
| Encrypted traffic visibility | **Yes** | No | No | No | No |
| Discovery-agnostic | **Yes** | N/A | No | No | No |
| CMDB-native (extends cmdb_ci) | **Yes** | Post-acquisition | Connector | Connector | Yes |
| Behavioral confidence scoring | **Yes** | No | No | Partial | No |
| Autonomous CMDB ops (8 AI agents) | **Yes** | No | No | No | No |
| Integration/Interface CI types | **Yes** | No | No | No | No |
| AI health scoring & summarization | **Yes** | No | No | No | No |
| UKG workforce correlation | **Yes (Meridian)** | No | No | No | No |
| Compliance automation (JC/CMS) | **Yes (Ledger)** | No | Basic | Partial | No |
| Clinical incident response | **Yes (Vantage)** | No | Basic alerts | Basic alerts | No |
| Per-device cost (medical) | **$8-25/mo** | Included in ITOM | $40-70/mo | $25-50/mo | N/A |

---

## Against Armis

**When the customer says: "We already have Armis."**

Key message: **"We complete Armis. We don't compete with it."**

1. **Armis discovers devices. Pathfinder discovers integrations.** Armis tells you what's on the network. Pathfinder tells you how those things talk to each other, at what frequency, with what confidence, and whether the CMDB reflects reality. These are different problems.
2. **Pathfinder consumes Armis data.** Our discovery-agnostic normalization layer ingests Armis device inventory and enriches it with behavioral intelligence. Running both together is strictly better than running either alone.
3. **Armis is security-first. Pathfinder is operations-first.** Armis protects the network perimeter. Pathfinder feeds CMDB accuracy, change management, and service mapping. Different buyers, different budgets, different outcomes.
4. **Pathfinder adds intelligence layers Armis doesn't have.** UKG workforce correlation, compliance automation, autonomous CMDB remediation -- none of this is on the Armis roadmap because it's outside their security-focused mission.
5. **ServiceNow acquired Armis for device security, not CMDB operations.** The $7.75B acquisition is about OT/IoT security posture management. ServiceNow still needs a solution for integration discovery and CMDB intelligence. That's us.

---

## Against Claroty/Medigate

**When the customer says: "We use Claroty for medical devices."**

Key message: **"Claroty is a security tool. Pathfinder is an operations intelligence platform."**

1. **Claroty protects devices. Pathfinder governs the CMDB.** Claroty's output is security alerts. Pathfinder's output is accurate, continuously-maintained CIs in ServiceNow with health scores, AI summaries, and compliance evidence.
2. **Pathfinder ingests Claroty data.** We don't replace Claroty -- we make their data operational by normalizing it into the CMDB alongside Pathfinder's own behavioral observations. Customers get Claroty's passive monitoring plus Pathfinder's kernel-level depth.
3. **Claroty can't do workforce correlation.** Meridian maps devices to certified clinicians via UKG integration. Claroty doesn't know who uses a device, who's qualified, or who's on shift. This is critical for maintenance planning and incident response.
4. **Pathfinder is 30-70% cheaper.** Claroty charges $40-70/device/month for medical devices. Pathfinder Clinical is $8-25/device/month with deeper intelligence layers included.

---

## Against ServiceNow Service Mapping

**When the customer says: "ServiceNow Service Mapping already does this."**

Key message: **"30 days vs. 12 months. Behavioral observation vs. pattern libraries."**

1. **Service Mapping requires patterns.** Every application connection must have a pre-built pattern or custom discovery. Pathfinder discovers connections automatically by observing actual network behavior -- no pattern library, no configuration per application.
2. **Time to value: 30 days vs. 6-12 months.** Service Mapping implementations take 6-12 months and heavy consulting. Pathfinder agents deploy in days, with full coverage in 30 days.
3. **Service Mapping misses undocumented integrations.** If an integration isn't in the pattern library, Service Mapping won't find it. Pathfinder discovers every connection that produces network traffic, including shadow integrations that nobody documented.
4. **Pathfinder + Contour replaces ITOM Visibility + Service Mapping at 85-90% lower cost.** The $70K bundle provides behavioral discovery plus service mapping at a fraction of ITOM licensing costs.

---

## Against Cynerio

**When the customer says: "We're evaluating Cynerio."**

Key message: **"40% cheaper with deeper intelligence."**

1. **Pathfinder Clinical is $8-25/device/month vs. Cynerio's $25-50.** For a 1,000-device health system, that's $166K-370K/year vs. $300K-600K/year.
2. **Cynerio doesn't have workforce correlation, compliance automation, or clinical incident response.** Pathfinder's intelligence layers (Meridian, Ledger, Vantage Clinical) provide operational capabilities that Cynerio's security-focused platform can't match.
3. **Cynerio data stays in Cynerio.** Pathfinder data is native ServiceNow. No connectors, no data silos, no second dashboard for clinicians to check.

---

## Objection Handling -- Quick Reference

| Objection | Response |
|-----------|----------|
| "Too expensive" | Calculate ROI: 80% reduction in CMDB maintenance FTEs + faster MTTR + compliance savings. Typical payback is 2-3 months. The $50K starting price is below most procurement thresholds. |
| "We already have Discovery" | Pathfinder complements Discovery -- it finds the integrations and behavioral patterns that agent-based CI scanning never captures. Different data, same CMDB. |
| "Kernel-level agent is a security risk" | The agent uses CAP_BPF only -- read-only kernel access. No packet capture, no data exfiltration capability. It observes connection metadata (source, dest, port, protocol), not payloads. Same technology used by Netflix, Google, and Meta in production. |
| "We're standardizing on ServiceNow native" | Pathfinder IS native -- it's a scoped app that extends cmdb_ci, uses Polaris workspace, and integrates with Flow Designer. It's more native than any third-party connector. |
| "Implementation takes too long" | Agent deployment: 1-2 days. Full environment coverage: 30 days. No application changes, no network reconfiguration. Compare to 6-12 months for Service Mapping. |
| "We need to fix ITSM before ITOM" | Pathfinder fixes the data that makes ITSM work. Incident routing, change impact, service ownership -- all depend on CMDB accuracy. Fix the data first, ITSM follows. |
| "Budget is frozen" | Start with a free Bearing assessment. Costs nothing. When budget opens, you'll have a complete business case with real data from your environment. |
| "Our SI can build this" | Building kernel-level eBPF agents, a classification engine, 8 AI agents, and a ServiceNow scoped app is 3+ years of engineering. Pathfinder is ready now for $50K. Ask the SI to quote equivalent custom development. |
| "We've been burned by SN integrations" | Pathfinder isn't an integration -- it's a native scoped app. No middleware, no ETL, no sync jobs to break. Data lives in ServiceNow tables. |
| "Clinical engineering won't cooperate" | Pathfinder is passive -- no disruption to clinical devices. eBPF observation is invisible to endpoint operations. Clinical engineering benefits from accurate device inventory without doing any work. |

---

## Pricing Quick Reference

### Platform Tiers

| Tier | Nodes | Standard | Professional | + Contour Bundle |
|------|-------|----------|-------------|-----------------|
| S | Up to 500 | $50K | $100K | $70K (Std+Contour) |
| M | 501-2,000 | $90K | $175K | $140K |
| L | 2,001-5,000 | $150K | $250K | $210K |
| XL | 5,001+ | $200K+ | Custom | Custom |

### Clinical Device Tiers

| Tier | Category | Per Device/Mo |
|------|----------|--------------|
| 2 | IoT / OT | $8-14 |
| 3 | Clinical / Medical | $8-15 |
| 4 | Life-Critical | $15-25 |

### Intelligence Modules (Per Facility/Month)

| Module | Range |
|--------|-------|
| Meridian (Workforce) | $10-20K |
| Ledger (Compliance) | $5-10K |
| Vantage Clinical | $3-8K |

---

## Ideal Customer Profile

### Target

- **Healthcare organizations** with 500+ managed servers and clinical devices on ServiceNow
- **Enterprise customers** with complex integration landscapes and CMDB accuracy challenges
- **Organizations mid-ServiceNow-implementation** -- partner deploys Pathfinder alongside ITSM/ITOM rollout
- **Companies with upcoming audits or compliance requirements** (Joint Commission, CMS, SOX)
- **Customers already running Armis** who need operational intelligence on top of device security

### Avoid

- Organizations with fewer than 200 managed servers (below S-tier threshold)
- Companies not on ServiceNow (our value depends on CMDB-native integration)
- Prospects looking purely for network security (position them toward Armis/Claroty)
- Organizations with no CMDB investment or plans to build one

---

## Discovery Questions

Use these to qualify the opportunity and build urgency:

1. **How many integrations between your applications are documented in the CMDB today?** (Expected answer: very few. This reveals the gap.)
2. **When was the last time your service map was fully accurate?** (Expected answer: never, or "right after the last audit.")
3. **How many FTEs maintain your CMDB?** (Multiply by salary to quantify manual cost.)
4. **What happens when an undocumented integration breaks during a change window?** (Surface incident cost and MTTR impact.)
5. **Do you have Joint Commission or CMS surveys coming up?** (Healthcare urgency driver.)
6. **How long did your last Service Mapping implementation take?** (Compare to 30 days.)
7. **Are you running Armis, Claroty, or any device discovery tool today?** (Position as complement.)
8. **How do you track which clinicians are certified on which medical devices?** (Open the Meridian conversation.)
9. **What's your agent coverage today -- what percentage of servers have discovery agents?** (Identify coverage gaps.)
10. **If I could show you every undocumented integration in your environment in 30 days, what would that be worth?** (Anchor to value, not cost.)

---

*Last updated: March 2026 | Avennorth Confidential -- Internal Use Only*
