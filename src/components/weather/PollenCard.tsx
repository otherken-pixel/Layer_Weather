import React from "react";
import type { PollenData, PollenLevel } from "@/types";

function levelLabel(l: PollenLevel | null): string {
  if (l === "low") return "Low";
  if (l === "moderate") return "Moderate";
  if (l === "high") return "High";
  if (l === "very_high") return "Very High";
  return "—";
}

function levelColor(l: PollenLevel | null): string {
  if (l === "low") return "#22C55E";
  if (l === "moderate") return "#EAB308";
  if (l === "high") return "#F97316";
  if (l === "very_high") return "#EF4444";
  return "#9CA3AF";
}

function levelFill(grains: number | null): number {
  if (grains == null) return 0;
  // Log scale: 0 → 0, 10 → 0.25, 50 → 0.5, 150 → 0.75, 500+ → 1
  return Math.min(Math.log1p(grains) / Math.log1p(500), 1);
}

function pollenLevel(grains: number | null): PollenLevel | null {
  if (grains == null) return null;
  if (grains < 10) return "low";
  if (grains < 50) return "moderate";
  if (grains < 150) return "high";
  return "very_high";
}

interface Props {
  data: PollenData;
  isDark?: boolean;
}

export function PollenCard({ data, isDark = false }: Props) {
  const cardBg = isDark ? "#2C2C2E" : "#FFFFFF";
  const labelColor = isDark ? "#9BA4B4" : "#4B5563";
  const textPrimary = isDark ? "#F4F4F5" : "#111827";
  const trackColor = isDark ? "#52525B" : "#E5E7EB";
  const border = isDark ? "1px solid rgba(255,255,255,0.08)" : undefined;

  const overallColor = levelColor(data.level);
  const overallLabel = levelLabel(data.level);

  const rows: { emoji: string; label: string; grains: number | null }[] = [
    { emoji: "🌲", label: "Tree", grains: data.tree },
    { emoji: "🌿", label: "Grass", grains: data.grass },
    { emoji: "🌾", label: "Weed", grains: data.weed },
  ];

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
          Pollen
        </p>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: `${overallColor}22`,
          borderRadius: 20, padding: "4px 12px",
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: overallColor }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: overallColor }}>
            {overallLabel}
          </span>
        </div>
      </div>

      {/* Pollen type rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {rows.map(({ emoji, label, grains }) => {
          const lvl = pollenLevel(grains);
          const color = levelColor(lvl);
          const fill = levelFill(grains);
          const isDominant = (
            (label === "Tree" && data.dominant === "tree") ||
            (label === "Grass" && data.dominant === "grass") ||
            (label === "Weed" && data.dominant === "weed")
          );

          return (
            <div key={label}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 16, marginRight: 8, flexShrink: 0 }}>{emoji}</span>
                <span style={{ fontSize: 14, fontWeight: isDominant ? 700 : 500, color: textPrimary, flex: 1 }}>
                  {label}
                  {isDominant && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: overallColor, marginLeft: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Dominant
                    </span>
                  )}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: grains == null ? labelColor : color }}>
                  {levelLabel(lvl)}
                  {grains != null && (
                    <span style={{ fontSize: 11, color: labelColor, fontWeight: 400, marginLeft: 4 }}>
                      {Math.round(grains)} gr/m³
                    </span>
                  )}
                </span>
              </div>
              <div style={{ height: 5, background: trackColor, borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: grains == null ? "0%" : `${Math.round(fill * 100)}%`,
                    background: color,
                    borderRadius: 3,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 11, color: labelColor, marginTop: 14, marginBottom: 0 }}>
        Source: Open-Meteo Air Quality · {new Date().toLocaleDateString("en", { month: "short", day: "numeric" })}
      </p>
    </div>
  );
}
