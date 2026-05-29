import { Capacitor } from "@capacitor/core";
import { useAppStore, DEVICE_LOCATION_KEY } from "@/store";
import type { CachedCityWeather } from "@/store";
import type {
  FormalityPreference,
  LocationData,
  Profile,
  UserCalibration,
  WeatherData,
  WidgetLocationPreference,
  WidgetLocationMode,
} from "@/types";
import { buildLocationCacheKey } from "@/lib/location-cache-key";
import {
  fetchWeatherData,
  fetchAQIBestSource,
} from "@/lib/weather";
import {
  getOutfitRecommendation,
  getDayOutfitTimeline,
  DEFAULT_CALIBRATION,
} from "@/lib/outfit-logic";
import {
  isWeatherCacheFresh,
  loadCityWeatherCache,
} from "@/lib/cache";
import { saveWidgetSnapshot, syncSupabaseConfigToAppGroup } from "@/lib/widget";

export type { WidgetLocationMode, WidgetLocationPreference };

export interface WidgetLocationTarget {
  mode: WidgetLocationMode;
  cacheKey: string;
  latitude: number;
  longitude: number;
  city: string;
  countryCode?: string;
}

const PREF_KEY = "widget_location_preference";
const APP_GROUP_KEY = "widget_location_preference";

const DEFAULT_PREFERENCE: WidgetLocationPreference = { mode: "today" };

export function parseWidgetLocationPreference(
  raw: unknown,
): WidgetLocationPreference {
  if (!raw || typeof raw !== "object") return DEFAULT_PREFERENCE;
  const o = raw as Record<string, unknown>;
  const mode = o.mode;
  if (mode !== "today" && mode !== "home" && mode !== "saved") {
    return DEFAULT_PREFERENCE;
  }
  const savedKey =
    typeof o.savedKey === "string" && o.savedKey.trim()
      ? o.savedKey.trim()
      : undefined;
  if (mode === "saved" && !savedKey) return DEFAULT_PREFERENCE;
  return { mode, savedKey };
}

export async function loadWidgetLocationPreference(): Promise<WidgetLocationPreference> {
  const fromProfile = useAppStore.getState().profile?.widget_location_preference;
  if (fromProfile) return parseWidgetLocationPreference(fromProfile);

  try {
    const { WidgetBridge } = await import("@/lib/widget-bridge");
    const result = await WidgetBridge.readWidgetData({ key: APP_GROUP_KEY });
    if (result.value) {
      return parseWidgetLocationPreference(JSON.parse(result.value));
    }
  } catch {
    // fall through
  }

  try {
    const { Preferences } = await import("@capacitor/preferences");
    const result = await Preferences.get({ key: PREF_KEY });
    if (result.value) {
      return parseWidgetLocationPreference(JSON.parse(result.value));
    }
  } catch {
    // non-fatal
  }

  return DEFAULT_PREFERENCE;
}

export async function saveWidgetLocationPreference(
  pref: WidgetLocationPreference,
  userId?: string | null,
): Promise<void> {
  const json = JSON.stringify(pref);
  const { setProfile, profile } = useAppStore.getState();
  if (profile) {
    setProfile({ ...profile, widget_location_preference: pref });
  }

  if (userId) {
    const { upsertProfile } = await import("@/lib/supabase");
    await upsertProfile(userId, { widget_location_preference: pref }).catch(() => {});
  }

  try {
    const { WidgetBridge } = await import("@/lib/widget-bridge");
    await WidgetBridge.saveWidgetData({ key: APP_GROUP_KEY, value: json });
    await WidgetBridge.reloadTimelines();
  } catch {
    // WidgetBridge unavailable (web or native plugin not loaded)
  }

  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key: PREF_KEY, value: json });
  } catch {
    // non-fatal
  }
}

export function resolveWidgetLocationTarget(
  pref: WidgetLocationPreference,
  state: {
    location: LocationData | null;
    profile: Profile | null;
    savedLocations: LocationData[];
    activeLocationIsDevice: boolean;
  },
): WidgetLocationTarget | null {
  const { location, profile, savedLocations } = state;

  if (pref.mode === "today") {
    const lat = location?.latitude ?? profile?.last_latitude;
    const lon = location?.longitude ?? profile?.last_longitude;
    if (lat == null || lon == null) return null;
    const city =
      location?.city?.trim() ||
      profile?.last_city?.trim() ||
      "Current location";
    const cacheKey = state.activeLocationIsDevice
      ? DEVICE_LOCATION_KEY
      : buildLocationCacheKey({ city, latitude: lat, longitude: lon });
    return {
      mode: "today",
      cacheKey,
      latitude: lat,
      longitude: lon,
      city,
      countryCode: location?.country?.trim() || undefined,
    };
  }

  if (pref.mode === "home") {
    const lat = profile?.last_latitude;
    const lon = profile?.last_longitude;
    if (lat == null || lon == null) return null;
    const city = profile?.last_city?.trim() || "Home";
    return {
      mode: "home",
      cacheKey: buildLocationCacheKey({ city, latitude: lat, longitude: lon }),
      latitude: lat,
      longitude: lon,
      city,
    };
  }

  const savedKey = pref.savedKey;
  if (!savedKey) return null;
  const match = savedLocations.find(
    (loc) => buildLocationCacheKey(loc) === savedKey,
  );
  if (!match) return null;
  return {
    mode: "saved",
    cacheKey: savedKey,
    latitude: match.latitude,
    longitude: match.longitude,
    city: match.city,
    countryCode: match.country?.trim() || undefined,
  };
}

function outfitBundleFromWeather(
  data: WeatherData,
  profile: Profile | null,
  calibration: UserCalibration | null | undefined,
  formality: FormalityPreference | undefined,
  previousRainy: boolean | null,
) {
  const cal = calibration ?? DEFAULT_CALIBRATION;
  const stylePreference = profile?.style_preference;
  const formalityPref: FormalityPreference =
    profile?.formality_preference ?? formality ?? "casual";
  const rec = getOutfitRecommendation({
    feelsLike: data.current.feelsLike,
    temp: data.current.temp,
    weatherCode: data.current.weatherCode,
    windSpeed: data.current.windSpeed,
    precipProb: data.current.precipProb,
    humidity: data.current.humidity,
    calibration: cal,
    hourly: data.hourly,
    stylePreference,
    formality: formalityPref,
    isDay: data.current.isDay,
    commuteStart: profile?.commute_start ?? null,
    commuteEnd: profile?.commute_end ?? null,
    previousRainy,
  });
  const today = new Date();
  const todayHourly = data.hourly.filter(
    (h) =>
      h.time.getFullYear() === today.getFullYear() &&
      h.time.getMonth() === today.getMonth() &&
      h.time.getDate() === today.getDate(),
  );
  const timeline = getDayOutfitTimeline(
    todayHourly,
    cal,
    stylePreference,
    formalityPref,
    data.current.humidity,
  );
  return { rec, timeline, cal };
}

async function loadCachedEntry(cacheKey: string): Promise<CachedCityWeather | null> {
  const mem = useAppStore.getState().cityWeatherCache[cacheKey];
  if (mem) return mem;
  return loadCityWeatherCache(cacheKey);
}

/**
 * Pushes weather/outfit for the widget & watch location preference into the App Group.
 * Uses in-memory weather for "today", city cache or a lightweight fetch for home/saved.
 */
export async function syncWidgetFromAppState(options?: {
  forceFetch?: boolean;
}): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  // Ensure the extensions always have the credentials to fetch on their own,
  // even if no weather target resolves below.
  await syncSupabaseConfigToAppGroup();

  const state = useAppStore.getState();
  const pref = await loadWidgetLocationPreference();
  const target = resolveWidgetLocationTarget(pref, {
    location: state.location,
    profile: state.profile,
    savedLocations: state.savedLocations,
    activeLocationIsDevice: state.activeLocationIsDevice,
  });
  if (!target) return;

  const { profile, calibration, formality, outfit } = state;
  const profileBits = {
    accent_color: profile?.accent_color ?? null,
    temp_unit: profile?.temp_unit ?? "F" as const,
    thermal_sensitivity: (calibration ?? DEFAULT_CALIBRATION).thermal_sensitivity,
    calibration: calibration ?? DEFAULT_CALIBRATION,
  };

  const coords = { latitude: target.latitude, longitude: target.longitude };

  if (pref.mode === "today" && state.weather && state.outfit) {
    const data = { ...state.weather };
    data.current = { ...data.current, location: target.city };
    await saveWidgetSnapshot(
      data,
      state.outfit,
      state.outfitTimeline ?? undefined,
      profileBits,
      coords,
    );
    return;
  }

  const entry = await loadCachedEntry(target.cacheKey);
  if (
    entry &&
    isWeatherCacheFresh(entry.fetchedAt) &&
    !options?.forceFetch
  ) {
    const data = { ...entry.weather };
    data.current = { ...data.current, location: target.city };
    await saveWidgetSnapshot(
      data,
      entry.outfit,
      entry.outfitTimeline ?? undefined,
      profileBits,
      coords,
    );
    return;
  }

  if (!options?.forceFetch && entry) {
    const data = { ...entry.weather };
    data.current = { ...data.current, location: target.city };
    await saveWidgetSnapshot(
      data,
      entry.outfit,
      entry.outfitTimeline ?? undefined,
      profileBits,
      coords,
    );
    return;
  }

  try {
    const data = await fetchWeatherData(target.latitude, target.longitude, {
      countryCode: target.countryCode,
    });
    const aqi = await fetchAQIBestSource(
      target.latitude,
      target.longitude,
      target.countryCode,
    );
    data.current.location = target.city;
    data.current.aqiIndex = aqi.aqi;

    const { rec, timeline, cal } = outfitBundleFromWeather(
      data,
      profile,
      calibration,
      formality,
      outfit?.rainGear ?? null,
    );

    await saveWidgetSnapshot(data, rec, timeline, {
      ...profileBits,
      thermal_sensitivity: cal.thermal_sensitivity,
      calibration: cal,
    }, coords);
  } catch {
    if (entry) {
      const data = { ...entry.weather };
      data.current = { ...data.current, location: target.city };
      await saveWidgetSnapshot(
        data,
        entry.outfit,
        entry.outfitTimeline ?? undefined,
        profileBits,
        coords,
      );
    }
  }
}
