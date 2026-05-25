import { useCallback, useRef } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { useAppStore, DEVICE_LOCATION_KEY } from "@/store";
import type { CachedCityWeather } from "@/store";
import { fetchWeatherData, reverseGeocodePlace, fetchAQIIndex } from "@/lib/weather";
import { getOutfitRecommendation, getDayOutfitTimeline, DEFAULT_CALIBRATION } from "@/lib/outfit-logic";
import { upsertProfile } from "@/lib/supabase";
import { saveWidgetSnapshot } from "@/lib/widget";
import { saveWeatherCache } from "@/lib/cache";

const STALE_AFTER_MS = 15 * 60 * 1000;
const GEOCODE_TIMEOUT_MS = 8_000;
const WEATHER_TIMEOUT_MS = 20_000;
const REFRESH_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out. Please try again.`)), ms),
    ),
  ]);
}

function mapWeatherError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Could not load weather data.";
  if (/denied|permission/i.test(msg)) {
    return "Location permission denied. Tap your city on Today to set a location, or enable GPS in device Settings.";
  }
  if (/timeout|timed out/i.test(msg)) {
    return msg.includes("timed out") ? msg : "Request timed out. Check your connection and try again.";
  }
  return msg;
}

async function resolveCoordinates(
  force: boolean,
  useDeviceLocation: boolean,
): Promise<{ latitude: number; longitude: number }> {
  if (force && useDeviceLocation && Capacitor.isNativePlatform()) {
    const { location: perm } = await Geolocation.requestPermissions();
    if (perm === "granted") {
      try {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 10_000,
        });
        return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch {
        // Fall through to saved coordinates
      }
    }
  }

  const { location, profile } = useAppStore.getState();
  if (location?.latitude != null && location?.longitude != null) {
    return { latitude: location.latitude, longitude: location.longitude };
  }
  if (profile?.last_latitude != null && profile?.last_longitude != null) {
    return { latitude: profile.last_latitude, longitude: profile.last_longitude };
  }

  if (Capacitor.isNativePlatform()) {
    const { location: perm } = await Geolocation.requestPermissions();
    if (perm !== "granted") {
      throw new Error(
        "Location permission denied. Add your city in Settings, or enable location in device Settings.",
      );
    }
  }

  const pos = await Geolocation.getCurrentPosition({
    enableHighAccuracy: false,
    timeout: 10_000,
  });
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
}

export type RefreshOptions = {
  /** When true with force, prefer GPS over saved/tab coordinates (native only). */
  useDeviceLocation?: boolean;
  /** City name key to use when writing/reading the per-city cache. Defaults to resolved city. */
  cacheKey?: string;
};

export function useWeather() {
  const refreshGeneration = useRef(0);
  const {
    weather, outfit, location, weatherLastFetched, isLoadingWeather, weatherError,
    profile, calibration, userId, formality,
    cityWeatherCache,
    setWeather, setOutfit, setOutfitTimeline, setLocation, setWeatherLastFetched,
    setIsLoadingWeather, setWeatherError, setCityWeatherCache, setActiveLocationIsDevice,
  } = useAppStore();

  const isStale = !weatherLastFetched || Date.now() - weatherLastFetched.getTime() > STALE_AFTER_MS;

  const refresh = useCallback(async (force = false, options: RefreshOptions = {}) => {
    const { useDeviceLocation = false, cacheKey } = options;
    // Skip global freshness short-circuit when cacheKey is set: stale/fresh is per fetch,
    // not necessarily for the city that cacheKey refers to (tab switch).
    if (!force && !cacheKey && !isStale && weather) return;

    const generation = ++refreshGeneration.current;

    // Check per-city cache before hitting the network.
    // Skip cache when force=true (explicit user pull-to-refresh).
    if (!force && cacheKey) {
      const cached = cityWeatherCache[cacheKey];
      if (cached && Date.now() - cached.fetchedAt.getTime() < STALE_AFTER_MS) {
        setWeatherError(null);
        setWeather(cached.weather);
        setOutfit(cached.outfit);
        setOutfitTimeline(cached.outfitTimeline);
        setWeatherLastFetched(cached.fetchedAt);
        setActiveLocationIsDevice(cacheKey === DEVICE_LOCATION_KEY);
        return;
      }
    }

    setIsLoadingWeather(true);
    setWeatherError(null);

    try {
      await withTimeout(
        (async () => {
          const { latitude, longitude } = await resolveCoordinates(force, useDeviceLocation);
          if (generation !== refreshGeneration.current) return;

          const storeLocation = useAppStore.getState().location;
          const storeProfile = useAppStore.getState().profile;
          let city = storeLocation?.city || storeProfile?.last_city || "";
          let countryCode: string | undefined =
            storeLocation?.country?.trim() || undefined;

          if (force || !city || useDeviceLocation) {
            const place = await withTimeout(
              reverseGeocodePlace(latitude, longitude),
              GEOCODE_TIMEOUT_MS,
              "Location lookup",
            );
            if (place) {
              city = place.city;
              countryCode = place.countryCode;
            }
          }
          if (generation !== refreshGeneration.current) return;

          setLocation({
            latitude,
            longitude,
            city,
            region: "",
            country: countryCode ?? "",
          });
          setActiveLocationIsDevice(useDeviceLocation);

          if (userId && !useDeviceLocation) {
            upsertProfile(userId, {
              last_latitude: latitude,
              last_longitude: longitude,
              last_city: city,
            }).catch(console.error);
          }

          const [data, aqiIndex] = await Promise.all([
            withTimeout(
              fetchWeatherData(latitude, longitude, { countryCode }),
              WEATHER_TIMEOUT_MS,
              "Weather fetch",
            ),
            fetchAQIIndex(latitude, longitude),
          ]);
          if (generation !== refreshGeneration.current) return;

          data.current.location = city;
          data.current.aqiIndex = aqiIndex;
          setWeather(data);
          const fetchedAt = new Date();
          setWeatherLastFetched(fetchedAt);

          const cal = calibration ?? DEFAULT_CALIBRATION;
          const stylePreference = storeProfile?.style_preference;
          const formalityPref = storeProfile?.formality_preference ?? formality;
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
            commuteStart: storeProfile?.commute_start ?? null,
            commuteEnd: storeProfile?.commute_end ?? null,
          });
          setOutfit(rec);

          const today = new Date();
          const todayHourly = data.hourly.filter(
            (h) =>
              h.time.getFullYear() === today.getFullYear() &&
              h.time.getMonth() === today.getMonth() &&
              h.time.getDate() === today.getDate(),
          );
          const timeline = getDayOutfitTimeline(todayHourly, cal, stylePreference, formalityPref);
          setOutfitTimeline(timeline);

          // Write to per-city cache.
          const resolvedKey = cacheKey ?? (useDeviceLocation ? DEVICE_LOCATION_KEY : city);
          if (resolvedKey) {
            const entry: CachedCityWeather = { weather: data, outfit: rec, outfitTimeline: timeline, fetchedAt };
            setCityWeatherCache(resolvedKey, entry);
          }

          saveWidgetSnapshot(data, rec).catch(() => {});
          saveWeatherCache(data, rec).catch(() => {});
        })(),
        REFRESH_TIMEOUT_MS,
        "Refresh",
      );
    } catch (err) {
      if (generation !== refreshGeneration.current) return;
      setWeatherError(mapWeatherError(err));
    } finally {
      setIsLoadingWeather(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStale, weather, calibration, profile, userId, location, formality, cityWeatherCache]);

  return { weather, outfit, location, isLoadingWeather, weatherError, isStale, refresh };
}
