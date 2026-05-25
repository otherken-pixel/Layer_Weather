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
    aqiIndex: null,
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

export interface ReverseGeocodePlace {
  city: string;
  /** ISO 3166-1 alpha-2, upper-case (e.g. US, GB). */
  countryCode: string;
}

// ── Primary: WeatherKit via Supabase Edge Function ────────────────────────────
async function fetchFromEdgeFunction(
  latitude: number,
  longitude: number,
  countryCodeHint?: string,
): Promise<WeatherData> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let countryCode = "US";
  const trimmedHint = countryCodeHint?.trim();
  if (trimmedHint) {
    countryCode = trimmedHint.length >= 2 ? trimmedHint.slice(0, 2).toUpperCase() : trimmedHint;
  } else {
    try {
      const locale = new Intl.Locale(navigator.language);
      if (locale.region) countryCode = locale.region;
    } catch { /* keep US */ }
  }

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
  forecastDays = 7,
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
    forecast_days: forecastDays.toString(),
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
    uvIndex: 0,
    aqiIndex: null,
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
    .filter((h) => h.time >= now);

  const dailyData: DailyForecast[] = (daily.time as string[]).map((t, i) => ({
    date: parseLocalDateOnly(t),
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

// ── Air Quality Index (Open-Meteo Air Quality API, free) ─────────────────────
export async function fetchAQIIndex(
  latitude: number,
  longitude: number,
): Promise<number | null> {
  try {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      current: "us_aqi",
    });
    const res = await fetchWithTimeout(
      `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`,
      {},
      8_000,
    );
    if (!res.ok) return null;
    const json = await res.json();
    const val = (json?.current as Record<string, unknown>)?.us_aqi;
    return typeof val === "number" ? Math.round(val) : null;
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function fetchWeatherData(
  latitude: number,
  longitude: number,
  opts?: { countryCode?: string },
): Promise<WeatherData> {
  try {
    return await fetchFromEdgeFunction(latitude, longitude, opts?.countryCode);
  } catch (err) {
    console.warn("WeatherKit edge function unavailable, using Open-Meteo fallback:", err);
    return fetchFromOpenMeteo(latitude, longitude);
  }
}

function toLocalDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Fetch daily forecasts for a specific date range using Apple WeatherKit (primary)
 * or Open-Meteo (fallback / extended range). Returns null when departure is 16 or
 * more calendar days away (outside Open-Meteo's 16-day window), matching UI gating.
 */
export async function fetchWeatherForDateRange(
  latitude: number,
  longitude: number,
  departureDate: Date,
  returnDate: Date,
  opts?: { countryCode?: string },
): Promise<{ forecasts: DailyForecast[]; isForecastComplete: boolean } | null> {
  const today = new Date();
  const todayKey = toLocalDayKey(today);
  const depKey = toLocalDayKey(departureDate);
  const retKey = toLocalDayKey(returnDate);

  const todayMidnight = new Date(todayKey + "T00:00:00").getTime();
  const depMidnight = new Date(depKey + "T00:00:00").getTime();
  const retMidnight = new Date(retKey + "T00:00:00").getTime();
  const daysUntilDep = Math.ceil((depMidnight - todayMidnight) / 86400000);
  const daysToReturn = Math.ceil((retMidnight - todayMidnight) / 86400000);

  if (daysUntilDep >= 16) return null;

  let allDaily: DailyForecast[];

  if (daysToReturn <= 10) {
    try {
      allDaily = (await fetchFromEdgeFunction(latitude, longitude, opts?.countryCode)).daily;
    } catch (err) {
      console.warn("WeatherKit unavailable for date-range fetch, using Open-Meteo:", err);
      allDaily = (await fetchFromOpenMeteo(latitude, longitude, 16)).daily;
    }
  } else {
    allDaily = (await fetchFromOpenMeteo(latitude, longitude, 16)).daily;
  }

  const forecasts = allDaily.filter((d) => {
    const key = toLocalDayKey(d.date);
    return key >= depKey && key <= retKey;
  });

  const expectedDays = Math.round((retMidnight - new Date(depKey + "T00:00:00").getTime()) / 86400000) + 1;

  return { forecasts, isForecastComplete: forecasts.length >= expectedDays };
}

// ── Reverse geocode via Nominatim ─────────────────────────────────────────────
export async function reverseGeocodePlace(lat: number, lon: number): Promise<ReverseGeocodePlace> {
  try {
    const res = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { "Accept-Language": "en" } },
      8_000,
    );
    if (!res.ok) return { city: "Your Location", countryCode: "US" };
    const json = await res.json();
    const addr = json.address as Record<string, string> | undefined;
    const city =
      addr?.city || addr?.town || addr?.village || addr?.county || "Your Location";
    const rawCc = addr?.country_code;
    const countryCode =
      typeof rawCc === "string" && rawCc.length >= 2 ? rawCc.slice(0, 2).toUpperCase() : "US";
    return { city, countryCode };
  } catch {
    return { city: "Your Location", countryCode: "US" };
  }
}

/** @deprecated Prefer reverseGeocodePlace for country-aware weather. */
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const { city } = await reverseGeocodePlace(lat, lon);
  return city;
}

// ── Group hourly forecasts by calendar day ────────────────────────────────────

/** Open-Meteo daily `time` is date-only (YYYY-MM-DD); `new Date` would parse as UTC and skew local calendar keys. */
function parseLocalDateOnly(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function groupHourlyByDay(
  hourly: HourlyForecast[],
  daily: DailyForecast[],
): Record<string, HourlyForecast[]> {
  const result: Record<string, HourlyForecast[]> = {};
  for (const day of daily) {
    result[localDateKey(day.date)] = [];
  }
  for (const h of hourly) {
    const key = localDateKey(h.time);
    if (key in result) {
      result[key].push(h);
    }
  }
  return result;
}

// ── Significant change detection (used for commute alerts) ────────────────────
export function detectSignificantChanges(
  hourly: HourlyForecast[],
  currentFeelsLike: number,
): Array<{ hour: Date; message: string; feelsLike: number; type: "info" | "warning" }> {
  const alerts: Array<{ hour: Date; message: string; feelsLike: number; type: "info" | "warning" }> = [];
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
        type: "info",
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
        type: "warning",
      });
    }
  }

  return alerts.slice(0, 2);
}
