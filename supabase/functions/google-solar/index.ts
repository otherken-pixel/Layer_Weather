/**
 * Google Solar API Edge Function
 *
 * Fetches solar potential data for a lat/lon using the Google Solar API
 * (buildingInsights endpoint). Returns annual sunshine hours, average daily
 * peak sun hours, and carbon offset factor for the location.
 *
 * Required secret: GOOGLE_MAPS_API_KEY
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) {
      return jsonResponse({ error: "GOOGLE_MAPS_API_KEY not configured" }, 503);
    }

    const params = new URLSearchParams({
      "location.latitude": lat.toFixed(6),
      "location.longitude": lon.toFixed(6),
      requiredQuality: "LOW",
      key: apiKey,
    });

    const res = await fetch(
      `https://solar.googleapis.com/v1/buildingInsights:findClosest?${params}`,
      { signal: AbortSignal.timeout(10_000) },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return jsonResponse({ error: `Google Solar API ${res.status}: ${errText}` });
    }

    const json = await res.json();
    const solar = json?.solarPotential;

    if (!solar) {
      return jsonResponse({ error: "No solar potential data returned" });
    }

    const maxSunshineHoursPerYear = typeof solar.maxSunshineHoursPerYear === "number"
      ? solar.maxSunshineHoursPerYear
      : null;

    const avgDailyPeakSunHours = maxSunshineHoursPerYear != null
      ? Math.round((maxSunshineHoursPerYear / 365) * 10) / 10
      : null;

    const carbonOffsetFactorKgPerMwh = typeof solar.carbonOffsetFactorKgPerMwh === "number"
      ? solar.carbonOffsetFactorKgPerMwh
      : null;

    const maxArrayAreaMeters2 = typeof solar.maxArrayAreaMeters2 === "number"
      ? solar.maxArrayAreaMeters2
      : null;

    const imageryDate = json?.imageryDate ?? null;
    const imageryQuality = json?.imageryQuality ?? null;

    if (maxSunshineHoursPerYear == null) {
      return jsonResponse({ error: "Insufficient solar data for this location" });
    }

    return jsonResponse({
      maxSunshineHoursPerYear: Math.round(maxSunshineHoursPerYear),
      avgDailyPeakSunHours,
      carbonOffsetFactorKgPerMwh,
      maxArrayAreaMeters2,
      imageryDate,
      imageryQuality,
    });
  } catch (err) {
    return jsonResponse({ error: String(err) });
  }
});
