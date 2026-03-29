/**
 * Avennorth Pathfinder — ServiceNow Workspace Prototype
 *
 * Interactive React prototype mimicking the Polaris workspace.
 * 6 pages: Overview, Integrations, Agent Fleet, Coverage Gaps, EA Reconciliation, Health Dashboard
 *
 * Usage: Drop into any React project with recharts installed.
 *   npm install recharts
 *   import PathfinderWorkspace from './pathfinder-workspace-prototype';
 */
import { useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend, PieChart, Pie, Cell } from "recharts";

// ── Design tokens (Polaris-inspired dark theme) ──
const T = {
  bg: "#0e0e0c", bgCard: "#1c1917", bgHover: "#292524", bgInput: "#151513",
  lime: "#39FF14", limeDim: "rgba(57,255,20,0.10)", limeBorder: "rgba(57,255,20,0.25)",
  green: "#22c55e", amber: "#f59e0b", red: "#ef4444", blue: "#3b82f6",
  purple: "#8b5cf6", cyan: "#06b6d4", white: "#fafaf9", text: "#d6d3d1",
  dim: "#78716c", border: "rgba(255,255,255,0.06)", borderLight: "rgba(255,255,255,0.10)",
};

const statusColor = { Healthy: T.green, Degraded: T.amber, Critical: T.red, Unknown: T.dim };
const priorityColor = { Critical: T.red, High: T.amber, Medium: T.blue, Low: T.dim };
const agentStatusColor = { Active: T.green, Stale: T.amber, Decommissioned: T.dim };
const eaStatusColor = { Confirmed: T.green, Suggested: T.amber, Rejected: T.dim };

// ── Sample Data ──
const INTEGRATIONS = [
  { sys_id: "i1", name: "Order Service \u2192 Payment Gateway", source: "Order Service", target: "Payment Gateway", type: "API", health_status: "Healthy", health_score: 92, confidence: 0.95, flow_count: 48200, last_observed: "2 min ago", ea_status: "Mapped", criticality: "Critical", discovery: "Pathfinder", owner: "J. Martinez", support_group: "App Platform", ai_summary: "High-frequency HTTPS integration between the order processing pipeline and payment provider. Handles ~1,200 transactions/hour with 99.97% availability over the last 30 days. Latency is stable at p50=45ms, p99=120ms. No anomalies detected. This is a critical-path dependency for all e-commerce revenue.", data_class: "Confidential" },
  { sys_id: "i2", name: "Inventory Mgr \u2192 Warehouse DB", source: "Inventory Manager", target: "Warehouse DB", type: "Database", health_status: "Healthy", health_score: 88, confidence: 0.92, flow_count: 31500, last_observed: "5 min ago", ea_status: "Mapped", criticality: "High", discovery: "Pathfinder", owner: "S. Chen", support_group: "Data Engineering", ai_summary: "PostgreSQL connection from inventory service. Steady traffic pattern consistent with request-reply. No error rate concerns.", data_class: "Internal" },
  { sys_id: "i3", name: "Auth Service \u2192 LDAP Directory", source: "Auth Service", target: "Corporate LDAP", type: "Directory", health_status: "Degraded", health_score: 67, confidence: 0.88, flow_count: 12800, last_observed: "8 min ago", ea_status: "Unmapped", criticality: "Critical", discovery: "Pathfinder", owner: "", support_group: "", ai_summary: "LDAP authentication integration showing elevated latency (p99=340ms, up from baseline 80ms). Error rate at 1.2%. Likely caused by directory replication lag. Recommend investigating LDAP server health.", data_class: "Restricted" },
  { sys_id: "i4", name: "Shipping Platform \u2192 Carrier API", source: "Shipping Platform", target: "FedEx API", type: "API", health_status: "Healthy", health_score: 85, confidence: 0.90, flow_count: 8900, last_observed: "12 min ago", ea_status: "Suggested", criticality: "Medium", discovery: "Pathfinder", owner: "K. Patel", support_group: "Logistics", ai_summary: "", data_class: "Internal" },
  { sys_id: "i5", name: "Analytics Engine \u2192 Data Lake", source: "Analytics Engine", target: "S3 Data Lake", type: "File Transfer", health_status: "Healthy", health_score: 94, confidence: 0.85, flow_count: 2400, last_observed: "1 hr ago", ea_status: "Unmapped", criticality: "Low", discovery: "Pathfinder", owner: "", support_group: "Data Engineering", ai_summary: "", data_class: "" },
  { sys_id: "i6", name: "Notification Svc \u2192 Email Gateway", source: "Notification Service", target: "SendGrid", type: "Email", health_status: "Critical", health_score: 34, confidence: 0.91, flow_count: 67000, last_observed: "45 min ago", ea_status: "Unmapped", criticality: "High", discovery: "Pathfinder", owner: "M. Johnson", support_group: "Platform", ai_summary: "SMTP integration to SendGrid showing 4.8% error rate (threshold: 5%). Availability dropped to 96.2% in the last 24 hours. Likely hitting SendGrid rate limits. Immediate action recommended: review sending volume and implement backoff.", data_class: "Internal" },
  { sys_id: "i7", name: "CRM \u2192 Salesforce Sync", source: "Internal CRM", target: "Salesforce", type: "API", health_status: "Degraded", health_score: 62, confidence: 0.78, flow_count: 5600, last_observed: "3 hr ago", ea_status: "Disputed", criticality: "Medium", discovery: "Pathfinder", owner: "L. Williams", support_group: "Sales Ops", ai_summary: "", data_class: "Confidential" },
  { sys_id: "i8", name: "Event Bus \u2192 Kafka Cluster", source: "Event Bus", target: "Kafka Production", type: "Messaging", health_status: "Healthy", health_score: 96, confidence: 0.97, flow_count: 890000, last_observed: "1 min ago", ea_status: "Mapped", criticality: "Critical", discovery: "Pathfinder", owner: "R. Kim", support_group: "Platform", ai_summary: "High-throughput Kafka producer. ~15k messages/sec sustained. Partition health is good across all 12 partitions. Consumer lag is <100ms. This is the backbone event bus for the entire platform.", data_class: "Internal" },
];

const INTERFACES = [
  { protocol: "HTTPS", port: 443, direction: "Outbound", pattern: "Request-Reply", flow_count: 48200, latency_p50: 45, error_rate: 0.03, last_observed: "2 min ago" },
  { protocol: "HTTPS", port: 8443, direction: "Outbound", pattern: "Request-Reply", flow_count: 12100, latency_p50: 62, error_rate: 0.01, last_observed: "5 min ago" },
  { protocol: "TCP", port: 443, direction: "Inbound", pattern: "Streaming", flow_count: 3200, latency_p50: 15, error_rate: 0.00, last_observed: "8 min ago" },
];

const AGENTS = [
  { agent_id: "a1b2c3d4", hostname: "prod-web-01", status: "Active", os: "Linux", version: "0.1.0", tier: 2, last_hb: "30s ago", flows: 142000 },
  { agent_id: "e5f6g7h8", hostname: "prod-web-02", status: "Active", os: "Linux", version: "0.1.0", tier: 2, last_hb: "28s ago", flows: 138500 },
  { agent_id: "i9j0k1l2", hostname: "prod-db-01", status: "Active", os: "Linux", version: "0.1.0", tier: 3, last_hb: "15s ago", flows: 89200 },
  { agent_id: "m3n4o5p6", hostname: "prod-app-win01", status: "Active", os: "Windows", version: "0.1.0", tier: 2, last_hb: "45s ago", flows: 56700 },
  { agent_id: "q7r8s9t0", hostname: "prod-kafka-01", status: "Active", os: "Linux", version: "0.1.0", tier: 3, last_hb: "12s ago", flows: 920000 },
  { agent_id: "u1v2w3x4", hostname: "staging-web-01", status: "Stale", os: "Linux", version: "0.0.9", tier: 1, last_hb: "3 days ago", flows: 12400 },
  { agent_id: "y5z6a7b8", hostname: "dev-app-01", status: "Stale", os: "Linux", version: "0.0.8", tier: 1, last_hb: "5 days ago", flows: 3200 },
  { agent_id: "c9d0e1f2", hostname: "prod-ldap-01", status: "Active", os: "Linux", version: "0.1.0", tier: 2, last_hb: "20s ago", flows: 45600 },
];

const GAPS = [
  { server: "prod-mail-01", gap_type: "NoAgent", priority: "Critical", status: "Open", detected: "2 hr ago" },
  { server: "prod-etl-02", gap_type: "NoAgent", priority: "High", status: "Open", detected: "6 hr ago" },
  { server: "prod-cache-03", gap_type: "StaleAgent", priority: "High", status: "Open", detected: "1 day ago" },
  { server: "prod-api-gw-02", gap_type: "WrongTier", priority: "Medium", status: "Open", detected: "2 days ago" },
  { server: "staging-db-01", gap_type: "NoAgent", priority: "Low", status: "Open", detected: "3 days ago" },
  { server: "prod-web-05", gap_type: "NoAgent", priority: "High", status: "InProgress", detected: "1 day ago" },
  { server: "prod-batch-01", gap_type: "StaleAgent", priority: "Medium", status: "InProgress", detected: "4 days ago" },
  { server: "dev-test-01", gap_type: "NoAgent", priority: "Low", status: "Waived", detected: "7 days ago" },
  { server: "prod-legacy-01", gap_type: "WrongTier", priority: "Medium", status: "Resolved", detected: "5 days ago" },
  { server: "prod-mq-02", gap_type: "NoAgent", priority: "Critical", status: "Failed", detected: "3 days ago" },
];

const EA_SUGGESTIONS = [
  { ea_rel: "CRM \u2194 Salesforce (EA-2024-041)", confidence: 0.92, reason: "Exact CI match: source_ci and target_ci match EA parent and child.", status: "Suggested" },
  { ea_rel: "CRM \u2194 SF Integration (EA-2023-118)", confidence: 0.71, reason: "Fuzzy name match: 'salesforce' ~ 'sf integration' (dist=2).", status: "Suggested" },
];

const HEALTH_TREND = Array.from({ length: 30 }, (_, i) => ({
  day: `Mar ${i + 1}`,
  Availability: 99.2 + Math.random() * 0.7,
  Latency: 60 + Math.random() * 40 + (i > 22 ? 30 : 0),
  ErrorRate: 0.3 + Math.random() * 0.5 + (i > 25 ? 2 : 0),
  Throughput: 4500 + Math.random() * 1000,
}));

const HEALTH_DIST = [
  { name: "Healthy", value: 5, color: T.green },
  { name: "Degraded", value: 2, color: T.amber },
  { name: "Critical", value: 1, color: T.red },
];

const TYPE_DIST = [
  { name: "API", value: 3, color: T.blue },
  { name: "Database", value: 1, color: T.purple },
  { name: "Messaging", value: 1, color: T.amber },
  { name: "Directory", value: 1, color: T.cyan },
  { name: "Email", value: 1, color: T.red },
  { name: "File Transfer", value: 1, color: T.green },
];

// ── Components ──
const Pill = ({ children, color = T.dim, small }) => (
  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: small ? 9 : 10, padding: small ? "2px 6px" : "3px 8px", borderRadius: 4, background: `${color}20`, color, whiteSpace: "nowrap", fontWeight: 600 }}>{children}</span>
);

const KPI = ({ label, value, color = T.white, sub }) => (
  <div style={{ background: T.bgCard, borderRadius: 10, padding: "14px 16px", borderLeft: `3px solid ${color}`, minWidth: 120 }}>
    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: T.dim, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    {sub && <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>{sub}</div>}
  </div>
);

const NavItem = ({ icon, label, active, badge, badgeColor, onClick }) => (
  <button onClick={onClick} style={{
    width: "100%", padding: "10px 16px", border: "none", cursor: "pointer", borderRadius: 8,
    background: active ? T.limeDim : "transparent", display: "flex", alignItems: "center", gap: 10,
    transition: "all 0.15s",
  }}>
    <span style={{ fontSize: 14, opacity: active ? 1 : 0.5 }}>{icon}</span>
    <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? T.lime : T.text, flex: 1, textAlign: "left" }}>{label}</span>
    {badge > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: T.white, background: badgeColor || T.red, borderRadius: 10, padding: "2px 7px", minWidth: 18, textAlign: "center" }}>{badge}</span>}
  </button>
);

// ── Pages ──

function OverviewPage() {
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: T.white, marginBottom: 16 }}>Overview</h2>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <KPI label="Total Integrations" value="8" color={T.lime} />
        <KPI label="Healthy" value="5" color={T.green} />
        <KPI label="Degraded" value="2" color={T.amber} />
        <KPI label="Critical" value="1" color={T.red} />
        <KPI label="Active Agents" value="6" color={T.cyan} />
        <KPI label="Open Gaps" value="5" color={T.red} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        <div style={{ background: T.bgCard, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.white, marginBottom: 12 }}>Health Distribution</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart><Pie data={HEALTH_DIST} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
              {HEALTH_DIST.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie><Tooltip contentStyle={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11 }} /></PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 4 }}>
            {HEALTH_DIST.map((d, i) => <span key={i} style={{ fontSize: 10, color: d.color }}>{d.name}: {d.value}</span>)}
          </div>
        </div>
        <div style={{ background: T.bgCard, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.white, marginBottom: 12 }}>Integration Types</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart><Pie data={TYPE_DIST} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
              {TYPE_DIST.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie><Tooltip contentStyle={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11 }} /></PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
            {TYPE_DIST.map((d, i) => <span key={i} style={{ fontSize: 10, color: d.color }}>{d.name}: {d.value}</span>)}
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ background: T.bgCard, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.white, marginBottom: 10 }}>Recently Discovered</div>
          {INTEGRATIONS.slice(0, 5).map((i, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
              <span style={{ flex: 1, fontSize: 11, color: T.text }}>{i.name}</span>
              <Pill color={statusColor[i.health_status]} small>{i.health_status}</Pill>
              <Pill small>{i.type}</Pill>
            </div>
          ))}
        </div>
        <div style={{ background: T.bgCard, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.white, marginBottom: 10 }}>Critical Coverage Gaps</div>
          {GAPS.filter(g => g.status === "Open").slice(0, 5).map((g, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
              <span style={{ flex: 1, fontSize: 11, color: T.text }}>{g.server}</span>
              <Pill color={priorityColor[g.priority]} small>{g.priority}</Pill>
              <span style={{ fontSize: 10, color: T.dim }}>{g.detected}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IntegrationsPage() {
  const [selected, setSelected] = useState(null);
  const [detailTab, setDetailTab] = useState("overview");
  const sel = INTEGRATIONS.find(i => i.sys_id === selected);

  return (
    <div style={{ display: "flex", gap: 14, height: "calc(100vh - 100px)" }}>
      {/* Master list */}
      <div style={{ width: selected ? "40%" : "100%", overflowY: "auto", transition: "width 0.2s" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.white, marginBottom: 12 }}>Integrations</h2>
        <div style={{ background: T.bgCard, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 80px 60px 70px 70px", padding: "8px 12px", borderBottom: `1px solid ${T.border}` }}>
            {["Integration", "Type", "Health", "Score", "Flows", "Last Seen"].map(h => (
              <span key={h} style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: T.dim, letterSpacing: 1, textTransform: "uppercase" }}>{h}</span>
            ))}
          </div>
          {INTEGRATIONS.map(i => (
            <div key={i.sys_id} onClick={() => { setSelected(i.sys_id); setDetailTab("overview"); }} style={{
              display: "grid", gridTemplateColumns: "2fr 80px 80px 60px 70px 70px", padding: "10px 12px",
              borderBottom: `1px solid ${T.border}`, cursor: "pointer",
              background: selected === i.sys_id ? T.limeDim : "transparent",
            }}>
              <span style={{ fontSize: 11, color: T.white, fontWeight: selected === i.sys_id ? 600 : 400 }}>{i.name}</span>
              <Pill small>{i.type}</Pill>
              <Pill color={statusColor[i.health_status]} small>{i.health_status}</Pill>
              <div style={{ position: "relative", height: 6, borderRadius: 3, background: T.bgHover, marginTop: 4 }}>
                <div style={{ position: "absolute", left: 0, top: 0, height: 6, borderRadius: 3, width: `${i.health_score}%`, background: statusColor[i.health_status] }} />
              </div>
              <span style={{ fontSize: 10, color: T.dim }}>{(i.flow_count / 1000).toFixed(1)}k</span>
              <span style={{ fontSize: 10, color: T.dim }}>{i.last_observed}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {sel && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Header */}
          <div style={{ background: T.bgCard, borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: T.white }}>{sel.name}</span>
              <Pill color={statusColor[sel.health_status]}>{sel.health_status}</Pill>
              <Pill>{sel.type}</Pill>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <span style={{ fontSize: 11, color: T.dim }}>Score: <strong style={{ color: statusColor[sel.health_status] }}>{sel.health_score}</strong>/100</span>
              <span style={{ fontSize: 11, color: T.dim }}>Confidence: <strong style={{ color: T.white }}>{(sel.confidence * 100).toFixed(0)}%</strong></span>
              <span style={{ fontSize: 11, color: T.dim }}>Flows: <strong style={{ color: T.white }}>{sel.flow_count.toLocaleString()}</strong></span>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 2, marginBottom: 12 }}>
            {["overview", "interfaces", "health", "ea"].map(t => (
              <button key={t} onClick={() => setDetailTab(t)} style={{
                padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11,
                fontWeight: detailTab === t ? 600 : 400, color: detailTab === t ? T.bg : T.dim,
                background: detailTab === t ? T.lime : T.bgCard,
              }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
            ))}
          </div>

          {/* Tab content */}
          {detailTab === "overview" && (
            <div>
              {sel.ai_summary && (
                <div style={{ background: T.bgCard, borderRadius: 12, padding: 16, marginBottom: 12, borderLeft: `3px solid ${T.lime}` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.lime, marginBottom: 6 }}>AI Summary</div>
                  <div style={{ fontSize: 11, color: T.text, lineHeight: 1.6 }}>{sel.ai_summary}</div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: T.bgCard, borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.white, marginBottom: 8 }}>Classification</div>
                  {[["Source", sel.source], ["Target", sel.target], ["Type", sel.type], ["Confidence", `${(sel.confidence * 100).toFixed(0)}%`], ["Discovery", sel.discovery]].map(([l, v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 10, color: T.dim }}>{l}</span>
                      <span style={{ fontSize: 10, color: T.white }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: T.bgCard, borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.white, marginBottom: 8 }}>Governance</div>
                  {[["Criticality", sel.criticality], ["Data Class", sel.data_class || "Not set"], ["Owner", sel.owner || "Unassigned"], ["Support Group", sel.support_group || "Unassigned"], ["EA Status", sel.ea_status]].map(([l, v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 10, color: T.dim }}>{l}</span>
                      <span style={{ fontSize: 10, color: (!v || v === "Unassigned" || v === "Not set") ? T.amber : T.white }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {detailTab === "interfaces" && (
            <div style={{ background: T.bgCard, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "60px 50px 80px 90px 60px 70px 60px 70px", padding: "8px 12px", borderBottom: `1px solid ${T.border}` }}>
                {["Proto", "Port", "Direction", "Pattern", "Flows", "P50 (ms)", "Err %", "Last Seen"].map(h => (
                  <span key={h} style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: T.dim, letterSpacing: 1 }}>{h}</span>
                ))}
              </div>
              {INTERFACES.map((iface, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "60px 50px 80px 90px 60px 70px 60px 70px", padding: "8px 12px", borderBottom: `1px solid ${T.border}` }}>
                  <Pill color={T.blue} small>{iface.protocol}</Pill>
                  <span style={{ fontSize: 10, color: T.white }}>{iface.port}</span>
                  <span style={{ fontSize: 10, color: T.text }}>{iface.direction}</span>
                  <span style={{ fontSize: 10, color: T.dim }}>{iface.pattern}</span>
                  <span style={{ fontSize: 10, color: T.text }}>{(iface.flow_count / 1000).toFixed(1)}k</span>
                  <span style={{ fontSize: 10, color: T.text }}>{iface.latency_p50}ms</span>
                  <span style={{ fontSize: 10, color: iface.error_rate > 1 ? T.red : T.text }}>{iface.error_rate.toFixed(2)}%</span>
                  <span style={{ fontSize: 10, color: T.dim }}>{iface.last_observed}</span>
                </div>
              ))}
            </div>
          )}
          {detailTab === "health" && (
            <div style={{ background: T.bgCard, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.white, marginBottom: 12 }}>Health Metrics (30 days)</div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={HEALTH_TREND}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                  <XAxis dataKey="day" stroke={T.dim} fontSize={9} interval={4} />
                  <YAxis stroke={T.dim} fontSize={9} />
                  <Tooltip contentStyle={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 10 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="Availability" stroke={T.green} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Latency" stroke={T.blue} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="ErrorRate" stroke={T.red} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {detailTab === "ea" && (
            <div style={{ background: T.bgCard, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.white, marginBottom: 12 }}>EA Match Suggestions</div>
              {sel.ea_status === "Unmapped" || sel.ea_status === "Disputed" ? (
                EA_SUGGESTIONS.map((s, idx) => (
                  <div key={idx} style={{ padding: 12, background: T.bgHover, borderRadius: 8, marginBottom: 8, borderLeft: `3px solid ${T.amber}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: T.white }}>{s.ea_rel}</span>
                      <Pill color={eaStatusColor[s.status]} small>{s.status}</Pill>
                    </div>
                    <div style={{ fontSize: 10, color: T.dim, marginBottom: 6 }}>{s.reason}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: T.dim }}>Confidence:</span>
                      <div style={{ flex: 1, maxWidth: 120, height: 6, borderRadius: 3, background: T.bgCard }}>
                        <div style={{ height: 6, borderRadius: 3, width: `${s.confidence * 100}%`, background: s.confidence > 0.8 ? T.green : T.amber }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: T.white }}>{(s.confidence * 100).toFixed(0)}%</span>
                      <button style={{ padding: "3px 10px", borderRadius: 4, border: "none", background: T.green, color: T.bg, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Confirm</button>
                      <button style={{ padding: "3px 10px", borderRadius: 4, border: `1px solid ${T.dim}`, background: "transparent", color: T.dim, fontSize: 10, cursor: "pointer" }}>Reject</button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 11, color: T.dim, padding: 20, textAlign: "center" }}>EA mapping is {sel.ea_status.toLowerCase()}.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AgentFleetPage() {
  const active = AGENTS.filter(a => a.status === "Active").length;
  const stale = AGENTS.filter(a => a.status === "Stale").length;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: T.white, marginBottom: 16 }}>Agent Fleet</h2>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <KPI label="Active" value={active} color={T.green} />
        <KPI label="Stale" value={stale} color={T.amber} />
        <KPI label="Total Flows" value="1.41M" color={T.cyan} />
      </div>
      <div style={{ background: T.bgCard, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 80px 70px 60px 40px 80px 70px", padding: "8px 12px", borderBottom: `1px solid ${T.border}` }}>
          {["Hostname", "Agent ID", "Status", "OS", "Version", "Tier", "Heartbeat", "Flows"].map(h => (
            <span key={h} style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: T.dim, letterSpacing: 1, textTransform: "uppercase" }}>{h}</span>
          ))}
        </div>
        {AGENTS.map((a, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 80px 70px 60px 40px 80px 70px", padding: "8px 12px", borderBottom: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 11, color: T.white }}>{a.hostname}</span>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: T.dim }}>{a.agent_id}</span>
            <Pill color={agentStatusColor[a.status]} small>{a.status}</Pill>
            <span style={{ fontSize: 10, color: T.text }}>{a.os}</span>
            <span style={{ fontSize: 10, color: T.dim }}>{a.version}</span>
            <span style={{ fontSize: 10, color: T.white }}>{a.tier}</span>
            <span style={{ fontSize: 10, color: a.status === "Stale" ? T.amber : T.dim }}>{a.last_hb}</span>
            <span style={{ fontSize: 10, color: T.dim }}>{(a.flows / 1000).toFixed(1)}k</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CoverageGapsPage() {
  const lanes = ["Open", "InProgress", "Resolved", "Waived", "Failed"];
  const laneColors = { Open: T.red, InProgress: T.amber, Resolved: T.green, Waived: T.dim, Failed: T.red };

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: T.white, marginBottom: 16 }}>Coverage Gaps</h2>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <KPI label="Open Gaps" value={GAPS.filter(g => g.status === "Open").length} color={T.red} />
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto" }}>
        {lanes.map(lane => {
          const items = GAPS.filter(g => g.status === lane);
          return (
            <div key={lane} style={{ minWidth: 200, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: laneColors[lane] }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: laneColors[lane] }}>{lane}</span>
                <span style={{ fontSize: 10, color: T.dim }}>({items.length})</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {items.map((g, i) => (
                  <div key={i} style={{ background: T.bgCard, borderRadius: 8, padding: 10, borderTop: `2px solid ${priorityColor[g.priority]}` }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.white, marginBottom: 4 }}>{g.server}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <Pill color={T.dim} small>{g.gap_type}</Pill>
                      <Pill color={priorityColor[g.priority]} small>{g.priority}</Pill>
                    </div>
                    <div style={{ fontSize: 9, color: T.dim }}>{g.detected}</div>
                  </div>
                ))}
                {items.length === 0 && <div style={{ fontSize: 10, color: T.dim, textAlign: "center", padding: 20 }}>No items</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EAReconciliationPage() {
  const unmapped = INTEGRATIONS.filter(i => i.ea_status === "Unmapped");
  const [selectedEA, setSelectedEA] = useState(null);

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: T.white, marginBottom: 16 }}>EA Reconciliation</h2>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <KPI label="Unmapped" value={INTEGRATIONS.filter(i => i.ea_status === "Unmapped").length} color={T.amber} />
        <KPI label="Mapped" value={INTEGRATIONS.filter(i => i.ea_status === "Mapped").length} color={T.green} />
        <KPI label="Disputed" value={INTEGRATIONS.filter(i => i.ea_status === "Disputed").length} color={T.red} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.white, marginBottom: 10 }}>Unmapped Integrations</div>
          <div style={{ background: T.bgCard, borderRadius: 12, overflow: "hidden" }}>
            {unmapped.map(i => (
              <div key={i.sys_id} onClick={() => setSelectedEA(i.sys_id)} style={{
                padding: "10px 14px", borderBottom: `1px solid ${T.border}`, cursor: "pointer",
                background: selectedEA === i.sys_id ? T.limeDim : "transparent",
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.white, marginBottom: 4 }}>{i.name}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Pill small>{i.type}</Pill>
                  <span style={{ fontSize: 10, color: T.dim }}>{i.flow_count.toLocaleString()} flows</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.white, marginBottom: 10 }}>EA Match Suggestions</div>
          {selectedEA ? (
            <div style={{ background: T.bgCard, borderRadius: 12, padding: 16 }}>
              {EA_SUGGESTIONS.map((s, idx) => (
                <div key={idx} style={{ padding: 12, background: T.bgHover, borderRadius: 8, marginBottom: 8, borderLeft: `3px solid ${T.amber}` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.white, marginBottom: 4 }}>{s.ea_rel}</div>
                  <div style={{ fontSize: 10, color: T.dim, marginBottom: 6 }}>{s.reason}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: T.bgCard }}><div style={{ height: 6, borderRadius: 3, width: `${s.confidence * 100}%`, background: T.amber }} /></div>
                    <span style={{ fontSize: 10, color: T.white, fontWeight: 600 }}>{(s.confidence * 100).toFixed(0)}%</span>
                    <button style={{ padding: "3px 10px", borderRadius: 4, border: "none", background: T.green, color: T.bg, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Confirm</button>
                    <button style={{ padding: "3px 10px", borderRadius: 4, border: `1px solid ${T.dim}`, background: "transparent", color: T.dim, fontSize: 10, cursor: "pointer" }}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: T.bgCard, borderRadius: 12, padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 24, color: T.dim, marginBottom: 8 }}>&#x21C6;</div>
              <div style={{ fontSize: 12, color: T.dim }}>Select an unmapped integration to see suggestions</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HealthDashboardPage() {
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: T.white, marginBottom: 16 }}>Health Dashboard</h2>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
        <div style={{ background: T.bgCard, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.white, marginBottom: 12 }}>Health Score Trend (30 days)</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={HEALTH_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="day" stroke={T.dim} fontSize={9} interval={4} />
              <YAxis stroke={T.dim} fontSize={9} />
              <Tooltip contentStyle={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 10 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="Availability" stroke={T.green} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Latency" stroke={T.blue} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ErrorRate" stroke={T.red} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: T.bgCard, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.white, marginBottom: 12 }}>Distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={HEALTH_DIST} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
              {HEALTH_DIST.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie><Tooltip contentStyle={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 10 }} /></PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Availability", value: "99.7%", color: T.green, data: HEALTH_TREND.map(d => d.Availability) },
          { label: "Latency (ms)", value: "72ms", color: T.blue, data: HEALTH_TREND.map(d => d.Latency) },
          { label: "Error Rate", value: "0.8%", color: T.red, data: HEALTH_TREND.map(d => d.ErrorRate) },
          { label: "Throughput", value: "5.1k/s", color: T.purple, data: HEALTH_TREND.map(d => d.Throughput) },
        ].map((m, i) => (
          <div key={i} style={{ background: T.bgCard, borderRadius: 10, padding: 12, borderTop: `3px solid ${m.color}` }}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 8, color: T.dim, letterSpacing: 1, textTransform: "uppercase" }}>{m.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: m.color }}>{m.value}</div>
            <ResponsiveContainer width="100%" height={40}>
              <AreaChart data={m.data.map((v, j) => ({ v, i: j }))}>
                <Area type="monotone" dataKey="v" stroke={m.color} fill={`${m.color}20`} strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
      <div style={{ background: T.bgCard, borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.white, marginBottom: 10 }}>Critical Integrations</div>
        {INTEGRATIONS.filter(i => i.health_status === "Critical" || i.health_status === "Degraded").map((i, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
            <span style={{ flex: 1, fontSize: 11, color: T.white }}>{i.name}</span>
            <Pill color={statusColor[i.health_status]} small>{i.health_status}</Pill>
            <span style={{ fontSize: 11, fontWeight: 700, color: statusColor[i.health_status] }}>{i.health_score}</span>
            <Pill small>{i.type}</Pill>
            <span style={{ fontSize: 10, color: T.dim }}>{i.last_observed}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Workspace Shell ──
const PAGES = [
  { id: "overview", label: "Overview", icon: "\u2302", page: OverviewPage },
  { id: "integrations", label: "Integrations", icon: "\u21CC", page: IntegrationsPage, badge: 1, badgeColor: T.red },
  { id: "agents", label: "Agent Fleet", icon: "\u25C9", page: AgentFleetPage, badge: 2, badgeColor: T.amber },
  { id: "gaps", label: "Coverage Gaps", icon: "\u25B2", page: CoverageGapsPage, badge: 5, badgeColor: T.red },
  { id: "ea", label: "EA Reconciliation", icon: "\u2295", page: EAReconciliationPage },
  { id: "health", label: "Health Dashboard", icon: "\uD83D\uDCC8", page: HealthDashboardPage },
];

export default function PathfinderWorkspace() {
  const [activePage, setActivePage] = useState("overview");
  const ActiveComponent = PAGES.find(p => p.id === activePage)?.page || OverviewPage;

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif", background: T.bg, color: T.text, minHeight: "100vh", display: "flex" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.bgHover}; border-radius: 3px; }
        button { font-family: inherit; }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: 240, background: T.bgCard, borderRight: `1px solid ${T.border}`, padding: "16px 10px", flexShrink: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 6px", marginBottom: 20 }}>
          <div style={{ width: 8, height: 8, background: T.lime, borderRadius: "50%", boxShadow: `0 0 8px ${T.lime}` }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>Pathfinder</div>
            <div style={{ fontSize: 9, color: T.dim }}>Integration Intelligence</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {PAGES.map(p => (
            <NavItem key={p.id} icon={p.icon} label={p.label} active={activePage === p.id}
              badge={p.badge} badgeColor={p.badgeColor} onClick={() => setActivePage(p.id)} />
          ))}
        </div>

        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10, marginTop: 10 }}>
          <div style={{ fontSize: 9, color: T.dim, padding: "4px 6px" }}>AVENNORTH</div>
          <div style={{ fontSize: 8, color: T.dim, padding: "0 6px" }}>Pathfinder v0.1.0</div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
        <ActiveComponent />
      </div>
    </div>
  );
}
