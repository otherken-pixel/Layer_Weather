import React from "react";
import type { CurrentWeather, DailyForecast } from "@/types";
import { CONDITION_LABEL, isLightBackground } from "@/constants/colors";

const CONDITION_EMOJI: Record<string, string> = {
  clear: "☀️", partly_cloudy: "⛅", cloudy: "☁️", foggy: "🌫️",
  drizzle: "🌦️", rain: "🌧️", heavy_rain: "🌧️", snow: "❄️", thunderstorm: "⛈️",
};

function toUnit(f: number, unit: "F" | "C") {
  return unit === "C" ? Math.round(((f - 32) * 5) / 9) : Math.round(f);
}

interface Props {
  weather: CurrentWeather;
  today: DailyForecast | null;
  tempUnit: "F" | "C";
  onRefresh: () => void;
}

export function SkyHeader({ weather, today, tempUnit, onRefresh }: Props) {
  const temp = toUnit(weather.temp, tempUnit);
  const hiTemp = today ? toUnit(today.tempMax, tempUnit) : null;
  const loTemp = today ? toUnit(today.tempMin, tempUnit) : null;
  const lightBg = isLightBackground(weather.condition, weather.isDay);
  const primaryText = lightBg ? "#111827" : "#FFFFFF";
  const secondaryText = lightBg ? "rgba(17,24,39,0.85)" : "rgba(255,255,255,0.9)";
  const mutedText = lightBg ? "rgba(17,24,39,0.7)" : "rgba(255,255,255,0.7)";
  const locationLabel = weather.location || "Your Location";

  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 44px)",
        paddingBottom: 16,
        paddingLeft: 24,
        paddingRight: 24,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        maxWidth: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          maxWidth: "100%",
          width: "100%",
          justifyContent: "center",
        }}
      >
        <span
          className="truncate max-w-[calc(100%-52px)]"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: secondaryText,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
          title={locationLabel}
        >
          {locationLabel}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="flex-shrink-0 inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full"
          style={{
            background: lightBg ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.2)",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
          }}
          aria-label="Refresh weather"
        >
          🔄
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10 }}>
        <span
          style={{
            fontSize: "clamp(48px, 18vw, 72px)",
            lineHeight: 1,
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.2))",
          }}
        >
          {CONDITION_EMOJI[weather.condition] ?? "🌤️"}
        </span>
        <span
          style={{
            fontSize: "clamp(64px, 24vw, 96px)",
            fontWeight: 700,
            color: primaryText,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            textShadow: lightBg ? "none" : "0 2px 16px rgba(0,0,0,0.15)",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
          }}
        >
          {temp}°
        </span>
      </div>

      <span style={{ fontSize: 17, fontWeight: 400, color: secondaryText, letterSpacing: "0.02em", marginTop: 4 }}>
        {CONDITION_LABEL[weather.condition]}
      </span>

      {hiTemp !== null && loTemp !== null && (
        <span style={{ fontSize: 13, color: mutedText, fontWeight: 400, marginTop: 2 }}>
          H: {hiTemp}° · L: {loTemp}°
        </span>
      )}
    </div>
  );
}
