import { readFeedbackAction, clearFeedbackAction, readWidgetThermalSensitivity } from "@/lib/widget";
import { upsertCalibration } from "@/lib/supabase";
import { useAppStore } from "@/store";
import type { ThermalSensitivity, UserCalibration } from "@/types";

function clampThermal(n: number): ThermalSensitivity {
  return Math.max(-2, Math.min(2, Math.round(n))) as ThermalSensitivity;
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
 */
export async function applyPendingWidgetFeedback(userId: string): Promise<boolean> {
  const action = (await readFeedbackAction())?.trim();
  const thermalRaw = await readWidgetThermalSensitivity();

  if ((!action || action.length === 0) && thermalRaw === null) return false;

  const calibration = useAppStore.getState().calibration;
  if (!calibration) {
    if (action) await clearFeedbackAction();
    return false;
  }

  const updates: Partial<Omit<UserCalibration, "user_id">> = {};

  if (thermalRaw !== null) {
    updates.thermal_sensitivity = clampThermal(thermalRaw);
  }

  if (action && action !== "just_right") {
    Object.assign(updates, nudgeCalibrationForFeedback(calibration, action));
  }

  if (Object.keys(updates).length === 0) {
    if (action) await clearFeedbackAction();
    return false;
  }

  const updated = await upsertCalibration(userId, updates);
  if (updated) {
    useAppStore.getState().setCalibration(updated);
    try {
      localStorage.setItem("wt_calibration_cache", JSON.stringify(updated));
    } catch {
      /* quota */
    }
  }
  if (action) await clearFeedbackAction();
  return Boolean(updated);
}
