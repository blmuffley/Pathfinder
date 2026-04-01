/**
 * Avennorth Pathfinder Clinical Extension — Analytics Page
 * Dashboards, charts, facility comparison, and cost analysis.
 */
import { useState, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  T, tierColor, tierLabel, Pill, KPI,
  CLINICAL_DEVICES, FACILITIES, TIER_DISTRIBUTION, HEALTH_TREND,
  DEVICE_BY_DEPARTMENT, SOURCE_COVERAGE, COMPLIANCE_FINDINGS, CLINICAL_INCIDENTS,
} from "../data/demoData";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 6, padding: 10, fontSize: 11 }}>
      <div style={{ color: T.white, fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || T.text }}>{p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}</div>
      ))}
    </div>
  );
};

// Facility summary data
const FACILITY_SUMMARY = [
  { name: "Main Campus", id: "FAC-MAIN", devices: 4200, clinical: 16, lifeCritical: 7, complianceScore: 84, incidents: 3 },
  { name: "West Hospital", id: "FAC-WEST", devices: 1800, clinical: 2, lifeCritical: 1, complianceScore: 96, incidents: 0 },
  { name: "South Clinic", id: "FAC-SOUTH", devices: 400, clinical: 2, lifeCritical: 0, complianceScore: 71, incidents: 0 },
];

// Cost analysis
const COST_TIERS = [
  { tier: "Tier 1 - IT", count: 4800, pricePerDevice: 2.50, color: T.blue },
  { tier: "Tier 2 - IoT/OT", count: 1200, pricePerDevice: 5.00, color: T.cyan },
  { tier: "Tier 3 - Clinical", count: 380, pricePerDevice: 12.00, color: T.amber },
  { tier: "Tier 4 - Life-Critical", count: 45, pricePerDevice: 25.00, color: T.red },
];

export default function Analytics() {
  const [facility, setFacility] = useState("ALL");

  // Filtered data by facility
  const filteredDevices = useMemo(() => {
    if (facility === "ALL") return CLINICAL_DEVICES;
    return CLINICAL_DEVICES.filter((d) => d.facility === facility);
  }, [facility]);

  const clinicalCount = filteredDevices.length;
  const totalDevices = facility === "ALL"
    ? FACILITIES.reduce((s, f) => s + f.devices, 0)
    : FACILITIES.find((f) => f.id === facility)?.devices || 0;
  const activeIncidents = facility === "ALL"
    ? CLINICAL_INCIDENTS.filter((i) => i.status !== "Resolved").length
    : CLINICAL_INCIDENTS.filter((i) => i.status !== "Resolved" && i.facility === facility).length;
  const complianceScore = facility === "ALL"
    ? 84
    : FACILITY_SUMMARY.find((f) => f.id === facility)?.complianceScore || 0;

  // Donut data for tier distribution
  const donutData = useMemo(() => {
    if (facility === "ALL") return TIER_DISTRIBUTION;
    // Approximate for filtered facility
    const scale = (FACILITIES.find((f) => f.id === facility)?.devices || 0) / 6400;
    return TIER_DISTRIBUTION.map((t) => ({ ...t, count: Math.round(t.count * scale) }));
  }, [facility]);

  // Department bar data — filter if facility is selected
  const deptData = useMemo(() => {
    if (facility === "ALL") return DEVICE_BY_DEPARTMENT;
    // Show subset for non-main facilities
    if (facility === "FAC-WEST") return [
      { dept: "ICU", t3: 1, t4: 1, total: 2 },
      { dept: "Radiology", t3: 1, t4: 0, total: 1 },
    ];
    if (facility === "FAC-SOUTH") return [
      { dept: "Imaging", t3: 2, t4: 0, total: 2 },
    ];
    return DEVICE_BY_DEPARTMENT;
  }, [facility]);

  // Source coverage bar data
  const srcCovData = SOURCE_COVERAGE.filter((s) =>
    ["Pathfinder eBPF", "Armis", "Both PF + Armis"].includes(s.source)
  );

  const btnStyle = (active) => ({
    padding: "6px 14px",
    fontSize: 11,
    fontFamily: "'Space Mono',monospace",
    borderRadius: 6,
    border: `1px solid ${active ? T.lime : T.border}`,
    background: active ? T.limeDim : "transparent",
    color: active ? T.lime : T.dim,
    cursor: "pointer",
  });

  const totalMonthly = COST_TIERS.reduce((s, t) => s + t.count * t.pricePerDevice, 0);

  return (
    <div style={{ padding: 24, background: T.bg, minHeight: "100vh", color: T.text, fontFamily: "'Inter',sans-serif" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: T.white, marginBottom: 4 }}>Analytics</h1>
      <p style={{ fontSize: 12, color: T.dim, marginBottom: 16 }}>Fleet analytics, trends, and cost analysis</p>

      {/* Facility Selector */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button style={btnStyle(facility === "ALL")} onClick={() => setFacility("ALL")}>All Facilities</button>
        {FACILITIES.map((f) => (
          <button key={f.id} style={btnStyle(facility === f.id)} onClick={() => setFacility(f.id)}>
            {f.name.replace("Mercy Health ", "").replace("Mercy ", "")}
          </button>
        ))}
      </div>

      {/* Row 1: KPI Tiles */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <KPI value={totalDevices.toLocaleString()} label="Total Devices" color={T.lime} sub="All tiers" />
        <KPI value={clinicalCount} label="Clinical Devices" color={T.amber} sub="T3 + T4 in scope" />
        <KPI
          value={`${complianceScore}%`}
          label="Compliance Score"
          color={complianceScore >= 90 ? T.green : complianceScore >= 75 ? T.amber : T.red}
          sub="Joint Commission composite"
        />
        <KPI
          value={activeIncidents}
          label="Active Incidents"
          color={activeIncidents > 0 ? T.red : T.green}
          sub="Open clinical incidents"
        />
      </div>

      {/* Row 2: Tier Donut + Department Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* Tier Donut */}
        <div style={{ background: T.bgCard, borderRadius: 10, padding: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: T.white, marginBottom: 12 }}>Device Distribution by Tier</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="count"
                nameKey="tier"
                paddingAngle={2}
              >
                {donutData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, color: T.dim }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Department Horizontal Bar */}
        <div style={{ background: T.bgCard, borderRadius: 10, padding: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: T.white, marginBottom: 12 }}>Devices by Department</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={deptData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid stroke={T.border} horizontal={false} />
              <XAxis type="number" tick={{ fill: T.dim, fontSize: 10 }} />
              <YAxis type="category" dataKey="dept" tick={{ fill: T.dim, fontSize: 10 }} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, color: T.dim }} />
              <Bar dataKey="t3" name="Tier 3" stackId="a" fill={T.amber} radius={[0, 0, 0, 0]} />
              <Bar dataKey="t4" name="Tier 4" stackId="a" fill={T.red} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Health Trend + Source Coverage */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* Health Trend */}
        <div style={{ background: T.bgCard, borderRadius: 10, padding: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: T.white, marginBottom: 12 }}>Health Trend (30 Days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={HEALTH_TREND} margin={{ left: 10, right: 20 }}>
              <CartesianGrid stroke={T.border} />
              <XAxis dataKey="day" tick={{ fill: T.dim, fontSize: 9 }} interval={4} />
              <YAxis domain={[60, 100]} tick={{ fill: T.dim, fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, color: T.dim }} />
              <Line type="monotone" dataKey="tier1Health" name="T1 IT" stroke={T.blue} strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="tier3Health" name="T3 Clinical" stroke={T.amber} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="tier4Health" name="T4 Life-Critical" stroke={T.red} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Source Coverage */}
        <div style={{ background: T.bgCard, borderRadius: 10, padding: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: T.white, marginBottom: 12 }}>Source Coverage</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={srcCovData} margin={{ left: 10, right: 20 }}>
              <CartesianGrid stroke={T.border} vertical={false} />
              <XAxis dataKey="source" tick={{ fill: T.dim, fontSize: 10 }} />
              <YAxis tick={{ fill: T.dim, fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="devices" name="Devices" radius={[4, 4, 0, 0]}>
                <Cell fill={T.lime} />
                <Cell fill={T.cyan} />
                <Cell fill={T.blue} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 4: Summary Tables */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Facility Comparison */}
        <div style={{ background: T.bgCard, borderRadius: 10, padding: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: T.white, marginBottom: 12 }}>Facility Comparison</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["Facility", "Devices", "Clinical", "Life-Critical", "Compliance", "Incidents"].map((h) => (
                  <th key={h} style={{ padding: "8px 6px", textAlign: "left", color: T.dim, fontWeight: 500, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FACILITY_SUMMARY.map((f) => (
                <tr
                  key={f.id}
                  style={{ borderBottom: `1px solid ${T.border}` }}
                  onMouseEnter={(e) => e.currentTarget.style.background = T.bgHover}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "8px 6px", color: T.white, fontWeight: 500 }}>{f.name}</td>
                  <td style={{ padding: "8px 6px", fontFamily: "'Space Mono',monospace" }}>{f.devices.toLocaleString()}</td>
                  <td style={{ padding: "8px 6px", fontFamily: "'Space Mono',monospace" }}>{f.clinical}</td>
                  <td style={{ padding: "8px 6px" }}>
                    <Pill color={f.lifeCritical > 0 ? T.red : T.dim}>{f.lifeCritical}</Pill>
                  </td>
                  <td style={{ padding: "8px 6px" }}>
                    <span style={{
                      fontFamily: "'Space Mono',monospace",
                      color: f.complianceScore >= 90 ? T.green : f.complianceScore >= 75 ? T.amber : T.red,
                    }}>
                      {f.complianceScore}%
                    </span>
                  </td>
                  <td style={{ padding: "8px 6px" }}>
                    <Pill color={f.incidents > 0 ? T.red : T.green}>{f.incidents}</Pill>
                  </td>
                </tr>
              ))}
              {/* Totals Row */}
              <tr style={{ borderTop: `2px solid ${T.limeBorder}` }}>
                <td style={{ padding: "8px 6px", color: T.lime, fontWeight: 700, fontSize: 11 }}>TOTAL</td>
                <td style={{ padding: "8px 6px", fontFamily: "'Space Mono',monospace", color: T.lime, fontWeight: 700 }}>
                  {FACILITY_SUMMARY.reduce((s, f) => s + f.devices, 0).toLocaleString()}
                </td>
                <td style={{ padding: "8px 6px", fontFamily: "'Space Mono',monospace", color: T.lime, fontWeight: 700 }}>
                  {FACILITY_SUMMARY.reduce((s, f) => s + f.clinical, 0)}
                </td>
                <td style={{ padding: "8px 6px", fontFamily: "'Space Mono',monospace", color: T.lime, fontWeight: 700 }}>
                  {FACILITY_SUMMARY.reduce((s, f) => s + f.lifeCritical, 0)}
                </td>
                <td style={{ padding: "8px 6px", fontFamily: "'Space Mono',monospace", color: T.lime, fontWeight: 700 }}>
                  {Math.round(FACILITY_SUMMARY.reduce((s, f) => s + f.complianceScore, 0) / FACILITY_SUMMARY.length)}%
                </td>
                <td style={{ padding: "8px 6px", fontFamily: "'Space Mono',monospace", color: T.lime, fontWeight: 700 }}>
                  {FACILITY_SUMMARY.reduce((s, f) => s + f.incidents, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cost Analysis */}
        <div style={{ background: T.bgCard, borderRadius: 10, padding: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: T.white, marginBottom: 12 }}>Cost Analysis</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["Tier", "Devices", "$/Device/Mo", "Monthly", "Annual"].map((h) => (
                  <th key={h} style={{ padding: "8px 6px", textAlign: "left", color: T.dim, fontWeight: 500, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COST_TIERS.map((t) => {
                const monthly = t.count * t.pricePerDevice;
                const annual = monthly * 12;
                return (
                  <tr
                    key={t.tier}
                    style={{ borderBottom: `1px solid ${T.border}` }}
                    onMouseEnter={(e) => e.currentTarget.style.background = T.bgHover}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "8px 6px" }}>
                      <Pill color={t.color}>{t.tier}</Pill>
                    </td>
                    <td style={{ padding: "8px 6px", fontFamily: "'Space Mono',monospace" }}>{t.count.toLocaleString()}</td>
                    <td style={{ padding: "8px 6px", fontFamily: "'Space Mono',monospace" }}>${t.pricePerDevice.toFixed(2)}</td>
                    <td style={{ padding: "8px 6px", fontFamily: "'Space Mono',monospace" }}>${monthly.toLocaleString()}</td>
                    <td style={{ padding: "8px 6px", fontFamily: "'Space Mono',monospace" }}>${annual.toLocaleString()}</td>
                  </tr>
                );
              })}
              {/* Totals Row */}
              <tr style={{ borderTop: `2px solid ${T.limeBorder}` }}>
                <td style={{ padding: "8px 6px", color: T.lime, fontWeight: 700 }}>TOTAL</td>
                <td style={{ padding: "8px 6px", fontFamily: "'Space Mono',monospace", color: T.lime, fontWeight: 700 }}>
                  {COST_TIERS.reduce((s, t) => s + t.count, 0).toLocaleString()}
                </td>
                <td style={{ padding: "8px 6px" }}></td>
                <td style={{ padding: "8px 6px", fontFamily: "'Space Mono',monospace", color: T.lime, fontWeight: 700 }}>
                  ${totalMonthly.toLocaleString()}
                </td>
                <td style={{ padding: "8px 6px", fontFamily: "'Space Mono',monospace", color: T.lime, fontWeight: 700 }}>
                  ${(totalMonthly * 12).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: 12, padding: 10, background: T.bg, borderRadius: 6, fontSize: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: T.dim }}>Blended avg per device</span>
              <span style={{ color: T.lime, fontFamily: "'Space Mono',monospace" }}>
                ${(totalMonthly / COST_TIERS.reduce((s, t) => s + t.count, 0)).toFixed(2)}/mo
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: T.dim }}>Clinical premium (T3+T4 uplift)</span>
              <span style={{ color: T.amber, fontFamily: "'Space Mono',monospace" }}>
                ${((380 * 12 + 45 * 25) / (380 + 45)).toFixed(2)}/mo avg
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
