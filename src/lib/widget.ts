import { Capacitor } from "@capacitor/core";
import { getOutfitRecommendation, DEFAULT_CALIBRATION } from "@/lib/outfit-logic";
import type {
  WeatherData,
  OutfitRecommendation,
  DayOutfitTimeline,
  Profile,
  UserCalibration,
} from "@/types";

// Keys must match AppGroupKeys.swift in the widget/watch extensions.
const KEYS = {
  snapshot: "widget_snapshot",
  hourly: "widget_hourly",
  daily: "widget_daily",
  timeline: "widget_timeline",
  commuteAlert: "widget_commute_alert",
  accentColor: "widget_accent_color",
  thermalSensitivity: "widget_thermal_sensitivity",
  feedbackAction: "widget_feedback_action",
  lastCoordinates: "widget_last_coordinates",
  supabaseUrl: "widget_supabase_url",
  supabaseAnonKey: "widget_supabase_anon_key",
} as const;

const APP_GROUP_KEY_PREFIX = "widget_";

// Supabase credentials the widget/watch need to call the `weather` edge
// function (WeatherKit) on their own. Baked into the web bundle at build time;
// mirrored into the App Group so the native extensions can read them.
const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? "";
const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? "";

/**
 * Mirrors the Supabase URL + anon key into the App Group so the widget, watch,
 * and complication can fetch live WeatherKit data independently of the app.
 * Idempotent and cheap; safe to call on every sync.
 */
export async function syncSupabaseConfigToAppGroup(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await Promise.all([
    SUPABASE_URL ? writeKey(KEYS.supabaseUrl, SUPABASE_URL) : Promise.resolve(),
    SUPABASE_ANON_KEY
      ? writeKey(KEYS.supabaseAnonKey, SUPABASE_ANON_KEY)
      : Promise.resolve(),
  ]);
}

async function writeKey(key: string, value: string): Promise<void> {
  const isAppGroupKey = key.startsWith(APP_GROUP_KEY_PREFIX);
  const isNative = Capacitor.isNativePlatform();

  try {
    const { WidgetBridge } = await import("@/lib/widget-bridge");
    await WidgetBridge.saveWidgetData({ key, value });
    if (import.meta.env.DEV) {
      console.info(`[WidgetBridge] wrote ${key} (${value.length} bytes)`);
    }
    return;
  } catch (err) {
    if (isNative && isAppGroupKey) {
      console.error(`[WidgetBridge] failed for ${key}:`, err);
      throw err;
    }
    if (!isNative) {
      try {
        const { Preferences } = await import("@capacitor/preferences");
        await Preferences.set({ key, value });
      } catch {
        // Non-fatal on web
      }
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Saves a rich weather + outfit snapshot to the shared App Group UserDefaults
 * so WidgetKit and the Apple Watch app can read it without launching the main app.
 *
 * Call this every time the weather/outfit is refreshed. Non-fatal — failures are silently swallowed.
 */
export async function saveWidgetSnapshot(
  weather: WeatherData,
  outfit: OutfitRecommendation,
  timeline?: DayOutfitTimeline,
  profile?: Pick<Profile, "temp_unit"> & {
    accent_color?: string | null;
    thermal_sensitivity?: number;
    calibration?: UserCalibration;
  },
  coordinates?: { latitude: number; longitude: number },
): Promise<void> {
  try {
    const { current, hourly, daily } = weather;
    const calibration = profile?.calibration ?? DEFAULT_CALIBRATION;

    const snapshot = {
      temp: current.temp,
      feelsLike: current.feelsLike,
      humidity: current.humidity,
      windSpeed: current.windSpeed,
      precipProb: current.precipProb,
      aqiIndex: current.aqiIndex,
      condition: current.condition,
      weatherCode: current.weatherCode,
      isDay: current.isDay,
      location: current.location,
      outfitLabel: outfit.label,
      outfitDescription: outfit.description,
      warmthTier: outfit.warmthTier,
      garmentTop: outfit.garmentTop,
      garmentBottom: outfit.garmentBottom,
      umbrella: outfit.umbrella,
      sunglasses: outfit.sunglasses,
      scarf: outfit.scarf,
      gloves: outfit.gloves,
      beanie: outfit.beanie,
      rainShell: outfit.rainShell,
      footwear: outfit.footwear,
      avatarCondition: outfit.avatarCondition,
      updatedAt: new Date().toISOString(),
    };

    const hourlyEntries = hourly.slice(0, 24).map((h) => {
      const hourRec = getOutfitRecommendation({
        feelsLike: h.feelsLike,
        temp: h.temp,
        weatherCode: h.weatherCode,
        windSpeed: h.windSpeed,
        precipProb: h.precipProb,
        humidity: current.humidity,
        calibration,
        hourly,
        isDay: h.isDay,
      });
      return {
        hour: h.time instanceof Date ? h.time.toISOString() : String(h.time),
        temp: h.temp,
        feelsLike: h.feelsLike,
        precipProb: h.precipProb,
        condition: h.condition,
        weatherCode: h.weatherCode,
        isDay: h.isDay,
        warmthTier: hourRec.warmthTier,
      };
    });

    const dailyEntries = daily.slice(0, 7).map((d) => ({
      date: d.date instanceof Date ? d.date.toISOString() : String(d.date),
      tempMin: d.tempMin,
      tempMax: d.tempMax,
      precipProb: d.precipProb,
      condition: d.condition,
      weatherCode: d.weatherCode,
      sunrise: d.sunrise instanceof Date ? d.sunrise.toISOString() : (d.sunrise ?? null),
      sunset: d.sunset instanceof Date ? d.sunset.toISOString() : (d.sunset ?? null),
    }));

    const timelineEntries = timeline?.map((entry) => ({
      period: entry.period.label,
      startHour: entry.period.startHour,
      endHour: entry.period.endHour,
      minFeelsLike: entry.period.minFeelsLike,
      maxFeelsLike: entry.period.maxFeelsLike,
      outfitLabel: entry.recommendation.label,
      outfitType: entry.recommendation.outfit,
      precipProb: entry.period.precipProb,
      condition: entry.period.condition,
      warmthTier: entry.recommendation.warmthTier,
    })) ?? [];

    const commuteAlertPayload = outfit.commuteAlert
      ? {
          type: outfit.commuteAlert.type,
          message: outfit.commuteAlert.message,
          urgency: outfit.commuteAlert.urgency,
        }
      : null;

    await Promise.all([
      writeKey(KEYS.snapshot, JSON.stringify(snapshot)),
      writeKey(KEYS.hourly, JSON.stringify(hourlyEntries)),
      writeKey(KEYS.daily, JSON.stringify(dailyEntries)),
      writeKey(KEYS.timeline, JSON.stringify(timelineEntries)),
      writeKey(KEYS.commuteAlert, JSON.stringify(commuteAlertPayload)),
      profile?.accent_color
        ? writeKey(KEYS.accentColor, profile.accent_color)
        : Promise.resolve(),
      profile?.thermal_sensitivity !== undefined
        ? writeKey(KEYS.thermalSensitivity, String(profile.thermal_sensitivity))
        : Promise.resolve(),
      coordinates
        ? writeKey(KEYS.lastCoordinates, JSON.stringify(coordinates))
        : Promise.resolve(),
      SUPABASE_URL ? writeKey(KEYS.supabaseUrl, SUPABASE_URL) : Promise.resolve(),
      SUPABASE_ANON_KEY
        ? writeKey(KEYS.supabaseAnonKey, SUPABASE_ANON_KEY)
        : Promise.resolve(),
    ]);

    // Trigger WidgetKit timeline reload so widgets update immediately
    try {
      const { WidgetBridge } = await import("@/lib/widget-bridge");
      await WidgetBridge.reloadTimelines();
    } catch {
      // Non-fatal
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("saveWidgetSnapshot failed:", err);
    }
  }
}

/**
 * Reads the feedback action written by the interactive widget (iOS 17+).
 * Returns "too_cold" | "just_right" | "too_warm" | null.
 * Clear it after reading with clearFeedbackAction().
 */
export async function readFeedbackAction(): Promise<string | null> {
  try {
    const { WidgetBridge } = await import("@/lib/widget-bridge");
    const result = await WidgetBridge.readWidgetData({ key: KEYS.feedbackAction });
    return result.value || null;
  } catch {
    try {
      const { Preferences } = await import("@capacitor/preferences");
      const result = await Preferences.get({ key: KEYS.feedbackAction });
      return result.value;
    } catch {
      return null;
    }
  }
}

/** Clears the pending feedback action after it has been applied to calibration. */
export async function clearFeedbackAction(): Promise<void> {
  try {
    const { WidgetBridge } = await import("@/lib/widget-bridge");
    await WidgetBridge.saveWidgetData({ key: KEYS.feedbackAction, value: "" });
  } catch {
    try {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.set({ key: KEYS.feedbackAction, value: "" });
    } catch {
      // Non-fatal
    }
  }
}

/** Thermal slider value from Watch / widget (App Group). */
export async function readWidgetThermalSensitivity(): Promise<number | null> {
  try {
    const { WidgetBridge } = await import("@/lib/widget-bridge");
    const result = await WidgetBridge.readWidgetData({ key: KEYS.thermalSensitivity });
    if (result.value == null || result.value === "") return null;
    const n = parseInt(result.value, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    try {
      const { Preferences } = await import("@capacitor/preferences");
      const result = await Preferences.get({ key: KEYS.thermalSensitivity });
      if (!result.value) return null;
      const n = parseInt(result.value, 10);
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  }
}
