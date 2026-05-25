import type { FootwearKind, OutfitType } from "@/types";

/** Algorithmic outfit → default catalog svg ids (neutral staples). */
export const topMap: Record<OutfitType, string> = {
  shorts_tshirt: "tops-neutral-tshirt",
  pants_shortsleeve: "tops-neutral-tshirt",
  pants_longsleeve: "tops-neutral-shirt",
  light_jacket: "outerwear-neutral-jacket",
  heavy_jacket: "outerwear-neutral-jacket-1",
  heavy_coat: "outerwear-neutral-coat",
  rain_light: "outerwear-neutral-raincoat",
  rain_light_shorts: "outerwear-neutral-raincoat",
  rain_heavy: "outerwear-neutral-raincoat",
  dress: "tops-feminine-dress",
};

export const bottomMap: Record<OutfitType, string | null> = {
  shorts_tshirt: "bottoms-neutral-shorts",
  pants_shortsleeve: "bottoms-neutral-trousers",
  pants_longsleeve: "bottoms-neutral-trousers",
  light_jacket: "bottoms-neutral-trousers",
  heavy_jacket: "bottoms-neutral-trousers",
  heavy_coat: "bottoms-neutral-trousers",
  rain_light: "bottoms-neutral-trousers",
  rain_light_shorts: "bottoms-neutral-shorts",
  rain_heavy: "bottoms-neutral-trousers",
  dress: null,
};

export const footwearMap: Record<FootwearKind, string> = {
  flip_flops: "footwear-neutral-flip-flops",
  sneakers: "footwear-neutral-sneakers",
  athletic_sneakers: "footwear-neutral-sneakers",
  loafers: "footwear-feminine-flat-shoes",
  dress_flats: "footwear-feminine-flat-shoes",
  snow_boots: "footwear-masculine-boots",
  rain_boots: "footwear-masculine-boot",
};

export const accessoryMap = {
  umbrella: "accessories-neutral-umbrella",
  sunglasses: "accessories-neutral-sunglasses",
  scarf: "accessories-neutral-scarf",
  beanie: "accessories-neutral-beanie",
  gloves: "accessories-neutral-gloves",
} as const;
