/**
 * Avennorth Pathfinder × Compass — Channel Strategy v0.4.1 (Updated)
 *
 * Changes from v0.4:
 * - Updated projections for 4-product portfolio (Discovery + 3 Intelligence)
 * - Added intelligence products to channel deal economics
 * - Updated pricing examples with Professional/Enterprise tier intelligence features
 * - Avennorth branding throughout
 * - Added note on channel-enabling features needed (multi-tenancy, partner billing)
 *
 * Core channel thesis UNCHANGED — Compass as distribution engine remains valid.
 * The intelligence layer strengthens the flywheel (more products = more expansion = higher NRR).
 */
import { useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend, ComposedChart } from "recharts";

const C = {
  bg: "#0c0c18", bgCard: "#151525", bgHover: "#1c1c30",
  lime: "#c8ff00", limeDim: "rgba(200,255,0,0.12)", limeBorder: "rgba(200,255,0,0.25)",
  teal: "#00d4aa", blue: "#4080ff", orange: "#ff8c40", purple: "#a070ff",
  red: "#ff4060", pink: "#ff60a0", white: "#f0f0f8", text: "#c0c0d4",
  dim: "#6a6a84", border: "rgba(255,255,255,0.06)", green: "#40cc80",
  cyan: "#00c8ff",
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
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}k`;
  return `$${n}`;
};

// ── UPDATED: Compass projections with 4-product portfolio ──

// ── Likely Case (Penetration Pricing = Base Plan) ──
const compassChannelProjection = [
  {
    year: "Y1", label: "Build + First Customers",
    compassPartners: 0, directCustomers: 15, channelCustomers: 24,
    totalCustomers: 39, arr: 3000, revenue: 1500,
    opex: 2200, headcount: 7,
    note: "39 initial customers. $50K entry price removes procurement friction. Self-serve onboarding investment begins. 0% Std→Pro upgrade.",
  },
  {
    year: "Y2", label: "Compass Launch + Std→Pro Upgrades",
    compassPartners: 20, directCustomers: 24, channelCustomers: 70,
    totalCustomers: 94, arr: 10200, revenue: 6600,
    opex: 3200, headcount: 10,
    note: "20 Compass partners. 15% Std→Pro upgrade rate. 8% logo churn. Standard dashboards surface 'detected but not actionable without Professional' items.",
  },
  {
    year: "Y3", label: "Channel Flywheel",
    compassPartners: 45, directCustomers: 35, channelCustomers: 145,
    totalCustomers: 180, arr: 24500, revenue: 17000,
    opex: 4200, headcount: 14,
    note: "45 Compass partners. 25% Std→Pro upgrade. 3% price increase. CoreX consultants drive upgrade conversations at quarterly reviews.",
  },
  {
    year: "Y4", label: "Scaling",
    compassPartners: 70, directCustomers: 50, channelCustomers: 251,
    totalCustomers: 301, arr: 48000, revenue: 36000,
    opex: 5800, headcount: 16,
    note: "70 partners. 35% Std→Pro upgrade. Portfolio flywheel: Pathfinder → Bearing → Contour → Vantage.",
  },
  {
    year: "Y5", label: "Market Leadership",
    compassPartners: 100, directCustomers: 70, channelCustomers: 476,
    totalCustomers: 546, arr: 84000, revenue: 66000,
    opex: 6500, headcount: 16,
    note: "546 customers. ~$84M ARR at 91.6% EBITDA. Bear: ~$33M. Bull: ~$110M. Best: ~$135M.",
  },
];

const compassFlywheel = [
  { step: "1", title: "Consultant Uses Compass", desc: "Implementation firm scopes a ServiceNow engagement. ITSM, ITOM, or any project touching the CMDB.", color: C.cyan },
  { step: "2", title: "Avennorth Pathfinder in the SOW", desc: "Compass suggests Pathfinder Standard as a line item. 'Add automated integration discovery + CMDB Ops — starting at $50K/yr.' One click.", color: C.blue },
  { step: "3", title: "Deploy During Implementation", desc: "Consultant deploys agents in week 1-2. Client sees live integration map before the first sprint review.", color: C.teal },
  { step: "4", title: "Standard Surfaces Gaps", desc: "CMDB Ops dashboards show 'detected but not actionable without Professional' items. Standard instrumentally surfaces integration gaps and unmapped services.", color: C.lime },
  { step: "5", title: "Expand + Upgrade to Professional", desc: "Node count grows. Client upgrades from Standard to Professional for Integration Intelligence + Service Map Intelligence. CoreX consultants point to the dashboards — upgrade conversation writes itself.", color: C.orange },
  { step: "6", title: "Consultant Repeats", desc: "Same consultant uses Avennorth Pathfinder on their next 10 engagements. Compass is the distribution engine. Every Compass customer is a reseller.", color: C.purple },
];

const channelComparison = [
  { metric: "Customer Acquisition Cost", directOnly: "$35,000-50,000", withCompass: "$8,000-15,000", improvement: "~70% lower", color: C.lime },
  { metric: "Average Sales Cycle", directOnly: "3-6 months", withCompass: "2-4 weeks (SOW line item)", improvement: "~80% faster", color: C.teal },
  { metric: "First-Year Deal Size", directOnly: "$60-120k", withCompass: "$15-30k (pilot → expand)", improvement: "Lower entry, higher LTV", color: C.blue },
  { metric: "Sales Team Required", directOnly: "4-6 AEs by Year 3", withCompass: "1-2 channel managers", improvement: "~70% less headcount", color: C.orange },
  { metric: "Net Revenue Retention", directOnly: "120-130%", withCompass: "145-165%", improvement: "Intelligence drives expansion", color: C.purple },
  { metric: "Time to First Revenue", directOnly: "Month 10-12", withCompass: "Month 8-9", improvement: "Faster payback", color: C.green },
];

// ── UPDATED: Deal flow with two-package model (Standard / Professional) ──
const dealFlowExample = [
  { stage: "Pilot (Month 1-3)", hosts: 200, tier: "Standard S", listPrice: "$50K/yr", clientPays: "$62.5K/yr", avennorthGets: "$50K/yr", partnerEarns: "$12.5K/yr", monthly: "$50K | $12.5K", color: C.teal },
  { stage: "Expand (Month 4-8)", hosts: 800, tier: "Standard M", listPrice: "$90K/yr", clientPays: "$112.5K/yr", avennorthGets: "$90K/yr", partnerEarns: "$22.5K/yr", monthly: "$90K | $22.5K", color: C.blue },
  { stage: "Upgrade + Full Estate (Month 9+)", hosts: 800, tier: "Professional M", listPrice: "$175K/yr", clientPays: "$218.75K/yr", avennorthGets: "$175K/yr", partnerEarns: "$43.75K/yr", monthly: "$175K | $43.75K", color: C.lime },
];

const cashFlowChart = compassChannelProjection.map(y => ({
  name: y.year, Revenue: y.revenue, OpEx: y.opex, CashFlow: y.revenue - y.opex,
}));

const tabs = [
  { id: "flywheel", label: "Compass Flywheel" },
  { id: "channel", label: "Channel Economics" },
  { id: "pricing", label: "Deal Flow" },
  { id: "projection", label: "Updated Projections" },
];

export default function PathfinderV4() {
  const [tab, setTab] = useState("flywheel");
  const [scenario, setScenario] = useState(1.0);
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
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: C.lime, letterSpacing: 3, textTransform: "uppercase" }}>Avennorth — v0.4.1</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.white, marginBottom: 3 }}>Avennorth Pathfinder × Compass</h1>
        <p style={{ fontSize: 12, color: C.dim, fontWeight: 300, maxWidth: 700 }}>
          Compass as distribution engine for the 4-product Avennorth platform. Intelligence products drive tier upgrades. Channel economics at scale.
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

        {tab === "flywheel" && (
          <div>
            <SectionHeader color={C.cyan} label="Distribution Strategy" title="The Avennorth × Compass Flywheel" subtitle="Every Compass user becomes an Avennorth Pathfinder distribution partner" />

            <CalloutBox color={C.lime} title="Intelligence Strengthens the Flywheel">
              The original flywheel was: deploy agents → discover integrations → populate CMDB. The 4-product portfolio supercharges it: deploy agents → discover integrations → AI scores health → autonomous agents fix CMDB quality → coverage gaps self-heal. Each product creates more value, driving higher NRR (145-165%) and faster tier upgrades.
            </CalloutBox>

            <div style={{ position: "relative", marginBottom: 24 }}>
              {compassFlywheel.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 40, flexShrink: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${step.color}20`, border: `2px solid ${step.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: step.color, flexShrink: 0 }}>{step.step}</div>
                    {i < compassFlywheel.length - 1 && <div style={{ width: 2, flex: 1, background: C.border, minHeight: 20 }} />}
                  </div>
                  <div style={{ flex: 1, padding: 14, background: C.bgCard, borderRadius: 10, borderLeft: `3px solid ${step.color}`, marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: step.color, marginBottom: 4 }}>{step.title}</div>
                    <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6 }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              {[
                { label: "Compass Partners Y3", value: "40", sub: "consulting firms", color: C.cyan },
                { label: "Avg Deployments", value: "2-3/yr", sub: "per partner annually", color: C.teal },
                { label: "Channel Clients Y3", value: "85", sub: "end customers", color: C.blue },
                { label: "Expansion NRR", value: "150%", sub: "intelligence drives upgrades", color: C.lime },
                { label: "CAC via Compass", value: "$8-15k", sub: "vs. $35-50k direct", color: C.green },
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

        {tab === "channel" && (
          <div>
            <SectionHeader color={C.teal} label="Unit Economics" title="Channel vs. Direct Economics" subtitle="Intelligence products amplify every channel metric" />

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 0.8fr", gap: 10, padding: "10px 14px" }}>
                {["Metric", "Direct Sales Only", "Avennorth × Compass", "Impact"].map((h, i) => (
                  <div key={i} style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: C.dim, letterSpacing: 1, textTransform: "uppercase" }}>{h}</div>
                ))}
              </div>
              {channelComparison.map((row, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 0.8fr", gap: 10, padding: "12px 14px", background: C.bgCard, borderRadius: 10, borderLeft: `3px solid ${row.color}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{row.metric}</div>
                  <div style={{ fontSize: 12, color: C.dim }}>{row.directOnly}</div>
                  <div style={{ fontSize: 12, color: C.text }}>{row.withCompass}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: row.color }}>{row.improvement}</div>
                </div>
              ))}
            </div>

            <CalloutBox color={C.purple} title="Channel-Enabling Features Still Needed">
              The Avennorth platform is built but channel distribution requires additional features: multi-tenant management, partner billing/usage metering, partner portal with deployment playbooks, white-label option for large SI partners, and usage-based API access controls. Estimated 8-12 weeks of additional engineering for channel readiness.
            </CalloutBox>
          </div>
        )}

        {tab === "pricing" && (
          <div>
            <SectionHeader color={C.lime} label="Channel Monetization" title="Avennorth × Compass Deal Flow" subtitle="Intelligence products drive the expansion from Starter → Professional → Enterprise" />

            <div style={{ background: C.bgCard, borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.white, marginBottom: 12 }}>Example Deal Flow (Embedded License Model)</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                {dealFlowExample.map((s, i) => (
                  <div key={i} style={{ padding: 14, borderRadius: 10, background: C.bgHover, borderTop: `3px solid ${s.color}` }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: s.color, marginBottom: 8 }}>{s.stage}</div>
                    <div style={{ fontSize: 11, color: C.dim, marginBottom: 4 }}>{s.hosts} hosts • {s.tier} tier</div>
                    <div style={{ fontSize: 11, marginBottom: 2 }}><span style={{ color: C.dim }}>Client pays:</span> <span style={{ color: C.white }}>{s.clientPays}/mo</span></div>
                    <div style={{ fontSize: 11, marginBottom: 2 }}><span style={{ color: C.dim }}>Avennorth:</span> <span style={{ color: C.lime }}>{s.avennorthGets}/mo</span></div>
                    <div style={{ fontSize: 11, marginBottom: 6 }}><span style={{ color: C.dim }}>Partner:</span> <span style={{ color: C.orange }}>{s.partnerEarns}/mo</span></div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: s.color, padding: "4px 8px", background: `${s.color}10`, borderRadius: 4 }}>
                      AV | Partner: {s.monthly}/mo
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: `${C.lime}08`, border: `1px solid ${C.limeBorder}` }}>
                <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>
                  <strong style={{ color: C.lime }}>Single client journey:</strong> Standard S-tier pilot → node expansion to M-tier → Professional upgrade. Avennorth ARR from this one client grows from <strong style={{ color: C.white }}>$50K/yr to $175K/yr</strong>. Standard dashboards surface integration gaps that only Professional can address — the upgrade conversation writes itself.
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "projection" && (
          <div>
            <SectionHeader color={C.green} label="Financial Model" title="Avennorth — Compass Channel Projections" subtitle="4-product portfolio with intelligence-driven NRR" />

            <div style={{ display: "flex", gap: 3, marginBottom: 18, background: C.bgCard, borderRadius: 8, padding: 3, width: "fit-content" }}>
              {[{ l: "Bear", m: 0.4 }, { l: "Likely (Base)", m: 1.0 }, { l: "Bull", m: 1.3 }, { l: "Best Case", m: 1.6 }].map(s => (
                <button key={s.l} onClick={() => setScenario(s.m)} style={{
                  padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                  fontSize: 11, fontWeight: scenario === s.m ? 600 : 400,
                  color: scenario === s.m ? C.bg : C.dim,
                  background: scenario === s.m ? C.lime : "transparent",
                }}>{s.l}</button>
              ))}
            </div>

            <div style={{ background: C.bgCard, borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.white, marginBottom: 12 }}>ARR Growth — Avennorth × Compass ({sLabel})</div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={compassChannelProjection.map(y => ({ name: y.year, ARR: Math.round(y.arr * scenario) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="name" stroke={C.dim} fontSize={11} />
                  <YAxis stroke={C.dim} fontSize={10} tickFormatter={v => `$${v}k`} />
                  <Tooltip contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11 }} formatter={v => [`$${v}k`, "ARR"]} />
                  <Area type="monotone" dataKey="ARR" stroke={C.lime} fill={C.limeDim} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: C.bgCard, borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.white, marginBottom: 12 }}>Revenue vs. OpEx ({sLabel})</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={cashFlowChart.map(d => ({ ...d, Revenue: Math.round(d.Revenue * scenario), CashFlow: Math.round(d.Revenue * scenario) - d.OpEx }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="name" stroke={C.dim} fontSize={11} />
                  <YAxis stroke={C.dim} fontSize={10} tickFormatter={v => `$${v}k`} />
                  <Tooltip contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11 }} formatter={v => [`$${v}k`]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Revenue" fill={C.lime} radius={[4,4,0,0]} />
                  <Bar dataKey="OpEx" fill={C.red} radius={[4,4,0,0]} opacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {compassChannelProjection.map((yr, i) => {
                const adjRev = Math.round(yr.revenue * scenario);
                const adjARR = Math.round(yr.arr * scenario);
                const cf = adjRev - yr.opex;
                return (
                  <div key={i} style={{ background: C.bgCard, borderRadius: 12, padding: 14, borderLeft: `3px solid ${cf >= 0 ? C.lime : C.orange}` }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{yr.year}</span>
                      <span style={{ fontSize: 12, color: C.dim }}>— {yr.label}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, marginBottom: 10 }}>
                      {[
                        { label: "End ARR", value: fmt(adjARR * 1000), color: C.lime },
                        { label: "Revenue", value: fmt(adjRev * 1000), color: C.teal },
                        { label: "OpEx", value: fmt(yr.opex * 1000), color: C.orange },
                        { label: "Cash Flow", value: fmt(cf * 1000), color: cf >= 0 ? C.green : C.red },
                        { label: "Partners", value: Math.round(yr.compassPartners * scenario), color: C.cyan },
                        { label: "Clients", value: Math.round(yr.totalCustomers * scenario), color: C.blue },
                        { label: "Headcount", value: yr.headcount, color: C.purple },
                      ].map((m, mi) => (
                        <div key={mi}>
                          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: C.dim, letterSpacing: 1, textTransform: "uppercase" }}>{m.label}</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: m.color }}>{m.value}</div>
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

      <div style={{ maxWidth: 1020, margin: "32px auto 0", borderTop: `1px solid ${C.border}`, paddingTop: 14, display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: C.dim, letterSpacing: 1 }}>AVENNORTH PATHFINDER × COMPASS v0.4.1</span>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: C.dim }}>AVENNORTH</span>
      </div>
    </div>
  );
}
