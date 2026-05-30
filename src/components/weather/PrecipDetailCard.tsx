import React from "react";
import type { WeatherCondition } from "@/types";

interface ChartPoint {
  timeMs: number;
  precipProb: number;
  precipAmount?: number;
  condition: WeatherCondition;
}

interface Props {
  chartData: ChartPoint[];
  isDark: boolean;
}

function conditionIcon(condition: WeatherCondition, isDark: boolean): string {
  if (condition === "thunderstorm") return "⛈️";
  if (condition === "heavy_rain") return "🌧️";
  if (condition === "rain") return "🌦️";
  if (condition === "drizzle") return "🌦️";
  if (condition === "snow") return "❄️";
  return isDark ? "🌧️" : "🌧️";
}

export function PrecipDetailCard({ chartData, isDark }: Props) {
  // Group into 3-hour blocks
  const blocks = chartData.filter((_, i) => i % 3 === 0);
  const hasAnyRain = blocks.some((b) => b.precipProb > 5 || (b.precipAmount ?? 0) > 0);

  const cardBg = isDark ? "#1C1C1E" : "#FFFFFF";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : undefined;
  const cardShadow = isDark ? "0 2px 20px rgba(0,0,0,0.25)" : "0 2px 20px rgba(0,0,0,0.07)";
  const labelColor = isDark ? "#9BA4B4" : "#6B7280";
  const textPrimary = isDark ? "#F4F4F5" : "#111827";
  const barBg = isDark ? "#2C2C2E" : "#F3F4F6";
  const barFill = "#3B82F6";

  const hasPrecipAmount = blocks.some((b) => b.precipAmount != null);

  return (
    <div style={{ background: cardBg, borderRadius: 20, padding: "14px 16px", boxShadow: cardShadow, border: cardBorder }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: labelColor, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
        Precipitation Detail
      </p>

      {!hasAnyRain ? (
        <p style={{ fontSize: 14, color: labelColor, textAlign: "center", padding: "8px 0" }}>
          No rain expected in the next 48 hours
        </p>
      ) : (
        <div className="no-scrollbar" style={{ display: "flex", gap: 10, overflowX: "auto" }}>
          {blocks.map((b) => {
            const d = new Date(b.timeMs);
            const h = d.getHours();
            const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
            const ampm = h < 12 ? "a" : "p";
            const timeLabel = `${h12}${ampm}`;
            const isRainy = b.precipProb > 10 || (b.precipAmount ?? 0) > 0;

            return (
              <div key={b.timeMs} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 52 }}>
                {/* Probability bar */}
                <div style={{ width: 36, height: 60, background: barBg, borderRadius: 4, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <div style={{
                    width: "100%",
                    height: `${b.precipProb}%`,
                    background: barFill,
                    opacity: 0.7,
                    borderRadius: "3px 3px 0 0",
                    transition: "height 0.3s ease",
                  }} />
                </div>
                {/* Prob % */}
                <span style={{ fontSize: 11, fontWeight: 700, color: b.precipProb > 30 ? barFill : labelColor }}>
                  {b.precipProb}%
                </span>
                {/* Amount */}
                {hasPrecipAmount && (
                  <span style={{ fontSize: 10, color: isRainy && (b.precipAmount ?? 0) > 0 ? textPrimary : labelColor }}>
                    {b.precipAmount != null && b.precipAmount > 0 ? `${b.precipAmount}"` : "—"}
                  </span>
                )}
                {/* Condition icon */}
                <span style={{ fontSize: 14 }}>{isRainy ? conditionIcon(b.condition, isDark) : "·"}</span>
                {/* Time */}
                <span style={{ fontSize: 10, color: labelColor }}>{timeLabel}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
