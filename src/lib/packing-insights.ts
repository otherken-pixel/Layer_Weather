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

export async function fetchPackingInsights(
  request: PackingInsightsRequest,
): Promise<PackingAiInsights> {
  const { data, error } = await supabase.functions.invoke("packing-insights", {
    body: {
      destination: request.destination,
      departure_date: request.departure_date,
      return_date: request.return_date,
      daily_forecasts: toApiForecasts(request.daily_forecasts),
      calibration: request.calibration,
      temp_unit: request.temp_unit ?? "F",
      baseline_packing_list: request.baseline_packing_list,
      wardrobe_items: request.wardrobe_items?.map((w) => ({
        name: w.name,
        category: w.category,
      })),
    },
  });

  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object") throw new Error("Empty response from packing insights");
  const record = data as Record<string, unknown>;
  if (record.error) throw new Error(String(record.error));

  return record as unknown as PackingAiInsights;
}

export function wardrobeForInsights(items: WardrobeItem[]): { name: string; category: string }[] {
  return items.map((w) => ({ name: w.name, category: w.category }));
}
