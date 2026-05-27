export type CardId = "outfit" | "conditions" | "aqi" | "nowcast" | "hourly" | "seven_day";

export interface CardConfig {
  id: CardId;
  minimized: boolean;
}

export const CARD_LABELS: Record<CardId, string> = {
  outfit: "Today's Outfit",
  conditions: "Current Conditions",
  aqi: "Air Quality",
  nowcast: "Next 60 Minutes",
  hourly: "Hourly Forecast",
  seven_day: "7-Day Forecast",
};

export const DEFAULT_CARD_LAYOUT: CardConfig[] = [
  { id: "outfit", minimized: false },
  { id: "conditions", minimized: false },
  { id: "aqi", minimized: false },
  { id: "nowcast", minimized: false },
  { id: "hourly", minimized: false },
  { id: "seven_day", minimized: false },
];

const STORAGE_KEY = "wt_card_layout";

export function loadCardLayout(): CardConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CARD_LAYOUT;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_CARD_LAYOUT;
    const validIds = new Set(DEFAULT_CARD_LAYOUT.map((c) => c.id));
    const saved = (parsed as { id?: unknown; minimized?: unknown }[]).filter(
      (c): c is CardConfig =>
        !!c && typeof c.id === "string" && validIds.has(c.id as CardId),
    ) as CardConfig[];
    // Append any cards added in newer app versions that aren't in the saved layout
    const savedIds = new Set(saved.map((c) => c.id));
    const missing = DEFAULT_CARD_LAYOUT.filter((c) => !savedIds.has(c.id));
    return [...saved, ...missing];
  } catch {
    return DEFAULT_CARD_LAYOUT;
  }
}

export function saveCardLayout(layout: CardConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // ignore quota errors
  }
}
