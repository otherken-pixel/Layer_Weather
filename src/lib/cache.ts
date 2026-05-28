import type {
  WeatherData,
  OutfitRecommendation,
  WeatherCondition,
  DayOutfitTimeline,
} from "@/types";
import type { CachedCityWeather } from "@/store";

function requireNum(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function requireBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

const ALLOWED_CONDITIONS: WeatherCondition[] = [
  "clear", "partly_cloudy", "cloudy", "foggy", "drizzle",
  "rain", "heavy_rain", "snow", "thunderstorm",
];
function safeCondition(v: unknown): WeatherCondition {
  return ALLOWED_CONDITIONS.includes(v as WeatherCondition)
    ? (v as WeatherCondition)
    : "cloudy";
}

export const WEATHER_CACHE_KEY = "wt_weather_cache";
export const CITY_WEATHER_CACHE_PREFIX = "wt_city_weather_";
const CITY_CACHE_MANIFEST_KEY = "wt_city_weather_manifest";

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
  return `${CITY_WEATHER_CACHE_PREFIX}${encodeURIComponent(cacheKey)}`;
}

async function loadCityCacheManifest(): Promise<string[]> {
  const raw = await storageGet(CITY_CACHE_MANIFEST_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((k) => typeof k === "string") : [];
  } catch {
    return [];
  }
}

async function registerCityCacheKey(cacheKey: string): Promise<void> {
  const keys = await loadCityCacheManifest();
  if (keys.includes(cacheKey)) return;
  keys.push(cacheKey);
  await storageSet(CITY_CACHE_MANIFEST_KEY, JSON.stringify(keys));
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
  if (!cur || typeof cur !== "object") throw new Error("Invalid cached weather: missing current");

  const hourlyRaw = (raw.hourly as Record<string, unknown>[] | undefined) ?? [];
  const dailyRaw  = (raw.daily  as Record<string, unknown>[] | undefined) ?? [];
  const nextRaw   = raw.nextHourPrecip as Record<string, unknown> | null;

  const updatedAt = new Date(cur.updatedAt as string);
  if (Number.isNaN(updatedAt.getTime())) throw new Error("Invalid cached weather: bad updatedAt");

  return {
    current: {
      temp:          requireNum(cur.temp),
      feelsLike:     requireNum(cur.feelsLike),
      humidity:      requireNum(cur.humidity),
      windSpeed:     requireNum(cur.windSpeed),
      windDirection: requireNum(cur.windDirection),
      precipProb:    requireNum(cur.precipProb),
      uvIndex:       requireNum(cur.uvIndex),
      aqiIndex:      cur.aqiIndex != null ? requireNum(cur.aqiIndex) : null,
      condition:     safeCondition(cur.condition),
      weatherCode:   requireNum(cur.weatherCode),
      isDay:         requireBool(cur.isDay),
      windGust:      cur.windGust != null ? requireNum(cur.windGust) : null,
      pressure:      cur.pressure != null ? requireNum(cur.pressure) : null,
      visibility:    cur.visibility != null ? requireNum(cur.visibility) : null,
      dewPoint:      cur.dewPoint != null ? requireNum(cur.dewPoint) : null,
      pressureTrend: (cur.pressureTrend as "rising" | "falling" | "steady" | null) ?? null,
      location:      typeof cur.location === "string" ? cur.location : "",
      updatedAt,
    },
    hourly: hourlyRaw.flatMap((h) => {
      const t = new Date(h.time as string);
      if (Number.isNaN(t.getTime())) return [];
      return [{
        time:         t,
        temp:         requireNum(h.temp),
        feelsLike:    requireNum(h.feelsLike),
        precipProb:   requireNum(h.precipProb),
        condition:    safeCondition(h.condition),
        weatherCode:  requireNum(h.weatherCode),
        windSpeed:    requireNum(h.windSpeed),
        windDirection: h.windDirection != null ? requireNum(h.windDirection) : undefined,
        isDay:        requireBool(h.isDay),
        ...(h.thunderstormProb != null ? { thunderstormProb: requireNum(h.thunderstormProb) } : {}),
      }];
    }),
    daily: dailyRaw.flatMap((d) => {
      const date    = new Date(d.date as string);
      const sunrise = new Date(d.sunrise as string);
      const sunset  = new Date(d.sunset as string);
      if (Number.isNaN(date.getTime())) return [];
      return [{
        date,
        tempMin:      requireNum(d.tempMin),
        tempMax:      requireNum(d.tempMax),
        feelsLikeMin: requireNum(d.feelsLikeMin),
        feelsLikeMax: requireNum(d.feelsLikeMax),
        precipProb:   requireNum(d.precipProb),
        condition:    safeCondition(d.condition),
        weatherCode:  requireNum(d.weatherCode),
        sunrise,
        sunset,
      }];
    }),
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
  await registerCityCacheKey(cacheKey);
}

async function readCityCacheEntry(storageKey: string): Promise<CachedCityWeather | null> {
  const raw = await storageGet(storageKey);
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

/** Drops one city from persisted cache (e.g. when user removes a saved tab). */
export async function removeCityWeatherCache(cacheKey: string): Promise<void> {
  await storageRemove(cityCacheStorageKey(cacheKey));

  const legacyCity = cacheKey.includes("|") ? cacheKey.split("|")[0] : null;
  if (legacyCity && legacyCity !== cacheKey) {
    await storageRemove(cityCacheStorageKey(legacyCity));
  }

  const keys = await loadCityCacheManifest();
  let next = keys.filter((k) => k !== cacheKey);
  if (legacyCity && legacyCity !== cacheKey) {
    next = next.filter((k) => k !== legacyCity);
  }
  if (next.length !== keys.length) {
    await storageSet(CITY_CACHE_MANIFEST_KEY, JSON.stringify(next));
  }
}

export async function loadCityWeatherCache(
  cacheKey: string,
): Promise<CachedCityWeather | null> {
  const primary = await readCityCacheEntry(cityCacheStorageKey(cacheKey));
  if (primary) return primary;

  // Legacy entries keyed by city name only (pre composite-key migration).
  const legacyCity = cacheKey.includes("|") ? cacheKey.split("|")[0] : null;
  if (legacyCity && legacyCity !== cacheKey) {
    return readCityCacheEntry(cityCacheStorageKey(legacyCity));
  }
  return null;
}

export async function clearWeatherCache(): Promise<void> {
  await storageRemove(WEATHER_CACHE_KEY);

  const manifestKeys = await loadCityCacheManifest();
  for (const cacheKey of manifestKeys) {
    await storageRemove(cityCacheStorageKey(cacheKey));
  }
  await storageRemove(CITY_CACHE_MANIFEST_KEY);

  const storageKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(CITY_WEATHER_CACHE_PREFIX)) storageKeys.push(k);
  }
  for (const k of storageKeys) {
    localStorage.removeItem(k);
  }
}
