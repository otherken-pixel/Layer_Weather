import type { OutfitOverride } from "@/components/outfit/OutfitFlatLay";
import type { OutfitType } from "@/types";
import { resolveSvgId, type SvgCatalogEntry } from "@/lib/svgCatalog";

export interface OutfitDisplayCopy {
  label: string;
  description: string;
  garmentTop: string;
  garmentBottom: string | null;
}

function labelForSvg(
  id: string | null | undefined,
  byId: Record<string, SvgCatalogEntry>
): string | null {
  if (!id) return null;
  const resolved = resolveSvgId(id, byId) ?? id;
  const entry = byId[resolved];
  if (entry?.label) return entry.label;
  const slug = resolved.split("-").pop() ?? resolved;
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function joinLabel(top: string, bottom: string | null): string {
  if (!bottom) return top;
  return `${top} & ${bottom}`;
}

function lowerGarment(name: string): string {
  const small = new Set(["and", "or", "the", "a", "an", "of", "in", "on", "at", "to", "for"]);
  return name
    .split(/\s+/)
    .map((word, i) => {
      if (i > 0 && small.has(word.toLowerCase())) return word.toLowerCase();
      if (word.length <= 3 && word === word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Build card title, footer, and garment strings from the same SVG slots shown in the flat lay.
 * Accessories are omitted from copy (icons only).
 */
export function buildDisplayCopyFromOverride(
  override: OutfitOverride,
  byId: Record<string, SvgCatalogEntry>,
  opts: {
    displayFeelsLike: number;
    rainGear: boolean;
    outfitType: OutfitType;
  }
): OutfitDisplayCopy {
  const isDress =
    (override.top === "tops-feminine-dress" || override.top === "Dress") && !override.outerwear;

  const topSvg = override.outerwear ?? override.top;
  const topRaw = labelForSvg(topSvg, byId) ?? "Top";
  const bottomRaw = override.bottom ? labelForSvg(override.bottom, byId) : null;

  const garmentTop = lowerGarment(topRaw);
  const garmentBottom = bottomRaw ? lowerGarment(bottomRaw) : null;
  const temp = Math.round(opts.displayFeelsLike);

  if (isDress) {
    const label = topRaw;
    const description = opts.rainGear
      ? `${garmentTop} — rainy at ${temp}°F.`
      : `${garmentTop} — great at ${temp}°F.`;
    return { label, description, garmentTop, garmentBottom: null };
  }

  const label = joinLabel(topRaw, bottomRaw);
  let description: string;
  if (opts.rainGear) {
    if (garmentBottom) {
      const bottomLower = garmentBottom.toLowerCase();
      const warmShorts =
        opts.outfitType === "rain_light_shorts" ||
        (bottomLower.includes("short") && !bottomLower.includes("sleeve"));
      description = warmShorts
        ? `${garmentTop} and ${garmentBottom} — warm rain at ${temp}°F.`
        : `${garmentTop} and ${garmentBottom} — rain at ${temp}°F.`;
    } else {
      description = `${garmentTop} — rain at ${temp}°F.`;
    }
  } else if (garmentBottom) {
    description = `${garmentTop} and ${garmentBottom} at ${temp}°F.`;
  } else {
    description = `${garmentTop} at ${temp}°F.`;
  }

  return { label, description, garmentTop, garmentBottom };
}
