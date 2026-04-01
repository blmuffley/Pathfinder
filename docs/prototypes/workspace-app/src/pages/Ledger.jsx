/**
 * Ledger Compliance Automation
 * "The compliance record of truth"
 *
 * Compliance dashboard, findings, survey prep, and FDA alerts.
 */
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  T, Pill, KPI, COMPLIANCE_FINDINGS, COMPLIANCE_SUMMARY,
  MAUDE_MATCHES, FACILITIES, CLINICAL_DEVICES, priorityColor,
  complianceColor,
} from "../data/demoData";

const TABS = ["Dashboard", "Findings", "Survey Prep", "FDA Alerts"];

const cardStyle = {
  background: T.bgCard, borderRadius: 10, padding: 16,
  border: `1px solid ${T.border}`,
};
const thStyle = {
  padding: "8px 10px", fontSize: 10, fontFamily: "'Space Mono',monospace",
  color: T.dim, textAlign: "left", borderBottom: `1px solid ${T.border}`,
  position: "sticky", top: 0, background: T.bgCard, zIndex: 1,
};
const tdStyle = { padding: "8px 10px", fontSize: 12, borderBottom: `1px solid ${T.border}` };

// ── Derived KPIs ──
const totalControls = COMPLIANCE_SUMMARY.reduce((a, f) => a + f.total, 0);
const avgScore = Math.round(COMPLIANCE_SUMMARY.reduce((a, f) => a + f.score, 0) / COMPLIANCE_SUMMARY.length);
const criticalFindings = COMPLIANCE_FINDINGS.filter((f) => f.severity === "Critical").length;

// ── Mock 12-month trend ──
const TREND_DATA = Array.from({ length: 12 }, (_, i) => {
  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  return { month: months[i], score: 72 + Math.floor(Math.random() * 15) + (i * 0.8) };
});

// ── Heatmap data: frameworks x facilities ──
const HEATMAP = COMPLIANCE_SUMMARY.map((fw) => ({
  framework: fw.framework,
  scores: FACILITIES.map((fac) => ({
    facility: fac.name.replace("Mercy ", ""),
    score: Math.min(100, Math.max(40, fw.score + Math.floor(Math.random() * 20 - 10))),
  })),
}));

function heatColor(score) {
  if (score >= 85) return T.green;
  if (score >= 65) return T.amber;
  return T.red;
}

// ── Survey Prep data ──
const SURVEY_CHECKLIST = [
  { item: "Equipment inventory list current", done: true },
  { item: "Calibration records up to date", done: false },
  { item: "Fire drill documentation complete", done: true },
  { item: "Safety data sheets accessible", done: true },
  { item: "Staff competency files current", done: false },
  { item: "Emergency power test records", done: true },
  { item: "Infection control training logs", done: true },
  { item: "Hazardous waste documentation", done: false },
  { item: "Patient rights postings verified", done: true },
  { item: "Code blue response time reports", done: true },
];

const SURVEY_GAPS = [
  "2 devices with overdue calibrations (DEV-V003, DEV-IP02)",
  "3 staff members with expired competency files in NICU",
  "Hazardous waste manifest missing for February",
  "LS.02.01.30 — fire barrier penetrations not fully documented in Building C",
];

const SURVEY_STANDARDS = [
  { standard: "EC (Environment of Care)", score: 88 },
  { standard: "IC (Infection Control)", score: 92 },
  { standard: "LS (Life Safety)", score: 76 },
  { standard: "MM (Medication Mgmt)", score: 90 },
  { standard: "HR (Human Resources)", score: 85 },
];

// ── Component ──
export default function Ledger() {
  const [tab, setTab] = useState(0);
  const [findingSeverity, setFindingSeverity] = useState("All");
  const [findingFramework, setFindingFramework] = useState("All");
  const [expandedFinding, setExpandedFinding] = useState(null);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: T.white }}>Ledger</h1>
        <div style={{ fontSize: 13, color: T.dim, marginTop: 2, fontStyle: "italic" }}>
          The compliance record of truth
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <KPI value={totalControls} label="Total Controls Monitored" color={T.lime} />
        <KPI value={`${avgScore}%`} label="Compliance Score" color={avgScore >= 80 ? T.green : T.amber} />
        <KPI value={criticalFindings} label="Critical Findings" color={T.red} />
        <KPI value="47 days" label="Upcoming Survey" color={T.amber} sub="Joint Commission" />
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

      {tab === 0 && <Dashboard />}
      {tab === 1 && (
        <FindingsTab
          severity={findingSeverity} setSeverity={setFindingSeverity}
          framework={findingFramework} setFramework={setFindingFramework}
          expanded={expandedFinding} setExpanded={setExpandedFinding}
        />
      )}
      {tab === 2 && <SurveyPrep />}
      {tab === 3 && <FDAAlerts />}
    </div>
  );
}

// ── Dashboard Tab ──
function Dashboard() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Heatmap */}
      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.white, marginBottom: 12 }}>Compliance Heatmap</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, minWidth: 140 }}>Framework</th>
                {FACILITIES.map((f) => (
                  <th key={f.id} style={{ ...thStyle, textAlign: "center", minWidth: 120 }}>
                    {f.name.replace("Mercy ", "")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HEATMAP.map((row) => (
                <tr key={row.framework}>
                  <td style={{ ...tdStyle, color: T.white, fontWeight: 500, fontSize: 11 }}>{row.framework}</td>
                  {row.scores.map((s) => (
                    <td key={s.facility} style={{ ...tdStyle, textAlign: "center" }}>
                      <div style={{
                        display: "inline-block", padding: "4px 12px", borderRadius: 4,
                        background: `${heatColor(s.score)}18`, color: heatColor(s.score),
                        fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 600,
                      }}>
                        {s.score}%
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Framework Score Bars */}
      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.white, marginBottom: 12 }}>Framework Scores</div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={COMPLIANCE_SUMMARY} layout="vertical" margin={{ left: 100, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: T.dim, fontSize: 10 }} />
              <YAxis type="category" dataKey="framework" tick={{ fill: T.text, fontSize: 11 }} width={100} />
              <Tooltip
                contentStyle={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: T.white }}
                itemStyle={{ color: T.lime }}
              />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {COMPLIANCE_SUMMARY.map((entry) => (
                  <Cell key={entry.framework} fill={heatColor(entry.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 12-month trend */}
      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.white, marginBottom: 12 }}>Compliance Score Trend (12 Months)</div>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={TREND_DATA} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="month" tick={{ fill: T.dim, fontSize: 10 }} />
              <YAxis domain={[60, 100]} tick={{ fill: T.dim, fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: T.white }}
                itemStyle={{ color: T.lime }}
              />
              <Bar dataKey="score" fill={T.lime} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── Findings Tab ──
function FindingsTab({ severity, setSeverity, framework, setFramework, expanded, setExpanded }) {
  const severities = ["All", "Critical", "High", "Medium", "Low"];
  const frameworks = ["All", ...new Set(COMPLIANCE_FINDINGS.map((f) => f.framework))];

  const filtered = COMPLIANCE_FINDINGS.filter((f) => {
    if (severity !== "All" && f.severity !== severity) return false;
    if (framework !== "All" && f.framework !== framework) return false;
    return true;
  });

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {severities.map((s) => (
          <button key={s} onClick={() => setSeverity(s)} style={{
            padding: "6px 12px", border: `1px solid ${severity === s ? T.lime : T.border}`,
            background: severity === s ? T.limeDim : "transparent",
            color: severity === s ? T.lime : T.dim, borderRadius: 4, cursor: "pointer",
            fontSize: 11, fontFamily: "inherit",
          }}>{s}</button>
        ))}
        <select
          value={framework}
          onChange={(e) => setFramework(e.target.value)}
          style={{
            background: T.bgInput, color: T.text, border: `1px solid ${T.border}`,
            padding: "6px 10px", borderRadius: 4, fontSize: 11, fontFamily: "inherit",
          }}
        >
          {frameworks.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <div style={cardStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["ID", "Framework", "Control", "Severity", "Status", "Device", "Finding", "Due Date", "Owner"].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => {
              const device = f.device ? CLINICAL_DEVICES.find((d) => d.id === f.device) : null;
              return (
                <tr key={f.id} style={{ cursor: "pointer" }}
                  onClick={() => setExpanded(expanded === f.id ? null : f.id)}
                  onMouseEnter={(e) => e.currentTarget.style.background = T.bgHover}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <td style={{ ...tdStyle, fontFamily: "'Space Mono',monospace", color: T.lime, fontSize: 11 }}>{f.id}</td>
                  <td style={{ ...tdStyle, fontSize: 11 }}>{f.framework}</td>
                  <td style={{ ...tdStyle, fontFamily: "'Space Mono',monospace", fontSize: 10 }}>{f.control}</td>
                  <td style={tdStyle}><Pill color={priorityColor[f.severity] || T.dim}>{f.severity}</Pill></td>
                  <td style={tdStyle}><Pill color={complianceColor[f.status] || T.dim}>{f.status}</Pill></td>
                  <td style={{ ...tdStyle, fontSize: 11 }}>{device ? device.name : "--"}</td>
                  <td style={{ ...tdStyle, fontSize: 11, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.finding}</td>
                  <td style={{ ...tdStyle, fontSize: 11 }}>{f.dueDate || "--"}</td>
                  <td style={{ ...tdStyle, fontSize: 11 }}>{f.owner}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Expanded detail */}
        {expanded && (() => {
          const f = COMPLIANCE_FINDINGS.find((x) => x.id === expanded);
          if (!f) return null;
          return (
            <div style={{
              marginTop: 12, padding: 16, background: T.bg, borderRadius: 8,
              borderLeft: `3px solid ${priorityColor[f.severity] || T.dim}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.white }}>{f.id} - {f.description}</div>
                <button onClick={(e) => { e.stopPropagation(); setExpanded(null); }} style={{
                  background: "transparent", border: `1px solid ${T.border}`, color: T.dim,
                  cursor: "pointer", padding: "4px 10px", borderRadius: 4, fontSize: 11,
                }}>Close</button>
              </div>
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace", marginBottom: 4 }}>FULL FINDING</div>
                  <div style={{ fontSize: 12, lineHeight: 1.6 }}>{f.finding}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace", marginBottom: 4 }}>REMEDIATION PLAN</div>
                  <div style={{ fontSize: 12, lineHeight: 1.6 }}>{f.remediation || "No remediation required"}</div>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace", marginBottom: 4 }}>AUDIT TRAIL</div>
                <div style={{ fontSize: 11, color: T.dim }}>
                  2026-03-28 14:22 -- Finding created by Pathfinder compliance engine<br />
                  2026-03-28 14:23 -- Auto-assigned to {f.owner}<br />
                  2026-03-29 09:15 -- Status updated: {f.status}<br />
                  2026-03-31 10:00 -- Review scheduled
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── Survey Prep Tab ──
function SurveyPrep() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Readiness card */}
      <div style={{ ...cardStyle, borderLeft: `3px solid ${T.amber}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.white }}>Joint Commission Survey Readiness</div>
            <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>Estimated survey window: May 17, 2026</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 42, fontWeight: 700, color: T.amber, fontFamily: "'Space Mono',monospace" }}>84%</div>
            <div style={{ fontSize: 10, color: T.dim }}>Overall Readiness</div>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace", marginBottom: 8 }}>BREAKDOWN BY STANDARD</div>
          {SURVEY_STANDARDS.map((s) => (
            <div key={s.standard} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: T.text, width: 200, flexShrink: 0 }}>{s.standard}</div>
              <div style={{ flex: 1, height: 8, background: T.bg, borderRadius: 4 }}>
                <div style={{
                  width: `${s.score}%`, height: "100%", borderRadius: 4,
                  background: heatColor(s.score),
                  transition: "width 0.5s",
                }} />
              </div>
              <div style={{ fontSize: 12, fontFamily: "'Space Mono',monospace", color: heatColor(s.score), width: 40, textAlign: "right" }}>{s.score}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist */}
      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.white, marginBottom: 12 }}>Survey Preparation Checklist</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {SURVEY_CHECKLIST.map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
              background: T.bg, borderRadius: 6, border: `1px solid ${T.border}`,
            }}>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 20, height: 20, borderRadius: 4, fontSize: 12,
                background: item.done ? `${T.green}18` : `${T.red}18`,
                color: item.done ? T.green : T.red,
                border: `1px solid ${item.done ? T.green : T.red}33`,
                flexShrink: 0,
              }}>
                {item.done ? "\u2713" : "\u2717"}
              </span>
              <span style={{ fontSize: 12, color: item.done ? T.text : T.dim }}>{item.item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gap list */}
      <div style={{ ...cardStyle, borderLeft: `3px solid ${T.red}` }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.white, marginBottom: 12 }}>Items Requiring Attention</div>
        {SURVEY_GAPS.map((gap, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 0",
            borderBottom: i < SURVEY_GAPS.length - 1 ? `1px solid ${T.border}` : "none",
          }}>
            <span style={{ color: T.red, fontSize: 14, flexShrink: 0 }}>&#9888;</span>
            <span style={{ fontSize: 12 }}>{gap}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── FDA Alerts Tab ──
function FDAAlerts() {
  const RECOMMENDED_ACTIONS = {
    "MAUDE-001": [
      "Verify WiFi signal strength at all Alaris pump locations on 3 North",
      "Check drug library sync status on DEV-IP02 immediately",
      "Contact BD technical support to discuss firmware update to 12.1.3",
      "Increase monitoring frequency for all Alaris pumps to 5-minute intervals",
    ],
    "MAUDE-002": [
      "Schedule O2 sensor replacement for DEV-V003 within 48 hours",
      "Cross-reference FiO2 readings with manual ABG results for current patients",
      "Review all Getinge Servo-u ventilators installed >18 months for same drift pattern",
      "Notify respiratory therapy team of potential FiO2 inaccuracy",
    ],
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {MAUDE_MATCHES.map((m) => {
        const device = CLINICAL_DEVICES.find((d) => d.id === m.device);
        return (
          <div key={m.id} style={{ ...cardStyle, borderLeft: `3px solid ${m.status === "Active Alert" ? T.red : T.amber}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.white }}>
                  {device ? device.name : m.device}
                </div>
                <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>
                  {device ? `${device.manufacturer} ${device.model} | ${device.department}` : ""}
                </div>
              </div>
              <Pill color={m.status === "Active Alert" ? T.red : T.amber}>{m.status}</Pill>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginTop: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace", marginBottom: 4 }}>MAUDE REPORT</div>
                <div style={{ fontSize: 12, fontFamily: "'Space Mono',monospace", color: T.lime }}>{m.maudeReport}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace", marginBottom: 4 }}>FAILURE MODE</div>
                <div style={{ fontSize: 12 }}>{m.failureMode}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace", marginBottom: 4 }}>CONFIDENCE</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 6, background: T.bg, borderRadius: 3, maxWidth: 100 }}>
                    <div style={{ width: `${m.confidence * 100}%`, height: "100%", borderRadius: 3, background: T.amber }} />
                  </div>
                  <span style={{ fontSize: 12, fontFamily: "'Space Mono',monospace", color: T.amber }}>
                    {(m.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace", marginBottom: 4 }}>DETECTED</div>
                <div style={{ fontSize: 12 }}>{m.detected}</div>
              </div>
            </div>

            <div style={{ marginTop: 14, padding: 12, background: T.bg, borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace", marginBottom: 8 }}>RECOMMENDED ACTIONS</div>
              {(RECOMMENDED_ACTIONS[m.id] || []).map((action, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                  <span style={{ color: T.lime, fontSize: 11, flexShrink: 0, fontFamily: "'Space Mono',monospace" }}>{i + 1}.</span>
                  <span style={{ fontSize: 12 }}>{action}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
