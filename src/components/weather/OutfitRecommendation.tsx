import React from "react";
import { motion } from "framer-motion";
import { WeatherAvatar } from "@/components/avatar/WeatherAvatar";
import { Card } from "@/components/ui/Card";
import type { OutfitRecommendation as OutfitRec } from "@/types";

interface Props {
  recommendation: OutfitRec;
  tempUnit: "F" | "C";
  feelsLike: number;
  onRecalibrate?: () => void;
}

export function OutfitRecommendationCard({ recommendation, onRecalibrate }: Props) {
  const { outfit, label, description, umbrella, sunglasses, scarf, beanie, avatarCondition, commuteAlert } =
    recommendation;

  const accessories: string[] = [];
  if (umbrella) accessories.push("☂️ Umbrella");
  if (sunglasses) accessories.push("🕶️ Sunglasses");
  if (scarf) accessories.push("🧣 Scarf");
  if (beanie) accessories.push("🧢 Beanie");

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring" }}
      >
        <WeatherAvatar outfit={outfit} condition={avatarCondition} umbrella={umbrella} sunglasses={sunglasses} scarf={scarf} beanie={beanie} size={260} />
      </motion.div>

      {/* Label + description */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="text-center"
      >
        <h2 className="text-4xl font-black text-white" style={{ letterSpacing: "-0.5px" }}>{label}</h2>
        <p className="text-base mt-1 max-w-xs mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
          {description}
        </p>
      </motion.div>

      {/* Accessories */}
      {accessories.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap gap-2 justify-center"
        >
          {accessories.map((acc) => (
            <span
              key={acc}
              className="text-sm font-semibold text-white px-3.5 py-1.5 rounded-full border"
              style={{ background: "rgba(255,255,255,0.14)", borderColor: "rgba(255,255,255,0.25)" }}
            >
              {acc}
            </span>
          ))}
        </motion.div>
      )}

      {/* Commute alert */}
      {commuteAlert && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="w-full">
          <Card
            className={commuteAlert.urgency === "warning" ? "border-yellow-400/50" : ""}
            padding="p-4"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">{commuteAlert.urgency === "warning" ? "⚠️" : "ℹ️"}</span>
              <p className="text-sm text-white leading-snug flex-1">{commuteAlert.message}</p>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Recalibrate nudge */}
      {onRecalibrate && (
        <button
          onClick={onRecalibrate}
          className="flex items-center gap-1.5 opacity-50 hover:opacity-80 transition-opacity"
        >
          <span className="text-xs">🔄</span>
          <span className="text-xs text-white/70 font-medium">Not quite right? Recalibrate</span>
        </button>
      )}
    </div>
  );
}
