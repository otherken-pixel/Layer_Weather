import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { EPAObservation } from "@/types";

interface AQILevel {
  label: string;
  description: string;
  color: string;
  bg: string;
  textColor: string;
  darkBg: string;
  darkTextColor: string;
}

function getAQILevel(aqi: number): AQILevel {
  if (aqi <= 50)
    return {
      label: "Good",
      description: "Air quality is satisfactory.",
      color: "#22C55E",
      bg: "#F0FDF4", textColor: "#166534",
      darkBg: "rgba(34,197,94,0.15)", darkTextColor: "#4ADE80",
    };
  if (aqi <= 100)
    return {
      label: "Moderate",
      description: "Sensitive individuals may experience effects.",
      color: "#EAB308",
      bg: "#FEFCE8", textColor: "#854D0E",
      darkBg: "rgba(234,179,8,0.15)", darkTextColor: "#FACC15",
    };
  if (aqi <= 150)
    return {
      label: "Unhealthy for Sensitive Groups",
      description: "Limit outdoor activity if sensitive.",
      color: "#F97316",
      bg: "#FFF7ED", textColor: "#9A3412",
      darkBg: "rgba(249,115,22,0.15)", darkTextColor: "#FB923C",
    };
  if (aqi <= 200)
    return {
      label: "Unhealthy",
      description: "Everyone may experience health effects.",
      color: "#EF4444",
      bg: "#FEF2F2", textColor: "#991B1B",
      darkBg: "rgba(239,68,68,0.15)", darkTextColor: "#F87171",
    };
  if (aqi <= 300)
    return {
      label: "Very Unhealthy",
      description: "Avoid prolonged outdoor exposure.",
      color: "#8B5CF6",
      bg: "#F5F3FF", textColor: "#5B21B6",
      darkBg: "rgba(139,92,246,0.15)", darkTextColor: "#C4B5FD",
    };
  return {
    label: "Hazardous",
    description: "Avoid all outdoor activity.",
    color: "#EF4444",
    bg: "#FEF2F2", textColor: "#991B1B",
    darkBg: "rgba(239,68,68,0.15)", darkTextColor: "#FCA5A5",
  };
}

interface Props {
  aqiIndex: number;
  breakdown?: EPAObservation[] | null;
  forecast?: { aqi: number; category: string } | null;
  isDark?: boolean;
}

export function AQICard({ aqiIndex, breakdown, forecast, isDark = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const level = getAQILevel(aqiIndex);
  const fillPct = Math.min(aqiIndex / 300, 1);

  const hasBreakdown = breakdown && breakdown.length > 0;
  const dominantPollutant = hasBreakdown
    ? breakdown.reduce((a, b) => a.aqi >= b.aqi ? a : b)
    : null;

  const cardBg = isDark ? "#2C2C2E" : "#FFFFFF";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : undefined;
  const cardShadow = isDark ? "0 2px 20px rgba(0,0,0,0.25)" : "0 2px 20px rgba(0,0,0,0.07)";
  const labelColor = isDark ? "#9BA4B4" : "#4B5563";
  const unitColor = isDark ? "#9BA4B4" : "#4B5563";
  const trackColor = isDark ? "#3A3A3C" : "#F3F4F6";
  const descColor = isDark ? "#9BA4B4" : "#4B5563";
  const dividerColor = isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6";
  const badgeBg = isDark ? level.darkBg : level.bg;
  const badgeText = isDark ? level.darkTextColor : level.textColor;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 24 }}
      style={{
        background: cardBg,
        borderRadius: 24,
        padding: "20px",
        boxShadow: cardShadow,
        border: cardBorder,
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: labelColor, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Air Quality
        </p>
        {hasBreakdown && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? "Hide pollutant breakdown" : "Show pollutant breakdown"}
            aria-expanded={expanded}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "4px 8px", borderRadius: 8,
              display: "flex", alignItems: "center", gap: 4,
              color: descColor,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600 }}>
              {expanded ? "Less" : "Details"}
            </span>
            <svg
              width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        )}
      </div>

      {/* AQI number + badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <span style={{ fontSize: 36, fontWeight: 700, color: level.color, lineHeight: 1 }}>
            {aqiIndex}
          </span>
          <span style={{ fontSize: 15, color: unitColor, marginLeft: 6 }}>US AQI</span>
        </div>
        <div style={{ padding: "4px 12px", borderRadius: 999, background: badgeBg }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: badgeText }}>
            {level.label}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, background: trackColor, borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(fillPct * 100)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            height: "100%",
            background: `linear-gradient(90deg, #22C55E, ${level.color})`,
            borderRadius: 3,
          }}
        />
      </div>

      {/* Description + dominant pollutant inline hint */}
      <p style={{ fontSize: 14, color: descColor, lineHeight: 1.5 }}>
        {level.description}
        {dominantPollutant && !expanded && (
          <span style={{ color: labelColor }}> · Main: {dominantPollutant.parameter}</span>
        )}
      </p>

      {/* Tomorrow's AQI forecast */}
      {forecast != null && (
        <div style={{
          marginTop: 10, paddingTop: 10,
          borderTop: `1px solid ${dividerColor}`,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: labelColor, flex: 1 }}>
            Tomorrow
          </span>
          {(() => {
            const fl = getAQILevel(forecast.aqi);
            const fb = isDark ? fl.darkBg : fl.bg;
            const ft = isDark ? fl.darkTextColor : fl.textColor;
            return (
              <>
                <span style={{ fontSize: 14, fontWeight: 700, color: fl.color }}>{forecast.aqi}</span>
                <div style={{ padding: "2px 10px", borderRadius: 999, background: fb }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: ft }}>{fl.label}</span>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Expandable pollutant breakdown */}
      <AnimatePresence initial={false}>
        {expanded && hasBreakdown && (
          <motion.div
            key="breakdown"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: `1px solid ${dividerColor}`,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <p style={{ fontSize: 11, fontWeight: 700, color: labelColor, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Pollutants
              </p>
              {breakdown.map((obs) => {
                const obsLevel = getAQILevel(obs.aqi);
                const obsBadgeBg = isDark ? obsLevel.darkBg : obsLevel.bg;
                const obsBadgeText = isDark ? obsLevel.darkTextColor : obsLevel.textColor;
                return (
                  <div key={obs.parameter} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      color: isDark ? "#F4F4F5" : "#111827",
                      width: 52, flexShrink: 0,
                    }}>
                      {obs.parameter}
                    </span>
                    <div style={{ flex: 1, height: 4, background: trackColor, borderRadius: 2, overflow: "hidden" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(obs.aqi / 300, 1) * 100}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        style={{ height: "100%", background: obsLevel.color, borderRadius: 2 }}
                      />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: obsLevel.color, width: 28, textAlign: "right", flexShrink: 0 }}>
                      {obs.aqi}
                    </span>
                    <div style={{ padding: "2px 8px", borderRadius: 999, background: obsBadgeBg, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: obsBadgeText }}>
                        {obsLevel.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
