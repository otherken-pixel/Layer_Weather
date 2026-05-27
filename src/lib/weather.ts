import { supabase } from "./supabase";
import { NOMINATIM_HEADERS } from "@/lib/nominatim";
import { invokeNWSWeather } from "./nwsService";
import { fetchEPAAQI } from "./epaService";
import type {
  WeatherData,
  CurrentWeather,
  HourlyForecast,
  DailyForecast,
  WeatherCondition,
  ForecastConfidence,
  EPAObservation,
} from "@/types";

export { fetchNWSAlerts } from "./nwsService";

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

function requireFiniteNumber(value: unknown, field: string): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) throw new Error(`Invalid weather field: ${field}`);
  return n;
}

function requireCondition(value: unknown): WeatherCondition {
  const s = String(value);
  const allowed: WeatherCondition[] = [
    "clear", "partly_cloudy", "cloudy", "foggy", "drizzle",
    "rain", "heavy_rain", "snow", "thunderstorm",
  ];
  if (!allowed.includes(s as WeatherCondition)) throw new Error(`Invalid weather condition: ${s}`);
  return s as WeatherCondition;
}

/** Keep current + future hours; allow one hour in the past so "now" is not dropped. */
function filterHourlyFromNow(hourly: HourlyForecast[]): HourlyForecast[] {
  const cutoff = Date.now() - 60 * 60 * 1000;
  return hourly.filter((h) => h.time.getTime() >= cutoff);
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
  if (code <= 84) return "heavy_rain";
  if (code <= 86) return "snow";
  return "thunderstorm";
}

// ── Parse edge function JSON into WeatherData (converts ISO strings → Dates) ──
function parseEdgeResponse(raw: Record<string, unknown>): WeatherData {
  const cur = raw.current as Record<string, unknown>;
  if (!cur || typeof cur !== "object") throw new Error("Invalid weather response: missing current");

  const hourlyRaw = raw.hourly as Record<string, unknown>[];
  const dailyRaw = raw.daily as Record<string, unknown>[];
  const nextRaw = raw.nextHourPrecip as Record<string, unknown> | null;

  const updatedAtRaw = cur.updatedAt as string;
  const updatedAt = updatedAtRaw ? new Date(updatedAtRaw) : new Date();
  if (Number.isNaN(updatedAt.getTime())) throw new Error("Invalid weather response: updatedAt");

  function optionalNumber(v: unknown): number | null {
    if (v == null) return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  }

  const current: CurrentWeather = {
    temp: requireFiniteNumber(cur.temp, "current.temp"),
    feelsLike: requireFiniteNumber(cur.feelsLike, "current.feelsLike"),
    humidity: requireFiniteNumber(cur.humidity, "current.humidity"),
    windSpeed: requireFiniteNumber(cur.windSpeed, "current.windSpeed"),
    windDirection: requireFiniteNumber(cur.windDirection, "current.windDirection"),
    precipProb: requireFiniteNumber(cur.precipProb, "current.precipProb"),
    uvIndex: requireFiniteNumber(cur.uvIndex ?? 0, "current.uvIndex"),
    aqiIndex: null,
    condition: requireCondition(cur.condition),
    weatherCode: requireFiniteNumber(cur.weatherCode, "current.weatherCode"),
    isDay: Boolean(cur.isDay),
    location: String(cur.location ?? ""),
    updatedAt,
    windGust: optionalNumber(cur.windGust),
    pressure: optionalNumber(cur.pressure),
    visibility: optionalNumber(cur.visibility),
    dewPoint: optionalNumber(cur.dewPoint),
  };

  const hourly: HourlyForecast[] = filterHourlyFromNow(
    (hourlyRaw ?? []).map((h) => {
      const tProb = optionalNumber(h.thunderstormProb);
      return {
        time: new Date(h.time as string),
        temp: requireFiniteNumber(h.temp, "hourly.temp"),
        feelsLike: requireFiniteNumber(h.feelsLike, "hourly.feelsLike"),
        precipProb: requireFiniteNumber(h.precipProb, "hourly.precipProb"),
        condition: requireCondition(h.condition),
        weatherCode: requireFiniteNumber(h.weatherCode, "hourly.weatherCode"),
        windSpeed: requireFiniteNumber(h.windSpeed, "hourly.windSpeed"),
        windDirection: h.windDirection != null
          ? requireFiniteNumber(h.windDirection, "hourly.windDirection")
          : undefined,
        isDay: Boolean(h.isDay),
        ...(tProb != null ? { thunderstormProb: tProb } : {}),
      };
    }).filter((h) => !Number.isNaN(h.time.getTime())),
  );

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

// ── Secondary: NWS via Supabase Edge Function (US only) ──────────────────────
async function fetchFromNWS(latitude: number, longitude: number): Promise<WeatherData> {
  const record = await invokeNWSWeather(latitude, longitude);
  const parsed = parseEdgeResponse(record);
  parsed._source = "nws";
  return parsed;
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
      "wind_gusts_10m", "pressure_msl", "visibility", "dew_point_2m",
    ].join(","),
    hourly: [
      "temperature_2m", "apparent_temperature", "precipitation_probability",
      "weather_code", "wind_speed_10m", "wind_direction_10m", "is_day",
      "thunderstorm_probability", "pressure_msl",
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
    past_hours: "3",
  });

  const res = await fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const json = await res.json();

  const cur = json.current as Record<string, unknown>;
  const hourly = json.hourly as Record<string, unknown[]>;
  const daily = json.daily as Record<string, unknown[]>;

  // Compute pressure trend from first 4 hourly entries (past_hours=3 gives us 3h history)
  function computePressureTrend(times: string[], pressures: (number | null)[]): "rising" | "falling" | "steady" | null {
    const nowMs = Date.now();
    let curIdx = -1;
    for (let i = 0; i < times.length; i++) {
      if (new Date(times[i]).getTime() <= nowMs) curIdx = i;
    }
    if (curIdx < 3) return null;
    const pNow = pressures[curIdx];
    const p3hAgo = pressures[curIdx - 3];
    if (pNow == null || p3hAgo == null) return null;
    const diff = pNow - p3hAgo;
    if (diff >= 1) return "rising";
    if (diff <= -1) return "falling";
    return "steady";
  }

  const pressureTrend = computePressureTrend(
    hourly.time as string[],
    (hourly.pressure_msl as (number | null)[] | undefined) ?? [],
  );

  const rawGust = cur.wind_gusts_10m as number | undefined;
  const rawWind = cur.wind_speed_10m as number;
  const rawVisibility = cur.visibility as number | undefined;
  const rawDewPoint = cur.dew_point_2m as number | undefined;
  const rawPressure = cur.pressure_msl as number | undefined;

  const current: CurrentWeather = {
    temp: Math.round(cur.temperature_2m as number),
    feelsLike: Math.round(cur.apparent_temperature as number),
    humidity: Math.round(cur.relative_humidity_2m as number),
    windSpeed: Math.round(rawWind),
    windDirection: Math.round(cur.wind_direction_10m as number),
    precipProb: Math.round(cur.precipitation_probability as number),
    uvIndex: 0,
    aqiIndex: null,
    condition: wmoToCondition(cur.weather_code as number),
    weatherCode: cur.weather_code as number,
    isDay: (cur.is_day as number) === 1,
    location: "",
    updatedAt: new Date(),
    windGust: rawGust != null && rawGust > rawWind + 2 ? Math.round(rawGust) : null,
    pressure: rawPressure != null ? Math.round(rawPressure) : null,
    pressureTrend,
    visibility: rawVisibility != null ? Math.round((rawVisibility / 1609.34) * 10) / 10 : null,
    dewPoint: rawDewPoint != null ? Math.round(rawDewPoint) : null,
  };

  const hourlyTimes = hourly.time as string[];
  const thunderstormProbArr = hourly.thunderstorm_probability as (number | null)[] | undefined;
  const hourlyData: HourlyForecast[] = hourlyTimes
    .map((t, i) => {
      const tProb = thunderstormProbArr?.[i];
      return {
        time: new Date(t),
        temp: Math.round((hourly.temperature_2m as number[])[i]),
        feelsLike: Math.round((hourly.apparent_temperature as number[])[i]),
        precipProb: Math.round((hourly.precipitation_probability as number[])[i]),
        condition: wmoToCondition((hourly.weather_code as number[])[i]),
        weatherCode: (hourly.weather_code as number[])[i],
        windSpeed: Math.round((hourly.wind_speed_10m as number[])[i]),
        windDirection: Math.round((hourly.wind_direction_10m as number[])[i]),
        isDay: (hourly.is_day as number[])[i] === 1,
        ...(tProb != null ? { thunderstormProb: Math.round(tProb) } : {}),
      };
    })
    .filter((h) => !Number.isNaN(h.time.getTime()));

  const hourlyFiltered = filterHourlyFromNow(hourlyData);

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

  return { current, hourly: hourlyFiltered, daily: dailyData, nextHourPrecip: null, _source: "open-meteo" };
}

// ── Pollen Data (Open-Meteo Air Quality API) ──────────────────────────────────
export async function fetchPollenData(
  latitude: number,
  longitude: number,
): Promise<import("@/types").PollenData | null> {
  try {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      hourly: [
        "alder_pollen", "birch_pollen", "grass_pollen",
        "mugwort_pollen", "ragweed_pollen", "olive_pollen",
      ].join(","),
      timezone: "auto",
      forecast_days: "1",
    });
    const res = await fetchWithTimeout(
      `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`,
      {},
      8_000,
    );
    if (!res.ok) return null;
    const json = await res.json();
    const h = json?.hourly as Record<string, (number | null)[]> | undefined;
    if (!h) return null;

    // Find the current hour index
    const times = h.time as unknown as string[] | undefined;
    if (!times || times.length === 0) return null;
    const nowMs = Date.now();
    let curIdx = 0;
    for (let i = 0; i < times.length; i++) {
      if (new Date(times[i]).getTime() <= nowMs) curIdx = i;
    }

    const curVal = (key: string): number | null => {
      const arr = h![key];
      return arr && arr[curIdx] != null ? arr[curIdx] : null;
    };

    const pollenLevel = (grains: number | null): import("@/types").PollenLevel | null => {
      if (grains == null) return null;
      if (grains < 10) return "low";
      if (grains < 50) return "moderate";
      if (grains < 150) return "high";
      return "very_high";
    };

    const alder = curVal("alder_pollen");
    const birch = curVal("birch_pollen");
    const olive = curVal("olive_pollen");
    const grass = curVal("grass_pollen");
    const mugwort = curVal("mugwort_pollen");
    const ragweed = curVal("ragweed_pollen");

    const treeMax = Math.max(alder ?? 0, birch ?? 0, olive ?? 0);
    const weedMax = Math.max(mugwort ?? 0, ragweed ?? 0);
    const tree = treeMax > 0 ? treeMax : null;
    const weed = weedMax > 0 ? weedMax : null;

    const candidates: Array<{ type: "tree" | "grass" | "weed"; val: number }> = [];
    if (tree != null) candidates.push({ type: "tree", val: tree });
    if (grass != null) candidates.push({ type: "grass", val: grass });
    if (weed != null) candidates.push({ type: "weed", val: weed });

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.val - a.val);
    const dominant = candidates[0].type;

    const levels = candidates.map((c) => pollenLevel(c.val));
    const ORDER: Array<import("@/types").PollenLevel> = ["very_high", "high", "moderate", "low"];
    const level = ORDER.find((l) => levels.includes(l)) ?? null;

    return { tree, grass, weed, dominant, level };
  } catch {
    return null;
  }
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

/** Three-tier weather fetch: WeatherKit → NWS (US only) → Open-Meteo. */
export async function fetchWeatherData(
  latitude: number,
  longitude: number,
  opts?: { countryCode?: string },
): Promise<WeatherData> {
  try {
    return await fetchFromEdgeFunction(latitude, longitude, opts?.countryCode);
  } catch (err) {
    console.warn("WeatherKit unavailable:", err);
    const cc = (opts?.countryCode ?? "").toUpperCase();
    if (cc === "US" || cc === "") {
      try {
        return await fetchFromNWS(latitude, longitude);
      } catch (nwsErr) {
        console.warn("NWS unavailable, using Open-Meteo fallback:", nwsErr);
      }
    }
    return fetchFromOpenMeteo(latitude, longitude);
  }
}

/** Converts a wind direction in degrees (0–360) to a 16-point cardinal string. */
export function degreesToCardinal(deg: number): string {
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

/**
 * AQI with source preference: EPA AirNow (US primary) → Open-Meteo AQ fallback.
 * Always resolves — returns null aqi when no data is available.
 */
export async function fetchAQIBestSource(
  latitude: number,
  longitude: number,
  countryCode?: string,
): Promise<{ aqi: number | null; breakdown: EPAObservation[]; forecastAqi: number | null; forecastCategory: string | null }> {
  const cc = (countryCode ?? "").toUpperCase();
  if (cc === "US" || cc === "") {
    const result = await fetchEPAAQI(latitude, longitude);
    if (result.aqi !== null) return result;
  }
  const aqi = await fetchAQIIndex(latitude, longitude);
  return { aqi, breakdown: [], forecastAqi: null, forecastCategory: null };
}

function toLocalDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Fetch daily forecasts for a specific date range using Apple WeatherKit (primary)
 * or Open-Meteo (fallback / extended range). Returns null when the trip is more
 * than 16 days away (no reliable forecast exists yet).
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
  const daysToDeparture = Math.ceil((depMidnight - todayMidnight) / 86400000);
  const daysToReturn = Math.ceil((retMidnight - todayMidnight) / 86400000);

  // If even the departure is beyond 16 days, no forecast data exists yet
  if (daysToDeparture > 16) return null;

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

  const expectedDays = Math.round((retMidnight - depMidnight) / 86400000) + 1;

  return { forecasts, isForecastComplete: forecasts.length >= expectedDays };
}

// ── Reverse geocode via Nominatim ─────────────────────────────────────────────
export async function reverseGeocodePlace(lat: number, lon: number): Promise<ReverseGeocodePlace> {
  try {
    const res = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: NOMINATIM_HEADERS },
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

// ── NOAA forecast confidence (US only) ────────────────────────────────────────
export async function fetchNOAAConfidence(
  latitude: number,
  longitude: number,
  weatherkitPrecipProbs: number[],
): Promise<ForecastConfidence> {
  try {
    const { data, error } = await supabase.functions.invoke("noaa-forecast", {
      body: { lat: latitude, lon: longitude },
    });
    if (error || !data || typeof data !== "object") return null;
    const rec = data as Record<string, unknown>;
    if (rec.error) return null;
    if (typeof rec.noaaPop !== "number") return null;

    const noaaPop = rec.noaaPop;
    const wkAvg =
      weatherkitPrecipProbs.length > 0
        ? weatherkitPrecipProbs.reduce((s, v) => s + v, 0) / weatherkitPrecipProbs.length
        : null;

    if (wkAvg === null) return null;
    const diff = Math.abs(noaaPop - wkAvg);
    if (diff < 15) return "high";
    if (diff < 35) return "medium";
    return "low";
  } catch {
    return null;
  }
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
