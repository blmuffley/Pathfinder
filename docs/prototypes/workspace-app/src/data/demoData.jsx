/**
 * Avennorth Pathfinder Clinical Extension — Demo Data Package
 *
 * Comprehensive sample data for a fictional 3-facility health system:
 * - Mercy Health Main Campus (500 beds, Level I Trauma)
 * - Mercy West Hospital (250 beds, Community)
 * - Mercy South Clinic (Outpatient, Imaging)
 *
 * Device tiers: T1 (IT), T2 (IoT/OT), T3 (Clinical), T4 (Life-Critical)
 */

// ── Design Tokens ──
export const T = {
  bg: "#0e0e0c", bgCard: "#1c1917", bgHover: "#292524", bgInput: "#151513",
  lime: "#39FF14", limeDim: "rgba(57,255,20,0.10)", limeBorder: "rgba(57,255,20,0.25)",
  green: "#22c55e", amber: "#f59e0b", red: "#ef4444", blue: "#3b82f6",
  purple: "#8b5cf6", cyan: "#06b6d4", teal: "#14b8a6", orange: "#f97316",
  pink: "#ec4899", white: "#fafaf9", text: "#d6d3d1",
  dim: "#78716c", border: "rgba(255,255,255,0.06)", borderLight: "rgba(255,255,255,0.10)",
};

export const tierColor = { 1: T.blue, 2: T.cyan, 3: T.amber, 4: T.red };
export const tierLabel = { 1: "IT", 2: "IoT/OT", 3: "Clinical", 4: "Life-Critical" };
export const statusColor = { Healthy: T.green, Degraded: T.amber, Critical: T.red, Unknown: T.dim, Online: T.green, Offline: T.red, Stale: T.amber };
export const priorityColor = { Critical: T.red, High: T.amber, Medium: T.blue, Low: T.dim };
export const complianceColor = { Compliant: T.green, "Non-Compliant": T.red, "Pending Review": T.amber, "In Progress": T.blue };
export const sourceConfidence = { pathfinder_ebpf: 1.0, armis: 0.70, sn_discovery: 0.60, manual: 0.30 };

// ── Facilities ──
export const FACILITIES = [
  { id: "FAC-MAIN", name: "Mercy Health Main Campus", beds: 500, type: "Level I Trauma Center", devices: 4200, staff: 2800 },
  { id: "FAC-WEST", name: "Mercy West Hospital", beds: 250, type: "Community Hospital", devices: 1800, staff: 1200 },
  { id: "FAC-SOUTH", name: "Mercy South Clinic", beds: 0, type: "Outpatient / Imaging Center", devices: 400, staff: 180 },
];

// ── Discovery Sources ──
export const DISCOVERY_SOURCES = [
  { id: "SRC-PF-01", name: "Pathfinder eBPF (Main Campus)", type: "pathfinder_ebpf", weight: 1.0, devices: 2800, lastSync: "2 min ago", status: "Active", facility: "FAC-MAIN" },
  { id: "SRC-PF-02", name: "Pathfinder eBPF (West Hospital)", type: "pathfinder_ebpf", weight: 1.0, devices: 1200, lastSync: "3 min ago", status: "Active", facility: "FAC-WEST" },
  { id: "SRC-ARMIS", name: "Armis (All Facilities)", type: "armis", weight: 0.70, devices: 5100, lastSync: "5 min ago", status: "Active", facility: "ALL" },
  { id: "SRC-SND", name: "ServiceNow Discovery", type: "sn_discovery", weight: 0.60, devices: 3200, lastSync: "1 hr ago", status: "Active", facility: "ALL" },
  { id: "SRC-MANUAL", name: "Biomed Import (Q1 2026)", type: "manual", weight: 0.30, devices: 800, lastSync: "14 days ago", status: "Stale", facility: "ALL" },
];

// ── Clinical Devices (Tier 3 + 4) ──
export const CLINICAL_DEVICES = [
  // Tier 4 — Life-Critical
  { id: "DEV-V001", name: "ICU Ventilator #1", manufacturer: "Philips", model: "IntelliVent", tier: 4, status: "Online", health: 98, department: "Cardiac ICU", careArea: "CICU Bay 1", facility: "FAC-MAIN", protocol: "IEEE 11073", fdaCode: "BTD", fdaClass: "III", lifeCritical: true, lastCal: "2026-02-15", calDue: "2026-05-15", confidence: 0.96, source: "pathfinder_ebpf", firmware: "4.2.1" },
  { id: "DEV-V002", name: "ICU Ventilator #2", manufacturer: "Philips", model: "IntelliVent", tier: 4, status: "Online", health: 95, department: "Cardiac ICU", careArea: "CICU Bay 2", facility: "FAC-MAIN", protocol: "IEEE 11073", fdaCode: "BTD", fdaClass: "III", lifeCritical: true, lastCal: "2026-01-20", calDue: "2026-04-20", confidence: 0.94, source: "pathfinder_ebpf", firmware: "4.2.1" },
  { id: "DEV-V003", name: "ICU Ventilator #3", manufacturer: "Getinge", model: "Servo-u", tier: 4, status: "Degraded", health: 72, department: "Medical ICU", careArea: "MICU Bay 4", facility: "FAC-MAIN", protocol: "IEEE 11073", fdaCode: "BTD", fdaClass: "III", lifeCritical: true, lastCal: "2025-11-10", calDue: "2026-02-10", confidence: 0.91, source: "pathfinder_ebpf", firmware: "3.8.0" },
  { id: "DEV-A001", name: "Anesthesia Machine OR-1", manufacturer: "GE Healthcare", model: "Aisys CS2", tier: 4, status: "Online", health: 97, department: "Surgery", careArea: "OR Suite 1", facility: "FAC-MAIN", protocol: "IEEE 11073", fdaCode: "BSZ", fdaClass: "III", lifeCritical: true, lastCal: "2026-03-01", calDue: "2026-06-01", confidence: 0.98, source: "pathfinder_ebpf", firmware: "6.1.2" },
  { id: "DEV-A002", name: "Anesthesia Machine OR-2", manufacturer: "GE Healthcare", model: "Aisys CS2", tier: 4, status: "Online", health: 96, department: "Surgery", careArea: "OR Suite 2", facility: "FAC-MAIN", protocol: "IEEE 11073", fdaCode: "BSZ", fdaClass: "III", lifeCritical: true, lastCal: "2026-02-28", calDue: "2026-05-28", confidence: 0.97, source: "pathfinder_ebpf", firmware: "6.1.2" },
  { id: "DEV-CM01", name: "Cardiac Monitor CICU-1", manufacturer: "Philips", model: "IntelliVue MX800", tier: 4, status: "Online", health: 99, department: "Cardiac ICU", careArea: "CICU Bay 1", facility: "FAC-MAIN", protocol: "IEEE 11073", fdaCode: "DRT", fdaClass: "II", lifeCritical: true, lastCal: "2026-03-10", calDue: "2026-06-10", confidence: 0.99, source: "pathfinder_ebpf", firmware: "L.01.22" },
  { id: "DEV-NEO1", name: "Neonatal Monitor NICU-1", manufacturer: "Draeger", model: "Infinity Delta XL", tier: 4, status: "Online", health: 94, department: "NICU", careArea: "NICU Pod A", facility: "FAC-MAIN", protocol: "IEEE 11073", fdaCode: "DRT", fdaClass: "II", lifeCritical: true, lastCal: "2026-01-15", calDue: "2026-04-15", confidence: 0.93, source: "pathfinder_ebpf", firmware: "VF8.3" },

  // Tier 3 — Clinical
  { id: "DEV-CT01", name: "CT Scanner #1", manufacturer: "Siemens Healthineers", model: "SOMATOM Force", tier: 3, status: "Online", health: 91, department: "Radiology", careArea: "CT Suite A", facility: "FAC-MAIN", protocol: "DICOM", fdaCode: "JAK", fdaClass: "II", lifeCritical: false, lastCal: "2026-02-01", calDue: "2026-08-01", confidence: 0.95, source: "pathfinder_ebpf", firmware: "VA40A" },
  { id: "DEV-CT02", name: "CT Scanner #2", manufacturer: "GE Healthcare", model: "Revolution CT", tier: 3, status: "Online", health: 87, department: "Radiology", careArea: "CT Suite B", facility: "FAC-MAIN", protocol: "DICOM", fdaCode: "JAK", fdaClass: "II", lifeCritical: false, lastCal: "2025-12-15", calDue: "2026-06-15", confidence: 0.93, source: "pathfinder_ebpf", firmware: "RB016" },
  { id: "DEV-MRI1", name: "MRI Scanner", manufacturer: "Siemens Healthineers", model: "MAGNETOM Vida", tier: 3, status: "Online", health: 93, department: "Radiology", careArea: "MRI Suite", facility: "FAC-MAIN", protocol: "DICOM", fdaCode: "LNH", fdaClass: "II", lifeCritical: false, lastCal: "2026-01-10", calDue: "2026-07-10", confidence: 0.96, source: "pathfinder_ebpf", firmware: "VE11C" },
  { id: "DEV-IP01", name: "Infusion Pump Rack 3N-A", manufacturer: "BD", model: "Alaris 8015", tier: 3, status: "Online", health: 89, department: "Med/Surg 3N", careArea: "3 North Station A", facility: "FAC-MAIN", protocol: "HL7", fdaCode: "FRN", fdaClass: "II", lifeCritical: false, lastCal: "2026-03-05", calDue: "2026-06-05", confidence: 0.88, source: "armis", firmware: "12.1.2" },
  { id: "DEV-IP02", name: "Infusion Pump Rack 3N-B", manufacturer: "BD", model: "Alaris 8015", tier: 3, status: "Degraded", health: 61, department: "Med/Surg 3N", careArea: "3 North Station B", facility: "FAC-MAIN", protocol: "HL7", fdaCode: "FRN", fdaClass: "II", lifeCritical: false, lastCal: "2025-09-20", calDue: "2025-12-20", confidence: 0.85, source: "armis", firmware: "12.0.4" },
  { id: "DEV-LAB1", name: "Chemistry Analyzer", manufacturer: "Roche", model: "cobas c 702", tier: 3, status: "Online", health: 94, department: "Laboratory", careArea: "Core Lab", facility: "FAC-MAIN", protocol: "HL7", fdaCode: "JJE", fdaClass: "II", lifeCritical: false, lastCal: "2026-03-01", calDue: "2026-04-01", confidence: 0.92, source: "pathfinder_ebpf", firmware: "2.6.0" },
  { id: "DEV-PD01", name: "Pyxis MedStation 4000", manufacturer: "BD", model: "MedStation 4000", tier: 3, status: "Online", health: 96, department: "Pharmacy", careArea: "3 North Med Room", facility: "FAC-MAIN", protocol: "HL7", fdaCode: "OEK", fdaClass: "II", lifeCritical: false, lastCal: "2026-02-20", calDue: "2026-08-20", confidence: 0.90, source: "pathfinder_ebpf", firmware: "1.6.3" },
  { id: "DEV-XR01", name: "Portable X-Ray", manufacturer: "GE Healthcare", model: "Optima XR240amx", tier: 3, status: "Online", health: 85, department: "Radiology", careArea: "Mobile", facility: "FAC-MAIN", protocol: "DICOM", fdaCode: "IZL", fdaClass: "II", lifeCritical: false, lastCal: "2025-11-30", calDue: "2026-05-30", confidence: 0.82, source: "armis", firmware: "R3.1" },
  { id: "DEV-US01", name: "Ultrasound Vivid E95", manufacturer: "GE Healthcare", model: "Vivid E95", tier: 3, status: "Online", health: 92, department: "Cardiology", careArea: "Echo Lab", facility: "FAC-MAIN", protocol: "DICOM", fdaCode: "IYO", fdaClass: "II", lifeCritical: false, lastCal: "2026-02-10", calDue: "2026-08-10", confidence: 0.94, source: "pathfinder_ebpf", firmware: "204" },

  // West Hospital devices
  { id: "DEV-WV01", name: "Ventilator West ICU-1", manufacturer: "Philips", model: "IntelliVent", tier: 4, status: "Online", health: 97, department: "ICU", careArea: "West ICU Bay 1", facility: "FAC-WEST", protocol: "IEEE 11073", fdaCode: "BTD", fdaClass: "III", lifeCritical: true, lastCal: "2026-03-01", calDue: "2026-06-01", confidence: 0.95, source: "pathfinder_ebpf", firmware: "4.2.1" },
  { id: "DEV-WCT1", name: "CT Scanner West", manufacturer: "Siemens Healthineers", model: "SOMATOM go.Up", tier: 3, status: "Online", health: 90, department: "Radiology", careArea: "CT Room", facility: "FAC-WEST", protocol: "DICOM", fdaCode: "JAK", fdaClass: "II", lifeCritical: false, lastCal: "2026-01-20", calDue: "2026-07-20", confidence: 0.92, source: "pathfinder_ebpf", firmware: "VA50A" },

  // South Clinic
  { id: "DEV-SCT1", name: "CT Scanner South", manufacturer: "GE Healthcare", model: "Revolution EVO", tier: 3, status: "Online", health: 88, department: "Imaging", careArea: "CT Room", facility: "FAC-SOUTH", protocol: "DICOM", fdaCode: "JAK", fdaClass: "II", lifeCritical: false, lastCal: "2025-12-01", calDue: "2026-06-01", confidence: 0.88, source: "armis", firmware: "RB016" },
  { id: "DEV-SUS1", name: "Ultrasound South", manufacturer: "Philips", model: "EPIQ Elite", tier: 3, status: "Online", health: 95, department: "Imaging", careArea: "US Room 1", facility: "FAC-SOUTH", protocol: "DICOM", fdaCode: "IYO", fdaClass: "II", lifeCritical: false, lastCal: "2026-02-15", calDue: "2026-08-15", confidence: 0.91, source: "armis", firmware: "6.0.1" },
];

// ── IoT/OT Devices (Tier 2) ──
export const IOT_DEVICES = [
  { id: "IOT-HVAC1", name: "HVAC Controller Bldg A", manufacturer: "Honeywell", model: "Tridium JACE 8000", tier: 2, protocol: "BACnet", status: "Online", facility: "FAC-MAIN" },
  { id: "IOT-CAM01", name: "IP Camera Lobby Main", manufacturer: "Axis", model: "P3245-V", tier: 2, protocol: "ONVIF", status: "Online", facility: "FAC-MAIN" },
  { id: "IOT-CAM02", name: "IP Camera ER Entrance", manufacturer: "Axis", model: "P3245-V", tier: 2, protocol: "ONVIF", status: "Online", facility: "FAC-MAIN" },
  { id: "IOT-BADGE1", name: "Badge Reader Main Entrance", manufacturer: "HID Global", model: "iCLASS SE R40", tier: 2, protocol: "Proprietary", status: "Online", facility: "FAC-MAIN" },
  { id: "IOT-ENV01", name: "Env Sensor Pharmacy", manufacturer: "Sensirion", model: "SHT45", tier: 2, protocol: "MQTT", status: "Online", facility: "FAC-MAIN" },
  { id: "IOT-UPS01", name: "UPS Server Room A", manufacturer: "Eaton", model: "9PX 6000", tier: 2, protocol: "SNMP", status: "Online", facility: "FAC-MAIN" },
  { id: "IOT-ELEV1", name: "Elevator Controller Main", manufacturer: "Otis", model: "Gen3", tier: 2, protocol: "BACnet", status: "Online", facility: "FAC-MAIN" },
];

// ── Staff / Workforce (Meridian data via UKG) ──
export const STAFF = [
  { id: "STF-001", name: "Sarah Chen, RRT", role: "Respiratory Therapist", department: "Cardiac ICU", facility: "FAC-MAIN", shift: "Day (7a-7p)", onShift: true, certifications: ["Philips IntelliVent", "Getinge Servo-u", "Draeger Infinity"], certExpiry: "2027-01-15" },
  { id: "STF-002", name: "James Rodriguez, RRT", role: "Respiratory Therapist", department: "Medical ICU", facility: "FAC-MAIN", shift: "Night (7p-7a)", onShift: false, certifications: ["Philips IntelliVent", "Getinge Servo-u"], certExpiry: "2026-11-30" },
  { id: "STF-003", name: "Dr. Anika Patel", role: "Anesthesiologist", department: "Surgery", facility: "FAC-MAIN", shift: "Day (7a-7p)", onShift: true, certifications: ["GE Aisys CS2", "Draeger Perseus A500"], certExpiry: "2027-06-30" },
  { id: "STF-004", name: "Mike Thompson, BMET", role: "Biomedical Engineer", department: "Clinical Engineering", facility: "FAC-MAIN", shift: "Day (7a-5p)", onShift: true, certifications: ["Philips IntelliVent", "GE Aisys CS2", "Siemens SOMATOM", "BD Alaris"], certExpiry: "2026-08-15" },
  { id: "STF-005", name: "Lisa Park, RT(R)(CT)", role: "CT Technologist", department: "Radiology", facility: "FAC-MAIN", shift: "Day (7a-3p)", onShift: true, certifications: ["Siemens SOMATOM Force", "GE Revolution CT"], certExpiry: "2027-03-31" },
  { id: "STF-006", name: "David Kim, BMET", role: "Biomedical Engineer", department: "Clinical Engineering", facility: "FAC-MAIN", shift: "Night (5p-1a)", onShift: false, certifications: ["Philips IntelliVent", "BD Alaris", "Roche cobas"], certExpiry: "2026-12-31" },
  { id: "STF-007", name: "Maria Santos, RN", role: "Charge Nurse", department: "Cardiac ICU", facility: "FAC-MAIN", shift: "Day (7a-7p)", onShift: true, certifications: ["Philips IntelliVue MX800", "BD Alaris 8015"], certExpiry: "2027-02-28" },
  { id: "STF-008", name: "Dr. Robert Chang", role: "Radiologist", department: "Radiology", facility: "FAC-MAIN", shift: "Day (8a-5p)", onShift: true, certifications: ["Siemens MAGNETOM", "GE Vivid E95"], certExpiry: "2027-05-31" },
];

// ── Compliance Findings (Ledger) ──
export const COMPLIANCE_FINDINGS = [
  { id: "CF-001", framework: "Joint Commission", control: "EC.02.04.01", description: "Medical equipment maintenance program documentation", device: "DEV-IP02", facility: "FAC-MAIN", severity: "High", status: "Non-Compliant", finding: "Infusion pump calibration overdue by 101 days", remediation: "Schedule immediate calibration", dueDate: "2026-04-15", owner: "Mike Thompson, BMET" },
  { id: "CF-002", framework: "Joint Commission", control: "EC.02.04.03", description: "Equipment inspection and testing schedule", device: "DEV-V003", facility: "FAC-MAIN", severity: "Critical", status: "Non-Compliant", finding: "ICU ventilator calibration overdue by 49 days. Life-critical device.", remediation: "Emergency calibration required", dueDate: "2026-04-05", owner: "Mike Thompson, BMET" },
  { id: "CF-003", framework: "FDA", control: "Postmarket Surveillance", description: "Safety communication tracking", device: "DEV-IP01", facility: "FAC-MAIN", severity: "Medium", status: "Pending Review", finding: "FDA Safety Communication SC-2026-0142 matches BD Alaris 8015 firmware <12.1.0", remediation: "Verify firmware version; update if <12.1.0", dueDate: "2026-05-01", owner: "David Kim, BMET" },
  { id: "CF-004", framework: "CMS", control: "42 CFR 482.41", description: "Physical environment - medical device safety", device: "DEV-XR01", facility: "FAC-MAIN", severity: "Medium", status: "In Progress", finding: "Portable X-Ray calibration due in 60 days. No appointment scheduled.", remediation: "Schedule calibration with GE Healthcare service", dueDate: "2026-05-30", owner: "Mike Thompson, BMET" },
  { id: "CF-005", framework: "Cyber Insurance", control: "Device Inventory", description: "Complete device inventory attestation", device: null, facility: "FAC-MAIN", severity: "Low", status: "Compliant", finding: "98.2% device inventory coverage. Threshold: 95%.", remediation: null, dueDate: null, owner: "IT Director" },
  { id: "CF-006", framework: "Joint Commission", control: "EC.02.04.01", description: "Medical equipment maintenance program", device: "DEV-WCT1", facility: "FAC-WEST", severity: "Low", status: "Compliant", finding: "All West Hospital clinical devices within calibration schedule", remediation: null, dueDate: null, owner: "Clinical Engineering" },
  { id: "CF-007", framework: "State DoH", control: "FL-601.3", description: "Florida DOH medical device registration", device: null, facility: "FAC-SOUTH", severity: "Medium", status: "Pending Review", finding: "12 devices at South Clinic not registered with FL DOH", remediation: "Submit device registration forms", dueDate: "2026-06-01", owner: "Compliance Officer" },
];

// ── Clinical Incidents (Vantage Clinical) ──
export const CLINICAL_INCIDENTS = [
  { id: "INC-001", device: "DEV-V003", type: "Calibration Drift", psis: 78, blastRadius: { devices: 1, procedures: 3, patients: 3, staff: 4 }, status: "Active", priority: "P1", created: "35 min ago", facility: "FAC-MAIN", escalation: "Mike Thompson (BMET) paged, Dr. Williams (ICU Attending) notified", backup: "DEV-V001 available (CICU Bay 1, Sarah Chen on shift, certified)" },
  { id: "INC-002", device: "DEV-IP02", type: "Communication Disruption", psis: 42, blastRadius: { devices: 1, procedures: 8, patients: 8, staff: 2 }, status: "Active", priority: "P2", created: "2 hr ago", facility: "FAC-MAIN", escalation: "Nursing station 3N notified, David Kim (BMET) assigned", backup: "Spare Alaris pumps available in Biomed storage (3 units)" },
  { id: "INC-003", device: "DEV-CT02", type: "Device Failure", psis: 31, blastRadius: { devices: 1, procedures: 5, patients: 5, staff: 2 }, status: "Investigating", priority: "P3", created: "4 hr ago", facility: "FAC-MAIN", escalation: "GE Healthcare service ticket opened, Lisa Park rerouting to CT #1", backup: "DEV-CT01 available (CT Suite A, Lisa Park certified)" },
  { id: "INC-004", device: "DEV-CAM02", type: "Security Compromise", psis: 15, blastRadius: { devices: 3, procedures: 0, patients: 0, staff: 0 }, status: "Resolved", priority: "P4", created: "1 day ago", facility: "FAC-MAIN", escalation: "IT Security team resolved. Camera firmware updated.", backup: "N/A" },
];

// ── FDA MAUDE Matches ──
export const MAUDE_MATCHES = [
  { id: "MAUDE-001", device: "DEV-IP02", maudeReport: "MW5087234", failureMode: "Intermittent WiFi disconnection leading to drug library sync failure", confidence: 0.82, detected: "2 hr ago", status: "Active Alert" },
  { id: "MAUDE-002", device: "DEV-V003", maudeReport: "MW5091456", failureMode: "O2 sensor drift causing inaccurate FiO2 readings after 18 months", confidence: 0.74, detected: "1 day ago", status: "Under Review" },
];

// ── Compliance Summary by Framework ──
export const COMPLIANCE_SUMMARY = [
  { framework: "Joint Commission", total: 45, compliant: 38, nonCompliant: 4, pending: 3, score: 84 },
  { framework: "CMS CoP", total: 28, compliant: 25, nonCompliant: 1, pending: 2, score: 89 },
  { framework: "FDA Postmarket", total: 15, compliant: 11, nonCompliant: 0, pending: 4, score: 73 },
  { framework: "Cyber Insurance", total: 12, compliant: 11, nonCompliant: 0, pending: 1, score: 92 },
  { framework: "State DoH", total: 8, compliant: 5, nonCompliant: 1, pending: 2, score: 63 },
];

// ── Device Tier Distribution ──
export const TIER_DISTRIBUTION = [
  { tier: "Tier 1 - IT", count: 4800, color: T.blue },
  { tier: "Tier 2 - IoT/OT", count: 1200, color: T.cyan },
  { tier: "Tier 3 - Clinical", count: 380, color: T.amber },
  { tier: "Tier 4 - Life-Critical", count: 45, color: T.red },
];

// ── Health Trend Data (30 days) ──
export const HEALTH_TREND = Array.from({ length: 30 }, (_, i) => ({
  day: `Mar ${i + 1}`,
  tier1Health: 97 + Math.random() * 2,
  tier3Health: 88 + Math.random() * 8 - (i > 25 ? 5 : 0),
  tier4Health: 94 + Math.random() * 5 - (i > 27 ? 8 : 0),
  incidents: Math.floor(Math.random() * 3) + (i > 25 ? 2 : 0),
}));

// ── Analytics Data ──
export const DEVICE_BY_DEPARTMENT = [
  { dept: "Cardiac ICU", t3: 12, t4: 8, total: 20 },
  { dept: "Medical ICU", t3: 10, t4: 6, total: 16 },
  { dept: "Surgery / OR", t3: 15, t4: 10, total: 25 },
  { dept: "NICU", t3: 8, t4: 5, total: 13 },
  { dept: "Radiology", t3: 22, t4: 0, total: 22 },
  { dept: "Laboratory", t3: 18, t4: 0, total: 18 },
  { dept: "Pharmacy", t3: 14, t4: 0, total: 14 },
  { dept: "ED", t3: 20, t4: 4, total: 24 },
  { dept: "Med/Surg", t3: 45, t4: 0, total: 45 },
];

export const SOURCE_COVERAGE = [
  { source: "Pathfinder eBPF", devices: 4000, pct: 62 },
  { source: "Armis", devices: 5100, pct: 79 },
  { source: "SN Discovery", devices: 3200, pct: 50 },
  { source: "Both PF + Armis", devices: 3400, pct: 53 },
  { source: "PF Only", devices: 600, pct: 9 },
  { source: "Armis Only", devices: 1700, pct: 26 },
];

// ── Cert Gap Analysis (Meridian) ──
export const CERT_GAPS = [
  { device: "Getinge Servo-u", department: "Medical ICU", certifiedStaff: 1, requiredMinimum: 2, gap: true, risk: "High" },
  { device: "Draeger Infinity Delta XL", department: "NICU", certifiedStaff: 1, requiredMinimum: 2, gap: true, risk: "High" },
  { device: "BD Alaris 8015", department: "Med/Surg 3N", certifiedStaff: 3, requiredMinimum: 2, gap: false, risk: "Low" },
  { device: "Siemens SOMATOM Force", department: "Radiology", certifiedStaff: 2, requiredMinimum: 2, gap: false, risk: "Low" },
  { device: "GE Aisys CS2", department: "Surgery", certifiedStaff: 2, requiredMinimum: 2, gap: false, risk: "Low" },
];

// ── Maintenance Windows (Meridian) ──
export const MAINTENANCE_WINDOWS = [
  { device: "DEV-CT01", name: "CT Scanner #1 Quarterly PM", window: "Apr 5, 2am-6am", impact: 12, staffAvailable: true, backupAvailable: true, score: 95 },
  { device: "DEV-MRI1", name: "MRI Annual Calibration", window: "Apr 12, 11pm-5am", impact: 8, staffAvailable: true, backupAvailable: false, score: 78 },
  { device: "DEV-LAB1", name: "Chemistry Analyzer Monthly QC", window: "Apr 1, 5am-7am", impact: 4, staffAvailable: true, backupAvailable: true, score: 98 },
];

// ── Helper: Pill component ──
export const Pill = ({ children, color = T.dim, style = {} }) => (
  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, padding: "3px 8px", borderRadius: 4, background: `${color}18`, color, whiteSpace: "nowrap", ...style }}>{children}</span>
);

// ── Helper: KPI Tile ──
export const KPI = ({ value, label, color = T.lime, sub = "" }) => (
  <div style={{ padding: 14, background: T.bgCard, borderRadius: 10, borderLeft: `3px solid ${color}`, flex: 1, minWidth: 120 }}>
    <div style={{ fontSize: 24, fontWeight: 700, color, fontFamily: "'Space Mono',monospace" }}>{value}</div>
    <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>{label}</div>
    {sub && <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>{sub}</div>}
  </div>
);
