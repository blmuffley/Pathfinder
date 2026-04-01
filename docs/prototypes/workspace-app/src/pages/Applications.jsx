/**
 * Applications — Discovered applications with visual dependency diagrams.
 *
 * Features:
 * - 4 layout modes: Radial, Top-Down, Left-Right, Grouped
 * - Device type filters (toggle on/off)
 * - Lines route to edge of center node, not through it
 * - Full legend with device type shapes
 */
import { useState, useMemo } from "react";
import { useTheme } from "../data/theme";

// ── Device type definitions ──
const DEVICE_TYPES = {
  server:    { label: "Server / Service",  color: "#3b82f6", icon: "\u25A0" },
  database:  { label: "Database",          color: "#8b5cf6", icon: "\u25C6" },
  messaging: { label: "Message Broker",    color: "#f97316", icon: "\u2B22" },
  clinical:  { label: "Clinical Device",   color: "#f59e0b", icon: "\u2795" },
  critical:  { label: "Life-Critical",     color: "#ef4444", icon: "\u25C6" },
  iot:       { label: "IoT / OT",          color: "#14b8a6", icon: "\u25B2" },
  external:  { label: "External Service",  color: "#78716c", icon: "\u2601" },
  storage:   { label: "Storage / Archive", color: "#06b6d4", icon: "\u25A0" },
  directory: { label: "Directory / Auth",  color: "#ec4899", icon: "\u25A0" },
};

const LAYOUTS = [
  { id: "radial", label: "Radial" },
  { id: "topdown", label: "Top-Down" },
  { id: "leftright", label: "Left-Right" },
  { id: "grouped", label: "Grouped by Type" },
];

// ── Application data ──
const APPS = [
  {
    id: "APP-001", name: "Epic EHR Integration Engine", type: "Integration Engine",
    runtime: "Mirth Connect", health: 92, tier: "Business Critical",
    department: "HIT", protocols: ["HL7", "FHIR", "DICOM", "HTTPS"],
    deps: [
      { name: "PACS Archive", type: "storage", protocol: "DICOM", health: 90, direction: "outbound", flows: "28K" },
      { name: "Lab Information System", type: "server", protocol: "HL7", health: 87, direction: "outbound", flows: "12K" },
      { name: "Pharmacy Dispensing", type: "server", protocol: "HL7", health: 95, direction: "outbound", flows: "7.8K" },
      { name: "Active Directory", type: "directory", protocol: "LDAP", health: 67, direction: "outbound", flows: "12.8K" },
      { name: "CT Scanner #1", type: "clinical", protocol: "DICOM", health: 91, direction: "bidirectional", flows: "15K" },
      { name: "CT Scanner #2", type: "clinical", protocol: "DICOM", health: 87, direction: "bidirectional", flows: "11K" },
      { name: "MRI Scanner", type: "clinical", protocol: "DICOM", health: 93, direction: "bidirectional", flows: "8K" },
      { name: "Ultrasound (Cardio)", type: "clinical", protocol: "DICOM", health: 92, direction: "bidirectional", flows: "5K" },
      { name: "Infusion Pumps (48x)", type: "clinical", protocol: "HL7", health: 61, direction: "inbound", flows: "4.2K" },
      { name: "Patient Monitors (22x)", type: "critical", protocol: "IEEE 11073", health: 97, direction: "inbound", flows: "52K" },
      { name: "Ventilators (8x)", type: "critical", protocol: "IEEE 11073", health: 88, direction: "inbound", flows: "38K" },
      { name: "Neonatal Monitors (5x)", type: "critical", protocol: "IEEE 11073", health: 94, direction: "inbound", flows: "41K" },
      { name: "Pharmacy Pyxis (12x)", type: "server", protocol: "HL7", health: 96, direction: "bidirectional", flows: "7.8K" },
      { name: "Blood Bank System", type: "server", protocol: "HL7", health: 94, direction: "outbound", flows: "3.2K" },
      { name: "Kafka Event Bus", type: "messaging", protocol: "Kafka", health: 96, direction: "outbound", flows: "15K" },
      { name: "External HIE Gateway", type: "external", protocol: "FHIR", health: 88, direction: "outbound", flows: "1.2K" },
    ],
  },
  {
    id: "APP-002", name: "Order Processing Service", type: "Microservice",
    runtime: "Java (Spring Boot)", health: 94, tier: "Business Critical",
    department: "Engineering", protocols: ["HTTPS", "Kafka", "PostgreSQL"],
    deps: [
      { name: "Payment Gateway", type: "external", protocol: "HTTPS", health: 91, direction: "outbound", flows: "48.2K" },
      { name: "Kafka Event Bus", type: "messaging", protocol: "Kafka", health: 96, direction: "outbound", flows: "890K" },
      { name: "Warehouse DB", type: "database", protocol: "PostgreSQL", health: 88, direction: "outbound", flows: "31.5K" },
      { name: "Notification Svc", type: "server", protocol: "Kafka", health: 34, direction: "outbound", flows: "67K" },
      { name: "Analytics Engine", type: "server", protocol: "Kafka", health: 94, direction: "outbound", flows: "2.4K" },
      { name: "Active Directory", type: "directory", protocol: "LDAP", health: 67, direction: "outbound", flows: "12.8K" },
    ],
  },
  {
    id: "APP-003", name: "PACS Archive", type: "Imaging Storage",
    runtime: "DCM4CHEE", health: 90, tier: "Business Critical",
    department: "Radiology", protocols: ["DICOM", "HTTPS", "HL7"],
    deps: [
      { name: "Epic EHR Engine", type: "server", protocol: "DICOM", health: 92, direction: "inbound", flows: "28K" },
      { name: "CT Scanner #1", type: "clinical", protocol: "DICOM", health: 91, direction: "inbound", flows: "15K" },
      { name: "CT Scanner #2", type: "clinical", protocol: "DICOM", health: 87, direction: "inbound", flows: "11K" },
      { name: "MRI Scanner", type: "clinical", protocol: "DICOM", health: 93, direction: "inbound", flows: "8K" },
      { name: "X-Ray (Portable)", type: "clinical", protocol: "DICOM", health: 85, direction: "inbound", flows: "3K" },
      { name: "Ultrasound (Cardio)", type: "clinical", protocol: "DICOM", health: 92, direction: "inbound", flows: "5K" },
      { name: "Radiology Workstations", type: "server", protocol: "DICOM", health: 97, direction: "outbound", flows: "40K" },
      { name: "Cloud Backup (VNA)", type: "external", protocol: "HTTPS", health: 95, direction: "outbound", flows: "2K" },
    ],
  },
  {
    id: "APP-004", name: "Kafka Event Bus", type: "Message Broker",
    runtime: "Apache Kafka 3.6", health: 96, tier: "Infrastructure Critical",
    department: "Platform", protocols: ["Kafka", "JMX", "ZooKeeper"],
    deps: [
      { name: "Order Processing", type: "server", protocol: "Kafka", health: 94, direction: "inbound", flows: "890K" },
      { name: "Epic EHR Engine", type: "server", protocol: "Kafka", health: 92, direction: "inbound", flows: "15K" },
      { name: "Analytics Engine", type: "server", protocol: "Kafka", health: 94, direction: "outbound", flows: "2.4K" },
      { name: "Notification Svc", type: "server", protocol: "Kafka", health: 34, direction: "outbound", flows: "67K" },
      { name: "Shipping Platform", type: "server", protocol: "Kafka", health: 85, direction: "outbound", flows: "8.9K" },
      { name: "Inventory Manager", type: "server", protocol: "Kafka", health: 88, direction: "outbound", flows: "31.5K" },
      { name: "Audit Logger", type: "storage", protocol: "Kafka", health: 99, direction: "outbound", flows: "120K" },
      { name: "ZooKeeper Cluster", type: "server", protocol: "ZooKeeper", health: 98, direction: "bidirectional", flows: "5K" },
    ],
  },
  {
    id: "APP-005", name: "Lab Information System", type: "Departmental App",
    runtime: "Sunquest", health: 87, tier: "High",
    department: "Laboratory", protocols: ["HL7", "PostgreSQL"],
    deps: [
      { name: "Epic EHR Engine", type: "server", protocol: "HL7", health: 92, direction: "outbound", flows: "12K" },
      { name: "Chemistry Analyzer", type: "clinical", protocol: "HL7", health: 94, direction: "inbound", flows: "8K" },
      { name: "Blood Gas Analyzer", type: "clinical", protocol: "HL7", health: 91, direction: "inbound", flows: "2K" },
      { name: "Lab DB", type: "database", protocol: "PostgreSQL", health: 95, direction: "outbound", flows: "24K" },
      { name: "Kafka Event Bus", type: "messaging", protocol: "Kafka", health: 96, direction: "outbound", flows: "4K" },
    ],
  },
  {
    id: "APP-006", name: "Building Management System", type: "OT Controller",
    runtime: "Honeywell EBI", health: 93, tier: "Medium",
    department: "Facilities", protocols: ["BACnet", "SNMP", "HTTPS"],
    deps: [
      { name: "HVAC Controller Bldg A", type: "iot", protocol: "BACnet", health: 95, direction: "bidirectional", flows: "8.4K" },
      { name: "HVAC Controller Bldg B", type: "iot", protocol: "BACnet", health: 92, direction: "bidirectional", flows: "7.1K" },
      { name: "Env Sensors (28x)", type: "iot", protocol: "MQTT", health: 88, direction: "inbound", flows: "620" },
      { name: "Fire Suppression", type: "iot", protocol: "BACnet", health: 99, direction: "bidirectional", flows: "200" },
      { name: "Elevator Controllers (4x)", type: "iot", protocol: "BACnet", health: 97, direction: "bidirectional", flows: "1.2K" },
      { name: "UPS Systems (6x)", type: "iot", protocol: "SNMP", health: 96, direction: "inbound", flows: "500" },
      { name: "Facilities Dashboard", type: "server", protocol: "HTTPS", health: 98, direction: "outbound", flows: "3K" },
    ],
  },
  {
    id: "APP-007", name: "Active Directory", type: "Directory Service",
    runtime: "Windows AD", health: 67, tier: "Infrastructure Critical",
    department: "IT", protocols: ["LDAP", "Kerberos"],
    deps: [
      { name: "Epic EHR Engine", type: "server", protocol: "LDAP", health: 92, direction: "inbound", flows: "12.8K" },
      { name: "Order Processing", type: "server", protocol: "LDAP", health: 94, direction: "inbound", flows: "12.8K" },
      { name: "Web Servers (12x)", type: "server", protocol: "LDAP", health: 95, direction: "inbound", flows: "45K" },
      { name: "VPN Gateway", type: "external", protocol: "LDAPS", health: 98, direction: "inbound", flows: "8K" },
      { name: "Backup DC", type: "directory", protocol: "Replication", health: 67, direction: "bidirectional", flows: "120K" },
    ],
  },
];

// ── Layout engines ──
function layoutRadial(nodes, W, H, centerR) {
  const CX = W / 2, CY = H / 2;
  const R = Math.min(W, H) / 2 - 70;
  return nodes.map((n, i) => {
    const angle = -90 + (360 / nodes.length) * i;
    const rad = (angle * Math.PI) / 180;
    return { ...n, x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
  });
}

function layoutTopDown(nodes, W, H) {
  const CX = W / 2;
  const inbound = nodes.filter(n => n.direction === "inbound");
  const outbound = nodes.filter(n => n.direction === "outbound");
  const bidir = nodes.filter(n => n.direction === "bidirectional");
  const result = [];
  // Inbound above center
  inbound.forEach((n, i) => {
    const x = (W / (inbound.length + 1)) * (i + 1);
    result.push({ ...n, x, y: 60 });
  });
  // Bidirectional to the sides at center height
  bidir.forEach((n, i) => {
    const side = i % 2 === 0 ? 70 : W - 70;
    const yOff = Math.floor(i / 2) * 50;
    result.push({ ...n, x: side, y: H / 2 - (bidir.length * 12) + yOff });
  });
  // Outbound below center
  outbound.forEach((n, i) => {
    const x = (W / (outbound.length + 1)) * (i + 1);
    result.push({ ...n, x, y: H - 60 });
  });
  return result;
}

function layoutLeftRight(nodes, W, H) {
  const inbound = nodes.filter(n => n.direction === "inbound");
  const outbound = nodes.filter(n => n.direction === "outbound");
  const bidir = nodes.filter(n => n.direction === "bidirectional");
  const result = [];
  inbound.forEach((n, i) => {
    result.push({ ...n, x: 80, y: (H / (inbound.length + 1)) * (i + 1) });
  });
  bidir.forEach((n, i) => {
    const y = i % 2 === 0 ? 50 + i * 20 : H - 50 - (i - 1) * 20;
    result.push({ ...n, x: W / 2, y });
  });
  outbound.forEach((n, i) => {
    result.push({ ...n, x: W - 80, y: (H / (outbound.length + 1)) * (i + 1) });
  });
  return result;
}

function layoutGrouped(nodes, W, H) {
  const groups = {};
  nodes.forEach(n => {
    if (!groups[n.type]) groups[n.type] = [];
    groups[n.type].push(n);
  });
  const groupKeys = Object.keys(groups);
  const result = [];
  const cols = Math.ceil(Math.sqrt(groupKeys.length));
  groupKeys.forEach((gk, gi) => {
    const col = gi % cols;
    const row = Math.floor(gi / cols);
    const gx = (W / (cols + 1)) * (col + 1);
    const gy = (H / (Math.ceil(groupKeys.length / cols) + 1)) * (row + 1);
    groups[gk].forEach((n, ni) => {
      const offsetX = (ni % 3 - 1) * 55;
      const offsetY = Math.floor(ni / 3) * 45;
      result.push({ ...n, x: gx + offsetX, y: gy + offsetY });
    });
  });
  return result;
}

// ── Edge routing: line from center node edge to dependency node ──
function edgeFromCenter(cx, cy, cw, ch, tx, ty) {
  // Find intersection of line (cx,cy)->(tx,ty) with the center rectangle
  const dx = tx - cx, dy = ty - cy;
  const absDx = Math.abs(dx), absDy = Math.abs(dy);
  const hw = cw / 2, hh = ch / 2;
  let sx, sy;
  if (absDx * hh > absDy * hw) {
    // Intersects left or right edge
    sx = cx + (dx > 0 ? hw : -hw);
    sy = cy + dy * (hw / absDx);
  } else {
    // Intersects top or bottom edge
    sx = cx + dx * (hh / absDy);
    sy = cy + (dy > 0 ? hh : -hh);
  }
  return { sx, sy };
}

// ── Arrow marker for SVG ──
function ArrowDefs({ t }) {
  return (
    <defs>
      <marker id="arrow-green" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
        <path d="M0,0 L8,3 L0,6" fill={t.green} opacity="0.6" />
      </marker>
      <marker id="arrow-blue" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
        <path d="M0,0 L8,3 L0,6" fill="#3b82f6" opacity="0.6" />
      </marker>
      <marker id="arrow-amber" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
        <path d="M0,0 L8,3 L0,6" fill="#f59e0b" opacity="0.6" />
      </marker>
    </defs>
  );
}

export default function Applications() {
  const { theme: t } = useTheme();
  const [selectedApp, setSelectedApp] = useState(0);
  const [layout, setLayout] = useState("radial");
  const [typeFilters, setTypeFilters] = useState(() => {
    const f = {};
    Object.keys(DEVICE_TYPES).forEach(k => f[k] = true);
    return f;
  });

  const app = APPS[selectedApp];
  const healthColor = h => h >= 80 ? t.green : h >= 60 ? t.amber : t.red;
  const dirColor = d => d === "inbound" ? "#3b82f6" : d === "outbound" ? t.green : "#f59e0b";

  // Filter deps by active type filters
  const filteredDeps = useMemo(() =>
    app.deps.filter(d => typeFilters[d.type]),
    [app, typeFilters]
  );

  // Layout
  const W = 900, H = 520;
  const CX = W / 2, CY = H / 2;
  const CW = 140, CH = 56; // center node dimensions

  const positioned = useMemo(() => {
    switch (layout) {
      case "topdown": return layoutTopDown(filteredDeps, W, H);
      case "leftright": return layoutLeftRight(filteredDeps, W, H);
      case "grouped": return layoutGrouped(filteredDeps, W, H);
      default: return layoutRadial(filteredDeps, W, H, 60);
    }
  }, [filteredDeps, layout]);

  const toggleType = (type) => {
    setTypeFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const activeTypeCount = Object.values(typeFilters).filter(Boolean).length;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: t.textStrong }}>Applications</h1>
        <p style={{ fontSize: 12, color: t.dim }}>Discovered applications with visual dependency mapping. Select an app, choose a layout, filter device types.</p>
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        {/* Left: App List */}
        <div style={{ width: 280, flexShrink: 0 }}>
          {APPS.map((a, i) => (
            <button key={a.id} onClick={() => setSelectedApp(i)} style={{
              width: "100%", padding: "10px 12px", marginBottom: 3, borderRadius: 8,
              border: selectedApp === i ? `1px solid ${t.lime}` : `1px solid ${t.border}`,
              background: selectedApp === i ? t.limeDim : t.bgCard,
              cursor: "pointer", textAlign: "left", transition: "all 0.15s",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: selectedApp === i ? t.lime : t.textStrong }}>{a.name}</div>
                <div style={{ fontSize: 9, color: t.dim }}>{a.type} | {a.department}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: healthColor(a.health), fontFamily: "'Space Mono',monospace" }}>{a.health}</div>
                <div style={{ fontSize: 8, color: t.dim }}>{a.deps.length} deps</div>
              </div>
            </button>
          ))}
        </div>

        {/* Right: Diagram + Controls */}
        <div style={{ flex: 1 }}>
          {/* App header bar */}
          <div style={{ background: t.bgCard, borderRadius: 10, padding: 14, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: 16, fontWeight: 700, color: t.textStrong }}>{app.name}</span>
              <span style={{ fontSize: 11, color: t.dim, marginLeft: 10 }}>{app.type} | {app.runtime}</span>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                {app.protocols.map(p => (
                  <span key={p} style={{ fontSize: 8, padding: "2px 6px", borderRadius: 3, background: `${t.cyan}${t.pillBgAlpha}`, color: t.cyan }}>{p}</span>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, textAlign: "center" }}>
              <div><div style={{ fontSize: 20, fontWeight: 700, color: healthColor(app.health), fontFamily: "'Space Mono',monospace" }}>{app.health}</div><div style={{ fontSize: 8, color: t.dim }}>Health</div></div>
              <div><div style={{ fontSize: 20, fontWeight: 700, color: t.cyan, fontFamily: "'Space Mono',monospace" }}>{filteredDeps.length}</div><div style={{ fontSize: 8, color: t.dim }}>Visible</div></div>
              <div><div style={{ fontSize: 20, fontWeight: 700, color: t.red, fontFamily: "'Space Mono',monospace" }}>{filteredDeps.filter(d => d.health < 80).length}</div><div style={{ fontSize: 8, color: t.dim }}>Issues</div></div>
            </div>
          </div>

          {/* Controls: Layout + Filters */}
          <div style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* Layout selector */}
            <div style={{ display: "flex", gap: 2, background: t.bgCard, borderRadius: 6, padding: 2 }}>
              {LAYOUTS.map(l => (
                <button key={l.id} onClick={() => setLayout(l.id)} style={{
                  padding: "5px 10px", borderRadius: 4, border: "none",
                  fontSize: 10, fontWeight: layout === l.id ? 600 : 400,
                  color: layout === l.id ? (t.mode === "dark" ? "#0e0e0c" : "#fff") : t.dim,
                  background: layout === l.id ? t.lime : "transparent",
                }}>{l.label}</button>
              ))}
            </div>

            {/* Type filters */}
            <div style={{ display: "flex", gap: 3, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 9, color: t.dim, marginRight: 4 }}>FILTER:</span>
              {Object.entries(DEVICE_TYPES).map(([key, dt]) => {
                const active = typeFilters[key];
                const count = app.deps.filter(d => d.type === key).length;
                if (count === 0) return null;
                return (
                  <button key={key} onClick={() => toggleType(key)} style={{
                    padding: "3px 8px", borderRadius: 4, border: `1px solid ${active ? dt.color : t.border}`,
                    background: active ? `${dt.color}18` : "transparent",
                    color: active ? dt.color : t.dim, fontSize: 9, opacity: active ? 1 : 0.5,
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <span>{dt.icon}</span> {dt.label} ({count})
                  </button>
                );
              })}
              {activeTypeCount < Object.keys(DEVICE_TYPES).length && (
                <button onClick={() => setTypeFilters(Object.fromEntries(Object.keys(DEVICE_TYPES).map(k => [k, true])))}
                  style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${t.border}`, background: "transparent", color: t.dim, fontSize: 9 }}>
                  Show All
                </button>
              )}
            </div>
          </div>

          {/* SVG Diagram */}
          <div style={{ background: t.bgCard, borderRadius: 10, padding: 8, marginBottom: 10 }}>
            <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
              <ArrowDefs t={t} />

              {/* Connection lines — routed from center node EDGE */}
              {positioned.map((node, i) => {
                const hc = node.health >= 80 ? t.green : node.health >= 60 ? t.amber : t.red;
                const { sx, sy } = edgeFromCenter(CX, CY, CW + 10, CH + 10, node.x, node.y);
                const isDegraded = node.health < 80;
                const markerId = node.direction === "outbound" ? "arrow-green" : node.direction === "inbound" ? "arrow-blue" : "arrow-amber";

                return (
                  <g key={`edge-${i}`}>
                    <line
                      x1={sx} y1={sy} x2={node.x} y2={node.y}
                      stroke={hc}
                      strokeWidth={isDegraded ? 2 : 1}
                      opacity={isDegraded ? 0.7 : 0.25}
                      strokeDasharray={node.direction === "bidirectional" ? "none" : "5 3"}
                      markerEnd={node.direction !== "bidirectional" ? `url(#${markerId})` : undefined}
                    />
                  </g>
                );
              })}

              {/* Center app node — clear background, no lines through it */}
              <rect x={CX - CW / 2 - 4} y={CY - CH / 2 - 4} width={CW + 8} height={CH + 8} rx={10}
                fill={t.bgCard} stroke="none" />
              <rect x={CX - CW / 2} y={CY - CH / 2} width={CW} height={CH} rx={8}
                fill={t.mode === "dark" ? "#1a2e1a" : "#e8f5e9"} stroke={t.lime} strokeWidth={2} />
              <text x={CX} y={CY - 8} textAnchor="middle" fill={t.lime} fontSize={10} fontWeight={700} fontFamily="'Space Mono',monospace">
                {app.name.length > 20 ? app.name.substring(0, 18) + "\u2026" : app.name}
              </text>
              <text x={CX} y={CY + 7} textAnchor="middle" fill={t.dim} fontSize={8}>{app.type}</text>
              <text x={CX} y={CY + 19} textAnchor="middle" fill={healthColor(app.health)} fontSize={9} fontWeight={700}
                fontFamily="'Space Mono',monospace">Health: {app.health}</text>

              {/* Dependency nodes */}
              {positioned.map((node, i) => {
                const dt = DEVICE_TYPES[node.type] || DEVICE_TYPES.server;
                const hc = node.health >= 80 ? t.green : node.health >= 60 ? t.amber : t.red;
                const nodeW = 110, nodeH = 36;
                return (
                  <g key={`node-${i}`}>
                    {/* Node background */}
                    <rect x={node.x - nodeW / 2} y={node.y - nodeH / 2} width={nodeW} height={nodeH}
                      rx={6} fill={t.mode === "dark" ? "#1c1917" : "#fff"} stroke={dt.color} strokeWidth={1.5} opacity={0.95} />
                    {/* Type icon */}
                    <text x={node.x - nodeW / 2 + 10} y={node.y + 1} fill={dt.color} fontSize={11}>{dt.icon}</text>
                    {/* Name */}
                    <text x={node.x - nodeW / 2 + 22} y={node.y - 4} fill={t.textStrong || t.text} fontSize={8} fontWeight={600}>
                      {node.name.length > 16 ? node.name.substring(0, 14) + "\u2026" : node.name}
                    </text>
                    {/* Protocol + flows */}
                    <text x={node.x - nodeW / 2 + 22} y={node.y + 7} fill={t.dim} fontSize={7}>
                      {node.protocol} | {node.flows}
                    </text>
                    {/* Health dot */}
                    <circle cx={node.x + nodeW / 2 - 10} cy={node.y} r={5} fill={hc} />
                    <text x={node.x + nodeW / 2 - 10} y={node.y + 3} textAnchor="middle" fill={t.mode === "dark" ? "#000" : "#fff"} fontSize={6} fontWeight={700}>
                      {node.health}
                    </text>
                  </g>
                );
              })}

              {/* Direction labels for top-down and left-right */}
              {layout === "topdown" && <>
                <text x={CX} y={25} textAnchor="middle" fill="#3b82f6" fontSize={9} fontFamily="'Space Mono',monospace" fontWeight={600}>INBOUND</text>
                <text x={CX} y={H - 15} textAnchor="middle" fill={t.green} fontSize={9} fontFamily="'Space Mono',monospace" fontWeight={600}>OUTBOUND</text>
              </>}
              {layout === "leftright" && <>
                <text x={40} y={20} fill="#3b82f6" fontSize={9} fontFamily="'Space Mono',monospace" fontWeight={600}>INBOUND</text>
                <text x={W - 80} y={20} fill={t.green} fontSize={9} fontFamily="'Space Mono',monospace" fontWeight={600}>OUTBOUND</text>
              </>}
            </svg>
          </div>

          {/* Legend */}
          <div style={{ background: t.bgCard, borderRadius: 10, padding: 12, marginBottom: 10, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 9, color: t.dim, fontFamily: "'Space Mono',monospace" }}>LEGEND:</span>
            {Object.entries(DEVICE_TYPES).map(([key, dt]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 4, opacity: typeFilters[key] ? 1 : 0.3 }}>
                <span style={{ color: dt.color, fontSize: 11 }}>{dt.icon}</span>
                <span style={{ fontSize: 9, color: dt.color }}>{dt.label}</span>
              </div>
            ))}
            <span style={{ width: 1, height: 14, background: t.border }} />
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: t.green }} /><span style={{ fontSize: 9, color: t.dim }}>Healthy</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: t.amber }} /><span style={{ fontSize: 9, color: t.dim }}>Degraded</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: t.red }} /><span style={{ fontSize: 9, color: t.dim }}>Critical</span></div>
            <span style={{ width: 1, height: 14, background: t.border }} />
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <svg width={16} height={6}><line x1={0} y1={3} x2={16} y2={3} stroke={t.dim} strokeWidth={1} strokeDasharray="4 2" /></svg>
              <span style={{ fontSize: 9, color: t.dim }}>Directional</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <svg width={16} height={6}><line x1={0} y1={3} x2={16} y2={3} stroke={t.dim} strokeWidth={1} /></svg>
              <span style={{ fontSize: 9, color: t.dim }}>Bidirectional</span>
            </div>
          </div>

          {/* Dependency table */}
          <div style={{ background: t.bgCard, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: t.textStrong, marginBottom: 8 }}>Dependency Detail ({filteredDeps.length} of {app.deps.length})</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                  {["Dir", "Type", "Target", "Protocol", "Health", "Flows"].map(h => (
                    <th key={h} style={{ padding: "5px 6px", textAlign: "left", fontSize: 8, color: t.dim, fontFamily: "'Space Mono',monospace", letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDeps.map((dep, i) => {
                  const dt = DEVICE_TYPES[dep.type] || DEVICE_TYPES.server;
                  const hc = dep.health >= 80 ? t.green : dep.health >= 60 ? t.amber : t.red;
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
                      <td style={{ padding: "5px 6px" }}>
                        <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: `${dirColor(dep.direction)}12`, color: dirColor(dep.direction) }}>
                          {dep.direction === "inbound" ? "\u2190 In" : dep.direction === "outbound" ? "\u2192 Out" : "\u2194"}
                        </span>
                      </td>
                      <td style={{ padding: "5px 6px" }}>
                        <span style={{ color: dt.color, marginRight: 4 }}>{dt.icon}</span>
                        <span style={{ fontSize: 9, color: dt.color }}>{dt.label}</span>
                      </td>
                      <td style={{ padding: "5px 6px", color: t.textStrong, fontWeight: 500 }}>{dep.name}</td>
                      <td style={{ padding: "5px 6px" }}>
                        <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: `${t.cyan}${t.pillBgAlpha}`, color: t.cyan }}>{dep.protocol}</span>
                      </td>
                      <td style={{ padding: "5px 6px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: hc, fontFamily: "'Space Mono',monospace" }}>{dep.health}</span>
                      </td>
                      <td style={{ padding: "5px 6px", fontSize: 9, color: t.dim, fontFamily: "'Space Mono',monospace" }}>{dep.flows}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
