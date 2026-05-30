import { supabase } from "./supabase";

export interface GoogleWeatherAlert {
  id: string;
  type: string;
  severity: "EXTREME" | "SEVERE" | "MODERATE" | "MINOR" | "UNKNOWN";
  headline: string;
  description: string;
  instructions: string | null;
  issuingAgency: string | null;
  effective: string;
  expires: string;
  polygon: [number, number][] | null;
}

export async function fetchGoogleWeatherAlerts(
  lat: number,
  lon: number,
): Promise<GoogleWeatherAlert[]> {
  try {
    const { data, error } = await supabase.functions.invoke("google-weather-alerts", {
      body: { lat, lon },
    });
    if (error || !data || !Array.isArray(data.alerts)) return [];
    return data.alerts as GoogleWeatherAlert[];
  } catch {
    return [];
  }
}
