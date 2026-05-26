import type {
  WeatherData,
  OutfitRecommendation,
  DayOutfitTimeline,
  Profile,
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
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function warmthTierFromFeelsLike(feelsLike: number, precipProb: number, weatherCode: number): string {
  const isSnow = weatherCode >= 71 && weatherCode <= 77;
  if (isSnow) return "warmth_6_snow";
  const isRain = precipProb >= 40 || (weatherCode >= 51 && weatherCode <= 82);
  if (isRain) {
    if (feelsLike >= 65) return "warmth_1_rain";
    if (feelsLike >= 50) return "warmth_2_rain";
    return "warmth_3_rain";
  }
  if (feelsLike >= 85) return "warmth_1";
  if (feelsLike >= 75) return "warmth_2";
  if (feelsLike >= 65) return "warmth_3";
  if (feelsLike >= 55) return "warmth_4";
  if (feelsLike >= 40) return "warmth_5";
  return "warmth_6";
}

async function writeKey(key: string, value: string): Promise<void> {
  try {
    const { WidgetBridge } = await import("@/lib/widget-bridge");
    await WidgetBridge.saveWidgetData({ key, value });
  } catch {
    // Fallback: standard Preferences for older bridge or web
    try {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.set({ key, value });
    } catch {
      // Non-fatal
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
  profile?: Pick<Profile, "accent_color" | "temp_unit"> & { thermal_sensitivity?: number },
  coordinates?: { latitude: number; longitude: number },
): Promise<void> {
  try {
    const { current, hourly, daily } = weather;

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

    const hourlyEntries = hourly.slice(0, 24).map((h) => ({
      hour: h.time instanceof Date ? h.time.toISOString() : String(h.time),
      temp: h.temp,
      feelsLike: h.feelsLike,
      precipProb: h.precipProb,
      condition: h.condition,
      weatherCode: h.weatherCode,
      isDay: h.isDay,
      warmthTier: warmthTierFromFeelsLike(h.feelsLike, h.precipProb, h.weatherCode),
    }));

    const dailyEntries = daily.slice(0, 7).map((d) => ({
      date: d.date instanceof Date ? d.date.toISOString() : String(d.date),
      tempMin: d.tempMin,
      tempMax: d.tempMax,
      precipProb: d.precipProb,
      condition: d.condition,
      weatherCode: d.weatherCode,
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
    ]);

    // Trigger WidgetKit timeline reload so widgets update immediately
    try {
      const { WidgetBridge } = await import("@/lib/widget-bridge");
      await WidgetBridge.reloadTimelines();
    } catch {
      // Non-fatal
    }
  } catch {
    // Non-fatal — widget data is best-effort
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
    // Non-fatal
  }
}
