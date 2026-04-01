/**
 * Avennorth Pathfinder — Lean Build Model v0.5.1 (Updated)
 *
 * Changes from v0.5:
 * - Updated staffing to include Python/AI skills for intelligence layer
 * - Added Claude API token costs (~$4k/mo) to operating costs
 * - Updated Year 1 scope to reflect all 10 phases actually built
 * - Corrected skill requirements: Go + Python + ServiceNow (not just Go)
 * - Updated ARR projections for 4-product portfolio
 * - Avennorth branding throughout
 * - Validated: lean/bootstrap thesis confirmed by actual build
 */
import { useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend, ComposedChart } from "recharts";

const C = {
  bg: "#0c0c18", bgCard: "#151525", bgHover: "#1c1c30",
  lime: "#c8ff00", limeDim: "rgba(200,255,0,0.12)", limeBorder: "rgba(200,255,0,0.25)",
  teal: "#00d4aa", blue: "#4080ff", orange: "#ff8c40", purple: "#a070ff",
  red: "#ff4060", pink: "#ff60a0", white: "#f0f0f8", text: "#c0c0d4",
  dim: "#6a6a84", border: "rgba(255,255,255,0.06)", green: "#40cc80", cyan: "#00c8ff",
};

const Pill = ({ children, color = C.dim }) => (
  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, padding: "3px 8px", borderRadius: 4, background: `${color}18`, color, whiteSpace: "nowrap" }}>{children}</span>
);

const SectionHeader = ({ color, label, title, subtitle }) => (
  <div style={{ marginBottom: 18 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
      <div style={{ width: 3, height: 16, background: color, borderRadius: 2 }} />
      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color, letterSpacing: 2, textTransform: "uppercase" }}>{label}</span>
    </div>
    <h2 style={{ fontSize: 18, fontWeight: 700, color: C.white, marginBottom: 2 }}>{title}</h2>
    {subtitle && <p style={{ fontSize: 12, color: C.dim }}>{subtitle}</p>}
  </div>
);

const CalloutBox = ({ color, title, children }) => (
  <div style={{ padding: 16, background: C.bgCard, borderRadius: 10, borderLeft: `3px solid ${color}`, marginBottom: 18 }}>
    <div style={{ fontSize: 13, fontWeight: 600, color, marginBottom: 6 }}>{title}</div>
    <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{children}</div>
  </div>
);

const fmt = (n) => {
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${Math.round(n)}`;
};

// ── UPDATED: Staffing includes Python/AI skills ──

const leanStaffing = [
  {
    year: "Year 1",
    total: 5,
    newHires: 2,
    roles: [
      { role: "Founder / Product + Architecture", type: "existing", cost: 0, note: "Product vision, CSDM architecture, customer relationships. Not a salary line — founder equity.", color: C.lime },
      { role: "Go / Systems Engineer", type: "new hire", cost: 190000, note: "eBPF agent, gateway gRPC server, classification engine. Senior Go dev with systems experience.", color: C.teal },
      { role: "Python / AI Engineer", type: "new hire", cost: 185000, note: "Shared AI Engine, Integration Intelligence, CMDB Ops agents, Service Map Intelligence. FastAPI + Claude API integration.", color: C.blue },
      { role: "ServiceNow Developer", type: "existing", cost: 0, note: "From existing Avennorth team. Scoped app, workspace (Polaris/UI Builder), Flow Designer, business rules.", color: C.orange },
      { role: "QA / DevOps", type: "existing", cost: 0, note: "From existing Avennorth team. CI/CD (GitHub Actions), agent packaging, multi-OS testing, Helm charts.", color: C.purple },
    ],
  },
  {
    year: "Year 2",
    total: 7,
    newHires: 2,
    roles: [
      { role: "Go / Platform Engineer", type: "new hire", cost: 180000, note: "Windows ETW agent production-ready, K8s enrichment, gateway scaling, extended collectors.", color: C.teal },
      { role: "Channel Manager", type: "new hire", cost: 140000, note: "Manages Compass partner relationships. Trains consulting firms on Avennorth Pathfinder deployment.", color: C.cyan },
      { role: "+ 5 from Year 1", type: "existing", cost: 0, note: "Continued from Year 1.", color: C.dim },
    ],
  },
  {
    year: "Year 3",
    total: 9,
    newHires: 2,
    roles: [
      { role: "Support Engineer", type: "new hire", cost: 130000, note: "Technical support for channel partners and direct clients. Agent troubleshooting, SN workspace issues.", color: C.green },
      { role: "Content / Developer Marketing", type: "new hire", cost: 120000, note: "Documentation, partner enablement, blog, conference content. Technical writer who markets.", color: C.pink },
      { role: "+ 7 from Year 2", type: "existing", cost: 0, note: "Continued.", color: C.dim },
    ],
  },
  {
    year: "Year 4",
    total: 11,
    newHires: 2,
    roles: [
      { role: "Senior AI/ML Engineer", type: "new hire", cost: 210000, note: "Advanced anomaly detection, predictive health scoring, autonomous agent improvements. R&D depth.", color: C.blue },
      { role: "Second Support Engineer", type: "new hire", cost: 130000, note: "Scaling support capacity as client base grows past 150+.", color: C.green },
      { role: "+ 9 from Year 3", type: "existing", cost: 0, note: "Continued.", color: C.dim },
    ],
  },
  {
    year: "Year 5",
    total: 14,
    newHires: 3,
    roles: [
      { role: "Second Channel Manager", type: "new hire", cost: 145000, note: "Compass partner base past 80+. Splitting territory.", color: C.cyan },
      { role: "Platform Engineer", type: "new hire", cost: 185000, note: "Multi-tenancy, extended collectors (mainframe SMF, storage, NetFlow), collector SDK.", color: C.purple },
      { role: "Customer Success Manager", type: "new hire", cost: 125000, note: "Proactive expansion with top-tier clients. Drives NRR higher.", color: C.orange },
      { role: "+ 11 from Year 4", type: "existing", cost: 0, note: "Continued.", color: C.dim },
    ],
  },
];

// ── UPDATED: Costs include Claude API + actual scope ──

const existingTeamCost = 420000;

// ── Likely Case (Penetration Pricing = Base Plan) ──
// Scenarios: Bear (0.4x), Likely/Base (1.0x), Bull (1.3x), Best Case (1.6x)

const yearlyFinancials = [
  {
    year: "Y1", label: "Build All 10 Phases + First Customers",
    newHireCost: 375000, existingTeamAlloc: existingTeamCost, infra: 48000, snLicenses: 12000, legal: 40000, patent: 50000, partner: 35000, marketing: 30000, aiTokens: 24000, contingency: 0,
    compassPartners: 0, directClients: 15, channelClients: 24, totalClients: 39,
    avgHostsNew: 0, avgPrice: 0, arr: 3000, revenue: 1500,
    headcount: 5,
    note: "All 10 phases built. 39 customers on penetration pricing ($50K/yr entry). Self-serve onboarding investment. Profitable in Y1.",
  },
  {
    year: "Y2", label: "Compass Launch + Std→Pro Upgrades",
    newHireCost: 320000, existingTeamAlloc: existingTeamCost, infra: 60000, snLicenses: 15000, legal: 15000, patent: 0, partner: 10000, marketing: 45000, aiTokens: 48000, contingency: 0,
    compassPartners: 20, directClients: 24, channelClients: 70, totalClients: 94,
    avgHostsNew: 0, avgPrice: 0, arr: 10200, revenue: 6600,
    headcount: 7,
    note: "20 Compass partners. 15% Std→Pro upgrade. Standard dashboards surface Professional-only insights. Dedicated support team.",
  },
  {
    year: "Y3", label: "Channel Flywheel + Price Increases",
    newHireCost: 250000, existingTeamAlloc: existingTeamCost, infra: 84000, snLicenses: 18000, legal: 10000, patent: 0, partner: 10000, marketing: 60000, aiTokens: 72000, contingency: 0,
    compassPartners: 45, directClients: 35, channelClients: 145, totalClients: 180,
    avgHostsNew: 0, avgPrice: 0, arr: 24500, revenue: 17000,
    headcount: 9,
    note: "45 partners. 25% Std→Pro upgrade. 3% price increase. CoreX consultants drive upgrade conversations at quarterly reviews.",
  },
  {
    year: "Y4", label: "Scaling",
    newHireCost: 340000, existingTeamAlloc: existingTeamCost, infra: 108000, snLicenses: 20000, legal: 10000, patent: 15000, partner: 10000, marketing: 80000, aiTokens: 96000, contingency: 0,
    compassPartners: 70, directClients: 50, channelClients: 251, totalClients: 301,
    avgHostsNew: 0, avgPrice: 0, arr: 48000, revenue: 36000,
    headcount: 11,
    note: "70 partners. 35% Std→Pro upgrade. Portfolio flywheel: Pathfinder → Bearing → Contour → Vantage.",
  },
  {
    year: "Y5", label: "Market Leader (Likely Case)",
    newHireCost: 455000, existingTeamAlloc: existingTeamCost, infra: 144000, snLicenses: 24000, legal: 10000, patent: 0, partner: 10000, marketing: 100000, aiTokens: 120000, contingency: 0,
    compassPartners: 100, directClients: 70, channelClients: 476, totalClients: 546,
    avgHostsNew: 0, avgPrice: 0, arr: 84000, revenue: 66000,
    headcount: 14,
    note: "546 customers. ~$84M ARR at 91.6% EBITDA. Bear: ~$33M/217. Bull: ~$110M/710. Best: ~$135M/875.",
  },
];

const salaryAccum = [0, 375000, 695000, 945000, 1285000, 1740000];
const fullYears = yearlyFinancials.map((y, i) => {
  const priorSalaries = i > 0 ? salaryAccum[i] : 0;
  const raiseBudget = i > 0 ? Math.round(priorSalaries * 0.04) : 0;
  const totalOpex = y.newHireCost + y.existingTeamAlloc + y.infra + y.snLicenses + y.legal + y.patent + y.partner + y.marketing + y.aiTokens + y.contingency;
  const fullOpex = totalOpex + priorSalaries + raiseBudget;
  const fullCashFlow = (y.revenue * 1000) - fullOpex;
  return { ...y, totalOpex, fullOpex, fullCashFlow, priorSalaries, raiseBudget };
});

const arrChart = fullYears.map(y => ({ name: y.year, ARR: y.arr, Customers: y.totalClients, Partners: y.compassPartners }));

const tabs = [
  { id: "team", label: "Lean Team Plan" },
  { id: "costs", label: "Real Cost Model" },
  { id: "efficiency", label: "Capital Efficiency" },
];

export default function PathfinderV5() {
  const [tab, setTab] = useState("team");
  const [scenario, setScenario] = useState(1.0);
  const [expandedYear, setExpandedYear] = useState(null);
  const sLabel = scenario === 0.4 ? "Bear" : scenario === 1.0 ? "Likely (Base)" : scenario === 1.3 ? "Bull" : "Best Case";

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
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: C.lime, letterSpacing: 3, textTransform: "uppercase" }}>Avennorth — v0.5.1 Lean</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.white, marginBottom: 3 }}>Avennorth Pathfinder — Lean Build Model</h1>
        <p style={{ fontSize: 12, color: C.dim, fontWeight: 300, maxWidth: 720 }}>
          Validated by actual build: 10 phases, 4 products, 104+ tests built with existing Avennorth team + AI-assisted development. Bootstrappable. Go + Python + ServiceNow stack.
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

        {tab === "team" && (
          <div>
            <SectionHeader color={C.teal} label="People Plan" title="Year-by-Year Hiring" subtitle="3 existing Avennorth team + 2 new hires Year 1. Growing to 14 by Year 5." />

            <CalloutBox color={C.lime} title="Four Force Multipliers (Validated)">
              <strong style={{ color: C.teal }}>Existing team:</strong> SN developer and QA/DevOps already on payroll — they built the scoped app, Polaris workspace, Helm charts, and CI/CD.{" "}
              <strong style={{ color: C.blue }}>AI-assisted dev:</strong> Claude Code built 10 phases with 104+ tests. Each engineer ships 2-3x.{" "}
              <strong style={{ color: C.cyan }}>Compass distribution:</strong> No sales team. Channel managers enable partners.{" "}
              <strong style={{ color: C.purple }}>Full-stack AI:</strong> Python intelligence layer (Claude API wrapper, anomaly detection, 8 autonomous agents) was built in parallel with Go services.
            </CalloutBox>

            <div style={{ display: "flex", gap: 6, alignItems: "flex-end", marginBottom: 24, height: 120, padding: "0 20px" }}>
              {leanStaffing.map((yr, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, fontWeight: 700, color: C.lime }}>{yr.total}</span>
                  <div style={{ width: "100%", maxWidth: 60, height: `${(yr.total / 16) * 90}px`, background: `linear-gradient(to top, ${C.lime}30, ${C.lime}08)`, border: `1px solid ${C.limeBorder}`, borderRadius: "6px 6px 0 0" }} />
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: C.dim }}>{yr.year}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {leanStaffing.map((yr, yi) => (
                <div key={yi} style={{ background: C.bgCard, borderRadius: 12, overflow: "hidden", border: `1px solid ${expandedYear === yi ? C.lime + "40" : C.border}` }}>
                  <button onClick={() => setExpandedYear(expandedYear === yi ? null : yi)} style={{ width: "100%", padding: "14px 16px", border: "none", cursor: "pointer", background: "transparent", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{yr.year}</span>
                      <Pill color={C.lime}>{yr.total} people</Pill>
                      <Pill color={C.teal}>+{yr.newHires} new</Pill>
                    </div>
                    <span style={{ fontSize: 14, color: C.dim, transition: "transform 0.2s", transform: expandedYear === yi ? "rotate(180deg)" : "none" }}>▾</span>
                  </button>
                  {expandedYear === yi && (
                    <div style={{ padding: "0 16px 16px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 8 }}>
                        {yr.roles.map((r, ri) => (
                          <div key={ri} style={{ padding: 12, borderRadius: 8, background: r.type === "new hire" ? C.bgHover : `${C.dim}08`, borderLeft: `3px solid ${r.color}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: r.color }}>{r.role}</span>
                              <Pill color={r.type === "new hire" ? C.teal : C.dim}>{r.type === "new hire" ? "NEW HIRE" : "EXISTING"}</Pill>
                            </div>
                            {r.cost > 0 && <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: C.white, marginBottom: 4 }}>{fmt(r.cost)}<span style={{ fontSize: 10, color: C.dim }}> loaded annual</span></div>}
                            <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>{r.note}</div>
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

        {tab === "costs" && (
          <div>
            <SectionHeader color={C.orange} label="Financials" title="Avennorth — Real Cost Model" subtitle="Includes Claude API token costs, Python/AI engineering, actual 4-product scope" />

            <CalloutBox color={C.teal} title="What Changed From v0.5">
              Added Claude API token costs (~$2-10k/mo scaling with usage), replaced second Go engineer with Python/AI engineer to build the intelligence layer, and updated Year 1 scope to reflect all 10 phases actually built. The lean thesis is validated — but the skill mix is Go + Python + ServiceNow, not just Go.
            </CalloutBox>

            <div style={{ display: "flex", gap: 3, marginBottom: 18, background: C.bgCard, borderRadius: 8, padding: 3, width: "fit-content" }}>
              {[{ l: "Bear", m: 0.4 }, { l: "Likely (Base)", m: 1.0 }, { l: "Bull", m: 1.3 }, { l: "Best Case", m: 1.6 }].map(s => (
                <button key={s.l} onClick={() => setScenario(s.m)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: scenario === s.m ? 600 : 400, color: scenario === s.m ? C.bg : C.dim, background: scenario === s.m ? C.lime : "transparent" }}>{s.l}</button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {fullYears.map((y, i) => {
                const adjRev = Math.round(y.revenue * scenario * 1000);
                const adjCF = adjRev - y.fullOpex;
                return (
                  <div key={i} style={{ background: C.bgCard, borderRadius: 12, padding: 16, borderLeft: `3px solid ${adjCF >= 0 ? C.lime : C.orange}` }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: C.white }}>{y.year}</span>
                      <span style={{ fontSize: 12, color: C.dim }}>{y.label}</span>
                      <Pill color={C.purple}>{y.headcount} people</Pill>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 6, marginBottom: 12 }}>
                      {[
                        { label: "New Hires", value: y.newHireCost, color: C.teal },
                        { label: "Prior Salaries", value: y.priorSalaries, color: C.blue },
                        { label: "Existing Team", value: y.existingTeamAlloc, color: C.purple },
                        { label: "AI Tokens", value: y.aiTokens, color: C.pink },
                        { label: "Infrastructure", value: y.infra, color: C.orange },
                        { label: "Legal + Patent", value: y.legal + y.patent, color: C.dim },
                        { label: "Partner + Mktg", value: y.partner + y.marketing, color: C.cyan },
                      ].filter(c => c.value > 0).map((c, ci) => (
                        <div key={ci}>
                          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: C.dim, letterSpacing: 1, textTransform: "uppercase" }}>{c.label}</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: c.color }}>{fmt(c.value)}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, padding: "10px 12px", background: `${adjCF >= 0 ? C.lime : C.orange}08`, borderRadius: 8, border: `1px solid ${adjCF >= 0 ? C.limeBorder : C.orange + "30"}` }}>
                      {[
                        { label: "Total OpEx", value: fmt(y.fullOpex), color: C.orange },
                        { label: `Revenue (${sLabel})`, value: fmt(adjRev), color: C.teal },
                        { label: "Cash Flow", value: fmt(adjCF), color: adjCF >= 0 ? C.lime : C.red },
                        { label: "ARR", value: fmt(Math.round(y.arr * scenario * 1000)), color: C.lime },
                      ].map((s, si) => (
                        <div key={si}>
                          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: C.dim, letterSpacing: 1, textTransform: "uppercase" }}>{s.label}</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5, marginTop: 8 }}>{y.note}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "efficiency" && (
          <div>
            <SectionHeader color={C.green} label="Validated" title="Capital Efficiency — Confirmed by Build" subtitle="10 phases, 4 products, 104+ tests built lean. The thesis holds." />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 20 }}>
              <div style={{ background: C.bgCard, borderRadius: 12, padding: 16, borderTop: `3px solid ${C.lime}` }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.lime, marginBottom: 12 }}>vs. Typical SaaS at $40M ARR</div>
                {[
                  { label: "Typical headcount", value: "150-250", note: "Sales, marketing, CS, support, G&A" },
                  { label: "Avennorth headcount", value: "14", note: "Compass eliminates 80% of GTM roles" },
                  { label: "Typical ARR/employee", value: "$150-250k", note: "SaaS median" },
                  { label: "Avennorth ARR/employee", value: "$2.86M", note: "11-19x the industry median" },
                ].map((s, si) => (
                  <div key={si} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div>
                      <span style={{ fontSize: 12, color: C.text }}>{s.label}</span>
                      <div style={{ fontSize: 10, color: C.dim }}>{s.note}</div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.lime, whiteSpace: "nowrap", marginLeft: 8 }}>{s.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: C.bgCard, borderRadius: 12, padding: 16, borderTop: `3px solid ${C.teal}` }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.teal, marginBottom: 12 }}>What Was Actually Built (Lean)</div>
                {[
                  { label: "Languages", value: "Go + Python + JS", note: "Go: agents/gateway. Python: intelligence. JS: ServiceNow." },
                  { label: "Go services", value: "5 binaries", note: "Gateway, Linux/Windows/K8s agents, mock-agent" },
                  { label: "Python services", value: "4 FastAPI apps", note: "AI Engine, IntegIntel, CMDB Ops, Service Map" },
                  { label: "SN artifacts", value: "50+ records", note: "6 tables, 7 REST, 6 BR, 6 workspace pages, 3 flows" },
                  { label: "Tests", value: "104+ passing", note: "Unit + integration + CI/CD pipeline" },
                ].map((s, si) => (
                  <div key={si} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div>
                      <span style={{ fontSize: 12, color: C.text }}>{s.label}</span>
                      <div style={{ fontSize: 10, color: C.dim }}>{s.note}</div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.teal, whiteSpace: "nowrap", marginLeft: 8 }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <CalloutBox color={C.lime} title="The Bootstrappability Argument (Validated)">
              Year 1 all-in cost is ~$1.03M. With 3 existing team members on Avennorth payroll, the incremental investment is roughly $610k — two engineer salaries plus infrastructure, AI tokens, and legal. The 10-phase build was completed with AI-assisted development (Claude Code), validating the 2-3x productivity multiplier. Avennorth Pathfinder can be built from cash flow, not pitch decks.
            </CalloutBox>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1020, margin: "32px auto 0", borderTop: `1px solid ${C.border}`, paddingTop: 14, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: C.dim, letterSpacing: 1 }}>AVENNORTH PATHFINDER v0.5.1 — LEAN MODEL</span>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: C.dim }}>AVENNORTH</span>
      </div>
    </div>
  );
}
