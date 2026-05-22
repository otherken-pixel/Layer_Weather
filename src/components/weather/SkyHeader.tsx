import React from "react";
import type { CurrentWeather, DailyForecast } from "@/types";
import { CONDITION_LABEL } from "@/constants/colors";

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

  return (
    <div
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 44px)",
        paddingBottom: "16px",
        paddingLeft: "24px",
        paddingRight: "24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "2px",
      }}
    >
      {/* Location + refresh */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{
          fontSize: "13px", fontWeight: 500,
          color: "rgba(255,255,255,0.85)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}>
          {weather.location || "Your Location"}
        </span>
        <button
          onClick={onRefresh}
          style={{
            background: "rgba(255,255,255,0.2)", border: "none",
            borderRadius: "50%", width: 26, height: 26,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: "12px",
          }}
          aria-label="Refresh weather"
        >
          🔄
        </button>
      </div>

      {/* Icon + Temperature */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "10px" }}>
        <span style={{ fontSize: "72px", lineHeight: 1, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.2))" }}>
          {CONDITION_EMOJI[weather.condition] ?? "🌤️"}
        </span>
        <span style={{
          fontSize: "96px", fontWeight: 700,
          color: "white", lineHeight: 1,
          letterSpacing: "-4px",
          textShadow: "0 2px 16px rgba(0,0,0,0.15)",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
        }}>
          {temp}°
        </span>
      </div>

      {/* Condition label */}
      <span style={{ fontSize: "17px", fontWeight: 400, color: "rgba(255,255,255,0.9)", letterSpacing: "0.02em", marginTop: "4px" }}>
        {CONDITION_LABEL[weather.condition]}
      </span>

      {/* Hi / Lo */}
      {hiTemp !== null && loTemp !== null && (
        <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)", fontWeight: 400, marginTop: "2px" }}>
          H: {hiTemp}°  ·  L: {loTemp}°
        </span>
      )}
    </div>
  );
}
