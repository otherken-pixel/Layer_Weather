import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { upsertProfile } from "./supabase";

let listenersAttached = false;
let tokenSavedForUser: string | null = null;
/** User id for whom push registration callbacks should persist tokens (updated on every register call). */
let activePushUserId: string | null = null;

async function saveToken(userId: string, token: string): Promise<void> {
  const key = `${userId}:${token}`;
  if (tokenSavedForUser === key) return;
  await upsertProfile(userId, { fcm_token: token });
  tokenSavedForUser = key;
}

function attachListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;

  PushNotifications.addListener("registration", async (token) => {
    const uid = activePushUserId;
    if (!uid) return;
    try {
      await saveToken(uid, token.value);
    } catch (err) {
      console.warn("Failed to save FCM token:", err);
    }
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.warn("Push registration error:", err.error);
    listenersAttached = false;
    tokenSavedForUser = null;
  });

  PushNotifications.addListener("pushNotificationReceived", (_notification) => {
    // Foreground notification received — app UI already reflects current weather.
  });

  PushNotifications.addListener("pushNotificationActionPerformed", (_action) => {
    // Deep-link handling can be wired here in a future release.
  });
}

/**
 * Clears native push listeners and in-module flags so the next sign-in re-binds
 * with the correct user id. Call on sign-out.
 */
export async function resetPushNotificationSession(): Promise<void> {
  activePushUserId = null;
  tokenSavedForUser = null;
  if (!Capacitor.isNativePlatform()) return;
  try {
    await PushNotifications.removeAllListeners();
  } catch {
    /* non-fatal */
  }
  listenersAttached = false;
}

/**
 * Requests push notification permission and registers the device.
 * Saves the FCM/APNs token to the user's profile for server-side delivery.
 */
export async function registerPushNotifications(userId: string): Promise<boolean> {
  activePushUserId = userId;

  if (!Capacitor.isNativePlatform()) {
    await registerWebNotifications(userId);
    return false;
  }

  attachListeners();

  const { receive } = await PushNotifications.requestPermissions();
  if (receive !== "granted") return false;

  await PushNotifications.register();
  return true;
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

  try {
    await saveToken(userId, `web_${userId.slice(0, 8)}`);
  } catch {
    /* non-fatal */
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

  const notable = opts.feelsLike < 40 || opts.feelsLike > 92 || opts.precipProb > 60;
  if (!notable) return;

  localStorage.setItem(LAST_ALERT_KEY, today);
  showLocalNotification(`Today: ${opts.outfitLabel}`, opts.description);
}
