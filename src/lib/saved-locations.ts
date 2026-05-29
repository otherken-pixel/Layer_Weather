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

function sortAlpha(locs: LocationData[]): LocationData[] {
  return [...locs].sort((a, b) =>
    a.city.localeCompare(b.city, undefined, { sensitivity: "base" })
  );
}

function cityIdentityKey(loc: Pick<LocationData, "city" | "region" | "country">): string {
  return [loc.city, loc.region, loc.country]
    .map((s) => (s ?? "").trim().toLowerCase())
    .join("|");
}

function deduplicateByCityIdentity(locs: LocationData[]): LocationData[] {
  const seen = new Set<string>();
  return locs.filter((loc) => {
    const key = cityIdentityKey(loc);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function syncToCloud(userId: string, locations: LocationData[]): Promise<void> {
  try {
    const { upsertProfile } = await import("@/lib/supabase");
    await upsertProfile(userId, { saved_locations: locations });
  } catch { /* non-fatal */ }
}

export async function getSavedLocations(): Promise<LocationData[]> {
  const raw = await readRaw();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LocationData[];
    const deduped = deduplicateByCityIdentity(parsed);
    const sorted = sortAlpha(deduped);
    if (deduped.length < parsed.length) {
      await writeRaw(JSON.stringify(sorted));
    }
    return sorted;
  } catch { return []; }
}

export async function addSavedLocation(loc: LocationData, userId?: string): Promise<LocationData[]> {
  const existing = await getSavedLocations();
  const key = cityIdentityKey(loc);
  const filtered = existing.filter((l) => cityIdentityKey(l) !== key);
  const updated = sortAlpha([loc, ...filtered].slice(0, MAX_LOCATIONS));
  await writeRaw(JSON.stringify(updated));
  if (userId) void syncToCloud(userId, updated);
  return updated;
}

/** Remove one saved place (matched by city + coordinates, not city name alone). */
export async function removeSavedLocation(loc: LocationData, userId?: string): Promise<LocationData[]> {
  const existing = await getSavedLocations();
  const key = buildLocationCacheKey(loc);
  const updated = existing.filter((l) => buildLocationCacheKey(l) !== key);
  await writeRaw(JSON.stringify(updated));
  if (userId) void syncToCloud(userId, updated);
  return updated;
}

/**
 * Merges a cloud-sourced list into local storage and returns the sorted result.
 * Cloud locations take precedence for deduplication order; local-only additions
 * are appended so offline-added cities survive a cross-device login.
 */
export async function mergeFromCloud(cloudLocations: LocationData[]): Promise<LocationData[]> {
  const local = await getSavedLocations();
  const seen = new Set<string>();
  const merged: LocationData[] = [];
  for (const loc of [...cloudLocations, ...local]) {
    const key = cityIdentityKey(loc);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(loc);
    }
  }
  const sorted = sortAlpha(merged.slice(0, MAX_LOCATIONS));
  await writeRaw(JSON.stringify(sorted));
  return sorted;
}
