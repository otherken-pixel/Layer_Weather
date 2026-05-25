import type { WardrobeItem, OutfitRecommendation, OutfitType, FootwearKind, WardrobeCategory } from "@/types";

export interface WardrobeMatch {
  top: WardrobeItem | null;
  bottom: WardrobeItem | null;
  outerwear: WardrobeItem | null;
  footwear: WardrobeItem | null;
  accessories: WardrobeItem[];
  gaps: WardrobeCategory[];
}

export interface AnnotatedPackingItem {
  category: string;
  name: string;
  quantity: number;
  reason?: string;
  ownedItem?: WardrobeItem;
}

// Warmth ranges per outfit type
const TOP_WARMTH: Record<OutfitType, [number, number]> = {
  shorts_tshirt:    [1, 2],
  dress:            [1, 2],
  pants_shortsleeve: [1, 2],
  pants_tshirt:     [2, 3],
  light_jacket:  [2, 3],
  rain_light:    [2, 3],
  heavy_jacket:  [3, 4],
  rain_heavy:    [3, 4],
  heavy_coat:    [4, 5],
};

const BOTTOM_WARMTH: Record<OutfitType, [number, number]> = {
  shorts_tshirt:    [1, 2],
  dress:            [1, 2],
  pants_shortsleeve: [2, 4],
  pants_tshirt:     [2, 4],
  light_jacket:  [2, 4],
  rain_light:    [2, 4],
  heavy_jacket:  [2, 4],
  rain_heavy:    [2, 4],
  heavy_coat:    [2, 5],
};

// null means no outerwear needed for this outfit type
const OUTERWEAR_WARMTH: Record<OutfitType, [number, number] | null> = {
  shorts_tshirt:    null,
  dress:            null,
  pants_shortsleeve: null,
  pants_tshirt:     null,
  light_jacket:  [2, 3],
  rain_light:    [2, 4],
  heavy_jacket:  [3, 4],
  rain_heavy:    [3, 5],
  heavy_coat:    [4, 5],
};

function pickBest(items: WardrobeItem[], range: [number, number]): WardrobeItem | null {
  const inRange = items.filter((i) => i.warmth_rating >= range[0] && i.warmth_rating <= range[1]);
  if (inRange.length === 0) return null;
  const mid = (range[0] + range[1]) / 2;
  return inRange.reduce((best, i) =>
    Math.abs(i.warmth_rating - mid) < Math.abs(best.warmth_rating - mid) ? i : best
  );
}

function matchFootwear(items: WardrobeItem[], kind: FootwearKind): WardrobeItem | null {
  const footwear = items.filter((i) => i.category === "footwear");
  if (footwear.length === 0) return null;

  const byName = (pattern: RegExp) => footwear.filter((i) => pattern.test(i.name));

  switch (kind) {
    case "flip_flops": {
      const named = byName(/flip.?flop|sandal|slide|thong/i);
      return named[0] ?? pickBest(footwear, [1, 1]) ?? pickBest(footwear, [1, 2]);
    }
    case "sneakers": {
      const named = byName(/sneak|trainer|runner|athletic|tennis|canvas|loafer/i);
      return named[0] ?? pickBest(footwear, [2, 3]);
    }
    case "snow_boots": {
      const named = byName(/snow.?boot|winter.?boot|hiking.?boot|ugg|mukl/i);
      return named[0] ?? pickBest(footwear, [4, 5]) ?? pickBest(footwear, [3, 5]);
    }
    case "rain_boots": {
      const waterproof = footwear.filter((i) => i.is_waterproof);
      if (waterproof.length > 0) {
        const namedWater = waterproof.filter((i) => /boot/i.test(i.name));
        return namedWater[0] ?? pickBest(waterproof, [1, 5]);
      }
      const named = byName(/rain.?boot|wellington|welly|rubber.?boot/i);
      return named[0] ?? pickBest(footwear, [2, 4]);
    }
  }
}

function matchAccessories(
  items: WardrobeItem[],
  needed: { scarf: boolean; beanie: boolean; gloves: boolean }
): WardrobeItem[] {
  const accessories = items.filter((i) => i.category === "accessories");
  const matched: WardrobeItem[] = [];

  function pick(pattern: RegExp, warmthRange: [number, number]): WardrobeItem | null {
    const byName = accessories.filter((i) => pattern.test(i.name) && !matched.includes(i));
    if (byName.length > 0) return byName[0];
    return pickBest(accessories.filter((i) => !matched.includes(i)), warmthRange);
  }

  if (needed.scarf) {
    const m = pick(/scarf|wrap/i, [3, 5]);
    if (m) matched.push(m);
  }
  if (needed.beanie) {
    const m = pick(/beanie|toque|hat|cap/i, [4, 5]);
    if (m) matched.push(m);
  }
  if (needed.gloves) {
    const m = pick(/gloves?|mittens?/i, [4, 5]);
    if (m) matched.push(m);
  }

  return matched;
}

export function matchWardrobeToOutfit(
  items: WardrobeItem[],
  recommendation: OutfitRecommendation
): WardrobeMatch {
  const { outfit, footwear: footwearKind, scarf, beanie, gloves } = recommendation;
  const isRain = outfit === "rain_light" || outfit === "rain_heavy";

  const tops = items.filter((i) => i.category === "tops");
  const bottoms = items.filter((i) => i.category === "bottoms");
  const outerwear = items.filter((i) => i.category === "outerwear");
  const footwearItems = items.filter((i) => i.category === "footwear");

  let matchedOuterwear: WardrobeItem | null = null;
  const outerRange = OUTERWEAR_WARMTH[outfit];
  if (outerRange) {
    if (isRain) {
      const waterproof = outerwear.filter((i) => i.is_waterproof);
      matchedOuterwear = pickBest(waterproof, outerRange) ?? pickBest(outerwear, outerRange);
    } else {
      matchedOuterwear = pickBest(outerwear, outerRange);
    }
  }

  const matchedFootwear = matchFootwear(items, footwearKind);

  // Compute gaps: critical categories needed but not matched
  const gaps: WardrobeCategory[] = [];
  if (outerRange && !matchedOuterwear) {
    gaps.push("outerwear");
  }
  const footwearIsSpecial = footwearKind === "rain_boots" || footwearKind === "snow_boots";
  if (footwearIsSpecial && !matchedFootwear && footwearItems.length > 0) {
    gaps.push("footwear");
  }

  return {
    top: pickBest(tops, TOP_WARMTH[outfit]),
    bottom: pickBest(bottoms, BOTTOM_WARMTH[outfit]),
    outerwear: matchedOuterwear,
    footwear: matchedFootwear,
    accessories: matchAccessories(items, { scarf, beanie, gloves }),
    gaps,
  };
}

export function hasAnyMatch(match: WardrobeMatch): boolean {
  return !!(
    match.top ||
    match.bottom ||
    match.outerwear ||
    match.footwear ||
    match.accessories.length > 0
  );
}

function findWardrobeItemForPacking(
  item: { category: string; name: string },
  wardrobeItems: WardrobeItem[]
): WardrobeItem | null {
  const cat = item.category as WardrobeCategory;
  const pool = wardrobeItems.filter((i) => i.category === cat);
  if (pool.length === 0) return null;

  const n = item.name.toLowerCase();

  if (cat === "outerwear") {
    if (n.includes("rain")) {
      const waterproof = pool.filter((i) => i.is_waterproof);
      return pickBest(waterproof, [2, 4]) ?? pickBest(pool, [2, 4]);
    }
    return pickBest(pool, [3, 5]);
  }
  if (cat === "footwear") {
    if (n.includes("flip") || n.includes("sandal")) return pickBest(pool, [1, 2]);
    if (n.includes("rain")) {
      const waterproof = pool.filter((i) => i.is_waterproof);
      return waterproof[0] ?? null;
    }
    if (n.includes("snow") || n.includes("boot")) return pickBest(pool, [4, 5]) ?? pickBest(pool, [3, 5]);
    return pickBest(pool, [2, 3]);
  }
  if (cat === "tops") {
    return pickBest(pool, n.includes("t-shirt") || n.includes("tshirt") ? [1, 2] : [2, 4]);
  }
  if (cat === "bottoms") {
    return pickBest(pool, n.includes("short") ? [1, 2] : [2, 4]);
  }
  if (cat === "accessories") {
    if (n.includes("gloves") || n.includes("mitten")) {
      return pool.find((i) => /gloves?|mittens?/i.test(i.name)) ?? null;
    }
    if (n.includes("umbrella")) {
      return pool.find((i) => /umbrella/i.test(i.name)) ?? null;
    }
    return pool.find((i) => /scarf|beanie|hat|cap/i.test(i.name)) ?? null;
  }
  return pool[0] ?? null;
}

export function annotatePackingListWithWardrobe(
  packingList: Array<{ category: string; name: string; quantity: number; reason?: string }>,
  wardrobeItems: WardrobeItem[]
): AnnotatedPackingItem[] {
  return packingList.map((item) => {
    const ownedItem = findWardrobeItemForPacking(item, wardrobeItems) ?? undefined;
    return { ...item, ownedItem };
  });
}
