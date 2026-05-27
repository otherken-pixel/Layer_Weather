import { readFeedbackAction, clearFeedbackAction, readWidgetThermalSensitivity } from "@/lib/widget";
import { upsertCalibration } from "@/lib/supabase";
import { useAppStore } from "@/store";
import type { ThermalSensitivity, UserCalibration } from "@/types";

const CALIBRATION_CACHE_KEY = "wt_calibration_cache";

function clampThermal(n: number): ThermalSensitivity {
  return Math.max(-2, Math.min(2, Math.round(n))) as ThermalSensitivity;
}

function loadCalibrationFromLocalCache(): UserCalibration | null {
  try {
    const raw = localStorage.getItem(CALIBRATION_CACHE_KEY);
    return raw ? (JSON.parse(raw) as UserCalibration) : null;
  } catch {
    return null;
  }
}

function resolveCalibration(): UserCalibration | null {
  return useAppStore.getState().calibration ?? loadCalibrationFromLocalCache();
}

function nudgeCalibrationForFeedback(
  calibration: UserCalibration,
  action: string,
): Partial<Omit<UserCalibration, "user_id">> {
  const updates: Partial<Omit<UserCalibration, "user_id">> = {};
  const step = 2;

  if (action === "too_cold") {
    updates.thermal_sensitivity = clampThermal(calibration.thermal_sensitivity - 1);
    updates.shorts_min_temp = Math.min(calibration.shorts_min_temp + step, 85);
    updates.light_jacket_max_temp = Math.min(calibration.light_jacket_max_temp + step, 75);
    updates.heavy_coat_max_temp = Math.min(calibration.heavy_coat_max_temp + step, 55);
  } else if (action === "too_warm") {
    updates.thermal_sensitivity = clampThermal(calibration.thermal_sensitivity + 1);
    updates.shorts_min_temp = Math.max(calibration.shorts_min_temp - step, 60);
    updates.light_jacket_max_temp = Math.max(calibration.light_jacket_max_temp - step, 45);
    updates.heavy_coat_max_temp = Math.max(calibration.heavy_coat_max_temp - step, 20);
  }

  if (updates.shorts_min_temp !== undefined) {
    updates.pants_max_temp = updates.shorts_min_temp - 1;
  }
  if (
    updates.light_jacket_max_temp !== undefined &&
    updates.shorts_min_temp !== undefined
  ) {
    updates.light_jacket_max_temp = Math.min(
      updates.light_jacket_max_temp,
      updates.shorts_min_temp - 3,
    );
  }
  if (
    updates.heavy_coat_max_temp !== undefined &&
    updates.light_jacket_max_temp !== undefined
  ) {
    updates.heavy_coat_max_temp = Math.min(
      updates.heavy_coat_max_temp,
      updates.light_jacket_max_temp - 10,
    );
  }

  return updates;
}

/**
 * Applies widget / Watch feedback written to the App Group (too_cold, too_warm, just_right)
 * and optional thermal slider value. Returns true when calibration changed.
 *
 * Does not clear pending feedback until a successful save (or benign just_right ack).
 */
export async function applyPendingWidgetFeedback(userId: string): Promise<boolean> {
  const action = (await readFeedbackAction())?.trim();
  const thermalRaw = await readWidgetThermalSensitivity();

  if ((!action || action.length === 0) && thermalRaw === null) return false;

  const calibration = resolveCalibration();
  if (!calibration) {
    // Calibration not hydrated yet — leave App Group data for a later attempt.
    return false;
  }

  const updates: Partial<Omit<UserCalibration, "user_id">> = {};

  if (action && action !== "just_right") {
    Object.assign(updates, nudgeCalibrationForFeedback(calibration, action));
  }

  // Watch thermal slider wins over nudge for sensitivity when both are present.
  if (thermalRaw !== null) {
    updates.thermal_sensitivity = clampThermal(thermalRaw);
  }

  if (Object.keys(updates).length === 0) {
    if (action === "just_right") await clearFeedbackAction();
    return false;
  }

  const updated = await upsertCalibration(userId, updates);
  if (!updated) return false;

  useAppStore.getState().setCalibration(updated);
  try {
    localStorage.setItem(CALIBRATION_CACHE_KEY, JSON.stringify(updated));
  } catch {
    /* quota */
  }

  await clearFeedbackAction();
  return true;
}
