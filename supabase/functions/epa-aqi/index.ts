/**
 * EPA AirNow AQI Edge Function
 *
 * Fetches current air quality observations for a lat/lon from the
 * EPA AirNow API and returns the highest AQI value across all
 * measured pollutants (PM2.5, Ozone, PM10, etc.).
 *
 * Required secret (set via Supabase dashboard → Settings → Edge Functions):
 *   AIRNOW_API_KEY — your AirNow API key from airnow.gov/api/
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AIRNOW_BASE = "https://www.airnowapi.org/aq/observation/latLong/current/";
const AIRNOW_FORECAST_BASE = "https://www.airnowapi.org/aq/forecast/latLong/";
const TIMEOUT_MS = 8_000;

interface AirNowObservation {
  ParameterName: string;
  AQI: number;
  Category: { Number: number; Name: string };
  ReportingArea: string;
  StateCode: string;
  Latitude: number;
  Longitude: number;
}

interface AirNowForecast {
  DateForecast: string;
  ParameterName: string;
  AQI: number;
  Category: { Number: number; Name: string };
  ReportingArea: string;
  StateCode: string;
}

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

    const apiKey = Deno.env.get("AIRNOW_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AIRNOW_API_KEY secret not configured", aqi: null }),
        { status: 503, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    const params = new URLSearchParams({
      format: "application/json",
      latitude: lat.toFixed(4),
      longitude: lon.toFixed(4),
      distance: "25",
      API_KEY: apiKey,
    });

    // Fetch current observations + tomorrow's forecast in parallel
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

    const forecastParams = new URLSearchParams({
      format: "application/json",
      latitude: lat.toFixed(4),
      longitude: lon.toFixed(4),
      distance: "25",
      date: tomorrowStr,
      API_KEY: apiKey,
    });

    const [res, forecastRes] = await Promise.all([
      fetch(`${AIRNOW_BASE}?${params}`, { signal: AbortSignal.timeout(TIMEOUT_MS) }),
      fetch(`${AIRNOW_FORECAST_BASE}?${forecastParams}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
        .catch(() => null),
    ]);

    if (!res.ok) {
      return new Response(
        JSON.stringify({ aqi: null, error: `AirNow returned ${res.status}` }),
        { headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    const observations: AirNowObservation[] = await res.json();

    if (!Array.isArray(observations) || observations.length === 0) {
      return new Response(
        JSON.stringify({ aqi: null }),
        { headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    // Use the highest AQI value across all reported pollutants
    const maxAqi = observations.reduce((best, obs) => {
      return typeof obs.AQI === "number" && obs.AQI > best ? obs.AQI : best;
    }, 0);

    // Collect per-pollutant breakdown for optional future display
    const breakdown = observations.map((o) => ({
      parameter: o.ParameterName,
      aqi: o.AQI,
      category: o.Category?.Name ?? "",
      reportingArea: o.ReportingArea,
    }));

    // Tomorrow's forecast AQI (highest across all pollutants)
    let forecastAqi: number | null = null;
    let forecastCategory: string | null = null;
    if (forecastRes?.ok) {
      try {
        const forecasts: AirNowForecast[] = await forecastRes.json();
        if (Array.isArray(forecasts) && forecasts.length > 0) {
          const best = forecasts.reduce<AirNowForecast | null>((prev, f) => {
            if (typeof f.AQI !== "number" || f.AQI < 0) return prev;
            return !prev || f.AQI > prev.AQI ? f : prev;
          }, null);
          if (best) {
            forecastAqi = best.AQI;
            forecastCategory = best.Category?.Name ?? null;
          }
        }
      } catch {
        // Forecast parse failed — continue without it
      }
    }

    return new Response(
      JSON.stringify({ aqi: maxAqi, breakdown, forecastAqi, forecastCategory }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ aqi: null, error: String(err) }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
