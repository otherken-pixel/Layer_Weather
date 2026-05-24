import type { FootwearKind, OutfitType } from "@/types";

export const topMap: Record<OutfitType, string> = {
  shorts_tshirt: "TShirt",
  pants_tshirt: "LongSleeve",
  light_jacket: "Jacket",
  heavy_jacket: "HeavyJacket",
  heavy_coat: "HeavyCoat",
  rain_light: "RainJacket",
  rain_heavy: "RainJacket",
  dress: "Dress",
};

export const bottomMap: Record<OutfitType, string | null> = {
  shorts_tshirt: "Shorts",
  pants_tshirt: "Pants",
  light_jacket: "Pants",
  heavy_jacket: "Pants",
  heavy_coat: "Pants",
  rain_light: "Pants",
  rain_heavy: "Pants",
  dress: null,
};

export const footwearMap: Record<FootwearKind, string> = {
  flip_flops: "FlipFlops",
  sneakers: "Sneakers",
  snow_boots: "SnowBoots",
  rain_boots: "RainBoots",
};

export const accessoryMap = {
  umbrella: "Umbrella",
  sunglasses: "Sunglasses",
  scarf: "Scarf",
  beanie: "Beanie",
  gloves: "Gloves",
} as const;
