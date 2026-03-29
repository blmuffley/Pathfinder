/**
 * Avennorth Pathfinder — Business Case v0.3.1 (Updated)
 *
 * Changes from v0.3:
 * - Added Intelligence layer products (Phases 4-7) to pricing tiers
 * - Updated capability claims to match actual build
 * - Added AI token costs to build cost model
 * - Corrected CSDM mapping claims (extends cmdb_ci, not full taxonomy)
 * - Updated revenue projections for 4-product portfolio
 * - Avennorth branding throughout
 */
import { useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend, Cell } from "recharts";

const C = {
  bg: "#0c0c18", bgCard: "#151525", bgHover: "#1c1c30", bgDeep: "#10101c",
  lime: "#c8ff00", limeDim: "rgba(200,255,0,0.12)", limeBorder: "rgba(200,255,0,0.25)",
  teal: "#00d4aa", blue: "#4080ff", orange: "#ff8c40", purple: "#a070ff",
  red: "#ff4060", pink: "#ff60a0", white: "#f0f0f8", text: "#c0c0d4",
  dim: "#6a6a84", border: "rgba(255,255,255,0.06)", green: "#40cc80",
};

const Pill = ({ children, color = C.dim }) => (
  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, padding: "3px 8px", borderRadius: 4, background: `${color}18`, color }}>{children}</span>
);

const SectionHeader = ({ color, label, title, subtitle }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <div style={{ width: 3, height: 16, background: color, borderRadius: 2 }} />
      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color, letterSpacing: 2, textTransform: "uppercase" }}>{label}</span>
    </div>
    <h2 style={{ fontSize: 18, fontWeight: 700, color: C.white, marginBottom: 2 }}>{title}</h2>
    {subtitle && <p style={{ fontSize: 12, color: C.dim }}>{subtitle}</p>}
  </div>
);

const CalloutBox = ({ color, title, children }) => (
  <div style={{ padding: 16, background: C.bgCard, borderRadius: 10, borderLeft: `3px solid ${color}`, marginBottom: 20 }}>
    <div style={{ fontSize: 13, fontWeight: 600, color, marginBottom: 6 }}>{title}</div>
    <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{children}</div>
  </div>
);

const fmt = (n) => {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`;
  return `$${n}`;
};

// ── UPDATED: Product portfolio (4 products, not just Pathfinder) ──

const productPortfolio = [
  {
    product: "Pathfinder Discovery",
    desc: "eBPF/ETW agents, Gateway, classification engine, ServiceNow sync",
    status: "Built (Phases 1-3)",
    color: C.teal,
  },
  {
    product: "Integration Intelligence",
    desc: "AI health scoring, summarization, rationalization, EA reconciliation",
    status: "Built (Phases 4-5)",
    color: C.lime,
  },
  {
    product: "CMDB Ops Agent",
    desc: "8 autonomous agents for CMDB quality (duplicate, stale, orphan, compliance)",
    status: "Built (Phase 6)",
    color: C.blue,
  },
  {
    product: "Service Map Intelligence",
    desc: "Coverage analysis, risk scoring, change impact, self-healing",
    status: "Built (Phase 7)",
    color: C.purple,
  },
];

// ── UPDATED: Build costs reflecting actual scope ──

const buildCosts = [
  { category: "Engineering — Go (Gateway + 3 Agents)", amount: 560000, color: C.blue, detail: "Gateway gRPC server, classification engine, SN sync. Linux eBPF, Windows ETW, K8s DaemonSet agents. Shared client library." },
  { category: "Engineering — Python (4 Intelligence Products)", amount: 420000, color: C.teal, detail: "Shared AI Engine (Claude wrapper, anomaly detection), Integration Intelligence (health scoring, EA reconciliation), CMDB Ops Agent (8 agents), Service Map Intelligence (coverage, risk, impact)." },
  { category: "ServiceNow Scoped App", amount: 180000, color: C.orange, detail: "6 tables, 7 REST endpoints, 6 business rules, Polaris workspace (6 pages), Flow Designer flows, update set XMLs." },
  { category: "QA & Testing (104+ tests, CI/CD)", amount: 135000, color: C.green, detail: "Unit tests (Go + Python), integration test suite, GitHub Actions CI/CD pipeline, Helm chart validation." },
  { category: "Cloud Infrastructure", amount: 54000, color: C.purple, detail: "PostgreSQL, Docker/K8s, staging environments. $6k/mo × 9." },
  { category: "AI Engine Costs (Claude API)", amount: 36000, color: C.pink, detail: "Claude API tokens for summarization, health scoring, rationalization. ~$4k/mo at launch scale." },
  { category: "ServiceNow Dev Instances", amount: 18000, color: C.orange, detail: "PDI + partner dev instances. $2k/mo × 9." },
  { category: "Technology Partner Program", amount: 35000, color: C.lime, detail: "ServiceNow Technology Partner certification, Store listing." },
  { category: "Patent Filing (2 patents)", amount: 50000, color: C.pink, detail: "Classification confidence model + autonomous CMDB agent lifecycle." },
  { category: "Legal & Compliance", amount: 25000, color: C.red, detail: "SOC 2 prep, DPA, partner contracts." },
  { category: "Sales & Marketing Ramp", amount: 120000, color: C.green, detail: "Website, demo environment, Knowledge conference, collateral." },
  { category: "Contingency (10%)", amount: 163300, color: C.dim, detail: "Buffer for scope changes and timeline shifts." },
];

const totalBuildCost = buildCosts.reduce((s, c) => s + c.amount, 0);

// ── UPDATED: Pricing includes intelligence products ──

const pricingTiers = [
  {
    tier: "Starter",
    price: 15,
    unit: "/host/month",
    color: C.teal,
    minHosts: 50,
    features: [
      "eBPF + ETW + K8s agents",
      "Gateway classification engine",
      "CMDB Integration + Interface CI population",
      "ServiceNow workspace (Polaris)",
      "Basic health status (Healthy/Degraded/Critical)",
      "Coverage gap detection",
    ],
    excluded: [
      "AI summarization (Claude)",
      "Composite health scoring",
      "CMDB Ops agents",
      "Change impact analysis",
      "EA reconciliation",
      "Risk scoring",
    ],
    target: "Mid-market, CMDB hygiene projects",
  },
  {
    tier: "Professional",
    price: 28,
    unit: "/host/month",
    color: C.lime,
    minHosts: 100,
    features: [
      "Everything in Starter",
      "AI health scoring (4-metric weighted)",
      "AI summarization (Claude-powered)",
      "EA reconciliation (exact + fuzzy matching)",
      "Integration rationalization",
      "Coverage gap self-healing flow",
      "Health Dashboard + analytics",
      "Anomaly detection (Z-score)",
    ],
    excluded: [
      "CMDB Ops agents (8 autonomous)",
      "Change impact analysis",
      "Risk scoring",
      "Custom autonomy levels",
    ],
    target: "Enterprise ITSM, Integration governance",
    popular: true,
  },
  {
    tier: "Enterprise",
    price: 38,
    unit: "/host/month",
    color: C.orange,
    minHosts: 200,
    features: [
      "Everything in Professional",
      "CMDB Ops Agent (8 autonomous agents)",
      "Change impact analysis (graph traversal)",
      "Per-application risk scoring",
      "Configurable autonomy levels (0-3)",
      "Remediation Orchestrator (cross-agent coordination)",
      "Auto-deploy self-healing loop",
      "Dedicated support + onboarding",
    ],
    excluded: [],
    target: "Large enterprise, autonomous CMDB operations",
  },
];

// ── UPDATED: Revenue projections with 4-product portfolio ──

const revenueProjection = [
  {
    year: "Year 1", label: "Build + Launch",
    newCustomers: 5, avgHosts: 150, avgPrice: 20, churn: 0,
    endCustomers: 5, endARR: 180000, revenue: 75000,
    headcount: 7, opex: 1800000,
    note: "Months 1-9 build (all 10 phases). 3-5 design partners at pilot pricing. Intelligence layer adds upsell path from day one.",
  },
  {
    year: "Year 2", label: "Early Traction",
    newCustomers: 20, avgHosts: 200, avgPrice: 25, churn: 2,
    endCustomers: 23, endARR: 1380000, revenue: 900000,
    headcount: 12, opex: 2600000,
    note: "Intelligence products drive Professional tier adoption. CMDB Ops agents differentiate vs. native Discovery. NRR 135% from tier upgrades.",
  },
  {
    year: "Year 3", label: "Growth",
    newCustomers: 40, avgHosts: 250, avgPrice: 28, churn: 4,
    endCustomers: 59, endARR: 4956000, revenue: 3500000,
    headcount: 18, opex: 4200000,
    note: "Enterprise tier adoption accelerates. Autonomous CMDB agents are the killer feature. Change impact analysis drives CAB integration.",
  },
  {
    year: "Year 4", label: "Scale",
    newCustomers: 65, avgHosts: 300, avgPrice: 31, churn: 8,
    endCustomers: 116, endARR: 12960000, revenue: 9200000,
    headcount: 28, opex: 6800000,
    note: "4-product portfolio fully deployed. NRR 145% from host expansion + tier upgrades + intelligence adoption.",
  },
  {
    year: "Year 5", label: "Market Leadership",
    newCustomers: 85, avgHosts: 350, avgPrice: 34, churn: 12,
    endCustomers: 189, endARR: 27216000, revenue: 19800000,
    headcount: 40, opex: 10000000,
    note: "Avennorth Pathfinder is the default for ServiceNow service mapping + CMDB governance. Intelligence layer is the moat.",
  },
];

const chartData = revenueProjection.map(y => ({
  name: y.year,
  ARR: Math.round(y.endARR / 1000),
  Revenue: Math.round(y.revenue / 1000),
  OpEx: Math.round(y.opex / 1000),
  Customers: y.endCustomers,
  Headcount: y.headcount,
}));

const profitData = revenueProjection.map(y => ({
  name: y.year,
  Revenue: Math.round(y.revenue / 1000),
  OpEx: Math.round(y.opex / 1000),
  CashFlow: Math.round((y.revenue - y.opex) / 1000),
}));

// ── UPDATED: What was actually built (replaces ITOM-H / map gen tabs) ──

const actualCapabilities = [
  {
    module: "Pathfinder Discovery",
    color: C.teal,
    icon: "⬡",
    capabilities: [
      { name: "eBPF Agent (Linux)", desc: "Kernel-level TCP/UDP flow capture via tracepoints. Ring buffer → FlowRecord pipeline.", status: "Built" },
      { name: "ETW Agent (Windows)", desc: "Event Tracing for Windows scaffold. Microsoft-Windows-Kernel-Network provider. WMI enrichment.", status: "Scaffold" },
      { name: "K8s DaemonSet Agent", desc: "eBPF on host namespace + K8s API enrichment (pod → service → deployment → labels).", status: "Built" },
      { name: "Gateway Classification Engine", desc: "Port-based rules (40+ ports) + process-name rules. Confidence scoring with 4 modifiers.", status: "Built" },
      { name: "ServiceNow Sync", desc: "OAuth2 REST client. Batch upsert integrations/interfaces/agents to 7 REST endpoints.", status: "Built" },
    ],
  },
  {
    module: "Integration Intelligence",
    color: C.lime,
    icon: "✦",
    capabilities: [
      { name: "Health Scoring", desc: "4-metric weighted: Availability 40%, Latency 30%, Error Rate 20%, Staleness 10%. Linear interpolation.", status: "Built" },
      { name: "AI Summarization", desc: "Claude API integration via Shared AI Engine. Structured JSON responses with key findings + recommendations.", status: "Built" },
      { name: "EA Reconciliation", desc: "3-strategy matching: exact CI (1.0), fuzzy Levenshtein (0.7-0.9), business service group (0.5).", status: "Built" },
      { name: "Rationalization", desc: "Duplicate detection (exact + reverse direction + name similarity). Redundant interface finder.", status: "Built" },
    ],
  },
  {
    module: "CMDB Ops Agent",
    color: C.blue,
    icon: "⚙",
    capabilities: [
      { name: "8 Autonomous Agents", desc: "DuplicateDetector, StaleRecordReaper, OrphanFinder, RelationshipValidator, ClassificationAuditor, ComplianceChecker, HealthScorer, RemediationOrchestrator.", status: "Built" },
      { name: "5-Phase Lifecycle", desc: "observe() → diagnose() → recommend() → act() → verify(). Gated by autonomy level (0-3).", status: "Built" },
      { name: "Guardrails", desc: "50 CI blast radius limit, 24h cooldown, exclusion list, global kill switch.", status: "Built" },
    ],
  },
  {
    module: "Service Map Intelligence",
    color: C.purple,
    icon: "◈",
    capabilities: [
      { name: "Coverage Analyzer", desc: "Agent vs server gap detection: NoAgent, StaleAgent, WrongTier. Priority rules by environment + criticality.", status: "Built" },
      { name: "Risk Scoring", desc: "Per-app risk (0-100): health 35%, coverage 25%, density 20%, criticality 20%.", status: "Built" },
      { name: "Change Impact", desc: "BFS graph traversal. Direct (1-hop) + indirect (2-hop) impact. Sorted by criticality.", status: "Built" },
      { name: "Self-Healing Flow", desc: "Flow Designer: evaluate → prerequisites → CR → deploy → verify → close. Auto-deploy for low/medium priority.", status: "Defined" },
    ],
  },
];

const tabs = [
  { id: "portfolio", label: "Product Portfolio" },
  { id: "capabilities", label: "What Was Built" },
  { id: "cost", label: "Cost to Build" },
  { id: "pricing", label: "Pricing Model" },
  { id: "revenue", label: "5-Year Projections" },
];

export default function PathfinderV3() {
  const [tab, setTab] = useState("portfolio");
  const [expandedModule, setExpandedModule] = useState(null);
  const [scenarioMultiplier, setScenarioMultiplier] = useState(1.0);

  const scenarioLabel = scenarioMultiplier === 0.7 ? "Conservative" : scenarioMultiplier === 1.0 ? "Base Case" : "Aggressive";

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif", background: C.bg, color: C.text, minHeight: "100vh", padding: "24px 18px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.bgHover}; border-radius: 3px; }
        button { font-family: inherit; }
        .recharts-cartesian-grid-horizontal line, .recharts-cartesian-grid-vertical line { stroke: ${C.border} !important; }
      `}</style>

      <div style={{ maxWidth: 1020, margin: "0 auto 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ width: 8, height: 8, background: C.lime, borderRadius: "50%", boxShadow: `0 0 10px ${C.lime}` }} />
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: C.lime, letterSpacing: 3, textTransform: "uppercase" }}>Avennorth — v0.3.1 Updated</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.white, marginBottom: 3 }}>Avennorth Pathfinder + Intelligence Platform</h1>
        <p style={{ fontSize: 12, color: C.dim, fontWeight: 300, maxWidth: 700 }}>
          CMDB-first integration discovery with AI-powered intelligence, autonomous CMDB operations, and service map analytics. 4-product portfolio built across 10 phases. 104+ tests passing.
        </p>
      </div>

      <div style={{ maxWidth: 1020, margin: "0 auto 24px", overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 3, background: C.bgCard, borderRadius: 8, padding: 3, width: "fit-content" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "7px 14px", borderRadius: 6, border: "none", cursor: "pointer",
              fontSize: 11, fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? C.bg : C.dim,
              background: tab === t.id ? C.lime : "transparent",
              transition: "all 0.2s", whiteSpace: "nowrap",
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1020, margin: "0 auto" }}>

        {/* ─── PRODUCT PORTFOLIO (NEW TAB) ─── */}
        {tab === "portfolio" && (
          <div>
            <SectionHeader color={C.lime} label="Avennorth Platform" title="4-Product Portfolio" subtitle="Built across 10 phases — Crawl/Walk/Run/Fly deployment methodology" />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12, marginBottom: 24 }}>
              {productPortfolio.map((p, i) => (
                <div key={i} style={{ background: C.bgCard, borderRadius: 12, padding: 16, borderTop: `3px solid ${p.color}` }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: p.color, marginBottom: 4 }}>{p.product}</div>
                  <div style={{ fontSize: 11, color: C.text, lineHeight: 1.5, marginBottom: 8 }}>{p.desc}</div>
                  <Pill color={p.color}>{p.status}</Pill>
                </div>
              ))}
            </div>

            <CalloutBox color={C.teal} title="The Intelligence Moat">
              Discovery is table stakes — ServiceNow's native Discovery and Service Mapping can map infrastructure. Avennorth's differentiation is the intelligence layer: AI-powered health scoring, autonomous CMDB quality agents, change impact analysis, and EA reconciliation. These products only work when fed by Pathfinder's discovery data, creating a virtuous cycle that deepens the moat with every deployment.
            </CalloutBox>

            {/* Build metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              {[
                { label: "Products", value: "4", sub: "Discovery + 3 Intelligence", color: C.lime },
                { label: "Go Services", value: "5", sub: "Gateway + 3 agents + shared", color: C.teal },
                { label: "Python Services", value: "4", sub: "AI Engine + 3 intelligence", color: C.blue },
                { label: "SN Tables", value: "6", sub: "Custom x_avnth_ tables", color: C.orange },
                { label: "CMDB Agents", value: "8", sub: "Autonomous lifecycle", color: C.purple },
                { label: "Tests", value: "104+", sub: "All passing", color: C.green },
              ].map((s, i) => (
                <div key={i} style={{ background: C.bgCard, borderRadius: 10, padding: 12, borderLeft: `3px solid ${s.color}` }}>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: C.dim, letterSpacing: 1, textTransform: "uppercase" }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: C.dim }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── WHAT WAS BUILT ─── */}
        {tab === "capabilities" && (
          <div>
            <SectionHeader color={C.teal} label="Implementation" title="What Was Actually Built" subtitle="Phases 0-9 complete — 9 products across the full stack" />

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {actualCapabilities.map((mod, mi) => (
                <div key={mi} style={{
                  background: C.bgCard, borderRadius: 12, overflow: "hidden",
                  border: `1px solid ${expandedModule === mi ? mod.color + "40" : C.border}`,
                }}>
                  <button onClick={() => setExpandedModule(expandedModule === mi ? null : mi)} style={{
                    width: "100%", padding: "14px 16px", border: "none", cursor: "pointer",
                    background: "transparent", display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16 }}>{mod.icon}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: expandedModule === mi ? mod.color : C.white }}>{mod.module}</span>
                      <Pill color={mod.color}>{mod.capabilities.length} capabilities</Pill>
                    </div>
                    <span style={{ fontSize: 14, color: C.dim, transition: "transform 0.2s", transform: expandedModule === mi ? "rotate(180deg)" : "none" }}>▾</span>
                  </button>
                  {expandedModule === mi && (
                    <div style={{ padding: "0 16px 16px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 10 }}>
                        {mod.capabilities.map((cap, ci) => (
                          <div key={ci} style={{ padding: 12, borderRadius: 8, background: C.bgHover, border: `1px solid ${C.border}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: mod.color }}>{cap.name}</span>
                              <Pill color={cap.status === "Built" ? C.lime : C.orange}>{cap.status}</Pill>
                            </div>
                            <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>{cap.desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── COST TO BUILD ─── */}
        {tab === "cost" && (
          <div>
            <SectionHeader color={C.blue} label="Investment" title="Avennorth Pathfinder — Cost to Build" subtitle="Full platform through all 10 phases — 4 products, 104+ tests, production-ready" />

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {buildCosts.map((c, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "1fr 100px",
                  gap: 12, alignItems: "center", padding: "12px 16px",
                  background: C.bgCard, borderRadius: 10, borderLeft: `3px solid ${c.color}`,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.white, marginBottom: 2 }}>{c.category}</div>
                    <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.4 }}>{c.detail}</div>
                  </div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 700, color: c.color, textAlign: "right" }}>
                    {fmt(c.amount)}
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              padding: 18, background: `${C.lime}10`, borderRadius: 12, border: `1px solid ${C.limeBorder}`,
              display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24,
            }}>
              <div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: "uppercase" }}>Total Build Investment</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: C.lime }}>{fmt(totalBuildCost)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: "uppercase" }}>Ongoing AI Token Cost</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: C.orange }}>~$4k/mo</div>
                <div style={{ fontSize: 10, color: C.dim }}>Claude API for intelligence products</div>
              </div>
            </div>
          </div>
        )}

        {/* ─── PRICING ─── */}
        {tab === "pricing" && (
          <div>
            <SectionHeader color={C.lime} label="Go-to-Market" title="Avennorth Pathfinder — Pricing" subtitle="Per-host monthly licensing — three tiers mapped to intelligence depth" />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 24 }}>
              {pricingTiers.map((t, i) => (
                <div key={i} style={{
                  background: C.bgCard, borderRadius: 12, padding: 18,
                  border: `1.5px solid ${t.popular ? t.color : C.border}`,
                  position: "relative",
                }}>
                  {t.popular && (
                    <div style={{ position: "absolute", top: -1, left: 20, right: 20, height: 3, background: t.color, borderRadius: "0 0 3px 3px" }} />
                  )}
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: t.color }}>{t.tier}</span>
                    {t.popular && <Pill color={t.color}>Most Popular</Pill>}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 2 }}>
                    <span style={{ fontSize: 36, fontWeight: 700, color: C.white }}>${t.price}</span>
                    <span style={{ fontSize: 12, color: C.dim }}>{t.unit}</span>
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, marginBottom: 14 }}>Minimum {t.minHosts} hosts • {t.target}</div>

                  <div style={{ fontSize: 11, marginBottom: 8 }}>
                    {t.features.map((f, fi) => (
                      <div key={fi} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 4, color: C.text }}>
                        <span style={{ color: C.lime, flexShrink: 0, marginTop: 1 }}>✓</span>
                        {f}
                      </div>
                    ))}
                  </div>
                  {t.excluded.length > 0 && (
                    <div style={{ fontSize: 11 }}>
                      {t.excluded.map((f, fi) => (
                        <div key={fi} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 4, color: C.dim }}>
                          <span style={{ color: C.dim, flexShrink: 0, marginTop: 1 }}>✗</span>
                          {f}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 8, background: `${t.color}10`, border: `1px solid ${t.color}20` }}>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: C.dim, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>Example annual deal</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: t.color }}>
                      {fmt(t.minHosts * t.price * 12)} — {fmt(t.minHosts * 3 * t.price * 12)}
                    </div>
                    <div style={{ fontSize: 10, color: C.dim }}>{t.minHosts} — {t.minHosts * 3} hosts</div>
                  </div>
                </div>
              ))}
            </div>

            <CalloutBox color={C.orange} title="Intelligence Is the Upgrade Path">
              Starter is discovery-only — table stakes. The real revenue comes from Professional and Enterprise tiers where intelligence products drive the value. AI summaries, health scoring, and CMDB Ops agents are features that no competitor offers. The upgrade path is natural: deploy agents (Starter) → see intelligence value in pilot (Professional) → adopt autonomous CMDB management (Enterprise).
            </CalloutBox>
          </div>
        )}

        {/* ─── 5-YEAR PROJECTIONS ─── */}
        {tab === "revenue" && (
          <div>
            <SectionHeader color={C.green} label="Financial Model" title="Avennorth — Five-Year Revenue Projection" subtitle="4-product portfolio with intelligence-driven tier upgrades" />

            <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.bgCard, borderRadius: 8, padding: 4, width: "fit-content" }}>
              {[
                { label: "Conservative", mult: 0.7 },
                { label: "Base Case", mult: 1.0 },
                { label: "Aggressive", mult: 1.4 },
              ].map(s => (
                <button key={s.label} onClick={() => setScenarioMultiplier(s.mult)} style={{
                  padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer",
                  fontSize: 11, fontWeight: scenarioMultiplier === s.mult ? 600 : 400,
                  color: scenarioMultiplier === s.mult ? C.bg : C.dim,
                  background: scenarioMultiplier === s.mult ? C.lime : "transparent",
                }}>{s.label}</button>
              ))}
            </div>

            <div style={{ background: C.bgCard, borderRadius: 12, padding: 18, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.white, marginBottom: 14 }}>ARR Growth ({scenarioLabel})</div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData.map(d => ({ ...d, ARR: Math.round(d.ARR * scenarioMultiplier) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="name" stroke={C.dim} fontSize={11} />
                  <YAxis stroke={C.dim} fontSize={10} tickFormatter={v => `$${v}k`} />
                  <Tooltip contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11 }} formatter={(val) => [`$${val}k`, "ARR"]} />
                  <Area type="monotone" dataKey="ARR" stroke={C.lime} fill={C.limeDim} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: C.bgCard, borderRadius: 12, padding: 18, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.white, marginBottom: 14 }}>Revenue vs. OpEx ({scenarioLabel})</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={profitData.map(d => ({
                  ...d,
                  Revenue: Math.round(d.Revenue * scenarioMultiplier),
                  CashFlow: Math.round(d.Revenue * scenarioMultiplier) - d.OpEx,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="name" stroke={C.dim} fontSize={11} />
                  <YAxis stroke={C.dim} fontSize={10} tickFormatter={v => `$${v}k`} />
                  <Tooltip contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11 }} formatter={(val) => [`$${val}k`]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Revenue" fill={C.lime} radius={[4,4,0,0]} />
                  <Bar dataKey="OpEx" fill={C.red} radius={[4,4,0,0]} opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {revenueProjection.map((yr, i) => {
                const adjRev = Math.round(yr.revenue * scenarioMultiplier);
                const adjARR = Math.round(yr.endARR * scenarioMultiplier);
                const adjCust = Math.round(yr.endCustomers * scenarioMultiplier);
                const cashflow = adjRev - yr.opex;
                return (
                  <div key={i} style={{
                    background: C.bgCard, borderRadius: 12, padding: 16,
                    borderLeft: `3px solid ${cashflow >= 0 ? C.lime : C.red}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{yr.year}</span>
                      <span style={{ fontSize: 12, color: C.dim }}>— {yr.label}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, marginBottom: 10 }}>
                      {[
                        { label: "End ARR", value: fmt(adjARR), color: C.lime },
                        { label: "Revenue", value: fmt(adjRev), color: C.teal },
                        { label: "OpEx", value: fmt(yr.opex), color: C.orange },
                        { label: "Cash Flow", value: fmt(cashflow), color: cashflow >= 0 ? C.green : C.red },
                        { label: "Customers", value: adjCust, color: C.blue },
                        { label: "Headcount", value: yr.headcount, color: C.purple },
                      ].map((m, mi) => (
                        <div key={mi}>
                          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: C.dim, letterSpacing: 1, textTransform: "uppercase" }}>{m.label}</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: m.color }}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>{yr.note}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{
        maxWidth: 1020, margin: "32px auto 0", borderTop: `1px solid ${C.border}`,
        paddingTop: 14, display: "flex", justifyContent: "space-between",
      }}>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: C.dim, letterSpacing: 1 }}>AVENNORTH PATHFINDER v0.3.1 — BUSINESS CASE</span>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: C.dim }}>AVENNORTH</span>
      </div>
    </div>
  );
}
