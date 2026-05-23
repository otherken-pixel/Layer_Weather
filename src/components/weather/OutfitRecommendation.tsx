import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import OutfitFlatLay from "@/components/outfit/OutfitFlatLay";
import { Card } from "@/components/ui/Card";
import type { FootwearKind, OutfitFeedbackValue, OutfitRecommendation as OutfitRec } from "@/types";

const FOOTWEAR_PILLS: Record<FootwearKind, { label: string; emoji: string; color: string; bg: string }> = {
  flip_flops: { label: "Flip flops", emoji: "🩴", color: "#1E40AF", bg: "#EFF6FF" },
  sneakers: { label: "Sneakers", emoji: "👟", color: "#374151", bg: "#F3F4F6" },
  snow_boots: { label: "Snow boots", emoji: "🥾", color: "#166534", bg: "#F0FDF4" },
  rain_boots: { label: "Rain boots", emoji: "🌧️", color: "#1D4ED8", bg: "#EFF6FF" },
};

interface Props {
  recommendation: OutfitRec;
  tempUnit: "F" | "C";
  feelsLike: number;
  onFeedback?: (value: OutfitFeedbackValue) => void | Promise<void>;
  onRecalibrate?: () => void;
}

const URGENCY_COLORS = {
  warning: { bg: "#FEF3C7", border: "#F59E0B", icon: "⚠️", text: "#92400E" },
  critical: { bg: "#FEE2E2", border: "#EF4444", icon: "🚨", text: "#991B1B" },
  info: { bg: "#EFF6FF", border: "#BFDBFE", icon: "ℹ️", text: "#1D4ED8" },
};

export function OutfitRecommendationCard({ recommendation, tempUnit, feelsLike, onFeedback, onRecalibrate }: Props) {
  const { outfit, label, description, rainGear, umbrella, sunglasses, scarf, beanie, gloves, footwear, commuteAlert } = recommendation;
  const [voted, setVoted] = useState<OutfitFeedbackValue | null>(null);

  useEffect(() => {
    setVoted(null);
  }, [recommendation.outfit, feelsLike]);

  async function handleVote(value: OutfitFeedbackValue) {
    if (voted) return;
    try {
      await onFeedback?.(value);
      setVoted(value);
    } catch (e) {
      console.error(e);
    }
  }

  const displayFeelsLike =
    tempUnit === "C"
      ? `${Math.round(((feelsLike - 32) * 5) / 9)}°C`
      : `${Math.round(feelsLike)}°F`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Main outfit card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 24 }}
      >
        <Card mode="weather" padding="p-5">
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                {label}
              </h2>
              <p style={{ fontSize: 13, color: "#6B7280", marginTop: 3 }}>
                Feels like {displayFeelsLike}
              </p>
            </div>
            {(umbrella || rainGear) && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 999, background: "#EFF6FF", color: "#1D4ED8" }}>
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
            gloves={gloves}
            footwear={footwear}
            colorScheme="light"
          />

          {/* Description */}
          <p style={{ fontSize: 14, color: "#4B5563", lineHeight: 1.55, marginTop: 14 }}>
            {description}
          </p>

          {/* Thumbs feedback */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
            <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>
              {voted ? "Thanks for the feedback!" : "Wearing this today?"}
            </span>
            <AnimatePresence>
              {!voted && (
                <motion.div
                  key="buttons"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  style={{ display: "flex", gap: 6 }}
                >
                  <ThumbButton icon="👍" label="Yes" onClick={() => handleVote("thumbs_up")} active={false} />
                  <ThumbButton icon="👎" label="No" onClick={() => handleVote("thumbs_down")} active={false} />
                </motion.div>
              )}
              {voted && (
                <motion.span
                  key="check"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ fontSize: 18 }}
                >
                  {voted === "thumbs_up" ? "👍" : "👎"}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Accessories pills */}
          {(umbrella || sunglasses || scarf || beanie || gloves || footwear) && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
              {footwear && (
                <AccessoryPill
                  label={FOOTWEAR_PILLS[footwear].label}
                  emoji={FOOTWEAR_PILLS[footwear].emoji}
                  color={FOOTWEAR_PILLS[footwear].color}
                  bg={FOOTWEAR_PILLS[footwear].bg}
                />
              )}
              {umbrella && <AccessoryPill label="Umbrella" emoji="☂️" color="#1D4ED8" bg="#EFF6FF" />}
              {sunglasses && <AccessoryPill label="Sunglasses" emoji="🕶️" color="#92400E" bg="#FEF9C3" />}
              {scarf && <AccessoryPill label="Scarf" emoji="🧣" color="#6B21A8" bg="#F3E8FF" />}
              {beanie && <AccessoryPill label="Beanie" emoji="🧢" color="#166534" bg="#F0FDF4" />}
              {gloves && <AccessoryPill label="Gloves" emoji="🧤" color="#374151" bg="#F3F4F6" />}
            </div>
          )}

          {/* Commute alert — inside the card */}
          {commuteAlert && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                marginTop: 14,
                background: URGENCY_COLORS[commuteAlert.urgency].bg,
                border: `1px solid ${URGENCY_COLORS[commuteAlert.urgency].border}`,
                borderRadius: 14,
                padding: "10px 14px",
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>
                {URGENCY_COLORS[commuteAlert.urgency].icon}
              </span>
              <p style={{ fontSize: 13, color: URGENCY_COLORS[commuteAlert.urgency].text, lineHeight: 1.4, flex: 1 }}>
                {commuteAlert.message}
              </p>
            </motion.div>
          )}
        </Card>
      </motion.div>

      {/* Recalibrate nudge */}
      {onRecalibrate && (
        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          onClick={onRecalibrate}
          className="min-h-[44px] w-full flex items-center justify-center gap-2 bg-transparent border-0 cursor-pointer"
        >
          <span style={{ fontSize: 12 }}>🔄</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: "#9CA3AF" }}>Not quite right? Recalibrate</span>
        </motion.button>
      )}
    </div>
  );
}

function ThumbButton({ icon, label, onClick, active }: { icon: string; label: string; onClick: () => void; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 36, height: 36, borderRadius: 10,
        border: `1.5px solid ${active ? "#6C63FF" : "#E5E7EB"}`,
        background: active ? "#EDE9FE" : "#F9FAFB",
        cursor: "pointer", fontSize: 18, transition: "all 0.15s",
      }}
    >
      {icon}
    </button>
  );
}

function AccessoryPill({ label, emoji, color, bg }: { label: string; emoji: string; color: string; bg: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: "4px 10px", borderRadius: 999, display: "flex", alignItems: "center", gap: 4 }}>
      {emoji} {label}
    </span>
  );
}
