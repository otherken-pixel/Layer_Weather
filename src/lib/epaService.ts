import { supabase } from "./supabase";

// Raw shape returned by AirNow API and preserved in edge function response
export interface EPAObservation {
  parameter: string;
  aqi: number;
  category: string;
  reportingArea: string;
}

export interface EPAAQIResult {
  aqi: number | null;
  breakdown: EPAObservation[];
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
      return { aqi: null, breakdown: [] };
    }
    const rec = data as Record<string, unknown>;
    return {
      aqi: typeof rec.aqi === "number" ? rec.aqi : null,
      breakdown: Array.isArray(rec.breakdown) ? (rec.breakdown as EPAObservation[]) : [],
    };
  } catch {
    return { aqi: null, breakdown: [] };
  }
}
