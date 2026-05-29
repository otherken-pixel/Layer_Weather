/**
 * Google Pollen API Edge Function
 *
 * Returns tree, grass, and weed pollen levels for a lat/lon using the
 * Google Pollen API (Universal Pollen Index, 0–5 scale mapped to
 * grain-equivalent values for compatibility with the existing PollenData type).
 *
 * Required secret: GOOGLE_MAPS_API_KEY
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// UPI 0–5 mapped to grain/m³ equivalents that align with existing PollenLevel thresholds
const UPI_TO_GRAINS: Record<number, number> = { 0: 0, 1: 5, 2: 25, 3: 75, 4: 200, 5: 500 };

function upiToGrains(upi: number): number {
  const clamped = Math.max(0, Math.min(5, Math.round(upi)));
  return UPI_TO_GRAINS[clamped] ?? 0;
}

type PollenLevel = "low" | "moderate" | "high" | "very_high";

function grainsToLevel(grains: number): PollenLevel | null {
  if (grains === 0) return "low";
  if (grains < 10) return "low";
  if (grains < 50) return "moderate";
  if (grains < 150) return "high";
  return "very_high";
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

    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) {
      return jsonResponse({ error: "GOOGLE_MAPS_API_KEY not configured" }, 503);
    }

    const params = new URLSearchParams({
      "location.latitude": lat.toFixed(6),
      "location.longitude": lon.toFixed(6),
      days: "1",
      plantsDescription: "0",
      languageCode: "en",
      key: apiKey,
    });

    const res = await fetch(
      `https://pollen.googleapis.com/v1/forecast:lookup?${params}`,
      { signal: AbortSignal.timeout(8_000) },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return jsonResponse({
        error: `Google Pollen API ${res.status}: ${errText}`,
        tree: null, grass: null, weed: null, dominant: null, level: null,
      });
    }

    const json = await res.json();
    const daily = json?.dailyInfo?.[0];
    if (!daily) {
      return jsonResponse({ tree: null, grass: null, weed: null, dominant: null, level: null });
    }

    const pollenTypeInfo = daily.pollenTypeInfo as Array<{
      code: string;
      indexInfo?: { value?: number };
    }> | undefined;

    if (!Array.isArray(pollenTypeInfo) || pollenTypeInfo.length === 0) {
      return jsonResponse({ tree: null, grass: null, weed: null, dominant: null, level: null });
    }

    let treeUpi = 0, grassUpi = 0, weedUpi = 0;
    let hasTree = false, hasGrass = false, hasWeed = false;

    for (const pt of pollenTypeInfo) {
      const upi = typeof pt.indexInfo?.value === "number" ? pt.indexInfo.value : 0;
      const code = pt.code?.toUpperCase();
      if (code === "TREE") { treeUpi = upi; hasTree = true; }
      else if (code === "GRASS") { grassUpi = upi; hasGrass = true; }
      else if (code === "WEED") { weedUpi = upi; hasWeed = true; }
    }

    if (!hasTree && !hasGrass && !hasWeed) {
      return jsonResponse({ tree: null, grass: null, weed: null, dominant: null, level: null });
    }

    const tree = hasTree ? upiToGrains(treeUpi) : null;
    const grass = hasGrass ? upiToGrains(grassUpi) : null;
    const weed = hasWeed ? upiToGrains(weedUpi) : null;

    // Dominant = type with highest UPI
    const candidates: Array<{ type: "tree" | "grass" | "weed"; upi: number }> = [];
    if (hasTree) candidates.push({ type: "tree", upi: treeUpi });
    if (hasGrass) candidates.push({ type: "grass", upi: grassUpi });
    if (hasWeed) candidates.push({ type: "weed", upi: weedUpi });

    const nonZero = candidates.filter((c) => c.upi > 0).sort((a, b) => b.upi - a.upi);
    const dominant = nonZero.length > 0 ? nonZero[0].type : null;

    const maxUpi = Math.max(treeUpi, grassUpi, weedUpi);
    const maxGrains = upiToGrains(maxUpi);
    const level: PollenLevel | null = maxGrains > 0 ? grainsToLevel(maxGrains) : "low";

    return jsonResponse({ tree, grass, weed, dominant, level, source: "google" });
  } catch (err) {
    return jsonResponse({
      error: String(err),
      tree: null, grass: null, weed: null, dominant: null, level: null,
    });
  }
});
