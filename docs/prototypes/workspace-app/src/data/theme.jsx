import { createContext, useContext, useState, useCallback } from "react";

// ── Dark Theme (Avennorth Obsidian) ──
const DARK = {
  mode: "dark",
  bg: "#0e0e0c",
  bgCard: "#1c1917",
  bgHover: "#292524",
  bgInput: "#151513",
  bgSidebar: "#1c1917",
  lime: "#39FF14",
  limeDim: "rgba(57,255,20,0.10)",
  limeBorder: "rgba(57,255,20,0.25)",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  cyan: "#06b6d4",
  teal: "#14b8a6",
  orange: "#f97316",
  pink: "#ec4899",
  white: "#fafaf9",
  text: "#d6d3d1",
  textStrong: "#fafaf9",
  dim: "#78716c",
  border: "rgba(255,255,255,0.06)",
  borderLight: "rgba(255,255,255,0.10)",
  chartGrid: "rgba(255,255,255,0.06)",
  tooltipBg: "#1c1917",
  tooltipBorder: "rgba(255,255,255,0.10)",
  scrollTrack: "#0e0e0c",
  scrollThumb: "#292524",
  pillBgAlpha: "18", // hex alpha appended to color
};

// ── Light Theme (Avennorth Paper) ──
const LIGHT = {
  mode: "light",
  bg: "#f8f8f6",
  bgCard: "#ffffff",
  bgHover: "#f0efed",
  bgInput: "#f5f4f2",
  bgSidebar: "#ffffff",
  lime: "#16a34a", // green-600 for accessibility on white
  limeDim: "rgba(22,163,74,0.08)",
  limeBorder: "rgba(22,163,74,0.20)",
  green: "#16a34a",
  amber: "#d97706",
  red: "#dc2626",
  blue: "#2563eb",
  purple: "#7c3aed",
  cyan: "#0891b2",
  teal: "#0d9488",
  orange: "#ea580c",
  pink: "#db2777",
  white: "#1c1917", // inverted for text
  text: "#57534e",
  textStrong: "#1c1917",
  dim: "#a8a29e",
  border: "rgba(0,0,0,0.08)",
  borderLight: "rgba(0,0,0,0.12)",
  chartGrid: "rgba(0,0,0,0.06)",
  tooltipBg: "#ffffff",
  tooltipBorder: "rgba(0,0,0,0.10)",
  scrollTrack: "#f8f8f6",
  scrollThumb: "#d6d3d1",
  pillBgAlpha: "12",
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState("dark");
  const theme = mode === "dark" ? DARK : LIGHT;
  const toggle = useCallback(() => setMode(m => m === "dark" ? "light" : "dark"), []);
  return (
    <ThemeContext.Provider value={{ theme, mode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Helper: get pill background with theme-appropriate alpha
export function pillBg(color, theme) {
  return `${color}${theme.pillBgAlpha}`;
}
