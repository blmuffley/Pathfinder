# Pathfinder Executive Demo Script — 10-Minute Brief

**Duration:** 10 minutes + Q&A
**Audience:** CIO, VP of IT, CMIO, CFO, C-suite
**Demo environment:** http://localhost:4200 (Mercy Health System prototype data)
**Last updated:** 2026-03-31

---

## Pre-Demo Setup

### Checklist

- [ ] Prototype running at http://localhost:4200 — verify all pages load
- [ ] Browser: Chrome or Edge, fullscreen (F11), zoom 100%
- [ ] Starting page: PATHFINDER > Overview > Overview subtab
- [ ] Second monitor or printed copy of this script visible to presenter only
- [ ] One-pager PDF and Bearing assessment link ready to share at close
- [ ] Sidebar fully expanded so audience can see the navigation structure

### Know Your Audience

| Role | What they care about | Speak to |
|------|---------------------|----------|
| CIO | Risk reduction, board-reportable metrics, speed to value | Confidence scores, time-to-deploy, ServiceNow alignment |
| VP of IT / Infrastructure | Operational burden, tool sprawl, staffing | Automation, works-with-existing-tools, no manual effort |
| CMIO | Clinical safety, device visibility, regulatory readiness | Tier 4 devices, FDA mapping, PSIS patient impact |
| CFO | Cost, ROI, replace-vs-add | $50K vs $500K manual effort, no rip-and-replace |

---

## Opening — 1 minute

> **[Stay on Overview > Overview. Don't touch the mouse yet.]**

- Introduce yourself and Avennorth — one sentence: "We build AI-powered CMDB and integration intelligence for healthcare, built natively on ServiceNow."
- Set the hook:

> "What if your CMDB was automatically accurate, your integrations were health-scored by AI, and your medical devices were continuously monitored — in 30 days, not 12 months?"

- Frame the demo: "I'm going to show you what this looks like in practice, using real data modeled on a health system like yours — Mercy Health, 3 facilities, 500-bed main campus."
- Set expectations: "This will take about 10 minutes. I'll leave time for questions."

---

## Act 1: The Problem — 2 minutes

> **[Overview > Overview subtab — the KPI tiles are visible]**

- Point to the headline numbers on screen
  - 6,425 devices discovered
  - 87% average confidence score
  - 3 facilities monitored

> "Before Pathfinder, Mercy Health had 1,200 manually entered CIs in their CMDB. Twelve hundred. For a 3-facility health system with thousands of devices. That means roughly 80% of their infrastructure was invisible."

> "Now look at this: 6,425 auto-discovered, each with a confidence score. Not a one-time scan — this is continuous."

> **[Click to Overview > Discovery subtab — show the CMDB Impact / Before-After view]**

- Point to the before/after comparison
  - Before: sparse, manually entered, stale within weeks
  - After: comprehensive, continuously updated, confidence-scored

> "Here's the fundamental problem: a manually maintained CMDB is stale the moment someone finishes updating it. New servers spin up, integrations change, devices move. Pathfinder makes the CMDB a living, accurate system — automatically."

- Pause. Let that land.

---

## Act 2: Discovery in Action — 2 minutes

> **[Overview > Discovery subtab — the discovery pipeline visualization]**

- Walk the pipeline left to right
  - 14.8M network flows captured
  - Reduced to 6,425 unique endpoints
  - Resolved to 5,890 CMDB CIs

> "This is the discovery pipeline. Our agents sit at the kernel level — eBPF on Linux, ETW on Windows — and observe every network connection. 14.8 million flows, distilled down to 6,425 real endpoints, then matched and written into your CMDB as proper CIs."

> "This runs 24/7. No manual effort. No pattern libraries to maintain. No scan windows."

> **[Point to discovery sources section — show Pathfinder eBPF and Armis logos/labels]**

> "Notice we're showing two discovery sources here: Pathfinder's own agents and Armis. We don't ask you to rip out your existing tools. If you have Armis, ServiceNow Discovery, Qualys, Nessus — great. We consume that data and make it better. We fill in what they miss, and we add the integration and behavioral intelligence they can't."

- If audience has Armis or similar: "You've already invested in device visibility. We make that investment work harder by correlating it with network behavior and CMDB context."

---

## Act 3: Intelligence That Matters — 2 minutes

> **[Click Overview > Integration subtab]**

- Find the SendGrid integration card — score of 34, flagged critical

> "This is where it gets interesting. See this integration — SendGrid, patient notification emails. Health score: 34 out of 100. AI flagged this 35 minutes ago."

- Point to the detail: error rate at 4.8%, approaching failure threshold

> "Error rate climbing to 4.8%, response times degrading. Before Pathfinder, this becomes a P1 incident when patients stop getting appointment reminders and the help desk lights up. With Pathfinder, your team knew 35 minutes ago."

> **[Click Overview > Insights subtab]**

- Scroll the AI insight feed slowly — let the audience read a few entries
  - Anomaly detections
  - Compliance findings
  - Certificate expiration warnings
  - Duplicate CI candidates

> "This is the insight feed. Six different AI engines running continuously: anomaly detection, compliance analysis, integration health, duplicate detection, coverage gap identification, and change impact prediction."

> "These aren't dashboards you have to remember to check. This is intelligence that finds you — pushed into ServiceNow workflows, triggering assignments, opening incidents before users notice."

---

## Act 4: Clinical Operations — 2 minutes

> **[Click "Clinical Devices" in sidebar under CLINICAL EXTENSION]**

- Let the device inventory load — the visual impact of the full device list matters
- Point to the Tier classification column, especially Tier 4 (life-critical)

> "Every medical device in the environment — classified by clinical risk tier. Tier 4 here: ventilators, anesthesia machines, infusion pumps. Each one mapped to FDA product codes, calibration schedules tracked, network connectivity verified."

> "This happens automatically. No biomed tech manually entering serial numbers into a spreadsheet."

> **[Quick click to Ledger in sidebar — show compliance score]**

- Point to the 84% compliance score and Joint Commission readiness indicator

> "Your compliance posture — one screen. 84% today. Joint Commission survey readiness built in. The gaps are itemized with remediation steps."

> "Survey prep that used to take your biomed team 3 months now takes 3 clicks."

> **[Quick click to Vantage Clinical in sidebar — show the active incident with PSIS score]**

- Point to the active incident, the PSIS (Patient Safety Impact Score), and the response context

> "Here's where this saves lives. Active incident on a ventilator. Pathfinder calculated a Patient Safety Impact Score. It already knows which patients are on that device, which backup ventilators are available and where, and which certified biomed tech is on shift right now."

> "Seconds, not phone calls. That's the difference."

---

## Act 5: The Business Case — 1 minute

> **[Step back from the screen. No clicking. Eye contact with the audience.]**

- Pricing: "$50,000 a year to start. Scales with your environment."
- Speed: "Deployed in 2 weeks. Agents are lightweight — RPM install, DaemonSet for Kubernetes. You see value on day one."
- ROI: "Replaces $500K or more in annual manual CMDB maintenance effort. That's not a projection — that's what health systems spend on FTEs doing manual CI entry and reconciliation today."
- Platform fit: "This is native ServiceNow. Polaris workspace, extends cmdb_ci, Flow Designer integration. Your team already knows how to use it."
- No disruption: "No rip-and-replace. Pathfinder complements your existing Discovery, Armis, and monitoring investments. We make them all more valuable."

---

## Close — 30 seconds

> **[Return to Overview > Overview subtab so the KPI dashboard is visible as the backdrop]**

> "That's Pathfinder. Continuous discovery, AI-powered integration intelligence, and clinical device management — deployed in weeks, not months, on the platform you already own."

> "I'd like to leave you with two things."

- Hand off / share the one-pager
- Offer the Bearing assessment:

> "Let us run a free Bearing assessment on your CMDB. Takes about a week. We'll show you exactly what's missing, what's stale, and what you're exposed to — no commitment, no cost. That alone is worth the conversation."

> "Questions?"

---

## Talking Points for Q&A

| Question | Answer |
|----------|--------|
| **"How is this different from ServiceNow Discovery?"** | ServiceNow Discovery scans on a schedule using probes and sensors — it finds what's listening on known ports. Pathfinder observes actual network behavior at the kernel level, 24/7. We discover integrations and data flows that Discovery can't see, and we add AI health scoring on top. We don't replace Discovery — we make it dramatically more complete. |
| **"We just bought Armis. Why do we need this?"** | Armis is excellent for device identification and risk scoring. Pathfinder consumes Armis data as a discovery source — you'll see it right in the pipeline. What Armis doesn't do is manage your CMDB, score integration health, or give you clinical compliance posture. We make your Armis investment more valuable, not redundant. |
| **"What's the implementation timeline?"** | Two weeks for core deployment: agents installed, gateway connected, CMDB sync running. Four weeks for the full intelligence suite including clinical extensions. We follow a Crawl-Walk-Run-Fly methodology — you see value at each phase, and you control the pace. |
| **"How do you handle HIPAA / PHI?"** | Pathfinder never touches PHI. We observe network metadata — source, destination, port, protocol, timing, volume. We don't inspect packet payloads. All data stays in your environment: agents report to your gateway, which writes to your ServiceNow instance. Nothing leaves your network. The AI engines run on your infrastructure or in your cloud tenant. |
| **"What's the pricing?"** | Starting at $50K/year for a single-facility deployment. Scales based on the number of monitored endpoints and which intelligence modules you activate. Clinical extensions are an add-on. We're significantly less than what you're spending on manual CMDB maintenance today — typically 10x less. |
| **"Does this replace our biomed device inventory system?"** | It can, but it doesn't have to. Pathfinder provides a complete, continuously updated view of every networked medical device with FDA codes, calibration tracking, and clinical risk tiering. If you have an existing system like Nuvolo or AIMS, we can integrate with it. For many health systems, Pathfinder becomes the authoritative source because it's always current. |
| **"How does it work with our EHR (Epic/Cerner)?"** | Pathfinder discovers and monitors the integrations between your EHR and every other system — ADT feeds, HL7 interfaces, FHIR APIs, database connections. We don't integrate into the EHR itself; we monitor and health-score all the data flows around it. When an Epic integration starts degrading, Pathfinder flags it before clinicians notice. |
| **"What's the ROI?"** | Three buckets. First, labor savings: $300K-$500K/year in manual CMDB maintenance you no longer need. Second, incident prevention: catching integration failures before they become P1s saves $50K-$200K per avoided outage in a clinical environment. Third, compliance: reducing Joint Commission survey prep from months to days. Most customers see full ROI in the first 6 months. |
| **"What if we don't have ServiceNow?"** | Pathfinder is built for ServiceNow — it's where the value is strongest. If you're on a different ITSM platform, we can still deploy the discovery and intelligence engines, but you'd lose the native CMDB integration. That said, 80% of large health systems are on ServiceNow, and if you're planning a migration, Pathfinder gives you a reason to accelerate it. |
| **"How do you handle multi-cloud and hybrid environments?"** | Pathfinder agents run anywhere: bare metal, VMs, Kubernetes, AWS, Azure, GCP. The K8s agent is a DaemonSet that also pulls metadata from the Kubernetes API. All agents report to a single gateway, so you get a unified view regardless of where workloads run. |

---

## Demo Recovery Notes

| Issue | Recovery |
|-------|----------|
| Prototype won't load | Have screenshots of each key screen as backup. Talk through them: "Let me show you what this looks like in the production environment." |
| A specific page is slow | Skip it, keep talking. "In the interest of time, let me describe what you'd see here and move to the next view." |
| Audience asks to see something not in the prototype | "Great question — that capability is in the product but not in this demo environment. Let me describe it and we can show it in a deep-dive session." |
| Audience wants to go deep on technical architecture | "I'd love to get into that. Let's schedule a technical deep-dive with our engineering team — today I want to make sure you see the business value first." |
| Time is cut short | Jump straight to Act 4 (Clinical) and Act 5 (Business Case). Clinical impact and pricing are the two things executives remember. |
