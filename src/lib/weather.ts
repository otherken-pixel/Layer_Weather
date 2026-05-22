import { supabase } from "./supabase";
import type {
  WeatherData,
  CurrentWeather,
  HourlyForecast,
  DailyForecast,
  WeatherCondition,
} from "@/types";

const WEATHER_FETCH_TIMEOUT_MS = 12_000;
const WEATHER_MAX_RETRIES = 2;

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = WEATHER_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry<T>(fn: () => Promise<T>, retries = WEATHER_MAX_RETRIES): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === retries) break;
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
  throw lastError;
}

// ── WMO → app condition (used by Open-Meteo fallback + detectSignificantChanges) ──
function wmoToCondition(code: number): WeatherCondition {
  if (code === 0) return "clear";
  if (code <= 2) return "partly_cloudy";
  if (code <= 3) return "cloudy";
  if (code <= 48) return "foggy";
  if (code <= 57) return "drizzle";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "rain";
  if (code <= 86) return "heavy_rain";
  return "thunderstorm";
}

// ── Parse edge function JSON into WeatherData (converts ISO strings → Dates) ──
function parseEdgeResponse(raw: Record<string, unknown>): WeatherData {
  const cur = raw.current as Record<string, unknown>;
  const hourlyRaw = raw.hourly as Record<string, unknown>[];
  const dailyRaw = raw.daily as Record<string, unknown>[];
  const nextRaw = raw.nextHourPrecip as Record<string, unknown> | null;

  const current: CurrentWeather = {
    temp: cur.temp as number,
    feelsLike: cur.feelsLike as number,
    humidity: cur.humidity as number,
    windSpeed: cur.windSpeed as number,
    windDirection: cur.windDirection as number,
    precipProb: cur.precipProb as number,
    uvIndex: cur.uvIndex as number ?? 0,
    condition: cur.condition as WeatherCondition,
    weatherCode: cur.weatherCode as number,
    isDay: cur.isDay as boolean,
    location: cur.location as string,
    updatedAt: new Date(cur.updatedAt as string),
  };

  const now = new Date();

  const hourly: HourlyForecast[] = (hourlyRaw ?? [])
    .map((h) => ({
      time: new Date(h.time as string),
      temp: h.temp as number,
      feelsLike: h.feelsLike as number,
      precipProb: h.precipProb as number,
      condition: h.condition as WeatherCondition,
      weatherCode: h.weatherCode as number,
      windSpeed: h.windSpeed as number,
      isDay: h.isDay as boolean,
    }))
    .filter((h) => h.time >= now);

  const daily: DailyForecast[] = (dailyRaw ?? []).map((d) => ({
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
  }));

  return {
    current,
    hourly,
    daily,
    nextHourPrecip: nextRaw
      ? {
          startTime: new Date(nextRaw.startTime as string),
          minutes: nextRaw.minutes as { precipIntensity: number; precipProbability: number }[],
        }
      : null,
  };
}

// ── Primary: WeatherKit via Supabase Edge Function ────────────────────────────
async function fetchFromEdgeFunction(
  latitude: number,
  longitude: number,
): Promise<WeatherData> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // countryCode is required by WeatherKit for forecastNextHour in many regions.
  // Intl.Locale is widely supported; fall back to "US" if unavailable.
  let countryCode = "US";
  try {
    const locale = new Intl.Locale(navigator.language);
    if (locale.region) countryCode = locale.region;
  } catch { /* keep default */ }

  const body = await withRetry(async () => {
    const { data, error } = await supabase.functions.invoke("weather", {
      body: { lat: latitude, lon: longitude, timezone, countryCode },
    });
    if (error) throw new Error(error.message);
    if (!data || typeof data !== "object") throw new Error("Empty weather response");
    const record = data as Record<string, unknown>;
    if ("error" in record && record.error) throw new Error(String(record.error));
    return record;
  });

  const parsed = parseEdgeResponse(body);
  parsed._source = (body._source as "weatherkit" | "open-meteo") ?? "weatherkit";
  return parsed;
}

// ── Fallback: Open-Meteo (used when edge function is unavailable) ─────────────
async function fetchFromOpenMeteo(
  latitude: number,
  longitude: number,
): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: [
      "temperature_2m", "apparent_temperature", "relative_humidity_2m",
      "wind_speed_10m", "wind_direction_10m", "precipitation_probability",
      "weather_code", "is_day",
    ].join(","),
    hourly: [
      "temperature_2m", "apparent_temperature", "precipitation_probability",
      "weather_code", "wind_speed_10m", "is_day",
    ].join(","),
    daily: [
      "temperature_2m_max", "temperature_2m_min",
      "apparent_temperature_max", "apparent_temperature_min",
      "precipitation_probability_max", "weather_code", "sunrise", "sunset",
    ].join(","),
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timezone: "auto",
    forecast_days: "7",
  });

  const res = await fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const json = await res.json();

  const cur = json.current as Record<string, unknown>;
  const hourly = json.hourly as Record<string, unknown[]>;
  const daily = json.daily as Record<string, unknown[]>;
  const now = new Date();

  const current: CurrentWeather = {
    temp: Math.round(cur.temperature_2m as number),
    feelsLike: Math.round(cur.apparent_temperature as number),
    humidity: Math.round(cur.relative_humidity_2m as number),
    windSpeed: Math.round(cur.wind_speed_10m as number),
    windDirection: Math.round(cur.wind_direction_10m as number),
    precipProb: Math.round(cur.precipitation_probability as number),
    uvIndex: 0, // Open-Meteo free tier doesn't include UV index
    condition: wmoToCondition(cur.weather_code as number),
    weatherCode: cur.weather_code as number,
    isDay: (cur.is_day as number) === 1,
    location: "",
    updatedAt: new Date(),
  };

  const hourlyTimes = hourly.time as string[];
  const hourlyData: HourlyForecast[] = hourlyTimes
    .map((t, i) => ({
      time: new Date(t),
      temp: Math.round((hourly.temperature_2m as number[])[i]),
      feelsLike: Math.round((hourly.apparent_temperature as number[])[i]),
      precipProb: Math.round((hourly.precipitation_probability as number[])[i]),
      condition: wmoToCondition((hourly.weather_code as number[])[i]),
      weatherCode: (hourly.weather_code as number[])[i],
      windSpeed: Math.round((hourly.wind_speed_10m as number[])[i]),
      isDay: (hourly.is_day as number[])[i] === 1,
    }))
    .filter((h) => h.time >= now)
    .slice(0, 48);

  const dailyData: DailyForecast[] = (daily.time as string[]).map((t, i) => ({
    date: new Date(t),
    tempMin: Math.round((daily.temperature_2m_min as number[])[i]),
    tempMax: Math.round((daily.temperature_2m_max as number[])[i]),
    feelsLikeMin: Math.round((daily.apparent_temperature_min as number[])[i]),
    feelsLikeMax: Math.round((daily.apparent_temperature_max as number[])[i]),
    precipProb: Math.round((daily.precipitation_probability_max as number[])[i]),
    condition: wmoToCondition((daily.weather_code as number[])[i]),
    weatherCode: (daily.weather_code as number[])[i],
    sunrise: new Date((daily.sunrise as string[])[i]),
    sunset: new Date((daily.sunset as string[])[i]),
  }));

  return { current, hourly: hourlyData, daily: dailyData, nextHourPrecip: null, _source: "open-meteo" };
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function fetchWeatherData(
  latitude: number,
  longitude: number,
): Promise<WeatherData> {
  try {
    return await fetchFromEdgeFunction(latitude, longitude);
  } catch (err) {
    console.warn("WeatherKit edge function unavailable, using Open-Meteo fallback:", err);
    return fetchFromOpenMeteo(latitude, longitude);
  }
}

// ── Reverse geocode via Nominatim ─────────────────────────────────────────────
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { "Accept-Language": "en" } },
      8_000,
    );
    if (!res.ok) return "Your Location";
    const json = await res.json();
    const addr = json.address;
    return addr.city || addr.town || addr.village || addr.county || "Your Location";
  } catch {
    return "Your Location";
  }
}

// ── Significant change detection (used for commute alerts) ────────────────────
export function detectSignificantChanges(
  hourly: HourlyForecast[],
  currentFeelsLike: number,
): Array<{ hour: Date; message: string; feelsLike: number }> {
  const alerts: Array<{ hour: Date; message: string; feelsLike: number }> = [];
  const now = new Date();
  const next12h = hourly.filter((h) => {
    const diff = (h.time.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diff > 0 && diff <= 12;
  });

  for (let i = 1; i < next12h.length; i++) {
    const delta = next12h[i].feelsLike - currentFeelsLike;
    const prev = next12h[i - 1].condition;
    const cur = next12h[i].condition;

    if (Math.abs(delta) >= 15) {
      const dir = delta < 0 ? "dropping" : "rising";
      alerts.push({
        hour: next12h[i].time,
        message: `Feels-like ${dir} ${Math.abs(delta)}° at ${next12h[i].time.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}`,
        feelsLike: next12h[i].feelsLike,
      });
    }
    if (
      prev !== "rain" && prev !== "heavy_rain" &&
      (cur === "rain" || cur === "heavy_rain")
    ) {
      alerts.push({
        hour: next12h[i].time,
        message: `Rain expected around ${next12h[i].time.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })} — grab an umbrella`,
        feelsLike: next12h[i].feelsLike,
      });
    }
  }

  return alerts.slice(0, 2);
}
