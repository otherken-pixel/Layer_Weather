import { LocalNotifications, type Channel } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import type { NotificationPrefs } from "@/types/notification-prefs";
import { AQI_THRESHOLD_VALUES } from "@/types/notification-prefs";
import type { WeatherData, LightningActivity, PollenData, EPAObservation, SavedPackingTrip } from "@/types";
import { isInQuietHours, nextOccurrence, nextSundayAt } from "@/lib/notification-prefs";

// ── Notification IDs (stable across reschedules) ─────────────────────────────
const ID = {
  MORNING_BRIEFING:   1001,
  EVENING_PREVIEW:    1002,
  COMMUTE_MORNING:    1003,
  COMMUTE_EVENING:    1004,
  WEEKLY_PREVIEW:     1005,
  FEEDBACK_REQUEST:   1006,
  // Context-triggered (fired once, no persistent schedule)
  NOWCAST_RAIN:       2001,
  LIGHTNING:          2002,
  AQI:                2003,
  POLLEN:             2004,
  UV:                 2005,
  // Trip reminders use IDs 3000 + trip index
  TRIP_BASE:          3000,
};

// ── Android notification channels ────────────────────────────────────────────

const CHANNELS: Channel[] = [
  {
    id: "weather-critical",
    name: "Severe Weather Alerts",
    description: "Tornado, hurricane, flash flood, and other life-safety alerts",
    importance: 5,
    visibility: 1,
    vibration: true,
    sound: "default",
  },
  {
    id: "weather-nowcast",
    name: "Precipitation Nowcast",
    description: "Rain starting or stopping in the next 20 minutes",
    importance: 4,
    visibility: 1,
    vibration: true,
  },
  {
    id: "weather-daily",
    name: "Daily Outfit Briefing",
    description: "Morning and evening weather + outfit summaries",
    importance: 4,
    visibility: 1,
  },
  {
    id: "weather-commute",
    name: "Commute Alerts",
    description: "Weather conditions around your commute times",
    importance: 4,
    visibility: 1,
  },
  {
    id: "weather-health",
    name: "Air Quality & Pollen",
    description: "AQI, pollen, UV index threshold alerts",
    importance: 3,
    visibility: 1,
  },
  {
    id: "weather-trips",
    name: "Trip & Packing",
    description: "Reminders for upcoming trips and packing lists",
    importance: 3,
    visibility: 1,
  },
  {
    id: "weather-feedback",
    name: "Outfit Feedback",
    description: "Occasional request to rate your outfit recommendation",
    importance: 2,
    visibility: 0,
  },
  {
    id: "weather-weekly",
    name: "Weekly Preview",
    description: "Sunday evening overview of the week ahead",
    importance: 3,
    visibility: 1,
  },
];

/** Creates Android notification channels. Safe to call on every app launch. */
export async function setupNotificationChannels(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    for (const channel of CHANNELS) {
      await LocalNotifications.createChannel(channel);
    }
  } catch {
    // Non-fatal — channels fall back to default on failure
  }
}

// ── Permission request ────────────────────────────────────────────────────────

export async function requestLocalNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return "Notification" in window;
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === "granted";
  } catch {
    return false;
  }
}

// ── Scheduled notification helpers ───────────────────────────────────────────

/** Cancels scheduled local notifications by their stable IDs before rescheduling. */
async function cancel(ids: number[]): Promise<void> {
  try {
    await LocalNotifications.cancel({
      notifications: ids.map((id) => ({ id })),
    });
  } catch {
    // Non-fatal
  }
}

async function isGranted(): Promise<boolean> {
  try {
    const { display } = await LocalNotifications.checkPermissions();
    return display === "granted";
  } catch {
    return false;
  }
}

// ── Morning outfit briefing (#4) ─────────────────────────────────────────────

export async function scheduleMorningBriefing(
  prefs: NotificationPrefs,
  commuteStart: string | null,
  city: string,
): Promise<void> {
  await cancel([ID.MORNING_BRIEFING]);
  if (!prefs.morningOutfitBriefing || !(await isGranted())) return;

  const time = commuteStart ?? "07:00";
  const [h, m] = time.split(":").map(Number);
  const briefingH = h === 0 ? 23 : h - 1; // 1 hour before commute, min midnight
  const briefingTime = `${String(briefingH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const at = nextOccurrence(briefingTime);

  await LocalNotifications.schedule({
    notifications: [
      {
        id: ID.MORNING_BRIEFING,
        title: "Good morning — check today's outfit",
        body: `What to wear in ${city} today. Tap to see your recommendation.`,
        channelId: "weather-daily",
        schedule: { at, every: "day", allowWhileIdle: true },
        actionTypeId: "OPEN_OUTFIT",
        extra: { route: "/app/index" },
      },
    ],
  });
}

// ── Evening tomorrow preview (#5) ────────────────────────────────────────────

export async function scheduleEveningPreview(
  prefs: NotificationPrefs,
  city: string,
): Promise<void> {
  await cancel([ID.EVENING_PREVIEW]);
  if (!prefs.eveningTomorrowPreview || !(await isGranted())) return;

  const at = nextOccurrence("20:00");

  await LocalNotifications.schedule({
    notifications: [
      {
        id: ID.EVENING_PREVIEW,
        title: "Tomorrow's forecast is ready",
        body: `Plan ahead for ${city}. See tomorrow's weather and outfit suggestion.`,
        channelId: "weather-daily",
        schedule: { at, every: "day", allowWhileIdle: true },
        actionTypeId: "OPEN_FORECAST",
        extra: { route: "/app/forecast" },
      },
    ],
  });
}

// ── Commute weather alerts (#6) ──────────────────────────────────────────────

export async function scheduleCommuteAlerts(
  prefs: NotificationPrefs,
  commuteStart: string | null,
  commuteEnd: string | null,
  city: string,
): Promise<void> {
  await cancel([ID.COMMUTE_MORNING, ID.COMMUTE_EVENING]);
  if (!prefs.commuteWeatherAlert || !(await isGranted())) return;

  const now = new Date();
  const notifications = [];

  if (commuteStart) {
    const [h, m] = commuteStart.split(":").map(Number);
    const alertMin = m >= 30 ? m - 30 : m + 30;
    const alertH = m >= 30 ? h : h > 0 ? h - 1 : 23;
    const alertTime = `${String(alertH).padStart(2, "0")}:${String(alertMin).padStart(2, "0")}`;
    const at = nextOccurrence(alertTime);
    if (at > now) {
      notifications.push({
        id: ID.COMMUTE_MORNING,
        title: "Commute weather check",
        body: `Heading out from ${city} soon — check weather conditions before you leave.`,
        channelId: "weather-commute",
        schedule: { at, every: "day" as const, allowWhileIdle: true },
        actionTypeId: "OPEN_OUTFIT",
        extra: { route: "/app/index" },
      });
    }
  }

  if (commuteEnd) {
    const [h, m] = commuteEnd.split(":").map(Number);
    const alertMin = m >= 30 ? m - 30 : m + 30;
    const alertH = m >= 30 ? h : h > 0 ? h - 1 : 23;
    const alertTime = `${String(alertH).padStart(2, "0")}:${String(alertMin).padStart(2, "0")}`;
    const at = nextOccurrence(alertTime);
    if (at > now) {
      notifications.push({
        id: ID.COMMUTE_EVENING,
        title: "Evening commute weather",
        body: `Heading home from ${city}? Check if conditions changed since this morning.`,
        channelId: "weather-commute",
        schedule: { at, every: "day" as const, allowWhileIdle: true },
        actionTypeId: "OPEN_FORECAST",
        extra: { route: "/app/forecast" },
      });
    }
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }
}

// ── Weekly weather preview (#15) ─────────────────────────────────────────────

export async function scheduleWeeklyPreview(
  prefs: NotificationPrefs,
  city: string,
): Promise<void> {
  await cancel([ID.WEEKLY_PREVIEW]);
  if (!prefs.weeklyWeatherPreview || !(await isGranted())) return;

  const at = nextSundayAt("20:00");

  await LocalNotifications.schedule({
    notifications: [
      {
        id: ID.WEEKLY_PREVIEW,
        title: "Your week ahead in " + city,
        body: "Plan your wardrobe — 7-day forecast is ready. Tap to see the week ahead.",
        channelId: "weather-weekly",
        schedule: { at, every: "week" as const, allowWhileIdle: true },
        actionTypeId: "OPEN_FORECAST",
        extra: { route: "/app/forecast" },
      },
    ],
  });
}

// ── Outfit feedback request (#14) ────────────────────────────────────────────

export async function scheduleOutfitFeedback(
  prefs: NotificationPrefs,
): Promise<void> {
  await cancel([ID.FEEDBACK_REQUEST]);
  if (!prefs.outfitFeedbackRequest || !(await isGranted())) return;

  // Fire at 7pm (after the work day) on days when the morning notification was shown.
  // We schedule it every day and the app handles dedup.
  const at = nextOccurrence("19:00");

  await LocalNotifications.schedule({
    notifications: [
      {
        id: ID.FEEDBACK_REQUEST,
        title: "How was today's outfit?",
        body: "Rate your recommendation to help Layer Weather learn your style.",
        channelId: "weather-feedback",
        schedule: { at, every: "day", allowWhileIdle: true },
        actionTypeId: "OPEN_OUTFIT",
        extra: { route: "/app/index", feedback: true },
      },
    ],
  });
}

// ── Trip reminders (#12) ─────────────────────────────────────────────────────

export async function scheduleTripReminders(
  prefs: NotificationPrefs,
  trips: SavedPackingTrip[],
): Promise<void> {
  // Cancel all existing trip reminders
  const existingIds = trips.map((_, i) => ID.TRIP_BASE + i);
  await cancel(existingIds);

  if (!prefs.tripWeatherReminder || !(await isGranted())) return;

  const notifications = [];
  const now = new Date();

  for (let i = 0; i < trips.length; i++) {
    const trip = trips[i];
    const departure = new Date(trip.departure_date);
    const reminder = new Date(departure);
    reminder.setDate(departure.getDate() - 1);
    reminder.setHours(19, 0, 0, 0);

    if (reminder <= now) continue;

    notifications.push({
      id: ID.TRIP_BASE + i,
      title: `Your trip to ${trip.destination} is tomorrow`,
      body: "Check your packing list and latest weather forecast before you go.",
      channelId: "weather-trips",
      schedule: { at: reminder },
      actionTypeId: "OPEN_PACKING",
      extra: { route: "/app/packing", tripId: trip.id },
    });
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }
}

// ── Context-triggered alerts (fired immediately when data warrants) ───────────

const LAST_NOWCAST_KEY = "wt_last_nowcast_alert";
const LAST_LIGHTNING_KEY = "wt_last_lightning_alert";
const LAST_AQI_KEY = "wt_last_aqi_alert";
const LAST_POLLEN_KEY = "wt_last_pollen_alert";
const LAST_UV_KEY = "wt_last_uv_alert";

function oncePerHour(storageKey: string): boolean {
  const last = localStorage.getItem(storageKey);
  if (!last) return true;
  return Date.now() - Number(last) > 60 * 60 * 1000;
}

function markFired(storageKey: string): void {
  localStorage.setItem(storageKey, String(Date.now()));
}

/** Fires a local notification immediately (native or browser fallback). */
async function fireNow(
  id: number,
  title: string,
  body: string,
  channelId: string,
  route = "/app/index",
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title,
            body,
            channelId,
            schedule: { at: new Date(Date.now() + 500) },
            actionTypeId: "DEEP_LINK",
            extra: { route },
          },
        ],
      });
      return;
    } catch {
      // Fall through to browser API
    }
  }
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/icons/icon.png", tag: String(id) });
  }
}

// ── Precipitation nowcast alert (#2) ─────────────────────────────────────────

export async function maybeFireNowcastAlert(
  weather: WeatherData,
  prefs: NotificationPrefs,
): Promise<void> {
  if (!prefs.precipNowcast || isInQuietHours(prefs)) return;
  if (!oncePerHour(LAST_NOWCAST_KEY)) return;

  const nowcast = weather.nextHourPrecip;
  if (!nowcast || nowcast.minutes.length === 0) return;

  const minutesUntilRain = nowcast.minutes.findIndex((m) => m.precipProbability > 0.5);
  if (minutesUntilRain < 0 || minutesUntilRain > 20) return;

  const rainWindow = minutesUntilRain <= 2 ? "right now" : `in ${minutesUntilRain} minutes`;
  markFired(LAST_NOWCAST_KEY);
  await fireNow(
    ID.NOWCAST_RAIN,
    "Rain starting " + rainWindow,
    `Precipitation detected nearby. Grab an umbrella before heading out.`,
    "weather-nowcast",
  );
}

/** Fires when a nowcast shows rain ending soon. */
export async function maybeFireNowcastClearAlert(
  weather: WeatherData,
  prefs: NotificationPrefs,
): Promise<void> {
  if (!prefs.precipNowcast || isInQuietHours(prefs)) return;

  const nowcast = weather.nextHourPrecip;
  if (!nowcast) return;

  const currentlyRaining = weather.current.precipProb > 50;
  if (!currentlyRaining) return;

  const clearInMinutes = nowcast.minutes.findIndex((m) => m.precipProbability < 0.3);
  if (clearInMinutes < 0 || clearInMinutes > 25) return;

  const clearKey = "wt_last_nowcast_clear";
  if (!oncePerHour(clearKey)) return;
  markFired(clearKey);

  await fireNow(
    ID.NOWCAST_CLEAR,
    `Rain clearing in ${clearInMinutes} minutes`,
    "Conditions improving soon. Good time to head out.",
    "weather-nowcast",
  );
}

// ── Lightning proximity alert (#3) ───────────────────────────────────────────

export async function maybeFireLightningAlert(
  activity: LightningActivity | null,
  prefs: NotificationPrefs,
): Promise<void> {
  if (!prefs.lightningAlerts || isInQuietHours(prefs)) return;
  if (activity !== "high" && activity !== "moderate") return;

  const today = new Date().toDateString();
  const lastKey = LAST_LIGHTNING_KEY + "_" + today;
  if (localStorage.getItem(lastKey)) return;
  localStorage.setItem(lastKey, "1");

  const intensity = activity === "high" ? "Heavy" : "Moderate";
  await fireNow(
    ID.LIGHTNING,
    `${intensity} lightning activity nearby`,
    "NOAA detected lightning strikes in your area. Stay indoors or seek shelter.",
    "weather-critical",
  );
}

// ── Air quality alert (#7) ────────────────────────────────────────────────────

export async function maybeFireAqiAlert(
  observations: EPAObservation[] | null,
  prefs: NotificationPrefs,
): Promise<void> {
  if (!prefs.airQualityAlerts || isInQuietHours(prefs)) return;
  if (!observations || observations.length === 0) return;

  const maxAqi = Math.max(...observations.map((o) => o.aqi));
  const threshold = AQI_THRESHOLD_VALUES[prefs.aqiThreshold] ?? 151;
  if (maxAqi < threshold) return;

  if (!oncePerHour(LAST_AQI_KEY)) return;
  markFired(LAST_AQI_KEY);

  const worst = observations.reduce((a, b) => (a.aqi > b.aqi ? a : b));
  await fireNow(
    ID.AQI,
    `Air quality alert — AQI ${maxAqi}`,
    `${worst.category} conditions detected. Consider limiting time outdoors.`,
    "weather-health",
  );
}

// ── Pollen alert (#8) ────────────────────────────────────────────────────────

export async function maybeFirePollenAlert(
  pollen: PollenData | null,
  prefs: NotificationPrefs,
): Promise<void> {
  if (!prefs.pollenAlerts || isInQuietHours(prefs)) return;
  if (!pollen) return;

  const level = pollen.level;
  if (level !== "high" && level !== "very_high") return;

  const today = new Date().toDateString();
  const lastKey = LAST_POLLEN_KEY + "_" + today;
  if (localStorage.getItem(lastKey)) return;
  localStorage.setItem(lastKey, "1");

  const triggeredTypes = prefs.pollenTypes.filter((type) => {
    const val = pollen[type];
    return val !== null && val > 3;
  });
  if (triggeredTypes.length === 0) return;

  const pollenList = triggeredTypes
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .join(", ");
  const levelLabel = level === "very_high" ? "Very High" : "High";

  await fireNow(
    ID.POLLEN,
    `${levelLabel} pollen today`,
    `Elevated ${pollenList} pollen. Consider allergy precautions if sensitive.`,
    "weather-health",
  );
}

// ── UV index alert (#9) ───────────────────────────────────────────────────────

export async function maybeFireUvAlert(
  weather: WeatherData,
  prefs: NotificationPrefs,
): Promise<void> {
  if (!prefs.uvAlerts || isInQuietHours(prefs)) return;
  if (weather.current.uvIndex < prefs.uvThreshold) return;

  const today = new Date().toDateString();
  const lastKey = LAST_UV_KEY + "_" + today;
  if (localStorage.getItem(lastKey)) return;
  localStorage.setItem(lastKey, "1");

  const uv = weather.current.uvIndex;
  const label = uv >= 11 ? "Extreme" : uv >= 8 ? "Very High" : uv >= 6 ? "High" : "Moderate";

  await fireNow(
    ID.UV,
    `UV index ${uv} — ${label}`,
    "SPF recommended. Limit peak sun exposure between 10am–4pm.",
    "weather-health",
  );
}

// ── Reschedule all scheduled notifications ────────────────────────────────────

export interface ScheduleOptions {
  prefs: NotificationPrefs;
  commuteStart: string | null;
  commuteEnd: string | null;
  city: string;
  trips?: SavedPackingTrip[];
}

/**
 * Re-schedules all repeating local notifications based on current preferences.
 * Call on app start, after prefs change, and after commute time changes.
 */
export async function rescheduleAllNotifications(opts: ScheduleOptions): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const { prefs, commuteStart, commuteEnd, city, trips = [] } = opts;

  await Promise.allSettled([
    scheduleMorningBriefing(prefs, commuteStart, city),
    scheduleEveningPreview(prefs, city),
    scheduleCommuteAlerts(prefs, commuteStart, commuteEnd, city),
    scheduleWeeklyPreview(prefs, city),
    scheduleOutfitFeedback(prefs),
    scheduleTripReminders(prefs, trips),
  ]);
}

// ── Deep link listener ───────────────────────────────────────────────────────

type NavigateFn = (path: string) => void;

/**
 * Wires up the local notification action listener for deep-linking.
 * Returns a cleanup function.
 */
export function attachLocalNotificationListener(navigate: NavigateFn): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};

  const handle = LocalNotifications.addListener(
    "localNotificationActionPerformed",
    (action) => {
      const route = action.notification.extra?.route as string | undefined;
      if (route) navigate(route);
    },
  );

  return () => {
    handle.then((h) => h.remove()).catch(() => {});
  };
}
