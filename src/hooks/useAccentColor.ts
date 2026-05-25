// Thin wrapper that returns CSS variable strings so components stay in sync
// with the theme engine (useAccentTheme / applyAccentPalette) automatically.
export function useAccentColor() {
  return {
    accent: "var(--accent-text)",
    accentSolid: "var(--accent-primary)",
    accentSurface: "var(--accent-surface)",
    accentGradient: "linear-gradient(135deg, var(--accent-primary), var(--accent-dark))",
  };
}
