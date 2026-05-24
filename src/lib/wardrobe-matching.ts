import type { WardrobeItem, OutfitRecommendation, OutfitType, FootwearKind } from "@/types";

export interface WardrobeMatch {
  top: WardrobeItem | null;
  bottom: WardrobeItem | null;
  outerwear: WardrobeItem | null;
  footwear: WardrobeItem | null;
  accessories: WardrobeItem[];
}

// Warmth ranges per outfit type
const TOP_WARMTH: Record<OutfitType, [number, number]> = {
  shorts_tshirt: [1, 2],
  dress:         [1, 2],
  pants_tshirt:  [2, 3],
  light_jacket:  [2, 3],
  rain_light:    [2, 3],
  heavy_jacket:  [3, 4],
  rain_heavy:    [3, 4],
  heavy_coat:    [4, 5],
};

const BOTTOM_WARMTH: Record<OutfitType, [number, number]> = {
  shorts_tshirt: [1, 2],
  dress:         [1, 2],
  pants_tshirt:  [2, 4],
  light_jacket:  [2, 4],
  rain_light:    [2, 4],
  heavy_jacket:  [2, 4],
  rain_heavy:    [2, 4],
  heavy_coat:    [2, 5],
};

// null means no outerwear needed
const OUTERWEAR_WARMTH: Record<OutfitType, [number, number] | null> = {
  shorts_tshirt: null,
  dress:         null,
  pants_tshirt:  null,
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

  switch (kind) {
    case "flip_flops":
      return pickBest(footwear, [1, 1]) ?? pickBest(footwear, [1, 2]);
    case "sneakers":
      return pickBest(footwear, [2, 3]);
    case "snow_boots":
      return pickBest(footwear, [4, 5]) ?? pickBest(footwear, [3, 5]);
    case "rain_boots": {
      const waterproof = footwear.filter((i) => i.is_waterproof);
      return waterproof.length > 0 ? pickBest(waterproof, [1, 5]) : pickBest(footwear, [2, 4]);
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

  return {
    top: pickBest(tops, TOP_WARMTH[outfit]),
    bottom: pickBest(bottoms, BOTTOM_WARMTH[outfit]),
    outerwear: matchedOuterwear,
    footwear: matchFootwear(items, footwearKind),
    accessories: matchAccessories(items, { scarf, beanie, gloves }),
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
