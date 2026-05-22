import React from "react";
import type { CurrentWeather } from "@/types";
import { getHairForecast } from "@/lib/hair-forecast";

function toUnit(f: number, unit: "F" | "C") {
  return unit === "C" ? Math.round(((f - 32) * 5) / 9) : Math.round(f);
}

function comfortLabel(feelsLikeF: number): string {
  if (feelsLikeF >= 80) return "Warm & humid";
  if (feelsLikeF >= 70) return "Warm & pleasant";
  if (feelsLikeF >= 60) return "Comfortable";
  if (feelsLikeF >= 50) return "Cool";
  if (feelsLikeF >= 40) return "Cold";
  if (feelsLikeF >= 30) return "Very cold";
  return "Dangerously cold";
}

function uvLabel(uv: number): string {
  if (uv <= 2) return "lo";
  if (uv <= 5) return "mod";
  if (uv <= 7) return "hi";
  if (uv <= 10) return "v.hi";
  return "ext";
}

interface Props {
  weather: CurrentWeather;
  tempUnit: "F" | "C";
  onUnitChange: (unit: "F" | "C") => void;
}

export function WeatherWidget({ weather, tempUnit, onUnitChange }: Props) {
  const hairForecast = getHairForecast(weather);

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
        Current Conditions
      </p>

      {/* Hair forecast row with unit toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#111827", lineHeight: 1.15 }}>
            {hairForecast.shortTitle}
          </div>
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 3 }}>
            {hairForecast.actionableAdvice}
          </div>
        </div>

        {/* °F / °C pill toggle */}
        <div
          style={{
            display: "flex", background: "#F3F4F6",
            borderRadius: 999, padding: 3, gap: 2,
          }}
        >
          {(["F", "C"] as const).map((u) => (
            <button
              key={u}
              onClick={() => onUnitChange(u)}
              style={{
                padding: "6px 16px", borderRadius: 999,
                fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                background: tempUnit === u ? "#7C3AED" : "transparent",
                color: tempUnit === u ? "white" : "#9CA3AF",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              °{u}
            </button>
          ))}
        </div>
      </div>

      {/* 2×2 stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <StatCell
          label="Humidity"
          value={`${weather.humidity}`}
          unit="%"
          fill={weather.humidity / 100}
          fillColor="#3B82F6"
        />
        <StatCell
          label="Wind"
          value={`${weather.windSpeed}`}
          unit="mph"
          fill={Math.min(weather.windSpeed / 40, 1)}
          fillColor="#10B981"
        />
        <StatCell
          label="Rain Chance"
          value={`${weather.precipProb}`}
          unit="%"
          fill={weather.precipProb / 100}
          fillColor="#6366F1"
        />
        <StatCell
          label="UV Index"
          value={`${weather.uvIndex}`}
          unit={uvLabel(weather.uvIndex)}
          fill={Math.min(weather.uvIndex / 11, 1)}
          fillColor="#F59E0B"
        />
      </div>
    </div>
  );
}

function StatCell({
  label, value, unit, fill, fillColor,
}: {
  label: string; value: string; unit: string; fill: number; fillColor: string;
}) {
  return (
    <div style={{ background: "#F9FAFB", borderRadius: 16, padding: "12px 14px" }}>
      <p
        style={{
          fontSize: 11, fontWeight: 600, color: "#9CA3AF",
          textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4,
        }}
      >
        {label}
      </p>
      <p style={{ fontSize: 22, fontWeight: 700, color: "#111827", lineHeight: 1 }}>
        {value}
        <span style={{ fontSize: 12, fontWeight: 500, color: "#6B7280", marginLeft: 2 }}>
          {unit}
        </span>
      </p>
      <div style={{ height: 4, background: "#E5E7EB", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${Math.round(fill * 100)}%`,
            background: fillColor,
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
}
