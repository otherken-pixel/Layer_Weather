export type SvgStyle = "feminine" | "masculine" | "neutral";
export type SvgCategory = "tops" | "bottoms" | "outerwear" | "footwear" | "accessories";

export interface SvgCatalogEntry {
  id: string;
  label: string;
  style: SvgStyle;
  category: SvgCategory;
  storage_path: string;
  sort_order?: number;
  active?: boolean;
}
