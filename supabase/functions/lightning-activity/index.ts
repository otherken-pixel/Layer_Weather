/**
 * Lightning Activity Edge Function
 *
 * Queries the NOAA SWDI (Severe Weather Data Inventory) REST API for
 * NLDN (National Lightning Detection Network) strike data within a
 * 1-degree bounding box around the user's location for the current day.
 *
 * Returns a LightningActivity level derived from strike count:
 *   none      < 5 strikes
 *   low       5–19 strikes
 *   moderate  20–99 strikes
 *   high      ≥ 100 strikes
 *
 * US-only — returns { activity: "none" } for locations outside SWDI coverage.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SWDI_BASE = "https://www.ncdc.noaa.gov/swdiws/json/nldn";
const TIMEOUT_MS = 8_000;

type LightningActivity = "none" | "low" | "moderate" | "high";

function strikeCountToActivity(count: number): LightningActivity {
  if (count >= 100) return "high";
  if (count >= 20) return "moderate";
  if (count >= 5) return "low";
  return "none";
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

    const delta = 0.5;
    const minLat = (lat - delta).toFixed(3);
    const minLon = (lon - delta).toFixed(3);
    const maxLat = (lat + delta).toFixed(3);
    const maxLon = (lon + delta).toFixed(3);

    const today = new Date().toISOString().slice(0, 10);
    const url = `${SWDI_BASE}/${today}/${minLat},${minLon},${maxLat},${maxLon}`;

    const res = await fetch(url, {
      headers: { "User-Agent": "LayerWeather/1.0 (contact@weartoday.app)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      // SWDI unavailable or outside coverage — fail gracefully
      return new Response(
        JSON.stringify({ activity: "none", source: "swdi_unavailable" }),
        { headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    const json = await res.json();
    const results: unknown[] = json?.result ?? [];
    const activity = strikeCountToActivity(results.length);

    return new Response(
      JSON.stringify({ activity, strikeCount: results.length }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ activity: "none", error: String(err) }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
