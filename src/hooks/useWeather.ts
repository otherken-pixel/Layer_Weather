import { useCallback } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { useAppStore } from "@/store";
import { fetchWeatherData, reverseGeocode } from "@/lib/weather";
import { getOutfitRecommendation, DEFAULT_CALIBRATION } from "@/lib/outfit-logic";
import { upsertProfile } from "@/lib/supabase";
import { saveWidgetSnapshot } from "@/lib/widget";

const STALE_AFTER_MS = 15 * 60 * 1000;

function mapWeatherError(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Could not load weather data.";
  if (/denied|permission/i.test(msg)) {
    return "Location access is required for local weather. Enable it in your device Settings.";
  }
  if (/timeout/i.test(msg)) {
    return "Location timed out. Check your signal and try again.";
  }
  return msg;
}

export function useWeather() {
  const {
    weather, outfit, location, weatherLastFetched, isLoadingWeather, weatherError,
    profile, calibration, userId,
    setWeather, setOutfit, setLocation, setWeatherLastFetched,
    setIsLoadingWeather, setWeatherError,
  } = useAppStore();

  const isStale = !weatherLastFetched || Date.now() - weatherLastFetched.getTime() > STALE_AFTER_MS;

  const refresh = useCallback(async (force = false) => {
    if (!force && !isStale && weather) return;
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
          setWeatherError(
            "Location permission denied. Enable location in Settings, or complete onboarding to set your area."
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

      const city = await reverseGeocode(latitude, longitude);
      setLocation({ latitude, longitude, city, region: "", country: "" });
      if (userId) {
        upsertProfile(userId, { last_latitude: latitude, last_longitude: longitude }).catch(console.error);
      }

      const data = await fetchWeatherData(latitude, longitude);
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
    } catch (err) {
      setWeatherError(mapWeatherError(err));
    } finally {
      setIsLoadingWeather(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStale, weather, calibration, profile, userId, location]);

  return { weather, outfit, location, isLoadingWeather, weatherError, isStale, refresh };
}
