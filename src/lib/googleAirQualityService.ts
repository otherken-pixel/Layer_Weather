import { supabase } from "./supabase";
import type { EPAObservation } from "@/types";

export interface AQIResult {
  aqi: number | null;
  breakdown: EPAObservation[];
  forecastAqi: number | null;
  forecastCategory: string | null;
}

export async function fetchGoogleAirQuality(lat: number, lon: number): Promise<AQIResult> {
  const empty: AQIResult = { aqi: null, breakdown: [], forecastAqi: null, forecastCategory: null };
  try {
    const { data, error } = await supabase.functions.invoke("google-air-quality", {
      body: { lat, lon },
    });
    if (error || !data || typeof data !== "object") return empty;
    const rec = data as Record<string, unknown>;
    return {
      aqi: typeof rec.aqi === "number" ? rec.aqi : null,
      breakdown: Array.isArray(rec.breakdown) ? (rec.breakdown as EPAObservation[]) : [],
      forecastAqi: null,
      forecastCategory: null,
    };
  } catch {
    return empty;
  }
}
