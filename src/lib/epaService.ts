import { supabase } from "./supabase";
import type { EPAObservation } from "@/types";

export type { EPAObservation };

export interface EPAAQIResult {
  aqi: number | null;
  breakdown: EPAObservation[];
  forecastAqi: number | null;
  forecastCategory: string | null;
}

/**
 * Fetch the current US EPA AQI for a coordinate via the epa-aqi Edge Function.
 * Returns null when outside the US, when no stations are within 25 miles, or on error.
 */
export async function fetchEPAAQI(lat: number, lon: number): Promise<EPAAQIResult> {
  try {
    const { data, error } = await supabase.functions.invoke("epa-aqi", {
      body: { lat, lon },
    });
    if (error || !data || typeof data !== "object") {
      return { aqi: null, breakdown: [], forecastAqi: null, forecastCategory: null };
    }
    const rec = data as Record<string, unknown>;
    return {
      aqi: typeof rec.aqi === "number" ? rec.aqi : null,
      breakdown: Array.isArray(rec.breakdown) ? (rec.breakdown as EPAObservation[]) : [],
      forecastAqi: typeof rec.forecastAqi === "number" ? rec.forecastAqi : null,
      forecastCategory: typeof rec.forecastCategory === "string" ? rec.forecastCategory : null,
    };
  } catch {
    return { aqi: null, breakdown: [], forecastAqi: null, forecastCategory: null };
  }
}
