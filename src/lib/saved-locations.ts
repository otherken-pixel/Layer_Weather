import { buildLocationCacheKey } from "@/lib/location-cache-key";
import type { LocationData } from "@/types";

const PREF_KEY = "wt_saved_locations";
const MAX_LOCATIONS = 5;

async function readRaw(): Promise<string | null> {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: PREF_KEY });
    return value;
  } catch {
    return localStorage.getItem(PREF_KEY);
  }
}

async function writeRaw(json: string): Promise<void> {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key: PREF_KEY, value: json });
  } catch {
    localStorage.setItem(PREF_KEY, json);
  }
}

export async function getSavedLocations(): Promise<LocationData[]> {
  const raw = await readRaw();
  if (!raw) return [];
  try { return JSON.parse(raw) as LocationData[]; } catch { return []; }
}

export async function addSavedLocation(loc: LocationData): Promise<LocationData[]> {
  const existing = await getSavedLocations();
  // Deduplicate by city name (case-insensitive)
  const key = buildLocationCacheKey(loc);
  const filtered = existing.filter((l) => buildLocationCacheKey(l) !== key);
  const updated = [loc, ...filtered].slice(0, MAX_LOCATIONS);
  await writeRaw(JSON.stringify(updated));
  return updated;
}

/** Remove one saved place (matched by city + coordinates, not city name alone). */
export async function removeSavedLocation(loc: LocationData): Promise<LocationData[]> {
  const existing = await getSavedLocations();
  const key = buildLocationCacheKey(loc);
  const updated = existing.filter((l) => buildLocationCacheKey(l) !== key);
  await writeRaw(JSON.stringify(updated));
  return updated;
}
