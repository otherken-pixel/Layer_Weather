import React from "react";
import type { SolarData } from "@/types";

function solarRating(avgDailyHours: number | null): { label: string; color: string } {
  if (avgDailyHours == null) return { label: "Unknown", color: "#9CA3AF" };
  if (avgDailyHours >= 6.0) return { label: "Excellent", color: "#22C55E" };
  if (avgDailyHours >= 4.5) return { label: "Good", color: "#84CC16" };
  if (avgDailyHours >= 3.5) return { label: "Moderate", color: "#EAB308" };
  return { label: "Low", color: "#F97316" };
}

function solarFill(avgDailyHours: number | null): number {
  if (avgDailyHours == null) return 0;
  // Scale: 0 hrs → 0%, 8 hrs → 100%
  return Math.min(avgDailyHours / 8, 1);
}

interface Props {
  data: SolarData;
  isDark?: boolean;
}

export function SolarCard({ data, isDark = false }: Props) {
  const cardBg = isDark ? "#2C2C2E" : "#FFFFFF";
  const labelColor = isDark ? "#9BA4B4" : "#4B5563";
  const textPrimary = isDark ? "#F4F4F5" : "#111827";
  const trackColor = isDark ? "#52525B" : "#E5E7EB";
  const border = isDark ? "1px solid rgba(255,255,255,0.08)" : undefined;
  const divider = isDark ? "rgba(255,255,255,0.07)" : "#F3F4F6";

  const { label: ratingLabel, color: ratingColor } = solarRating(data.avgDailyPeakSunHours);
  const fill = solarFill(data.avgDailyPeakSunHours);

  const imageryDateStr = data.imageryDate
    ? `${data.imageryDate.year}-${String(data.imageryDate.month).padStart(2, "0")}-${String(data.imageryDate.day).padStart(2, "0")}`
    : null;

  return (
    <div
      style={{
        background: cardBg,
        borderRadius: 24,
        padding: "20px",
        boxShadow: isDark ? "0 2px 20px rgba(0,0,0,0.25)" : "0 2px 20px rgba(0,0,0,0.07)",
        border,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{
          fontSize: 14, fontWeight: 700, letterSpacing: "0.08em",
          textTransform: "uppercase", color: labelColor, margin: 0,
        }}>
          Solar Potential
        </p>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: `${ratingColor}22`,
          borderRadius: 20, padding: "4px 12px",
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: ratingColor }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: ratingColor }}>
            {ratingLabel}
          </span>
        </div>
      </div>

      {/* Peak sun hours bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: textPrimary }}>
            Avg. Daily Peak Sun
          </span>
          <span style={{ fontSize: 22, fontWeight: 800, color: ratingColor, letterSpacing: "-0.5px" }}>
            {data.avgDailyPeakSunHours != null ? `${data.avgDailyPeakSunHours.toFixed(1)} hrs` : "—"}
          </span>
        </div>
        <div style={{ height: 6, background: trackColor, borderRadius: 3, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${Math.round(fill * 100)}%`,
              background: `linear-gradient(90deg, ${ratingColor}99, ${ratingColor})`,
              borderRadius: 3,
              transition: "width 0.4s ease",
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 10, color: labelColor }}>0 hrs</span>
          <span style={{ fontSize: 10, color: labelColor }}>8 hrs</span>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 10, marginBottom: 14,
      }}>
        <div style={{
          background: isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB",
          borderRadius: 14, padding: "12px 14px",
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: labelColor, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px 0" }}>
            Annual Sunshine
          </p>
          <p style={{ fontSize: 18, fontWeight: 800, color: textPrimary, margin: 0, letterSpacing: "-0.5px" }}>
            {data.maxSunshineHoursPerYear.toLocaleString()}
            <span style={{ fontSize: 12, fontWeight: 500, color: labelColor, marginLeft: 3 }}>hrs/yr</span>
          </p>
        </div>

        {data.carbonOffsetFactorKgPerMwh != null && (
          <div style={{
            background: isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB",
            borderRadius: 14, padding: "12px 14px",
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: labelColor, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px 0" }}>
              Grid Carbon
            </p>
            <p style={{ fontSize: 18, fontWeight: 800, color: textPrimary, margin: 0, letterSpacing: "-0.5px" }}>
              {Math.round(data.carbonOffsetFactorKgPerMwh).toLocaleString()}
              <span style={{ fontSize: 10, fontWeight: 500, color: labelColor, marginLeft: 3 }}>kg/MWh</span>
            </p>
          </div>
        )}
      </div>

      {/* US average comparison */}
      {data.avgDailyPeakSunHours != null && (
        <div style={{
          borderTop: `1px solid ${divider}`,
          paddingTop: 12, marginBottom: 4,
        }}>
          <p style={{ fontSize: 12, color: labelColor, margin: 0 }}>
            {data.avgDailyPeakSunHours >= 5.0
              ? "☀️ Above the US average of 4–5 peak sun hours/day"
              : data.avgDailyPeakSunHours >= 4.0
                ? "⚡ Near the US average of 4–5 peak sun hours/day"
                : "🌥️ Below the US average of 4–5 peak sun hours/day"}
          </p>
        </div>
      )}

      <p style={{ fontSize: 11, color: labelColor, marginTop: 10, marginBottom: 0 }}>
        Source: Google Solar API
        {imageryDateStr ? ` · Imagery ${imageryDateStr}` : ""}
      </p>
    </div>
  );
}

export function SolarUnavailableCard({ isDark = false }: { isDark?: boolean }) {
  const cardBg = isDark ? "#2C2C2E" : "#FFFFFF";
  const labelColor = isDark ? "#9BA4B4" : "#4B5563";
  const border = isDark ? "1px solid rgba(255,255,255,0.08)" : undefined;
  return (
    <div style={{
      background: cardBg, borderRadius: 24, padding: "20px",
      boxShadow: isDark ? "0 2px 20px rgba(0,0,0,0.25)" : "0 2px 20px rgba(0,0,0,0.07)",
      border,
    }}>
      <p style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: labelColor, margin: "0 0 8px 0" }}>
        Solar Potential
      </p>
      <p style={{ fontSize: 14, color: labelColor, margin: 0 }}>
        Solar data is not available for this location.
      </p>
    </div>
  );
}
