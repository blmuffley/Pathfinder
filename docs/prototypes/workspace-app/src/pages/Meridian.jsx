/**
 * Meridian Clinical Operations Graph
 * "Where clinical data converges"
 *
 * Staff coverage, impact analysis, maintenance windows, and certification gaps.
 */
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  T, Pill, KPI, STAFF, CLINICAL_DEVICES, CERT_GAPS,
  MAINTENANCE_WINDOWS, tierColor,
} from "../data/demoData";

const TABS = ["Staff Coverage", "Impact Analysis", "Maintenance Windows", "Cert Gaps"];

// ── helpers ──
const dot = (on) => (
  <span style={{
    display: "inline-block", width: 8, height: 8, borderRadius: "50%",
    background: on ? T.green : T.dim, boxShadow: on ? `0 0 6px ${T.green}` : "none",
    marginRight: 6, verticalAlign: "middle",
  }} />
);

const thStyle = {
  padding: "8px 10px", fontSize: 10, fontFamily: "'Space Mono',monospace",
  color: T.dim, textAlign: "left", borderBottom: `1px solid ${T.border}`,
  position: "sticky", top: 0, background: T.bgCard, zIndex: 1,
};
const tdStyle = { padding: "8px 10px", fontSize: 12, borderBottom: `1px solid ${T.border}` };

const cardStyle = {
  background: T.bgCard, borderRadius: 10, padding: 16,
  border: `1px solid ${T.border}`,
};

// ── Derived KPI values ──
const staffOnShift = STAFF.filter((s) => s.onShift).length;
const certifiedOperators = STAFF.filter((s) => s.certifications.length > 0).length;
const certGapsCount = CERT_GAPS.filter((g) => g.gap).length;
const upcomingExpiry = STAFF.filter((s) => {
  const exp = new Date(s.certExpiry);
  const now = new Date("2026-03-31");
  const diff = (exp - now) / 86400000;
  return diff <= 30 && diff >= 0;
}).length;

// ── Impact Analysis helpers ──
const criticalDevices = CLINICAL_DEVICES.filter((d) => d.tier >= 3);

function buildImpact(device) {
  if (!device) return null;
  const relatedStaff = STAFF.filter((s) =>
    s.certifications.some((c) => device.name.toLowerCase().includes(c.split(" ")[0].toLowerCase()) ||
      c.toLowerCase().includes(device.manufacturer.toLowerCase()))
  );
  const backup = CLINICAL_DEVICES.find(
    (d) => d.id !== device.id && d.manufacturer === device.manufacturer && d.status === "Online"
  );
  const backupOperator = backup
    ? STAFF.find((s) => s.onShift && s.certifications.some((c) =>
        c.toLowerCase().includes(backup.manufacturer.toLowerCase())
      ))
    : null;
  const procedures = device.tier === 4 ? 3 + Math.floor(Math.random() * 4) : 1 + Math.floor(Math.random() * 3);
  const impactScore = device.tier === 4 ? 60 + Math.floor(Math.random() * 35) : 20 + Math.floor(Math.random() * 40);
  return { device, relatedStaff, backup, backupOperator, procedures, impactScore };
}

function impactScoreColor(score) {
  if (score >= 80) return T.red;
  if (score >= 50) return T.amber;
  if (score >= 25) return T.blue;
  return T.green;
}

// ── Component ──
export default function Meridian() {
  const [tab, setTab] = useState(0);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(criticalDevices[0]?.id || "");

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: T.white }}>
            Meridian
          </h1>
          <div style={{ fontSize: 13, color: T.dim, marginTop: 2, fontStyle: "italic" }}>
            Where clinical data converges
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.bgCard, padding: "8px 14px", borderRadius: 8, border: `1px solid ${T.border}` }}>
          {dot(true)}
          <span style={{ fontSize: 11, color: T.dim }}>UKG Sync</span>
          <span style={{ fontSize: 10, color: T.green, fontFamily: "'Space Mono',monospace" }}>Last sync: 3 min ago</span>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <KPI value={staffOnShift} label="Staff On Shift" color={T.lime} />
        <KPI value={certifiedOperators} label="Certified Operators" color={T.green} />
        <KPI value={certGapsCount} label="Certification Gaps" color={T.red} />
        <KPI value={upcomingExpiry} label="Upcoming Expirations" color={T.amber} sub="within 30 days" />
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${T.border}`, paddingBottom: 0 }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => { setTab(i); setSelectedStaff(null); }} style={{
            padding: "8px 16px", border: "none", cursor: "pointer",
            background: tab === i ? T.limeDim : "transparent",
            color: tab === i ? T.lime : T.dim,
            fontSize: 12, fontWeight: tab === i ? 600 : 400,
            borderBottom: tab === i ? `2px solid ${T.lime}` : "2px solid transparent",
            fontFamily: "inherit", transition: "all 0.15s",
          }}>{t}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 0 && <StaffCoverage selectedStaff={selectedStaff} setSelectedStaff={setSelectedStaff} />}
      {tab === 1 && <ImpactAnalysis selectedDevice={selectedDevice} setSelectedDevice={setSelectedDevice} />}
      {tab === 2 && <MaintenanceWindowsTab />}
      {tab === 3 && <CertGapsTab />}
    </div>
  );
}

// ── Staff Coverage ──
function StaffCoverage({ selectedStaff, setSelectedStaff }) {
  return (
    <div>
      {selectedStaff && (
        <div style={{ ...cardStyle, marginBottom: 16, borderLeft: `3px solid ${T.lime}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.white }}>{selectedStaff.name}</div>
              <div style={{ fontSize: 12, color: T.dim, marginTop: 2 }}>{selectedStaff.role} | {selectedStaff.department} | {selectedStaff.facility}</div>
            </div>
            <button onClick={() => setSelectedStaff(null)} style={{
              background: "transparent", border: `1px solid ${T.border}`, color: T.dim,
              cursor: "pointer", padding: "4px 10px", borderRadius: 4, fontSize: 11,
            }}>Close</button>
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace", marginBottom: 6 }}>SHIFT</div>
              <div style={{ fontSize: 13 }}>{selectedStaff.shift}</div>
              <div style={{ marginTop: 4 }}>{dot(selectedStaff.onShift)} <span style={{ fontSize: 12 }}>{selectedStaff.onShift ? "Currently on shift" : "Off shift"}</span></div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace", marginBottom: 6 }}>CERTIFIED DEVICES</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {selectedStaff.certifications.map((c) => (
                  <Pill key={c} color={T.lime}>{c}</Pill>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace", marginBottom: 6 }}>CERT EXPIRY</div>
              <div style={{ fontSize: 13 }}>{selectedStaff.certExpiry}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ ...cardStyle, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Name", "Role", "Department", "Shift", "On Shift", "Certifications", "Cert Expiry"].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STAFF.map((s) => (
              <tr key={s.id} onClick={() => setSelectedStaff(s)} style={{ cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={(e) => e.currentTarget.style.background = T.bgHover}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <td style={{ ...tdStyle, color: T.white, fontWeight: 500 }}>{s.name}</td>
                <td style={tdStyle}>{s.role}</td>
                <td style={tdStyle}>{s.department}</td>
                <td style={{ ...tdStyle, fontSize: 11 }}>{s.shift}</td>
                <td style={tdStyle}>{dot(s.onShift)}</td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    {s.certifications.map((c) => (
                      <Pill key={c} color={T.cyan} style={{ fontSize: 9 }}>{c}</Pill>
                    ))}
                  </div>
                </td>
                <td style={tdStyle}>{s.certExpiry}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Impact Analysis ──
function ImpactAnalysis({ selectedDevice, setSelectedDevice }) {
  const impact = buildImpact(CLINICAL_DEVICES.find((d) => d.id === selectedDevice));
  const now = new Date("2026-03-31T14:30:00").toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, color: T.dim, fontFamily: "'Space Mono',monospace", display: "block", marginBottom: 6 }}>SELECT DEVICE FOR SCENARIO</label>
        <select
          value={selectedDevice}
          onChange={(e) => setSelectedDevice(e.target.value)}
          style={{
            background: T.bgInput, color: T.text, border: `1px solid ${T.border}`,
            padding: "8px 12px", borderRadius: 6, fontSize: 13, width: "100%", maxWidth: 400,
            fontFamily: "inherit",
          }}
        >
          {criticalDevices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} (Tier {d.tier}) - {d.department}
            </option>
          ))}
        </select>
      </div>

      {impact && (
        <div style={{ ...cardStyle, borderLeft: `3px solid ${impactScoreColor(impact.impactScore)}` }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.white, marginBottom: 12 }}>
            If <span style={{ color: tierColor[impact.device.tier] }}>{impact.device.name}</span> goes offline at {now}...
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {/* Impact Score */}
            <div style={{ background: T.bg, borderRadius: 8, padding: 14, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace", marginBottom: 8 }}>IMPACT SCORE</div>
              <div style={{
                fontSize: 48, fontWeight: 700, color: impactScoreColor(impact.impactScore),
                fontFamily: "'Space Mono',monospace",
              }}>{impact.impactScore}</div>
              <div style={{
                fontSize: 10, marginTop: 4, padding: "2px 8px", borderRadius: 4, display: "inline-block",
                background: `${impactScoreColor(impact.impactScore)}18`,
                color: impactScoreColor(impact.impactScore),
              }}>
                {impact.impactScore >= 80 ? "CRITICAL" : impact.impactScore >= 50 ? "HIGH" : impact.impactScore >= 25 ? "MODERATE" : "LOW"}
              </div>
            </div>

            {/* Affected procedures */}
            <div style={{ background: T.bg, borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace", marginBottom: 8 }}>AFFECTED PROCEDURES</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: T.amber, fontFamily: "'Space Mono',monospace" }}>{impact.procedures}</div>
              <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>active procedures would be disrupted</div>
            </div>

            {/* Affected staff */}
            <div style={{ background: T.bg, borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace", marginBottom: 8 }}>AFFECTED STAFF</div>
              {impact.relatedStaff.length > 0 ? (
                impact.relatedStaff.map((s) => (
                  <div key={s.id} style={{ fontSize: 12, marginBottom: 4 }}>
                    {dot(s.onShift)} {s.name}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: T.dim }}>No directly certified staff found</div>
              )}
            </div>

            {/* Backup device */}
            <div style={{ background: T.bg, borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 10, color: T.dim, fontFamily: "'Space Mono',monospace", marginBottom: 8 }}>BACKUP DEVICE</div>
              {impact.backup ? (
                <>
                  <div style={{ fontSize: 13, color: T.green, fontWeight: 500 }}>{impact.backup.name}</div>
                  <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>Location: {impact.backup.careArea}</div>
                  <div style={{ fontSize: 11, color: T.dim }}>Status: <span style={{ color: T.green }}>Online</span></div>
                  {impact.backupOperator && (
                    <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>
                      Certified operator on shift: <span style={{ color: T.lime }}>{impact.backupOperator.name}</span>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 12, color: T.red }}>No backup device available</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Maintenance Windows ──
function MaintenanceWindowsTab() {
  return (
    <div style={cardStyle}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Device", "Window", "Impact Score", "Staff Available", "Backup Available", "Optimization Score"].map((h) => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MAINTENANCE_WINDOWS.map((mw) => (
            <tr key={mw.device}>
              <td style={{ ...tdStyle, color: T.white, fontWeight: 500 }}>{mw.name}</td>
              <td style={{ ...tdStyle, fontFamily: "'Space Mono',monospace", fontSize: 11 }}>{mw.window}</td>
              <td style={tdStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 6, background: T.bg, borderRadius: 3, maxWidth: 100 }}>
                    <div style={{
                      width: `${mw.impact}%`, height: "100%", borderRadius: 3,
                      background: mw.impact > 50 ? T.red : mw.impact > 20 ? T.amber : T.green,
                    }} />
                  </div>
                  <span style={{ fontSize: 11, fontFamily: "'Space Mono',monospace", color: T.dim }}>{mw.impact}</span>
                </div>
              </td>
              <td style={tdStyle}>
                {mw.staffAvailable
                  ? <span style={{ color: T.green, fontSize: 14 }}>&#10003;</span>
                  : <span style={{ color: T.red, fontSize: 14 }}>&#10007;</span>
                }
              </td>
              <td style={tdStyle}>
                {mw.backupAvailable
                  ? <span style={{ color: T.green, fontSize: 14 }}>&#10003;</span>
                  : <span style={{ color: T.red, fontSize: 14 }}>&#10007;</span>
                }
              </td>
              <td style={tdStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 6, background: T.bg, borderRadius: 3, maxWidth: 100 }}>
                    <div style={{
                      width: `${mw.score}%`, height: "100%", borderRadius: 3,
                      background: mw.score >= 90 ? T.green : mw.score >= 70 ? T.amber : T.red,
                    }} />
                  </div>
                  <span style={{ fontSize: 11, fontFamily: "'Space Mono',monospace", color: mw.score >= 90 ? T.green : mw.score >= 70 ? T.amber : T.red }}>{mw.score}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Cert Gaps ──
function CertGapsTab() {
  return (
    <div style={cardStyle}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Device Type", "Department", "Certified Staff", "Required Min", "Gap", "Risk"].map((h) => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CERT_GAPS.map((g, i) => (
            <tr key={i}>
              <td style={{ ...tdStyle, color: T.white, fontWeight: 500 }}>{g.device}</td>
              <td style={tdStyle}>{g.department}</td>
              <td style={{ ...tdStyle, fontFamily: "'Space Mono',monospace", textAlign: "center" }}>{g.certifiedStaff}</td>
              <td style={{ ...tdStyle, fontFamily: "'Space Mono',monospace", textAlign: "center" }}>{g.requiredMinimum}</td>
              <td style={tdStyle}>
                {g.gap
                  ? <span style={{ color: T.red, fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 14 }}>&#9888;</span> GAP
                    </span>
                  : <span style={{ color: T.green, fontSize: 12 }}>OK</span>
                }
              </td>
              <td style={tdStyle}>
                <Pill color={g.risk === "High" ? T.red : g.risk === "Medium" ? T.amber : T.green}>{g.risk}</Pill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
