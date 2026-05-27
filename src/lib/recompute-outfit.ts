import { useAppStore } from "@/store";
import { getOutfitRecommendation, getDayOutfitTimeline, DEFAULT_CALIBRATION } from "@/lib/outfit-logic";

/** Re-runs outfit + timeline from in-memory weather (e.g. after settings change). */
export function recomputeOutfitFromCurrentWeather(): void {
  const { weather, calibration, profile, formality, outfit, setOutfit, setOutfitTimeline } =
    useAppStore.getState();
  if (!weather) return;

  const cal = calibration ?? DEFAULT_CALIBRATION;
  const stylePreference = profile?.style_preference;
  const formalityPref = profile?.formality_preference ?? formality;
  const previousRainy = outfit?.rainGear ?? null;

  const rec = getOutfitRecommendation({
    feelsLike: weather.current.feelsLike,
    temp: weather.current.temp,
    weatherCode: weather.current.weatherCode,
    windSpeed: weather.current.windSpeed,
    precipProb: weather.current.precipProb,
    humidity: weather.current.humidity,
    calibration: cal,
    hourly: weather.hourly,
    stylePreference,
    formality: formalityPref,
    isDay: weather.current.isDay,
    commuteStart: profile?.commute_start ?? null,
    commuteEnd: profile?.commute_end ?? null,
    previousRainy,
  });
  setOutfit(rec);

  const today = new Date();
  const todayHourly = weather.hourly.filter(
    (h) =>
      h.time.getFullYear() === today.getFullYear() &&
      h.time.getMonth() === today.getMonth() &&
      h.time.getDate() === today.getDate(),
  );
  setOutfitTimeline(
    getDayOutfitTimeline(
      todayHourly,
      cal,
      stylePreference,
      formalityPref,
      weather.current.humidity,
    ),
  );
}
