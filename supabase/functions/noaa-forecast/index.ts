const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NWS_HEADERS = {
  "User-Agent": "WearToday/1.0 (contact@weartoday.app)",
  "Accept": "application/geo+json",
};

const TIMEOUT_MS = 8_000;

async function fetchWithTimeout(url: string): Promise<Response> {
  return fetch(url, {
    headers: NWS_HEADERS,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const body = req.method === "POST" ? await req.json() : Object.fromEntries(new URL(req.url).searchParams);
    const lat = parseFloat(body.lat);
    const lon = parseFloat(body.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return new Response(JSON.stringify({ error: "lat and lon required" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Step 1: resolve NWS grid coordinates for this lat/lon
    const pointsRes = await fetchWithTimeout(
      `https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`,
    );

    if (!pointsRes.ok) {
      // Outside US coverage — return null signal
      return new Response(JSON.stringify({ noaaPop: null, outside_us: true }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const pointsJson = await pointsRes.json();
    const props = pointsJson?.properties;
    const gridId: string = props?.gridId;
    const gridX: number = props?.gridX;
    const gridY: number = props?.gridY;

    if (!gridId || gridX == null || gridY == null) {
      return new Response(JSON.stringify({ error: "Could not resolve NWS grid" }), {
        status: 502,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Step 2: fetch hourly gridpoint forecast
    const forecastRes = await fetchWithTimeout(
      `https://api.weather.gov/gridpoints/${gridId}/${gridX},${gridY}/forecast/hourly`,
    );

    if (!forecastRes.ok) {
      return new Response(JSON.stringify({ error: `NWS forecast ${forecastRes.status}` }), {
        status: 502,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const forecastJson = await forecastRes.json();
    const periods: Record<string, unknown>[] = forecastJson?.properties?.periods ?? [];

    // Average probabilityOfPrecipitation over the next 12 hours
    const next12 = periods.slice(0, 12);
    const pops = next12.map((p) => {
      const pop = (p.probabilityOfPrecipitation as Record<string, unknown>)?.value;
      return typeof pop === "number" ? pop : 0;
    });
    const noaaPop = pops.length > 0 ? pops.reduce((s, v) => s + v, 0) / pops.length : 0;

    return new Response(JSON.stringify({ noaaPop: Math.round(noaaPop) }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
