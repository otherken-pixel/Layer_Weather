import { useEffect } from "react";
import { useAppStore } from "@/store";
import { registerPushNotifications, maybeShowOutfitAlert } from "@/lib/notifications";

/**
 * Registers push notifications once the user is authenticated.
 * Call this once at the app-layout level.
 */
export function usePushNotifications(): void {
  const { userId, weather, outfit } = useAppStore();

  useEffect(() => {
    if (!userId) return;
    registerPushNotifications(userId).catch((err) => {
      console.warn("Push notification registration failed:", err);
    });
  }, [userId]);

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
