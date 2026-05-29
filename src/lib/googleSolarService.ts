import { supabase } from "./supabase";
import type { SolarData } from "@/types";

export async function fetchGoogleSolar(lat: number, lon: number): Promise<SolarData | null> {
  try {
    const { data, error } = await supabase.functions.invoke("google-solar", {
      body: { lat, lon },
    });
    if (error || !data || typeof data !== "object") return null;
    const rec = data as Record<string, unknown>;
    if (rec.error || typeof rec.maxSunshineHoursPerYear !== "number") return null;
    return {
      maxSunshineHoursPerYear: rec.maxSunshineHoursPerYear as number,
      avgDailyPeakSunHours: typeof rec.avgDailyPeakSunHours === "number" ? rec.avgDailyPeakSunHours : null,
      carbonOffsetFactorKgPerMwh: typeof rec.carbonOffsetFactorKgPerMwh === "number" ? rec.carbonOffsetFactorKgPerMwh : null,
      maxArrayAreaMeters2: typeof rec.maxArrayAreaMeters2 === "number" ? rec.maxArrayAreaMeters2 : null,
      imageryDate: rec.imageryDate as SolarData["imageryDate"] ?? null,
      imageryQuality: typeof rec.imageryQuality === "string" ? rec.imageryQuality : null,
    };
  } catch {
    return null;
  }
}
