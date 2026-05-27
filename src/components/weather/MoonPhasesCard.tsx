import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { getMoonPhase, getMoonPhaseEmoji, getUpcomingPhases } from "@/lib/moonPhase";

interface Props {
  isDark?: boolean;
}

export function MoonPhasesCard({ isDark = false }: Props) {
  const cardBg = isDark ? "#2C2C2E" : "#FFFFFF";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : undefined;
  const cardShadow = isDark ? "0 2px 20px rgba(0,0,0,0.25)" : "0 2px 20px rgba(0,0,0,0.07)";
  const labelColor = isDark ? "#9BA4B4" : "#4B5563";
  const titleColor = isDark ? "#F4F4F5" : "#111827";
  const subColor = isDark ? "#9BA4B4" : "#6B7280";
  const chipBg = isDark ? "#3A3A3C" : "#F3F4F6";
  const chipText = isDark ? "#F4F4F5" : "#111827";
  const chipSub = isDark ? "#9BA4B4" : "#6B7280";
  const trackColor = isDark ? "#3A3A3C" : "#F3F4F6";

  const now = useMemo(() => new Date(), []);
  const phase = useMemo(() => getMoonPhase(now), [now]);
  const upcoming = useMemo(() => getUpcomingPhases(4, now), [now]);

  const closestEvent =
    phase.daysToFull <= phase.daysToNew
      ? { label: "full moon", days: phase.daysToFull }
      : { label: "new moon", days: phase.daysToNew };

  const nextLabel =
    closestEvent.days === 0 ? "Tonight" : `${closestEvent.days}d until ${closestEvent.label}`;

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
        letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 16px",
      }}>
        🌕 Moon Phases
      </p>

      {/* Current phase hero */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <span style={{ fontSize: 56, lineHeight: 1, flexShrink: 0 }}>
          {getMoonPhaseEmoji(phase.name)}
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 20, fontWeight: 700, color: titleColor, margin: "0 0 2px" }}>
            {phase.name}
          </p>
          <p style={{ fontSize: 13, color: subColor, margin: "0 0 8px" }}>{nextLabel}</p>
          {/* Illumination bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 5, background: trackColor, borderRadius: 3, overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${phase.illumination}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{ height: "100%", background: isDark ? "#FCD34D" : "#F59E0B", borderRadius: 3 }}
              />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? "#FCD34D" : "#B45309", flexShrink: 0 }}>
              {phase.illumination}% lit
            </span>
          </div>
        </div>
      </div>

      {/* Upcoming phases */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {upcoming.map((p) => (
          <div
            key={p.date.toISOString()}
            style={{
              background: chipBg, borderRadius: 14, padding: "10px 4px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}
          >
            <span style={{ fontSize: 22 }}>{p.emoji}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: chipText, textAlign: "center", lineHeight: 1.2 }}>
              {p.name.split(" ").slice(-1)[0]}
            </span>
            <span style={{ fontSize: 10, color: chipSub, textAlign: "center" }}>
              {p.date.toLocaleDateString("en", { month: "short", day: "numeric" })}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
