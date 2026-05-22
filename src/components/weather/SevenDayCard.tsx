import React from "react";
import { format } from "date-fns";
import type { DailyForecast } from "@/types";

const EMOJI: Record<string, string> = {
  clear: "☀️", partly_cloudy: "⛅", cloudy: "☁️", foggy: "🌫️",
  drizzle: "🌦️", rain: "🌧️", heavy_rain: "🌧️", snow: "❄️", thunderstorm: "⛈️",
};

function toUnit(f: number, unit: "F" | "C") {
  return unit === "C" ? Math.round(((f - 32) * 5) / 9) : Math.round(f);
}

interface Props {
  daily: DailyForecast[];
  tempUnit: "F" | "C";
}

export function SevenDayCard({ daily, tempUnit }: Props) {
  // Determine the overall temperature range for proportional bar widths
  const allMin = Math.min(...daily.map((d) => toUnit(d.tempMin, tempUnit)));
  const allMax = Math.max(...daily.map((d) => toUnit(d.tempMax, tempUnit)));
  const range = allMax - allMin || 1;

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 24,
        padding: "20px",
        boxShadow: "0 2px 20px rgba(0,0,0,0.07)",
      }}
    >
      <p
        style={{
          fontSize: 11, fontWeight: 700, color: "#9CA3AF",
          letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14,
        }}
      >
        7-Day Forecast
      </p>

      {daily.slice(0, 7).map((day, i) => {
        const lo = toUnit(day.tempMin, tempUnit);
        const hi = toUnit(day.tempMax, tempUnit);
        // Bar: offset from left based on lo, width based on hi-lo
        const barLeft = ((lo - allMin) / range) * 100;
        const barWidth = Math.max(((hi - lo) / range) * 100, 8);
        const highPrecip = day.precipProb >= 50;

        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              paddingTop: 10,
              paddingBottom: 10,
              borderBottom: i < daily.slice(0, 7).length - 1 ? "1px solid #F3F4F6" : "none",
            }}
          >
            {/* Day name */}
            <span
              style={{
                fontSize: 14, fontWeight: 600, color: "#374151",
                width: 44, flexShrink: 0,
              }}
            >
              {i === 0 ? "Today" : format(day.date, "EEE")}
            </span>

            {/* Weather icon */}
            <span style={{ fontSize: 20, width: 28, flexShrink: 0 }}>
              {EMOJI[day.condition] ?? "🌤️"}
            </span>

            {/* Precip % */}
            <span
              style={{
                fontSize: 11, fontWeight: 600,
                color: highPrecip ? "#6366F1" : "#3B82F6",
                width: 34, textAlign: "right", flexShrink: 0,
                opacity: day.precipProb > 10 ? 1 : 0,
              }}
            >
              {day.precipProb}%
            </span>

            {/* Temperature range bar */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
              <span style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 500, width: 30, textAlign: "right" }}>
                {lo}°
              </span>
              <div style={{ flex: 1, height: 5, background: "#E5E7EB", borderRadius: 3, overflow: "hidden", position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: `${barLeft}%`,
                    width: `${barWidth}%`,
                    height: "100%",
                    borderRadius: 3,
                    background: "linear-gradient(90deg, #3B82F6, #F97316)",
                  }}
                />
              </div>
              <span style={{ fontSize: 14, color: "#111827", fontWeight: 700, width: 30 }}>
                {hi}°
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
