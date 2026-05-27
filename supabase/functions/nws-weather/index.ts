/**
 * NWS Weather Edge Function
 *
 * Two-step NWS fetch: /points/ → forecastHourly URL → hourly periods.
 * Returns a WeatherData-compatible JSON payload (same shape as the 'weather'
 * edge function) so parseEdgeResponse() in weather.ts works unchanged.
 *
 * US-only — returns { error: "outside_us", outside_us: true } for non-US coords.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NWS_HEADERS = {
  "User-Agent": "LayerWeather/1.0 (contact@weartoday.app)",
  "Accept": "application/geo+json",
};

const TIMEOUT_MS = 10_000;

// ── Types ─────────────────────────────────────────────────────────────────────

type WeatherCondition =
  | "clear" | "partly_cloudy" | "cloudy" | "foggy" | "drizzle"
  | "rain" | "heavy_rain" | "snow" | "thunderstorm";

interface NWSQuantityValue {
  value: number | null;
}

interface NWSHourlyPeriod {
  startTime: string;
  temperature: number;
  temperatureUnit: "F" | "C";
  windSpeed: string;
  windDirection: string;
  shortForecast: string;
  probabilityOfPrecipitation: NWSQuantityValue;
  relativeHumidity: NWSQuantityValue;
  isDaytime: boolean;
}

interface DailyBucket {
  temps: number[];
  feelsLikes: number[];
  precipProbs: number[];
  conditions: WeatherCondition[];
}

// ── Condition mapping ─────────────────────────────────────────────────────────

function nwsTextToCondition(text: string): WeatherCondition {
  const t = text.toLowerCase();
  if (/thunder/.test(t)) return "thunderstorm";
  if (/heavy rain|heavy shower/.test(t)) return "heavy_rain";
  if (/snow|blizzard|sleet|freezing rain/.test(t)) return "snow";
  if (/rain|shower/.test(t)) return "rain";
  if (/drizzle/.test(t)) return "drizzle";
  if (/fog|haze|mist/.test(t)) return "foggy";
  if (/overcast|mostly cloudy|considerable cloudiness/.test(t)) return "cloudy";
  if (/cloudy/.test(t)) return "cloudy";
  if (/partly|mostly clear|mostly sunny|partly sunny/.test(t)) return "partly_cloudy";
  if (/clear|sunny|fair/.test(t)) return "clear";
  return "partly_cloudy";
}

const CONDITION_WMO: Record<WeatherCondition, number> = {
  clear: 0,
  partly_cloudy: 2,
  cloudy: 3,
  foggy: 45,
  drizzle: 51,
  rain: 61,
  heavy_rain: 65,
  snow: 71,
  thunderstorm: 95,
};

const CONDITION_PRIORITY: Record<WeatherCondition, number> = {
  thunderstorm: 8, heavy_rain: 7, snow: 6, rain: 5,
  drizzle: 4, foggy: 3, cloudy: 2, partly_cloudy: 1, clear: 0,
};

// ── Parsing helpers ───────────────────────────────────────────────────────────

function parseWindMph(windSpeed: string): number {
  const m = windSpeed.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

const COMPASS: Record<string, number> = {
  N: 0, NNE: 22, NE: 45, ENE: 67, E: 90, ESE: 112, SE: 135, SSE: 157,
  S: 180, SSW: 202, SW: 225, WSW: 247, W: 270, WNW: 292, NW: 315, NNW: 337,
};
function parseWindDir(dir: string): number {
  return COMPASS[dir.toUpperCase()] ?? 0;
}

// ── Feels-like calculation ────────────────────────────────────────────────────

function windChill(tempF: number, windMph: number): number {
  if (tempF > 50 || windMph < 3) return tempF;
  return Math.round(
    35.74 + 0.6215 * tempF
    - 35.75 * Math.pow(windMph, 0.16)
    + 0.4275 * tempF * Math.pow(windMph, 0.16),
  );
}

function heatIndex(tempF: number, rh: number): number {
  const hi =
    -42.379 + 2.04901523 * tempF + 10.14333127 * rh
    - 0.22475541 * tempF * rh - 0.00683783 * tempF * tempF
    - 0.05391553 * rh * rh + 0.00122874 * tempF * tempF * rh
    + 0.00085282 * tempF * rh * rh - 0.00000199 * tempF * tempF * rh * rh;
  return Math.round(hi);
}

function apparentTemp(tempF: number, windMph: number, rh: number): number {
  if (tempF < 50) return windChill(tempF, windMph);
  if (tempF >= 80 && rh >= 40) return heatIndex(tempF, rh);
  return Math.round(tempF);
}

// ── NOAA simplified sunrise/sunset algorithm ──────────────────────────────────

function getSunTimes(latDeg: number, lonDeg: number, date: Date): { sunrise: string; sunset: string } {
  const D = Math.ceil((date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86400000);
  const γ = (2 * Math.PI / 365) * (D - 1);
  const eqtime =
    229.18 * (
      0.000075 + 0.001868 * Math.cos(γ) - 0.032077 * Math.sin(γ)
      - 0.014615 * Math.cos(2 * γ) - 0.04089 * Math.sin(2 * γ)
    );
  const decl =
    0.006918 - 0.399912 * Math.cos(γ) + 0.070257 * Math.sin(γ)
    - 0.006758 * Math.cos(2 * γ) + 0.000907 * Math.sin(2 * γ)
    - 0.002697 * Math.cos(3 * γ) + 0.00148 * Math.sin(3 * γ);
  const lat = latDeg * Math.PI / 180;
  const cosHa =
    Math.cos(90.833 * Math.PI / 180) / (Math.cos(lat) * Math.cos(decl))
    - Math.tan(lat) * Math.tan(decl);

  const base = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  if (Math.abs(cosHa) > 1) {
    // Polar day/night — return noon as both
    return {
      sunrise: new Date(base + 6 * 3600000).toISOString(),
      sunset: new Date(base + 18 * 3600000).toISOString(),
    };
  }
  const ha = Math.acos(cosHa) * 180 / Math.PI;
  return {
    sunrise: new Date(base + (720 - 4 * (lonDeg + ha) - eqtime) * 60000).toISOString(),
    sunset:  new Date(base + (720 - 4 * (lonDeg - ha) - eqtime) * 60000).toISOString(),
  };
}

// ── Period mapping ────────────────────────────────────────────────────────────

function mapPeriod(p: NWSHourlyPeriod) {
  const tempF = p.temperatureUnit === "C" ? p.temperature * 9 / 5 + 32 : p.temperature;
  const wind = parseWindMph(p.windSpeed);
  const rh = p.relativeHumidity?.value ?? 50;
  const cond = nwsTextToCondition(p.shortForecast);
  return {
    time: p.startTime,
    temp: Math.round(tempF),
    feelsLike: apparentTemp(tempF, wind, rh),
    precipProb: p.probabilityOfPrecipitation?.value ?? 0,
    condition: cond,
    weatherCode: CONDITION_WMO[cond],
    windSpeed: wind,
    windDirection: parseWindDir(p.windDirection),
    isDay: p.isDaytime,
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const body =
      req.method === "POST"
        ? await req.json()
        : Object.fromEntries(new URL(req.url).searchParams);

    const lat = parseFloat(body.lat);
    const lon = parseFloat(body.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return new Response(JSON.stringify({ error: "lat and lon required" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Step 1: resolve NWS grid + forecastHourly URL
    const pointsRes = await fetch(
      `https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`,
      { headers: NWS_HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) },
    );

    if (!pointsRes.ok) {
      return new Response(
        JSON.stringify({ error: "outside_us", outside_us: true }),
        { status: 422, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    const pointsJson = await pointsRes.json();
    const forecastHourlyUrl: string | undefined = pointsJson?.properties?.forecastHourly;
    if (!forecastHourlyUrl) {
      return new Response(
        JSON.stringify({ error: "No forecastHourly URL in NWS points response" }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    // Step 2: fetch hourly forecast
    const hourlyRes = await fetch(forecastHourlyUrl, {
      headers: NWS_HEADERS,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!hourlyRes.ok) {
      return new Response(
        JSON.stringify({ error: `NWS hourly forecast returned ${hourlyRes.status}` }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    const hourlyJson = await hourlyRes.json();
    const periods: NWSHourlyPeriod[] = hourlyJson?.properties?.periods ?? [];

    const nowIso = new Date().toISOString();
    const hourly = periods
      .map(mapPeriod)
      .filter((h) => h.time >= nowIso)
      .slice(0, 48);

    if (hourly.length === 0) {
      return new Response(
        JSON.stringify({ error: "No current or future periods in NWS hourly response" }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    // Build current conditions from first hourly period
    const firstPeriod = periods.find((p) => p.startTime >= nowIso) ?? periods[0];
    const current = {
      temp: hourly[0].temp,
      feelsLike: hourly[0].feelsLike,
      humidity: firstPeriod?.relativeHumidity?.value ?? 50,
      windSpeed: hourly[0].windSpeed,
      windDirection: hourly[0].windDirection,
      precipProb: hourly[0].precipProb,
      uvIndex: 0,
      condition: hourly[0].condition,
      weatherCode: hourly[0].weatherCode,
      isDay: hourly[0].isDay,
      location: "",
      updatedAt: new Date().toISOString(),
    };

    // Aggregate daily from hourly (group by calendar date)
    const dailyBuckets = new Map<string, DailyBucket>();
    for (const h of hourly) {
      const dateKey = h.time.slice(0, 10);
      if (!dailyBuckets.has(dateKey)) {
        dailyBuckets.set(dateKey, { temps: [], feelsLikes: [], precipProbs: [], conditions: [] });
      }
      const b = dailyBuckets.get(dateKey)!;
      b.temps.push(h.temp);
      b.feelsLikes.push(h.feelsLike);
      b.precipProbs.push(h.precipProb);
      b.conditions.push(h.condition);
    }

    const daily = Array.from(dailyBuckets.entries()).map(([dateKey, b]) => {
      const dominant = b.conditions.reduce((a, c) =>
        CONDITION_PRIORITY[c] > CONDITION_PRIORITY[a] ? c : a,
      );
      const { sunrise, sunset } = getSunTimes(lat, lon, new Date(dateKey + "T12:00:00Z"));
      return {
        date: dateKey + "T00:00:00.000Z",
        tempMin: Math.min(...b.temps),
        tempMax: Math.max(...b.temps),
        feelsLikeMin: Math.min(...b.feelsLikes),
        feelsLikeMax: Math.max(...b.feelsLikes),
        precipProb: Math.max(...b.precipProbs),
        condition: dominant,
        weatherCode: CONDITION_WMO[dominant],
        sunrise,
        sunset,
      };
    });

    return new Response(
      JSON.stringify({
        current,
        hourly,
        daily,
        nextHourPrecip: null,
        _source: "nws",
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
