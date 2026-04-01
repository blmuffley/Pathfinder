# Pathfinder ROI Calculator

A guided framework for building a customer-specific business case. Walk through this with the prospect to quantify the cost of their current state and the value Pathfinder delivers.

---

## 1. Current State Assessment

Complete this section with the prospect during discovery or a Bearing assessment debrief.

### Environment Profile

| Question | Customer Value | Notes |
|----------|---------------|-------|
| Total managed servers / compute instances | _______ | Physical + VM + cloud instances |
| Total network devices (routers, switches, LBs) | _______ | Discovered free -- not counted as nodes |
| Total clinical / IoT devices (if healthcare) | _______ | Tier 2, 3, 4 breakdown if possible |
| Number of applications in the portfolio | _______ | From CMDB or application portfolio tool |
| Number of integrations documented in CMDB | _______ | Typically 10-40% of actual |
| Number of facilities / locations | _______ | Relevant for intelligence module pricing |

### Staffing & Cost

| Question | Customer Value | Notes |
|----------|---------------|-------|
| FTEs dedicated to CMDB maintenance | _______ | Include partial FTEs (e.g., 0.5 FTE) |
| Average fully loaded salary of CMDB analyst | _______ | Default assumption: $120,000/yr |
| FTEs dedicated to integration documentation | _______ | Often spread across app teams |
| Hours per month spent on manual CMDB updates | _______ | Sum across all contributors |

### Incident & Risk

| Question | Customer Value | Notes |
|----------|---------------|-------|
| Integration-related incidents per year | _______ | Incidents caused by unknown/undocumented integrations |
| Average MTTR for integration incidents (hours) | _______ | Industry average: 4-8 hours |
| Fully loaded cost per hour of incident response | _______ | Default assumption: $200/hr |
| Major outages in last 12 months caused by unknown dependencies | _______ | Each major outage = $100K-500K+ |
| Failed changes due to unknown integration impact | _______ | Change failure rate tied to CMDB accuracy |

### Compliance (Healthcare)

| Question | Customer Value | Notes |
|----------|---------------|-------|
| Joint Commission survey frequency | _______ | Typically every 3 years |
| Hours spent on survey prep (device inventory) | _______ | Often 500-2,000 hours |
| CMS audit prep hours per year | _______ | Ongoing regulatory burden |
| Cost of compliance consultant support | _______ | External audit prep fees |
| Findings from last survey related to device/integration inventory | _______ | Each finding = remediation cost + risk |

---

## 2. Cost of Doing Nothing

Calculate the annual cost of the current state using the values collected above.

### Manual CMDB Maintenance

| Cost Component | Calculation | Annual Cost |
|---------------|-------------|------------|
| CMDB analyst labor | FTEs x Avg salary | $_______ |
| Integration documentation labor | FTEs x Avg salary | $_______ |
| Ad-hoc CMDB cleanup projects | Estimate (often $50-100K/yr) | $_______ |
| **Subtotal: Manual Maintenance** | | **$_______** |

### Incident & Downtime Cost

| Cost Component | Calculation | Annual Cost |
|---------------|-------------|------------|
| Integration incident response | Incidents/yr x MTTR hours x $/hour | $_______ |
| Major outage cost | Outages x avg cost per outage | $_______ |
| Failed change remediation | Failed changes x avg remediation cost | $_______ |
| Revenue impact from downtime | Estimated revenue loss per outage hour | $_______ |
| **Subtotal: Incident Cost** | | **$_______** |

### Compliance & Audit Cost

| Cost Component | Calculation | Annual Cost |
|---------------|-------------|------------|
| Survey prep labor (annualized) | Hours / survey frequency x hourly rate | $_______ |
| CMS audit prep | Hours x hourly rate | $_______ |
| External consultant fees | Actual spend | $_______ |
| Finding remediation cost | Findings x remediation cost per finding | $_______ |
| **Subtotal: Compliance Cost** | | **$_______** |

### Shadow IT & Risk Exposure

| Cost Component | Calculation | Annual Cost |
|---------------|-------------|------------|
| Unmanaged device risk | Estimated unmanaged devices x risk factor ($500-2,000/device) | $_______ |
| Undocumented integration risk | Estimated undocumented integrations x risk factor ($1,000-5,000 each) | $_______ |
| **Subtotal: Risk Exposure** | | **$_______** |

### Total Annual Cost of Status Quo

| Category | Annual Cost |
|----------|------------|
| Manual Maintenance | $_______ |
| Incident & Downtime | $_______ |
| Compliance & Audit | $_______ |
| Risk Exposure | $_______ |
| **Total Cost of Doing Nothing** | **$_______** |

---

## 3. Pathfinder Investment

Calculate the Pathfinder investment based on the customer's environment size and needs.

### Platform Fee

| Component | Tier | Annual Cost |
|-----------|------|------------|
| Pathfinder + Contour bundle | S / M / L / XL | $_______ |
| Package upgrade (Standard to Professional) | If applicable | $_______ |

### Device Tier Add-Ons (Healthcare)

| Tier | Device Count | Per Device/Mo | Annual Cost |
|------|-------------|--------------|------------|
| Tier 2 (IoT/OT) | _______ | $8-14 | $_______ |
| Tier 3 (Clinical) | _______ | $8-15 | $_______ |
| Tier 4 (Life-Critical) | _______ | $15-25 | $_______ |

### Intelligence Modules

| Module | Facilities | Per Facility/Mo | Annual Cost |
|--------|-----------|----------------|------------|
| Meridian | _______ | $10-20K | $_______ |
| Ledger | _______ | $5-10K | $_______ |
| Vantage Clinical | _______ | $3-8K | $_______ |

### Implementation Services

| Component | Hours | Rate | Cost |
|-----------|-------|------|------|
| Partner implementation | 40-80 hrs | Partner rate | $_______ |
| Avennorth onboarding support | Included | -- | $0 |

### Total Year 1 Investment

| Category | Cost |
|----------|------|
| Platform fee | $_______ |
| Device add-ons | $_______ |
| Intelligence modules | $_______ |
| Implementation services | $_______ |
| **Total Year 1** | **$_______** |

---

## 4. Value Delivered

Quantify the value Pathfinder delivers against the cost of status quo.

### Cost Savings

| Value Driver | Calculation | Annual Value |
|-------------|-------------|-------------|
| Manual CMDB maintenance reduction (80%+) | Maintenance subtotal x 0.80 | $_______ |
| Integration documentation elimination | Documentation labor x 0.90 | $_______ |
| CMDB cleanup project avoidance | Cleanup budget x 0.70 | $_______ |
| **Subtotal: Cost Savings** | | **$_______** |

### Risk Reduction

| Value Driver | Calculation | Annual Value |
|-------------|-------------|-------------|
| Faster MTTR (50% reduction) | Incident cost subtotal x 0.50 | $_______ |
| Fewer integration outages (60% reduction) | Outage cost x 0.60 | $_______ |
| Higher change success rate | Failed change cost x 0.50 | $_______ |
| **Subtotal: Risk Reduction** | | **$_______** |

### Compliance Value (Healthcare)

| Value Driver | Calculation | Annual Value |
|-------------|-------------|-------------|
| Survey prep time reduction (70%) | Compliance labor x 0.70 | $_______ |
| Automated compliance evidence (Ledger) | Consultant fee reduction | $_______ |
| Reduced finding risk | Finding remediation x 0.80 | $_______ |
| **Subtotal: Compliance Value** | | **$_______** |

### Strategic Value

| Value Driver | Estimate | Annual Value |
|-------------|----------|-------------|
| Complete integration visibility | Improved decision-making (hard to quantify) | $_______ |
| Service map accuracy | Better change planning | $_______ |
| Real-time CMDB confidence | Reduced audit exposure | $_______ |
| **Subtotal: Strategic Value** | | **$_______** |

---

## 5. ROI Summary

| Metric | Value |
|--------|-------|
| **Total annual value delivered** | $_______ |
| **Total Year 1 investment** | $_______ |
| **Net value (Year 1)** | $_______ |
| **ROI** | (Value - Investment) / Investment = **_______%** |
| **Payback period** | Investment / (Value / 12) = **_______ months** |

### 3-Year View

| Year | Investment | Value | Cumulative Net |
|------|-----------|-------|---------------|
| Year 1 | $_______ | $_______ | $_______ |
| Year 2 | $_______ (renewal) | $_______ | $_______ |
| Year 3 | $_______ (renewal) | $_______ | $_______ |
| **3-Year Total** | **$_______** | **$_______** | **$_______** |

---

## 6. Example: Mercy Health System

A mid-size health system with 5 facilities, 3,500 servers, and 1,200 clinical devices.

### Current State Costs

| Category | Annual Cost |
|----------|------------|
| CMDB maintenance (3 FTEs x $120K) | $360,000 |
| Integration documentation (1.5 FTEs x $120K) | $180,000 |
| Ad-hoc cleanup projects | $75,000 |
| Integration incidents (48/yr x 6 hrs x $200/hr) | $57,600 |
| Major outages (2/yr x $250K) | $500,000 |
| Failed change remediation (24/yr x $15K) | $360,000 |
| Joint Commission prep (1,500 hrs / 3 yrs x $150/hr) | $75,000 |
| CMS audit prep (400 hrs x $150/hr) | $60,000 |
| External compliance consultants | $200,000 |
| Unmanaged device risk (800 devices x $1,000) | $800,000 |
| **Total Cost of Status Quo** | **$2,667,600** |

### Pathfinder Investment

| Component | Annual Cost |
|-----------|------------|
| Pathfinder + Contour Professional (L-tier) | $250,000 |
| Clinical devices (1,000 Tier 3 x $10/mo + 200 Tier 4 x $18/mo) | $163,200 |
| Ledger (5 facilities x $7K/mo) | $420,000 |
| Partner implementation (80 hrs x $250/hr) | $20,000 (Year 1 only) |
| **Total Year 1 Investment** | **$853,200** |
| **Total Year 2+ Investment** | **$833,200** |

### Value Delivered

| Value Driver | Annual Value |
|-------------|-------------|
| CMDB maintenance reduction (80%) | $288,000 |
| Integration documentation elimination (90%) | $162,000 |
| Cleanup project avoidance | $52,500 |
| MTTR reduction (50%) | $28,800 |
| Outage reduction (60%) | $300,000 |
| Change success improvement (50%) | $180,000 |
| Survey prep reduction (70%) | $52,500 |
| Compliance consultant reduction | $140,000 |
| Finding risk reduction (80%) | -- |
| Complete integration visibility | $200,000 (est.) |
| Unmanaged device risk reduction | $640,000 |
| **Total Annual Value** | **$2,043,800** |

### ROI

| Metric | Value |
|--------|-------|
| **Year 1 ROI** | ($2,043,800 - $853,200) / $853,200 = **140%** |
| **Year 2+ ROI** | ($2,043,800 - $833,200) / $833,200 = **145%** |
| **Payback period** | $853,200 / ($2,043,800 / 12) = **5 months** |
| **3-Year net value** | ($2,043,800 x 3) - ($853,200 + $833,200 + $833,200) = **$3,612,000** |

---

## 7. Presenting the Business Case

### Tips for the ROI Conversation

1. **Let the customer fill in the numbers.** Their data is more credible than your assumptions. Use the defaults only as guides.
2. **Start with the cost of doing nothing.** Anchor on the pain before introducing the solution cost. If the status quo costs $2.6M/yr, $500K for Pathfinder feels small.
3. **Focus on 2-3 value drivers that resonate most.** For healthcare: compliance + MTTR. For enterprise: CMDB maintenance + change success. Don't try to sell every line item.
4. **Use the Bearing assessment to validate.** Offer a free Bearing assessment to generate real discovery data from their environment. "Let's stop guessing -- I'll show you exactly what we find in 30 days."
5. **Build the 3-year view.** Pathfinder's value compounds as more integrations are discovered and AI agents improve over time. Year 3 value exceeds Year 1 because the CMDB continuously improves.

---

*Pathfinder ROI Calculator v1.0 -- Avennorth Confidential*
*For sales use only. Adapt all figures to customer-specific data.*
