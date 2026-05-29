/**
 * Google Geocoding + Places API Edge Function
 *
 * Handles four operations via the `type` field:
 *   forward      – city name → lat/lng (Geocoding API)
 *   reverse      – lat/lng → city name + country code (Geocoding API)
 *   autocomplete – partial city name → place suggestions (Places Autocomplete API)
 *   place_details – placeId → lat/lng + city name (Places Details API)
 *
 * Required secret: GOOGLE_MAPS_API
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

    const apiKey = Deno.env.get("GOOGLE_MAPS_API");
    if (!apiKey) {
      return jsonResponse({ error: "GOOGLE_MAPS_API not configured" }, 503);
    }

    const type = body.type;

    // ── Places Autocomplete ──────────────────────────────────────────────────
    if (type === "autocomplete") {
      const query = String(body.query ?? "").trim();
      if (query.length < 2) {
        return jsonResponse({ suggestions: [] });
      }

      const params = new URLSearchParams({
        input: query,
        types: "(cities)",
        language: "en",
        key: apiKey,
      });

      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`,
        { signal: AbortSignal.timeout(6_000) },
      );

      if (!res.ok) {
        return jsonResponse({ suggestions: [] });
      }

      const json = await res.json();
      if (json.status !== "OK" || !Array.isArray(json.predictions)) {
        return jsonResponse({ suggestions: [] });
      }

      const suggestions = json.predictions.slice(0, 5).map((p: {
        place_id: string;
        description: string;
        structured_formatting?: { main_text?: string; secondary_text?: string };
      }) => ({
        placeId: p.place_id,
        description: p.description,
        mainText: p.structured_formatting?.main_text ?? p.description,
        secondaryText: p.structured_formatting?.secondary_text ?? "",
      }));

      return jsonResponse({ suggestions });
    }

    // ── Place Details (placeId → lat/lng + city name) ────────────────────────
    if (type === "place_details") {
      const placeId = String(body.placeId ?? "").trim();
      if (!placeId) {
        return jsonResponse({ error: "placeId required" }, 400);
      }

      const params = new URLSearchParams({
        place_id: placeId,
        fields: "geometry,name,address_components",
        key: apiKey,
      });

      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?${params}`,
        { signal: AbortSignal.timeout(8_000) },
      );

      if (!res.ok) {
        return jsonResponse({ result: null });
      }

      const json = await res.json();
      if (json.status !== "OK" || !json.result) {
        return jsonResponse({ result: null });
      }

      const lat = json.result.geometry?.location?.lat;
      const lng = json.result.geometry?.location?.lng;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return jsonResponse({ result: null });
      }

      const components: AddressComponent[] = json.result.address_components ?? [];
      const city = extractCity(components) || json.result.name || "Your Location";

      return jsonResponse({ result: { latitude: lat, longitude: lng, city } });
    }

    // ── Forward geocoding ────────────────────────────────────────────────────
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
        result: { latitude: lat, longitude: lng, city: extractCity(components) },
      });
    }

    // ── Reverse geocoding ────────────────────────────────────────────────────
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

      const preferred =
        json.results.find((r: { types: string[] }) => r.types?.includes("locality")) ??
        json.results[0];

      const components: AddressComponent[] = preferred.address_components ?? [];
      const countryComp = extractComponent(components, "country");
      const countryCode =
        typeof countryComp?.short_name === "string" && countryComp.short_name.length >= 2
          ? countryComp.short_name.slice(0, 2).toUpperCase()
          : "US";

      return jsonResponse({ result: { city: extractCity(components), countryCode } });
    }

    return jsonResponse({ error: "type must be 'autocomplete', 'place_details', 'forward', or 'reverse'" }, 400);
  } catch (err) {
    return jsonResponse({ error: String(err) });
  }
});
