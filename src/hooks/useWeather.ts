import { useCallback, useRef } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { useAppStore } from "@/store";
import { fetchWeatherData, reverseGeocode } from "@/lib/weather";
import { getOutfitRecommendation, DEFAULT_CALIBRATION } from "@/lib/outfit-logic";
import { upsertProfile } from "@/lib/supabase";
import { saveWidgetSnapshot } from "@/lib/widget";

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
    return "Location access is required for local weather. Enable it in your device Settings.";
  }
  if (/timeout|timed out/i.test(msg)) {
    return msg.includes("timed out") ? msg : "Request timed out. Check your connection and try again.";
  }
  return msg;
}

async function resolveCoordinates(
  force: boolean,
  location: ReturnType<typeof useAppStore.getState>["location"],
  profile: ReturnType<typeof useAppStore.getState>["profile"],
): Promise<{ latitude: number; longitude: number }> {
  if (force && Capacitor.isNativePlatform()) {
    const { location: perm } = await Geolocation.requestPermissions();
    if (perm === "granted") {
      try {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 10_000,
        });
        return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch {
        // Fall through to cached coordinates
      }
    }
  }

  const cached = useAppStore.getState().location;
  if (location?.latitude != null && location?.longitude != null) {
    return { latitude: location.latitude, longitude: location.longitude };
  }
  if (cached?.latitude != null && cached?.longitude != null) {
    return { latitude: cached.latitude, longitude: cached.longitude };
  }
  if (profile?.last_latitude != null && profile?.last_longitude != null) {
    return { latitude: profile.last_latitude, longitude: profile.last_longitude };
  }

  if (Capacitor.isNativePlatform()) {
    const { location: perm } = await Geolocation.requestPermissions();
    if (perm !== "granted") {
      throw new Error(
        "Location permission denied. Enable location in Settings, or complete onboarding to set your area.",
      );
    }
  }

  const pos = await Geolocation.getCurrentPosition({
    enableHighAccuracy: false,
    timeout: 10_000,
  });
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
}

export function useWeather() {
  const {
    weather, outfit, location, weatherLastFetched, isLoadingWeather, weatherError,
    profile, calibration, userId,
    setWeather, setOutfit, setLocation, setWeatherLastFetched,
    setIsLoadingWeather, setWeatherError,
  } = useAppStore();

  const refreshGenRef = useRef(0);

  const isStale = !weatherLastFetched || Date.now() - weatherLastFetched.getTime() > STALE_AFTER_MS;

  const refresh = useCallback(async (force = false) => {
    if (!force && !isStale && weather) return;

    const gen = ++refreshGenRef.current;
    setIsLoadingWeather(true);
    setWeatherError(null);

    try {
      await withTimeout(
        (async () => {
          const { latitude, longitude } = await resolveCoordinates(force, location, profile);

          const city = await withTimeout(
            reverseGeocode(latitude, longitude),
            GEOCODE_TIMEOUT_MS,
            "Location lookup",
          );
          setLocation({ latitude, longitude, city, region: "", country: "" });
          if (userId) {
            upsertProfile(userId, { last_latitude: latitude, last_longitude: longitude }).catch(console.error);
          }

          const data = await withTimeout(
            fetchWeatherData(latitude, longitude),
            WEATHER_TIMEOUT_MS,
            "Weather fetch",
          );
          data.current.location = city;
          setWeather(data);
          setWeatherLastFetched(new Date());

          const cal = calibration ?? DEFAULT_CALIBRATION;
          const rec = getOutfitRecommendation({
            feelsLike: data.current.feelsLike,
            weatherCode: data.current.weatherCode,
            windSpeed: data.current.windSpeed,
            precipProb: data.current.precipProb,
            humidity: data.current.humidity,
            calibration: cal,
            hourly: data.hourly,
            commuteStart: profile?.commute_start ?? null,
            commuteEnd: profile?.commute_end ?? null,
          });
          setOutfit(rec);
          saveWidgetSnapshot(data, rec).catch(() => {});
        })(),
        REFRESH_TIMEOUT_MS,
        "Refresh",
      );
    } catch (err) {
      if (gen === refreshGenRef.current) {
        setWeatherError(mapWeatherError(err));
      }
    } finally {
      if (gen === refreshGenRef.current) {
        setIsLoadingWeather(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStale, weather, calibration, profile, userId, location]);

  return { weather, outfit, location, isLoadingWeather, weatherError, isStale, refresh };
}
