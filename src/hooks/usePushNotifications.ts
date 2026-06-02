import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store";
import { registerPushNotifications, maybeShowOutfitAlert, setPushDeepLinkNavigator } from "@/lib/notifications";
import { setupNotificationChannels, attachLocalNotificationListener, rescheduleAllNotifications, maybeFireNowcastAlert, maybeFireNowcastClearAlert, maybeFireLightningAlert, maybeFireAqiAlert, maybeFirePollenAlert, maybeFireUvAlert } from "@/lib/local-notifications";
import { loadNotifPrefs } from "@/lib/notification-prefs";
import { getPackingTrips } from "@/lib/supabase";
import { startOrUpdateLiveActivity } from "@/lib/live-activity";

/**
 * Registers push notifications, sets up Android channels, wires all
 * context-triggered alerts, and schedules repeating local notifications.
 * Call once at the app-layout level.
 */
export function usePushNotifications(): void {
  const navigate = useNavigate();
  const { userId, profile, weather, outfit, lightningActivity, aqiBreakdown, pollenData, nwsAlerts, activeAlerts } = useAppStore();
  const channelsReady = useRef(false);
  const scheduledForUser = useRef<string | null>(null);

  // Wire push deep-link navigator once the router is ready
  useEffect(() => {
    setPushDeepLinkNavigator((path) => navigate(path));
  }, [navigate]);

  // Register for push + create notification channels once on sign-in
  useEffect(() => {
    if (!userId) return;
    registerPushNotifications(userId).catch((err) => {
      console.warn("Push notification registration failed:", err);
    });

    if (!channelsReady.current) {
      channelsReady.current = true;
      setupNotificationChannels().catch(() => {});
    }
  }, [userId]);

  // Attach local notification deep-link listener
  useEffect(() => {
    const cleanup = attachLocalNotificationListener((path) => navigate(path));
    return cleanup;
  }, [navigate]);

  // Reschedule when commute times change (must run before scheduling effect)
  const commuteStart = profile?.commute_start;
  const commuteEnd = profile?.commute_end;
  useEffect(() => {
    if (!userId || !profile) return;
    scheduledForUser.current = null; // force reschedule
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commuteStart, commuteEnd]);

  // Schedule/reschedule all repeating local notifications when prefs or commute changes
  useEffect(() => {
    if (!userId || !profile) return;
    if (scheduledForUser.current === userId) return;
    scheduledForUser.current = userId;

    const city = profile.last_city ?? "your location";
    const commuteStart = profile.commute_start ?? null;
    const commuteEnd = profile.commute_end ?? null;

    loadNotifPrefs(profile.notif_prefs).then(async (prefs) => {
      const trips = await getPackingTrips(userId).catch(() => []);
      await rescheduleAllNotifications({ prefs, commuteStart, commuteEnd, city, trips });
    }).catch(() => {});
  }, [userId, profile]);

  // Legacy outfit alert (browser Notification API, fires when app is open)
  useEffect(() => {
    if (!weather || !outfit) return;
    maybeShowOutfitAlert({
      feelsLike: weather.current.feelsLike,
      precipProb: weather.current.precipProb,
      outfitLabel: outfit.label,
      description: outfit.description,
    });
  }, [weather, outfit]);

  // Context-triggered weather alerts when data arrives
  useEffect(() => {
    if (!weather || !profile) return;

    loadNotifPrefs(profile.notif_prefs).then(async (prefs) => {
      await maybeFireNowcastAlert(weather, prefs);
      await maybeFireNowcastClearAlert(weather, prefs);
      await maybeFireUvAlert(weather, prefs);
    }).catch(() => {});
  }, [weather, profile]);

  // Live Activity update when weather + outfit are available
  useEffect(() => {
    if (!weather || !profile || !outfit) return;
    const city = profile.last_city ?? "your location";
    const accent = profile.accent_color ?? "#4F46E5";

    startOrUpdateLiveActivity(
      weather, outfit, city, accent, nwsAlerts, activeAlerts, lightningActivity,
    ).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather, outfit, profile]);

  useEffect(() => {
    if (!profile) return;
    loadNotifPrefs(profile.notif_prefs).then((prefs) =>
      maybeFireLightningAlert(lightningActivity, prefs)
    ).catch(() => {});
  }, [lightningActivity, profile]);

  useEffect(() => {
    if (!profile) return;
    loadNotifPrefs(profile.notif_prefs).then((prefs) =>
      maybeFireAqiAlert(aqiBreakdown, prefs)
    ).catch(() => {});
  }, [aqiBreakdown, profile]);

  useEffect(() => {
    if (!profile) return;
    loadNotifPrefs(profile.notif_prefs).then((prefs) =>
      maybeFirePollenAlert(pollenData, prefs)
    ).catch(() => {});
  }, [pollenData, profile]);
}
