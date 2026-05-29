/**
 * Google Air Quality API Edge Function
 *
 * Fetches real-time air quality for a lat/lon using the Google Air Quality API.
 * Returns the US EPA AQI (when available) or Universal AQI, plus a per-pollutant
 * breakdown with AQI values calculated from concentrations using EPA breakpoints.
 *
 * Required secret: GOOGLE_MAPS_API
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// EPA AQI linear interpolation
function aqiFromBp(
  c: number,
  bps: Array<[number, number, number, number]>, // [cLo, cHi, aqiLo, aqiHi]
): number | null {
  for (const [cLo, cHi, aqiLo, aqiHi] of bps) {
    if (c >= cLo && c <= cHi) {
      return Math.round(((aqiHi - aqiLo) / (cHi - cLo)) * (c - cLo) + aqiLo);
    }
  }
  return null;
}

// EPA PM2.5 breakpoints (24-hr avg, μg/m³): [cLo, cHi, aqiLo, aqiHi]
const PM25_BPS: Array<[number, number, number, number]> = [
  [0.0, 12.0, 0, 50],
  [12.1, 35.4, 51, 100],
  [35.5, 55.4, 101, 150],
  [55.5, 150.4, 151, 200],
  [150.5, 250.4, 201, 300],
  [250.5, 350.4, 301, 400],
  [350.5, 500.4, 401, 500],
];

// EPA PM10 breakpoints (24-hr avg, μg/m³)
const PM10_BPS: Array<[number, number, number, number]> = [
  [0, 54, 0, 50],
  [55, 154, 51, 100],
  [155, 254, 101, 150],
  [255, 354, 151, 200],
  [355, 424, 201, 300],
  [425, 504, 301, 400],
  [505, 604, 401, 500],
];

// EPA O3 breakpoints (8-hr avg, ppm): Google returns ppb, divide by 1000
const O3_8HR_BPS: Array<[number, number, number, number]> = [
  [0.000, 0.054, 0, 50],
  [0.055, 0.070, 51, 100],
  [0.071, 0.085, 101, 150],
  [0.086, 0.105, 151, 200],
  [0.106, 0.200, 201, 300],
];

// EPA SO2 breakpoints (1-hr avg, ppb)
const SO2_BPS: Array<[number, number, number, number]> = [
  [0, 35, 0, 50],
  [36, 75, 51, 100],
  [76, 185, 101, 150],
  [186, 304, 151, 200],
  [305, 604, 201, 300],
];

// EPA CO breakpoints (8-hr avg, ppm): Google returns ppb, divide by 1000
const CO_BPS: Array<[number, number, number, number]> = [
  [0.0, 4.4, 0, 50],
  [4.5, 9.4, 51, 100],
  [9.5, 12.4, 101, 150],
  [12.5, 15.4, 151, 200],
  [15.5, 30.4, 201, 300],
  [30.5, 40.4, 301, 400],
  [40.5, 50.4, 401, 500],
];

function aqiCategory(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

interface GooglePollutant {
  code: string;
  displayName: string;
  concentration: { value: number; units: string };
}

function pollutantToAqi(p: GooglePollutant): number | null {
  const code = p.code?.toLowerCase();
  const val = p.concentration?.value;
  if (!Number.isFinite(val)) return null;

  if (code === "pm25") return aqiFromBp(Math.floor(val * 10) / 10, PM25_BPS);
  if (code === "pm10") return aqiFromBp(Math.floor(val), PM10_BPS);
  if (code === "o3") return aqiFromBp(Math.floor((val / 1000) * 1000) / 1000, O3_8HR_BPS);
  if (code === "so2") return aqiFromBp(Math.floor(val), SO2_BPS);
  if (code === "co") return aqiFromBp(Math.floor((val / 1000) * 10) / 10, CO_BPS);
  return null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
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
      return jsonResponse({ error: "lat and lon required" }, 400);
    }

    const apiKey = Deno.env.get("GOOGLE_MAPS_API");
    if (!apiKey) {
      return jsonResponse({ error: "GOOGLE_MAPS_API not configured", aqi: null }, 503);
    }

    const res = await fetch(
      `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: { latitude: lat, longitude: lon },
          extraComputations: [
            "DOMINANT_POLLUTANT_CONCENTRATION",
            "POLLUTANT_CONCENTRATION",
            "LOCAL_AQI",
          ],
          universalAqi: true,
          languageCode: "en",
        }),
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return jsonResponse({ aqi: null, error: `Google AQ API ${res.status}: ${errText}` });
    }

    const json = await res.json();

    // Prefer US EPA index, fall back to universal AQI
    const indexes = json?.indexes as Array<{ code: string; aqi: number; category?: string; dominantPollutant?: string }> | undefined;
    let mainAqi: number | null = null;
    let mainCategory: string | null = null;

    if (Array.isArray(indexes)) {
      const epa = indexes.find((i) => i.code === "usa_epa");
      if (epa && typeof epa.aqi === "number") {
        mainAqi = epa.aqi;
        mainCategory = epa.category ?? null;
      }
    }

    // Build per-pollutant breakdown using EPA AQI calculations
    const pollutants = json?.pollutants as GooglePollutant[] | undefined;
    const breakdown: Array<{ parameter: string; aqi: number; category: string; reportingArea: string }> = [];

    if (Array.isArray(pollutants)) {
      for (const p of pollutants) {
        const pAqi = pollutantToAqi(p);
        if (pAqi == null) continue;
        breakdown.push({
          parameter: p.displayName ?? p.code,
          aqi: pAqi,
          category: aqiCategory(pAqi),
          reportingArea: "Google Air Quality",
        });
      }
      // Sort by AQI descending so worst pollutant appears first
      breakdown.sort((a, b) => b.aqi - a.aqi);
    }

    // When usa_epa index is unavailable (non-US), derive EPA-scale AQI from concentrations.
    // Do not use UAQI (0–100, higher is better) — it inverts EPA semantics.
    if (mainAqi == null && breakdown.length > 0) {
      mainAqi = breakdown[0].aqi;
      mainCategory = breakdown[0].category;
    }

    return jsonResponse({
      aqi: mainAqi,
      breakdown,
      forecastAqi: null,
      forecastCategory: null,
    });
  } catch (err) {
    return jsonResponse({ aqi: null, error: String(err) });
  }
});
