import React from "react";
import { motion } from "framer-motion";
import type { RainHistoryData } from "@/types";

interface Props {
  data: RainHistoryData | null;
  loading?: boolean;
  tempUnit: "F" | "C";
  isDark?: boolean;
}

function mmToIn(mm: number): number {
  return Math.round(mm / 25.4 * 100) / 100;
}

export function RainAccumulationCard({ data, loading = false, tempUnit, isDark = false }: Props) {
  const cardBg = isDark ? "#2C2C2E" : "#FFFFFF";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : undefined;
  const cardShadow = isDark ? "0 2px 20px rgba(0,0,0,0.25)" : "0 2px 20px rgba(0,0,0,0.07)";
  const labelColor = isDark ? "#9BA4B4" : "#4B5563";
  const valueColor = isDark ? "#F4F4F5" : "#111827";
  const subColor = isDark ? "#9BA4B4" : "#6B7280";
  const trackColor = isDark ? "#3A3A3C" : "#F3F4F6";
  const accentBlue = isDark ? "#60A5FA" : "#2563EB";

  const useImperial = tempUnit === "F";

  function formatAmount(mm: number): string {
    if (useImperial) {
      const inches = mmToIn(mm);
      return `${inches.toFixed(2)}"`;
    }
    return `${mm.toFixed(1)} mm`;
  }

  const maxMm = data ? Math.max(data.last30d, 0.1) : 1;

  const stats = data
    ? [
        { label: "24h", value: data.last24h },
        { label: "3 days", value: data.last3d },
        { label: "7 days", value: data.last7d },
        { label: "30 days", value: data.last30d },
      ]
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 24 }}
      style={{
        background: cardBg,
        borderRadius: 24,
        padding: "20px",
        boxShadow: cardShadow,
        border: cardBorder,
      }}
    >
      <p style={{
        fontSize: 14, fontWeight: 700, color: labelColor,
        letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16, margin: "0 0 16px",
      }}>
        🌧️ Rain Accumulation
      </p>

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-xl skeleton" />
          ))}
        </div>
      )}

      {!loading && !data && (
        <p style={{ fontSize: 14, color: subColor, textAlign: "center", padding: "8px 0" }}>
          No rainfall data available for this location.
        </p>
      )}

      {!loading && stats && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {stats.map(({ label, value }, i) => {
            const barPct = Math.min(value / maxMm, 1);
            return (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: subColor }}>{label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: valueColor }}>
                    {formatAmount(value)}
                  </span>
                </div>
                <div style={{ height: 5, background: trackColor, borderRadius: 3, overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(barPct * 100)}%` }}
                    transition={{ delay: i * 0.07 + 0.1, duration: 0.6, ease: "easeOut" }}
                    style={{
                      height: "100%",
                      background: accentBlue,
                      borderRadius: 3,
                      opacity: 0.6 + barPct * 0.4,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
