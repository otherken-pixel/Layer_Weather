import type { WeatherData, OutfitRecommendation, WeatherCondition } from "@/types";

export const WEATHER_CACHE_KEY = "wt_weather_cache";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface WeatherCachePayload {
  weather: WeatherData;
  outfit: OutfitRecommendation;
  savedAt: string;
}

function serializeForCache(data: WeatherData): Record<string, unknown> {
  return {
    ...data,
    current: { ...data.current, updatedAt: data.current.updatedAt.toISOString() },
    hourly: data.hourly.map((h) => ({ ...h, time: h.time.toISOString() })),
    daily: data.daily.map((d) => ({
      ...d,
      date: d.date.toISOString(),
      sunrise: d.sunrise.toISOString(),
      sunset: d.sunset.toISOString(),
    })),
    nextHourPrecip: data.nextHourPrecip
      ? { ...data.nextHourPrecip, startTime: data.nextHourPrecip.startTime.toISOString() }
      : null,
  };
}

function reviveWeather(raw: Record<string, unknown>): WeatherData {
  const cur = raw.current as Record<string, unknown>;
  const hourlyRaw = raw.hourly as Record<string, unknown>[];
  const dailyRaw = raw.daily as Record<string, unknown>[];
  const nextRaw = raw.nextHourPrecip as Record<string, unknown> | null;

  return {
    current: {
      temp: cur.temp as number,
      feelsLike: cur.feelsLike as number,
      humidity: cur.humidity as number,
      windSpeed: cur.windSpeed as number,
      windDirection: cur.windDirection as number,
      precipProb: cur.precipProb as number,
      uvIndex: (cur.uvIndex as number) ?? 0,
      condition: cur.condition as WeatherCondition,
      weatherCode: cur.weatherCode as number,
      isDay: cur.isDay as boolean,
      location: cur.location as string,
      updatedAt: new Date(cur.updatedAt as string),
    },
    hourly: (hourlyRaw ?? []).map((h) => ({
      time: new Date(h.time as string),
      temp: h.temp as number,
      feelsLike: h.feelsLike as number,
      precipProb: h.precipProb as number,
      condition: h.condition as WeatherCondition,
      weatherCode: h.weatherCode as number,
      windSpeed: h.windSpeed as number,
      isDay: h.isDay as boolean,
    })),
    daily: (dailyRaw ?? []).map((d) => ({
      date: new Date(d.date as string),
      tempMin: d.tempMin as number,
      tempMax: d.tempMax as number,
      feelsLikeMin: d.feelsLikeMin as number,
      feelsLikeMax: d.feelsLikeMax as number,
      precipProb: d.precipProb as number,
      condition: d.condition as WeatherCondition,
      weatherCode: d.weatherCode as number,
      sunrise: new Date(d.sunrise as string),
      sunset: new Date(d.sunset as string),
    })),
    nextHourPrecip: nextRaw
      ? {
          startTime: new Date(nextRaw.startTime as string),
          minutes: nextRaw.minutes as { precipIntensity: number; precipProbability: number }[],
        }
      : null,
    _source: raw._source as WeatherData["_source"],
  };
}

export async function saveWeatherCache(
  weather: WeatherData,
  outfit: OutfitRecommendation,
): Promise<void> {
  const stored = {
    weather: serializeForCache(weather),
    outfit,
    savedAt: new Date().toISOString(),
  };
  const json = JSON.stringify(stored);
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key: WEATHER_CACHE_KEY, value: json });
  } catch {
    localStorage.setItem(WEATHER_CACHE_KEY, json);
  }
}

export async function loadWeatherCache(): Promise<WeatherCachePayload | null> {
  let raw: string | null = null;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: WEATHER_CACHE_KEY });
    raw = value;
  } catch {
    raw = localStorage.getItem(WEATHER_CACHE_KEY);
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      weather: Record<string, unknown>;
      outfit: OutfitRecommendation;
      savedAt: string;
    };
    if (Date.now() - new Date(parsed.savedAt).getTime() > CACHE_TTL_MS) return null;
    return {
      weather: reviveWeather(parsed.weather),
      outfit: parsed.outfit,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export async function clearWeatherCache(): Promise<void> {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.remove({ key: WEATHER_CACHE_KEY });
  } catch {
    /* ignore */
  }
  localStorage.removeItem(WEATHER_CACHE_KEY);
}
