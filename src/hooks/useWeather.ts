import { useCallback } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { useAppStore } from "@/store";
import { fetchWeatherData, reverseGeocode } from "@/lib/weather";
import { getOutfitRecommendation, DEFAULT_CALIBRATION } from "@/lib/outfit-logic";

const STALE_AFTER_MS = 15 * 60 * 1000;

export function useWeather() {
  const {
    weather, outfit, location, weatherLastFetched, isLoadingWeather, weatherError,
    profile, calibration,
    setWeather, setOutfit, setLocation, setWeatherLastFetched,
    setIsLoadingWeather, setWeatherError,
  } = useAppStore();

  const isStale = !weatherLastFetched || Date.now() - weatherLastFetched.getTime() > STALE_AFTER_MS;

  const refresh = useCallback(async (force = false) => {
    if (!force && !isStale && weather) return;
    setIsLoadingWeather(true);
    setWeatherError(null);

    try {
      if (Capacitor.isNativePlatform()) {
        const { location: perm } = await Geolocation.requestPermissions();
        if (perm !== "granted") {
          setWeatherError("Location permission denied. Enable it in Settings.");
          return;
        }
      }

      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 10000,
      });

      const { latitude, longitude } = pos.coords;
      const city = await reverseGeocode(latitude, longitude);
      setLocation({ latitude, longitude, city, region: "", country: "" });

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
  }, [isStale, weather, calibration, profile]);

  return { weather, outfit, location, isLoadingWeather, weatherError, isStale, refresh };
}
