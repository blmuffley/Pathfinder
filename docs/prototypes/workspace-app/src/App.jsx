import { useState } from 'react';
import { ThemeProvider } from './data/theme';
import Layout from './components/Layout';
import PathfinderWorkspace from './PathfinderWorkspace';
import PitchDeck from './PitchDeck';
import Overview from './pages/Overview';
import Applications from './pages/Applications';
import ClinicalFleet from './pages/ClinicalFleet';
import DiscoverySources from './pages/DiscoverySources';
import Meridian from './pages/Meridian';
import Ledger from './pages/Ledger';
import VantageClinical from './pages/VantageClinical';
import Analytics from './pages/Analytics';

/**
 * Avennorth Pathfinder — Full Clinical Extension Demo
 *
 * Modes:
 *   #pitch — Pitch Deck view
 *   default — Workspace with 13 pages
 *
 * Workspace pages:
 *   Base: Overview (5 tabs), Applications, Agent Fleet, Coverage Gaps, EA Recon, Health Dashboard
 *   Clinical: Clinical Devices, Discovery Sources, Meridian, Ledger, Vantage Clinical, Analytics
 */

// Pages that use the original PathfinderWorkspace component (embedded)
const LEGACY_PAGES = ["agents", "gaps", "ea", "health"];

function AppContent() {
  const [mode, setMode] = useState(() =>
    window.location.hash === '#pitch' ? 'pitch' : 'workspace'
  );
  const [activePage, setActivePage] = useState("overview");

  // Pitch Deck mode
  if (mode === 'pitch') {
    return (
      <div>
        <div style={{ position: 'fixed', top: 8, right: 12, zIndex: 9999, display: 'flex', gap: 2, background: '#151525', borderRadius: 6, padding: 2 }}>
          <button onClick={() => { setMode('workspace'); window.location.hash = ''; }} style={{
            padding: '4px 12px', borderRadius: 4, border: 'none', fontSize: 10, cursor: 'pointer',
            fontWeight: 600, color: '#6a6a84', background: 'transparent',
          }}>Workspace</button>
          <button style={{
            padding: '4px 12px', borderRadius: 4, border: 'none', fontSize: 10, cursor: 'pointer',
            fontWeight: 600, color: '#0E0E0C', background: '#c8ff00',
          }}>Pitch Deck</button>
        </div>
        <PitchDeck />
      </div>
    );
  }

  // Workspace mode — Overview is the tabbed dashboard
  if (activePage === "overview") {
    return (
      <Layout activePage={activePage} onNavigate={setActivePage}>
        <Overview />
      </Layout>
    );
  }

  // Legacy base pages (agent fleet, gaps, EA, health) use original workspace
  if (LEGACY_PAGES.includes(activePage)) {
    return (
      <Layout activePage={activePage} onNavigate={setActivePage}>
        <PathfinderWorkspace embeddedPage={activePage} />
      </Layout>
    );
  }

  // Clinical Extension + other new pages
  const pageMap = {
    "applications": <Applications />,
    "clinical-fleet": <ClinicalFleet />,
    "discovery-sources": <DiscoverySources />,
    "meridian": <Meridian />,
    "ledger": <Ledger />,
    "vantage-clinical": <VantageClinical />,
    "analytics": <Analytics />,
  };

  return (
    <Layout activePage={activePage} onNavigate={setActivePage}>
      {pageMap[activePage] || <div style={{ color: '#78716c' }}>Page not found: {activePage}</div>}
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
