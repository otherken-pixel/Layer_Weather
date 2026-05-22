import type { WeatherCondition } from "@/types";

// ── Brand palette ─────────────────────────────────────────────────────────────
export const Colors = {
  brand: {
    primary: "#6C63FF",
    light: "#9D97FF",
    dark: "#4A3FDB",
    surface: "rgba(108, 99, 255, 0.12)",
  },
  text: {
    primary: "#1A1A2E",
    secondary: "#4A5568",
    muted: "#A0AEC0",
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
  rain_heavy: {
    top: "#F7FAFC",
    topShadow: "#E2E8F0",
    jacket: "#1A365D",
    jacketShadow: "#153e75",
    bottom: "#1A202C",
    bottomShadow: "#000",
    label: "Stormy Weather",
  },
} as const;
