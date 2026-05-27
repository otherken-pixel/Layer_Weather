const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NWS_HEADERS = {
  "User-Agent": "LayerWeather/1.0 (contact@weartoday.app)",
  "Accept": "application/geo+json",
};

const TIMEOUT_MS = 8_000;

// Rough bounding boxes for US territories (CONUS, Alaska, Hawaii)
function isLikelyUS(lat: number, lng: number): boolean {
  return (
    (lat >= 24 && lat <= 50 && lng >= -125 && lng <= -66) ||
    (lat >= 51 && lat <= 72 && lng >= -170 && lng <= -129) ||
    (lat >= 18 && lat <= 23 && lng >= -161 && lng <= -154)
  );
}

// Fetch last-24h measured precipitation from the nearest NWS observation station.
async function getNWSPrecip24h(lat: number, lng: number): Promise<number | null> {
  try {
    const pointsRes = await fetch(
      `https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`,
      { headers: NWS_HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!pointsRes.ok) return null;

    const pointsJson = await pointsRes.json();
    const stationsUrl: string | undefined = pointsJson?.properties?.observationStations;
    if (!stationsUrl) return null;

    // Get nearest station
    const stationsRes = await fetch(`${stationsUrl}?limit=1`, {
      headers: NWS_HEADERS,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!stationsRes.ok) return null;

    const stationsJson = await stationsRes.json();
    const stationId: string | undefined =
      stationsJson?.features?.[0]?.properties?.stationIdentifier;
    if (!stationId) return null;

    // Fetch observations from the past 26 hours (buffer for reporting lag)
    const since = new Date(Date.now() - 26 * 3600 * 1000);
    const obsRes = await fetch(
      `https://api.weather.gov/stations/${stationId}/observations?start=${since.toISOString()}&limit=48`,
      { headers: NWS_HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!obsRes.ok) return null;

    const obsJson = await obsRes.json();
    const features: unknown[] = obsJson?.features ?? [];

    // Sum precipitationLastHour (wmoUnit:m → mm) over the last 24 hours
    const cutoff24h = new Date(Date.now() - 24 * 3600 * 1000);
    let total = 0;
    let hasAnyValue = false;
    for (const feature of features) {
      const f = feature as Record<string, unknown>;
      const props = f?.properties as Record<string, unknown> | undefined;
      const timestamp = new Date(String(props?.timestamp ?? ""));
      if (isNaN(timestamp.getTime()) || timestamp < cutoff24h) continue;
      const val = (props?.precipitationLastHour as Record<string, unknown> | null)?.value;
      if (typeof val === "number") {
        hasAnyValue = true;
        if (val > 0) total += val * 1000; // meters → mm
      }
    }

    // Only trust the result if the station reported at least some observations
    return hasAnyValue ? Math.round(total * 10) / 10 : null;
  } catch {
    return null;
  }
}

// Fetch 31-day daily precipitation archive from Open-Meteo.
async function getOpenMeteoPrecip(lat: number, lng: number): Promise<{
  last24h: number; last3d: number; last7d: number; last30d: number;
} | null> {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 31);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const archiveUrl =
    `https://archive-api.open-meteo.com/v1/archive` +
    `?latitude=${lat}&longitude=${lng}` +
    `&start_date=${fmt(startDate)}&end_date=${fmt(yesterday)}` +
    `&daily=precipitation_sum&timezone=UTC`;

  const res = await fetch(archiveUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) return null;

  const json = await res.json() as {
    daily?: { time: string[]; precipitation_sum: (number | null)[] };
  };

  const daily = json.daily;
  if (!daily?.time?.length) return { last24h: 0, last3d: 0, last7d: 0, last30d: 0 };

  const pairs = daily.time.map((t, i) => ({
    date: new Date(t + "T00:00:00Z"),
    mm: daily.precipitation_sum[i] ?? 0,
  })).sort((a, b) => b.date.getTime() - a.date.getTime());

  const sumDays = (n: number): number =>
    pairs.slice(0, n).reduce((acc, p) => acc + p.mm, 0);

  return {
    last24h: Math.round(sumDays(1) * 10) / 10,
    last3d: Math.round(sumDays(3) * 10) / 10,
    last7d: Math.round(sumDays(7) * 10) / 10,
    last30d: Math.round(sumDays(30) * 10) / 10,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const lat = parseFloat(String(body.lat ?? ""));
    const lng = parseFloat(String(body.lng ?? ""));

    if (isNaN(lat) || isNaN(lng)) {
      return new Response(JSON.stringify({ error: "lat and lng are required" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Run Open-Meteo archive and (for US) NWS observations in parallel.
    const [archiveResult, nwsResult] = await Promise.allSettled([
      getOpenMeteoPrecip(lat, lng),
      isLikelyUS(lat, lng) ? getNWSPrecip24h(lat, lng) : Promise.resolve(null),
    ]);

    const archive = archiveResult.status === "fulfilled" ? archiveResult.value : null;
    const nws24h = nwsResult.status === "fulfilled" ? nwsResult.value : null;

    if (!archive && nws24h === null) {
      return new Response(JSON.stringify({ error: "No precipitation data available" }), {
        status: 503,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Prefer NWS measured data for last24h (real station obs > model archive).
    // Fall back to Open-Meteo for all longer windows.
    const result = {
      last24h: nws24h ?? archive?.last24h ?? 0,
      last3d: archive?.last3d ?? 0,
      last7d: archive?.last7d ?? 0,
      last30d: archive?.last30d ?? 0,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "max-age=3600" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
