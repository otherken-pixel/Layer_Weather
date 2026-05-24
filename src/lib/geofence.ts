import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import type { LocationData } from "@/types";

const GEOFENCE_RADIUS_KM = 5;
const MIN_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

export interface GeofenceOptions {
  currentLocation: LocationData;
  onSignificantMove: (newCoords: { latitude: number; longitude: number }) => void;
}

let watchId: string | null = null;
let lastTriggerMs = 0;

export async function startGeofence(opts: GeofenceOptions): Promise<void> {
  if (watchId !== null) return;

  const handlePosition = (coords: { latitude: number; longitude: number }) => {
    const distance = haversineKm(opts.currentLocation, coords);
    if (distance > GEOFENCE_RADIUS_KM && Date.now() - lastTriggerMs > MIN_INTERVAL_MS) {
      lastTriggerMs = Date.now();
      opts.onSignificantMove({ latitude: coords.latitude, longitude: coords.longitude });
    }
  };

  if (Capacitor.isNativePlatform()) {
    const id = await Geolocation.watchPosition(
      { enableHighAccuracy: false },
      (position, err) => {
        if (err || !position) return;
        handlePosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
    );
    watchId = id;
  } else {
    const id = navigator.geolocation.watchPosition(
      (position) => {
        handlePosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      undefined,
      { enableHighAccuracy: false },
    );
    watchId = String(id);
  }
}

export async function stopGeofence(): Promise<void> {
  if (watchId === null) return;

  const id = watchId;
  watchId = null;

  if (Capacitor.isNativePlatform()) {
    await Geolocation.clearWatch({ id });
  } else {
    navigator.geolocation.clearWatch(Number(id));
  }
}
