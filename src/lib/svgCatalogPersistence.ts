import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";
import type { SvgCatalogEntry } from "@/lib/svgCatalog.types";

const CACHE_KEY = "svg_clothes_catalog_v1";

interface CachedCatalog {
  version: 1;
  savedAt: string;
  items: SvgCatalogEntry[];
}

export async function loadPersistedSvgCatalog(): Promise<SvgCatalogEntry[] | null> {
  try {
    const raw = Capacitor.isNativePlatform()
      ? (await Preferences.get({ key: CACHE_KEY })).value
      : localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCatalog;
    if (parsed.version !== 1 || !Array.isArray(parsed.items) || parsed.items.length === 0) {
      return null;
    }
    return parsed.items;
  } catch {
    return null;
  }
}

export async function persistSvgCatalog(items: SvgCatalogEntry[]): Promise<void> {
  const payload: CachedCatalog = {
    version: 1,
    savedAt: new Date().toISOString(),
    items,
  };
  const raw = JSON.stringify(payload);
  try {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: CACHE_KEY, value: raw });
    } else {
      localStorage.setItem(CACHE_KEY, raw);
    }
  } catch {
    /* quota or private mode — non-fatal */
  }
}
