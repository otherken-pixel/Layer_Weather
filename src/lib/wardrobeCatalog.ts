import type { StylePreference, WeatherScenario } from "@/types";

export type SvgStyle = "feminine" | "masculine" | "neutral";
export type SvgCategory = "tops" | "bottoms" | "outerwear" | "footwear" | "accessories";

export interface SvgEntry {
  name: string;        // matches the SVG filename/registry key
  label: string;       // human-readable
  category: SvgCategory;
  style: SvgStyle;
}

export const SVG_CATALOG: SvgEntry[] = [
  // Tops
  { name: "TShirt",      label: "T-Shirt",       category: "tops",        style: "neutral"   },
  { name: "LongSleeve",  label: "Long Sleeve",   category: "tops",        style: "neutral"   },
  { name: "Sweater",     label: "Sweater",        category: "tops",        style: "neutral"   },
  { name: "Dress",       label: "Dress",          category: "tops",        style: "feminine"  },

  // Outerwear
  { name: "Jacket",      label: "Jacket",         category: "outerwear",   style: "neutral"   },
  { name: "HeavyJacket", label: "Heavy Jacket",   category: "outerwear",   style: "neutral"   },
  { name: "HeavyCoat",   label: "Heavy Coat",     category: "outerwear",   style: "neutral"   },
  { name: "RainJacket",  label: "Rain Jacket",    category: "outerwear",   style: "neutral"   },
  { name: "WomensJacket",label: "Jacket",         category: "outerwear",   style: "feminine"  },

  // Bottoms
  { name: "Pants",       label: "Pants",          category: "bottoms",     style: "neutral"   },
  { name: "Shorts",      label: "Shorts",         category: "bottoms",     style: "neutral"   },
  { name: "WomensJeans", label: "Jeans",          category: "bottoms",     style: "feminine"  },

  // Footwear
  { name: "Sneakers",    label: "Sneakers",       category: "footwear",    style: "neutral"   },
  { name: "FlipFlops",   label: "Flip Flops",     category: "footwear",    style: "neutral"   },
  { name: "SnowBoots",   label: "Snow Boots",     category: "footwear",    style: "neutral"   },
  { name: "RainBoots",   label: "Rain Boots",     category: "footwear",    style: "neutral"   },

  // Accessories (multi-select)
  { name: "Umbrella",    label: "Umbrella",       category: "accessories", style: "neutral"   },
  { name: "Sunglasses",  label: "Sunglasses",     category: "accessories", style: "neutral"   },
  { name: "Scarf",       label: "Scarf",          category: "accessories", style: "neutral"   },
  { name: "Beanie",      label: "Beanie",         category: "accessories", style: "neutral"   },
  { name: "Gloves",      label: "Gloves",         category: "accessories", style: "neutral"   },
];

// Filter SVG options based on user style preference
export function catalogForPreference(
  preference: StylePreference,
  category: SvgCategory
): SvgEntry[] {
  return SVG_CATALOG.filter((e) => {
    if (e.category !== category) return false;
    if (preference === "all") return true;
    return e.style === "neutral" || e.style === preference;
  });
}

// Weather scenario metadata for display
export interface ScenarioMeta {
  key: WeatherScenario;
  label: string;
  emoji: string;
  description: string;
  // Suggested default SVGs for first-time setup
  defaults: {
    top: string;
    bottom: string | null;
    outerwear: string | null;
    footwear: string;
    accessories: string[];
  };
}

export const SCENARIOS: ScenarioMeta[] = [
  {
    key: "hot",
    label: "Hot Day",
    emoji: "☀️",
    description: "72°F and above",
    defaults: { top: "TShirt", bottom: "Shorts", outerwear: null, footwear: "FlipFlops", accessories: ["Sunglasses"] },
  },
  {
    key: "warm",
    label: "Nice Day",
    emoji: "🌤️",
    description: "60–71°F",
    defaults: { top: "TShirt", bottom: "Pants", outerwear: null, footwear: "Sneakers", accessories: [] },
  },
  {
    key: "cool",
    label: "Chilly Day",
    emoji: "🍂",
    description: "45–59°F",
    defaults: { top: "LongSleeve", bottom: "Pants", outerwear: "Jacket", footwear: "Sneakers", accessories: [] },
  },
  {
    key: "cold",
    label: "Cold Day",
    emoji: "🧤",
    description: "Below 45°F",
    defaults: { top: "Sweater", bottom: "Pants", outerwear: "HeavyCoat", footwear: "SnowBoots", accessories: ["Scarf", "Beanie", "Gloves"] },
  },
  {
    key: "rainy",
    label: "Rainy Day",
    emoji: "🌧️",
    description: "Rain expected",
    defaults: { top: "LongSleeve", bottom: "Pants", outerwear: "RainJacket", footwear: "RainBoots", accessories: ["Umbrella"] },
  },
  {
    key: "snowy",
    label: "Snowy Day",
    emoji: "❄️",
    description: "Snow expected",
    defaults: { top: "Sweater", bottom: "Pants", outerwear: "HeavyCoat", footwear: "SnowBoots", accessories: ["Beanie", "Gloves", "Scarf"] },
  },
];

export function getScenarioMeta(key: WeatherScenario): ScenarioMeta {
  return SCENARIOS.find((s) => s.key === key) ?? SCENARIOS[0];
}
