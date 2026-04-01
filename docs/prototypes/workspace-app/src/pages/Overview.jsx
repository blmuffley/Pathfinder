/**
 * Overview — Tabbed dashboard showing the full Pathfinder platform.
 *
 * 5 tabs:
 *   1. Overview — Platform health, KPIs across all layers
 *   2. Discovery — What we found on the network (assets, pipeline)
 *   3. Integration — Application-to-application connections (was the old Overview)
 *   4. Application — Discovered applications + service maps
 *   5. Insights — AI intelligence, trends, anomalies
 */
import { useState } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from "recharts";
import { useTheme } from "../data/theme";
import {
  CLINICAL_DEVICES, IOT_DEVICES, FACILITIES, DISCOVERY_SOURCES,
  TIER_DISTRIBUTION, HEALTH_TREND, DEVICE_BY_DEPARTMENT, SOURCE_COVERAGE,
  COMPLIANCE_SUMMARY, CLINICAL_INCIDENTS, STAFF, CERT_GAPS,
  tierColor, tierLabel, statusColor, complianceColor,
} from "../data/demoData";

// ── Shared Pill + KPI that respect theme ──
const Pill = ({ children, color, t }) => (
  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, padding: "3px 8px", borderRadius: 4, background: `${color}${t.pillBgAlpha}`, color, whiteSpace: "nowrap" }}>{children}</span>
);
const KPI = ({ value, label, color, sub, t }) => (
  <div style={{ padding: 14, background: t.bgCard, borderRadius: 10, borderLeft: `3px solid ${color}`, flex: 1, minWidth: 130, transition: "background 0.3s" }}>
    <div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: "'Space Mono',monospace" }}>{value}</div>
    <div style={{ fontSize: 11, color: t.dim, marginTop: 2 }}>{label}</div>
    {sub && <div style={{ fontSize: 10, color: t.dim, marginTop: 2 }}>{sub}</div>}
  </div>
);

// ── Integration sample data (from original workspace) ──
const INTEGRATIONS = [
  { name: "Order Svc \u2192 Payment GW", type: "API", health: "Healthy", score: 92, confidence: 0.95, flows: 48200 },
  { name: "Inventory \u2192 Warehouse DB", type: "Database", health: "Healthy", score: 88, confidence: 0.92, flows: 31500 },
  { name: "Auth \u2192 LDAP", type: "Directory", health: "Degraded", score: 67, confidence: 0.88, flows: 12800 },
  { name: "Shipping \u2192 FedEx API", type: "API", health: "Healthy", score: 85, confidence: 0.90, flows: 8900 },
  { name: "Analytics \u2192 Data Lake", type: "File Transfer", health: "Healthy", score: 94, confidence: 0.85, flows: 2400 },
  { name: "Notification \u2192 SendGrid", type: "Email", health: "Critical", score: 34, confidence: 0.91, flows: 67000 },
  { name: "CRM \u2192 Salesforce", type: "API", health: "Degraded", score: 62, confidence: 0.78, flows: 5600 },
  { name: "Event Bus \u2192 Kafka", type: "Messaging", health: "Healthy", score: 96, confidence: 0.97, flows: 890000 },
  { name: "Epic EHR \u2192 PACS", type: "Clinical", health: "Healthy", score: 92, confidence: 0.94, flows: 28000 },
  { name: "Lab System \u2192 EHR", type: "Clinical", health: "Healthy", score: 87, confidence: 0.89, flows: 12000 },
  { name: "Pyxis \u2192 Pharmacy", type: "Clinical", health: "Healthy", score: 95, confidence: 0.90, flows: 7800 },
  { name: "Infusion Pumps \u2192 EHR", type: "Clinical", health: "Degraded", score: 61, confidence: 0.85, flows: 4200 },
];

// ── Discovered applications ──
const APPS = [
  { name: "Order Processing Service", type: "Microservice", integrations: 6, health: 94, tier: "Business Critical" },
  { name: "Epic EHR Integration", type: "Integration Engine", integrations: 18, health: 92, tier: "Business Critical" },
  { name: "PACS Archive", type: "Storage System", integrations: 8, health: 90, tier: "Business Critical" },
  { name: "Kafka Event Bus", type: "Message Broker", integrations: 12, health: 96, tier: "Infrastructure" },
  { name: "Lab Information System", type: "Departmental App", integrations: 5, health: 87, tier: "High" },
  { name: "Active Directory", type: "Directory Service", integrations: 14, health: 67, tier: "Infrastructure" },
  { name: "Pharmacy Dispensing", type: "Device Manager", integrations: 4, health: 95, tier: "High" },
  { name: "Building Management", type: "OT Controller", integrations: 3, health: 93, tier: "Medium" },
  { name: "Payment Gateway Proxy", type: "API Gateway", integrations: 3, health: 91, tier: "Business Critical" },
  { name: "Notification Service", type: "Microservice", integrations: 2, health: 34, tier: "Medium" },
];

// ── AI Insights ──
const INSIGHTS = [
  { type: "Anomaly", severity: "Critical", message: "SendGrid email gateway error rate spiking to 4.8% (threshold 5%). Potential rate limiting.", time: "35 min ago", engine: "Integration Intelligence" },
  { type: "Anomaly", severity: "High", message: "LDAP authentication latency increased 4x (p99: 340ms vs baseline 80ms). Replication lag suspected.", time: "2 hr ago", engine: "Integration Intelligence" },
  { type: "Health Alert", severity: "High", message: "Infusion pump DEV-IP02 communication retries increased 300%. Matches FDA MAUDE pattern MW5087234.", time: "2 hr ago", engine: "Vantage Clinical" },
  { type: "Coverage Gap", severity: "Medium", message: "3 new servers discovered in 10.1.5.x subnet with no Pathfinder agents. Recommend deployment.", time: "6 hr ago", engine: "Service Map Intelligence" },
  { type: "Compliance", severity: "High", message: "ICU Ventilator #3 calibration overdue by 49 days. Joint Commission EC.02.04.03 non-compliant.", time: "1 day ago", engine: "Ledger" },
  { type: "Cert Gap", severity: "Medium", message: "Only 1 staff member certified on Getinge Servo-u ventilators in Medical ICU. Minimum is 2.", time: "1 day ago", engine: "Meridian" },
  { type: "Optimization", severity: "Low", message: "CT Scanner #1 maintenance window optimized: Apr 5 2am-6am (impact score 95/100, all backups available).", time: "2 days ago", engine: "Meridian" },
  { type: "Trend", severity: "Info", message: "Tier 4 device health trending down 3% over last 7 days. Driven by ventilator calibration delays.", time: "3 days ago", engine: "Analytics" },
];

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "discovery", label: "Discovery" },
  { id: "integration", label: "Integration" },
  { id: "application", label: "Application" },
  { id: "insights", label: "Insights" },
];

export default function Overview() {
  const { theme: t } = useTheme();
  const [tab, setTab] = useState("overview");
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);

  const tooltipStyle = { background: t.tooltipBg, border: `1px solid ${t.tooltipBorder}`, borderRadius: 8, fontSize: 11, color: t.text };
  const healthColor = s => s === "Healthy" ? t.green : s === "Degraded" ? t.amber : s === "Critical" ? t.red : t.dim;

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textStrong }}>Pathfinder Platform</h1>
        <p style={{ fontSize: 12, color: t.dim }}>Mercy Health System — 3 facilities, 6,425 discovered devices, 12 integrations, 11 applications</p>
      </div>

      {/* Tab Bar */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, background: t.bgCard, borderRadius: 8, padding: 3, width: "fit-content", transition: "background 0.3s" }}>
        {TABS.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} style={{
            padding: "8px 18px", borderRadius: 6, border: "none",
            fontSize: 12, fontWeight: tab === tb.id ? 600 : 400,
            color: tab === tb.id ? (t.mode === "dark" ? "#0e0e0c" : "#fff") : t.dim,
            background: tab === tb.id ? t.lime : "transparent",
            transition: "all 0.2s",
          }}>{tb.label}</button>
        ))}
      </div>

      {/* ═══════════════════════════════════ */}
      {/* TAB 1: OVERVIEW                     */}
      {/* ═══════════════════════════════════ */}
      {tab === "overview" && (
        <div>
          {/* Top KPIs */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <KPI t={t} value="6,425" label="Devices Discovered" color={t.lime} sub="Across 3 facilities" />
            <KPI t={t} value="12" label="Integrations" color={t.cyan} sub="9 healthy, 2 degraded, 1 critical" />
            <KPI t={t} value="11" label="Applications" color={t.blue} sub="Behavioral inference" />
            <KPI t={t} value="87%" label="Avg Confidence" color={t.lime} sub="Multi-source weighted" />
            <KPI t={t} value="2" label="Active Incidents" color={t.red} sub="PSIS: 78, 42" />
            <KPI t={t} value="84%" label="Compliance Score" color={t.amber} sub="Across 5 frameworks" />
          </div>

          {/* Row 2: Tier Distribution + Health Trend */}
          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1, background: t.bgCard, borderRadius: 10, padding: 16, transition: "background 0.3s" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.textStrong, marginBottom: 12 }}>Device Distribution by Tier</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={TIER_DISTRIBUTION} dataKey="count" nameKey="tier" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {TIER_DISTRIBUTION.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 2, background: t.bgCard, borderRadius: 10, padding: 16, transition: "background 0.3s" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.textStrong, marginBottom: 12 }}>Health Trend (30 days)</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={HEALTH_TREND}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
                  <XAxis dataKey="day" stroke={t.dim} fontSize={9} interval={4} />
                  <YAxis domain={[70, 100]} stroke={t.dim} fontSize={9} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="tier1Health" stroke={t.blue} strokeWidth={1.5} dot={false} name="IT (T1)" />
                  <Line type="monotone" dataKey="tier3Health" stroke={t.amber} strokeWidth={1.5} dot={false} name="Clinical (T3)" />
                  <Line type="monotone" dataKey="tier4Health" stroke={t.red} strokeWidth={2} dot={false} name="Life-Critical (T4)" />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 3: Compliance + Incidents + Cert Gaps side by side */}
          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            {/* Compliance */}
            <div style={{ flex: 1, background: t.bgCard, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.textStrong, marginBottom: 10 }}>Compliance by Framework</div>
              {COMPLIANCE_SUMMARY.map(c => (
                <div key={c.framework} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: t.text }}>{c.framework}</span>
                    <span style={{ color: c.score >= 85 ? t.green : c.score >= 70 ? t.amber : t.red, fontWeight: 600 }}>{c.score}%</span>
                  </div>
                  <div style={{ height: 6, background: t.bgHover, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${c.score}%`, height: "100%", background: c.score >= 85 ? t.green : c.score >= 70 ? t.amber : t.red, borderRadius: 3, transition: "width 0.5s" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Active Incidents */}
            <div style={{ flex: 1, background: t.bgCard, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.textStrong, marginBottom: 10 }}>Active Clinical Incidents</div>
              {CLINICAL_INCIDENTS.filter(i => i.status !== "Resolved").map(inc => (
                <div key={inc.id} style={{ padding: 10, background: t.bgHover, borderRadius: 8, marginBottom: 8, borderLeft: `3px solid ${inc.psis >= 70 ? t.red : inc.psis >= 40 ? t.amber : t.blue}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: t.textStrong }}>{inc.id}</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: inc.psis >= 70 ? t.red : inc.psis >= 40 ? t.amber : t.blue, fontFamily: "'Space Mono',monospace" }}>{inc.psis}</span>
                  </div>
                  <div style={{ fontSize: 10, color: t.text }}>{inc.type} — {CLINICAL_DEVICES.find(d => d.id === inc.device)?.name || inc.device}</div>
                  <div style={{ fontSize: 9, color: t.dim, marginTop: 2 }}>{inc.created} | {inc.blastRadius.patients} patients affected</div>
                </div>
              ))}
            </div>

            {/* Cert Gaps */}
            <div style={{ flex: 1, background: t.bgCard, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.textStrong, marginBottom: 10 }}>Certification Gaps (Meridian)</div>
              {CERT_GAPS.map((g, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${t.border}` }}>
                  <div>
                    <div style={{ fontSize: 11, color: t.textStrong }}>{g.device}</div>
                    <div style={{ fontSize: 9, color: t.dim }}>{g.department}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: g.gap ? t.red : t.green }}>{g.certifiedStaff}/{g.requiredMinimum}</span>
                    {g.gap && <div style={{ fontSize: 8, color: t.red }}>GAP</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Facilities summary */}
          <div style={{ background: t.bgCard, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.textStrong, marginBottom: 10 }}>Facilities</div>
            <div style={{ display: "flex", gap: 12 }}>
              {FACILITIES.map(f => (
                <div key={f.id} style={{ flex: 1, padding: 14, background: t.bgHover, borderRadius: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.textStrong }}>{f.name}</div>
                  <div style={{ fontSize: 10, color: t.dim, marginBottom: 8 }}>{f.type}</div>
                  <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                    <div><span style={{ color: t.dim }}>Devices:</span> <span style={{ color: t.lime, fontWeight: 600 }}>{f.devices.toLocaleString()}</span></div>
                    {f.beds > 0 && <div><span style={{ color: t.dim }}>Beds:</span> <span style={{ color: t.text, fontWeight: 600 }}>{f.beds}</span></div>}
                    <div><span style={{ color: t.dim }}>Staff:</span> <span style={{ color: t.text, fontWeight: 600 }}>{f.staff.toLocaleString()}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════ */}
      {/* TAB 2: DISCOVERY                    */}
      {/* ═══════════════════════════════════ */}
      {tab === "discovery" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <KPI t={t} value="6,425" label="Endpoints Discovered" color={t.lime} sub="All sources" />
            <KPI t={t} value="14.8M" label="Raw Flows (24h)" color={t.blue} />
            <KPI t={t} value="342" label="New CIs This Week" color={t.green} />
            <KPI t={t} value="193" label="Stale CIs Flagged" color={t.amber} />
            <KPI t={t} value="5" label="Discovery Sources" color={t.cyan} />
          </div>

          {/* Pipeline visualization */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Raw Flows", value: "14.8M", sub: "eBPF + ETW + Armis", color: t.blue },
              { label: "Classified", value: "14.65M", sub: "98.9% rate", color: t.green },
              { label: "Grouped", value: "24,800", sub: "Unique tuples", color: t.cyan },
              { label: "Endpoints", value: "6,425", sub: "Devices found", color: t.lime },
              { label: "CMDB CIs", value: "5,890", sub: "In ServiceNow", color: t.lime },
            ].map((s, i) => (
              <div key={s.label} style={{ flex: 1, position: "relative" }}>
                <div style={{ padding: 12, background: t.bgCard, borderRadius: 10, borderTop: `3px solid ${s.color}`, textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: "'Space Mono',monospace" }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: t.textStrong }}>{s.label}</div>
                  <div style={{ fontSize: 9, color: t.dim }}>{s.sub}</div>
                </div>
                {i < 4 && <div style={{ position: "absolute", right: -7, top: "50%", transform: "translateY(-50%)", color: t.dim, fontSize: 14 }}>\u2192</div>}
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1, background: t.bgCard, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.textStrong, marginBottom: 12 }}>Devices by Tier</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={TIER_DISTRIBUTION}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
                  <XAxis dataKey="tier" stroke={t.dim} fontSize={9} />
                  <YAxis stroke={t.dim} fontSize={9} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {TIER_DISTRIBUTION.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, background: t.bgCard, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.textStrong, marginBottom: 12 }}>Source Coverage</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={SOURCE_COVERAGE} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
                  <XAxis type="number" stroke={t.dim} fontSize={9} />
                  <YAxis type="category" dataKey="source" stroke={t.dim} fontSize={9} width={110} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="pct" fill={t.cyan} radius={[0, 4, 4, 0]} name="Coverage %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Discovery sources */}
          <div style={{ background: t.bgCard, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.textStrong, marginBottom: 10 }}>Active Discovery Sources</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {DISCOVERY_SOURCES.map(s => (
                <div key={s.id} style={{ padding: 12, background: t.bgHover, borderRadius: 8, borderLeft: `3px solid ${s.status === "Active" ? t.green : t.amber}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: t.textStrong }}>{s.name}</span>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.status === "Active" ? t.green : t.amber }} />
                  </div>
                  <div style={{ fontSize: 10, color: t.dim }}>Weight: {s.weight} | Devices: {s.devices.toLocaleString()} | {s.lastSync}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════ */}
      {/* TAB 3: INTEGRATION                  */}
      {/* ═══════════════════════════════════ */}
      {tab === "integration" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <KPI t={t} value={INTEGRATIONS.length} label="Integrations Discovered" color={t.lime} />
            <KPI t={t} value={INTEGRATIONS.filter(i => i.health === "Healthy").length} label="Healthy" color={t.green} />
            <KPI t={t} value={INTEGRATIONS.filter(i => i.health === "Degraded").length} label="Degraded" color={t.amber} />
            <KPI t={t} value={INTEGRATIONS.filter(i => i.health === "Critical").length} label="Critical" color={t.red} />
          </div>

          {/* Integration Table */}
          <div style={{ background: t.bgCard, borderRadius: 10, padding: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                  {["Integration", "Type", "Health", "Score", "Confidence", "Flows"].map(h => (
                    <th key={h} style={{ padding: "8px 6px", textAlign: "left", fontSize: 9, color: t.dim, fontFamily: "'Space Mono',monospace", letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INTEGRATIONS.map((integ, i) => (
                  <tr key={i} onClick={() => setSelectedIntegration(selectedIntegration === i ? null : i)}
                    style={{ borderBottom: `1px solid ${t.border}`, cursor: "pointer", background: selectedIntegration === i ? t.bgHover : "transparent" }}>
                    <td style={{ padding: "10px 6px", color: t.textStrong, fontWeight: 500 }}>{integ.name}</td>
                    <td style={{ padding: "10px 6px" }}><Pill color={t.cyan} t={t}>{integ.type}</Pill></td>
                    <td style={{ padding: "10px 6px" }}><Pill color={healthColor(integ.health)} t={t}>{integ.health}</Pill></td>
                    <td style={{ padding: "10px 6px" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: healthColor(integ.health), fontFamily: "'Space Mono',monospace" }}>{integ.score}</span>
                    </td>
                    <td style={{ padding: "10px 6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 40, height: 4, background: t.bgHover, borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: `${integ.confidence * 100}%`, height: "100%", background: integ.confidence >= 0.85 ? t.green : t.amber, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 9, color: t.dim }}>{Math.round(integ.confidence * 100)}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 6px", fontFamily: "'Space Mono',monospace", fontSize: 10, color: t.dim }}>{integ.flows.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Health Distribution */}
          <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
            <div style={{ flex: 1, background: t.bgCard, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.textStrong, marginBottom: 12 }}>Health Distribution</div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={[
                    { name: "Healthy", value: INTEGRATIONS.filter(i => i.health === "Healthy").length, color: t.green },
                    { name: "Degraded", value: INTEGRATIONS.filter(i => i.health === "Degraded").length, color: t.amber },
                    { name: "Critical", value: INTEGRATIONS.filter(i => i.health === "Critical").length, color: t.red },
                  ]} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                    {[t.green, t.amber, t.red].map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, background: t.bgCard, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.textStrong, marginBottom: 12 }}>Integration by Type</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={
                  Object.entries(INTEGRATIONS.reduce((acc, i) => { acc[i.type] = (acc[i.type] || 0) + 1; return acc; }, {})).map(([type, count]) => ({ type, count }))
                }>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
                  <XAxis dataKey="type" stroke={t.dim} fontSize={9} />
                  <YAxis stroke={t.dim} fontSize={9} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill={t.cyan} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════ */}
      {/* TAB 4: APPLICATION                  */}
      {/* ═══════════════════════════════════ */}
      {tab === "application" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <KPI t={t} value={APPS.length} label="Applications Identified" color={t.lime} />
            <KPI t={t} value={APPS.filter(a => a.tier === "Business Critical").length} label="Business Critical" color={t.red} />
            <KPI t={t} value={APPS.reduce((s, a) => s + a.integrations, 0)} label="Total Integrations" color={t.cyan} />
            <KPI t={t} value={Math.round(APPS.reduce((s, a) => s + a.health, 0) / APPS.length)} label="Avg Health" color={t.green} />
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            {/* App table */}
            <div style={{ flex: 1, background: t.bgCard, borderRadius: 10, padding: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                    {["Application", "Type", "Integrations", "Health", "Tier"].map(h => (
                      <th key={h} style={{ padding: "8px 6px", textAlign: "left", fontSize: 9, color: t.dim, fontFamily: "'Space Mono',monospace", letterSpacing: 1 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {APPS.map((app, i) => (
                    <tr key={i} onClick={() => setSelectedApp(selectedApp === i ? null : i)}
                      style={{ borderBottom: `1px solid ${t.border}`, cursor: "pointer", background: selectedApp === i ? t.bgHover : "transparent" }}>
                      <td style={{ padding: "10px 6px", color: t.textStrong, fontWeight: 500 }}>{app.name}</td>
                      <td style={{ padding: "10px 6px", color: t.text, fontSize: 10 }}>{app.type}</td>
                      <td style={{ padding: "10px 6px", fontWeight: 600, color: t.cyan }}>{app.integrations}</td>
                      <td style={{ padding: "10px 6px" }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: app.health >= 80 ? t.green : app.health >= 60 ? t.amber : t.red, fontFamily: "'Space Mono',monospace" }}>{app.health}</span>
                      </td>
                      <td style={{ padding: "10px 6px" }}>
                        <Pill t={t} color={app.tier === "Business Critical" ? t.red : app.tier === "Infrastructure" ? t.purple : app.tier === "High" ? t.amber : t.blue}>{app.tier}</Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Selected app detail + dependency map */}
            {selectedApp !== null && (() => {
              const app = APPS[selectedApp];
              // Dependency map data per application
              const depMaps = {
                "Epic EHR Integration": [
                  { target: "PACS Archive", type: "DICOM", health: "Healthy", direction: "outbound" },
                  { target: "Lab Information System", type: "HL7", health: "Healthy", direction: "outbound" },
                  { target: "Pharmacy Dispensing", type: "HL7", health: "Healthy", direction: "outbound" },
                  { target: "Active Directory", type: "LDAP", health: "Degraded", direction: "outbound" },
                  { target: "Infusion Pumps (48 devices)", type: "HL7", health: "Degraded", direction: "inbound" },
                  { target: "Patient Monitors (22 devices)", type: "IEEE 11073", health: "Healthy", direction: "inbound" },
                  { target: "CT Scanner #1", type: "DICOM", health: "Healthy", direction: "bidirectional" },
                  { target: "CT Scanner #2", type: "DICOM", health: "Healthy", direction: "bidirectional" },
                  { target: "MRI Scanner", type: "DICOM", health: "Healthy", direction: "bidirectional" },
                ],
                "Order Processing Service": [
                  { target: "Payment Gateway Proxy", type: "HTTPS", health: "Healthy", direction: "outbound" },
                  { target: "Kafka Event Bus", type: "Kafka", health: "Healthy", direction: "outbound" },
                  { target: "Inventory Management", type: "HTTPS", health: "Healthy", direction: "outbound" },
                  { target: "Notification Service", type: "Kafka", health: "Critical", direction: "outbound" },
                  { target: "Analytics Engine", type: "Kafka", health: "Healthy", direction: "outbound" },
                  { target: "Active Directory", type: "LDAP", health: "Degraded", direction: "outbound" },
                ],
                "Kafka Event Bus": [
                  { target: "Order Processing", type: "Kafka", health: "Healthy", direction: "inbound" },
                  { target: "Analytics Engine", type: "Kafka", health: "Healthy", direction: "outbound" },
                  { target: "Notification Service", type: "Kafka", health: "Critical", direction: "outbound" },
                  { target: "Shipping Platform", type: "Kafka", health: "Healthy", direction: "outbound" },
                  { target: "Inventory Manager", type: "Kafka", health: "Healthy", direction: "outbound" },
                  { target: "Audit Logger", type: "Kafka", health: "Healthy", direction: "outbound" },
                ],
              };
              const deps = depMaps[app.name] || Array.from({ length: app.integrations }, (_, i) => ({
                target: `Service ${i + 1}`, type: "TCP", health: "Healthy", direction: "outbound"
              }));
              const dirArrow = d => d === "outbound" ? "\u2192" : d === "inbound" ? "\u2190" : "\u2194";

              return (
                <div style={{ width: 400, background: t.bgCard, borderRadius: 10, padding: 16, border: `1px solid ${t.border}`, flexShrink: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: t.textStrong }}>{app.name}</h3>
                    <button onClick={() => setSelectedApp(null)} style={{ background: "none", border: "none", color: t.dim, fontSize: 16 }}>x</button>
                  </div>

                  {/* Health + Stats */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <div style={{ flex: 1, textAlign: "center", padding: 10, background: t.bg, borderRadius: 8 }}>
                      <div style={{ fontSize: 26, fontWeight: 700, color: app.health >= 80 ? t.green : app.health >= 60 ? t.amber : t.red, fontFamily: "'Space Mono',monospace" }}>{app.health}</div>
                      <div style={{ fontSize: 9, color: t.dim }}>Health</div>
                    </div>
                    <div style={{ flex: 1, textAlign: "center", padding: 10, background: t.bg, borderRadius: 8 }}>
                      <div style={{ fontSize: 26, fontWeight: 700, color: t.cyan, fontFamily: "'Space Mono',monospace" }}>{app.integrations}</div>
                      <div style={{ fontSize: 9, color: t.dim }}>Integrations</div>
                    </div>
                    <div style={{ flex: 1, textAlign: "center", padding: 10, background: t.bg, borderRadius: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: app.tier === "Business Critical" ? t.red : app.tier === "Infrastructure" ? t.purple : t.amber }}>{app.tier}</div>
                      <div style={{ fontSize: 9, color: t.dim }}>Tier</div>
                    </div>
                  </div>

                  {/* Dependency Map */}
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.textStrong, marginBottom: 8 }}>Application Dependency Map</div>

                  {/* Visual: center node + connections */}
                  <div style={{ position: "relative", padding: "12px 0", marginBottom: 8 }}>
                    {/* Center app node */}
                    <div style={{ textAlign: "center", marginBottom: 8 }}>
                      <div style={{ display: "inline-block", padding: "8px 16px", background: `${t.lime}15`, border: `2px solid ${t.lime}`, borderRadius: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: t.lime }}>{app.name}</div>
                        <div style={{ fontSize: 9, color: t.dim }}>{app.type}</div>
                      </div>
                    </div>

                    {/* Connection lines + dependency nodes */}
                    {deps.map((dep, i) => {
                      const hc = dep.health === "Healthy" ? t.green : dep.health === "Degraded" ? t.amber : t.red;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: `1px solid ${t.border}` }}>
                          {/* Direction */}
                          <span style={{ fontSize: 12, color: t.dim, width: 16, textAlign: "center" }}>{dirArrow(dep.direction)}</span>
                          {/* Health dot */}
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: hc, flexShrink: 0 }} />
                          {/* Target */}
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 11, color: t.textStrong }}>{dep.target}</span>
                          </div>
                          {/* Protocol pill */}
                          <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: `${t.cyan}${t.pillBgAlpha}`, color: t.cyan }}>{dep.type}</span>
                          {/* Health pill */}
                          <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: `${hc}${t.pillBgAlpha}`, color: hc }}>{dep.health}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary */}
                  <div style={{ padding: 10, background: t.bg, borderRadius: 8, fontSize: 10, color: t.dim, lineHeight: 1.6 }}>
                    <strong style={{ color: t.textStrong }}>{deps.filter(d => d.direction === "outbound").length}</strong> outbound,{" "}
                    <strong style={{ color: t.textStrong }}>{deps.filter(d => d.direction === "inbound").length}</strong> inbound,{" "}
                    <strong style={{ color: t.textStrong }}>{deps.filter(d => d.direction === "bidirectional").length}</strong> bidirectional.{" "}
                    <span style={{ color: t.red }}>{deps.filter(d => d.health !== "Healthy").length} degraded/critical.</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Dept chart */}
          <div style={{ background: t.bgCard, borderRadius: 10, padding: 16, marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.textStrong, marginBottom: 12 }}>Clinical Devices by Department</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={DEVICE_BY_DEPARTMENT} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
                <XAxis type="number" stroke={t.dim} fontSize={9} />
                <YAxis type="category" dataKey="dept" stroke={t.dim} fontSize={9} width={90} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="t3" stackId="a" fill={t.amber} name="Tier 3 (Clinical)" />
                <Bar dataKey="t4" stackId="a" fill={t.red} name="Tier 4 (Life-Critical)" radius={[0, 4, 4, 0]} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════ */}
      {/* TAB 5: INSIGHTS                     */}
      {/* ═══════════════════════════════════ */}
      {tab === "insights" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <KPI t={t} value={INSIGHTS.filter(i => i.severity === "Critical").length} label="Critical Insights" color={t.red} />
            <KPI t={t} value={INSIGHTS.filter(i => i.severity === "High").length} label="High" color={t.amber} />
            <KPI t={t} value={INSIGHTS.filter(i => i.severity === "Medium").length} label="Medium" color={t.blue} />
            <KPI t={t} value={INSIGHTS.length} label="Total AI Insights" color={t.lime} sub="Across all engines" />
          </div>

          {/* Insight Feed */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {INSIGHTS.map((insight, i) => {
              const severityColor = insight.severity === "Critical" ? t.red : insight.severity === "High" ? t.amber : insight.severity === "Medium" ? t.blue : insight.severity === "Low" ? t.green : t.dim;
              return (
                <div key={i} style={{ padding: 14, background: t.bgCard, borderRadius: 10, borderLeft: `3px solid ${severityColor}`, transition: "background 0.3s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Pill t={t} color={severityColor}>{insight.severity}</Pill>
                      <Pill t={t} color={t.dim}>{insight.type}</Pill>
                      <span style={{ fontSize: 10, color: t.dim }}>{insight.engine}</span>
                    </div>
                    <span style={{ fontSize: 10, color: t.dim }}>{insight.time}</span>
                  </div>
                  <div style={{ fontSize: 12, color: t.textStrong, lineHeight: 1.5 }}>{insight.message}</div>
                </div>
              );
            })}
          </div>

          {/* Engine breakdown */}
          <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
            {[
              { engine: "Integration Intelligence", count: 2, color: t.cyan, desc: "Health scoring, anomaly detection, EA reconciliation" },
              { engine: "Vantage Clinical", count: 1, color: t.red, desc: "Device incidents, MAUDE matching, patient safety" },
              { engine: "Service Map Intelligence", count: 1, color: t.blue, desc: "Coverage analysis, dependency gaps" },
              { engine: "Ledger", count: 1, color: t.amber, desc: "Compliance findings, survey readiness" },
              { engine: "Meridian", count: 2, color: t.purple, desc: "Certification gaps, maintenance optimization" },
              { engine: "Analytics", count: 1, color: t.teal, desc: "Trend detection, portfolio health" },
            ].map(e => (
              <div key={e.engine} style={{ flex: 1, padding: 12, background: t.bgCard, borderRadius: 10, borderTop: `3px solid ${e.color}` }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: e.color, fontFamily: "'Space Mono',monospace" }}>{e.count}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: t.textStrong, marginTop: 2 }}>{e.engine}</div>
                <div style={{ fontSize: 9, color: t.dim, marginTop: 2 }}>{e.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
