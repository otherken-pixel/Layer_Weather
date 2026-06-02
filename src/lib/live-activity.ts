import { Capacitor, registerPlugin } from "@capacitor/core";
import type { WeatherData, OutfitRecommendation, LightningActivity, NWSAlert } from "@/types";
import type { GoogleWeatherAlert } from "@/lib/googleWeatherAlertsService";

// ── Plugin registration ───────────────────────────────────────────────────────

interface LiveActivityPlugin {
  isSupported(): Promise<{ supported: boolean }>;
  startWeatherActivity(params: LiveActivityParams): Promise<{ started: boolean; activityId?: string; reason?: string }>;
  updateWeatherActivity(params: Partial<LiveActivityParams>): Promise<{ updated: boolean; reason?: string }>;
  endWeatherActivity(params?: Partial<LiveActivityParams>): Promise<void>;
}

const LiveActivity = registerPlugin<LiveActivityPlugin>("LiveActivity");

// ── Types ─────────────────────────────────────────────────────────────────────

interface LiveActivityParams {
  // Static (start only)
  cityName: string;
  accentColorHex: string;
  // Dynamic state
  temp: number;
  feelsLike: number;
  condition: string;
  weatherCode: number;
  isDay: boolean;
  precipProb: number;
  outfitLabel: string;
  garmentTop: string;
  umbrella: boolean;
  warmthTier: string;
  /** Precipitation probability 0–100 for each of the next 60 minutes. */
  nowcastValues: number[];
  // Optional commute context
  commuteType?: string;
  commuteMinutesAway?: number;
  commuteNote?: string;
  // Optional alert headline
  alertHeadline?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildParams(
  weather: WeatherData,
  outfit: OutfitRecommendation,
  city: string,
  accentColorHex: string,
  nwsAlerts: NWSAlert[],
  activeAlerts: GoogleWeatherAlert[],
): LiveActivityParams {
  const nowcastValues = weather.nextHourPrecip
    ? weather.nextHourPrecip.minutes.map((m) => m.precipProbability * 100)
    : [];

  const firstAlert =
    nwsAlerts.find((a) => a.severity === "Extreme" || a.severity === "Severe")?.headline ??
    activeAlerts[0]?.headline ??
    undefined;

  // Commute context from the outfit recommendation
  const commute = outfit.commuteAlert;
  let commuteType: string | undefined;
  let commuteMinutesAway: number | undefined;
  let commuteNote: string | undefined;
  if (commute) {
    commuteType = commute.type;
    commuteNote = commute.message;
    // Estimate minutes away from current time vs commute window
    const now = new Date();
    const h = now.getHours();
    commuteMinutesAway = commute.type === "morning"
      ? Math.max(0, (7 * 60 + 30) - (h * 60 + now.getMinutes()))
      : Math.max(0, (18 * 60) - (h * 60 + now.getMinutes()));
  }

  return {
    cityName: city,
    accentColorHex,
    temp: weather.current.temp,
    feelsLike: weather.current.feelsLike,
    condition: weather.current.condition,
    weatherCode: weather.current.weatherCode,
    isDay: weather.current.isDay,
    precipProb: weather.current.precipProb,
    outfitLabel: outfit.label,
    garmentTop: outfit.garmentTop,
    umbrella: outfit.umbrella,
    warmthTier: outfit.warmthTier,
    nowcastValues: nowcastValues.slice(0, 60),
    commuteType,
    commuteMinutesAway,
    commuteNote,
    alertHeadline: firstAlert,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

let _liveActivityActive = false;

export async function isLiveActivitySupported(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { supported } = await LiveActivity.isSupported();
    return supported;
  } catch {
    return false;
  }
}

/**
 * Starts (or refreshes) the weather Live Activity.
 * Call when weather data is first loaded and whenever it updates.
 */
export async function startOrUpdateLiveActivity(
  weather: WeatherData,
  outfit: OutfitRecommendation,
  city: string,
  accentColorHex: string,
  nwsAlerts: NWSAlert[],
  activeAlerts: GoogleWeatherAlert[],
  lightningActivity?: LightningActivity | null,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const params = buildParams(weather, outfit, city, accentColorHex, nwsAlerts, activeAlerts);

  // Add lightning to alert headline if severe
  if (lightningActivity === "high" && !params.alertHeadline) {
    params.alertHeadline = "Heavy lightning activity in your area";
  }

  try {
    if (_liveActivityActive) {
      await LiveActivity.updateWeatherActivity(params);
    } else {
      const result = await LiveActivity.startWeatherActivity(params);
      _liveActivityActive = result.started;
    }
  } catch {
    // Non-fatal — Live Activity is an enhancement, not core functionality
  }
}

/** Ends the weather Live Activity. Call when the user signs out or closes the app. */
export async function endLiveActivity(): Promise<void> {
  if (!Capacitor.isNativePlatform() || !_liveActivityActive) return;
  try {
    await LiveActivity.endWeatherActivity();
    _liveActivityActive = false;
  } catch {
    // Non-fatal
  }
}
