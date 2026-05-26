import type {
  WeatherData,
  OutfitRecommendation,
  WeatherCondition,
  DayOutfitTimeline,
} from "@/types";
import type { CachedCityWeather } from "@/store";

export const WEATHER_CACHE_KEY = "wt_weather_cache";
export const CITY_WEATHER_CACHE_PREFIX = "wt_city_weather_";

/** Maximum age for offline / failure fallback weather data. */
export const WEATHER_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export interface WeatherCachePayload {
  weather: WeatherData;
  outfit: OutfitRecommendation;
  savedAt: string;
}

export function isWeatherCacheFresh(savedAt: string | Date): boolean {
  const t = typeof savedAt === "string" ? new Date(savedAt).getTime() : savedAt.getTime();
  return Date.now() - t <= WEATHER_CACHE_MAX_AGE_MS;
}

function cityCacheStorageKey(cacheKey: string): string {
  return `${CITY_WEATHER_CACHE_PREFIX}${cacheKey}`;
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
      aqiIndex: (cur.aqiIndex as number | null) ?? null,
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
      windDirection: h.windDirection as number | undefined,
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

async function storageSet(key: string, value: string): Promise<void> {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key, value });
  } catch {
    localStorage.setItem(key, value);
  }
}

async function storageGet(key: string): Promise<string | null> {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key });
    return value;
  } catch {
    return localStorage.getItem(key);
  }
}

async function storageRemove(key: string): Promise<void> {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.remove({ key });
  } catch {
    /* ignore */
  }
  localStorage.removeItem(key);
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
  await storageSet(WEATHER_CACHE_KEY, JSON.stringify(stored));
}

export async function loadWeatherCache(): Promise<WeatherCachePayload | null> {
  const raw = await storageGet(WEATHER_CACHE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      weather: Record<string, unknown>;
      outfit: OutfitRecommendation;
      savedAt: string;
    };
    if (!isWeatherCacheFresh(parsed.savedAt)) return null;
    return {
      weather: reviveWeather(parsed.weather),
      outfit: parsed.outfit,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export async function saveCityWeatherCache(
  cacheKey: string,
  entry: CachedCityWeather,
): Promise<void> {
  const stored = {
    weather: serializeForCache(entry.weather),
    outfit: entry.outfit,
    outfitTimeline: entry.outfitTimeline,
    fetchedAt: entry.fetchedAt.toISOString(),
  };
  await storageSet(cityCacheStorageKey(cacheKey), JSON.stringify(stored));
}

export async function loadCityWeatherCache(
  cacheKey: string,
): Promise<CachedCityWeather | null> {
  const raw = await storageGet(cityCacheStorageKey(cacheKey));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      weather: Record<string, unknown>;
      outfit: OutfitRecommendation;
      outfitTimeline: DayOutfitTimeline | null;
      fetchedAt: string;
    };
    if (!isWeatherCacheFresh(parsed.fetchedAt)) return null;
    return {
      weather: reviveWeather(parsed.weather),
      outfit: parsed.outfit,
      outfitTimeline: parsed.outfitTimeline ?? null,
      fetchedAt: new Date(parsed.fetchedAt),
    };
  } catch {
    return null;
  }
}

export async function clearWeatherCache(): Promise<void> {
  await storageRemove(WEATHER_CACHE_KEY);
  const cityKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(CITY_WEATHER_CACHE_PREFIX)) cityKeys.push(k);
  }
  for (const k of cityKeys) {
    localStorage.removeItem(k);
  }
}
