import { useEffect, useRef } from "react";
import { useAppStore } from "@/store";
import { registerPushNotifications } from "@/lib/notifications";

/**
 * Registers push notifications once the user is authenticated.
 * Call this once at the app-layout level.
 */
export function usePushNotifications(): void {
  const { userId } = useAppStore();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!userId || registeredRef.current) return;
    registeredRef.current = true;
    // Fire-and-forget: non-fatal if registration fails
    registerPushNotifications(userId).catch((err) => {
      console.warn("Push notification registration failed:", err);
    });
  }, [userId]);
}
