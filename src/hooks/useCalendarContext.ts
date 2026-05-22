import { useState, useCallback } from "react";
import {
  getTodayEventType,
  saveTodayEventType,
  clearTodayEventType,
  getStyleHint,
  type EventType,
} from "@/lib/calendar";

interface CalendarContext {
  eventType: EventType;
  styleHint: string | null;
  setEventType: (t: EventType) => void;
  clearEventType: () => void;
}

/**
 * Provides the active calendar event type and associated outfit style hint.
 *
 * The event type is persisted in localStorage and auto-expires at midnight.
 * When a native calendar plugin is wired up, the initial state can be seeded
 * from today's calendar events here.
 */
export function useCalendarContext(): CalendarContext {
  const [eventType, setEventTypeState] = useState<EventType>(getTodayEventType);

  const setEventType = useCallback((t: EventType) => {
    saveTodayEventType(t);
    setEventTypeState(t);
  }, []);

  const clearEventType = useCallback(() => {
    clearTodayEventType();
    setEventTypeState("default");
  }, []);

  return {
    eventType,
    styleHint: getStyleHint(eventType),
    setEventType,
    clearEventType,
  };
}
