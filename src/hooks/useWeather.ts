import { useCallback } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { useAppStore, DEVICE_LOCATION_KEY } from "@/store";
import type { CachedCityWeather } from "@/store";
import { fetchWeatherData, fetchAQIBestSource, fetchNWSAlerts, fetchNOAAConfidence, reverseGeocodePlace, fetchPollenData } from "@/lib/weather";
import { fetchGoogleSolar } from "@/lib/googleSolarService";
import { fetchLightningActivity } from "@/lib/swdiService";
import { fetchGoogleWeatherAlerts } from "@/lib/googleWeatherAlertsService";
import { getOutfitRecommendation, getDayOutfitTimeline, DEFAULT_CALIBRATION } from "@/lib/outfit-logic";
import { prefetchSvgImages } from "@/lib/svgImageCache";
import { upsertProfile } from "@/lib/supabase";
import { syncWidgetFromAppState } from "@/lib/widget-location";
import {
  saveWeatherCache,
  saveCityWeatherCache,
  loadCityWeatherCache,
  loadWeatherCache,
  isWeatherCacheFresh,
} from "@/lib/cache";
import { resolveDeviceCoordinates } from "@/hooks/useSaveLocation";
import { buildLocationCacheKey } from "@/lib/location-cache-key";

const STALE_AFTER_MS = 15 * 60 * 1000;
const GEOCODE_TIMEOUT_MS = 8_000;
const WEATHER_TIMEOUT_MS = 20_000;
const REFRESH_TIMEOUT_MS = 30_000;

/** Shared across callers; incremented only when a refresh starts network work (not on in-memory cache hits). */
let refreshGeneration = 0;

/** Throttle Google Weather alerts to at most one fetch per 15 minutes per location. */
let alertsLastFetched = 0;
let alertsLastLat: number | undefined;
let alertsLastLon: number | undefined;

export const WEATHER_FETCH_ERROR_MESSAGE = "Unable to fetch weather data";

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
  useDeviceLocation: boolean,
): Promise<{ latitude: number; longitude: number }> {
  if (useDeviceLocation) {
    try {
      const coords = await resolveDeviceCoordinates();
      if (coords) return coords;
    } catch {
      /* fall through to error below */
    }
    throw new Error(
      "Location permission denied or GPS unavailable. Enable location in Settings or pick a saved city.",
    );
  }

  const { location } = useAppStore.getState();
  if (location?.latitude != null && location?.longitude != null) {
    return { latitude: location.latitude, longitude: location.longitude };
  }

  const { profile } = useAppStore.getState();
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

function applyCachedEntry(
  entry: CachedCityWeather,
  cacheKey: string | undefined,
  useDeviceLocation: boolean,
): void {
  const {
    setWeatherError,
    setWeather,
    setOutfit,
    setOutfitTimeline,
    setWeatherLastFetched,
    setActiveLocationIsDevice,
    setCityWeatherCache,
    setAqiBreakdown,
    setAqiForecast,
    setPollenData,
    setSolarData,
  } = useAppStore.getState();

  setAqiBreakdown(null);
  setAqiForecast(null);
  setPollenData(null);
  setSolarData(null);
  setWeatherError(
    `Offline — showing weather from ${formatCacheAge(entry.fetchedAt)}`,
  );
  setWeather(entry.weather);
  setOutfit(entry.outfit);
  setOutfitTimeline(entry.outfitTimeline);
  setWeatherLastFetched(entry.fetchedAt);
  if (cacheKey) {
    setActiveLocationIsDevice(cacheKey === DEVICE_LOCATION_KEY);
    setCityWeatherCache(cacheKey, entry);
  } else if (useDeviceLocation) {
    setActiveLocationIsDevice(true);
  }
  syncWidgetFromAppState().catch(() => {});
}

function formatCacheAge(d: Date): string {
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
}

async function tryLoadStaleWeatherCache(
  cacheKey: string | undefined,
  useDeviceLocation: boolean,
): Promise<boolean> {
  const { cityWeatherCache } = useAppStore.getState();

  if (cacheKey) {
    let mem = cityWeatherCache[cacheKey];
    if (!mem && cacheKey.includes("|")) {
      const legacyKey = cacheKey.split("|")[0];
      mem = cityWeatherCache[legacyKey];
    }
    if (mem && isWeatherCacheFresh(mem.fetchedAt)) {
      applyCachedEntry(mem, cacheKey, useDeviceLocation);
      return true;
    }
    const persisted = await loadCityWeatherCache(cacheKey);
    if (persisted) {
      applyCachedEntry(persisted, cacheKey, useDeviceLocation);
      return true;
    }
  }

  const global = await loadWeatherCache();
  if (global) {
    applyCachedEntry(
      {
        weather: global.weather,
        outfit: global.outfit,
        outfitTimeline: null,
        fetchedAt: new Date(global.savedAt),
      },
      cacheKey,
      useDeviceLocation,
    );
    return true;
  }

  return false;
}

function clearWeatherState(): void {
  const { setWeather, setOutfit, setOutfitTimeline, setWeatherLastFetched } = useAppStore.getState();
  setWeather(null);
  setOutfit(null);
  setOutfitTimeline(null);
  setWeatherLastFetched(null);
}

export type RefreshOptions = {
  useDeviceLocation?: boolean;
  cacheKey?: string;
};

export function useWeather() {
  const {
    weather, outfit, location, weatherLastFetched, isLoadingWeather, weatherError,
    profile, calibration, userId, formality,
    cityWeatherCache,
    setWeather, setOutfit, setOutfitTimeline, setLocation, setWeatherLastFetched,
    setIsLoadingWeather, setWeatherError, setCityWeatherCache, setActiveLocationIsDevice,
    setForecastConfidence, setNWSAlerts, setLightningActivity, setAqiBreakdown, setAqiForecast, setPollenData,
    setSolarData, setActiveAlerts,
  } = useAppStore();

  const isStale = !weatherLastFetched || Date.now() - weatherLastFetched.getTime() > STALE_AFTER_MS;

  const refresh = useCallback(async (force = false, options: RefreshOptions = {}) => {
    const { useDeviceLocation = false, cacheKey } = options;
    if (!force && !cacheKey && !isStale && weather) return;

    if (!force && cacheKey) {
      const cached = cityWeatherCache[cacheKey];
      if (cached && Date.now() - cached.fetchedAt.getTime() < STALE_AFTER_MS) {
        setWeatherError(null);
        setWeather(cached.weather);
        setOutfit(cached.outfit);
        setOutfitTimeline(cached.outfitTimeline);
        setWeatherLastFetched(cached.fetchedAt);
        setActiveLocationIsDevice(cacheKey === DEVICE_LOCATION_KEY);
        setAqiBreakdown(null);
        setAqiForecast(null);
        setPollenData(null);
        setSolarData(null);
        syncWidgetFromAppState().catch(() => {});
        return;
      }
    }

    const generation = ++refreshGeneration;

    setIsLoadingWeather(true);
    setWeatherError(null);

    try {
      await withTimeout(
        (async () => {
          const { latitude, longitude } = await resolveCoordinates(useDeviceLocation);
          if (generation !== refreshGeneration) return;

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
          if (generation !== refreshGeneration) return;

          setLocation({
            latitude,
            longitude,
            city,
            region: "",
            country: countryCode ?? "",
          });
          if (useDeviceLocation) setActiveLocationIsDevice(true);

          if (userId && !useDeviceLocation) {
            upsertProfile(userId, {
              last_latitude: latitude,
              last_longitude: longitude,
              last_city: city,
            }).catch(console.error);
          }

          const [data, aqiResult, pollenResult, solarResult] = await Promise.all([
            withTimeout(
              fetchWeatherData(latitude, longitude, { countryCode }),
              WEATHER_TIMEOUT_MS,
              "Weather fetch",
            ),
            fetchAQIBestSource(latitude, longitude, countryCode),
            fetchPollenData(latitude, longitude),
            fetchGoogleSolar(latitude, longitude),
          ]);
          if (generation !== refreshGeneration) return;

          data.current.location = city;
          data.current.aqiIndex = aqiResult.aqi;
          setAqiBreakdown(aqiResult.breakdown.length > 0 ? aqiResult.breakdown : null);
          setAqiForecast(
            aqiResult.forecastAqi != null && aqiResult.forecastCategory != null
              ? { aqi: aqiResult.forecastAqi, category: aqiResult.forecastCategory }
              : null,
          );
          setPollenData(pollenResult);
          setSolarData(solarResult);
          setWeather(data);
          const fetchedAt = new Date();
          setWeatherLastFetched(fetchedAt);

          const cal = calibration ?? DEFAULT_CALIBRATION;
          const stylePreference = storeProfile?.style_preference;
          const formalityPref = storeProfile?.formality_preference ?? formality;
          const previousRainy = useAppStore.getState().outfit?.rainGear ?? null;

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
            previousRainy,
          });
          setOutfit(rec);

          const { svgCatalog, svgCatalogById } = useAppStore.getState();
          if (svgCatalog.length > 0) {
            prefetchSvgImages(svgCatalog, svgCatalogById, { rainGear: rec.rainGear });
          }

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
          setOutfitTimeline(timeline);

          const locForKey = useAppStore.getState().location;
          const resolvedKey =
            cacheKey ??
            (useDeviceLocation
              ? DEVICE_LOCATION_KEY
              : locForKey?.city
                ? buildLocationCacheKey(locForKey)
                : city
                  ? buildLocationCacheKey({ city, latitude, longitude })
                  : undefined);
          if (resolvedKey) {
            const entry: CachedCityWeather = {
              weather: data,
              outfit: rec,
              outfitTimeline: timeline,
              fetchedAt,
            };
            setCityWeatherCache(resolvedKey, entry);
            saveCityWeatherCache(resolvedKey, entry).catch(() => {});
          }

          // Non-blocking US-only supplementary data (NOAA confidence, alerts, lightning)
          if ((countryCode ?? "").toUpperCase() === "US") {
            const next12Pops = data.hourly.slice(0, 12).map((h) => h.precipProb);
            fetchNOAAConfidence(latitude, longitude, next12Pops)
              .then((conf) => { if (generation === refreshGeneration) setForecastConfidence(conf); })
              .catch(() => {});

            fetchNWSAlerts(latitude, longitude)
              .then((alerts) => { if (generation === refreshGeneration) setNWSAlerts(alerts); })
              .catch(() => {});

            fetchLightningActivity(latitude, longitude)
              .then((activity) => { if (generation === refreshGeneration) setLightningActivity(activity); })
              .catch(() => {});
          } else {
            setForecastConfidence(null);
            setNWSAlerts([]);
            setLightningActivity(null);
          }

          // Google Weather API alerts — global coverage, throttled to 15 min per location
          const nowTs = Date.now();
          const locationChanged =
            alertsLastLat === undefined ||
            alertsLastLon === undefined ||
            latitude.toFixed(2) !== alertsLastLat.toFixed(2) ||
            longitude.toFixed(2) !== alertsLastLon.toFixed(2);
          if (nowTs - alertsLastFetched > 15 * 60 * 1000 || locationChanged) {
            alertsLastFetched = nowTs;
            alertsLastLat = latitude;
            alertsLastLon = longitude;
            fetchGoogleWeatherAlerts(latitude, longitude)
              .then((alerts) => { if (generation === refreshGeneration) setActiveAlerts(alerts); })
              .catch(() => {});
          }

          syncWidgetFromAppState().catch(() => {});
          saveWeatherCache(data, rec).catch(() => {});
        })(),
        REFRESH_TIMEOUT_MS,
        "Refresh",
      );
    } catch (err) {
      if (generation !== refreshGeneration) return;

      const staleLoc = useAppStore.getState().location;
      const resolvedKey =
        cacheKey ??
        (useDeviceLocation
          ? DEVICE_LOCATION_KEY
          : staleLoc?.city
            ? buildLocationCacheKey(staleLoc)
            : undefined);

      const usedCache = await tryLoadStaleWeatherCache(resolvedKey, useDeviceLocation);
      if (!usedCache) {
        clearWeatherState();
        const mapped = mapWeatherError(err);
        const isNetworkish =
          /timeout|timed out|fetch|network|failed|load/i.test(mapped) ||
          !navigator.onLine;
        setWeatherError(
          isNetworkish ? WEATHER_FETCH_ERROR_MESSAGE : mapped,
        );
      }
    } finally {
      if (generation === refreshGeneration) {
        setIsLoadingWeather(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStale, weather, calibration, profile, userId, location, formality, cityWeatherCache, setActiveAlerts]);

  return { weather, outfit, location, isLoadingWeather, weatherError, isStale, refresh };
}
