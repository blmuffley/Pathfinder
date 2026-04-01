/**
 * Discovery Page — "Look what we found on your network"
 *
 * Shows the full pipeline: raw observations → classification → confidence scoring → CMDB CI creation.
 * This is the foundational value prop — before integrations, before intelligence, Pathfinder DISCOVERS.
 */
import { useState } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { T, Pill, KPI, tierColor, tierLabel } from "../data/demoData";

// ── Discovery Pipeline Stats ──
const PIPELINE = {
  rawFlows: 14_820_000,
  classifiedFlows: 14_650_000,
  pendingClassification: 170_000,
  uniqueEndpoints: 6_425,
  newCIsCreated: 342,
  cisUpdated: 5_890,
  cisFlaggedStale: 193,
  avgConfidence: 0.87,
  lastClassificationRun: "12 sec ago",
};

// ── Discovered Assets (all tiers, all sources) ──
const DISCOVERED_ASSETS = [
  // Tier 1 — IT Infrastructure
  { id: "DA-001", hostname: "prod-web-01", ip: "10.1.10.21", type: "Linux Server", tier: 1, category: "Web Server", confidence: 0.95, source: "Pathfinder eBPF", cmdbStatus: "Synced", flows: 142000, protocols: ["HTTPS", "SSH"], department: "IT Operations", firstSeen: "Jan 15", lastSeen: "Now" },
  { id: "DA-002", hostname: "prod-db-01", ip: "10.1.20.11", type: "Linux Server", tier: 1, category: "Database Server", confidence: 0.97, source: "Pathfinder eBPF", cmdbStatus: "Synced", flows: 89200, protocols: ["PostgreSQL", "SSH"], department: "Data Engineering", firstSeen: "Jan 15", lastSeen: "Now" },
  { id: "DA-003", hostname: "prod-app-win01", ip: "10.1.10.45", type: "Windows Server", tier: 1, category: "App Server", confidence: 0.92, source: "Pathfinder eBPF", cmdbStatus: "Synced", flows: 56700, protocols: ["HTTPS", "RDP", "SQL Server"], department: "IT Operations", firstSeen: "Jan 18", lastSeen: "Now" },
  { id: "DA-004", hostname: "prod-kafka-01", ip: "10.1.30.10", type: "Linux Server", tier: 1, category: "Message Broker", confidence: 0.98, source: "Pathfinder eBPF", cmdbStatus: "Synced", flows: 920000, protocols: ["Kafka", "JMX"], department: "Platform", firstSeen: "Jan 12", lastSeen: "Now" },
  { id: "DA-005", hostname: "fw-core-01", ip: "10.1.1.1", type: "Network Device", tier: 1, category: "Firewall", confidence: 0.88, source: "Armis", cmdbStatus: "Synced", flows: 0, protocols: ["SNMP"], department: "Network", firstSeen: "Feb 01", lastSeen: "5 min ago" },
  { id: "DA-006", hostname: "sw-dist-3n", ip: "10.1.3.1", type: "Network Device", tier: 1, category: "Switch", confidence: 0.85, source: "Armis", cmdbStatus: "Synced", flows: 0, protocols: ["SNMP"], department: "Network", firstSeen: "Feb 01", lastSeen: "5 min ago" },
  { id: "DA-007", hostname: "print-3n-01", ip: "10.1.3.50", type: "Printer", tier: 1, category: "Network Printer", confidence: 0.72, source: "SN Discovery", cmdbStatus: "Synced", flows: 340, protocols: ["IPP", "SNMP"], department: "Med/Surg 3N", firstSeen: "Feb 05", lastSeen: "1 hr ago" },
  { id: "DA-008", hostname: "unknown-10.1.5.99", ip: "10.1.5.99", type: "Unknown", tier: 1, category: "Unclassified", confidence: 0.31, source: "Pathfinder eBPF", cmdbStatus: "Pending Review", flows: 1240, protocols: ["TCP:8443", "TCP:9200"], department: "Unknown", firstSeen: "Mar 28", lastSeen: "2 hr ago" },

  // Tier 2 — IoT/OT
  { id: "DA-009", hostname: "hvac-bldg-a", ip: "10.2.1.10", type: "IoT Controller", tier: 2, category: "HVAC Controller", confidence: 0.90, source: "Pathfinder eBPF", cmdbStatus: "Synced", flows: 8400, protocols: ["BACnet"], department: "Facilities", firstSeen: "Feb 10", lastSeen: "Now" },
  { id: "DA-010", hostname: "cam-lobby-01", ip: "10.2.2.20", type: "IP Camera", tier: 2, category: "Security Camera", confidence: 0.88, source: "Armis", cmdbStatus: "Synced", flows: 45000, protocols: ["ONVIF", "RTSP"], department: "Security", firstSeen: "Feb 01", lastSeen: "Now" },
  { id: "DA-011", hostname: "badge-main-ent", ip: "10.2.3.5", type: "Badge Reader", tier: 2, category: "Access Control", confidence: 0.82, source: "Armis", cmdbStatus: "Synced", flows: 1200, protocols: ["Proprietary"], department: "Security", firstSeen: "Feb 01", lastSeen: "30 min ago" },
  { id: "DA-012", hostname: "env-sensor-pharm", ip: "10.2.4.15", type: "IoT Sensor", tier: 2, category: "Environmental Sensor", confidence: 0.78, source: "Pathfinder eBPF", cmdbStatus: "Synced", flows: 620, protocols: ["MQTT"], department: "Pharmacy", firstSeen: "Mar 01", lastSeen: "5 min ago" },

  // Tier 3 — Clinical
  { id: "DA-013", hostname: "ct-scanner-1", ip: "10.3.10.20", type: "Medical Device", tier: 3, category: "CT Scanner", confidence: 0.95, source: "Pathfinder eBPF", cmdbStatus: "Synced", flows: 28000, protocols: ["DICOM", "HL7"], department: "Radiology", firstSeen: "Jan 20", lastSeen: "Now" },
  { id: "DA-014", hostname: "mri-suite-1", ip: "10.3.10.30", type: "Medical Device", tier: 3, category: "MRI Scanner", confidence: 0.96, source: "Pathfinder eBPF", cmdbStatus: "Synced", flows: 15000, protocols: ["DICOM"], department: "Radiology", firstSeen: "Jan 20", lastSeen: "Now" },
  { id: "DA-015", hostname: "alaris-3n-a", ip: "10.3.30.41", type: "Medical Device", tier: 3, category: "Infusion Pump", confidence: 0.88, source: "Armis", cmdbStatus: "Synced", flows: 4200, protocols: ["HL7", "WiFi"], department: "Med/Surg 3N", firstSeen: "Feb 15", lastSeen: "Now" },
  { id: "DA-016", hostname: "pyxis-3n", ip: "10.3.30.50", type: "Medical Device", tier: 3, category: "Pharmacy Dispensing", confidence: 0.90, source: "Pathfinder eBPF", cmdbStatus: "Synced", flows: 7800, protocols: ["HL7"], department: "Pharmacy", firstSeen: "Feb 20", lastSeen: "Now" },
  { id: "DA-017", hostname: "cobas-lab-1", ip: "10.3.40.10", type: "Medical Device", tier: 3, category: "Lab Analyzer", confidence: 0.92, source: "Pathfinder eBPF", cmdbStatus: "Synced", flows: 12000, protocols: ["HL7"], department: "Laboratory", firstSeen: "Mar 01", lastSeen: "Now" },

  // Tier 4 — Life-Critical
  { id: "DA-018", hostname: "vent-cicu-1", ip: "10.4.10.11", type: "Life-Critical Device", tier: 4, category: "ICU Ventilator", confidence: 0.96, source: "Pathfinder eBPF", cmdbStatus: "Synced", flows: 52000, protocols: ["IEEE 11073"], department: "Cardiac ICU", firstSeen: "Jan 15", lastSeen: "Now" },
  { id: "DA-019", hostname: "anes-or-1", ip: "10.4.20.11", type: "Life-Critical Device", tier: 4, category: "Anesthesia Machine", confidence: 0.98, source: "Pathfinder eBPF", cmdbStatus: "Synced", flows: 38000, protocols: ["IEEE 11073"], department: "Surgery", firstSeen: "Jan 15", lastSeen: "Now" },
  { id: "DA-020", hostname: "cardiac-mon-cicu1", ip: "10.4.10.21", type: "Life-Critical Device", tier: 4, category: "Cardiac Monitor", confidence: 0.99, source: "Pathfinder eBPF", cmdbStatus: "Synced", flows: 67000, protocols: ["IEEE 11073"], department: "Cardiac ICU", firstSeen: "Jan 15", lastSeen: "Now" },
  { id: "DA-021", hostname: "neo-mon-nicu-a1", ip: "10.4.30.11", type: "Life-Critical Device", tier: 4, category: "Neonatal Monitor", confidence: 0.93, source: "Pathfinder eBPF", cmdbStatus: "Synced", flows: 41000, protocols: ["IEEE 11073"], department: "NICU", firstSeen: "Feb 01", lastSeen: "Now" },

  // Newly discovered / pending
  { id: "DA-022", hostname: "unknown-10.3.50.12", ip: "10.3.50.12", type: "Unknown", tier: 3, category: "Pending Classification", confidence: 0.45, source: "Armis", cmdbStatus: "Pending Review", flows: 890, protocols: ["HL7?", "TCP:2575"], department: "Unknown", firstSeen: "Mar 30", lastSeen: "1 hr ago" },
  { id: "DA-023", hostname: "rogue-wifi-10.2.9.88", ip: "10.2.9.88", type: "Unknown", tier: 1, category: "Rogue Device", confidence: 0.22, source: "Armis", cmdbStatus: "Flagged", flows: 340, protocols: ["HTTP", "mDNS"], department: "Unknown", firstSeen: "Mar 29", lastSeen: "4 hr ago" },
];

// ── Discovery Timeline (last 7 days) ──
const DISCOVERY_TIMELINE = [
  { day: "Mar 25", newDevices: 3, updatedCIs: 180, classified: 14200000 },
  { day: "Mar 26", newDevices: 5, updatedCIs: 195, classified: 14350000 },
  { day: "Mar 27", newDevices: 2, updatedCIs: 188, classified: 14400000 },
  { day: "Mar 28", newDevices: 8, updatedCIs: 210, classified: 14500000 },
  { day: "Mar 29", newDevices: 4, updatedCIs: 202, classified: 14600000 },
  { day: "Mar 30", newDevices: 6, updatedCIs: 215, classified: 14650000 },
  { day: "Mar 31", newDevices: 3, updatedCIs: 198, classified: 14820000 },
];

// ── Classification by Type ──
const CLASS_DIST = [
  { name: "Linux Server", count: 2100, color: T.blue },
  { name: "Windows Server", count: 1400, color: T.cyan },
  { name: "Network Device", count: 580, color: T.dim },
  { name: "IoT / OT", count: 1200, color: T.teal },
  { name: "Clinical Device", count: 380, color: T.amber },
  { name: "Life-Critical", count: 45, color: T.red },
  { name: "Printer / Peripheral", count: 520, color: T.purple },
  { name: "Unclassified", count: 200, color: "#555" },
];

// ── Discovered Applications (inferred from behavioral patterns) ──
const DISCOVERED_APPS = [
  { id: "APP-001", name: "Order Processing Service", type: "Microservice", runtime: "Java (Spring Boot)", hosts: ["prod-web-01", "prod-web-02"], integrations: 6, protocols: ["HTTPS", "Kafka", "PostgreSQL"], health: 94, confidence: 0.96, cmdbCI: "cmdb_ci_app_server:OrderSvc", department: "Engineering", tier: "Business Critical" },
  { id: "APP-002", name: "Payment Gateway Proxy", type: "API Gateway", runtime: "nginx + Go", hosts: ["prod-app-win01"], integrations: 3, protocols: ["HTTPS", "gRPC"], health: 91, confidence: 0.93, cmdbCI: "cmdb_ci_app_server:PaymentGW", department: "Engineering", tier: "Business Critical" },
  { id: "APP-003", name: "Inventory Management System", type: "Monolith", runtime: "Python (Django)", hosts: ["prod-web-01"], integrations: 4, protocols: ["HTTPS", "PostgreSQL", "Redis"], health: 88, confidence: 0.91, cmdbCI: "cmdb_ci_app_server:InventoryMgr", department: "Operations", tier: "High" },
  { id: "APP-004", name: "Kafka Event Bus", type: "Message Broker", runtime: "Apache Kafka 3.6", hosts: ["prod-kafka-01"], integrations: 12, protocols: ["Kafka", "JMX", "ZooKeeper"], health: 96, confidence: 0.98, cmdbCI: "cmdb_ci_cluster:KafkaProd", department: "Platform", tier: "Infrastructure Critical" },
  { id: "APP-005", name: "Epic EHR Integration Engine", type: "Integration Engine", runtime: "Mirth Connect", hosts: ["ehr-integ-01"], integrations: 18, protocols: ["HL7", "FHIR", "HTTPS"], health: 92, confidence: 0.94, cmdbCI: "cmdb_ci_app_server:EpicInteg", department: "HIT", tier: "Business Critical" },
  { id: "APP-006", name: "PACS Archive", type: "Storage System", runtime: "Horos / DCM4CHEE", hosts: ["pacs-srv-01", "pacs-srv-02"], integrations: 8, protocols: ["DICOM", "HTTPS", "HL7"], health: 90, confidence: 0.95, cmdbCI: "cmdb_ci_app_server:PACS", department: "Radiology", tier: "Business Critical" },
  { id: "APP-007", name: "Lab Information System", type: "Departmental App", runtime: "Sunquest", hosts: ["lis-prod-01"], integrations: 5, protocols: ["HL7", "PostgreSQL"], health: 87, confidence: 0.89, cmdbCI: "cmdb_ci_app_server:LIS", department: "Laboratory", tier: "High" },
  { id: "APP-008", name: "Pharmacy Dispensing Controller", type: "Device Manager", runtime: "BD Pyxis Server", hosts: ["pyxis-mgr-01"], integrations: 4, protocols: ["HL7", "TCP:3001"], health: 95, confidence: 0.90, cmdbCI: "cmdb_ci_app_server:PyxisMgr", department: "Pharmacy", tier: "High" },
  { id: "APP-009", name: "Active Directory / LDAP", type: "Directory Service", runtime: "Windows AD", hosts: ["prod-ldap-01", "prod-ldap-02"], integrations: 14, protocols: ["LDAP", "LDAPS", "Kerberos"], health: 67, confidence: 0.92, cmdbCI: "cmdb_ci_app_server:AD", department: "IT", tier: "Infrastructure Critical" },
  { id: "APP-010", name: "Building Management System", type: "OT Controller", runtime: "Honeywell EBI", hosts: ["hvac-bldg-a"], integrations: 3, protocols: ["BACnet", "SNMP", "HTTPS"], health: 93, confidence: 0.88, cmdbCI: "cmdb_ci_app_server:BMS", department: "Facilities", tier: "Medium" },
  { id: "APP-011", name: "Unknown Service (10.1.5.99)", type: "Unclassified", runtime: "Unknown", hosts: ["unknown-10.1.5.99"], integrations: 2, protocols: ["TCP:8443", "TCP:9200"], health: null, confidence: 0.31, cmdbCI: null, department: "Unknown", tier: "Unknown" },
];

// ── Intelligence Mapping: How an app gets fully mapped ──
const INTELLIGENCE_STEPS = [
  { step: 1, layer: "Observation", engine: "eBPF Agent", input: "Kernel TCP/UDP events", output: "Raw flow records (src, dst, port, process, bytes, duration)", example: "10.1.10.21:443 ← 10.3.10.20:54321 [nginx, 1.2KB, 45ms]" },
  { step: 2, layer: "Classification", engine: "Gateway Rules Engine", input: "Raw flows", output: "Typed integration (API/DB/Messaging/Clinical) + confidence score", example: "Port 443 + process 'nginx' → API (HTTPS), confidence 0.95" },
  { step: 3, layer: "Grouping", engine: "Gateway Classifier", input: "Classified flows", output: "Integration CI (src app → dst app, type, pattern, direction)", example: "Order Service → Payment Gateway [API, Request-Reply, Outbound]" },
  { step: 4, layer: "Application Inference", engine: "Process + Port Correlation", input: "Grouped integrations + process names", output: "Application identity (name, type, runtime, hosts)", example: "Process 'java' on ports 8080,8443 + Kafka producer → 'Order Processing Service'" },
  { step: 5, layer: "Health Scoring", engine: "Integration Intelligence (AI)", input: "Integration CI + telemetry", output: "Health score (0-100), AI summary, anomaly detection", example: "Health: 94, 'High-frequency HTTPS, 99.97% availability, no anomalies'" },
  { step: 6, layer: "Service Mapping", engine: "Contour", input: "All integrations for an app", output: "Service dependency graph (what talks to what)", example: "OrderSvc → [PaymentGW, WarehouseDB, Kafka, Analytics, ShippingAPI]" },
  { step: 7, layer: "EA Reconciliation", engine: "Integration Intelligence", input: "Discovered integrations + EA records", output: "Confirmed/suggested/disputed EA mappings", example: "OrderSvc→PaymentGW matched to EA-2024-012 (92% confidence)" },
  { step: 8, layer: "CMDB Sync", engine: "ServiceNow Pipeline", input: "All enriched data", output: "CMDB CIs created/updated with full provenance", example: "cmdb_ci_app_server:OrderSvc + 6 relationships + health scores synced" },
  { step: 9, layer: "Clinical Context", engine: "Pathfinder Clinical", input: "Medical device CIs", output: "FDA classification, department, care area, tier assignment", example: "CT Scanner → Tier 3, DICOM, FDA Class II, Radiology Dept" },
  { step: 10, layer: "Workforce Mapping", engine: "Meridian", input: "Device CIs + UKG data", output: "Staff certifications, shift coverage, backup plans", example: "CT Scanner #1 → Lisa Park (certified, on shift), backup: CT #2" },
];

const CMDB_STATUS_COLORS = {
  Synced: T.green,
  "Pending Review": T.amber,
  Flagged: T.red,
  New: T.cyan,
};

export default function Discovery() {
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [view, setView] = useState("assets"); // assets | apps | pipeline | intelligence | cmdb-impact
  const [selectedApp, setSelectedApp] = useState(null);

  const filtered = DISCOVERED_ASSETS.filter(a => {
    if (tierFilter !== "all" && a.tier !== parseInt(tierFilter)) return false;
    if (statusFilter !== "all" && a.cmdbStatus !== statusFilter) return false;
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: T.white }}>Discovery</h1>
          <Pill color={T.green}>Live</Pill>
          <span style={{ fontSize: 11, color: T.dim }}>Last classification: {PIPELINE.lastClassificationRun}</span>
        </div>
        <p style={{ fontSize: 12, color: T.dim }}>Everything Pathfinder found on your network — classified, confidence-scored, and synced to your CMDB.</p>
      </div>

      {/* Pipeline KPIs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <KPI value={PIPELINE.uniqueEndpoints.toLocaleString()} label="Endpoints Discovered" color={T.lime} sub="Across all sources" />
        <KPI value={PIPELINE.rawFlows.toLocaleString()} label="Raw Flows Observed" color={T.blue} sub="Last 24 hours" />
        <KPI value={`${PIPELINE.newCIsCreated}`} label="New CIs Created" color={T.green} sub="This week" />
        <KPI value={`${PIPELINE.cisUpdated.toLocaleString()}`} label="CIs Updated" color={T.cyan} sub="Active in CMDB" />
        <KPI value={`${PIPELINE.cisFlaggedStale}`} label="Flagged Stale" color={T.amber} sub="No traffic >7 days" />
        <KPI value={`${Math.round(PIPELINE.avgConfidence * 100)}%`} label="Avg Confidence" color={T.lime} sub="Across all devices" />
      </div>

      {/* View Tabs */}
      <div style={{ display: "flex", gap: 3, marginBottom: 16, background: T.bgCard, borderRadius: 8, padding: 3, width: "fit-content" }}>
        {[
          { id: "assets", label: "Discovered Assets" },
          { id: "apps", label: "Applications" },
          { id: "pipeline", label: "Classification Pipeline" },
          { id: "intelligence", label: "Intelligence Mapping" },
          { id: "cmdb-impact", label: "CMDB Impact" },
        ].map(tab => (
          <button key={tab.id} onClick={() => setView(tab.id)} style={{
            padding: "7px 14px", borderRadius: 6, border: "none",
            fontSize: 11, fontWeight: view === tab.id ? 600 : 400,
            color: view === tab.id ? T.bg : T.dim,
            background: view === tab.id ? T.lime : "transparent",
          }}>{tab.label}</button>
        ))}
      </div>

      {/* ═══ Discovered Assets View ═══ */}
      {view === "assets" && (
        <div>
          {/* Filters */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
            {[
              { val: "all", label: "All Tiers" },
              { val: "1", label: "Tier 1 — IT" },
              { val: "2", label: "Tier 2 — IoT/OT" },
              { val: "3", label: "Tier 3 — Clinical" },
              { val: "4", label: "Tier 4 — Life-Critical" },
            ].map(f => (
              <button key={f.val} onClick={() => setTierFilter(f.val)} style={{
                padding: "5px 12px", borderRadius: 6, border: `1px solid ${tierFilter === f.val ? T.lime : T.border}`,
                background: tierFilter === f.val ? T.limeDim : "transparent",
                color: tierFilter === f.val ? T.lime : T.text, fontSize: 11, fontWeight: tierFilter === f.val ? 600 : 400,
              }}>{f.label}</button>
            ))}
            <span style={{ width: 1, height: 20, background: T.border, margin: "0 4px" }} />
            {["all", "Synced", "Pending Review", "Flagged"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                padding: "5px 10px", borderRadius: 6, border: `1px solid ${statusFilter === s ? T.amber : T.border}`,
                background: statusFilter === s ? `${T.amber}15` : "transparent",
                color: statusFilter === s ? T.amber : T.dim, fontSize: 10,
              }}>{s === "all" ? "All Status" : s}</button>
            ))}
            <span style={{ fontSize: 11, color: T.dim, marginLeft: 8 }}>{filtered.length} devices</span>
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            {/* Asset Table */}
            <div style={{ flex: selectedAsset ? 1 : 1, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    {["Hostname", "IP", "Tier", "Category", "Confidence", "Source", "Protocols", "CMDB Status", "Last Seen"].map(h => (
                      <th key={h} style={{ padding: "8px 6px", textAlign: "left", fontSize: 9, color: T.dim, fontFamily: "'Space Mono',monospace", letterSpacing: 1, fontWeight: 400 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a.id} onClick={() => setSelectedAsset(selectedAsset?.id === a.id ? null : a)}
                      style={{ borderBottom: `1px solid ${T.border}`, cursor: "pointer", background: selectedAsset?.id === a.id ? T.bgHover : "transparent" }}>
                      <td style={{ padding: "8px 6px", color: T.white, fontWeight: 500 }}>
                        {a.hostname}
                        {a.cmdbStatus === "Flagged" && <span style={{ marginLeft: 6, fontSize: 9, color: T.red }}>ROGUE</span>}
                      </td>
                      <td style={{ padding: "8px 6px", fontFamily: "'Space Mono',monospace", fontSize: 10, color: T.dim }}>{a.ip}</td>
                      <td style={{ padding: "8px 6px" }}><Pill color={tierColor[a.tier]}>{tierLabel[a.tier]}</Pill></td>
                      <td style={{ padding: "8px 6px", color: T.text }}>{a.category}</td>
                      <td style={{ padding: "8px 6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 40, height: 4, background: T.bgHover, borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ width: `${a.confidence * 100}%`, height: "100%", background: a.confidence >= 0.8 ? T.green : a.confidence >= 0.5 ? T.amber : T.red, borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 10, color: T.dim }}>{Math.round(a.confidence * 100)}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "8px 6px", fontSize: 10, color: T.dim }}>{a.source}</td>
                      <td style={{ padding: "8px 6px" }}>
                        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                          {a.protocols.map(p => <Pill key={p} color={T.blue} style={{ fontSize: 9, padding: "1px 5px" }}>{p}</Pill>)}
                        </div>
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <Pill color={CMDB_STATUS_COLORS[a.cmdbStatus] || T.dim}>{a.cmdbStatus}</Pill>
                      </td>
                      <td style={{ padding: "8px 6px", fontSize: 10, color: T.dim }}>{a.lastSeen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Detail Panel */}
            {selectedAsset && (
              <div style={{ width: 340, background: T.bgCard, borderRadius: 10, padding: 16, border: `1px solid ${T.border}`, flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: T.white }}>{selectedAsset.hostname}</h3>
                  <button onClick={() => setSelectedAsset(null)} style={{ background: "none", border: "none", color: T.dim, fontSize: 16 }}>x</button>
                </div>

                {/* Confidence Gauge */}
                <div style={{ textAlign: "center", padding: 16, background: T.bg, borderRadius: 8, marginBottom: 12 }}>
                  <div style={{ fontSize: 36, fontWeight: 700, color: selectedAsset.confidence >= 0.8 ? T.green : selectedAsset.confidence >= 0.5 ? T.amber : T.red, fontFamily: "'Space Mono',monospace" }}>
                    {Math.round(selectedAsset.confidence * 100)}%
                  </div>
                  <div style={{ fontSize: 10, color: T.dim }}>Classification Confidence</div>
                </div>

                {/* Identity */}
                {[
                  ["IP Address", selectedAsset.ip],
                  ["Type", selectedAsset.type],
                  ["Category", selectedAsset.category],
                  ["Tier", `${selectedAsset.tier} — ${tierLabel[selectedAsset.tier]}`],
                  ["Department", selectedAsset.department],
                  ["Source", selectedAsset.source],
                  ["Flows Observed", selectedAsset.flows.toLocaleString()],
                  ["Protocols", selectedAsset.protocols.join(", ")],
                  ["First Seen", selectedAsset.firstSeen],
                  ["Last Seen", selectedAsset.lastSeen],
                  ["CMDB Status", selectedAsset.cmdbStatus],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 10, color: T.dim }}>{k}</span>
                    <span style={{ fontSize: 10, color: T.text, fontWeight: 500 }}>{v}</span>
                  </div>
                ))}

                {/* CMDB Action */}
                <div style={{ marginTop: 12 }}>
                  {selectedAsset.cmdbStatus === "Pending Review" && (
                    <button style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "none", background: T.lime, color: T.bg, fontSize: 11, fontWeight: 600 }}>
                      Approve & Create CI
                    </button>
                  )}
                  {selectedAsset.cmdbStatus === "Flagged" && (
                    <button style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "none", background: T.red, color: T.white, fontSize: 11, fontWeight: 600 }}>
                      Investigate Rogue Device
                    </button>
                  )}
                  {selectedAsset.cmdbStatus === "Synced" && (
                    <button style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: `1px solid ${T.border}`, background: "transparent", color: T.text, fontSize: 11 }}>
                      View in ServiceNow CMDB
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Applications View ═══ */}
      {view === "apps" && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <KPI value={DISCOVERED_APPS.filter(a => a.confidence > 0.5).length} label="Identified Applications" color={T.lime} />
            <KPI value={DISCOVERED_APPS.reduce((s, a) => s + a.integrations, 0)} label="Total Integrations" color={T.cyan} />
            <KPI value={DISCOVERED_APPS.filter(a => a.tier === "Business Critical").length} label="Business Critical" color={T.red} />
            <KPI value={DISCOVERED_APPS.filter(a => !a.cmdbCI).length} label="Unclassified" color={T.amber} />
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    {["Application", "Type", "Runtime", "Hosts", "Integrations", "Health", "Confidence", "Department", "Tier"].map(h => (
                      <th key={h} style={{ padding: "8px 6px", textAlign: "left", fontSize: 9, color: T.dim, fontFamily: "'Space Mono',monospace", letterSpacing: 1 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DISCOVERED_APPS.map(app => (
                    <tr key={app.id} onClick={() => setSelectedApp(selectedApp?.id === app.id ? null : app)}
                      style={{ borderBottom: `1px solid ${T.border}`, cursor: "pointer", background: selectedApp?.id === app.id ? T.bgHover : "transparent" }}>
                      <td style={{ padding: "8px 6px", color: T.white, fontWeight: 500 }}>{app.name}</td>
                      <td style={{ padding: "8px 6px", color: T.text }}>{app.type}</td>
                      <td style={{ padding: "8px 6px", fontSize: 10, color: T.dim }}>{app.runtime}</td>
                      <td style={{ padding: "8px 6px", fontSize: 10, color: T.dim }}>{app.hosts.length}</td>
                      <td style={{ padding: "8px 6px" }}><span style={{ fontWeight: 600, color: T.cyan }}>{app.integrations}</span></td>
                      <td style={{ padding: "8px 6px" }}>
                        {app.health ? (
                          <span style={{ color: app.health >= 80 ? T.green : app.health >= 60 ? T.amber : T.red, fontWeight: 600 }}>{app.health}</span>
                        ) : <span style={{ color: T.dim }}>--</span>}
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <div style={{ width: 30, height: 4, background: T.bgHover, borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ width: `${app.confidence * 100}%`, height: "100%", background: app.confidence >= 0.8 ? T.green : app.confidence >= 0.5 ? T.amber : T.red }} />
                          </div>
                          <span style={{ fontSize: 9, color: T.dim }}>{Math.round(app.confidence * 100)}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "8px 6px", fontSize: 10, color: T.dim }}>{app.department}</td>
                      <td style={{ padding: "8px 6px" }}>
                        <Pill color={app.tier === "Business Critical" ? T.red : app.tier === "Infrastructure Critical" ? T.purple : app.tier === "High" ? T.amber : app.tier === "Unknown" ? T.dim : T.blue}>
                          {app.tier}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* App Detail Panel */}
            {selectedApp && (
              <div style={{ width: 360, background: T.bgCard, borderRadius: 10, padding: 16, border: `1px solid ${T.border}`, flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: T.white }}>{selectedApp.name}</h3>
                  <button onClick={() => setSelectedApp(null)} style={{ background: "none", border: "none", color: T.dim, fontSize: 16 }}>x</button>
                </div>

                {/* Health + Confidence */}
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <div style={{ flex: 1, textAlign: "center", padding: 12, background: T.bg, borderRadius: 8 }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: selectedApp.health ? (selectedApp.health >= 80 ? T.green : T.amber) : T.dim, fontFamily: "'Space Mono',monospace" }}>
                      {selectedApp.health || "--"}
                    </div>
                    <div style={{ fontSize: 9, color: T.dim }}>Health Score</div>
                  </div>
                  <div style={{ flex: 1, textAlign: "center", padding: 12, background: T.bg, borderRadius: 8 }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: selectedApp.confidence >= 0.8 ? T.green : T.amber, fontFamily: "'Space Mono',monospace" }}>
                      {Math.round(selectedApp.confidence * 100)}%
                    </div>
                    <div style={{ fontSize: 9, color: T.dim }}>Confidence</div>
                  </div>
                </div>

                {/* Details */}
                {[
                  ["Type", selectedApp.type],
                  ["Runtime", selectedApp.runtime],
                  ["Hosts", selectedApp.hosts.join(", ")],
                  ["Protocols", selectedApp.protocols.join(", ")],
                  ["Integrations", selectedApp.integrations],
                  ["Department", selectedApp.department],
                  ["Business Tier", selectedApp.tier],
                  ["CMDB CI", selectedApp.cmdbCI || "Not yet created"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 10, color: T.dim }}>{k}</span>
                    <span style={{ fontSize: 10, color: T.text, fontWeight: 500, maxWidth: 200, textAlign: "right" }}>{v}</span>
                  </div>
                ))}

                {/* Integration Map Preview */}
                <div style={{ marginTop: 12, padding: 10, background: T.bg, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: T.dim, marginBottom: 6 }}>Discovered Integrations</div>
                  {selectedApp.protocols.map(p => (
                    <div key={p} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.cyan }} />
                      <span style={{ fontSize: 10, color: T.text }}>{selectedApp.name}</span>
                      <span style={{ fontSize: 9, color: T.dim }}>→</span>
                      <Pill color={T.blue} style={{ fontSize: 8, padding: "1px 5px" }}>{p}</Pill>
                      <span style={{ fontSize: 9, color: T.dim }}>→ [downstream]</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Intelligence Mapping View ═══ */}
      {view === "intelligence" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.white, marginBottom: 4 }}>How Pathfinder Maps an Application — End to End</div>
            <div style={{ fontSize: 11, color: T.dim }}>From raw kernel observation to fully enriched CMDB CI with health scores, service dependencies, compliance status, and workforce coverage.</div>
          </div>

          {/* 10-Step Intelligence Pipeline */}
          <div style={{ position: "relative" }}>
            {INTELLIGENCE_STEPS.map((step, i) => (
              <div key={step.step} style={{ display: "flex", gap: 14, marginBottom: 2 }}>
                {/* Step number + connector */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 44, flexShrink: 0 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: step.step <= 4 ? `${T.blue}20` : step.step <= 7 ? `${T.lime}20` : step.step <= 8 ? `${T.cyan}20` : `${T.amber}20`,
                    border: `2px solid ${step.step <= 4 ? T.blue : step.step <= 7 ? T.lime : step.step <= 8 ? T.cyan : T.amber}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, color: step.step <= 4 ? T.blue : step.step <= 7 ? T.lime : step.step <= 8 ? T.cyan : T.amber,
                    flexShrink: 0,
                  }}>{step.step}</div>
                  {i < INTELLIGENCE_STEPS.length - 1 && <div style={{ width: 2, flex: 1, background: T.border, minHeight: 10 }} />}
                </div>

                {/* Content */}
                <div style={{
                  flex: 1, padding: 14, background: T.bgCard, borderRadius: 10, marginBottom: 8,
                  borderLeft: `3px solid ${step.step <= 4 ? T.blue : step.step <= 7 ? T.lime : step.step <= 8 ? T.cyan : T.amber}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.white }}>{step.layer}</span>
                    <Pill color={step.step <= 4 ? T.blue : step.step <= 7 ? T.lime : step.step <= 8 ? T.cyan : T.amber} style={{ fontSize: 8 }}>{step.engine}</Pill>
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 10, marginBottom: 6 }}>
                    <div><span style={{ color: T.dim }}>Input: </span><span style={{ color: T.text }}>{step.input}</span></div>
                  </div>
                  <div style={{ fontSize: 10, marginBottom: 6 }}>
                    <span style={{ color: T.dim }}>Output: </span><span style={{ color: T.text }}>{step.output}</span>
                  </div>
                  <div style={{ fontSize: 10, padding: "6px 8px", background: T.bg, borderRadius: 6, fontFamily: "'Space Mono',monospace", color: T.cyan }}>
                    {step.example}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Layer Legend */}
          <div style={{ display: "flex", gap: 16, marginTop: 16, padding: 14, background: T.bgCard, borderRadius: 10 }}>
            {[
              { color: T.blue, label: "Discovery Layer", desc: "Steps 1-4: Observation → Classification → Grouping → App Inference" },
              { color: T.lime, label: "Intelligence Layer", desc: "Steps 5-7: Health Scoring → Service Mapping → EA Reconciliation" },
              { color: T.cyan, label: "CMDB Layer", desc: "Step 8: ServiceNow CI creation and sync" },
              { color: T.amber, label: "Clinical Layer", desc: "Steps 9-10: FDA context + Workforce mapping (Clinical module)" },
            ].map(l => (
              <div key={l.label} style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: l.color }}>{l.label}</span>
                </div>
                <div style={{ fontSize: 10, color: T.dim }}>{l.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Classification Pipeline View ═══ */}
      {view === "pipeline" && (
        <div>
          {/* Pipeline Flow Visualization */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Raw Flows", value: "14.8M", sub: "eBPF + ETW + Armis", color: T.blue },
              { label: "Classified", value: "14.65M", sub: "98.9% classification rate", color: T.green },
              { label: "Grouped", value: "24,800", sub: "Unique src→dst→port tuples", color: T.cyan },
              { label: "Endpoints", value: "6,425", sub: "Devices identified", color: T.lime },
              { label: "CMDB CIs", value: "5,890", sub: "Active in ServiceNow", color: T.lime },
            ].map((step, i) => (
              <div key={step.label} style={{ flex: 1, position: "relative" }}>
                <div style={{ padding: 14, background: T.bgCard, borderRadius: 10, borderTop: `3px solid ${step.color}`, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: step.color, fontFamily: "'Space Mono',monospace" }}>{step.value}</div>
                  <div style={{ fontSize: 11, color: T.white, marginTop: 2 }}>{step.label}</div>
                  <div style={{ fontSize: 9, color: T.dim, marginTop: 2 }}>{step.sub}</div>
                </div>
                {i < 4 && <div style={{ position: "absolute", right: -8, top: "50%", transform: "translateY(-50%)", color: T.dim, fontSize: 14 }}>→</div>}
              </div>
            ))}
          </div>

          {/* Classification Distribution */}
          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1, background: T.bgCard, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.white, marginBottom: 12 }}>Classification by Device Type</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={CLASS_DIST} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                  <XAxis type="number" stroke={T.dim} fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke={T.dim} fontSize={10} width={100} />
                  <Tooltip contentStyle={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {CLASS_DIST.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ flex: 1, background: T.bgCard, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.white, marginBottom: 12 }}>Discovery Volume (7 days)</div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={DISCOVERY_TIMELINE}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                  <XAxis dataKey="day" stroke={T.dim} fontSize={10} />
                  <YAxis stroke={T.dim} fontSize={10} />
                  <Tooltip contentStyle={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11 }} />
                  <Area type="monotone" dataKey="newDevices" stroke={T.lime} fill={T.limeDim} strokeWidth={2} name="New Devices" />
                  <Area type="monotone" dataKey="updatedCIs" stroke={T.cyan} fill="rgba(6,182,212,0.1)" strokeWidth={2} name="CIs Updated" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Classification Rules */}
          <div style={{ background: T.bgCard, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.white, marginBottom: 12 }}>Active Classification Rules</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
              {[
                { rule: "Port 443 → API (HTTPS)", confidence: 0.90, matches: "4,200 devices", module: "Base" },
                { rule: "Port 5432 → Database (PostgreSQL)", confidence: 0.90, matches: "82 devices", module: "Base" },
                { rule: "Port 9092 → Messaging (Kafka)", confidence: 0.90, matches: "12 devices", module: "Base" },
                { rule: "Port 2575 → Clinical (HL7 v2)", confidence: 0.92, matches: "145 devices", module: "Clinical" },
                { rule: "Port 104 → Medical Imaging (DICOM)", confidence: 0.95, matches: "38 devices", module: "Clinical" },
                { rule: "IEEE 11073 pattern → Life-Critical", confidence: 0.93, matches: "45 devices", module: "Clinical" },
                { rule: "Port 47808 → IoT (BACnet)", confidence: 0.90, matches: "28 devices", module: "IoT" },
                { rule: "Process 'nginx' → Web Server", confidence: 0.85, matches: "320 devices", module: "Base" },
              ].map(r => (
                <div key={r.rule} style={{ padding: 10, background: T.bg, borderRadius: 8, borderLeft: `3px solid ${r.module === "Clinical" ? T.amber : r.module === "IoT" ? T.cyan : T.blue}` }}>
                  <div style={{ fontSize: 11, color: T.white, fontWeight: 500 }}>{r.rule}</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 9, color: T.dim }}>Conf: {Math.round(r.confidence * 100)}%</span>
                    <span style={{ fontSize: 9, color: T.dim }}>{r.matches}</span>
                    <Pill color={r.module === "Clinical" ? T.amber : r.module === "IoT" ? T.cyan : T.blue} style={{ fontSize: 8, padding: "1px 5px" }}>{r.module}</Pill>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ CMDB Impact View ═══ */}
      {view === "cmdb-impact" && (
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <KPI value="342" label="New CIs Created" color={T.green} sub="This week" />
            <KPI value="5,890" label="CIs Updated" color={T.cyan} sub="Active records refreshed" />
            <KPI value="193" label="Stale CIs Flagged" color={T.amber} sub="No traffic > 7 days" />
            <KPI value="47" label="Reclassified" color={T.purple} sub="Tier or type changed" />
            <KPI value="12" label="Rogue Devices" color={T.red} sub="Unknown, under investigation" />
          </div>

          {/* CMDB Change Log */}
          <div style={{ background: T.bgCard, borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.white, marginBottom: 12 }}>Recent CMDB Changes (from Pathfinder)</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["Time", "Action", "CI / Device", "Change", "Source", "Confidence"].map(h => (
                    <th key={h} style={{ padding: "8px 6px", textAlign: "left", fontSize: 9, color: T.dim, fontFamily: "'Space Mono',monospace" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { time: "12 min ago", action: "Created", ci: "unknown-10.3.50.12", change: "New clinical device discovered (HL7 traffic on port 2575)", source: "Armis", conf: 0.45 },
                  { time: "28 min ago", action: "Updated", ci: "alaris-3n-a", change: "Health score updated: 89 → 61 (communication retries detected)", source: "Pathfinder eBPF", conf: 0.88 },
                  { time: "1 hr ago", action: "Reclassified", ci: "env-sensor-pharm", change: "Tier 1 → Tier 2 (MQTT protocol confirmed)", source: "Pathfinder eBPF", conf: 0.78 },
                  { time: "2 hr ago", action: "Flagged", ci: "rogue-wifi-10.2.9.88", change: "Rogue device: unrecognized MAC, mDNS broadcast, no CMDB match", source: "Armis", conf: 0.22 },
                  { time: "3 hr ago", action: "Updated", ci: "ct-scanner-1", change: "Behavioral profile refreshed: 28,000 flows, DICOM + HL7 confirmed", source: "Pathfinder eBPF", conf: 0.95 },
                  { time: "4 hr ago", action: "Stale", ci: "staging-web-01", change: "No heartbeat in 3 days. Coverage gap created.", source: "Pathfinder eBPF", conf: 0.60 },
                  { time: "6 hr ago", action: "Created", ci: "badge-main-ent", change: "Badge reader discovered via Armis (Tier 2, access control)", source: "Armis", conf: 0.82 },
                  { time: "8 hr ago", action: "Updated", ci: "vent-cicu-1", change: "FDA safety communication match: review recommended (MAUDE MW5091456)", source: "Ledger", conf: 0.74 },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "8px 6px", fontSize: 10, color: T.dim }}>{row.time}</td>
                    <td style={{ padding: "8px 6px" }}>
                      <Pill color={row.action === "Created" ? T.green : row.action === "Updated" ? T.cyan : row.action === "Flagged" ? T.red : row.action === "Stale" ? T.amber : T.purple}>
                        {row.action}
                      </Pill>
                    </td>
                    <td style={{ padding: "8px 6px", color: T.white, fontWeight: 500, fontFamily: "'Space Mono',monospace", fontSize: 10 }}>{row.ci}</td>
                    <td style={{ padding: "8px 6px", color: T.text }}>{row.change}</td>
                    <td style={{ padding: "8px 6px", fontSize: 10, color: T.dim }}>{row.source}</td>
                    <td style={{ padding: "8px 6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 30, height: 4, background: T.bgHover, borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ width: `${row.conf * 100}%`, height: "100%", background: row.conf >= 0.8 ? T.green : row.conf >= 0.5 ? T.amber : T.red }} />
                        </div>
                        <span style={{ fontSize: 9, color: T.dim }}>{Math.round(row.conf * 100)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Before/After Comparison */}
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1, background: T.bgCard, borderRadius: 10, padding: 16, borderLeft: `3px solid ${T.red}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.red, marginBottom: 8 }}>Before Pathfinder</div>
              <div style={{ fontSize: 11, color: T.text, lineHeight: 1.8 }}>
                CMDB had <strong style={{ color: T.white }}>1,200 manually entered CIs</strong><br/>
                Last full audit: <strong style={{ color: T.white }}>14 months ago</strong><br/>
                Integration documentation: <strong style={{ color: T.white }}>3 spreadsheets (stale)</strong><br/>
                Medical device inventory: <strong style={{ color: T.white }}>Biomed paper records</strong><br/>
                Discovery method: <strong style={{ color: T.white }}>Annual manual walk-through</strong><br/>
                Confidence in CMDB accuracy: <strong style={{ color: T.red }}>Low</strong>
              </div>
            </div>
            <div style={{ flex: 1, background: T.bgCard, borderRadius: 10, padding: 16, borderLeft: `3px solid ${T.green}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.green, marginBottom: 8 }}>After Pathfinder (4 weeks)</div>
              <div style={{ fontSize: 11, color: T.text, lineHeight: 1.8 }}>
                CMDB has <strong style={{ color: T.white }}>6,425 auto-discovered CIs</strong> <Pill color={T.green} style={{ fontSize: 8 }}>+435%</Pill><br/>
                Last update: <strong style={{ color: T.white }}>12 seconds ago</strong> (continuous)<br/>
                Integrations documented: <strong style={{ color: T.white }}>890 with confidence scores</strong><br/>
                Medical devices classified: <strong style={{ color: T.white }}>425 (Tier 3 + 4)</strong><br/>
                Discovery method: <strong style={{ color: T.white }}>Passive eBPF + Armis (24/7)</strong><br/>
                Confidence in CMDB accuracy: <strong style={{ color: T.green }}>87% average</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
