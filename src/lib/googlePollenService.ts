import { supabase } from "./supabase";
import type { PollenData } from "@/types";

export async function fetchGooglePollen(lat: number, lon: number): Promise<PollenData | null> {
  try {
    const { data, error } = await supabase.functions.invoke("google-pollen", {
      body: { lat, lon },
    });
    if (error || !data || typeof data !== "object") return null;
    const rec = data as Record<string, unknown>;
    if (rec.tree == null && rec.grass == null && rec.weed == null) return null;
    return {
      tree: typeof rec.tree === "number" ? rec.tree : null,
      grass: typeof rec.grass === "number" ? rec.grass : null,
      weed: typeof rec.weed === "number" ? rec.weed : null,
      dominant: (rec.dominant as PollenData["dominant"]) ?? null,
      level: (rec.level as PollenData["level"]) ?? null,
      source: "google",
    };
  } catch {
    return null;
  }
}
