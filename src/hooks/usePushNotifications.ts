import { useEffect, useRef } from "react";
import { useAppStore } from "@/store";
import { registerPushNotifications, maybeShowOutfitAlert } from "@/lib/notifications";

/**
 * Registers push notifications once the user is authenticated.
 * Call this once at the app-layout level.
 */
export function usePushNotifications(): void {
  const { userId, weather, outfit } = useAppStore();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!userId || registeredRef.current) return;
    registeredRef.current = true;
    registerPushNotifications(userId).catch((err) => {
      console.warn("Push notification registration failed:", err);
    });
  }, [userId]);

  // Show a one-per-day local notification when weather loads and conditions are notable
  useEffect(() => {
    if (!weather || !outfit) return;
    maybeShowOutfitAlert({
      feelsLike: weather.current.feelsLike,
      precipProb: weather.current.precipProb,
      outfitLabel: outfit.label,
      description: outfit.description,
    });
  }, [weather, outfit]);
}
