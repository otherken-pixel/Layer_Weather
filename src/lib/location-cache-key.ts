import { DEVICE_LOCATION_KEY } from "@/store";
import type { LocationData } from "@/types";

/** Stable cache / React key for a saved place (city name alone is ambiguous). */
export function buildLocationCacheKey(
  loc: Pick<LocationData, "city" | "latitude" | "longitude"> | string,
): string {
  if (loc === DEVICE_LOCATION_KEY) return DEVICE_LOCATION_KEY;
  if (typeof loc === "string") return loc;
  const city = loc.city.trim().toLowerCase() || "unknown";
  const lat = Number.isFinite(loc.latitude) ? loc.latitude.toFixed(2) : "";
  const lon = Number.isFinite(loc.longitude) ? loc.longitude.toFixed(2) : "";
  return `${city}|${lat}|${lon}`;
}

export function locationTabKey(loc: LocationData): string {
  return buildLocationCacheKey(loc);
}
