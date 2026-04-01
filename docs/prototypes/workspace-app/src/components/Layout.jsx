import { useTheme } from '../data/theme';

const NAV_ITEMS = [
  { section: "PATHFINDER", items: [
    { id: "overview", label: "Overview" },
    { id: "applications", label: "Applications" },
    { id: "agents", label: "Agent Fleet" },
    { id: "gaps", label: "Coverage Gaps" },
    { id: "ea", label: "EA Reconciliation" },
    { id: "health", label: "Health Dashboard" },
  ]},
  { section: "CLINICAL EXTENSION", items: [
    { id: "clinical-fleet", label: "Clinical Devices" },
    { id: "discovery-sources", label: "Discovery Sources" },
    { id: "meridian", label: "Meridian" },
    { id: "ledger", label: "Ledger" },
    { id: "vantage-clinical", label: "Vantage Clinical" },
    { id: "analytics", label: "Analytics" },
  ]},
];

export default function Layout({ activePage, onNavigate, children }) {
  const { theme: t, mode, toggle } = useTheme();

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif", background: t.bg, color: t.text, transition: "background 0.3s, color 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: ${t.scrollTrack}; }
        ::-webkit-scrollbar-thumb { background: ${t.scrollThumb}; border-radius: 3px; }
        button { font-family: inherit; cursor: pointer; }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: 220, background: t.bgSidebar, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto", transition: "background 0.3s" }}>
        <div style={{ padding: "16px 14px 12px", borderBottom: `1px solid ${t.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, background: "#39FF14", borderRadius: "50%", boxShadow: mode === "dark" ? "0 0 8px #39FF14" : "none" }} />
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: t.lime, letterSpacing: 2 }}>PATHFINDER</span>
          </div>
          <div style={{ fontSize: 11, color: t.dim, marginTop: 4 }}>Clinical Extension Demo</div>
        </div>

        {NAV_ITEMS.map(section => (
          <div key={section.section}>
            <div style={{ padding: "12px 14px 4px", fontSize: 9, fontFamily: "'Space Mono',monospace", color: t.dim, letterSpacing: 1.5 }}>
              {section.section}
            </div>
            {section.items.map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  width: "100%", padding: "8px 14px", border: "none",
                  background: activePage === item.id ? t.limeDim : "transparent",
                  color: activePage === item.id ? t.lime : t.text,
                  fontSize: 12, fontWeight: activePage === item.id ? 600 : 400,
                  borderLeft: activePage === item.id ? `2px solid ${t.lime}` : "2px solid transparent",
                  transition: "all 0.15s",
                  fontFamily: "inherit",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}

        {/* Theme toggle + footer */}
        <div style={{ marginTop: "auto", padding: 14, borderTop: `1px solid ${t.border}` }}>
          <button onClick={toggle} style={{
            width: "100%", padding: "6px 10px", borderRadius: 6,
            border: `1px solid ${t.border}`, background: t.bgHover,
            color: t.text, fontSize: 11, marginBottom: 10,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            {mode === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"} {mode === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
          <div style={{ fontSize: 9, color: t.dim, fontFamily: "'Space Mono',monospace" }}>AVENNORTH</div>
          <div style={{ fontSize: 10, color: t.dim }}>Mercy Health System</div>
          <div style={{ fontSize: 9, color: t.dim, marginTop: 4 }}>3 facilities | 6,425 devices</div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", background: t.bg, transition: "background 0.3s" }}>
        {children}
      </div>
    </div>
  );
}
