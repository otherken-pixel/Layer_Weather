import React from "react";
import { Card } from "@/components/ui/Card";
import type { CurrentWeather } from "@/types";

function toUnit(f: number, unit: "F" | "C") {
  return unit === "C" ? Math.round(((f - 32) * 5) / 9) : Math.round(f);
}

interface Props {
  weather: CurrentWeather;
  tempUnit: "F" | "C";
  hiTemp?: number;
  loTemp?: number;
}

export function WeatherWidget({ weather, tempUnit, hiTemp, loTemp }: Props) {
  const feelsLike = toUnit(weather.feelsLike, tempUnit);
  const hi = hiTemp !== undefined ? toUnit(hiTemp, tempUnit) : null;
  const lo = loTemp !== undefined ? toUnit(loTemp, tempUnit) : null;

  return (
    <Card mode="weather">
      <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
        Conditions
      </p>

      {/* Feels-like row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 48, fontWeight: 700, color: "#111827", letterSpacing: "-2px", lineHeight: 1 }}>
            {feelsLike}°
          </span>
          <p style={{ fontSize: 13, color: "#6B7280", marginTop: 3 }}>Feels like · {tempUnit === "F" ? "°F" : "°C"}</p>
        </div>
        {hi !== null && lo !== null && (
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#111827", lineHeight: 1 }}>{hi}°</p>
            <p style={{ fontSize: 14, color: "#9CA3AF", fontWeight: 500 }}>/ {lo}°</p>
            <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>Hi / Lo</p>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <StatCell label="Humidity" value={`${weather.humidity}%`} fill={weather.humidity / 100} fillColor="#3B82F6" />
        <StatCell label="Wind" value={`${weather.windSpeed}`} unit="mph" fill={Math.min(weather.windSpeed / 40, 1)} fillColor="#10B981" />
        <StatCell label="Rain" value={`${weather.precipProb}%`} fill={weather.precipProb / 100} fillColor="#6366F1" />
      </div>
    </Card>
  );
}

function StatCell({ label, value, unit, fill, fillColor }: {
  label: string;
  value: string;
  unit?: string;
  fill: number;
  fillColor: string;
}) {
  return (
    <div style={{ background: "#F9FAFB", borderRadius: 14, padding: "12px 10px" }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 700, color: "#111827", lineHeight: 1 }}>
        {value}
        {unit && <span style={{ fontSize: 11, fontWeight: 500, color: "#6B7280", marginLeft: 2 }}>{unit}</span>}
      </p>
      <div style={{ height: 4, background: "#E5E7EB", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.round(fill * 100)}%`, background: fillColor, borderRadius: 2 }} />
      </div>
    </div>
  );
}
