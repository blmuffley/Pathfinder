/**
 * Avennorth Solutions — Master Port Registry
 *
 * Central registry of localhost ports used across all Avennorth product demos.
 * Import this in any prototype to avoid port conflicts.
 *
 * Rule: Each product owns a port range. No overlaps.
 */

export const PORTS = {
  // ── Pathfinder ──
  pathfinder: {
    prototype: 4200,        // Pathfinder workspace demo (Vite React)
    gateway_grpc: 8443,     // Gateway gRPC (agent traffic)
    shared_ai: 8080,        // Shared AI Engine (Claude API)
    integration_intel: 8081, // Integration Intelligence
    cmdb_ops: 8082,         // CMDB Ops Agent
    service_map: 8083,      // Service Map Intelligence
    meridian: 8084,         // Meridian (Clinical Ops Graph)
    ledger: 8085,           // Ledger (Compliance Automation)
    normalization: 8086,    // Discovery Normalization Layer
    postgres: 5432,         // Gateway PostgreSQL
  },

  // ── Bearing ──
  bearing: {
    prototype: 4201,        // Bearing workspace demo
    api: 8100,              // Bearing API
    assessment_engine: 8101, // Assessment processing
  },

  // ── Contour ──
  contour: {
    prototype: 4202,        // Contour workspace demo
    api: 8110,              // Contour API
    mapping_engine: 8111,   // Service mapping engine
  },

  // ── Vantage ──
  vantage: {
    prototype: 4203,        // Vantage workspace demo
    api: 8120,              // Vantage API
    incident_engine: 8121,  // Incident investigation engine
    clinical: 8122,         // Vantage Clinical extension
  },

  // ── Compass ──
  compass: {
    app: 3000,              // Compass main app
    api: 3001,              // Compass API
    storybook: 6006,        // Component library
  },

  // ── Portfolio Demo ──
  portfolio: {
    hub: 4210,              // Avennorth portfolio hub (all products)
  },
};

/**
 * Get the URL for a specific service
 * @param {string} product - Product name (e.g., "pathfinder")
 * @param {string} service - Service name (e.g., "prototype")
 * @returns {string} Full localhost URL
 */
export function getUrl(product, service) {
  const port = PORTS[product]?.[service];
  if (!port) throw new Error(`Unknown service: ${product}.${service}`);
  return `http://localhost:${port}`;
}

// Quick reference for demo scripts
export const DEMO_URLS = {
  "Pathfinder Workspace": "http://localhost:4200",
  "Bearing Workspace": "http://localhost:4201",
  "Contour Workspace": "http://localhost:4202",
  "Vantage Workspace": "http://localhost:4203",
  "Compass App": "http://localhost:3000",
  "Portfolio Hub": "http://localhost:4210",
};
