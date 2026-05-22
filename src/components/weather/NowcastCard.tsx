import React, { useMemo } from "react";
import type { NextHourPrecip } from "@/types";

interface Props {
  data: NextHourPrecip;
}

export function NowcastCard({ data }: Props) {
  const { minutes } = data;

  const maxIntensity = useMemo(
    () => Math.max(...minutes.map((m) => m.precipIntensity), 0.5),
    [minutes],
  );

  const hasAnyPrecip = minutes.some((m) => m.precipIntensity > 0.05);
  const firstPrecipIdx = minutes.findIndex((m) => m.precipIntensity > 0.05);
  const firstClearIdx =
    firstPrecipIdx === 0
      ? minutes.findIndex((m, i) => i > 0 && m.precipIntensity < 0.05)
      : -1;

  function summaryText(): string {
    if (!hasAnyPrecip) return "Clear for the next hour";
    if (firstPrecipIdx > 0) {
      const mins = firstPrecipIdx;
      return `Rain arriving in ~${mins} min`;
    }
    if (firstClearIdx > 0) {
      return `Rain stops in ~${firstClearIdx} min`;
    }
    return "Rain expected for the next hour";
  }

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 24,
        padding: "20px",
        boxShadow: "0 2px 20px rgba(0,0,0,0.07)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Next 60 Minutes
        </p>
        <span style={{ fontSize: 12, fontWeight: 600, color: hasAnyPrecip ? "#3B82F6" : "#9CA3AF" }}>
          {summaryText()}
        </span>
      </div>

      {/* Bar chart */}
      <div
        style={{
          display: "flex",
          gap: 2,
          alignItems: "flex-end",
          height: 48,
          background: "#F9FAFB",
          borderRadius: 12,
          padding: "8px 10px",
        }}
      >
        {minutes.map((m, i) => {
          const height = m.precipIntensity < 0.05
            ? 2
            : Math.max(4, Math.round((m.precipIntensity / maxIntensity) * 32));
          const intensity = m.precipIntensity / maxIntensity;
          const blue = Math.round(59 + intensity * (29 - 59)); // 59→29 (B channel: #3B82F6 → #1D4ED8)
          const color = `rgb(${Math.round(29 + (1 - intensity) * (147 - 29))}, ${Math.round(75 + (1 - intensity) * (197 - 75))}, ${Math.round(blue + (1 - intensity) * (253 - blue))})`;

          return (
            <div
              key={i}
              style={{
                flex: 1,
                height,
                borderRadius: 2,
                background: m.precipIntensity < 0.05 ? "#E5E7EB" : color,
                transition: "height 0.2s",
              }}
            />
          );
        })}
      </div>

      {/* Time labels */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 500 }}>Now</span>
        <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 500 }}>+30 min</span>
        <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 500 }}>+60 min</span>
      </div>
    </div>
  );
}
