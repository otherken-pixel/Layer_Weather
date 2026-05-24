import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import OutfitFlatLay from "@/components/outfit/OutfitFlatLay";
import OutfitTextView from "@/components/outfit/OutfitTextView";
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
  outfitReason?: string | null;
  feelsLikeExplanation?: string | null;
  timeline?: DayOutfitTimeline | null;
  onFeedback?: (value: OutfitFeedbackValue) => void | Promise<void>;
  onRecalibrate?: () => void;
  isDark?: boolean;
}

const URGENCY_COLORS = {
  warning: {
    light: { bg: "#FEF3C7", border: "#F59E0B", icon: "⚠️", text: "#92400E" },
    dark:  { bg: "rgba(245,158,11,0.15)", border: "#D97706", icon: "⚠️", text: "#FCD34D" },
  },
  critical: {
    light: { bg: "#FEE2E2", border: "#EF4444", icon: "🚨", text: "#991B1B" },
    dark:  { bg: "rgba(239,68,68,0.15)", border: "#DC2626", icon: "🚨", text: "#F87171" },
  },
  info: {
    light: { bg: "#EFF6FF", border: "#BFDBFE", icon: "ℹ️", text: "#1D4ED8" },
    dark:  { bg: "rgba(59,130,246,0.15)", border: "#3B82F6", icon: "ℹ️", text: "#60A5FA" },
  },
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
  isDark = false,
}: Props) {
  const { profile } = useAppStore();
  const textOnly = profile?.outfit_display_mode === "text";
  // avatarCondition/commuteAlert always reflect current conditions
  const { commuteAlert, avatarCondition } = recommendation;
  const [voted, setVoted] = useState<OutfitFeedbackValue | null>(null);
  const [shared, setShared] = useState(false);
  const [feelsLikeExpanded, setFeelsLikeExpanded] = useState(false);

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

  const activeEntry = timeline?.find((e) => e.period.label === activeTab);

  const curPeriod = currentPeriodLabel();
  const isViewingNow = !timeline || timeline.length === 0 || activeTab === curPeriod;
  // When the user selects a future period in the timeline, the main card switches
  // to show that period's outfit. Current-conditions data (commuteAlert, avatarCondition,
  // outfitReason, feelsLikeExplanation) only applies when viewing the current period.
  const displayedRec = isViewingNow ? recommendation : (activeEntry?.recommendation ?? recommendation);
  const { outfit, label, description, rainGear, umbrella, sunglasses, scarf, beanie, gloves, footwear } = displayedRec;

  const displayFeelsLike = (() => {
    if (isViewingNow) {
      return tempUnit === "C"
        ? `${Math.round(((feelsLike - 32) * 5) / 9)}°C`
        : `${Math.round(feelsLike)}°F`;
    }
    if (!activeEntry) return "";
    const lo = toUnit(activeEntry.period.minFeelsLike, tempUnit);
    const hi = toUnit(activeEntry.period.maxFeelsLike, tempUnit);
    const u = tempUnit === "C" ? "°C" : "°F";
    return lo === hi ? `${lo}${u}` : `${lo}–${hi}${u}`;
  })();

  const primaryText = isDark ? "#F4F4F5" : "#111827";
  const secondaryText = isDark ? "#D1D5DB" : "#4B5563";
  const mutedText = isDark ? "#9BA4B4" : "#6B7280";
  // Outfit reason purple — #7C3AED on white (5.3:1 ✓); #C4B5FD on dark (5.3:1 ✓)
  const outfitReasonColor = isDark ? "#C4B5FD" : "#7C3AED";
  // "ⓘ" hint icon — use mutedText
  const infoIconColor = mutedText;
  // Rain badge — blue on white (6.7:1 ✓); light blue on dark (4.5:1 ✓)
  const rainBadgeBg = isDark ? "rgba(29,78,216,0.18)" : "#EFF6FF";
  const rainBadgeText = isDark ? "#93C5FD" : "#1D4ED8";
  // Section label (on white card) — #6B7280 (4.87:1 ✓)
  const sectionLabelColor = isDark ? "#9BA4B4" : "#6B7280";
  const tabActiveBg = isDark ? "rgba(108,99,255,0.2)" : "#EDE9FE";
  const tabActiveBorder = "#6C63FF";
  const tabInactiveBg = isDark ? "#3A3A3C" : "#F9FAFB";
  const tabInactiveBorder = isDark ? "rgba(255,255,255,0.06)" : "#E5E7EB";
  const tabActiveText = isDark ? "#A5B4FC" : "#6C63FF";
  const tabInactiveText = isDark ? "#9BA4B4" : "#6B7280";
  const periodPanelBg = isDark ? "#3A3A3C" : "#F9FAFB";
  const periodPanelBorder = isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6";
  const thumbBtnBg = isDark ? "#3A3A3C" : "#F9FAFB";
  const thumbBtnBorder = isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB";
  const feedbackText = isDark ? "#9BA4B4" : "#6B7280";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 24 }}
      >
        <Card mode="weather" padding="p-5" isDark={isDark}>
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
                  color: primaryText,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.15,
                }}
              >
                {label}
              </h2>
              {isViewingNow && outfitReason && (
                <p style={{ fontSize: 12, color: outfitReasonColor, fontWeight: 500, marginTop: 3 }}>
                  {outfitReason}
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  if (isViewingNow && feelsLikeExplanation) {
                    setFeelsLikeExpanded((v) => !v);
                    hapticLight();
                  }
                }}
                style={{
                  marginTop: 4,
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: isViewingNow && feelsLikeExplanation ? "pointer" : "default",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
                aria-label={isViewingNow && feelsLikeExplanation ? "Tap to see feels-like explanation" : undefined}
              >
                <span style={{ fontSize: 13, color: mutedText }}>
                  {isViewingNow ? "Feels like " : ""}{displayFeelsLike}
                </span>
                {isViewingNow && feelsLikeExplanation && (
                  <span style={{ fontSize: 11, color: infoIconColor }}>
                    {feelsLikeExpanded ? "▲" : "ⓘ"}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {feelsLikeExpanded && isViewingNow && feelsLikeExplanation && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ fontSize: 12, color: secondaryText, marginTop: 4, overflow: "hidden" }}
                  >
                    {feelsLikeExplanation}
                  </motion.p>
                )}
              </AnimatePresence>
              {!isViewingNow && (
                <button
                  type="button"
                  onClick={() => { setActiveTab(curPeriod); hapticLight(); }}
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: tabActiveText,
                    fontWeight: 600,
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  ← Now
                </button>
              )}
            </div>
            {(umbrella || rainGear) && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderRadius: 999,
                  background: rainBadgeBg,
                  color: rainBadgeText,
                }}
              >
                Rain
              </span>
            )}
          </div>

          {/* Outfit display */}
          {textOnly ? (
            <OutfitTextView
              outfit={outfit}
              umbrella={umbrella}
              sunglasses={sunglasses}
              scarf={scarf}
              beanie={beanie}
              gloves={gloves}
              footwear={footwear}
              isDark={isDark}
            />
          ) : (
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
          )}

          {/* Description */}
          <p style={{ fontSize: 14, color: secondaryText, lineHeight: 1.55, marginTop: 14 }}>
            {description}
          </p>

          {/* Outfit Timeline */}
          {timeline && timeline.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: sectionLabelColor,
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
                      onClick={() => { setActiveTab(entry.period.label); hapticLight(); }}
                      style={{
                        flex: 1,
                        padding: "7px 4px",
                        borderRadius: 12,
                        border: `1.5px solid ${isActive ? tabActiveBorder : tabInactiveBorder}`,
                        background: isActive ? tabActiveBg : tabInactiveBg,
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
                          color: isActive ? tabActiveText : tabInactiveText,
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
                      background: periodPanelBg,
                      borderRadius: 16,
                      padding: "12px 14px",
                      border: `1px solid ${periodPanelBorder}`,
                    }}
                  >
                    <TimelinePeriodDetail
                      entry={activeEntry}
                      tempUnit={tempUnit}
                      isDark={isDark}
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
            <span style={{ fontSize: 12, color: feedbackText, fontWeight: 500 }}>
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
                    isDark={isDark}
                  />
                  <ThumbButton
                    icon="👎"
                    label="No"
                    onClick={() => handleVote("thumbs_down")}
                    isDark={isDark}
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
                border: `1.5px solid ${thumbBtnBorder}`,
                background: thumbBtnBg,
                cursor: "pointer",
                fontSize: 16,
                transition: "all 0.15s",
                marginLeft: "auto",
              }}
            >
              {shared ? <span style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED" }}>Shared!</span> : "⬆"}
            </button>
          </div>

          {/* Commute alert */}
          {commuteAlert && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                marginTop: 14,
                background: URGENCY_COLORS[commuteAlert.urgency][isDark ? "dark" : "light"].bg,
                border: `1px solid ${URGENCY_COLORS[commuteAlert.urgency][isDark ? "dark" : "light"].border}`,
                borderRadius: 14,
                padding: "10px 14px",
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>
                {URGENCY_COLORS[commuteAlert.urgency][isDark ? "dark" : "light"].icon}
              </span>
              <p
                style={{
                  fontSize: 13,
                  color: URGENCY_COLORS[commuteAlert.urgency][isDark ? "dark" : "light"].text,
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
          <span style={{ fontSize: 12, fontWeight: 500, color: isDark ? "#9BA4B4" : "#6B7280" }}>
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
  isDark,
  prevEntry,
}: {
  entry: OutfitTimelineEntry;
  tempUnit: "F" | "C";
  isDark: boolean;
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

  const primaryText = isDark ? "#F4F4F5" : "#111827";
  const mutedText = isDark ? "#9BA4B4" : "#6B7280";

  return (
    <div>
      {/* Row: condition + temp range + outfit label */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 22 }}>{CONDITION_EMOJI[period.condition] ?? "🌤️"}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: primaryText, lineHeight: 1.2 }}>
            {recommendation.label}
          </p>
          <p style={{ fontSize: 12, color: mutedText, marginTop: 2 }}>
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
              background: isDark
                ? (layerChange === "layer up" ? "rgba(29,78,216,0.18)" : "rgba(146,64,14,0.18)")
                : (layerChange === "layer up" ? "#EFF6FF" : "#FEF9C3"),
              color: isDark
                ? (layerChange === "layer up" ? "#93C5FD" : "#FCD34D")
                : (layerChange === "layer up" ? "#1D4ED8" : "#92400E"),
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
              isDark={isDark}
            />
          )}
          {umbrella && <AccessoryPill label="Umbrella" emoji="☂️" color="#1D4ED8" bg="#EFF6FF" isDark={isDark} />}
          {sunglasses && <AccessoryPill label="Sunglasses" emoji="🕶️" color="#92400E" bg="#FEF9C3" isDark={isDark} />}
          {scarf && <AccessoryPill label="Scarf" emoji="🧣" color="#6B21A8" bg="#F3E8FF" isDark={isDark} />}
          {beanie && <AccessoryPill label="Beanie" emoji="🧢" color="#166534" bg="#F0FDF4" isDark={isDark} />}
          {gloves && <AccessoryPill label="Gloves" emoji="🧤" color="#374151" bg="#F3F4F6" isDark={isDark} />}
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
  isDark,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  isDark: boolean;
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
        border: `1.5px solid ${isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB"}`,
        background: isDark ? "#3A3A3C" : "#F9FAFB",
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
  isDark = false,
}: {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  isDark?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 10px",
        borderRadius: 999,
        // Dark mode: neutral pill so all accessory types are legible (D1D5DB on #3A3A3C = 8:1 ✓)
        background: isDark ? "rgba(255,255,255,0.08)" : bg,
        color: isDark ? "#D1D5DB" : color,
        fontSize: 12,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 13 }}>{emoji}</span>
      {label}
    </div>
  );
}
