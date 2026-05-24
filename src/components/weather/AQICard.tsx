import React from "react";
import { motion } from "framer-motion";

interface AQILevel {
  label: string;
  description: string;
  color: string;
  bg: string;
  textColor: string;
}

function getAQILevel(aqi: number): AQILevel {
  if (aqi <= 50)
    return { label: "Good", description: "Air quality is satisfactory.", color: "#22C55E", bg: "#F0FDF4", textColor: "#166534" };
  if (aqi <= 100)
    return { label: "Moderate", description: "Sensitive individuals may experience effects.", color: "#EAB308", bg: "#FEFCE8", textColor: "#854D0E" };
  if (aqi <= 150)
    return { label: "Unhealthy for Sensitive Groups", description: "Limit outdoor activity if sensitive.", color: "#F97316", bg: "#FFF7ED", textColor: "#9A3412" };
  if (aqi <= 200)
    return { label: "Unhealthy", description: "Everyone may experience health effects.", color: "#EF4444", bg: "#FEF2F2", textColor: "#991B1B" };
  if (aqi <= 300)
    return { label: "Very Unhealthy", description: "Avoid prolonged outdoor exposure.", color: "#8B5CF6", bg: "#F5F3FF", textColor: "#5B21B6" };
  return { label: "Hazardous", description: "Avoid all outdoor activity.", color: "#991B1B", bg: "#FEF2F2", textColor: "#7F1D1D" };
}

interface Props {
  aqiIndex: number;
}

export function AQICard({ aqiIndex }: Props) {
  const level = getAQILevel(aqiIndex);
  const fillPct = Math.min(aqiIndex / 300, 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 24 }}
      style={{
        background: "#FFFFFF",
        borderRadius: 24,
        padding: "20px",
        boxShadow: "0 2px 20px rgba(0,0,0,0.07)",
      }}
    >
      <p
        style={{
          fontSize: 11, fontWeight: 700, color: "#6B7280",
          letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12,
        }}
      >
        Air Quality
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <span style={{ fontSize: 36, fontWeight: 700, color: level.color, lineHeight: 1 }}>
            {aqiIndex}
          </span>
          <span style={{ fontSize: 13, color: "#6B7280", marginLeft: 6 }}>US AQI</span>
        </div>
        <div
          style={{
            padding: "4px 12px",
            borderRadius: 999,
            background: level.bg,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: level.textColor }}>
            {level.label}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, background: "#F3F4F6", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
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

      <p style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.4 }}>
        {level.description}
      </p>
    </motion.div>
  );
}
