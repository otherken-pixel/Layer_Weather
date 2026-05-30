import React from "react";
import type { HourlyAqiPoint } from "@/types";

interface Props {
  hourlyAqi: HourlyAqiPoint[] | null;
  currentAqi: number | null;
  isDark: boolean;
}

function aqiColor(aqi: number): string {
  if (aqi <= 50) return "#22C55E";
  if (aqi <= 100) return "#EAB308";
  if (aqi <= 150) return "#F97316";
  if (aqi <= 200) return "#EF4444";
  if (aqi <= 300) return "#8B5CF6";
  return "#DC2626";
}

function aqiLabel(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Sensitive";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

export function HourlyAQICard({ hourlyAqi, currentAqi, isDark }: Props) {
  // Need at least current AQI or hourly data to render
  if (!hourlyAqi && currentAqi == null) return null;

  const cardBg = isDark ? "#1C1C1E" : "#FFFFFF";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : undefined;
  const cardShadow = isDark ? "0 2px 20px rgba(0,0,0,0.25)" : "0 2px 20px rgba(0,0,0,0.07)";
  const labelColor = isDark ? "#9BA4B4" : "#6B7280";
  const textPrimary = isDark ? "#F4F4F5" : "#111827";
  const circleBg = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";

  // Filter to next 48 hours, show every 3rd hour
  const points = hourlyAqi
    ? hourlyAqi.filter((_, i) => i % 3 === 0).slice(0, 16)
    : [];

  // Determine overall status from hourly or current
  const aqiValues = points.map((p) => p.aqi);
  const overallAqi = aqiValues.length > 0
    ? Math.round(aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length)
    : currentAqi ?? 0;

  return (
    <div style={{ background: cardBg, borderRadius: 20, padding: "14px 16px", boxShadow: cardShadow, border: cardBorder }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: labelColor, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Air Quality
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: aqiColor(overallAqi) }}>{overallAqi}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: aqiColor(overallAqi) }}>{aqiLabel(overallAqi)}</span>
        </div>
      </div>

      {points.length > 0 ? (
        <div className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
          {points.map((pt) => {
            const d = pt.time;
            const h = d.getHours();
            const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
            const ampm = h < 12 ? "a" : "p";
            const color = aqiColor(pt.aqi);
            return (
              <div key={pt.time.getTime()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 44 }}>
                {/* Colored circle with AQI */}
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: circleBg,
                  border: `2px solid ${color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color }}>{pt.aqi}</span>
                </div>
                {/* AQI label abbreviated */}
                <span style={{ fontSize: 9, color: labelColor, fontWeight: 600, textAlign: "center", lineHeight: 1.2 }}>
                  {aqiLabel(pt.aqi)}
                </span>
                {/* Time */}
                <span style={{ fontSize: 10, color: labelColor }}>{`${h12}${ampm}`}</span>
              </div>
            );
          })}
        </div>
      ) : currentAqi != null ? (
        // Fallback: show current AQI as a single reading
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            border: `3px solid ${aqiColor(currentAqi)}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: aqiColor(currentAqi) }}>{currentAqi}</span>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>{aqiLabel(currentAqi)}</p>
            <p style={{ fontSize: 12, color: labelColor }}>Current US AQI</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
