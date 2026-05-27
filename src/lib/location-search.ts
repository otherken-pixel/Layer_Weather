import { NOMINATIM_HEADERS } from "@/lib/nominatim";

export interface GeocodedPlace {
  latitude: number;
  longitude: number;
  city: string;
}

export async function geocodeCity(query: string): Promise<GeocodedPlace | null> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return null;

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=1`,
    { headers: NOMINATIM_HEADERS },
  );
  if (!res.ok) return null;

  const hits = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  const hit = hits[0];
  if (!hit) return null;

  return {
    latitude: parseFloat(hit.lat),
    longitude: parseFloat(hit.lon),
    city: hit.display_name.split(",")[0]?.trim() || trimmed,
  };
}
