import type { WeatherData, OutfitRecommendation } from "@/types";

interface WidgetSnapshot {
  temp: number;
  feelsLike: number;
  condition: string;
  outfitLabel: string;
  location: string;
  updatedAt: string;
}

// Saves a lightweight snapshot for native iOS/Android home screen widgets.
// Uses @capacitor/preferences which maps to UserDefaults (iOS) and SharedPreferences (Android).
export async function saveWidgetSnapshot(
  weather: WeatherData,
  outfit: OutfitRecommendation,
): Promise<void> {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const snapshot: WidgetSnapshot = {
      temp: weather.current.temp,
      feelsLike: weather.current.feelsLike,
      condition: weather.current.condition,
      outfitLabel: outfit.label,
      location: weather.current.location,
      updatedAt: new Date().toISOString(),
    };
    await Preferences.set({ key: "widget_snapshot", value: JSON.stringify(snapshot) });
  } catch {
    // Non-fatal — Preferences plugin may not be available in web
  }
}
