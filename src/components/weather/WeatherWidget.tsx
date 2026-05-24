import React from "react";
import type { CurrentWeather } from "@/types";
import { getHairForecast } from "@/lib/hair-forecast";

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
  isDark?: boolean;
}

export function WeatherWidget({ weather, tempUnit, onUnitChange, isDark = false }: Props) {
  const hairForecast = getHairForecast(weather, { tempUnit });

  // Opacity-based text replaced with explicit hex for reliable contrast (AA ✓)
  const labelColor = isDark ? "#9BA4B4" : "#6B7280";
  const primaryTextColor = isDark ? "#F4F4F5" : "#111827";
  const secondaryTextColor = isDark ? "#9BA4B4" : "#6B7280";
  const pillBg = isDark ? "#3A3A3C" : "#F3F4F6";
  const pillInactiveText = isDark ? "#D1D5DB" : "#4B5563";

  return (
    <div
      style={{
        background: isDark ? "#2C2C2E" : "#FFFFFF",
        borderRadius: 24,
        padding: "20px",
        boxShadow: isDark ? "0 2px 20px rgba(0,0,0,0.25)" : "0 2px 20px rgba(0,0,0,0.07)",
        border: isDark ? "1px solid rgba(255,255,255,0.08)" : undefined,
      }}
    >
      <p
        style={{
          fontSize: 12, fontWeight: 700,
          color: labelColor,
          letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14,
        }}
      >
        Current Conditions
      </p>

      {/* Hair forecast row with unit toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: primaryTextColor, lineHeight: 1.15 }}>
            {hairForecast.shortTitle}
          </div>
          <div style={{ fontSize: 13, color: secondaryTextColor, marginTop: 3 }}>
            {hairForecast.actionableAdvice}
          </div>
        </div>

        {/* °F / °C pill toggle */}
        <div
          className="flex rounded-full p-1 gap-0.5"
          style={{ background: pillBg }}
        >
          {(["F", "C"] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => onUnitChange(u)}
              aria-pressed={tempUnit === u}
              className="min-w-[44px] min-h-[44px] px-4 rounded-full text-sm font-semibold border-0 cursor-pointer transition-colors"
              style={{
                background: tempUnit === u ? "#4A3FDB" : "transparent",
                color: tempUnit === u ? "#FFFFFF" : pillInactiveText,
              }}
            >
              °{u}
            </button>
          ))}
        </div>
      </div>

      {/* 2×2 stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <StatCell isDark={isDark} label="Humidity" value={`${weather.humidity}`} unit="%" fill={weather.humidity / 100} fillColor="#3B82F6" />
        <StatCell isDark={isDark} label="Wind" value={`${weather.windSpeed}`} unit="mph" fill={Math.min(weather.windSpeed / 40, 1)} fillColor="#10B981" />
        <StatCell isDark={isDark} label="Rain Chance" value={`${weather.precipProb}`} unit="%" fill={weather.precipProb / 100} fillColor="#6366F1" />
        <StatCell isDark={isDark} label="UV Index" value={`${weather.uvIndex}`} unit={uvLabel(weather.uvIndex)} fill={Math.min(weather.uvIndex / 11, 1)} fillColor="#F59E0B" />
      </div>
    </div>
  );
}

function StatCell({
  label, value, unit, fill, fillColor, isDark,
}: {
  label: string; value: string; unit: string; fill: number; fillColor: string; isDark: boolean;
}) {
  // Opacity-based colors replaced with explicit hex (AA ✓)
  const cellBg = isDark ? "#3A3A3C" : "#F9FAFB";
  const cellLabelColor = isDark ? "#9BA4B4" : "#6B7280";
  const cellValueColor = isDark ? "#F4F4F5" : "#111827";
  const cellUnitColor = isDark ? "#9BA4B4" : "#6B7280";
  const trackColor = isDark ? "#52525B" : "#E5E7EB";

  return (
    <div style={{ background: cellBg, borderRadius: 16, padding: "12px 14px" }}>
      <p
        style={{
          fontSize: 11, fontWeight: 600,
          color: cellLabelColor,
          textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4,
        }}
      >
        {label}
      </p>
      <p style={{ fontSize: 22, fontWeight: 700, color: cellValueColor, lineHeight: 1 }}>
        {value}
        <span style={{ fontSize: 12, fontWeight: 500, color: cellUnitColor, marginLeft: 2 }}>
          {unit}
        </span>
      </p>
      <div style={{ height: 4, background: trackColor, borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
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
