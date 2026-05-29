/**
 * Google Geocoding API Edge Function
 *
 * Handles both forward geocoding (city name → lat/lng) and reverse geocoding
 * (lat/lng → city name + country code) using the Google Geocoding API.
 *
 * Request body:
 *   Forward: { type: "forward", query: string }
 *   Reverse: { type: "reverse", lat: number, lon: number }
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

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

function extractComponent(components: AddressComponent[], type: string): AddressComponent | undefined {
  return components.find((c) => c.types.includes(type));
}

function extractCity(components: AddressComponent[]): string {
  return (
    extractComponent(components, "locality")?.long_name ||
    extractComponent(components, "sublocality_level_1")?.long_name ||
    extractComponent(components, "administrative_area_level_3")?.long_name ||
    extractComponent(components, "administrative_area_level_2")?.long_name ||
    extractComponent(components, "administrative_area_level_1")?.long_name ||
    "Your Location"
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const body =
      req.method === "POST"
        ? await req.json()
        : Object.fromEntries(new URL(req.url).searchParams);

    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) {
      return jsonResponse({ error: "GOOGLE_MAPS_API_KEY not configured" }, 503);
    }

    const type = body.type;

    // ── Forward geocoding ──
    if (type === "forward") {
      const query = String(body.query ?? "").trim();
      if (query.length < 2) {
        return jsonResponse({ error: "query must be at least 2 characters" }, 400);
      }

      const params = new URLSearchParams({ address: query, key: apiKey });
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
        { signal: AbortSignal.timeout(8_000) },
      );

      if (!res.ok) {
        return jsonResponse({ error: `Geocoding API ${res.status}` });
      }

      const json = await res.json();
      if (json.status !== "OK" || !Array.isArray(json.results) || json.results.length === 0) {
        return jsonResponse({ result: null });
      }

      const result = json.results[0];
      const components: AddressComponent[] = result.address_components ?? [];
      const lat = result.geometry?.location?.lat;
      const lng = result.geometry?.location?.lng;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return jsonResponse({ result: null });
      }

      return jsonResponse({
        result: {
          latitude: lat,
          longitude: lng,
          city: extractCity(components),
        },
      });
    }

    // ── Reverse geocoding ──
    if (type === "reverse") {
      const lat = parseFloat(body.lat);
      const lon = parseFloat(body.lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return jsonResponse({ error: "lat and lon required" }, 400);
      }

      const params = new URLSearchParams({ latlng: `${lat},${lon}`, key: apiKey });
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
        { signal: AbortSignal.timeout(8_000) },
      );

      if (!res.ok) {
        return jsonResponse({ error: `Geocoding API ${res.status}` });
      }

      const json = await res.json();
      if (json.status !== "OK" || !Array.isArray(json.results) || json.results.length === 0) {
        return jsonResponse({ result: null });
      }

      // Prefer a result typed as "locality" over the raw coordinate result
      const preferred =
        json.results.find((r: { types: string[] }) => r.types?.includes("locality")) ??
        json.results[0];

      const components: AddressComponent[] = preferred.address_components ?? [];
      const countryComp = extractComponent(components, "country");
      const countryCode =
        typeof countryComp?.short_name === "string" && countryComp.short_name.length >= 2
          ? countryComp.short_name.slice(0, 2).toUpperCase()
          : "US";

      return jsonResponse({
        result: {
          city: extractCity(components),
          countryCode,
        },
      });
    }

    return jsonResponse({ error: "type must be 'forward' or 'reverse'" }, 400);
  } catch (err) {
    return jsonResponse({ error: String(err) });
  }
});
