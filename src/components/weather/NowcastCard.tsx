import React, { useMemo } from "react";
import type { NextHourPrecip, LightningActivity } from "@/types";

interface Props {
  data: NextHourPrecip;
  lightningActivity?: LightningActivity | null;
  isDark?: boolean;
}

export function NowcastCard({ data, lightningActivity, isDark = false }: Props) {
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
    return "Rainy next hour";
  }

  const cardBg = isDark ? "#2C2C2E" : "#FFFFFF";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : undefined;
  const cardShadow = isDark ? "0 2px 20px rgba(0,0,0,0.25)" : "0 2px 20px rgba(0,0,0,0.07)";
  const labelColor = isDark ? "#9BA4B4" : "#4B5563";
  const summaryColor = hasAnyPrecip ? (isDark ? "#60A5FA" : "#1D4ED8") : labelColor;
  const chartBg = isDark ? "#1F1F21" : "#F9FAFB";
  const emptyBarColor = isDark ? "#3A3A3C" : "#E5E7EB";
  const timeLabelColor = isDark ? "#9BA4B4" : "#4B5563";

  const showLightningBanner =
    (lightningActivity === "moderate" || lightningActivity === "high") && hasAnyPrecip;

  return (
    <div
      style={{
        background: cardBg,
        borderRadius: 24,
        padding: "20px",
        boxShadow: cardShadow,
        border: cardBorder,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: labelColor, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Next 60 Minutes
        </p>
        <span
          className="truncate max-w-[55%] text-right"
          style={{ fontSize: 14, fontWeight: 600, color: summaryColor }}
        >
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
          background: chartBg,
          borderRadius: 12,
          padding: "8px 10px",
        }}
      >
        {minutes.map((m, i) => {
          const height = m.precipIntensity < 0.05
            ? 2
            : Math.max(4, Math.round((m.precipIntensity / maxIntensity) * 32));
          const intensity = m.precipIntensity / maxIntensity;
          const blue = Math.round(59 + intensity * (29 - 59));
          const color = `rgb(${Math.round(29 + (1 - intensity) * (147 - 29))}, ${Math.round(75 + (1 - intensity) * (197 - 75))}, ${Math.round(blue + (1 - intensity) * (253 - blue))})`;

          return (
            <div
              key={i}
              style={{
                flex: 1,
                height,
                borderRadius: 2,
                background: m.precipIntensity < 0.05 ? emptyBarColor : color,
                transition: "height 0.2s",
              }}
            />
          );
        })}
      </div>

      {/* Time labels */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 12, color: timeLabelColor, fontWeight: 500 }}>Now</span>
        <span style={{ fontSize: 12, color: timeLabelColor, fontWeight: 500 }}>+30 min</span>
        <span style={{ fontSize: 12, color: timeLabelColor, fontWeight: 500 }}>+60 min</span>
      </div>

      {/* Lightning thunderstorm banner */}
      {showLightningBanner && (
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 12,
            background: isDark ? "rgba(239,68,68,0.15)" : "#FEF2F2",
            border: "1px solid rgba(239,68,68,0.3)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 15, flexShrink: 0 }}>⚡</span>
          <p style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#F87171" : "#991B1B", lineHeight: 1.4 }}>
            {lightningActivity === "high"
              ? "High lightning activity — seek shelter indoors"
              : "Thunderstorm activity nearby — stay aware"}
          </p>
        </div>
      )}
    </div>
  );
}
