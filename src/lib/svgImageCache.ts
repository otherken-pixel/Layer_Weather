import { SCENARIOS } from "@/lib/wardrobeCatalog";
import { RAIN_EXCLUDED_SVG_IDS } from "@/lib/outfitRainDisplay";
import {
  accessoryMap,
  bottomMap,
  footwearMap,
  topMap,
} from "@/components/outfit/outfitMap";
import type { SvgCatalogEntry } from "@/lib/svgCatalog.types";
import { getSvgPublicUrl } from "@/lib/svgStorage";

const PREFETCH_BATCH_SIZE = 8;
const PREFETCH_MAX_URLS = 40;

/** Stable ids used in weather outfits and scenario defaults — prefetch first. */
export function collectPrioritySvgIds(): string[] {
  const ids = new Set<string>();
  for (const s of SCENARIOS) {
    const d = s.defaults;
    if (d.top) ids.add(d.top);
    if (d.bottom) ids.add(d.bottom);
    if (d.outerwear) ids.add(d.outerwear);
    if (d.footwear) ids.add(d.footwear);
    for (const a of d.accessories) ids.add(a);
  }
  Object.values(topMap).forEach((id) => ids.add(id));
  Object.values(bottomMap).forEach((id) => id && ids.add(id));
  Object.values(footwearMap).forEach((id) => ids.add(id));
  Object.values(accessoryMap).forEach((id) => ids.add(id));
  return [...ids];
}

function urlsForCatalog(
  catalog: SvgCatalogEntry[],
  byId: Record<string, SvgCatalogEntry>,
  priorityIds: string[],
  options?: { skipSvgIds?: Set<string> }
): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  const addPath = (path: string | undefined) => {
    if (!path || seen.has(path)) return;
    seen.add(path);
    urls.push(getSvgPublicUrl(path));
  };

  const skipIds = options?.skipSvgIds ?? new Set<string>();

  for (const id of priorityIds) {
    if (skipIds.has(id)) continue;
    addPath(byId[id]?.storage_path);
    if (urls.length >= PREFETCH_MAX_URLS) return urls;
  }

  for (const entry of catalog) {
    if (skipIds.has(entry.id)) continue;
    addPath(entry.storage_path);
    if (urls.length >= PREFETCH_MAX_URLS) break;
  }

  return urls;
}

/** Warm HTTP + service worker cache without blocking UI. */
export function prefetchSvgImages(
  catalog: SvgCatalogEntry[],
  byId: Record<string, SvgCatalogEntry>,
  options?: { skipSvgIds?: Set<string>; rainGear?: boolean }
): void {
  const skip = options?.skipSvgIds ?? new Set<string>();
  if (options?.rainGear) {
    for (const id of RAIN_EXCLUDED_SVG_IDS) skip.add(id);
  }
  const urls = urlsForCatalog(catalog, byId, collectPrioritySvgIds(), { skipSvgIds: skip });
  if (urls.length === 0) return;

  void prefetchUrlsInBatches(urls);
}

async function prefetchUrlsInBatches(urls: string[]): Promise<void> {
  for (let i = 0; i < urls.length; i += PREFETCH_BATCH_SIZE) {
    const batch = urls.slice(i, i + PREFETCH_BATCH_SIZE);
    await Promise.all(
      batch.map(
        (url) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.decoding = "async";
            img.src = url;
          })
      )
    );
    await new Promise((r) => setTimeout(r, 0));
  }
}
