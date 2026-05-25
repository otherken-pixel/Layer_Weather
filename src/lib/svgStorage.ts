import { supabase } from "./supabase";

export const SVG_CLOTHES_BUCKET = "svg_clothes_files";

/** Public URL for an object path inside svg_clothes_files (bucket must be public). */
export function getSvgPublicUrl(path: string): string {
  const { data } = supabase.storage.from(SVG_CLOTHES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
