# Archived Business Models

These files represent early-stage planning documents that have been superseded by the actual implementation.

| File | Version | Status | Superseded By |
|------|---------|--------|---------------|
| `v01-discovery-agent-architecture.jsx` | v0.1 | Archived | `docs/architecture/01-05`, actual codebase |
| `v02-extended-architecture.jsx` | v0.2 | Archived | `docs/architecture/01-05`, actual codebase |

## Why Archived

- **v0.1**: Original 4-layer / 12-component concept sketch. The real build has 9 products across 4 tiers with 20+ components, an intelligence layer not envisioned in v0.1, and 104+ tests.
- **v0.2**: Proposed 6-factor confidence engine, Traffic State Analyzer, Noise Gate, and Application Service Assembler. None were built as designed. The actual classification engine uses port/process rules with 4 confidence modifiers. Health status is computed by the Integration Intelligence health scorer, not a traffic state analyzer.

## Current Documents

See `docs/business-models/current/` for the active business planning files (v0.3, v0.4, v0.5 — updated to reflect what was actually built).
