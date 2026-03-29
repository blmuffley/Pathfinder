# Figma Import & Refinement Specs

## Importing SVGs into Figma

1. Open your Figma project
2. Drag-and-drop any `.svg` file from this directory onto the canvas
3. Figma will import all shapes, text, and colors as editable vector layers
4. Ungroup the top-level frame to access individual elements

## Brand Tokens (use as Figma Styles)

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Neon Lime | `#39FF14` | Primary accent, borders, highlights, CTAs |
| Lime Glow | `#39FF1444` | Background tints, subtle borders |
| Lime Muted | `#39FF1488` | Secondary accents |
| Lime Dim | `#39FF1422` | Light background fills |
| Obsidian | `#1C1917` | Primary text (on light), card fills (on dark) |
| Near Black | `#0E0E0C` | Dark backgrounds, hero sections |
| White | `#FFFFFF` | Text on dark, light card fills |
| Off White | `#FAFAF8` | Page backgrounds (light mode) |
| Cream | `#F8F6F1` | Alternate light backgrounds |
| Light Grey | `#F4F4F0` | Subtle backgrounds |
| Border Grey | `#E8E6E0` | Card borders, dividers |
| Mid Grey | `#A8A194` | Secondary text, labels |

### Typography

| Style | Font | Weight | Size | Use |
|-------|------|--------|------|-----|
| H1 | Syne | 800 | 28px | Diagram titles |
| H2 | Syne | 700 | 18px | Section headers |
| H3 | Syne | 700 | 14px | Card titles |
| Body | DM Sans | 400 | 11px | Descriptions |
| Label | Space Mono | 700 | 10px | Tier labels, tags |
| Code | Space Mono | 400 | 10px | Field names, technical text |
| Caption | Space Mono | 400 | 9px | Footers, annotations |

### Component Styles

| Component | Fill | Stroke | Radius | Shadow |
|-----------|------|--------|--------|--------|
| Dark card | `#1C1917` | `#39FF1444` 1px | 12px | none |
| Light card | `#FFFFFF` | `#E8E6E0` 1.5px | 12px | 0 2 4 rgba(28,25,23,0.06) |
| Primary card | `#0E0E0C` | `#39FF14` 2px | 14px | none |
| Tier banner | `#39FF14` fill | — | top 14px | none |
| Status dot | `#39FF14` fill | — | circle r=8 | none |
| Inactive dot | `#A8A194` fill | — | circle r=8 | none |
| Tag pill | `#39FF1422` fill | — | 4px | none |

### Arrow Styles

| Type | Stroke | Width | Dash | Arrow |
|------|--------|-------|------|-------|
| Primary flow | `#39FF14` | 2px | solid | filled triangle |
| Secondary flow | `#A8A194` | 1.5px | 5,3 dash | filled triangle |
| Extends/inherits | `#39FF14` | 1.5px | 5,3 dash | none |
| Reference (FK) | `#A8A194` | 1px | 4,4 dash | filled triangle |

---

## Diagram Inventory

### 01 — Four-Tier Architecture
- **File:** `01-four-tier-architecture.svg`
- **Canvas size:** 1200 × 900
- **Layout:** 4 horizontal tiers stacked vertically
- **Dark theme:** Tier 2 (Gateway) uses Near Black background with lime accents
- **Refinement notes:** Add Avennorth logo top-left. Consider adding network port annotations on tier connection lines.

### 02 — Data Flow Pipeline
- **File:** `02-data-flow-pipeline.svg`
- **Canvas size:** 1200 × 600
- **Layout:** Top row = 5-step linear flow, middle row = classification sub-steps, bottom = output
- **Dark theme:** Full dark background
- **Refinement notes:** Add numbered step badges. Consider animating the flow arrows for presentations.

### 03 — CI Data Model (ERD)
- **File:** `03-ci-data-model-erd.svg`
- **Canvas size:** 1200 × 800
- **Layout:** Integration CI left, Interface CI right, supporting tables below
- **Light theme:** Off White background
- **Refinement notes:** Add crow's foot notation for relationships. Color-code required vs optional fields.

### 04 — PostgreSQL Schema
- **File:** `04-postgresql-erd.svg`
- **Canvas size:** 1200 × 700
- **Layout:** agents top-left, raw_flows below, classified tables right, health_metrics + sync_log bottom
- **Dark theme:** Near Black background
- **Refinement notes:** Highlight partitioned tables (raw_flows, health_metrics) with a different lime shade. Add index annotations.

### 05 — Classification Engine
- **File:** `05-classification-engine.svg`
- **Canvas size:** 1200 × 550
- **Layout:** Priority chain top, confidence modifiers middle, port map bottom
- **Light theme:** Off White background
- **Refinement notes:** Add a decision tree visual for the priority chain. Add color coding for confidence levels (green ≥0.8, yellow 0.6-0.8, red <0.6).

### 06 — CMDB Ops Agents
- **File:** `06-cmdb-ops-agents.svg`
- **Canvas size:** 1200 × 750
- **Layout:** Lifecycle bar top, 4×2 agent grid, autonomy levels, guardrails
- **Dark theme:** Near Black background
- **Refinement notes:** Add connecting lines from agent cards to the Remediation Orchestrator. Add status indicators showing current autonomy level.

### 07 — Self-Healing Loop
- **File:** `07-self-healing-loop.svg`
- **Canvas size:** 1000 × 700
- **Layout:** Circular 4-step loop with decorative background circle
- **Light theme:** Off White background
- **Refinement notes:** Consider making the loop arrows curved/smooth. Add timing annotations (e.g., "every 4 hours" on detect, "10 min timeout" on verify).

### 08 — Portfolio Map
- **File:** `08-portfolio-map.svg`
- **Canvas size:** 1200 × 700
- **Layout:** 3 horizontal layers (Discovery, Intelligence, ServiceNow) + pricing tiers
- **Dark theme:** Near Black background
- **Refinement notes:** Add the Avennorth logo in the top-left. Add connecting lines between layers showing data flow direction.

### 09 — ServiceNow Data Model (Complete)
- **File:** `09-servicenow-data-model.svg`
- **Canvas size:** 1400 × 950
- **Layout:** SN base tables top, Integration + Interface CI middle, supporting tables bottom
- **Dark theme:** Near Black background
- **Refinement notes:** This is the most detailed diagram. Consider splitting into 2 pages in Figma: (1) core CIs and (2) supporting tables. Add relationship cardinality labels on all FK lines.

---

## Figma Organization Tips

1. **Create a page per diagram** — keeps things manageable
2. **Set up color styles** from the token table above before editing
3. **Set up text styles** from the typography table
4. **Use Auto Layout** on card components for easy resizing
5. **Create components** for recurring elements (status dots, tags, arrows)
6. **Export at 2x** for crisp retina displays in presentations
