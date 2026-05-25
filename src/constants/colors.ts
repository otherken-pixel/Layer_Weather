import type { WeatherCondition } from "@/types";

// ── Solid sky color per condition (CARROT-style) ──────────────────────────────
export function getSkyColor(condition: WeatherCondition, isDay: boolean): string {
  if (!isDay) {
    if (condition === "thunderstorm") return "#1a0d2e";
    if (condition === "rain" || condition === "heavy_rain") return "#1a1f35";
    return "#1a1a2e";
  }
  const map: Record<WeatherCondition, string> = {
    clear: "#3A8EE6",
    partly_cloudy: "#5B9BD5",
    cloudy: "#7B8FA1",
    foggy: "#8D9EAB",
    drizzle: "#5A7A9A",
    rain: "#4A5E78",
    heavy_rain: "#2E3F58",
    snow: "#9BBDD4",
    thunderstorm: "#2E2550",
  };
  return map[condition] ?? "#3A8EE6";
}

export const CONDITION_LABEL: Record<WeatherCondition, string> = {
  clear: "Clear Sky",
  partly_cloudy: "Partly Cloudy",
  cloudy: "Overcast",
  foggy: "Foggy",
  drizzle: "Light Drizzle",
  rain: "Rainy",
  heavy_rain: "Heavy Rain",
  snow: "Snowing",
  thunderstorm: "Thunderstorm",
};

// ── Brand palette ─────────────────────────────────────────────────────────────
export const Colors = {
  brand: {
    primary: "#6C63FF",
    light: "#9D97FF",
    dark: "#4A3FDB",
    // Safe to use as text on white — 5.8:1 contrast (AA ✓)
    textSafe: "#4A3FDB",
    surface: "rgba(108, 99, 255, 0.12)",
  },
  text: {
    primary: "#1A1A2E",
    secondary: "#4A5568",
    // 4.87:1 on white (AA ✓) — darkened from #A0AEC0 which was 3.7:1
    muted: "#6B7280",
    // For section labels on gray (#F2F2F7) bg — 6.76:1 (AA ✓)
    mutedLabel: "#4B5563",
    inverse: "#FFFFFF",
    inverseSecondary: "rgba(255,255,255,0.75)",
  },
  surface: {
    white: "#FFFFFF",
    card: "rgba(255,255,255,0.18)",
    cardBorder: "rgba(255,255,255,0.30)",
    overlay: "rgba(0,0,0,0.25)",
  },
  semantic: {
    warning: "#FF9500",
    error: "#FF3B30",
    success: "#34C759",
    info: "#007AFF",
  },
  // Dark mode surface + text tokens
  dark: {
    pageBg: "#1C1C1E",
    cardBg: "#2C2C2E",
    cellBg: "#3A3A3C",
    textPrimary: "#F4F4F5",
    textSecondary: "#D1D5DB",
    // 5.0:1 on #2C2C2E (AA ✓)
    textMuted: "#9BA4B4",
    border: "rgba(255,255,255,0.08)",
    divider: "rgba(255,255,255,0.06)",
  },
} as const;

// ── Skin tones for avatar ─────────────────────────────────────────────────────
export const SkinTones = {
  light: { skin: "#FDBCB4", shadow: "#F0A898", hair: "#4A3728" },
  medium: { skin: "#D4956A", shadow: "#C07A50", hair: "#2D1B0E" },
  warm: { skin: "#C68642", shadow: "#A86930", hair: "#1A0A00" },
  dark: { skin: "#8D5524", shadow: "#6B3A10", hair: "#0A0000" },
} as const;

export const DEFAULT_SKIN = SkinTones.light;

// ── Weather → background gradients ───────────────────────────────────────────
export function getWeatherGradient(
  condition: WeatherCondition,
  isDay: boolean,
  hour: number
): [string, string] {
  if (!isDay) {
    if (condition === "rain" || condition === "heavy_rain") {
      return ["#1a1f35", "#0d1117"];
    }
    return ["#1a1a2e", "#16213e"];
  }

  const isMorning = hour >= 5 && hour < 10;
  const isEvening = hour >= 17 && hour < 21;

  switch (condition) {
    case "clear":
      if (isMorning) return ["#FF9A9E", "#FAD0C4"];
      if (isEvening) return ["#FA709A", "#FEE140"];
      return ["#43B0F1", "#0080C6"];

    case "partly_cloudy":
      if (isMorning) return ["#FCCB90", "#D57EEB"];
      if (isEvening) return ["#F7971E", "#FFD200"];
      return ["#89F7FE", "#66A6FF"];

    case "cloudy":
      return ["#BDC3C7", "#95A5A6"];

    case "foggy":
      return ["#C9D6DF", "#52616B"];

    case "drizzle":
      return ["#7F8FA4", "#536976"];

    case "rain":
    case "heavy_rain":
      return ["#4A5568", "#2D3748"];

    case "snow":
      return ["#E0F7FA", "#B2EBF2"];

    case "thunderstorm":
      return ["#37474F", "#263238"];

    default:
      return ["#43B0F1", "#0080C6"];
  }
}

// ── Light-background detection ────────────────────────────────────────────────
// Returns true for gradient conditions where white text/icons would have poor contrast
export function isLightBackground(
  condition: WeatherCondition,
  isDay: boolean,
): boolean {
  if (!isDay) return false;
  switch (condition) {
    case "clear":
    case "partly_cloudy":
    case "cloudy":
    case "foggy":
    case "snow":
      return true;
    default:
      return false;
  }
}

// ── Outfit colors ─────────────────────────────────────────────────────────────
export const OutfitColors = {
  shorts_tshirt: {
    top: "#FFFFFF",
    topShadow: "#E8E8E8",
    bottom: "#4A90E2",
    bottomShadow: "#357ABD",
    label: "Hot Day Vibes",
  },
  pants_shortsleeve: {
    top: "#FFFFFF",
    topShadow: "#E8E8E8",
    bottom: "#2D3748",
    bottomShadow: "#1A202C",
    label: "Easy Going",
  },
  pants_tshirt: {
    top: "#F0F4F8",
    topShadow: "#D9E2EC",
    bottom: "#2D3748",
    bottomShadow: "#1A202C",
    label: "Casual Comfort",
  },
  light_jacket: {
    top: "#EBF8FF",
    topShadow: "#BEE3F8",
    jacket: "#4299E1",
    jacketShadow: "#2B6CB0",
    bottom: "#2D3748",
    bottomShadow: "#1A202C",
    label: "Light Layer",
  },
  heavy_jacket: {
    top: "#F7FAFC",
    topShadow: "#E2E8F0",
    jacket: "#2D3748",
    jacketShadow: "#1A202C",
    bottom: "#1A202C",
    bottomShadow: "#000",
    label: "Bundle Up",
  },
  heavy_coat: {
    top: "#F7FAFC",
    topShadow: "#E2E8F0",
    jacket: "#744210",
    jacketShadow: "#5A3209",
    bottom: "#1A202C",
    bottomShadow: "#000",
    label: "Full Winter Mode",
  },
  rain_light: {
    top: "#EBF8FF",
    topShadow: "#BEE3F8",
    jacket: "#2B6CB0",
    jacketShadow: "#2C5282",
    bottom: "#2D3748",
    bottomShadow: "#1A202C",
    label: "Rain Ready",
  },
  rain_light_shorts: {
    top: "#EBF8FF",
    topShadow: "#BEE3F8",
    jacket: "#2B6CB0",
    jacketShadow: "#2C5282",
    bottom: "#CBD5E0",
    bottomShadow: "#A0AEC0",
    label: "Warm Rain",
  },
  rain_heavy: {
    top: "#F7FAFC",
    topShadow: "#E2E8F0",
    jacket: "#1A365D",
    jacketShadow: "#153e75",
    bottom: "#1A202C",
    bottomShadow: "#000",
    label: "Stormy Weather",
  },
  dress: {
    top: "#fee372",
    topShadow: "#eabe32",
    bottom: "#fee372",
    bottomShadow: "#eabe32",
    label: "Dress Weather",
  },
} as const;
