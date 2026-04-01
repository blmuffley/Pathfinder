/**
 * Avennorth Pathfinder Clinical Extension — Discovery Sources Page
 * Multi-source normalization, coverage, confidence, and conflict resolution.
 */
import { useState, useMemo } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  T, tierColor, statusColor, Pill, KPI,
  DISCOVERY_SOURCES, CLINICAL_DEVICES, SOURCE_COVERAGE,
} from "../data/demoData";

const sourceLabel = { pathfinder_ebpf: "Pathfinder eBPF", armis: "Armis", sn_discovery: "SN Discovery", manual: "Manual" };
const sourceColor = { pathfinder_ebpf: T.lime, armis: T.cyan, sn_discovery: T.blue, manual: T.dim };
const statusDot = { Active: T.green, Stale: T.amber, Inactive: T.red };

// Mock conflict data
const CONFLICTS = [
  {
    id: "CON-001",
    device: "Infusion Pump Rack 3N-A",
    deviceId: "DEV-IP01",
    field: "Tier Classification",
    sourceA: { name: "Pathfinder eBPF", value: "Tier 3 - Clinical", confidence: 0.88 },
    sourceB: { name: "Armis", value: "Tier 2 - IoT/OT", confidence: 0.72 },
    winner: "Pathfinder eBPF",
    resolution: "Higher confidence source selected",
  },
  {
    id: "CON-002",
    device: "Portable X-Ray",
    deviceId: "DEV-XR01",
    field: "Protocol",
    sourceA: { name: "Armis", value: "DICOM", confidence: 0.82 },
    sourceB: { name: "SN Discovery", value: "HL7", confidence: 0.55 },
    winner: "Armis",
    resolution: "DICOM traffic confirmed via deep packet inspection",
  },
  {
    id: "CON-003",
    device: "CT Scanner South",
    deviceId: "DEV-SCT1",
    field: "Department",
    sourceA: { name: "Armis", value: "Imaging", confidence: 0.88 },
    sourceB: { name: "Manual Import", value: "Radiology", confidence: 0.30 },
    winner: "Armis",
    resolution: "Higher confidence; manual data outdated (Q1 import)",
  },
  {
    id: "CON-004",
    device: "Chemistry Analyzer",
    deviceId: "DEV-LAB1",
    field: "Manufacturer",
    sourceA: { name: "Pathfinder eBPF", value: "Roche Diagnostics", confidence: 0.92 },
    sourceB: { name: "SN Discovery", value: "Roche", confidence: 0.60 },
    winner: "Pathfinder eBPF",
    resolution: "Normalized to full entity name from eBPF certificate data",
  },
];

// Confidence distribution
const CONFIDENCE_DIST = [
  { level: "0.30", count: 12, color: T.red },
  { level: "0.60", count: 28, color: T.amber },
  { level: "0.70", count: 45, color: T.amber },
  { level: "0.85", count: 92, color: T.blue },
  { level: "0.90+", count: 248, color: T.green },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 6, padding: 10, fontSize: 11 }}>
      <div style={{ color: T.white, fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || T.text }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

export default function DiscoverySources() {
  const [selectedSource, setSelectedSource] = useState(null);

  // KPI calculations
  const totalSources = DISCOVERY_SOURCES.length;
  const totalDevices = DISCOVERY_SOURCES.reduce((s, src) => s + src.devices, 0);
  const multiSourceDevices = SOURCE_COVERAGE.find((s) => s.source === "Both PF + Armis")?.devices || 3400;
  const avgConfidence = (
    CLINICAL_DEVICES.reduce((s, d) => s + d.confidence, 0) / CLINICAL_DEVICES.length
  ).toFixed(2);

  // Coverage stacked bar data
  const coverageData = [
    { category: "Coverage", ebpfOnly: 600, armisOnly: 1700, both: 3400, snDiscovery: 3200, manual: 800 },
  ];

  return (
    <div style={{ padding: 24, background: T.bg, minHeight: "100vh", color: T.text, fontFamily: "'Inter',sans-serif" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: T.white, marginBottom: 4 }}>Discovery Sources</h1>
      <p style={{ fontSize: 12, color: T.dim, marginBottom: 20 }}>Multi-source normalization, confidence scoring, and conflict resolution</p>

      {/* KPI Row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <KPI value={totalSources} label="Total Sources" color={T.lime} />
        <KPI value={totalDevices.toLocaleString()} label="Total Discovered" color={T.cyan} sub="All sources combined" />
        <KPI value={multiSourceDevices.toLocaleString()} label="Multi-Source" color={T.blue} sub="Corroborated by 2+ sources" />
        <KPI value={avgConfidence} label="Avg Confidence" color={parseFloat(avgConfidence) >= 0.85 ? T.green : T.amber} />
      </div>

      {/* Source Cards */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: T.white, marginBottom: 12 }}>Active Sources</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260, 1fr))", gap: 12 }}>
          {DISCOVERY_SOURCES.map((src) => {
            const isSelected = selectedSource === src.id;
            return (
              <div
                key={src.id}
                onClick={() => setSelectedSource(isSelected ? null : src.id)}
                style={{
                  background: isSelected ? T.limeDim : T.bgCard,
                  borderRadius: 10,
                  padding: 16,
                  border: `1px solid ${isSelected ? T.limeBorder : T.border}`,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.white }}>{src.name}</span>
                  <span style={{
                    width: 8, height: 8, borderRadius: 4,
                    background: statusDot[src.status] || T.dim,
                    display: "inline-block",
                  }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 }}>
                  <div>
                    <div style={{ color: T.dim, fontSize: 10 }}>Type</div>
                    <div style={{ fontFamily: "'Space Mono',monospace", color: sourceColor[src.type] || T.text }}>{sourceLabel[src.type] || src.type}</div>
                  </div>
                  <div>
                    <div style={{ color: T.dim, fontSize: 10 }}>Devices</div>
                    <div style={{ fontFamily: "'Space Mono',monospace", color: T.white }}>{src.devices.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ color: T.dim, fontSize: 10 }}>Weight</div>
                    <div style={{ fontFamily: "'Space Mono',monospace" }}>{src.weight.toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ color: T.dim, fontSize: 10 }}>Last Sync</div>
                    <div style={{ color: src.status === "Stale" ? T.amber : T.text }}>{src.lastSync}</div>
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Pill color={statusDot[src.status] || T.dim}>{src.status}</Pill>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Source Coverage */}
        <div style={{ background: T.bgCard, borderRadius: 10, padding: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: T.white, marginBottom: 12 }}>Source Coverage Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={coverageData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid stroke={T.border} horizontal={false} />
              <XAxis type="number" tick={{ fill: T.dim, fontSize: 10 }} />
              <YAxis type="category" dataKey="category" tick={{ fill: T.dim, fontSize: 10 }} width={70} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, color: T.dim }} />
              <Bar dataKey="ebpfOnly" name="eBPF Only" stackId="a" fill={T.lime} />
              <Bar dataKey="armisOnly" name="Armis Only" stackId="a" fill={T.cyan} />
              <Bar dataKey="both" name="Both" stackId="a" fill={T.blue} />
              <Bar dataKey="snDiscovery" name="SN Discovery" stackId="a" fill={T.purple} />
              <Bar dataKey="manual" name="Manual" stackId="a" fill={T.dim} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Confidence Distribution */}
        <div style={{ background: T.bgCard, borderRadius: 10, padding: 16 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: T.white, marginBottom: 12 }}>Confidence Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={CONFIDENCE_DIST} margin={{ left: 10, right: 20 }}>
              <CartesianGrid stroke={T.border} vertical={false} />
              <XAxis dataKey="level" tick={{ fill: T.dim, fontSize: 10 }} />
              <YAxis tick={{ fill: T.dim, fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Devices" radius={[4, 4, 0, 0]}>
                {CONFIDENCE_DIST.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Conflict Resolution Panel */}
      <div style={{ background: T.bgCard, borderRadius: 10, padding: 16 }}>
        <h3 style={{ fontSize: 12, fontWeight: 600, color: T.white, marginBottom: 4 }}>Conflict Resolution</h3>
        <p style={{ fontSize: 11, color: T.dim, marginBottom: 12 }}>
          Devices where discovery sources disagree on classification fields
        </p>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              {["Device", "Field", "Source A", "Value A", "Conf A", "Source B", "Value B", "Conf B", "Winner", "Delta", "Resolution"].map((h) => (
                <th key={h} style={{ padding: "8px 6px", textAlign: "left", color: T.dim, fontWeight: 500, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CONFLICTS.map((c) => {
              const delta = Math.abs(c.sourceA.confidence - c.sourceB.confidence).toFixed(2);
              return (
                <tr key={c.id} style={{ borderBottom: `1px solid ${T.border}` }}
                  onMouseEnter={(e) => e.currentTarget.style.background = T.bgHover}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "8px 6px", color: T.white, fontWeight: 500 }}>{c.device}</td>
                  <td style={{ padding: "8px 6px" }}>{c.field}</td>
                  <td style={{ padding: "8px 6px", color: c.winner === c.sourceA.name ? T.lime : T.text }}>
                    {c.sourceA.name}
                  </td>
                  <td style={{ padding: "8px 6px", fontFamily: "'Space Mono',monospace", fontSize: 10 }}>
                    {c.sourceA.value}
                  </td>
                  <td style={{ padding: "8px 6px", fontFamily: "'Space Mono',monospace" }}>
                    {c.sourceA.confidence.toFixed(2)}
                  </td>
                  <td style={{ padding: "8px 6px", color: c.winner === c.sourceB.name ? T.lime : T.text }}>
                    {c.sourceB.name}
                  </td>
                  <td style={{ padding: "8px 6px", fontFamily: "'Space Mono',monospace", fontSize: 10 }}>
                    {c.sourceB.value}
                  </td>
                  <td style={{ padding: "8px 6px", fontFamily: "'Space Mono',monospace" }}>
                    {c.sourceB.confidence.toFixed(2)}
                  </td>
                  <td style={{ padding: "8px 6px" }}>
                    <Pill color={T.lime}>{c.winner}</Pill>
                  </td>
                  <td style={{ padding: "8px 6px", fontFamily: "'Space Mono',monospace", color: parseFloat(delta) > 0.2 ? T.amber : T.text }}>
                    +{delta}
                  </td>
                  <td style={{ padding: "8px 6px", fontSize: 10, color: T.dim, maxWidth: 200 }}>
                    {c.resolution}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
