# 08 — Pricing & Licensing Framework

## 1. Purpose

This document defines the complete pricing architecture for Pathfinder as a modular platform with land-and-expand economics. Designed for the post-Armis ServiceNow landscape.

---

## 2. Pricing Philosophy

**The Wedge → The Land → The Expand → The Platform**

| Stage | Product | Price Point | Purpose |
|-------|---------|------------|---------|
| **Wedge** | Bearing assessment | Free / low-cost | Reveal the problem. Get in the door. |
| **Land** | Pathfinder + Contour Bundle | $70K/yr (S-tier) | Behavioral discovery + service mapping. Below procurement threshold. |
| **Expand** | Device tier add-ons | $8-25/device/mo | IoT, clinical, life-critical devices |
| **Platform** | Intelligence modules | $3-20K/facility/mo | Meridian, Ledger, Vantage Clinical |

The platform fee ($70K) is 7% of a fully expanded health system ACV ($3M). The intelligence layers are 93% of revenue.

---

## 3. Product Pricing

### 3.1 Pathfinder Base

| Tier | Managed Nodes | Annual (standalone) | Annual (+ Contour bundle, 30% off) |
|------|---------------|--------------------|------------------------------------|
| **S** | Up to 500 | $50,000 | $70,000 (Base + Contour) |
| **M** | 501-2,000 | $100,000 | $140,000 |
| **L** | 2,001-5,000 | $150,000 | $210,000 |
| **XL** | 5,001+ | Custom | Custom |

**Pathfinder + Contour bundle is the default offering.** Never quote Base alone unless explicitly requested. The bundle replaces ITOM Visibility + Service Mapping at 85-90% lower cost.

Tier 1 (standard IT) devices are included in the base platform fee — no per-device charge.

### 3.2 Device Tier Add-Ons

| Tier | Category | Per-Device/Month | Annual (500 devices) | Module Required |
|------|----------|-----------------|---------------------|----------------|
| **2** | IoT / OT | $8-14 | $48K-84K | Pathfinder IoT |
| **3** | Clinical / Medical | $8-15 | $48K-90K | Pathfinder Clinical |
| **4** | Life-Critical | $15-25 | $90K-150K | Pathfinder Clinical |

Per-device pricing decreases at volume. Suggested volume breaks:

| Device Count | Tier 2 | Tier 3 | Tier 4 |
|-------------|--------|--------|--------|
| 1-200 | $14 | $15 | $25 |
| 201-500 | $11 | $12 | $20 |
| 501-1,000 | $9 | $10 | $18 |
| 1,001+ | $8 | $8 | $15 |

### 3.3 Intelligence Modules

| Module | Pricing Unit | Range | Annual (5 facilities) |
|--------|-------------|-------|----------------------|
| **Meridian** (Workforce Correlation) | Per facility/month | $10-20K | $600K-1,200K |
| **Ledger** (Compliance Automation) | Per facility/month | $5-10K | $300K-600K |
| **Vantage Clinical** | Per facility/month | $3-8K | $180K-480K |

Intelligence module pricing is per-facility, not per-device. A "facility" is a licensed location (hospital, clinic, data center) with its own device inventory and compliance scope.

---

## 4. Bundle Pricing

### 4.1 Clinical Operations Bundle

For customers buying the full clinical stack:

| Component | Standalone | Bundle (25% off) |
|-----------|-----------|------------------|
| Pathfinder + Contour (M-tier) | $140K/yr | $105K/yr |
| Pathfinder Clinical (1,000 Tier 3 + 200 Tier 4) | $168K/yr | $126K/yr |
| Meridian (1 facility) | $180K/yr | $135K/yr |
| Ledger (1 facility) | $84K/yr | $63K/yr |
| Vantage Clinical (1 facility) | $60K/yr | $45K/yr |
| **Total** | **$632K/yr** | **$474K/yr** |

### 4.2 Enterprise Agreement

For multi-facility health systems (3+ facilities):

| Commitment | Discount | Notes |
|-----------|---------|-------|
| 3-year term | Additional 10% | Stacked with bundle discount |
| 5+ facilities | Additional 5% | Volume |
| All modules | Additional 5% | Full platform adoption |
| **Maximum combined discount** | **40%** | Bundle + term + volume + full platform |

---

## 5. Licensing Architecture

### 5.1 License Key Structure

```json
{
  "license_id": "LIC-2026-PF-00142",
  "customer_id": "CUST-MERCY-HEALTH",
  "customer_name": "Mercy Health System",
  "effective_date": "2026-07-01",
  "expiration_date": "2027-06-30",
  "modules": {
    "pathfinder_base": { "tier": "L", "max_nodes": 5000 },
    "contour": { "enabled": true },
    "pathfinder_clinical": { "enabled": true },
    "pathfinder_iot": { "enabled": false },
    "meridian": { "enabled": true },
    "ledger": { "enabled": true },
    "vantage_clinical": { "enabled": true }
  },
  "device_limits": {
    "tier2": 2000,
    "tier3": 1500,
    "tier4": 300
  },
  "facilities": [
    { "id": "FAC-MERCY-MAIN", "name": "Mercy Main Campus", "modules": ["meridian", "ledger", "vantage_clinical"] },
    { "id": "FAC-MERCY-WEST", "name": "Mercy West Hospital", "modules": ["meridian", "ledger", "vantage_clinical"] },
    { "id": "FAC-MERCY-SOUTH", "name": "Mercy South Clinic", "modules": ["ledger"] }
  ],
  "discovery_sources": ["pathfinder_ebpf", "armis"],
  "pricing_tier": "enterprise_agreement",
  "bundle": "clinical_operations",
  "signature": "RSA_SHA256:..."
}
```

### 5.2 Metered Billing

Device counts are measured monthly from the Pathfinder platform:

1. Gateway counts unique devices by tier from the Unified Device Model
2. Counts reported to Avennorth license server on the 1st of each month
3. Billing based on: max(contracted device limit, actual discovered count)
4. Overage: if discovered devices exceed contracted limit, customer is invoiced for overage at list price
5. True-up: quarterly reconciliation for significant overages (>10%)

### 5.3 Module Activation

| Event | What Happens |
|-------|-------------|
| License key installed | Gateway validates signature, activates licensed modules |
| Module activated | Protocol parsers, classification rules, enrichers register with core engine |
| Intelligence module activated | Python FastAPI container deployed, starts processing |
| License expired | 7-day grace period, then modules deactivate. Data persists. |
| Module deactivated | Existing data remains in CMDB. New discovery/enrichment stops. |

No agent redeployment needed for any activation/deactivation.

---

## 6. Partner Licensing

### 6.1 Implementation Partners (Compass)

Partners who deploy Pathfinder for healthcare customers:

| Model | Partner Buys At | Partner Sells At | Partner Margin |
|-------|----------------|-----------------|----------------|
| **Markup** | List price | List + 20-30% | 20-30% |
| **Referral** | N/A | Customer buys direct | 10-15% referral fee |
| **Managed Service** | Volume-discounted | Any price | Variable |

### 6.2 Partner Deal Registration

- Partners register deals via Compass platform
- 90-day exclusivity on registered opportunities
- Partner portal: deployment playbooks, training materials, demo environments
- Partner certification: Pathfinder Clinical Deployment Specialist (2-day training)

### 6.3 Partner Technical Requirements

| Requirement | Purpose |
|-------------|---------|
| ServiceNow partner instance | For demo and development |
| Pathfinder lab environment | For training and certification |
| Clinical module training | Healthcare protocol and compliance knowledge |
| UKG integration training | For Meridian deployments |

---

## 7. Competitive Pricing Position

| Competitor | Per-Device (Medical) | Platform Fee | Intelligence Layers |
|-----------|---------------------|-------------|-------------------|
| Claroty/Medigate | $40-70/device/mo | None (per-device only) | Basic dashboards |
| Armis (now SN) | Included in ITOM license | ServiceNow ITOM ($$$) | Security-focused |
| Cynerio | $25-50/device/mo | $10-20K setup | Clinical analytics |
| Ordr | $20-40/device/mo | None | AI classification |
| **Pathfinder Clinical** | **$8-25/device/mo** | **$70K/yr (+ Contour)** | **Meridian + Ledger + Vantage** |

Pathfinder Clinical is 30-70% cheaper per device than competitors while offering deeper intelligence layers (workforce correlation, compliance automation, incident response) that no competitor provides.

---

*Pathfinder Pricing & Licensing Framework — v1.0*
*Avennorth Confidential — March 2026*
