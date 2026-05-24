import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import OutfitFlatLay from "@/components/outfit/OutfitFlatLay";
import { Card } from "@/components/ui/Card";
import { getLayerChangeDirection } from "@/lib/outfit-logic";
import { hapticSuccess, hapticLight } from "@/lib/haptics";
import { shareOutfitCard } from "@/lib/share-card";
import { useAppStore } from "@/store";
import type {
  FootwearKind,
  OutfitFeedbackValue,
  OutfitRecommendation as OutfitRec,
  DayOutfitTimeline,
  DayPeriodLabel,
  OutfitTimelineEntry,
  AvatarCondition,
} from "@/types";

const FOOTWEAR_PILLS: Record<FootwearKind, { label: string; emoji: string; color: string; bg: string }> = {
  flip_flops: { label: "Flip flops", emoji: "🩴", color: "#1E40AF", bg: "#EFF6FF" },
  sneakers: { label: "Sneakers", emoji: "👟", color: "#374151", bg: "#F3F4F6" },
  snow_boots: { label: "Snow boots", emoji: "🥾", color: "#166534", bg: "#F0FDF4" },
  rain_boots: { label: "Rain boots", emoji: "🌧️", color: "#1D4ED8", bg: "#EFF6FF" },
};

const PERIOD_EMOJI: Record<DayPeriodLabel, string> = {
  Morning: "🌅",
  Afternoon: "☀️",
  Evening: "🌆",
};

const CONDITION_EMOJI: Record<string, string> = {
  clear: "☀️", partly_cloudy: "⛅", cloudy: "☁️", foggy: "🌫️",
  drizzle: "🌦️", rain: "🌧️", heavy_rain: "🌧️", snow: "❄️", thunderstorm: "⛈️",
};

const AVATAR_CONDITION_EMOJI: Record<AvatarCondition, string> = {
  sunny: "☀️",
  cloudy: "☁️",
  rainy: "🌧️",
  windy: "💨",
  snowy: "❄️",
  stormy: "⛈️",
  foggy: "🌫️",
  clear_night: "🌙",
};

interface Props {
  recommendation: OutfitRec;
  tempUnit: "F" | "C";
  feelsLike: number;
  /** Short reasoning string from getOutfitReason() */
  outfitReason?: string | null;
  /** Short feels-like explanation string from getFeelsLikeExplanation() */
  feelsLikeExplanation?: string | null;
  timeline?: DayOutfitTimeline | null;
  onFeedback?: (value: OutfitFeedbackValue) => void | Promise<void>;
  onRecalibrate?: () => void;
}

const URGENCY_COLORS = {
  warning: { bg: "#FEF3C7", border: "#F59E0B", icon: "⚠️", text: "#92400E" },
  critical: { bg: "#FEE2E2", border: "#EF4444", icon: "🚨", text: "#991B1B" },
  info: { bg: "#EFF6FF", border: "#BFDBFE", icon: "ℹ️", text: "#1D4ED8" },
};

function toUnit(f: number, unit: "F" | "C") {
  return unit === "C" ? Math.round(((f - 32) * 5) / 9) : Math.round(f);
}

function currentPeriodLabel(): DayPeriodLabel {
  const h = new Date().getHours();
  if (h >= 18) return "Evening";
  if (h >= 12) return "Afternoon";
  return "Morning";
}

export function OutfitRecommendationCard({
  recommendation,
  tempUnit,
  feelsLike,
  outfitReason,
  feelsLikeExplanation,
  timeline,
  onFeedback,
  onRecalibrate,
}: Props) {
  const { outfit, label, description, rainGear, umbrella, sunglasses, scarf, beanie, gloves, footwear, commuteAlert, avatarCondition } =
    recommendation;
  const [voted, setVoted] = useState<OutfitFeedbackValue | null>(null);
  const [shared, setShared] = useState(false);
  const [feelsLikeExpanded, setFeelsLikeExpanded] = useState(false);

  // Determine initial active tab: prefer the current period if it exists in the timeline
  const defaultPeriod = timeline?.find((e) => e.period.label === currentPeriodLabel())
    ? currentPeriodLabel()
    : timeline?.[0]?.period.label ?? "Morning";
  const [activeTab, setActiveTab] = useState<DayPeriodLabel>(defaultPeriod);

  useEffect(() => {
    setVoted(null);
  }, [recommendation.outfit, feelsLike]);

  async function handleVote(value: OutfitFeedbackValue) {
    if (voted) return;
    try {
      if (value === "thumbs_up") hapticSuccess();
      else hapticLight();
      await onFeedback?.(value);
      setVoted(value);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleShare() {
    const loc = useAppStore.getState().location;
    try {
      await shareOutfitCard({
        conditionEmoji: AVATAR_CONDITION_EMOJI[avatarCondition],
        temp: feelsLike,
        tempUnit,
        outfitLabel: label,
        outfitDescription: description,
        city: loc?.city ?? "",
        region: loc?.region ?? "",
      });
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // silently fail
    }
  }

  const displayFeelsLike =
    tempUnit === "C"
      ? `${Math.round(((feelsLike - 32) * 5) / 9)}°C`
      : `${Math.round(feelsLike)}°F`;

  const activeEntry = timeline?.find((e) => e.period.label === activeTab);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 24 }}
      >
        <Card mode="weather" padding="p-5">
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <div style={{ flex: 1 }}>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#111827",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.15,
                }}
              >
                {label}
              </h2>
              {outfitReason && (
                <p style={{ fontSize: 12, color: "#7C3AED", fontWeight: 500, marginTop: 3 }}>
                  {outfitReason}
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  if (feelsLikeExplanation) {
                    setFeelsLikeExpanded((v) => !v);
                    hapticLight();
                  }
                }}
                style={{
                  fontSize: 13,
                  color: "#6B7280",
                  marginTop: 3,
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: feelsLikeExplanation ? "pointer" : "default",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
                aria-label={feelsLikeExplanation ? "Tap to see feels-like explanation" : undefined}
              >
                Feels like {displayFeelsLike}
                {feelsLikeExplanation && (
                  <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                    {feelsLikeExpanded ? "▲" : "ⓘ"}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {feelsLikeExpanded && feelsLikeExplanation && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ fontSize: 12, color: "#4B5563", marginTop: 4, overflow: "hidden" }}
                  >
                    {feelsLikeExplanation}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            {(umbrella || rainGear) && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderRadius: 999,
                  background: "#EFF6FF",
                  color: "#1D4ED8",
                }}
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
            gloves={gloves}
            footwear={footwear}
            colorScheme="light"
          />

          {/* Description */}
          <p style={{ fontSize: 14, color: "#4B5563", lineHeight: 1.55, marginTop: 14 }}>
            {description}
          </p>

          {/* Outfit Timeline */}
          {timeline && timeline.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#9CA3AF",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                Today's Outfit Timeline
              </p>

              {/* Period tabs */}
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {timeline.map((entry) => {
                  const isActive = entry.period.label === activeTab;
                  return (
                    <button
                      key={entry.period.label}
                      type="button"
                      onClick={() => setActiveTab(entry.period.label)}
                      style={{
                        flex: 1,
                        padding: "7px 4px",
                        borderRadius: 12,
                        border: `1.5px solid ${isActive ? "#6C63FF" : "#E5E7EB"}`,
                        background: isActive ? "#EDE9FE" : "#F9FAFB",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                        transition: "all 0.15s",
                      }}
                    >
                      <span style={{ fontSize: 14 }}>
                        {PERIOD_EMOJI[entry.period.label]}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: isActive ? "#6C63FF" : "#6B7280",
                        }}
                      >
                        {entry.period.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active period detail */}
              <AnimatePresence mode="wait">
                {activeEntry && (
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    style={{
                      background: "#F9FAFB",
                      borderRadius: 16,
                      padding: "12px 14px",
                      border: "1px solid #F3F4F6",
                    }}
                  >
                    <TimelinePeriodDetail
                      entry={activeEntry}
                      tempUnit={tempUnit}
                      prevEntry={
                        timeline.findIndex((e) => e.period.label === activeTab) > 0
                          ? timeline[timeline.findIndex((e) => e.period.label === activeTab) - 1]
                          : null
                      }
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

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
                  <ThumbButton
                    icon="👍"
                    label="Yes"
                    onClick={() => handleVote("thumbs_up")}
                    active={false}
                  />
                  <ThumbButton
                    icon="👎"
                    label="No"
                    onClick={() => handleVote("thumbs_down")}
                    active={false}
                  />
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
            <button
              type="button"
              onClick={handleShare}
              aria-label="Share outfit"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: 10,
                border: "1.5px solid #E5E7EB",
                background: "#F9FAFB",
                cursor: "pointer",
                fontSize: 16,
                transition: "all 0.15s",
                marginLeft: "auto",
              }}
            >
              {shared ? <span style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED" }}>Shared!</span> : "⬆"}
            </button>
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
              {sunglasses && (
                <AccessoryPill label="Sunglasses" emoji="🕶️" color="#92400E" bg="#FEF9C3" />
              )}
              {scarf && <AccessoryPill label="Scarf" emoji="🧣" color="#6B21A8" bg="#F3E8FF" />}
              {beanie && <AccessoryPill label="Beanie" emoji="🧢" color="#166534" bg="#F0FDF4" />}
              {gloves && <AccessoryPill label="Gloves" emoji="🧤" color="#374151" bg="#F3F4F6" />}
            </div>
          )}

          {/* Commute alert */}
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
              <p
                style={{
                  fontSize: 13,
                  color: URGENCY_COLORS[commuteAlert.urgency].text,
                  lineHeight: 1.4,
                  flex: 1,
                }}
              >
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
          <span style={{ fontSize: 12, fontWeight: 500, color: "#9CA3AF" }}>
            Not quite right? Recalibrate
          </span>
        </motion.button>
      )}
    </div>
  );
}

// ── Timeline period detail ────────────────────────────────────────────────────

function TimelinePeriodDetail({
  entry,
  tempUnit,
  prevEntry,
}: {
  entry: OutfitTimelineEntry;
  tempUnit: "F" | "C";
  prevEntry: OutfitTimelineEntry | null;
}) {
  const { period, recommendation } = entry;
  const { umbrella, sunglasses, scarf, beanie, gloves, footwear } = recommendation;
  const hasAccessories = umbrella || sunglasses || scarf || beanie || gloves;

  const lo = toUnit(period.minFeelsLike, tempUnit);
  const hi = toUnit(period.maxFeelsLike, tempUnit);
  const unit = tempUnit === "C" ? "°C" : "°F";

  const layerChange =
    prevEntry && prevEntry.recommendation.outfit !== recommendation.outfit
      ? getLayerChangeDirection(
          prevEntry.recommendation.outfit,
          recommendation.outfit
        )
      : null;

  return (
    <div>
      {/* Row: condition + temp range + outfit label */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 22 }}>{CONDITION_EMOJI[period.condition] ?? "🌤️"}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>
            {recommendation.label}
          </p>
          <p style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
            {lo === hi ? `${lo}${unit}` : `${lo}–${hi}${unit}`}
            {period.precipProb > 20 ? ` · ${period.precipProb}% rain` : ""}
          </p>
        </div>
        {layerChange && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 999,
              background: layerChange === "layer up" ? "#EFF6FF" : "#FEF9C3",
              color: layerChange === "layer up" ? "#1D4ED8" : "#92400E",
            }}
          >
            {layerChange === "layer up" ? "↑" : "↓"} {layerChange}
          </span>
        )}
      </div>

      {/* Accessories row */}
      {(hasAccessories || footwear) && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {footwear && (
            <AccessoryPill
              label={FOOTWEAR_PILLS[footwear].label}
              emoji={FOOTWEAR_PILLS[footwear].emoji}
              color={FOOTWEAR_PILLS[footwear].color}
              bg={FOOTWEAR_PILLS[footwear].bg}
            />
          )}
          {umbrella && <AccessoryPill label="Umbrella" emoji="☂️" color="#1D4ED8" bg="#EFF6FF" />}
          {sunglasses && (
            <AccessoryPill label="Sunglasses" emoji="🕶️" color="#92400E" bg="#FEF9C3" />
          )}
          {scarf && <AccessoryPill label="Scarf" emoji="🧣" color="#6B21A8" bg="#F3E8FF" />}
          {beanie && <AccessoryPill label="Beanie" emoji="🧢" color="#166534" bg="#F0FDF4" />}
          {gloves && <AccessoryPill label="Gloves" emoji="🧤" color="#374151" bg="#F3F4F6" />}
        </div>
      )}
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function ThumbButton({
  icon,
  label,
  onClick,
  active,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        borderRadius: 10,
        border: `1.5px solid ${active ? "#6C63FF" : "#E5E7EB"}`,
        background: active ? "#EDE9FE" : "#F9FAFB",
        cursor: "pointer",
        fontSize: 18,
        transition: "all 0.15s",
      }}
    >
      {icon}
    </button>
  );
}

function AccessoryPill({
  label,
  emoji,
  color,
  bg,
}: {
  label: string;
  emoji: string;
  color: string;
  bg: string;
}) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color,
        background: bg,
        padding: "4px 10px",
        borderRadius: 999,
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {emoji} {label}
    </span>
  );
}
