/**
 * Avennorth Pathfinder Clinical Extension — Clinical Fleet Page
 * Device fleet management with drill-down detail panels.
 */
import { useState, useMemo } from "react";
import {
  T, tierColor, tierLabel, statusColor, Pill, KPI,
  CLINICAL_DEVICES, FACILITIES, COMPLIANCE_FINDINGS, STAFF,
} from "../data/demoData";

const sourceLabel = { pathfinder_ebpf: "Pathfinder eBPF", armis: "Armis", sn_discovery: "SN Discovery", manual: "Manual" };

const HealthBar = ({ score }) => {
  const c = score >= 90 ? T.green : score >= 70 ? T.amber : T.red;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 60, height: 6, borderRadius: 3, background: T.bgHover }}>
        <div style={{ width: `${score}%`, height: "100%", borderRadius: 3, background: c }} />
      </div>
      <span style={{ fontSize: 11, color: c, fontFamily: "'Space Mono',monospace", minWidth: 24 }}>{score}</span>
    </div>
  );
};

const today = new Date("2026-03-31");
const isOverdue = (calDue) => calDue && new Date(calDue) < today;

export default function ClinicalFleet() {
  const [tierFilter, setTierFilter] = useState("all");
  const [facilityFilter, setFacilityFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState(null);

  const departments = useMemo(() => {
    const set = new Set(CLINICAL_DEVICES.map((d) => d.department));
    return ["ALL", ...Array.from(set).sort()];
  }, []);

  const filtered = useMemo(() => {
    return CLINICAL_DEVICES.filter((d) => {
      if (tierFilter === "3" && d.tier !== 3) return false;
      if (tierFilter === "4" && d.tier !== 4) return false;
      if (facilityFilter !== "ALL" && d.facility !== facilityFilter) return false;
      if (deptFilter !== "ALL" && d.department !== deptFilter) return false;
      return true;
    });
  }, [tierFilter, facilityFilter, deptFilter]);

  const selected = CLINICAL_DEVICES.find((d) => d.id === selectedId) || null;

  // KPI computations
  const t3t4 = CLINICAL_DEVICES.filter((d) => d.tier >= 3);
  const t4only = CLINICAL_DEVICES.filter((d) => d.tier === 4);
  const overdueCount = CLINICAL_DEVICES.filter((d) => isOverdue(d.calDue)).length;
  const avgHealth = t3t4.length ? Math.round(t3t4.reduce((s, d) => s + d.health, 0) / t3t4.length) : 0;

  const relatedFindings = selected
    ? COMPLIANCE_FINDINGS.filter((f) => f.device === selected.id)
    : [];
  const certifiedStaff = selected
    ? STAFF.filter((s) =>
        s.certifications.some(
          (c) =>
            c.toLowerCase().includes(selected.manufacturer.split(" ")[0].toLowerCase()) ||
            c.toLowerCase().includes(selected.model.split(" ")[0].toLowerCase())
        )
      )
    : [];

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

  const selectStyle = {
    padding: "6px 10px",
    fontSize: 11,
    fontFamily: "'Space Mono',monospace",
    borderRadius: 6,
    border: `1px solid ${T.border}`,
    background: T.bgInput,
    color: T.text,
    cursor: "pointer",
    outline: "none",
  };

  return (
    <div style={{ padding: 24, background: T.bg, minHeight: "100vh", color: T.text, fontFamily: "'Inter',sans-serif" }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: T.white, marginBottom: 4 }}>Clinical Device Fleet</h1>
      <p style={{ fontSize: 12, color: T.dim, marginBottom: 20 }}>Tier 3 + Tier 4 device inventory with drill-down</p>

      {/* KPI Row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <KPI value={t3t4.length} label="Total Clinical" color={T.amber} sub="T3 + T4 devices" />
        <KPI value={t4only.length} label="Life-Critical" color={T.red} sub="Tier 4 only" />
        <KPI value={overdueCount} label="Overdue Calibration" color={overdueCount > 0 ? T.red : T.green} sub="Past due date" />
        <KPI value={`${avgHealth}%`} label="Avg Health Score" color={avgHealth >= 90 ? T.green : T.amber} />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <button style={btnStyle(tierFilter === "all")} onClick={() => setTierFilter("all")}>All</button>
        <button style={btnStyle(tierFilter === "3")} onClick={() => setTierFilter("3")}>Tier 3</button>
        <button style={btnStyle(tierFilter === "4")} onClick={() => setTierFilter("4")}>Tier 4</button>
        <select value={facilityFilter} onChange={(e) => setFacilityFilter(e.target.value)} style={selectStyle}>
          <option value="ALL">All Facilities</option>
          {FACILITIES.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} style={selectStyle}>
          {departments.map((d) => (
            <option key={d} value={d}>{d === "ALL" ? "All Departments" : d}</option>
          ))}
        </select>
        <span style={{ fontSize: 11, color: T.dim, marginLeft: 8 }}>{filtered.length} devices</span>
      </div>

      {/* Main Content: Table + Detail Panel */}
      <div style={{ display: "flex", gap: 16 }}>
        {/* Device Table */}
        <div style={{ flex: selected ? 2 : 1, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["Name", "Manufacturer", "Model", "Tier", "Dept", "Care Area", "Health", "Protocol", "FDA", "Conf", "Source", "Status"].map((h) => (
                  <th key={h} style={{ padding: "8px 6px", textAlign: "left", color: T.dim, fontWeight: 500, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const isSelected = d.id === selectedId;
                const overdue = isOverdue(d.calDue);
                return (
                  <tr
                    key={d.id}
                    onClick={() => setSelectedId(isSelected ? null : d.id)}
                    style={{
                      borderBottom: `1px solid ${T.border}`,
                      background: isSelected ? T.limeDim : "transparent",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = T.bgHover; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                  >
                    <td style={{ padding: "8px 6px", color: T.white, fontWeight: 500 }}>
                      {d.name}
                      {overdue && <span style={{ color: T.red, fontSize: 9, marginLeft: 4 }}>CAL!</span>}
                    </td>
                    <td style={{ padding: "8px 6px" }}>{d.manufacturer}</td>
                    <td style={{ padding: "8px 6px", fontFamily: "'Space Mono',monospace" }}>{d.model}</td>
                    <td style={{ padding: "8px 6px" }}>
                      <Pill color={tierColor[d.tier]}>T{d.tier} {tierLabel[d.tier]}</Pill>
                    </td>
                    <td style={{ padding: "8px 6px" }}>{d.department}</td>
                    <td style={{ padding: "8px 6px", fontSize: 10, color: T.dim }}>{d.careArea}</td>
                    <td style={{ padding: "8px 6px" }}><HealthBar score={d.health} /></td>
                    <td style={{ padding: "8px 6px", fontFamily: "'Space Mono',monospace", fontSize: 10 }}>{d.protocol}</td>
                    <td style={{ padding: "8px 6px" }}>
                      <Pill color={d.fdaClass === "III" ? T.red : T.amber}>Class {d.fdaClass}</Pill>
                    </td>
                    <td style={{ padding: "8px 6px", fontFamily: "'Space Mono',monospace" }}>{d.confidence.toFixed(2)}</td>
                    <td style={{ padding: "8px 6px", fontSize: 10 }}>{sourceLabel[d.source] || d.source}</td>
                    <td style={{ padding: "8px 6px" }}>
                      <Pill color={statusColor[d.status]}>{d.status}</Pill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: T.dim }}>No devices match current filters.</div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div style={{ flex: 1, minWidth: 340, maxWidth: 440, background: T.bgCard, borderRadius: 12, border: `1px solid ${T.limeBorder}`, padding: 20, overflowY: "auto", maxHeight: "80vh" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: T.white, margin: 0 }}>{selected.name}</h2>
              <button
                onClick={() => setSelectedId(null)}
                style={{ background: "none", border: "none", color: T.dim, cursor: "pointer", fontSize: 16 }}
              >
                x
              </button>
            </div>

            {/* Health Gauge */}
            <div style={{ textAlign: "center", padding: 16, background: T.bg, borderRadius: 10, marginBottom: 16 }}>
              <div style={{
                fontSize: 48,
                fontWeight: 700,
                fontFamily: "'Space Mono',monospace",
                color: selected.health >= 90 ? T.green : selected.health >= 70 ? T.amber : T.red,
              }}>
                {selected.health}
              </div>
              <div style={{ fontSize: 11, color: T.dim }}>Health Score</div>
              <Pill color={statusColor[selected.status]} style={{ marginTop: 8 }}>{selected.status}</Pill>
            </div>

            {/* Device Identity */}
            <Section title="Device Identity">
              <Field label="ID" value={selected.id} />
              <Field label="Manufacturer" value={selected.manufacturer} />
              <Field label="Model" value={selected.model} />
              <Field label="Tier" value={<Pill color={tierColor[selected.tier]}>T{selected.tier} {tierLabel[selected.tier]}</Pill>} />
              <Field label="Department" value={selected.department} />
              <Field label="Care Area" value={selected.careArea} />
              <Field label="Facility" value={FACILITIES.find((f) => f.id === selected.facility)?.name || selected.facility} />
              <Field label="Firmware" value={selected.firmware} />
              {selected.lifeCritical && (
                <div style={{ marginTop: 8, padding: "6px 10px", background: `${T.red}15`, borderRadius: 6, border: `1px solid ${T.red}30`, fontSize: 11, color: T.red }}>
                  LIFE-CRITICAL DEVICE
                </div>
              )}
            </Section>

            {/* Calibration Status */}
            <Section title="Calibration Status">
              <Field label="Last Calibration" value={selected.lastCal} />
              <Field label="Calibration Due" value={selected.calDue} />
              {isOverdue(selected.calDue) && (
                <div style={{ marginTop: 8, padding: "6px 10px", background: `${T.red}15`, borderRadius: 6, border: `1px solid ${T.red}30`, fontSize: 11, color: T.red }}>
                  OVERDUE — {Math.floor((today - new Date(selected.calDue)) / 86400000)} days past due
                </div>
              )}
              {!isOverdue(selected.calDue) && (
                <div style={{ marginTop: 8, padding: "6px 10px", background: `${T.green}15`, borderRadius: 6, border: `1px solid ${T.green}30`, fontSize: 11, color: T.green }}>
                  On Schedule — {Math.floor((new Date(selected.calDue) - today) / 86400000)} days remaining
                </div>
              )}
            </Section>

            {/* FDA Classification */}
            <Section title="FDA Classification">
              <Field label="FDA Product Code" value={selected.fdaCode} />
              <Field label="FDA Class" value={<Pill color={selected.fdaClass === "III" ? T.red : T.amber}>Class {selected.fdaClass}</Pill>} />
              <Field label="Regulatory Risk" value={selected.fdaClass === "III" ? "High — Premarket Approval (PMA)" : "Moderate — 510(k) Clearance"} />
            </Section>

            {/* Behavioral Profile */}
            <Section title="Behavioral Profile">
              <Field label="Protocol" value={selected.protocol} />
              <Field label="Confidence" value={selected.confidence.toFixed(2)} />
              <Field label="Discovery Source" value={sourceLabel[selected.source] || selected.source} />
            </Section>

            {/* Related Compliance Findings */}
            <Section title={`Compliance Findings (${relatedFindings.length})`}>
              {relatedFindings.length === 0 && (
                <div style={{ fontSize: 11, color: T.dim }}>No findings for this device.</div>
              )}
              {relatedFindings.map((f) => (
                <div key={f.id} style={{ padding: 8, background: T.bg, borderRadius: 6, marginBottom: 6, fontSize: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: T.white, fontWeight: 600 }}>{f.id}</span>
                    <Pill color={f.severity === "Critical" ? T.red : f.severity === "High" ? T.amber : T.blue}>{f.severity}</Pill>
                  </div>
                  <div style={{ color: T.text, marginBottom: 2 }}>{f.finding}</div>
                  <div style={{ color: T.dim, fontSize: 10 }}>{f.framework} / {f.control}</div>
                  <div style={{ color: T.lime, fontSize: 10, marginTop: 4, cursor: "pointer" }}>View in Ledger &rarr;</div>
                </div>
              ))}
            </Section>

            {/* Certified Staff */}
            <Section title={`Certified Staff (${certifiedStaff.length})`}>
              {certifiedStaff.length === 0 && (
                <div style={{ fontSize: 11, color: T.red }}>No certified staff found — coverage gap!</div>
              )}
              {certifiedStaff.map((s) => (
                <div key={s.id} style={{ padding: 8, background: T.bg, borderRadius: 6, marginBottom: 6, fontSize: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: T.white, fontWeight: 500 }}>{s.name}</span>
                    <Pill color={s.onShift ? T.green : T.dim}>{s.onShift ? "On Shift" : "Off Shift"}</Pill>
                  </div>
                  <div style={{ color: T.dim, fontSize: 10, marginTop: 2 }}>{s.role} / {s.department}</div>
                  <div style={{ color: T.dim, fontSize: 10 }}>Cert expires: {s.certExpiry}</div>
                  <div style={{ color: T.lime, fontSize: 10, marginTop: 4, cursor: "pointer" }}>View in Meridian &rarr;</div>
                </div>
              ))}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ── */
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: T.lime, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, borderBottom: `1px solid ${T.border}`, paddingBottom: 4 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", fontSize: 11 }}>
      <span style={{ color: T.dim }}>{label}</span>
      <span style={{ color: T.text, fontFamily: typeof value === "string" ? "'Space Mono',monospace" : undefined, fontSize: 11 }}>{value}</span>
    </div>
  );
}
