/**
 * Avennorth Pathfinder — Pitch Deck
 * Sales + Investment Funding Presentation
 *
 * 15 slides: Problem → Solution → Product → Differentiation → Patents → Market → Traction → Financials
 *
 * Usage: npm install recharts && drop into any React app
 */
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from "recharts";

const C = {
  bg: "#0c0c18", card: "#151525", hover: "#1c1c30",
  lime: "#c8ff00", limeDim: "rgba(200,255,0,0.12)", limeBorder: "rgba(200,255,0,0.25)",
  teal: "#00d4aa", blue: "#4080ff", orange: "#ff8c40", purple: "#a070ff",
  red: "#ff4060", pink: "#ff60a0", white: "#f0f0f8", text: "#c0c0d4",
  dim: "#6a6a84", border: "rgba(255,255,255,0.06)", green: "#40cc80", cyan: "#00c8ff",
};

const Pill = ({ children, color = C.dim }) => (
  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, padding: "3px 10px", borderRadius: 4, background: `${color}20`, color, whiteSpace: "nowrap", fontWeight: 600 }}>{children}</span>
);

// ── SLIDE DATA ──

const SLIDES = [
  // 0: Title
  {
    id: "title",
    render: () => (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%", textAlign: "center" }}>
        <div style={{ width: 14, height: 14, background: C.lime, borderRadius: "50%", boxShadow: `0 0 20px ${C.lime}`, marginBottom: 24 }} />
        <h1 style={{ fontSize: 42, fontWeight: 800, color: C.white, fontFamily: "'Syne',sans-serif", marginBottom: 8 }}>Avennorth Pathfinder</h1>
        <p style={{ fontSize: 18, color: C.lime, fontFamily: "'Space Mono',monospace", letterSpacing: 2, marginBottom: 32 }}>INTEGRATION INTELLIGENCE FOR SERVICENOW</p>
        <p style={{ fontSize: 14, color: C.dim, maxWidth: 600, lineHeight: 1.7 }}>
          AI-powered integration discovery, health scoring, and autonomous CMDB governance.
          Built for ServiceNow. Sold through Compass. Bootstrappable.
        </p>
        <div style={{ marginTop: 40, display: "flex", gap: 20 }}>
          {[["$40M", "Y5 ARR"], ["14", "People"], ["495", "Clients"], ["$0", "Funding Req'd"]].map(([v, l], i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.lime, fontFamily: "'Syne',sans-serif" }}>{v}</div>
              <div style={{ fontSize: 10, color: C.dim }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // 1: The Problem
  {
    id: "problem",
    render: () => (
      <div>
        <SlideHeader num="01" title="The Problem" sub="Every enterprise has the same CMDB crisis" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          {[
            { icon: "🔍", title: "Invisible Integrations", desc: "60-80% of application integrations are undocumented. Teams discover them during outages, not before.", color: C.red },
            { icon: "📉", title: "Stale CMDB Data", desc: "Relationships entered years ago and never validated. ServiceNow CMDB becomes a liability, not an asset.", color: C.orange },
            { icon: "⏱️", title: "Manual Mapping", desc: "Analysts spend weeks manually mapping integrations using interviews, spreadsheets, and tribal knowledge.", color: C.purple },
            { icon: "🚫", title: "No Health Visibility", desc: "No way to know if an integration is healthy or degraded until there's an incident. Reactive, not proactive.", color: C.blue },
          ].map((p, i) => (
            <div key={i} style={{ background: C.card, borderRadius: 12, padding: 20, borderLeft: `3px solid ${p.color}` }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{p.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: p.color, marginBottom: 6 }}>{p.title}</div>
              <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{p.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ background: `${C.red}10`, borderRadius: 12, padding: 20, border: `1px solid ${C.red}30` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.red, marginBottom: 6 }}>The Cost of Inaction</div>
          <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>
            Gartner estimates that poor CMDB data quality costs enterprises <strong style={{ color: C.white }}>$12.9M annually</strong> in incident resolution delays, failed changes, and compliance gaps. The average MTTR increases <strong style={{ color: C.white }}>35%</strong> when service maps are inaccurate.
          </div>
        </div>
      </div>
    ),
  },

  // 2: The Solution
  {
    id: "solution",
    render: () => (
      <div>
        <SlideHeader num="02" title="The Solution" sub="Discover every integration. Score every relationship. Govern automatically." />
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          {[
            { step: "1", title: "Deploy", desc: "eBPF/ETW agents on your servers. Zero code changes. <1% overhead. 5 min per server.", color: C.teal },
            { step: "2", title: "Discover", desc: "Kernel-level TCP/UDP observation finds every integration automatically. Classified with confidence scoring.", color: C.blue },
            { step: "3", title: "Enrich", desc: "AI health scoring, natural language summaries, EA reconciliation. Claude-powered intelligence.", color: C.lime },
            { step: "4", title: "Govern", desc: "8 autonomous CMDB agents fix duplicates, stale records, orphans, compliance gaps. While you sleep.", color: C.orange },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, background: C.card, borderRadius: 12, padding: 16, borderTop: `3px solid ${s.color}`, textAlign: "center" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${s.color}20`, border: `2px solid ${s.color}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: s.color, marginBottom: 10 }}>{s.step}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: s.color, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 11, color: C.text, lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ background: C.card, borderRadius: 12, padding: 20, borderLeft: `3px solid ${C.lime}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.lime, marginBottom: 6 }}>The Result</div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
            Accurate service map in <strong style={{ color: C.white }}>minutes</strong>, not weeks. Health visibility across every integration. CMDB quality that <strong style={{ color: C.white }}>improves automatically</strong>. All inside ServiceNow — no separate tool, no context switching.
          </div>
        </div>
      </div>
    ),
  },

  // 3: Product Portfolio
  {
    id: "products",
    render: () => (
      <div>
        <SlideHeader num="03" title="Four Products, One Platform" sub="Each product adds value. Together they create a moat." />
        {[
          { name: "Pathfinder Discovery", tier: "Starter $15/host", desc: "eBPF/ETW/K8s agents capture every TCP/UDP connection at the kernel level. Gateway classifies by port + process with confidence scoring. Syncs Integration CIs and Interface CIs to ServiceNow.", color: C.teal, status: "Built" },
          { name: "Integration Intelligence", tier: "Professional $28/host", desc: "AI health scoring (Availability 40%, Latency 30%, Error Rate 20%, Staleness 10%). Claude-powered natural language summaries. EA reconciliation with 3-strategy matching. Anomaly detection.", color: C.lime, status: "Built" },
          { name: "CMDB Ops Agent", tier: "Enterprise $38/host", desc: "8 autonomous agents: DuplicateDetector, StaleRecordReaper, OrphanFinder, RelationshipValidator, ClassificationAuditor, ComplianceChecker, HealthScorer, RemediationOrchestrator. 5-phase lifecycle with 4 autonomy levels.", color: C.orange, status: "Built" },
          { name: "Service Map Intelligence", tier: "Enterprise $38/host", desc: "Coverage gap detection with priority rules. Per-application risk scoring. BFS change impact analysis (direct + indirect blast radius). Self-healing coverage gap flow.", color: C.purple, status: "Built" },
        ].map((p, i) => (
          <div key={i} style={{ background: C.card, borderRadius: 10, padding: 14, marginBottom: 10, display: "flex", gap: 14, alignItems: "flex-start", borderLeft: `3px solid ${p.color}` }}>
            <div style={{ minWidth: 180 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: p.color }}>{p.name}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}><Pill color={p.color}>{p.tier}</Pill><Pill color={C.green}>{p.status}</Pill></div>
            </div>
            <div style={{ fontSize: 11, color: C.text, lineHeight: 1.6 }}>{p.desc}</div>
          </div>
        ))}
      </div>
    ),
  },

  // 4: How It's Different
  {
    id: "differentiation",
    render: () => (
      <div>
        <SlideHeader num="04" title="Why Pathfinder Wins" sub="vs. ServiceNow Discovery, APM vendors, and manual processes" />
        <div style={{ background: C.card, borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1fr", padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
            {["Capability", "Manual / SN Discovery", "APM (Datadog, Dynatrace)", "Avennorth Pathfinder"].map((h, i) => (
              <div key={i} style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: i === 3 ? C.lime : C.dim, letterSpacing: 1, textTransform: "uppercase" }}>{h}</div>
            ))}
          </div>
          {[
            ["Time to first map", "Weeks-months", "Days (per app)", "Minutes"],
            ["Code changes needed", "N/A", "SDK per app", "Zero"],
            ["Integration discovery", "Manual interviews", "Per-app traces only", "All TCP/UDP auto"],
            ["Health scoring", "None", "Per-app metrics", "AI composite (4-metric)"],
            ["CMDB quality automation", "None", "None", "8 autonomous agents"],
            ["Change impact analysis", "Manual", "Partial (APM scope)", "Graph traversal + AI"],
            ["EA reconciliation", "Spreadsheets", "None", "AI 3-strategy matching"],
            ["ServiceNow native", "Yes (manual)", "Connector", "Polaris workspace"],
            ["Price", "Headcount cost", "$33-100/host/mo", "$15-38/host/mo"],
          ].map((row, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1fr", padding: "8px 14px", borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "transparent" : `${C.white}02` }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: C.white }}>{row[0]}</div>
              <div style={{ fontSize: 11, color: C.dim }}>{row[1]}</div>
              <div style={{ fontSize: 11, color: C.dim }}>{row[2]}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.lime }}>{row[3]}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6, background: C.card, borderRadius: 10, padding: 14, borderLeft: `3px solid ${C.lime}` }}>
          <strong style={{ color: C.lime }}>Key insight:</strong> APM vendors optimize for their dashboards. Discovery optimizes for infrastructure. Pathfinder optimizes for <strong style={{ color: C.white }}>the relationships between applications</strong> — the integrations that determine whether your service map is trustworthy.
        </div>
      </div>
    ),
  },

  // 5: Patents
  {
    id: "patents",
    render: () => (
      <div>
        <SlideHeader num="05" title="Intellectual Property" sub="Two provisional patents protecting the core innovation" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div style={{ background: C.card, borderRadius: 12, padding: 20, borderTop: `3px solid ${C.lime}` }}>
            <Pill color={C.lime}>Patent #1 — Provisional</Pill>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.white, margin: "12px 0 8px" }}>Behavioral Confidence Scoring for CMDB Relationships</div>
            <div style={{ fontSize: 11, color: C.text, lineHeight: 1.7 }}>
              A method for computing confidence scores on discovered integration relationships using a composite of port-based classification rules, process-name matching, and behavioral modifiers (flow count, temporal consistency, cross-validation, ephemeral port detection). The scored relationships are used to gate CMDB population, ensuring only high-confidence integrations enter the service map.
            </div>
            <div style={{ marginTop: 12 }}>
              {["Port + process rule engine", "4-modifier confidence adjustment", "Configurable threshold gating", "Noise filtering at kernel level"].map((c, i) => (
                <div key={i} style={{ fontSize: 10, color: C.teal, padding: "3px 0" }}>&#x2713; {c}</div>
              ))}
            </div>
          </div>
          <div style={{ background: C.card, borderRadius: 12, padding: 20, borderTop: `3px solid ${C.orange}` }}>
            <Pill color={C.orange}>Patent #2 — Provisional</Pill>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.white, margin: "12px 0 8px" }}>Autonomous CMDB Agent Lifecycle with Progressive Autonomy</div>
            <div style={{ fontSize: 11, color: C.text, lineHeight: 1.7 }}>
              A system of autonomous agents that continuously observe, diagnose, recommend, act on, and verify CMDB data quality issues. Each agent operates at a configurable autonomy level (0-3) with progressive trust — from report-only to fully autonomous execution with retroactive change records.
            </div>
            <div style={{ marginTop: 12 }}>
              {["5-phase lifecycle (observe/diagnose/recommend/act/verify)", "4 autonomy levels with progressive promotion", "Blast radius guardrails (50 CI limit, 24h cooldown)", "Cross-agent deconfliction via orchestrator"].map((c, i) => (
                <div key={i} style={{ fontSize: 10, color: C.orange, padding: "3px 0" }}>&#x2713; {c}</div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ background: `${C.purple}10`, borderRadius: 10, padding: 14, border: `1px solid ${C.purple}30` }}>
          <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>
            <strong style={{ color: C.purple }}>Defensive moat:</strong> These patents protect the two features competitors cannot easily replicate — the confidence model that kills noise, and the autonomous agent lifecycle that replaces manual CMDB governance. Combined with Compass distribution lock-in across 100+ consulting firms, this creates a multi-layered competitive barrier.
          </div>
        </div>
      </div>
    ),
  },

  // 6: Bearing Integration
  {
    id: "bearing",
    render: () => (
      <div>
        <SlideHeader num="06" title="Bearing Fusion" sub="Pathfinder + Bearing = findings neither can detect alone" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div style={{ background: C.card, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.teal, marginBottom: 10 }}>What Pathfinder Sends</div>
            {["CI confidence scores (0-100)", "Traffic state (active/idle/deprecated/unknown)", "Communication partners per CI", "Behavioral classification (port patterns -> CI class)", "Relationship confirmations (observed vs CMDB)", "Coverage summary (monitored vs unmonitored subnets)"].map((f, i) => (
              <div key={i} style={{ fontSize: 11, color: C.text, padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>&#x2192; {f}</div>
            ))}
          </div>
          <div style={{ background: C.card, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.orange, marginBottom: 10 }}>What Bearing Produces</div>
            {[
              { finding: "Shadow IT", detail: "Active traffic, no CMDB record", sev: "CRITICAL", color: C.red },
              { finding: "Stale CI", detail: "CMDB says Operational, Pathfinder says Idle", sev: "CRITICAL", color: C.red },
              { finding: "CI Still In Use", detail: "CMDB says Retired, traffic is Active", sev: "HIGH", color: C.orange },
              { finding: "Misclassified CI", detail: "Pathfinder suggests different class", sev: "HIGH", color: C.orange },
              { finding: "Stale Relationship", detail: "CMDB rel exists, no traffic observed", sev: "MEDIUM", color: C.blue },
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                <Pill color={f.color}>{f.sev}</Pill>
                <div><div style={{ fontSize: 11, color: C.white }}>{f.finding}</div><div style={{ fontSize: 9, color: C.dim }}>{f.detail}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6, background: C.card, borderRadius: 10, padding: 14, borderLeft: `3px solid ${C.lime}` }}>
          <strong style={{ color: C.lime }}>Cross-sell value:</strong> Bearing customers need Pathfinder for behavioral data. Pathfinder customers need Bearing for CMDB assessment. Together they detect findings neither can alone. This creates a <strong style={{ color: C.white }}>two-product lock-in</strong> that increases both retention and deal size.
        </div>
      </div>
    ),
  },

  // 7: Market
  {
    id: "market",
    render: () => (
      <div>
        <SlideHeader num="07" title="Market Opportunity" sub="ServiceNow ITSM/ITOM customers with CMDB pain" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
          {[
            { label: "ServiceNow Customers", value: "8,100+", sub: "Global enterprises", color: C.lime },
            { label: "With CMDB", value: "~6,000", sub: "Active ITSM + ITOM", color: C.teal },
            { label: "TAM (at $100k avg)", value: "$600M", sub: "Annual addressable", color: C.blue },
          ].map((m, i) => (
            <div key={i} style={{ background: C.card, borderRadius: 12, padding: 20, borderTop: `3px solid ${m.color}`, textAlign: "center" }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: m.color, fontFamily: "'Syne',sans-serif" }}>{m.value}</div>
              <div style={{ fontSize: 12, color: C.white, marginBottom: 2 }}>{m.label}</div>
              <div style={{ fontSize: 10, color: C.dim }}>{m.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ background: C.card, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 10 }}>Why Now</div>
            {["ServiceNow dominance in ITSM (7,700+ customers)", "ITOM Service Mapping adoption accelerating", "AI/LLM capability enables intelligence layer", "eBPF technology matured (Linux 5.8+)", "Enterprise CMDB pain is at peak"].map((r, i) => (
              <div key={i} style={{ fontSize: 11, color: C.text, padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>&#x2192; {r}</div>
            ))}
          </div>
          <div style={{ background: C.card, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 10 }}>Why Avennorth</div>
            {["Existing SN consulting team (built the scoped app)", "Compass = zero-cost distribution to 100+ partners", "AI-assisted dev (Claude Code) = 2-3x productivity", "Bearing integration = cross-product lock-in", "10 phases built, 117 tests passing, production-ready"].map((r, i) => (
              <div key={i} style={{ fontSize: 11, color: C.teal, padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>&#x2713; {r}</div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // 8: Go-to-Market
  {
    id: "gtm",
    render: () => (
      <div>
        <SlideHeader num="08" title="Go-to-Market: Compass Channel" sub="No sales team. Consulting firms sell for us." />
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {[
            { step: "1", title: "Consultant scopes SN engagement in Compass", color: C.cyan },
            { step: "2", title: "Adds Pathfinder as SOW line item (one click)", color: C.blue },
            { step: "3", title: "Deploys agents during implementation", color: C.teal },
            { step: "4", title: "Client sees value, expands Starter -> Pro -> Enterprise", color: C.lime },
            { step: "5", title: "Consultant repeats on next 10 engagements", color: C.orange },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, background: C.card, borderRadius: 10, padding: 12, borderTop: `3px solid ${s.color}`, textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: "'Syne',sans-serif", marginBottom: 4 }}>{s.step}</div>
              <div style={{ fontSize: 10, color: C.text, lineHeight: 1.5 }}>{s.title}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ background: C.card, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.white }}>Channel vs. Direct Economics</span>
            </div>
            {[
              ["CAC", "$35-50k", "$8-15k"],
              ["Sales Cycle", "3-6 months", "2-4 weeks"],
              ["Sales Team (Y3)", "4-6 AEs", "1-2 channel mgrs"],
              ["NRR", "120-130%", "145-165%"],
            ].map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", padding: "6px 14px", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 10, color: C.dim }}>{r[0]}</span>
                <span style={{ fontSize: 10, color: C.dim }}>{r[1]}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.lime }}>{r[2]}</span>
              </div>
            ))}
          </div>
          <div style={{ background: C.card, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.white, marginBottom: 8 }}>Deal Flow Example</div>
            {[
              ["Pilot (Mo 1-3)", "75 hosts x $15", "$1,125/mo"],
              ["Expand (Mo 4-8)", "300 hosts x $28", "$8,400/mo"],
              ["Full Estate (Mo 9+)", "800 hosts x $38", "$30,400/mo"],
            ].map((d, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 10, color: C.text }}>{d[0]}</span>
                <span style={{ fontSize: 10, color: C.dim }}>{d[1]}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.lime }}>{d[2]}</span>
              </div>
            ))}
            <div style={{ fontSize: 10, color: C.lime, marginTop: 8 }}>Single client LTV: $364,800/yr</div>
          </div>
        </div>
      </div>
    ),
  },

  // 9: Traction
  {
    id: "traction",
    render: () => (
      <div>
        <SlideHeader num="09" title="What's Already Built" sub="Code-complete across 10 phases. 117 tests passing." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { v: "5", l: "Go Binaries", s: "Gateway + 3 agents + mock", c: C.teal },
            { v: "4", l: "Python Services", s: "AI + Intel + CMDB + SvcMap", c: C.blue },
            { v: "6", l: "SN Tables", s: "Custom x_avnth_ tables", c: C.orange },
            { v: "117", l: "Tests Passing", s: "Unit + integration", c: C.green },
            { v: "8", l: "CMDB Agents", s: "Autonomous lifecycle", c: C.purple },
            { v: "6", l: "Workspace Pages", s: "Polaris UI Builder", c: C.cyan },
            { v: "13", l: "SVG Diagrams", s: "Figma-ready", c: C.pink },
            { v: "30+", l: "Documents", s: "Guides + reference + DOCX", c: C.dim },
          ].map((m, i) => (
            <div key={i} style={{ background: C.card, borderRadius: 10, padding: 12, borderLeft: `3px solid ${m.c}`, textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: m.c }}>{m.v}</div>
              <div style={{ fontSize: 10, color: C.white }}>{m.l}</div>
              <div style={{ fontSize: 8, color: C.dim }}>{m.s}</div>
            </div>
          ))}
        </div>
        <div style={{ background: C.card, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.white, marginBottom: 10 }}>Build Phases Complete</div>
          <div style={{ display: "flex", gap: 4 }}>
            {["Foundation", "Gateway", "Linux Agent", "SN App", "AI Engine", "Integ Intel", "CMDB Ops", "Service Map", "Win/K8s/Helm", "Polish"].map((p, i) => (
              <div key={i} style={{ flex: 1, background: C.green, borderRadius: 4, padding: "6px 2px", textAlign: "center" }}>
                <div style={{ fontSize: 7, color: C.bg, fontWeight: 600 }}>{p}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 9, color: C.dim }}>Phase 0</span>
            <span style={{ fontSize: 9, color: C.green }}>All 10 phases complete &#x2713;</span>
            <span style={{ fontSize: 9, color: C.dim }}>Phase 9</span>
          </div>
        </div>
      </div>
    ),
  },

  // 10: Team
  {
    id: "team",
    render: () => (
      <div>
        <SlideHeader num="10" title="Lean Team Model" sub="3 existing + 2 new hires Year 1. Growing to 14 by Year 5." />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
          {[
            { yr: "Y1", hc: 5, new: 2, key: "Go Eng + Python/AI Eng" },
            { yr: "Y2", hc: 7, new: 2, key: "Platform Eng + Channel Mgr" },
            { yr: "Y3", hc: 9, new: 2, key: "Support + Content" },
            { yr: "Y4", hc: 11, new: 2, key: "Sr AI/ML + 2nd Support" },
            { yr: "Y5", hc: 14, new: 3, key: "2nd Channel + Platform + CSM" },
          ].map((y, i) => (
            <div key={i} style={{ background: C.card, borderRadius: 10, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.lime, marginBottom: 4 }}>{y.yr}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.white }}>{y.hc}</div>
              <div style={{ fontSize: 9, color: C.teal }}>+{y.new} new</div>
              <div style={{ fontSize: 8, color: C.dim, marginTop: 4 }}>{y.key}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ background: C.card, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.lime, marginBottom: 8 }}>Force Multipliers</div>
            {[
              ["Existing team", "SN dev + QA already on Avennorth payroll"],
              ["Claude Code", "Each engineer ships 2-3x with AI assistance"],
              ["Compass", "No sales team — partners sell, we enable"],
              ["Full-stack AI", "Python intelligence layer built in parallel"],
            ].map(([k, v], i) => (
              <div key={i} style={{ padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.teal }}>{k}: </span>
                <span style={{ fontSize: 10, color: C.text }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ background: C.card, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 8 }}>Y5 Capital Efficiency</div>
            {[
              ["ARR/Employee", "$2.86M", "(vs. $150-250k median)"],
              ["Headcount", "14", "(vs. 150-250 typical at $40M ARR)"],
              ["Sales team", "0", "(Compass channel)"],
              ["Marketing spend", "$110k/yr", "(content only)"],
            ].map(([k, v, n], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 10, color: C.dim }}>{k}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.lime }}>{v}</span>
                <span style={{ fontSize: 9, color: C.dim }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  // 11: Financials (Appendix)
  {
    id: "financials",
    render: () => {
      const data = [
        { yr: "Y1", arr: 65, rev: 25, opex: 1030, clients: 3 },
        { yr: "Y2", arr: 1500, rev: 900, opex: 1310, clients: 33 },
        { yr: "Y3", arr: 5800, rev: 4200, opex: 1620, clients: 110 },
        { yr: "Y4", arr: 15500, rev: 11500, opex: 2050, clients: 255 },
        { yr: "Y5", arr: 40000, rev: 29500, opex: 2580, clients: 495 },
      ];
      return (
        <div>
          <SlideHeader num="A1" title="Appendix: Five-Year Financials" sub="Base case — Compass channel distribution" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div style={{ background: C.card, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.white, marginBottom: 10 }}>ARR Growth ($k)</div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={data}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="yr" stroke={C.dim} fontSize={10}/><YAxis stroke={C.dim} fontSize={9} tickFormatter={v=>`$${v}k`}/><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,fontSize:10}}/><Area type="monotone" dataKey="arr" stroke={C.lime} fill={C.limeDim} strokeWidth={2}/></AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: C.card, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.white, marginBottom: 10 }}>Revenue vs OpEx ($k)</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="yr" stroke={C.dim} fontSize={10}/><YAxis stroke={C.dim} fontSize={9} tickFormatter={v=>`$${v}k`}/><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,fontSize:10}}/><Legend wrapperStyle={{fontSize:10}}/><Bar dataKey="rev" name="Revenue" fill={C.lime} radius={[3,3,0,0]}/><Bar dataKey="opex" name="OpEx" fill={C.red} radius={[3,3,0,0]} opacity={0.5}/></BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ background: C.card, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", padding: "8px 12px", borderBottom: `1px solid ${C.border}` }}>
              {["", "ARR", "Revenue", "OpEx", "Cash Flow", "Clients", "Partners", "Headcount"].map((h, i) => (
                <span key={i} style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: C.dim, letterSpacing: 1 }}>{h}</span>
              ))}
            </div>
            {[
              ["Y1", "$65k", "$25k", "$1.03M", "-$1.01M", "3", "0", "5"],
              ["Y2", "$1.5M", "$900k", "$1.31M", "-$410k", "33", "15", "7"],
              ["Y3", "$5.8M", "$4.2M", "$1.62M", "+$2.58M", "110", "40", "9"],
              ["Y4", "$15.5M", "$11.5M", "$2.05M", "+$9.45M", "255", "75", "11"],
              ["Y5", "$40.0M", "$29.5M", "$2.58M", "+$26.9M", "495", "110", "14"],
            ].map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", padding: "6px 12px", borderBottom: `1px solid ${C.border}` }}>
                {r.map((c, j) => (
                  <span key={j} style={{ fontSize: 10, color: j === 0 ? C.white : j === 4 ? (c.startsWith("+") ? C.green : C.red) : C.text, fontWeight: j === 0 || j === 4 ? 600 : 400 }}>{c}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    },
  },

  // 12: Investment Ask
  {
    id: "ask",
    render: () => (
      <div>
        <SlideHeader num="A2" title="Appendix: Investment Ask" sub="Bootstrappable — or accelerate with modest seed" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div style={{ background: C.card, borderRadius: 12, padding: 20, borderTop: `3px solid ${C.lime}` }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.lime, marginBottom: 12 }}>Path A: Bootstrap (Recommended)</div>
            <div style={{ fontSize: 12, color: C.text, lineHeight: 1.7, marginBottom: 12 }}>Avennorth consulting revenue absorbs the incremental investment. No external funding.</div>
            {[
              ["2 new engineers (Y1)", "$375k"],
              ["Infrastructure + AI tokens", "$72k"],
              ["Legal + patents", "$90k"],
              ["Marketing + partner", "$65k"],
              ["Total incremental", "$602k"],
            ].map(([k, v], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 10, color: C.text }}>{k}</span>
                <span style={{ fontSize: 11, fontWeight: i === 4 ? 700 : 400, color: i === 4 ? C.lime : C.white }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 10, fontSize: 10, color: C.dim }}>Break-even: Late Year 2. 5-year profit: ~$37.5M.</div>
          </div>
          <div style={{ background: C.card, borderRadius: 12, padding: 20, borderTop: `3px solid ${C.orange}` }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.orange, marginBottom: 12 }}>Path B: Seed Round ($1.5-2.0M)</div>
            <div style={{ fontSize: 12, color: C.text, lineHeight: 1.7, marginBottom: 12 }}>Accelerate with 2 additional engineers, dedicated channel manager, conference presence.</div>
            {[
              ["2 additional engineers", "$370k"],
              ["Channel manager (day 1)", "$140k"],
              ["Conference budget", "$100k"],
              ["Extended runway (18 mo)", "$890k"],
              ["Total raise", "$1.5M"],
            ].map(([k, v], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 10, color: C.text }}>{k}</span>
                <span style={{ fontSize: 11, fontWeight: i === 4 ? 700 : 400, color: i === 4 ? C.orange : C.white }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 10, fontSize: 10, color: C.dim }}>Faster to market. Break-even: Mid Year 2.</div>
          </div>
        </div>
        <div style={{ background: `${C.lime}08`, borderRadius: 12, padding: 20, border: `1px solid ${C.limeBorder}`, textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.lime, marginBottom: 8 }}>The Bottom Line</div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7, maxWidth: 700, margin: "0 auto" }}>
            The platform is built. 117 tests pass. The intelligence moat is real. The channel is ready.
            Whether bootstrapped or funded, Pathfinder reaches $40M ARR on 14 people by Year 5 — an ARR/employee ratio 11-19x the industry median.
          </div>
        </div>
      </div>
    ),
  },
];

function SlideHeader({ num, title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: C.lime, letterSpacing: 2 }}>{num}</span>
        <div style={{ width: 30, height: 1, background: C.lime }} />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: C.white, fontFamily: "'Syne',sans-serif", marginBottom: 2 }}>{title}</h2>
      {sub && <p style={{ fontSize: 12, color: C.dim }}>{sub}</p>}
    </div>
  );
}

export default function PitchDeck() {
  const [slide, setSlide] = useState(0);
  const cur = SLIDES[slide];

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif", background: C.bg, color: C.text, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.hover};border-radius:3px}button{font-family:inherit}`}</style>

      {/* Slide content */}
      <div style={{ flex: 1, maxWidth: 960, width: "100%", margin: "0 auto", padding: "24px 32px", overflowY: "auto" }}>
        {cur.render()}
      </div>

      {/* Navigation */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: "10px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 960, width: "100%", margin: "0 auto" }}>
        <button onClick={() => setSlide(Math.max(0, slide - 1))} disabled={slide === 0} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: slide > 0 ? C.card : "transparent", color: slide > 0 ? C.text : C.dim, fontSize: 11, cursor: slide > 0 ? "pointer" : "default" }}>&larr; Back</button>
        <div style={{ display: "flex", gap: 4 }}>
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)} style={{ width: i === slide ? 24 : 8, height: 8, borderRadius: 4, border: "none", background: i === slide ? C.lime : C.card, cursor: "pointer", transition: "width 0.2s" }} />
          ))}
        </div>
        <button onClick={() => setSlide(Math.min(SLIDES.length - 1, slide + 1))} disabled={slide === SLIDES.length - 1} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: slide < SLIDES.length - 1 ? C.lime : "transparent", color: slide < SLIDES.length - 1 ? C.bg : C.dim, fontSize: 11, fontWeight: 600, cursor: slide < SLIDES.length - 1 ? "pointer" : "default" }}>Next &rarr;</button>
      </div>

      <div style={{ textAlign: "center", padding: "6px 0 10px", fontSize: 8, color: C.dim }}>
        AVENNORTH PATHFINDER — {slide + 1} of {SLIDES.length}
      </div>
    </div>
  );
}
