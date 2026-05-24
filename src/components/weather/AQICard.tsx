import React from "react";
import { motion } from "framer-motion";

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
  isDark?: boolean;
}

export function AQICard({ aqiIndex, isDark = false }: Props) {
  const level = getAQILevel(aqiIndex);
  const fillPct = Math.min(aqiIndex / 300, 1);

  const cardBg = isDark ? "#2C2C2E" : "#FFFFFF";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : undefined;
  const cardShadow = isDark ? "0 2px 20px rgba(0,0,0,0.25)" : "0 2px 20px rgba(0,0,0,0.07)";
  const labelColor = isDark ? "#9BA4B4" : "#6B7280";
  const unitColor = isDark ? "#9BA4B4" : "#6B7280";
  const trackColor = isDark ? "#3A3A3C" : "#F3F4F6";
  const descColor = isDark ? "#9BA4B4" : "#6B7280";
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
      <p
        style={{
          fontSize: 12, fontWeight: 700, color: labelColor,
          letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12,
        }}
      >
        Air Quality
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <span style={{ fontSize: 36, fontWeight: 700, color: level.color, lineHeight: 1 }}>
            {aqiIndex}
          </span>
          <span style={{ fontSize: 13, color: unitColor, marginLeft: 6 }}>US AQI</span>
        </div>
        <div
          style={{
            padding: "4px 12px",
            borderRadius: 999,
            background: badgeBg,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: badgeText }}>
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

      <p style={{ fontSize: 12, color: descColor, lineHeight: 1.5 }}>
        {level.description}
      </p>
    </motion.div>
  );
}
