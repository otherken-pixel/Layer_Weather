import React from "react";
import { motion } from "framer-motion";
import { getSeasonalProduce } from "@/lib/seasonalProduce";
import type { ProduceItem } from "@/lib/seasonalProduce";

interface Props {
  latitude: number;
  isDark?: boolean;
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function ProduceChip({ item, isDark }: { item: ProduceItem; isDark: boolean }) {
  const bg = isDark ? "#3A3A3C" : "#F3F4F6";
  const text = isDark ? "#F4F4F5" : "#111827";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      background: bg, borderRadius: 20, padding: "5px 10px",
    }}>
      <span style={{ fontSize: 15 }}>{item.emoji}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: text }}>{item.name}</span>
    </div>
  );
}

export function SeasonalProduceCard({ latitude, isDark = false }: Props) {
  const cardBg = isDark ? "#2C2C2E" : "#FFFFFF";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : undefined;
  const cardShadow = isDark ? "0 2px 20px rgba(0,0,0,0.25)" : "0 2px 20px rgba(0,0,0,0.07)";
  const labelColor = isDark ? "#9BA4B4" : "#4B5563";
  const sectionTitle = isDark ? "#F4F4F5" : "#111827";
  const footnoteColor = isDark ? "#9BA4B4" : "#6B7280";

  const result = getSeasonalProduce(latitude);
  const monthName = MONTH_NAMES[result.month - 1];

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
        letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 4px",
      }}>
        🥦 In Season
      </p>
      <p style={{ fontSize: 12, color: footnoteColor, margin: "0 0 16px" }}>
        {monthName} · {result.zone === "tropical" ? "Tropical" : result.hemisphere === "north" ? "Northern" : "Southern"} hemisphere
      </p>

      {result.fruits.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: sectionTitle, margin: "0 0 8px" }}>
            Fruits
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {result.fruits.map((item) => (
              <ProduceChip key={item.name} item={item} isDark={isDark} />
            ))}
          </div>
        </div>
      )}

      {result.vegetables.length > 0 && (
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: sectionTitle, margin: "0 0 8px" }}>
            Vegetables
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {result.vegetables.map((item) => (
              <ProduceChip key={item.name} item={item} isDark={isDark} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
