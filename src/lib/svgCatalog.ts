import type { StylePreference } from "@/types";
import type { SvgCatalogEntry, SvgCategory, SvgStyle } from "@/lib/svgCatalog.types";
import { useAppStore } from "@/store";

export type { SvgCatalogEntry, SvgCategory, SvgStyle };

/** Maps legacy React registry keys (PascalCase) to stable catalog ids. */
export const LEGACY_SVG_KEY_MAP: Record<string, string> = {
  TShirt: "tops-neutral-tshirt",
  LongSleeve: "tops-neutral-shirt",
  Sweater: "outerwear-neutral-sweater",
  Dress: "tops-feminine-dress",
  Jacket: "outerwear-neutral-jacket",
  HeavyJacket: "outerwear-neutral-jacket-1",
  HeavyCoat: "outerwear-neutral-coat",
  RainJacket: "outerwear-neutral-raincoat",
  WomensJacket: "outerwear-neutral-jacket-3",
  Pants: "bottoms-neutral-trousers",
  Shorts: "bottoms-neutral-shorts",
  WomensJeans: "bottoms-neutral-jeans",
  Sneakers: "footwear-neutral-sneakers",
  FlipFlops: "footwear-neutral-flip-flops",
  SnowBoots: "footwear-masculine-boots",
  RainBoots: "footwear-masculine-boot",
  Umbrella: "accessories-neutral-umbrella",
  Sunglasses: "accessories-neutral-sunglasses",
  Scarf: "accessories-neutral-scarf",
  Beanie: "accessories-neutral-beanie",
  Gloves: "accessories-neutral-gloves",
};

export function resolveSvgId(
  value: string | null | undefined,
  byId?: Record<string, SvgCatalogEntry>
): string | null {
  if (!value) return null;
  const catalogById = byId ?? useAppStore.getState().svgCatalogById;
  if (catalogById[value]) return value;
  return LEGACY_SVG_KEY_MAP[value] ?? value;
}

export function catalogForPreference(
  catalog: SvgCatalogEntry[],
  preferences: StylePreference[],
  category: SvgCategory
): SvgCatalogEntry[] {
  return catalog.filter((e) => {
    if (e.category !== category) return false;
    if (e.style === "feminine") return preferences.includes("feminine");
    if (e.style === "masculine") return preferences.includes("masculine");
    if (e.style === "neutral") return preferences.includes("neutral");
    return false;
  });
}

export function buildCatalogById(
  catalog: SvgCatalogEntry[]
): Record<string, SvgCatalogEntry> {
  return Object.fromEntries(catalog.map((e) => [e.id, e]));
}
