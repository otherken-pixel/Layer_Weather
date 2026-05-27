import { supabase } from "./supabase";
import type { LightningActivity } from "@/types";

export type { LightningActivity };

/**
 * Fetch the current lightning activity level for a coordinate via the
 * lightning-activity Edge Function (NOAA SWDI data, US only).
 *
 * Always resolves — returns "none" on any error or outside-US location.
 */
export async function fetchLightningActivity(
  lat: number,
  lon: number,
): Promise<LightningActivity> {
  try {
    const { data, error } = await supabase.functions.invoke("lightning-activity", {
      body: { lat, lon },
    });
    if (error || !data || typeof data !== "object") return "none";
    const rec = data as Record<string, unknown>;
    const activity = rec.activity as LightningActivity | undefined;
    return activity ?? "none";
  } catch {
    return "none";
  }
}
