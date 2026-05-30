import { getOutfitRecommendation } from "@/lib/outfit-logic";
import type {
  DailyForecast,
  FormalityPreference,
  OutfitRecommendation,
  OutfitType,
  PackingItem,
  SerializedTripDayOutfit,
  StylePreference,
  UserCalibration,
  WeatherCondition,
  FootwearKind,
} from "@/types";

export type TripType = "business" | "leisure" | "family" | "adventure" | "beach" | "other";

export interface TripPackingOptions {
  laundryAccess?: boolean;
  activities?: string[];
  stylePreference?: StylePreference[];
  formality?: FormalityPreference;
}

export interface TripDayOutfit {
  date: string;
  feelsLikeMin: number;
  feelsLikeMax: number;
  precipProb: number;
  condition: WeatherCondition;
  outfit: OutfitRecommendation;
}

export interface PackingScore {
  score: number;
  tip: string;
  carryOnLikely: boolean;
}

export interface TripPackingResult {
  items: PackingItem[];
  dailyOutfits: TripDayOutfit[];
  score: PackingScore;
}

const FOOTWEAR_LABELS: Record<FootwearKind, string> = {
  flip_flops: "Flip flops",
  sneakers: "Sneakers",
  athletic_sneakers: "Athletic sneakers",
  loafers: "Loafers",
  dress_flats: "Dress flats",
  snow_boots: "Snow boots",
  rain_boots: "Rain boots",
};

const OUTERWEAR_FROM_OUTFIT: Partial<Record<OutfitType, string>> = {
  light_jacket: "Light jacket",
  heavy_jacket: "Heavy jacket",
  heavy_coat: "Heavy coat",
  rain_light: "Rain jacket",
  rain_light_shorts: "Rain jacket",
  rain_heavy: "Rain jacket",
};

export function packingItemKey(category: string, name: string): string {
  return `${category}:${name}`;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Midday-style weather snapshot for one trip day. */
function dailyToOutfitInput(day: DailyForecast) {
  const feelsLike = (day.feelsLikeMin + day.feelsLikeMax) / 2;
  const temp = (day.tempMin + day.tempMax) / 2;
  return {
    feelsLike,
    temp,
    weatherCode: day.weatherCode,
    windSpeed: 8,
    precipProb: day.precipProb,
    humidity: 50,
    isDay: true,
    hourly: [] as [],
  };
}

export function buildTripDailyOutfits(
  forecasts: DailyForecast[],
  calibration: UserCalibration,
  options: TripPackingOptions = {},
): TripDayOutfit[] {
  const stylePreference = options.stylePreference;
  const formality = options.formality ?? "casual";
  let previousRainy: boolean | null = null;

  return forecasts.map((day) => {
    const input = dailyToOutfitInput(day);
    const outfit = getOutfitRecommendation({
      ...input,
      calibration,
      stylePreference,
      formality,
      previousRainy,
    });
    previousRainy = outfit.rainGear;
    return {
      date: toDateKey(day.date),
      feelsLikeMin: day.feelsLikeMin,
      feelsLikeMax: day.feelsLikeMax,
      precipProb: day.precipProb,
      condition: day.condition,
      outfit,
    };
  });
}

function outfitToDayItems(day: TripDayOutfit): PackingItem[] {
  const { outfit } = day;
  const items: PackingItem[] = [];

  items.push({
    category: "tops",
    name: outfit.garmentTop,
    quantity: 1,
    reason: outfit.label,
  });

  if (outfit.garmentBottom) {
    items.push({
      category: "bottoms",
      name: outfit.garmentBottom,
      quantity: 1,
    });
  }

  const outerName = OUTERWEAR_FROM_OUTFIT[outfit.outfit];
  if (outerName) {
    items.push({ category: "outerwear", name: outerName, quantity: 1 });
  }

  if (outfit.rainGear && !outerName) {
    items.push({ category: "outerwear", name: "Rain jacket", quantity: 1 });
  }

  items.push({
    category: "footwear",
    name: FOOTWEAR_LABELS[outfit.footwear],
    quantity: 1,
  });

  if (outfit.umbrella) {
    items.push({ category: "accessories", name: "Compact umbrella", quantity: 1 });
  }
  if (outfit.rainShell) {
    items.push({ category: "accessories", name: "Rain shell", quantity: 1 });
  }
  if (outfit.scarf) {
    items.push({ category: "accessories", name: "Scarf", quantity: 1 });
  }
  if (outfit.beanie) {
    items.push({ category: "accessories", name: "Beanie", quantity: 1 });
  }
  if (outfit.gloves) {
    items.push({ category: "accessories", name: "Gloves", quantity: 1 });
  }
  if (outfit.sunglasses) {
    items.push({ category: "accessories", name: "Sunglasses", quantity: 1 });
  }

  return items;
}

function mergeItem(
  map: Map<string, PackingItem>,
  item: PackingItem,
  dayCount: number,
  laundryAccess: boolean,
): void {
  const key = packingItemKey(item.category, item.name);
  const existing = map.get(key);
  if (!existing) {
    map.set(key, { ...item, quantity: item.quantity });
    return;
  }

  let qty = existing.quantity;
  if (item.category === "tops" || item.category === "bottoms") {
    const divisor = laundryAccess ? 2 : 1;
    qty = Math.max(qty, Math.ceil(dayCount / divisor));
  } else {
    qty = Math.max(qty, 1);
  }
  map.set(key, {
    ...existing,
    quantity: qty,
    reason: existing.reason ?? item.reason,
  });
}

export function consolidatePackingFromDailyOutfits(
  dailyOutfits: TripDayOutfit[],
  options: { laundryAccess?: boolean; activities?: string[] } = {},
): PackingItem[] {
  if (dailyOutfits.length === 0) return [];

  const laundryAccess = options.laundryAccess ?? false;
  const map = new Map<string, PackingItem>();
  const tripDays = dailyOutfits.length;

  const topsDayCount = new Map<string, number>();
  const bottomsDayCount = new Map<string, number>();

  for (const day of dailyOutfits) {
    const dayItems = outfitToDayItems(day);
    for (const item of dayItems) {
      if (item.category === "tops") {
        topsDayCount.set(item.name, (topsDayCount.get(item.name) ?? 0) + 1);
      }
      if (item.category === "bottoms") {
        bottomsDayCount.set(item.name, (bottomsDayCount.get(item.name) ?? 0) + 1);
      }
    }
  }

  for (const day of dailyOutfits) {
    const dayItems = outfitToDayItems(day);
    for (const item of dayItems) {
      if (item.category === "tops") {
        const days = topsDayCount.get(item.name) ?? 1;
        mergeItem(map, item, days, laundryAccess);
      } else if (item.category === "bottoms") {
        const days = bottomsDayCount.get(item.name) ?? 1;
        mergeItem(map, item, days, laundryAccess);
      } else {
        mergeItem(map, item, 1, laundryAccess);
      }
    }
  }

  // Cap bottoms — at most 3 pairs for long trips
  for (const [key, item] of map) {
    if (item.category === "bottoms") {
      map.set(key, { ...item, quantity: Math.min(item.quantity, Math.min(tripDays, 3)) });
    }
    if (item.category === "tops") {
      map.set(key, {
        ...item,
        quantity: Math.min(item.quantity, laundryAccess ? Math.ceil(tripDays / 2) + 1 : tripDays),
        reason: item.reason ?? (laundryAccess ? "Rewear with laundry access" : undefined),
      });
    }
  }

  // Deduplicate rain outerwear
  const rainKeys = [...map.keys()].filter((k) => {
    const n = map.get(k)!.name.toLowerCase();
    return map.get(k)!.category === "outerwear" && n.includes("rain");
  });
  if (rainKeys.length > 1) {
    for (let i = 1; i < rainKeys.length; i++) map.delete(rainKeys[i]);
    const first = map.get(rainKeys[0])!;
    map.set(rainKeys[0], {
      ...first,
      quantity: 1,
      reason: `${dailyOutfits.filter((d) => d.outfit.rainGear).length} rainy day(s) expected`,
    });
  }

  // Activity extras
  const activities = options.activities ?? [];
  if (activities.includes("hiking")) {
    mergeItem(map, { category: "footwear", name: "Hiking boots", quantity: 1, reason: "Hiking activity" }, 1, false);
  }
  if (activities.includes("beach") || activities.includes("swimming")) {
    mergeItem(map, { category: "accessories", name: "Swimsuit", quantity: 1, reason: "Beach / swim" }, 1, false);
  }
  if (activities.includes("meetings") || activities.includes("business")) {
    mergeItem(map, { category: "tops", name: "Dress shirt / blouse", quantity: 1, reason: "Business meetings" }, 1, false);
  }

  const order = ["outerwear", "tops", "bottoms", "footwear", "accessories"];
  return [...map.values()].sort(
    (a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.name.localeCompare(b.name),
  );
}

export function computePackingScore(items: PackingItem[], tripDays: number): PackingScore {
  const uniqueCount = items.length;
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const raw = 100 - uniqueCount * 4 - Math.max(0, totalQty - tripDays) * 2;
  const score = Math.max(20, Math.min(100, raw));
  const carryOnLikely = uniqueCount <= 12 && totalQty <= tripDays + 8;

  let tip = "Good layering choices.";
  if (score >= 85) tip = "Light pack — you can likely fit everything in a carry-on.";
  else if (score >= 65) tip = "Balanced pack — consider re-wearing layers if laundry is available.";
  else tip = "Heavier pack — review items and overlap cold-weather layers.";

  return { score, tip, carryOnLikely };
}

export function generateTripPackingList(
  forecasts: DailyForecast[],
  calibration: UserCalibration,
  options: TripPackingOptions = {},
): TripPackingResult {
  const dailyOutfits = buildTripDailyOutfits(forecasts, calibration, options);
  const items = consolidatePackingFromDailyOutfits(dailyOutfits, {
    laundryAccess: options.laundryAccess,
    activities: options.activities,
  });
  const score = computePackingScore(items, forecasts.length);
  return { items, dailyOutfits, score };
}

/** Legacy-friendly wrapper for daily forecast rows without full DailyForecast objects. */
export function generatePackingListFromForecasts(
  dailyForecasts: {
    date?: Date;
    feelsLikeMin: number;
    feelsLikeMax: number;
    precipProb: number;
    condition: string;
    weatherCode?: number;
    tempMin?: number;
    tempMax?: number;
  }[],
  calibration: UserCalibration,
  options: TripPackingOptions = {},
): PackingItem[] {
  const asDaily: DailyForecast[] = dailyForecasts.map((d, i) => ({
    date: d.date ?? new Date(Date.now() + i * 86400000),
    tempMin: d.tempMin ?? d.feelsLikeMin,
    tempMax: d.tempMax ?? d.feelsLikeMax,
    feelsLikeMin: d.feelsLikeMin,
    feelsLikeMax: d.feelsLikeMax,
    precipProb: d.precipProb,
    condition: d.condition as WeatherCondition,
    weatherCode: d.weatherCode ?? 0,
    sunrise: new Date(),
    sunset: new Date(),
  }));
  return generateTripPackingList(asDaily, calibration, options).items;
}

export function serializeTripDayOutfits(days: TripDayOutfit[]): SerializedTripDayOutfit[] {
  return days.map((d) => ({
    date: d.date,
    feelsLikeMin: d.feelsLikeMin,
    feelsLikeMax: d.feelsLikeMax,
    precipProb: d.precipProb,
    condition: d.condition,
    outfitType: d.outfit.outfit,
    label: d.outfit.label,
    description: d.outfit.description,
    garmentTop: d.outfit.garmentTop,
    garmentBottom: d.outfit.garmentBottom,
    rainGear: d.outfit.rainGear,
    footwear: d.outfit.footwear,
    sunglasses: d.outfit.sunglasses,
    umbrella: d.outfit.umbrella,
    scarf: d.outfit.scarf,
    beanie: d.outfit.beanie,
    gloves: d.outfit.gloves,
  }));
}

export function deserializeTripDayOutfits(rows: SerializedTripDayOutfit[]): TripDayOutfit[] {
  return rows.map((r) => ({
    date: r.date,
    feelsLikeMin: r.feelsLikeMin,
    feelsLikeMax: r.feelsLikeMax,
    precipProb: r.precipProb,
    condition: r.condition,
    outfit: {
      outfit: r.outfitType,
      warmthTier: "warmth_3",
      garmentTop: r.garmentTop,
      garmentBottom: r.garmentBottom,
      effectivePrecipProb: r.precipProb,
      label: r.label,
      description: r.description,
      rainGear: r.rainGear,
      umbrella: r.umbrella,
      rainShell: false,
      sunglasses: r.sunglasses,
      scarf: r.scarf,
      beanie: r.beanie,
      gloves: r.gloves,
      footwear: r.footwear,
      avatarCondition: "sunny",
      commuteAlert: null,
    },
  }));
}
