/**
 * Calendar context module.
 *
 * Native calendar access requires the @capacitor/calendar plugin which is not
 * in this project's dependencies. This module provides:
 * 1. A manual "Today's Agenda" override stored in localStorage.
 * 2. Logic that maps an event type to an outfit style modifier.
 *
 * When the native plugin is added, replace readNativeCalendar() below.
 */

export type EventType = "default" | "activewear" | "business_casual" | "formal";

const STORAGE_KEY = "wt_today_event_type";
const DATE_KEY = "wt_today_event_date";

/** Persist the user's manual event type for today. Auto-expires at midnight. */
export function saveTodayEventType(eventType: EventType): void {
  const today = new Date().toDateString();
  localStorage.setItem(STORAGE_KEY, eventType);
  localStorage.setItem(DATE_KEY, today);
}

/** Returns the stored event type, or "default" if not set / expired. */
export function getTodayEventType(): EventType {
  const saved = localStorage.getItem(STORAGE_KEY) as EventType | null;
  const savedDate = localStorage.getItem(DATE_KEY);
  if (!saved || savedDate !== new Date().toDateString()) return "default";
  return saved;
}

/** Clears the manual event type override. */
export function clearTodayEventType(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(DATE_KEY);
}

/**
 * Returns a human-readable style hint to append to the outfit description
 * based on the active event type. Returns null for "default".
 */
export function getStyleHint(eventType: EventType): string | null {
  switch (eventType) {
    case "activewear":
      return "Gym or workout scheduled — go for athletic wear.";
    case "business_casual":
      return "Work meeting today — opt for smart-casual over athleisure.";
    case "formal":
      return "Formal event — elevate your look with dress attire.";
    default:
      return null;
  }
}

export const EVENT_TYPE_LABELS: Record<EventType, { label: string; emoji: string; description: string }> = {
  default: { label: "No events", emoji: "😎", description: "Dress however you like" },
  activewear: { label: "Gym / Sport", emoji: "🏋️", description: "Athletic or activewear" },
  business_casual: { label: "Work / Meeting", emoji: "💼", description: "Smart-casual required" },
  formal: { label: "Formal Event", emoji: "🎩", description: "Dress attire recommended" },
};
