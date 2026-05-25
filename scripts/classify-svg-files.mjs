/**
 * Classifies flat bucket SVG filenames into style + category paths.
 * Run: node scripts/classify-svg-files.mjs
 */

const FILES = [
  "001-jacket.svg","002-dress.svg","003-winter-hat.svg","004-polo.svg","005-tshirt.svg",
  "006-gloves.svg","007-jacket-1.svg","008-sweater.svg","009-coat.svg","010-trousers.svg",
  "011-jacket-2.svg","012-boots.svg","013-winter-hat-1.svg","014-dress-1.svg","015-shoes.svg",
  "016-jeans.svg","017-gym.svg","018-clothes.svg","019-tank-top.svg","020-scarf.svg",
  "021-jeans-1.svg","022-tights.svg","023-swimming-trunks.svg","024-clothes-1.svg",
  "025-hoodie.svg","026-clothing.svg","027-boot.svg","028-raincoat.svg","029-pullover.svg",
  "030-trench-coat.svg","031-flip-flops.svg","032-pamela-hat.svg","033-dress-2.svg",
  "034-shorts.svg","035-umbrella.svg","036-overcoat.svg","037-dress-3.svg","038-hood.svg",
  "039-coat-1.svg","040-woman-clothes.svg","041-dress-4.svg","042-shirt.svg",
  "043-woman-clothes-1.svg","044-polo-1.svg","045-polo-2.svg","046-clothes-2.svg",
  "047-crop-top.svg","048-hawaiian-shirt.svg","049-safety-shoes.svg","050-sport-clothes.svg",
  "051-uniform.svg","052-dress-5.svg","053-coat-2.svg","054-shirt-1.svg","055-ear-protection.svg",
  "056-woman-clothes-2.svg","057-woman-clothes-3.svg","058-wedding-suit.svg","059-suit.svg",
  "060-denim-jacket.svg","061-shirt-2.svg","062-coat-3.svg","063-hat.svg","064-pamela-hat-1.svg",
  "065-leggings.svg","066-skirt.svg","067-safety-glasses.svg","068-swimsuit.svg","069-top.svg",
  "070-suit-1.svg","071-loose-pants.svg","072-coat-4.svg","073-handbag.svg","074-shoes-1.svg",
  "075-hawaiian-shirt-1.svg","076-shorts-1.svg","077-tights-1.svg","078-sweatshirt.svg",
  "079-jacket-3.svg","080-beanie.svg","081-swimsuit-1.svg","082-belt.svg","083-boots-1.svg",
  "084-sneakers.svg","085-high-heels.svg","086-shoes-2.svg","087-running-shoe.svg",
  "088-heels.svg","089-flat-shoes.svg","090-shoes-3.svg","091-sneakers-1.svg","092-shoe.svg",
  "093-tank-top-1.svg","094-girl.svg","095-tshirt-1.svg","096-belt-1.svg","097-sunglasses.svg",
  "098-cap.svg","099-woman-bag.svg","100-shoulder-bag.svg",
];

const CATEGORIES = ["tops", "bottoms", "outerwear", "footwear", "accessories"];
const STYLES = ["masculine", "feminine", "neutral"];

function slugFromFile(file) {
  return file.replace(/\.svg$/i, "");
}

function detectCategory(slug) {
  const s = slug.replace(/^\d+-/, "");
  const footwear =
    /boot|shoe|sneaker|heel|flip-flop|loafer|sandal|slipper|running-shoe|flat-shoe|safety-shoe/.test(s);
  const accessories =
    /glove|hat|beanie|scarf|umbrella|pamela|sunglass|cap|belt|handbag|shoulder-bag|woman-bag|ear-protection|safety-glass|winter-hat/.test(s);
  const outerwear =
    /jacket|coat|raincoat|trench|overcoat|hoodie|pullover|sweater|sweatshirt|denim-jacket|hood$/.test(s);
  const bottoms =
    /trouser|pant|jean|short|tight|legging|skirt|swimming-trunk|loose-pant/.test(s);
  const tops =
    /dress|polo|tshirt|shirt|tank|top|crop|hawaiian|gym|clothes|clothing|uniform|swimsuit|sport|woman-clothes|girl|top$/.test(s);

  if (footwear) return "footwear";
  if (accessories) return "accessories";
  if (/^dress/.test(s) || s.startsWith("dress")) return "tops";
  if (outerwear && !/shirt/.test(s)) return "outerwear";
  if (bottoms) return "bottoms";
  if (tops) return "tops";
  if (outerwear) return "outerwear";
  return "tops";
}

function detectStyle(slug, category) {
  const s = slug.replace(/^\d+-/, "");
  if (
    /woman|dress|skirt|tight|legging|crop-top|high-heel|heel|pamela|handbag|woman-bag|shoulder-bag|flat-shoe/.test(s) &&
    !/safety|uniform|wedding-suit|suit/.test(s)
  ) {
    return "feminine";
  }
  if (
    /suit|uniform|swimming-trunk|safety-shoe|safety-glass|ear-protection|denim-jacket|wedding/.test(s) ||
    (category === "footwear" && /boot|safety|running/.test(s))
  ) {
    return "masculine";
  }
  if (/girl/.test(s)) return "feminine";
  return "neutral";
}

function humanLabel(slug) {
  const s = slug.replace(/^\d+-/, "").replace(/-/g, " ");
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Stable id: category-style-slug (slug includes numeric prefix for uniqueness) */
function makeId(category, style, slug) {
  const base = slug.replace(/^\d+-/, "");
  return `${category}-${style}-${base}`.replace(/--+/g, "-");
}

const entries = FILES.map((file) => {
  const slug = slugFromFile(file);
  const category = detectCategory(slug);
  const style = detectStyle(slug, category);
  const path = `${style}/${category}/${file}`;
  const id = makeId(category, style, slug);
  return {
    id,
    path,
    label: humanLabel(slug),
    category,
    style,
    legacyFile: file,
  };
});

// Stored under outerwear/ but selected in the wardrobe "tops" tab (matches legacy catalog).
for (const e of entries) {
  if (e.id === "outerwear-neutral-sweater") e.category = "tops";
}

// Resolve duplicate ids
const seen = new Map();
for (const e of entries) {
  if (seen.has(e.id)) {
    const n = seen.get(e.id) + 1;
    seen.set(e.id, n);
    e.id = `${e.id}-${n}`;
  } else {
    seen.set(e.id, 1);
  }
}

if (process.argv.includes("--write-catalog")) {
  const fs = await import("fs");
  const path = await import("path");
  const { fileURLToPath } = await import("url");
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const catalog = entries.map(({ id, path: p, label, category, style }) => ({
    id,
    path: p,
    label,
    category,
    style,
  }));
  const legacy = {
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
  const ts = `// AUTO-GENERATED by scripts/classify-svg-files.mjs --write-catalog
import type { SvgStyle, SvgCategory } from "@/lib/svgCatalog.types";

export interface SvgCatalogEntry {
  id: string;
  path: string;
  label: string;
  category: SvgCategory;
  style: SvgStyle;
}

export const SVG_CATALOG: SvgCatalogEntry[] = ${JSON.stringify(catalog, null, 2)};

export const SVG_CATALOG_BY_ID: Record<string, SvgCatalogEntry> = Object.fromEntries(
  SVG_CATALOG.map((e) => [e.id, e])
);

export const LEGACY_SVG_KEY_MAP: Record<string, string> = ${JSON.stringify(legacy, null, 2)};

export function resolveSvgId(value: string | null | undefined): string | null {
  if (!value) return null;
  if (SVG_CATALOG_BY_ID[value]) return value;
  return LEGACY_SVG_KEY_MAP[value] ?? value;
}
`;
  fs.writeFileSync(path.join(dir, "../src/data/svgCatalog.ts"), ts);
  console.error("Wrote src/data/svgCatalog.ts");
} else {
  console.log(JSON.stringify(entries, null, 2));
}
