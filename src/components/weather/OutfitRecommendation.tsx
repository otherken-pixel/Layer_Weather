import React from "react";
import { motion } from "framer-motion";
import OutfitFlatLay from "@/components/outfit/OutfitFlatLay";
import { Card } from "@/components/ui/Card";
import type { OutfitRecommendation as OutfitRec } from "@/types";

interface Props {
  recommendation: OutfitRec;
  tempUnit: "F" | "C";
  feelsLike: number;
  onRecalibrate?: () => void;
}

const URGENCY_COLORS = {
  warning: { bg: "rgba(255,149,0,0.12)", border: "rgba(255,149,0,0.4)", icon: "⚠️" },
  critical: { bg: "rgba(255,59,48,0.12)", border: "rgba(255,59,48,0.4)", icon: "🚨" },
  info: { bg: "rgba(0,122,255,0.12)", border: "rgba(0,122,255,0.3)", icon: "ℹ️" },
};

export function OutfitRecommendationCard({ recommendation, tempUnit, feelsLike, onRecalibrate }: Props) {
  const { outfit, label, description, rainGear, umbrella, sunglasses, scarf, beanie, commuteAlert } =
    recommendation;

  const displayFeelsLike =
    tempUnit === "C"
      ? `${Math.round(((feelsLike - 32) * 5) / 9)}°C`
      : `${Math.round(feelsLike)}°F`;

  return (
    <div className="flex flex-col gap-4">
      {/* Flat Lay Grid — the main visual */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 24 }}
      >
        <Card padding="p-6">
          {/* Outfit label + feels-like backdrop */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2
                className="text-2xl font-black text-white leading-tight"
                style={{ letterSpacing: "-0.02em" }}
              >
                {label}
              </h2>
              <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                Feels like {displayFeelsLike}
              </p>
            </div>
            {(umbrella || rainGear) && (
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: "rgba(0,122,255,0.2)", color: "#007AFF" }}
              >
                Rain
              </span>
            )}
          </div>

          {/* Flat Lay SVG Grid */}
          <OutfitFlatLay
            outfit={outfit}
            rainGear={rainGear}
            umbrella={umbrella}
            sunglasses={sunglasses}
            scarf={scarf}
            beanie={beanie}
            colorScheme="dark"
          />

          {/* Description */}
          <p
            className="text-sm leading-relaxed mt-4"
            style={{ color: "rgba(255,255,255,0.72)" }}
          >
            {description}
          </p>
        </Card>
      </motion.div>

      {/* Commute alert */}
      {commuteAlert && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div
            className="rounded-2xl px-4 py-3.5 flex items-start gap-3"
            style={{
              background: URGENCY_COLORS[commuteAlert.urgency].bg,
              border: `1px solid ${URGENCY_COLORS[commuteAlert.urgency].border}`,
            }}
          >
            <span className="text-xl flex-shrink-0 mt-0.5">
              {URGENCY_COLORS[commuteAlert.urgency].icon}
            </span>
            <p className="text-sm text-white leading-snug flex-1">{commuteAlert.message}</p>
          </div>
        </motion.div>
      )}

      {/* Recalibrate nudge */}
      {onRecalibrate && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          onClick={onRecalibrate}
          className="flex items-center justify-center gap-1.5"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          <span className="text-xs">🔄</span>
          <span className="text-xs font-medium">Not quite right? Recalibrate</span>
        </motion.button>
      )}
    </div>
  );
}
