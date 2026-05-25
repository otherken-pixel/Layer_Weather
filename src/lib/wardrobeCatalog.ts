import type { StylePreference, WeatherScenario } from "@/types";
import {
  SVG_CATALOG,
  resolveSvgId,
  type SvgCatalogEntry,
} from "@/data/svgCatalog";

export type { SvgStyle, SvgCategory } from "@/lib/svgCatalog.types";
export type { SvgCatalogEntry as SvgEntry };

export { SVG_CATALOG };

export function catalogForPreference(
  preference: StylePreference,
  category: SvgCatalogEntry["category"]
): SvgCatalogEntry[] {
  return SVG_CATALOG.filter((e) => {
    if (e.category !== category) return false;
    if (preference === "all") return true;
    return e.style === "neutral" || e.style === preference;
  });
}

export interface ScenarioMeta {
  key: WeatherScenario;
  label: string;
  emoji: string;
  description: string;
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
    defaults: {
      top: "tops-neutral-tshirt",
      bottom: "bottoms-neutral-shorts",
      outerwear: null,
      footwear: "footwear-neutral-flip-flops",
      accessories: ["accessories-neutral-sunglasses"],
    },
  },
  {
    key: "warm",
    label: "Warm Day",
    emoji: "🌤️",
    description: "65–71°F",
    defaults: {
      top: "tops-neutral-tshirt",
      bottom: "bottoms-neutral-trousers",
      outerwear: null,
      footwear: "footwear-neutral-sneakers",
      accessories: [],
    },
  },
  {
    key: "mild",
    label: "Mild Day",
    emoji: "🧥",
    description: "60–64°F",
    defaults: {
      top: "tops-neutral-shirt",
      bottom: "bottoms-neutral-trousers",
      outerwear: "outerwear-neutral-jacket",
      footwear: "footwear-neutral-sneakers",
      accessories: [],
    },
  },
  {
    key: "cool",
    label: "Chilly Day",
    emoji: "🍂",
    description: "45–59°F",
    defaults: {
      top: "tops-neutral-shirt",
      bottom: "bottoms-neutral-trousers",
      outerwear: "outerwear-neutral-jacket-1",
      footwear: "footwear-neutral-sneakers",
      accessories: [],
    },
  },
  {
    key: "cold",
    label: "Cold Day",
    emoji: "🧤",
    description: "Below 45°F",
    defaults: {
      top: "outerwear-neutral-sweater",
      bottom: "bottoms-neutral-trousers",
      outerwear: "outerwear-neutral-coat",
      footwear: "footwear-masculine-boots",
      accessories: [
        "accessories-neutral-scarf",
        "accessories-neutral-beanie",
        "accessories-neutral-gloves",
      ],
    },
  },
  {
    key: "rainy",
    label: "Rainy Day",
    emoji: "🌧️",
    description: "Rain expected",
    defaults: {
      top: "tops-neutral-shirt",
      bottom: "bottoms-neutral-trousers",
      outerwear: "outerwear-neutral-raincoat",
      footwear: "footwear-masculine-boot",
      accessories: ["accessories-neutral-umbrella"],
    },
  },
  {
    key: "snowy",
    label: "Snowy Day",
    emoji: "❄️",
    description: "Snow expected",
    defaults: {
      top: "outerwear-neutral-sweater",
      bottom: "bottoms-neutral-trousers",
      outerwear: "outerwear-neutral-coat",
      footwear: "footwear-masculine-boots",
      accessories: [
        "accessories-neutral-beanie",
        "accessories-neutral-gloves",
        "accessories-neutral-scarf",
      ],
    },
  },
];

export function getScenarioMeta(key: WeatherScenario): ScenarioMeta {
  return SCENARIOS.find((s) => s.key === key) ?? SCENARIOS[0];
}

/** Normalize stored svg value (legacy or id) to a catalog id when saving/displaying. */
export function normalizeSvgId(value: string | null | undefined): string | null {
  return resolveSvgId(value);
}
