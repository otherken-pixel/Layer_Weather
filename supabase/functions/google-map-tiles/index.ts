/**
 * Google Map Tiles Proxy
 *
 * Proxies Air Quality and Pollen heatmap tile requests to keep GOOGLE_MAPS_API
 * server-side. Leaflet cannot attach auth headers to tile requests, so this
 * function acts as the tile origin.
 *
 * Query params: type, z, x, y
 * Supported types: aq_us | aq_uaqi | pollen_tree | pollen_grass | pollen_weed
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 1×1 transparent PNG used as a fallback when a tile is unavailable.
const TRANSPARENT_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

type TileBuilder = (z: string, x: string, y: string, key: string) => string;

const TILE_SOURCES: Record<string, TileBuilder> = {
  aq_us: (z, x, y, k) =>
    `https://airquality.googleapis.com/v1/mapTypes/US_AQI/heatmapTiles/${z}/${x}/${y}?key=${k}`,
  aq_uaqi: (z, x, y, k) =>
    `https://airquality.googleapis.com/v1/mapTypes/UAQI_INDIGO_PERSIAN/heatmapTiles/${z}/${x}/${y}?key=${k}`,
  pollen_tree: (z, x, y, k) =>
    `https://pollen.googleapis.com/v1/mapTypes/TREE_UPI/heatmapTiles/${z}/${x}/${y}?key=${k}`,
  pollen_grass: (z, x, y, k) =>
    `https://pollen.googleapis.com/v1/mapTypes/GRASS_UPI/heatmapTiles/${z}/${x}/${y}?key=${k}`,
  pollen_weed: (z, x, y, k) =>
    `https://pollen.googleapis.com/v1/mapTypes/WEED_UPI/heatmapTiles/${z}/${x}/${y}?key=${k}`,
};

function transparentTile(maxAge = 60): Response {
  const bytes = Uint8Array.from(atob(TRANSPARENT_PNG_B64), (c) => c.charCodeAt(0));
  return new Response(bytes, {
    status: 200,
    headers: {
      ...CORS,
      "Content-Type": "image/png",
      "Cache-Control": `public, max-age=${maxAge}`,
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "";
  const z = url.searchParams.get("z") ?? "";
  const x = url.searchParams.get("x") ?? "";
  const y = url.searchParams.get("y") ?? "";

  const builder = TILE_SOURCES[type];
  if (!builder || !z || !x || !y) {
    return transparentTile();
  }

  const apiKey = Deno.env.get("GOOGLE_MAPS_API");
  if (!apiKey) {
    return transparentTile();
  }

  try {
    const tileUrl = builder(z, x, y, apiKey);
    const res = await fetch(tileUrl, { signal: AbortSignal.timeout(8_000) });

    if (!res.ok) return transparentTile();

    const body = await res.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        ...CORS,
        "Content-Type": res.headers.get("Content-Type") ?? "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return transparentTile();
  }
});
