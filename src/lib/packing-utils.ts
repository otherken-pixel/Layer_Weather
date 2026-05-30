export function toLocalDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayStr(): string {
  return toLocalDayKey(new Date());
}

export function tripCountdown(departureDateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dep = new Date(departureDateStr + "T00:00:00");
  const days = Math.round((dep.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "Past trip";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export function isPastTrip(returnDateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ret = new Date(returnDateStr + "T00:00:00");
  return ret < today;
}

export function tripLengthDays(dep: string, ret: string): number {
  const d1 = new Date(dep + "T00:00:00");
  const d2 = new Date(ret + "T00:00:00");
  return Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
}

export function formatDateRange(dep: string, ret: string): string {
  const d = new Date(dep + "T00:00:00");
  const r = new Date(ret + "T00:00:00");
  const sameYear = d.getFullYear() === r.getFullYear();
  const sameMonth = sameYear && d.getMonth() === r.getMonth();
  if (sameMonth) {
    return `${d.toLocaleDateString("en", { month: "short" })} ${d.getDate()}–${r.getDate()}${sameYear ? "" : `, ${r.getFullYear()}`}`;
  }
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${d.toLocaleDateString("en", opts)} – ${r.toLocaleDateString("en", opts)}${sameYear ? "" : `, ${r.getFullYear()}`}`;
}

export function forecastStatus(
  departureDateStr: string,
  returnDateStr: string,
): "full" | "extended" | "unavailable" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dep = new Date(departureDateStr + "T00:00:00");
  const ret = new Date(returnDateStr + "T00:00:00");
  const daysUntilDep = Math.ceil((dep.getTime() - today.getTime()) / 86400000);
  const daysUntilRet = Math.ceil((ret.getTime() - today.getTime()) / 86400000);
  if (daysUntilDep > 16) return "unavailable";
  if (daysUntilRet <= 10) return "full";
  return "extended";
}

export function forecastAvailableOn(departureDateStr: string): string {
  const dep = new Date(departureDateStr + "T00:00:00");
  const avail = new Date(dep.getTime() - 16 * 86400000);
  return avail.toLocaleDateString("en", { month: "short", day: "numeric" });
}

export function forecastUnavailableMsg(departureDateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dep = new Date(departureDateStr + "T00:00:00");
  const availDate = new Date(dep.getTime() - 16 * 86400000);
  if (availDate <= today) return "Forecast unavailable — try again later.";
  return `Forecast not available yet — check back ${forecastAvailableOn(departureDateStr)}.`;
}

export function formatLastUpdated(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

export const PACKING_CATEGORIES = ["outerwear", "tops", "bottoms", "footwear", "accessories"] as const;

export const CATEGORY_EMOJI: Record<string, string> = {
  outerwear: "🧥",
  tops: "👕",
  bottoms: "👖",
  footwear: "👟",
  accessories: "🧣",
};

export const TRIP_TYPES = [
  { value: "leisure", label: "Leisure" },
  { value: "business", label: "Business" },
  { value: "family", label: "Family" },
  { value: "adventure", label: "Adventure" },
  { value: "beach", label: "Beach" },
  { value: "other", label: "Other" },
] as const;

export const ACTIVITY_TAGS = [
  "sightseeing",
  "hiking",
  "beach",
  "swimming",
  "meetings",
  "dinners",
  "business",
] as const;
