import { Preferences } from "@capacitor/preferences";
import type { NotificationPrefs } from "@/types/notification-prefs";
import { DEFAULT_NOTIF_PREFS } from "@/types/notification-prefs";
import { upsertProfile } from "@/lib/supabase";

const PREFS_KEY = "wt_notif_prefs";

/** Loads notification prefs from local storage, merged with defaults. */
export async function loadNotifPrefs(
  profilePrefs?: NotificationPrefs | null,
): Promise<NotificationPrefs> {
  try {
    if (profilePrefs) {
      return { ...DEFAULT_NOTIF_PREFS, ...profilePrefs };
    }
    const { value } = await Preferences.get({ key: PREFS_KEY });
    if (!value) return { ...DEFAULT_NOTIF_PREFS };
    return { ...DEFAULT_NOTIF_PREFS, ...(JSON.parse(value) as Partial<NotificationPrefs>) };
  } catch {
    return { ...DEFAULT_NOTIF_PREFS };
  }
}

/** Persists notification prefs locally and syncs to Supabase profile. */
export async function saveNotifPrefs(
  prefs: NotificationPrefs,
  userId?: string | null,
): Promise<void> {
  await Preferences.set({ key: PREFS_KEY, value: JSON.stringify(prefs) });
  if (userId) {
    upsertProfile(userId, { notif_prefs: prefs }).catch(() => {});
  }
}

/** Returns true if the current local time falls within the user's quiet hours window. */
export function isInQuietHours(prefs: NotificationPrefs): boolean {
  if (!prefs.quietHoursEnabled) return false;

  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();

  const [sh, sm] = prefs.quietHoursStart.split(":").map(Number);
  const [eh, em] = prefs.quietHoursEnd.split(":").map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;

  // Overnight range (e.g. 22:00–07:00): wraps midnight
  if (start > end) return current >= start || current < end;
  return current >= start && current < end;
}

/**
 * Returns the number of minutes from now until a given "HH:MM" wall-clock time today
 * (or tomorrow if the time has already passed).
 */
export function minutesUntil(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return Math.round((target.getTime() - now.getTime()) / 60000);
}

/**
 * Returns the Date of the next occurrence of a given "HH:MM" wall-clock time
 * (today if still in the future, otherwise tomorrow).
 */
export function nextOccurrence(timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target;
}

/** Returns the Date of the next Sunday at a given "HH:MM" wall-clock time. */
export function nextSundayAt(timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (now.getDay() === 0 && target > now) return target;
  const daysUntilSunday = now.getDay() === 0 ? 7 : (7 - now.getDay()) % 7;
  target.setDate(now.getDate() + daysUntilSunday);
  target.setHours(h, m, 0, 0);
  return target;
}
