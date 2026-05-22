import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { upsertProfile } from "./supabase";

let _registered = false;

/**
 * Requests push notification permission and registers the device.
 * Saves the FCM/APNs token to the user's profile for server-side delivery.
 *
 * Safe to call multiple times — de-dupes after first registration.
 */
export async function registerPushNotifications(userId: string): Promise<void> {
  if (_registered) return;
  if (!Capacitor.isNativePlatform()) {
    // On web, use the browser Notification API if available
    await registerWebNotifications(userId);
    return;
  }

  const { receive } = await PushNotifications.requestPermissions();
  if (receive !== "granted") return;

  await PushNotifications.register();

  PushNotifications.addListener("registration", async (token) => {
    _registered = true;
    try {
      await upsertProfile(userId, { fcm_token: token.value });
    } catch {
      // Token save failure is non-fatal; will retry on next app launch
    }
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.warn("Push registration error:", err.error);
  });

  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    // App is in foreground — could show in-app toast here
    console.log("Push received (foreground):", notification.title);
  });

  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    // User tapped the notification
    console.log("Push action:", action.actionId);
  });
}

/**
 * Web push registration via the Notifications API (for PWA installs).
 * Stores a placeholder token since FCM web push requires a VAPID key setup.
 */
async function registerWebNotifications(userId: string): Promise<void> {
  if (!("Notification" in window)) return;
  if (Notification.permission === "denied") return;

  if (Notification.permission !== "granted") {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return;
  }

  // Mark as registered with a placeholder — actual web push
  // requires service worker + VAPID key configured in the edge function.
  _registered = true;
  try {
    await upsertProfile(userId, { fcm_token: `web_${userId.slice(0, 8)}` });
  } catch {
    // Non-fatal
  }
}

/** Shows a local notification (useful for commute alerts when app is open). */
export function showLocalNotification(title: string, body: string): void {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  // eslint-disable-next-line no-new
  new Notification(title, { body, icon: "/icons/icon.png" });
}
