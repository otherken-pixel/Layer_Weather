/**
 * Google Weather API — Alerts Edge Function
 *
 * Fetches governmental weather alerts for a lat/lon from the Google Weather API.
 * Returns a standardised alert array; gracefully returns [] on any error or
 * when the API is unavailable / not yet enabled on the project key.
 *
 * Required secret: GOOGLE_MAPS_API (with Weather API scope enabled)
 * Cache-Control: 15 minutes (alerts change infrequently)
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface WeatherAlertItem {
  id: string;
  type: string;
  severity: string;
  headline: string;
  description: string;
  instructions: string | null;
  issuingAgency: string | null;
  effective: string;
  expires: string;
  polygon: [number, number][] | null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=900",
    },
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
      return jsonResponse({ alerts: [], error: "lat and lon required" }, 400);
    }

    const apiKey = Deno.env.get("GOOGLE_MAPS_API");
    if (!apiKey) {
      return jsonResponse({ alerts: [] });
    }

    const res = await fetch(
      `https://weather.googleapis.com/v1/alerts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: { latitude: lat, longitude: lon },
        }),
        signal: AbortSignal.timeout(8_000),
      },
    );

    // 403/404 → API not enabled or no alerts for this region — return empty gracefully
    if (res.status === 403 || res.status === 404) {
      return jsonResponse({ alerts: [] });
    }

    if (!res.ok) {
      return jsonResponse({ alerts: [] });
    }

    const json = await res.json();
    const raw = Array.isArray(json?.alerts) ? json.alerts : [];

    const alerts: WeatherAlertItem[] = raw.map((a: Record<string, unknown>, i: number) => {
      const affected = a.affectedAreas as Record<string, unknown> | undefined;
      const polygon = extractPolygon(affected);
      return {
        id: (a.alertId as string | undefined) ?? `alert-${i}`,
        type: (a.type as string | undefined) ?? "UNKNOWN",
        severity: normalizeSeverity(a.severity as string | undefined),
        headline: (a.headline as string | undefined) ?? "",
        description: (a.description as string | undefined) ?? "",
        instructions: (a.instructions as string | undefined) ?? null,
        issuingAgency: (a.issuingAgency as string | undefined) ?? null,
        effective: (a.effectiveTime as string | undefined) ?? new Date().toISOString(),
        expires: (a.expireTime as string | undefined) ?? new Date().toISOString(),
        polygon,
      };
    });

    return jsonResponse({ alerts });
  } catch {
    return jsonResponse({ alerts: [] });
  }
});

function normalizeSeverity(raw: string | undefined): string {
  const s = (raw ?? "").toUpperCase();
  if (s === "EXTREME") return "EXTREME";
  if (s === "SEVERE") return "SEVERE";
  if (s === "MODERATE") return "MODERATE";
  if (s === "MINOR") return "MINOR";
  return "UNKNOWN";
}

function extractPolygon(
  affected: Record<string, unknown> | undefined,
): [number, number][] | null {
  try {
    const coords = (affected?.polygon as Record<string, unknown>)?.coordinates;
    if (!Array.isArray(coords) || !Array.isArray(coords[0])) return null;
    return (coords[0] as [number, number][]).map(([lng, lat]) => [lat, lng]);
  } catch {
    return null;
  }
}
