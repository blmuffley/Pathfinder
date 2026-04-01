/**
 * Vantage Clinical — Incident Response
 * "Spots wrong turns. Reroutes clinical operations."
 *
 * Active incidents, detailed incident view, MAUDE monitoring.
 */
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  T, Pill, KPI, CLINICAL_INCIDENTS, CLINICAL_DEVICES,
  MAUDE_MATCHES, STAFF, priorityColor,
} from "../data/demoData";

const TABS = ["Active Incidents", "Incident Detail", "MAUDE Monitoring"];

const cardStyle = {
  background: T.bgCard, borderRadius: 10, padding: 16,
  border: `1px solid ${T.border}`,
};

function psisColor(score) {
  if (score >= 81) return T.red;
  if (score >= 51) return "#f97316";
  if (score >= 21) return T.amber;
  return T.blue;
}

// ── Derived KPIs ──
const activeCount = CLINICAL_INCIDENTS.filter((i) => i.status === "Active" || i.status === "Investigating").length;
const avgPsis = Math.round(CLINICAL_INCIDENTS.reduce((a, i) => a + i.psis, 0) / CLINICAL_INCIDENTS.length);
const totalPatients = CLINICAL_INCIDENTS.reduce((a, i) => a + i.blastRadius.patients, 0);
const maudeAlerts = MAUDE_MATCHES.length;

// ── Sort by PSIS desc ──
const sortedIncidents = [...CLINICAL_INCIDENTS].sort((a, b) => b.psis - a.psis);

// ── PSIS breakdown for INC-001 ──
const PSIS_BREAKDOWN = [
  { factor: "Device Tier", points: 40, max: 40, desc: "Tier 4 life-critical device" },
  { factor: "Active Procedures", points: 6, max: 15, desc: "3 active procedures affected" },
  { factor: "No Backup Penalty", points: 0, max: 20, desc: "Backup device available" },
  { factor: "Staff Coverage", points: -5, max: 0, desc: "Certified staff on shift" },
  { factor: "Time Sensitivity", points: 15, max: 20, desc: "ICU setting, high urgency" },
  { factor: "FDA MAUDE Match", points: 20, max: 25, desc: "Active MAUDE report MW5091456" },
];

const PSIS_RADAR = [
  { factor: "Device Tier", value: 100 },
  { factor: "Procedures", value: 40 },
  { factor: "Backup Risk", value: 10 },
  { factor: "Staff Cover", value: 75 },
  { factor: "Time Urgency", value: 75 },
  { factor: "FDA Signal", value: 80 },
];

// ── Timeline for INC-001 ──
const TIMELINE = [
  { time: "13:55", label: "Anomaly detected", desc: "Pathfinder eBPF observed calibration drift signal on DEV-V003", color: T.amber },
  { time: "13:56", label: "PSIS calculated", desc: "Patient Safety Impact Score: 78 (High). Auto-classified as P1.", color: "#f97316" },
  { time: "13:57", label: "MAUDE cross-reference", desc: "Matched MAUDE report MW5091456: O2 sensor drift in Getinge Servo-u", color: T.red },
  { time: "13:58", label: "Backup identified", desc: "DEV-V001 (ICU Ventilator #1) available in CICU Bay 1", color: T.green },
  { time: "13:58", label: "Staff notified", desc: "Sarah Chen, RRT (certified, on shift) notified via UKG integration", color: T.lime },
  { time: "14:00", label: "BMET paged", desc: "Mike Thompson paged for emergency calibration assessment", color: T.amber },
  { time: "14:05", label: "ICU attending notified", desc: "Dr. Williams notified of potential patient impact", color: T.purple },
  { time: "14:30", label: "Current status", desc: "Incident active. BMET en route. Backup ventilator on standby.", color: T.lime },
];

// ── Component ──
export default function VantageClinical() {
  const [tab, setTab] = useState(0);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: T.white }}>Vantage Clinical</h1>
        <div style={{ fontSize: 13, color: T.dim, marginTop: 2, fontStyle: "italic" }}>
          Spots wrong turns. Reroutes clinical operations.
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <KPI value={activeCount} label="Active Incidents" color={T.red} />
        <KPI value={avgPsis} label="Avg PSIS Score" color={psisColor(avgPsis)} />
        <KPI value={totalPatients} label="Patients Affected" color={T.amber} />
        <KPI value={maudeAlerts} label="MAUDE Alerts" color={T.red} />
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${T.border}` }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            padding: "8px 16px", border: "none", cursor: "pointer",
            background: tab === i ? T.limeDim : "transparent",
            color: tab === i ? T.lime : T.dim,
            fontSize: 12, fontWeight: tab === i ? 600 : 400,
            borderBottom: tab === i ? `2px solid ${T.lime}` : "2px solid transparent",
            fontFamily: "inherit", transition: "all 0.15s",
          }}>{t}</button>
        ))}
      </div>

      {tab === 0 && <ActiveIncidents />}
      {tab === 1 && <IncidentDetail />}
      {tab === 2 && <MAUDEMonitoring />}
    </div>
  );
}

// ── Active Incidents ──
function ActiveIncidents() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {sortedIncidents.map((inc) => {
        const device = CLINICAL_DEVICES.find((d) => d.id === inc.device);
        const br = inc.blastRadius;
        return (
          <div key={inc.id} style={{
            ...cardStyle,
            borderLeft: `3px solid ${psisColor(inc.psis)}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* PSIS score large */}
                <div style={{
                  width: 64, height: 64, borderRadius: 10, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  background: `${psisColor(inc.psis)}15`, border: `2px solid ${psisColor(inc.psis)}`,
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: psisColor(inc.psis), fontFamily: "'Space Mono',monospace" }}>{inc.psis}</div>
                  <div style={{ fontSize: 8, color: psisColor(inc.psis), fontFamily: "'Space Mono',monospace" }}>PSIS</div>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: T.white }}>{inc.id}</span>
                    <Pill color={priorityColor[inc.priority.replace("P1", "Critical").replace("P2", "High").replace("P3", "Medium").replace("P4", "Low")] || T.dim}>
                      {inc.priority}
                    </Pill>
                    <Pill color={inc.status === "Active" ? T.red : inc.status === "Investigating" ? T.amber : T.green}>
                      {inc.status}
                    </Pill>
                  </div>
                  <div style={{ fontSize: 13, color: T.text, marginTop: 4 }}>
                    {device ? device.name : inc.device} -- {inc.type}
                  </div>
                  <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>Created: {inc.created}</div>
                </div>
              </div>
            </div>

            {/* Blast radius summary */}
            <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
              {[
                { label: "Devices", value: br.devices, color: T.cyan },
                { label: "Procedures", value: br.procedures, color: T.amber },
                { label: "Patients", value: br.patients, color: T.red },
                { label: "Staff", value: br.staff, color: T.purple },
              ].map((b) => (
                <div key={b.label} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "4px 10px",
                  background: `${b.color}10`, borderRadius: 6, border: `1px solid ${b.color}25`,
                }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: b.color, fontFamily: "'Space Mono',monospace" }}>{b.value}</span>
                  <span style={{ fontSize: 10, color: T.dim }}>{b.label}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 10, fontSize: 11, color: T.dim }}>
              <strong style={{ color: T.text }}>Escalation:</strong> {inc.escalation}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Incident Detail (INC-001) ──
function IncidentDetail() {
  const inc = CLINICAL_INCIDENTS.find((i) => i.id === "INC-001");
  const device = CLINICAL_DEVICES.find((d) => d.id === inc.device);
  const backupDevice = CLINICAL_DEVICES.find((d) => d.id === "DEV-V001");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header card */}
      <div style={{ ...cardStyle, borderLeft: `3px solid ${psisColor(inc.psis)}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.white }}>{inc.id}: {device?.name}</div>
            <div style={{ fontSize: 12, color: T.dim, marginTop: 2 }}>{inc.type} | {device?.department} | {device?.careArea}</div>
          </div>
          <div style={{
            width: 80, height: 80, borderRadius: 12, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: `${psisColor(inc.psis)}15`, border: `2px solid ${psisColor(inc.psis)}`,
          }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: psisColor(inc.psis), fontFamily: "'Space Mono',monospace" }}>{inc.psis}</div>
            <div style={{ fontSize: 9, color: psisColor(inc.psis), fontFamily: "'Space Mono',monospace" }}>PSIS</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Timeline */}
        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.white, marginBottom: 14 }}>Escalation Timeline</div>
          <div style={{ position: "relative", paddingLeft: 24 }}>
            {/* Vertical line */}
            <div style={{
              position: "absolute", left: 7, top: 4, bottom: 4, width: 2,
              background: `linear-gradient(180deg, ${T.amber}, ${T.lime})`,
            }} />
            {TIMELINE.map((step, i) => (
              <div key={i} style={{ marginBottom: 16, position: "relative" }}>
                {/* Dot */}
                <div style={{
                  position: "absolute", left: -20, top: 2, width: 12, height: 12,
                  borderRadius: "50%", background: step.color, border: `2px solid ${T.bgCard}`,
                  boxShadow: `0 0 6px ${step.color}66`,
                }} />
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace", flexShrink: 0 }}>{step.time}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.white }}>{step.label}</span>
                </div>
                <div style={{ fontSize: 11, color: T.dim, marginTop: 2, marginLeft: 46 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Blast Radius Visualization */}
        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.white, marginBottom: 14 }}>Blast Radius</div>
          <div style={{ position: "relative", height: 360, overflow: "hidden" }}>
            {/* Center device */}
            <div style={{
              position: "absolute", left: "50%", top: 30, transform: "translateX(-50%)",
              background: `${T.red}20`, border: `2px solid ${T.red}`, borderRadius: 10,
              padding: "10px 16px", textAlign: "center", zIndex: 2,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.red }}>{device?.name}</div>
              <div style={{ fontSize: 9, color: T.dim }}>{device?.careArea}</div>
            </div>

            {/* Connection lines (SVG) */}
            <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0 }}>
              {/* Lines from center to procedure nodes */}
              <line x1="50%" y1="75" x2="20%" y2="145" stroke={T.amber} strokeWidth="1" opacity="0.4" strokeDasharray="4 2" />
              <line x1="50%" y1="75" x2="50%" y2="145" stroke={T.amber} strokeWidth="1" opacity="0.4" strokeDasharray="4 2" />
              <line x1="50%" y1="75" x2="80%" y2="145" stroke={T.amber} strokeWidth="1" opacity="0.4" strokeDasharray="4 2" />
              {/* Lines from procedures to patients */}
              <line x1="20%" y1="175" x2="12%" y2="245" stroke={T.red} strokeWidth="1" opacity="0.3" strokeDasharray="4 2" />
              <line x1="50%" y1="175" x2="42%" y2="245" stroke={T.red} strokeWidth="1" opacity="0.3" strokeDasharray="4 2" />
              <line x1="80%" y1="175" x2="72%" y2="245" stroke={T.red} strokeWidth="1" opacity="0.3" strokeDasharray="4 2" />
              {/* Lines to staff */}
              <line x1="50%" y1="75" x2="15%" y2="320" stroke={T.purple} strokeWidth="1" opacity="0.3" strokeDasharray="4 2" />
              <line x1="50%" y1="75" x2="38%" y2="320" stroke={T.purple} strokeWidth="1" opacity="0.3" strokeDasharray="4 2" />
              <line x1="50%" y1="75" x2="62%" y2="320" stroke={T.purple} strokeWidth="1" opacity="0.3" strokeDasharray="4 2" />
              <line x1="50%" y1="75" x2="85%" y2="320" stroke={T.purple} strokeWidth="1" opacity="0.3" strokeDasharray="4 2" />
            </svg>

            {/* Procedure nodes */}
            {["Mech. Ventilation", "Sedation Mgmt", "ABG Monitoring"].map((proc, i) => (
              <div key={proc} style={{
                position: "absolute", top: 130, left: `${20 + i * 30}%`, transform: "translateX(-50%)",
                background: `${T.amber}18`, border: `1px solid ${T.amber}44`, borderRadius: 8,
                padding: "6px 10px", textAlign: "center", zIndex: 1,
              }}>
                <div style={{ fontSize: 9, color: T.amber, fontWeight: 500 }}>{proc}</div>
              </div>
            ))}

            {/* Category labels */}
            <div style={{ position: "absolute", top: 110, left: 4, fontSize: 8, color: T.dim, fontFamily: "'Space Mono',monospace" }}>PROCEDURES</div>

            {/* Patient nodes */}
            {["Patient A (MICU-4A)", "Patient B (MICU-4B)", "Patient C (MICU-4C)"].map((pat, i) => (
              <div key={pat} style={{
                position: "absolute", top: 230, left: `${12 + i * 30}%`, transform: "translateX(-50%)",
                background: `${T.red}15`, border: `1px solid ${T.red}33`, borderRadius: 8,
                padding: "6px 10px", textAlign: "center", zIndex: 1,
              }}>
                <div style={{ fontSize: 9, color: T.red }}>{pat}</div>
              </div>
            ))}

            <div style={{ position: "absolute", top: 213, left: 4, fontSize: 8, color: T.dim, fontFamily: "'Space Mono',monospace" }}>PATIENTS</div>

            {/* Staff nodes */}
            {["S. Chen, RRT", "J. Rodriguez, RRT", "M. Thompson, BMET", "Dr. Williams"].map((staff, i) => (
              <div key={staff} style={{
                position: "absolute", top: 305, left: `${15 + i * 23}%`, transform: "translateX(-50%)",
                background: `${T.purple}15`, border: `1px solid ${T.purple}33`, borderRadius: 8,
                padding: "6px 8px", textAlign: "center", zIndex: 1,
              }}>
                <div style={{ fontSize: 9, color: T.purple }}>{staff}</div>
              </div>
            ))}

            <div style={{ position: "absolute", top: 290, left: 4, fontSize: 8, color: T.dim, fontFamily: "'Space Mono',monospace" }}>STAFF</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* PSIS Breakdown */}
        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.white, marginBottom: 14 }}>PSIS Calculation Breakdown</div>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              {PSIS_BREAKDOWN.map((row) => (
                <div key={row.factor} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 0", borderBottom: `1px solid ${T.border}`,
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: T.text }}>{row.factor}</div>
                    <div style={{ fontSize: 10, color: T.dim }}>{row.desc}</div>
                  </div>
                  <div style={{
                    fontSize: 16, fontWeight: 700, fontFamily: "'Space Mono',monospace",
                    color: row.points < 0 ? T.green : row.points >= 15 ? T.red : T.amber,
                  }}>
                    {row.points > 0 ? "+" : ""}{row.points}
                  </div>
                </div>
              ))}
              <div style={{
                display: "flex", justifyContent: "space-between", padding: "10px 0",
                borderTop: `2px solid ${T.border}`, marginTop: 4,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.white }}>Total PSIS</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: psisColor(78), fontFamily: "'Space Mono',monospace" }}>
                  78
                </div>
              </div>
            </div>
            <div style={{ width: 200, height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={PSIS_RADAR}>
                  <PolarGrid stroke={T.border} />
                  <PolarAngleAxis dataKey="factor" tick={{ fill: T.dim, fontSize: 9 }} />
                  <PolarRadiusAxis tick={false} domain={[0, 100]} />
                  <Radar dataKey="value" stroke={T.lime} fill={T.lime} fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Backup Device */}
        <div style={{ ...cardStyle, borderLeft: `3px solid ${T.green}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.white, marginBottom: 14 }}>Recommended Backup</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 10, background: `${T.green}18`,
              border: `1px solid ${T.green}33`, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, color: T.green,
            }}>
              +
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.white }}>{backupDevice?.name}</div>
              <div style={{ fontSize: 11, color: T.dim }}>{backupDevice?.manufacturer} {backupDevice?.model}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: T.bg, borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace", marginBottom: 4 }}>STATUS</div>
              <div style={{ fontSize: 13, color: T.green, fontWeight: 500 }}>
                <span style={{
                  display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                  background: T.green, boxShadow: `0 0 6px ${T.green}`, marginRight: 6,
                }} />
                Online
              </div>
            </div>
            <div style={{ background: T.bg, borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace", marginBottom: 4 }}>HEALTH</div>
              <div style={{ fontSize: 13, color: T.green, fontWeight: 500, fontFamily: "'Space Mono',monospace" }}>{backupDevice?.health}%</div>
            </div>
            <div style={{ background: T.bg, borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace", marginBottom: 4 }}>LOCATION</div>
              <div style={{ fontSize: 12 }}>{backupDevice?.careArea}</div>
            </div>
            <div style={{ background: T.bg, borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace", marginBottom: 4 }}>FIRMWARE</div>
              <div style={{ fontSize: 12, fontFamily: "'Space Mono',monospace" }}>{backupDevice?.firmware}</div>
            </div>
          </div>
          <div style={{ marginTop: 12, padding: 10, background: T.bg, borderRadius: 8 }}>
            <div style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace", marginBottom: 4 }}>CERTIFIED OPERATOR ON SHIFT</div>
            <div style={{ fontSize: 13, color: T.lime }}>Sarah Chen, RRT</div>
            <div style={{ fontSize: 11, color: T.dim }}>Cardiac ICU | Day shift (7a-7p) | Philips IntelliVent certified</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAUDE Monitoring ──
const thStyle = { fontSize: 9, color: T.dim, fontFamily: "'Space Mono',monospace", letterSpacing: 1, textAlign: "left", fontWeight: 400, borderBottom: `1px solid ${T.border}` };

function MAUDEMonitoring() {
  const PATTERN_DATA = {
    "MAUDE-001": {
      expected: { latency: 12, disconnects: 0.2, syncInterval: 300, errorRate: 0.01 },
      observed: { latency: 48, disconnects: 3.7, syncInterval: 300, errorRate: 2.4 },
    },
    "MAUDE-002": {
      expected: { o2Drift: 0.5, sensorAge: 12, calFreq: 90, fio2Var: 1.0 },
      observed: { o2Drift: 3.8, sensorAge: 20, calFreq: 140, fio2Var: 4.2 },
    },
  };

  const ALERT_TIMELINE = {
    "MAUDE-001": [
      { time: "2 hr ago", event: "WiFi disconnection pattern detected by Pathfinder eBPF" },
      { time: "1 hr 55 min ago", event: "MAUDE report MW5087234 matched (82% confidence)" },
      { time: "1 hr 50 min ago", event: "Alert generated, nursing station 3N notified" },
      { time: "Current", event: "Active monitoring. Drug library sync status: DEGRADED" },
    ],
    "MAUDE-002": [
      { time: "1 day ago", event: "O2 sensor readings diverged from expected baseline" },
      { time: "23 hr ago", event: "Pathfinder flagged behavioral anomaly on DEV-V003" },
      { time: "22 hr ago", event: "MAUDE report MW5091456 matched (74% confidence)" },
      { time: "Current", event: "Under review by clinical engineering" },
    ],
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {MAUDE_MATCHES.map((m) => {
        const device = CLINICAL_DEVICES.find((d) => d.id === m.device);
        const patterns = PATTERN_DATA[m.id];
        const timeline = ALERT_TIMELINE[m.id] || [];

        const patternKeys = patterns ? Object.keys(patterns.expected) : [];

        return (
          <div key={m.id} style={{ ...cardStyle, borderLeft: `3px solid ${m.status === "Active Alert" ? T.red : T.amber}` }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.white }}>
                  {device?.name} -- {m.maudeReport}
                </div>
                <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>{m.failureMode}</div>
              </div>
              <Pill color={m.status === "Active Alert" ? T.red : T.amber}>{m.status}</Pill>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Behavioral pattern comparison */}
              <div style={{ background: T.bg, borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace", marginBottom: 10 }}>BEHAVIORAL PATTERN COMPARISON</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, background: T.bg, padding: "6px 8px" }}>Metric</th>
                      <th style={{ ...thStyle, background: T.bg, padding: "6px 8px", textAlign: "center" }}>Expected</th>
                      <th style={{ ...thStyle, background: T.bg, padding: "6px 8px", textAlign: "center" }}>Observed</th>
                      <th style={{ ...thStyle, background: T.bg, padding: "6px 8px", textAlign: "center" }}>Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patternKeys.map((key) => {
                      const exp = patterns.expected[key];
                      const obs = patterns.observed[key];
                      const delta = obs - exp;
                      const pctDelta = exp > 0 ? Math.abs(((obs - exp) / exp) * 100).toFixed(0) : "--";
                      const isHigh = Math.abs(delta) > exp * 0.5;
                      return (
                        <tr key={key}>
                          <td style={{ padding: "6px 8px", fontSize: 11, color: T.text, borderBottom: `1px solid ${T.border}` }}>
                            {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                          </td>
                          <td style={{ padding: "6px 8px", fontSize: 11, color: T.green, textAlign: "center", fontFamily: "'Space Mono',monospace", borderBottom: `1px solid ${T.border}` }}>
                            {exp}
                          </td>
                          <td style={{ padding: "6px 8px", fontSize: 11, color: isHigh ? T.red : T.amber, textAlign: "center", fontFamily: "'Space Mono',monospace", borderBottom: `1px solid ${T.border}` }}>
                            {obs}
                          </td>
                          <td style={{ padding: "6px 8px", fontSize: 11, textAlign: "center", fontFamily: "'Space Mono',monospace", borderBottom: `1px solid ${T.border}`, color: isHigh ? T.red : T.amber }}>
                            {delta > 0 ? "+" : ""}{pctDelta}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Alert timeline */}
              <div style={{ background: T.bg, borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace", marginBottom: 10 }}>ALERT TIMELINE</div>
                <div style={{ position: "relative", paddingLeft: 20 }}>
                  <div style={{
                    position: "absolute", left: 5, top: 4, bottom: 4, width: 2,
                    background: m.status === "Active Alert" ? `${T.red}66` : `${T.amber}66`,
                  }} />
                  {timeline.map((step, i) => (
                    <div key={i} style={{ marginBottom: 14, position: "relative" }}>
                      <div style={{
                        position: "absolute", left: -17, top: 3, width: 8, height: 8,
                        borderRadius: "50%",
                        background: i === timeline.length - 1 ? T.lime : (m.status === "Active Alert" ? T.red : T.amber),
                        boxShadow: i === timeline.length - 1 ? `0 0 6px ${T.lime}` : "none",
                      }} />
                      <div style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace" }}>{step.time}</div>
                      <div style={{ fontSize: 11, color: T.text, marginTop: 2 }}>{step.event}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommended action */}
            <div style={{ marginTop: 12, padding: 10, background: `${T.lime}08`, borderRadius: 8, border: `1px solid ${T.lime}15` }}>
              <div style={{ fontSize: 10, color: T.lime, fontFamily: "'Space Mono',monospace", marginBottom: 4 }}>RECOMMENDED ACTION</div>
              <div style={{ fontSize: 12, color: T.text }}>
                {m.id === "MAUDE-001"
                  ? "Immediate: Verify drug library sync on DEV-IP02. Check WiFi signal at 3 North Station B. Schedule firmware update to 12.1.3 during next maintenance window."
                  : "Schedule O2 sensor replacement for DEV-V003 within 48 hours. Cross-reference FiO2 readings with manual ABG results. Review all Getinge ventilators >18 months old."
                }
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
