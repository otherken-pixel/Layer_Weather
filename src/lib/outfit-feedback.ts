import type { OutfitFeedbackRecord, OutfitType, UserCalibration } from "@/types";

const STEP = 2; // °F adjustment per thumbs-down trigger
const TRIGGER_COUNT = 2; // thumbs-downs needed before adjusting

// Hard bounds — thresholds can never drift past these limits
const BOUNDS = {
  shorts_min_temp: { min: 60, max: 85 },
  light_jacket_max_temp: { min: 45, max: 75 },
  heavy_coat_max_temp: { min: 20, max: 55 },
};

/**
 * Given recent feedback history and current calibration, return threshold
 * adjustments based on accumulated thumbs-down signals.
 *
 * Strategy (assumes thumbs-down = recommendation was wrong; direction inferred
 * per outfit tier):
 *   shorts_tshirt  ↓ → user cold in shorts  → raise shorts_min (+)
 *   pants_longsleeve ↓ → user cold in pants  → raise light_jacket_max (+) so jacket starts sooner
 *   light_jacket   ↓ → user warm in jacket   → lower light_jacket_max (-) so jacket stops sooner
 *   heavy_jacket   ↓ → user warm in jacket   → lower heavy_coat_max (-) expands light_jacket band
 *   heavy_coat     ↓ → user warm in coat     → lower heavy_coat_max (-) so coat starts later
 */
export function computeCalibrationFromFeedback(
  feedback: OutfitFeedbackRecord[],
  current: UserCalibration
): Partial<Omit<UserCalibration, "user_id" | "updated_at">> {
  // Only count thumbs-down since the last calibration write; otherwise old
  // votes stay in the window and re-trigger the same adjustment forever.
  const since = current.updated_at;
  const thumbsDown = feedback.filter(
    (f) =>
      f.feedback === "thumbs_down" &&
      (!since || !f.created_at || f.created_at > since)
  );

  const countByOutfit = (type: OutfitType) =>
    thumbsDown.filter((f) => f.outfit_type === type).length;

  const updates: Partial<Omit<UserCalibration, "user_id" | "updated_at">> = {};

  let shortsMin = current.shorts_min_temp;
  let lightJacketMax = current.light_jacket_max_temp;
  let heavyCoatMax = current.heavy_coat_max_temp;

  if (countByOutfit("shorts_tshirt") >= TRIGGER_COUNT) {
    shortsMin = clamp(shortsMin + STEP, BOUNDS.shorts_min_temp);
  }

  if (countByOutfit("pants_shortsleeve") >= TRIGGER_COUNT || countByOutfit("pants_longsleeve") >= TRIGGER_COUNT) {
    lightJacketMax = clamp(lightJacketMax + STEP, BOUNDS.light_jacket_max_temp);
  }

  if (countByOutfit("light_jacket") >= TRIGGER_COUNT) {
    lightJacketMax = clamp(lightJacketMax - STEP, BOUNDS.light_jacket_max_temp);
  }

  if (
    countByOutfit("heavy_jacket") >= TRIGGER_COUNT ||
    countByOutfit("heavy_coat") >= TRIGGER_COUNT
  ) {
    heavyCoatMax = clamp(heavyCoatMax - STEP, BOUNDS.heavy_coat_max_temp);
  }

  // Enforce invariants between thresholds
  lightJacketMax = Math.min(lightJacketMax, shortsMin - 3);
  heavyCoatMax = Math.min(heavyCoatMax, lightJacketMax - 10);

  if (shortsMin !== current.shorts_min_temp) {
    updates.shorts_min_temp = shortsMin;
    updates.pants_max_temp = shortsMin - 1;
  }
  if (lightJacketMax !== current.light_jacket_max_temp) {
    updates.light_jacket_max_temp = lightJacketMax;
  }
  if (heavyCoatMax !== current.heavy_coat_max_temp) {
    updates.heavy_coat_max_temp = heavyCoatMax;
  }

  return updates;
}

function clamp(value: number, bounds: { min: number; max: number }): number {
  return Math.max(bounds.min, Math.min(bounds.max, value));
}
