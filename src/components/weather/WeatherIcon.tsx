import React from "react";

const EMOJI: Record<string, string> = {
  clear: "☀️",
  partly_cloudy: "⛅",
  cloudy: "☁️",
  foggy: "🌫️",
  drizzle: "🌦️",
  rain: "🌧️",
  heavy_rain: "🌧️",
  snow: "❄️",
  thunderstorm: "⛈️",
};

const BADGE_BG_LIGHT: Record<string, string> = {
  clear: "#FEF3C7",
  partly_cloudy: "#DBEAFE",
  cloudy: "#E5E7EB",
  foggy: "#F3F4F6",
  drizzle: "#CCFBF1",
  rain: "#BFDBFE",
  heavy_rain: "#93C5FD",
  snow: "#E0F2FE",
  thunderstorm: "#EDE9FE",
};

const BADGE_BG_DARK: Record<string, string> = {
  clear: "rgba(253,230,138,0.22)",
  partly_cloudy: "rgba(147,197,253,0.22)",
  cloudy: "rgba(156,163,175,0.18)",
  foggy: "rgba(209,213,219,0.15)",
  drizzle: "rgba(94,234,212,0.22)",
  rain: "rgba(96,165,250,0.28)",
  heavy_rain: "rgba(96,165,250,0.38)",
  snow: "rgba(186,230,253,0.22)",
  thunderstorm: "rgba(167,139,250,0.28)",
};

const SIZE_MAP = {
  sm: { container: 28, emoji: 15 },
  md: { container: 34, emoji: 18 },
  lg: { container: 40, emoji: 22 },
};

interface WeatherIconProps {
  condition: string;
  size?: "sm" | "md" | "lg";
  isDark?: boolean;
  /** Skip the badge when the parent already provides a high-contrast background */
  plain?: boolean;
}

export function WeatherIcon({ condition, size = "md", isDark = false, plain = false }: WeatherIconProps) {
  const emoji = EMOJI[condition] ?? "🌤️";
  const { container, emoji: emojiSize } = SIZE_MAP[size];

  if (plain) {
    return <span style={{ fontSize: emojiSize }}>{emoji}</span>;
  }

  const bg = isDark
    ? (BADGE_BG_DARK[condition] ?? "rgba(156,163,175,0.18)")
    : (BADGE_BG_LIGHT[condition] ?? "#E5E7EB");

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: container,
        height: container,
        borderRadius: "50%",
        background: bg,
        flexShrink: 0,
        fontSize: emojiSize,
        lineHeight: 1,
      }}
    >
      {emoji}
    </span>
  );
}
