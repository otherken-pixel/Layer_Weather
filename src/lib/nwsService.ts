import { supabase } from "./supabase";
import type { NWSAlert } from "@/types";

const NWS_BASE = "https://api.weather.gov";
const NWS_HEADERS = {
  "User-Agent": "LayerWeather/1.0 (contact@weartoday.app)",
  "Accept": "application/geo+json",
};

// Raw API response shapes (NWS GeoJSON alert feature)
export interface NWSAlertRaw {
  properties: {
    id: string;
    event: string;
    headline: string | null;
    severity: NWSAlert["severity"];
    urgency: NWSAlert["urgency"];
    effective: string;
    expires: string;
  };
}

export interface NWSPointsResponse {
  properties: {
    gridId: string;
    gridX: number;
    gridY: number;
    forecastHourly: string;
    relativeLocation?: {
      properties: { city: string; state: string };
    };
  };
}

// ── Public helpers ────────────────────────────────────────────────────────────

/**
 * Resolve NWS grid metadata for a lat/lon.
 * Returns null when the coordinates are outside NWS coverage (non-US).
 */
export async function resolveNWSGrid(
  lat: number,
  lon: number,
): Promise<NWSPointsResponse["properties"] | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8_000);
  try {
    const res = await fetch(
      `${NWS_BASE}/points/${lat.toFixed(4)},${lon.toFixed(4)}`,
      { headers: NWS_HEADERS, signal: ctrl.signal },
    );
    if (!res.ok) return null;
    const json: NWSPointsResponse = await res.json();
    return json?.properties ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch active NWS alerts for a lat/lon.
 * Filters out expired alerts. Returns [] on any error.
 */
export async function fetchNWSAlerts(lat: number, lon: number): Promise<NWSAlert[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8_000);
  try {
    const res = await fetch(
      `${NWS_BASE}/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`,
      { headers: NWS_HEADERS, signal: ctrl.signal },
    );
    if (!res.ok) return [];
    const json = await res.json();
    const now = new Date();
    return ((json.features ?? []) as NWSAlertRaw[])
      .map((f) => ({
        id: f.properties.id,
        event: f.properties.event,
        headline: f.properties.headline ?? f.properties.event,
        severity: f.properties.severity ?? "Unknown",
        urgency: f.properties.urgency ?? "Unknown",
        effective: new Date(f.properties.effective),
        expires: new Date(f.properties.expires),
      }))
      .filter((a) => a.expires > now);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Invoke the nws-weather Supabase Edge Function.
 * Throws when outside US coverage or on API failure so the caller
 * can fall through to the Open-Meteo fallback.
 */
export async function invokeNWSWeather(
  lat: number,
  lon: number,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke("nws-weather", {
    body: { lat, lon },
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object") throw new Error("Empty NWS weather response");
  const record = data as Record<string, unknown>;
  if (record.outside_us) throw new Error("Location outside NWS coverage");
  if (record.error) throw new Error(String(record.error));
  return record;
}
