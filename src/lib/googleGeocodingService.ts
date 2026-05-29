import { supabase } from "./supabase";
import type { GeocodedPlace } from "./location-search";

export interface ReverseGeocodeResult {
  city: string;
  countryCode: string;
}

export async function geocodeCityGoogle(query: string): Promise<GeocodedPlace | null> {
  try {
    const { data, error } = await supabase.functions.invoke("google-geocoding", {
      body: { type: "forward", query },
    });
    if (error || !data || typeof data !== "object") return null;
    const rec = (data as Record<string, unknown>).result as Record<string, unknown> | null;
    if (!rec) return null;
    const lat = typeof rec.latitude === "number" ? rec.latitude : null;
    const lng = typeof rec.longitude === "number" ? rec.longitude : null;
    const city = typeof rec.city === "string" ? rec.city : null;
    if (lat == null || lng == null || !city) return null;
    return { latitude: lat, longitude: lng, city };
  } catch {
    return null;
  }
}

export async function reverseGeocodeGoogle(
  lat: number,
  lon: number,
): Promise<ReverseGeocodeResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke("google-geocoding", {
      body: { type: "reverse", lat, lon },
    });
    if (error || !data || typeof data !== "object") return null;
    const rec = (data as Record<string, unknown>).result as Record<string, unknown> | null;
    if (!rec) return null;
    const city = typeof rec.city === "string" ? rec.city : null;
    const countryCode = typeof rec.countryCode === "string" ? rec.countryCode : null;
    if (!city || !countryCode) return null;
    return { city, countryCode };
  } catch {
    return null;
  }
}
