import React from "react";
import type { FootwearKind, OutfitType } from "@/types";

const OUTFIT_LABELS: Record<OutfitType, { top: string; bottom: string; layer?: string }> = {
  shorts_tshirt:    { top: "T-shirt",           bottom: "Shorts" },
  pants_shortsleeve: { top: "T-shirt",           bottom: "Pants" },
  pants_longsleeve: { top: "Long-sleeve shirt",  bottom: "Pants" },
  light_jacket:   { top: "Light jacket",       bottom: "Pants",  layer: "T-shirt underneath" },
  heavy_jacket:   { top: "Heavy jacket",       bottom: "Pants",  layer: "Warm layer underneath" },
  heavy_coat:     { top: "Heavy coat",         bottom: "Pants",  layer: "Warm layers underneath" },
  rain_light:        { top: "Rain jacket",        bottom: "Pants",   layer: "Light layer underneath" },
  rain_light_shorts: { top: "Rain jacket",        bottom: "Shorts",  layer: "T-shirt underneath" },
  rain_heavy:        { top: "Heavy rain jacket",  bottom: "Pants",   layer: "Warm layer underneath" },
  dress:          { top: "Dress",              bottom: "" },
};

const FOOTWEAR_LABELS: Record<FootwearKind, string> = {
  flip_flops:        "Flip flops",
  sneakers:          "Sneakers",
  athletic_sneakers: "Athletic sneakers",
  loafers:           "Loafers",
  dress_flats:       "Dress flats",
  snow_boots:        "Snow boots",
  rain_boots:        "Rain boots",
};

interface Props {
  outfit: OutfitType;
  umbrella: boolean;
  sunglasses: boolean;
  scarf: boolean;
  beanie: boolean;
  gloves: boolean;
  footwear: FootwearKind | null;
  isDark?: boolean;
}

export default function OutfitTextView({
  outfit,
  umbrella,
  sunglasses,
  scarf,
  beanie,
  gloves,
  footwear,
  isDark = false,
}: Props) {
  const { top, bottom, layer } = OUTFIT_LABELS[outfit];

  const accessories: string[] = [];
  if (footwear)    accessories.push(FOOTWEAR_LABELS[footwear]);
  if (umbrella)    accessories.push("Umbrella");
  if (sunglasses)  accessories.push("Sunglasses");
  if (scarf)       accessories.push("Scarf");
  if (beanie)      accessories.push("Beanie");
  if (gloves)      accessories.push("Gloves");

  const primaryText  = isDark ? "#F4F4F5" : "#111827";
  const labelColor   = isDark ? "#9BA4B4" : "#6B7280";
  const valueColor   = isDark ? "#E5E7EB" : "#1F2937";
  const dividerColor = isDark ? "rgba(255,255,255,0.07)" : "#F3F4F6";
  const accentBg   = isDark ? "var(--accent-surface)" : "var(--accent-tab-bg)";
  const accentText = isDark ? "var(--accent-light)" : "var(--accent-text)";

  const rows: { label: string; value: string }[] = [
    { label: outfit === "dress" ? "Outfit" : "Top", value: top },
    ...(bottom ? [{ label: "Bottom", value: bottom }] : []),
    ...(layer ? [{ label: "Layering", value: layer }] : []),
    ...(accessories.length > 0 ? [{ label: "Accessories", value: accessories.join(", ") }] : []),
  ];

  return (
    <div
      style={{
        borderRadius: 16,
        background: accentBg,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
      aria-label="Outfit text description"
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: accentText,
          marginBottom: 10,
        }}
      >
        What to Wear
      </p>
      {rows.map((row, i) => (
        <div key={row.label}>
          {i > 0 && <div style={{ height: 1, background: dividerColor, margin: "9px 0" }} />}
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                color: labelColor,
                fontWeight: 600,
                minWidth: 90,
                flexShrink: 0,
              }}
            >
              {row.label}
            </span>
            <span style={{ fontSize: 14, color: row.label === "Accessories" ? primaryText : valueColor, fontWeight: row.label === "Accessories" ? 500 : 600 }}>
              {row.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
