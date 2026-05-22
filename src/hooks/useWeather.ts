import { useCallback, useRef } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { useAppStore } from "@/store";
import { fetchWeatherData, reverseGeocode } from "@/lib/weather";
import { getOutfitRecommendation, DEFAULT_CALIBRATION } from "@/lib/outfit-logic";
import { upsertProfile } from "@/lib/supabase";
import { saveWidgetSnapshot } from "@/lib/widget";
import { saveWeatherCache } from "@/lib/cache";

const STALE_AFTER_MS = 15 * 60 * 1000;

function mapWeatherError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Could not load weather data.";
  if (/denied|permission/i.test(msg)) {
    return "Location permission denied. Add your city in Settings, or enable location in device Settings.";
  }
  if (/timeout/i.test(msg)) {
    return "Location timed out. Check your signal and try again.";
  }
  return msg;
}

export function useWeather() {
  const refreshGeneration = useRef(0);
  const {
    weather, outfit, location, weatherLastFetched, isLoadingWeather, weatherError,
    profile, calibration, userId,
    setWeather, setOutfit, setLocation, setWeatherLastFetched,
    setIsLoadingWeather, setWeatherError,
  } = useAppStore();

  const isStale = !weatherLastFetched || Date.now() - weatherLastFetched.getTime() > STALE_AFTER_MS;

  const refresh = useCallback(async (force = false) => {
    if (!force && !isStale && weather) return;

    const generation = ++refreshGeneration.current;
    setIsLoadingWeather(true);
    setWeatherError(null);

    try {
      let latitude: number;
      let longitude: number;

      const cached = useAppStore.getState().location;
      const profileCoords =
        profile?.last_latitude != null && profile?.last_longitude != null
          ? { latitude: profile.last_latitude, longitude: profile.last_longitude }
          : null;

      if (location?.latitude != null && location?.longitude != null) {
        ({ latitude, longitude } = location);
      } else if (cached?.latitude != null && cached?.longitude != null) {
        ({ latitude, longitude } = cached);
      } else if (profileCoords) {
        ({ latitude, longitude } = profileCoords);
      } else if (Capacitor.isNativePlatform()) {
        const { location: perm } = await Geolocation.requestPermissions();
        if (perm !== "granted") {
          if (generation !== refreshGeneration.current) return;
          setWeatherError(
            "Location permission denied. Add your city in Settings, or enable location in device Settings.",
          );
          return;
        }
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
        ({ latitude, longitude } = pos.coords);
      } else {
        try {
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
          ({ latitude, longitude } = pos.coords);
        } catch (geoErr) {
          throw new Error(mapWeatherError(geoErr));
        }
      }

      if (generation !== refreshGeneration.current) return;

      const city = await reverseGeocode(latitude, longitude);
      if (generation !== refreshGeneration.current) return;

      setLocation({ latitude, longitude, city, region: "", country: "" });
      if (userId) {
        upsertProfile(userId, { last_latitude: latitude, last_longitude: longitude }).catch(console.error);
      }

      const data = await fetchWeatherData(latitude, longitude);
      if (generation !== refreshGeneration.current) return;

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
      saveWeatherCache(data, rec).catch(() => {});
    } catch (err) {
      if (generation !== refreshGeneration.current) return;
      setWeatherError(mapWeatherError(err));
    } finally {
      if (generation === refreshGeneration.current) {
        setIsLoadingWeather(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStale, weather, calibration, profile, userId, location]);

  return { weather, outfit, location, isLoadingWeather, weatherError, isStale, refresh };
}
