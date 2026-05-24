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

export type EventType =
  | "default"
  | "activewear"
  | "business_casual"
  | "formal"
  | "running"
  | "dog_walk"
  | "date_night"
  | "work_from_home"
  | "travel_day"
  | "outdoor_work";

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
 * Returns a human-readable style hint based on the active event type.
 * Returns null for "default".
 */
export function getStyleHint(eventType: EventType): string | null {
  switch (eventType) {
    case "activewear":
      return "Gym or workout scheduled — go for athletic wear.";
    case "business_casual":
      return "Work meeting today — opt for smart-casual over athleisure.";
    case "formal":
      return "Formal event — elevate your look with dress attire.";
    case "running":
      return "Running today — dress a layer lighter; you'll warm up fast.";
    case "dog_walk":
      return "Dog walk scheduled — layer for comfort; you'll be outside a while.";
    case "date_night":
      return "Date night — prioritize style; consider dressier footwear.";
    case "work_from_home":
      return "WFH day — comfort-first, but dress for any video calls.";
    case "travel_day":
      return "Travel day — layer up for A/C and pack a versatile jacket.";
    case "outdoor_work":
      return "Outdoor work — durability over style; prioritize weather protection.";
    default:
      return null;
  }
}

export const EVENT_TYPE_LABELS: Record<EventType, { label: string; emoji: string; description: string }> = {
  default: { label: "No events", emoji: "😎", description: "Dress however you like" },
  activewear: { label: "Gym / Sport", emoji: "🏋️", description: "Athletic or activewear" },
  business_casual: { label: "Work / Meeting", emoji: "💼", description: "Smart-casual required" },
  formal: { label: "Formal Event", emoji: "🎩", description: "Dress attire recommended" },
  running: { label: "Running / Cycling", emoji: "🏃", description: "Dress a layer lighter" },
  dog_walk: { label: "Dog Walk", emoji: "🐕", description: "Extended outdoor time" },
  date_night: { label: "Date Night", emoji: "✨", description: "Dress to impress" },
  work_from_home: { label: "Work From Home", emoji: "🏠", description: "Comfort-first" },
  travel_day: { label: "Travel Day", emoji: "✈️", description: "Layers for A/C & outdoors" },
  outdoor_work: { label: "Outdoor Work", emoji: "🛠️", description: "Weather protection" },
};
