export type PollenAlertType = "tree" | "grass" | "weed";

/** Per-user push notification preferences. Stored as JSONB in profiles.notif_prefs. */
export interface NotificationPrefs {
  // ── Tier 1 — Critical / Safety ──────────────────────────────────────────
  severeWeatherAlerts: boolean;
  precipNowcast: boolean;
  lightningAlerts: boolean;

  // ── Tier 2 — Daily utility ───────────────────────────────────────────────
  morningOutfitBriefing: boolean;
  eveningTomorrowPreview: boolean;
  commuteWeatherAlert: boolean;

  // ── Tier 3 — Health & environment ────────────────────────────────────────
  airQualityAlerts: boolean;
  /** AQI category index that triggers the alert: 1=Good 2=Moderate 3=USG 4=Unhealthy 5=VeryUnhealthy */
  aqiThreshold: 1 | 2 | 3 | 4 | 5;
  pollenAlerts: boolean;
  pollenTypes: PollenAlertType[];
  uvAlerts: boolean;
  /** UV index value that triggers the alert. Default 6 (High). */
  uvThreshold: number;

  // ── Tier 5 — Trip & planning ─────────────────────────────────────────────
  tripWeatherReminder: boolean;
  tripWeatherChange: boolean;

  // ── Tier 6 — Engagement ──────────────────────────────────────────────────
  outfitFeedbackRequest: boolean;
  weeklyWeatherPreview: boolean;

  // ── Quiet hours ──────────────────────────────────────────────────────────
  quietHoursEnabled: boolean;
  /** "HH:MM" 24-hour format, e.g. "22:00" */
  quietHoursStart: string;
  /** "HH:MM" 24-hour format, e.g. "07:00" */
  quietHoursEnd: string;
}

export const DEFAULT_NOTIF_PREFS: NotificationPrefs = {
  severeWeatherAlerts: true,
  precipNowcast: true,
  lightningAlerts: true,
  morningOutfitBriefing: true,
  eveningTomorrowPreview: true,
  commuteWeatherAlert: true,
  airQualityAlerts: true,
  aqiThreshold: 3,
  pollenAlerts: true,
  pollenTypes: ["tree", "grass", "weed"],
  uvAlerts: true,
  uvThreshold: 6,
  tripWeatherReminder: true,
  tripWeatherChange: true,
  outfitFeedbackRequest: true,
  weeklyWeatherPreview: true,
  quietHoursEnabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
};

export const AQI_THRESHOLD_LABELS: Record<number, string> = {
  1: "Good (51+)",
  2: "Moderate (101+)",
  3: "Unhealthy for Sensitive Groups (151+)",
  4: "Unhealthy (201+)",
  5: "Very Unhealthy (301+)",
};

/** Maps AQI threshold index to the minimum US EPA AQI value that triggers an alert. */
export const AQI_THRESHOLD_VALUES: Record<number, number> = {
  1: 51,
  2: 101,
  3: 151,
  4: 201,
  5: 301,
};
