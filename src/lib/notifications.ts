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

const LAST_ALERT_KEY = "wt_last_outfit_alert";

/**
 * Shows a one-per-day outfit alert in the browser notification tray
 * when significant weather conditions warrant it.
 * Server-side push (weather-alerts edge function) handles scheduled morning delivery;
 * this fires on the first weather load of the day as a fallback for web users.
 */
export function maybeShowOutfitAlert(opts: {
  feelsLike: number;
  precipProb: number;
  outfitLabel: string;
  description: string;
}): void {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const today = new Date().toDateString();
  if (localStorage.getItem(LAST_ALERT_KEY) === today) return;

  // Only alert for notable conditions
  const notable = opts.feelsLike < 40 || opts.feelsLike > 92 || opts.precipProb > 60;
  if (!notable) return;

  localStorage.setItem(LAST_ALERT_KEY, today);
  showLocalNotification(
    `Today: ${opts.outfitLabel}`,
    opts.description,
  );
}
