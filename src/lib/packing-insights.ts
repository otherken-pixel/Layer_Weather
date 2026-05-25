import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type {
  PackingAiInsights,
  PackingItem,
  SerializedDailyForecast,
  UserCalibration,
  WardrobeItem,
} from "@/types";

export interface PackingInsightsRequest {
  destination: string;
  departure_date: string;
  return_date: string;
  daily_forecasts: SerializedDailyForecast[];
  calibration: UserCalibration;
  temp_unit?: "F" | "C";
  baseline_packing_list?: PackingItem[];
  wardrobe_items?: { name: string; category: string }[];
}

function toApiForecasts(snapshot: SerializedDailyForecast[]) {
  return snapshot.map((d) => ({
    date: d.date.slice(0, 10),
    tempMin: d.tempMin,
    tempMax: d.tempMax,
    feelsLikeMin: d.feelsLikeMin,
    feelsLikeMax: d.feelsLikeMax,
    precipProb: d.precipProb,
    condition: d.condition,
  }));
}

export function forecastsForPackingRules(snapshot: SerializedDailyForecast[]) {
  return snapshot.map((d) => ({
    feelsLikeMin: d.feelsLikeMin,
    feelsLikeMax: d.feelsLikeMax,
    precipProb: d.precipProb,
    condition: d.condition,
  }));
}

/** Pull the real message from a failed Edge Function invoke (non-2xx hides body by default). */
export async function packingInsightsErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: string; message?: string };
      const msg = body.error ?? body.message;
      if (msg) return friendlyPackingInsightsError(msg);
    } catch {
      /* use fallback below */
    }
    return friendlyPackingInsightsError(error.message);
  }
  if (error instanceof Error) return friendlyPackingInsightsError(error.message);
  return "Could not generate smart packing advice.";
}

function friendlyPackingInsightsError(raw: string): string {
  if (raw.includes("GEMINI_API_KEY not configured")) {
    return "Smart packing is not set up yet. Add GEMINI_API_KEY in Supabase → Edge Functions → Secrets (or GitHub Actions secret), then redeploy.";
  }
  if (raw.includes("API key not valid") || raw.includes("API_KEY_INVALID")) {
    return "Gemini API key is invalid. Check GEMINI_API_KEY in Supabase Edge Function secrets.";
  }
  if (raw.includes("Unauthorized") || raw.includes("JWT")) {
    return "Please sign in again, then retry smart packing advice.";
  }
  if (raw.length > 180) return `${raw.slice(0, 180)}…`;
  return raw;
}

export async function fetchPackingInsights(
  request: PackingInsightsRequest,
): Promise<PackingAiInsights> {
  const { data, error } = await supabase.functions.invoke("packing-insights", {
    body: {
      destination: request.destination,
      departure_date: request.departure_date,
      return_date: request.return_date,
      daily_forecasts: toApiForecasts(request.daily_forecasts),
      calibration: {
        thermal_sensitivity: request.calibration.thermal_sensitivity,
        shorts_min_temp: request.calibration.shorts_min_temp,
        pants_max_temp: request.calibration.pants_max_temp,
        light_jacket_max_temp: request.calibration.light_jacket_max_temp,
        heavy_coat_max_temp: request.calibration.heavy_coat_max_temp,
        rain_tolerance: request.calibration.rain_tolerance,
      },
      temp_unit: request.temp_unit ?? "F",
      baseline_packing_list: request.baseline_packing_list,
      wardrobe_items: request.wardrobe_items?.map((w) => ({
        name: w.name,
        category: w.category,
      })),
    },
  });

  if (error) throw new Error(await packingInsightsErrorMessage(error));
  if (!data || typeof data !== "object") throw new Error("Empty response from packing insights");
  const record = data as Record<string, unknown>;
  if (record.error) throw new Error(friendlyPackingInsightsError(String(record.error)));

  return record as unknown as PackingAiInsights;
}

export function wardrobeForInsights(items: WardrobeItem[]): { name: string; category: string }[] {
  return items.map((w) => ({ name: w.name, category: w.category }));
}
