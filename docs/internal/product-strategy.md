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
- Intelligence products drive tier upgrades: Starter → Professional → Enterprise
- NRR 145-165% because partners are incentivized to expand coverage + upgrade tiers
- Zero sales team — 1-2 channel managers replace 4-6 AEs

### Revenue Model

| Year | ARR | Clients | Headcount | ARR/Employee |
|------|-----|---------|-----------|-------------|
| 1 | $65k | 3 | 5 | $13k |
| 2 | $1.5M | 33 | 7 | $214k |
| 3 | $5.8M | 110 | 9 | $644k |
| 4 | $15.5M | 255 | 11 | $1.41M |
| 5 | $40.0M | 495 | 14 | $2.86M |

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
