import { useCallback, useState } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { geocodeCity } from "@/lib/location-search";
import { upsertProfile } from "@/lib/supabase";
import { useAppStore } from "@/store";

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function requestBrowserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  if (!navigator.geolocation) return null;
  return withTimeout(
    new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 },
      );
    }),
    22000,
    null,
  );
}

export async function resolveDeviceCoordinates(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  if (Capacitor.isNativePlatform()) {
    const { location: perm } = await Geolocation.requestPermissions();
    if (perm !== "granted") return null;
    const pos = await withTimeout(
      Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 20000 }),
      22000,
      null,
    );
    if (pos) return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    return null;
  }
  return requestBrowserLocation();
}

export function useSaveLocation() {
  const { userId, setLocation } = useAppStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const persist = useCallback(
    async (coords: { latitude: number; longitude: number; city: string }) => {
      setLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        city: coords.city,
        region: "",
        country: "",
      });
      if (userId) {
        await upsertProfile(userId, {
          last_latitude: coords.latitude,
          last_longitude: coords.longitude,
          last_city: coords.city,
        });
      }
    },
    [userId, setLocation],
  );

  const saveFromCity = useCallback(
    async (query: string): Promise<{ ok: true } | { ok: false; message: string }> => {
      const trimmed = query.trim();
      if (trimmed.length < 2) {
        const message = "Enter at least 2 characters.";
        setError(message);
        return { ok: false, message };
      }
      setSaving(true);
      setError("");
      try {
        const place = await geocodeCity(trimmed);
        if (!place) {
          const message = "City not found. Check the spelling and try again.";
          setError(message);
          return { ok: false, message };
        }
        await persist({
          latitude: place.latitude,
          longitude: place.longitude,
          city: place.city,
        });
        return { ok: true };
      } catch {
        const message = "Could not save location. Check your connection.";
        setError(message);
        return { ok: false, message };
      } finally {
        setSaving(false);
      }
    },
    [persist],
  );

  const saveFromDevice = useCallback(async (): Promise<{ ok: true } | { ok: false; message: string }> => {
    setSaving(true);
    setError("");
    try {
      const coords = await resolveDeviceCoordinates();
      if (!coords) {
        const message = "Location permission denied or unavailable. Enter your city instead.";
        setError(message);
        return { ok: false, message };
      }
      await persist({ ...coords, city: "" });
      return { ok: true };
    } catch {
      const message = "Could not get your location. Try entering a city.";
      setError(message);
      return { ok: false, message };
    } finally {
      setSaving(false);
    }
  }, [persist]);

  return { saveFromCity, saveFromDevice, saving, error, setError };
}
