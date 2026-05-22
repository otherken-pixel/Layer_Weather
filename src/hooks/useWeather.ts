import { useCallback } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { useAppStore } from "@/store";
import { fetchWeatherData, reverseGeocode } from "@/lib/weather";
import { getOutfitRecommendation, DEFAULT_CALIBRATION } from "@/lib/outfit-logic";
import { upsertProfile } from "@/lib/supabase";

const STALE_AFTER_MS = 15 * 60 * 1000;

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

      if (location?.latitude && location?.longitude) {
        // Use coords cached during onboarding
        ({ latitude, longitude } = location);
      } else if (Capacitor.isNativePlatform()) {
        const { location: perm } = await Geolocation.requestPermissions();
        if (perm !== "granted") {
          setWeatherError("Location permission denied. Enable it in Settings.");
          return;
        }
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
        ({ latitude, longitude } = pos.coords);
      } else {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
        ({ latitude, longitude } = pos.coords);
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
    } catch (err) {
      setWeatherError(err instanceof Error ? err.message : "Could not load weather data.");
    } finally {
      setIsLoadingWeather(false);
    }
  // Zustand setters are stable references; location/userId changes are intentionally
  // handled via the isStale/force guard rather than re-creating the callback.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStale, weather, calibration, profile, userId, location]);

  return { weather, outfit, location, isLoadingWeather, weatherError, isStale, refresh };
}
