# Avennorth Pathfinder — Internal Product Strategy

## Confidential — Avennorth Team Only

### Position in the Avennorth Portfolio

Pathfinder is the **data collection layer** for the Avennorth platform. It feeds Bearing (CMDB assessment), Compass (consulting workflows), and future products with live behavioral data from customer environments.

```
Customer Environment
  └─ Pathfinder (agents → gateway → intelligence) ──┐
                                                      ├─ ServiceNow CMDB (customer)
                                                      ├─ Bearing (fusion findings)
                                                      └─ Future: Compass deployment manifests
```

### Strategic Moat

1. **Discovery is commodity** — ServiceNow Discovery, Datadog, Dynatrace all discover infrastructure. The moat is NOT discovery.
2. **Intelligence is the moat** — AI health scoring, autonomous CMDB agents, and change impact analysis have no direct competitor in the ServiceNow ecosystem. These features require Pathfinder's discovery data as input, creating a data flywheel.
3. **Bearing fusion** — Pathfinder + Bearing together detect findings neither can alone (stale CIs, shadow IT, misclassifications). This cross-product value proposition locks in both products.

### Compass Channel Strategy

- Pathfinder is a **SOW line item** in Compass, not a separate product sale
- Consulting firms deploy Pathfinder during ServiceNow implementations
- Standard surfaces integration gaps that drive Standard → Professional upgrades
- CoreX consultants point to "detected but not actionable without Professional" dashboards — upgrade conversation writes itself
- Zero sales team — 1-2 channel managers replace 4-6 AEs

### Two-Package Model

| Package | Contents | Starting Price (S-tier) |
|---------|----------|------------------------|
| **Standard** | Pathfinder Discovery Engine + CMDB Ops | $50,000/yr |
| **Professional** | Standard + Integration Intelligence + Service Map Intelligence | $100,000/yr |

Pricing by Managed Node tier: S (≤500), M (501-2K), L (2K-5K), XL (5K+). ~2x multiplier from Standard to Professional.

### Revenue Model (Four Scenarios)

| Scenario | Y5 ARR | Y5 Customers | Y5 EBITDA Margin |
|----------|--------|-------------|-----------------|
| **Bear** | ~$33M | 217 | 89.6% |
| **Likely (Base)** | **~$84M** | **546** | **91.6%** |
| **Bull** | ~$110M | 710 | 92.3% |
| **Best Case** | ~$135M | 875 | 92.8% |

Penetration pricing is the base plan: $50K entry removes procurement friction, Compass distribution amplifies reach, word-of-mouth in the tight ServiceNow ecosystem.

### What Needs to Be True

1. **Compass adoption** — Partners must find value in including Pathfinder in SOWs
2. **AI differentiation** — Claude-powered features must clearly exceed what ServiceNow offers natively
3. **Bearing integration** — Fusion findings must demonstrate value neither product can deliver alone
4. **SN compatibility** — Must work on Utah+ without conflicts with native Discovery

### Key Risks

| Risk | Probability | Mitigation |
|------|------------|------------|
| ServiceNow builds competing feature | Medium | Intelligence layer is 2+ years ahead. Patent filings. |
| Claude API reliability | Low | Retry logic built in. Switchable to other LLMs. |
| Partner adoption slower than projected | Medium | Direct sales fallback. Conservative scenario still profitable at Y3. |

### Engineering Priorities (Next 90 Days)

1. **Windows ETW production agent** — 50%+ of enterprise servers are Windows
2. **ServiceNow workspace build** — Must be done in a real SN instance
3. **Design partner onboarding** — Need 3-5 customers for validation
4. **Bearing integration testing** — Validate fusion findings with real CMDB data
5. **Multi-tenancy** — Required before first Compass channel deployment
