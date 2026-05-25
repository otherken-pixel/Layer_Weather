import type { FootwearKind } from "@/types";
import type { OutfitOverride } from "@/components/outfit/OutfitFlatLay";
import { accessoryMap, footwearMap } from "@/components/outfit/outfitMap";
import { resolveSvgId } from "@/lib/svgCatalog";

/** Catalog ids to hide / skip loading when it's raining. */
export const RAIN_EXCLUDED_SVG_IDS = new Set([
  footwearMap.flip_flops,
  accessoryMap.sunglasses,
]);

const SUNGLASSES_IDS = new Set<string>([accessoryMap.sunglasses]);

const FLIP_FLOP_IDS = new Set<string>([footwearMap.flip_flops]);

export function displaySunglassesForRain(
  sunglasses: boolean,
  rainGear: boolean
): boolean {
  return rainGear ? false : sunglasses;
}

export function displayFootwearForRain(
  footwear: FootwearKind | null | undefined,
  rainGear: boolean
): FootwearKind | null | undefined {
  if (!rainGear || !footwear) return footwear ?? null;
  if (footwear === "flip_flops") return "sneakers";
  return footwear;
}

export function sanitizeWardrobeOverrideForRain(
  override: OutfitOverride,
  rainGear: boolean
): OutfitOverride {
  if (!rainGear) return override;

  const footwear =
    override.footwear && FLIP_FLOP_IDS.has(resolveSvgId(override.footwear) ?? override.footwear)
      ? footwearMap.sneakers
      : override.footwear;

  const accessories = override.accessories.filter((id) => {
    const resolved = resolveSvgId(id) ?? id;
    return !SUNGLASSES_IDS.has(resolved) && !SUNGLASSES_IDS.has(id);
  });

  return { ...override, footwear, accessories };
}
