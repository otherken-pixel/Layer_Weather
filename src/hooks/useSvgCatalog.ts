import { useEffect, useRef } from "react";
import { getSvgCatalog } from "@/lib/supabase";
import { buildCatalogById } from "@/lib/svgCatalog";
import { loadPersistedSvgCatalog, persistSvgCatalog } from "@/lib/svgCatalogPersistence";
import { prefetchSvgImages } from "@/lib/svgImageCache";
import { useAppStore } from "@/store";

/** Loads svg_clothes catalog (persisted cache first), refreshes from API, warms image cache. */
export function useSvgCatalog() {
  const started = useRef(false);
  const setSvgCatalog = useAppStore((s) => s.setSvgCatalog);
  const setSvgCatalogLoading = useAppStore((s) => s.setSvgCatalogLoading);
  const setSvgCatalogError = useAppStore((s) => s.setSvgCatalogError);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let cancelled = false;

    async function hydrate() {
      setSvgCatalogLoading(true);
      setSvgCatalogError(null);

      const persisted = await loadPersistedSvgCatalog();
      if (!cancelled && persisted?.length) {
        const byId = buildCatalogById(persisted);
        setSvgCatalog(persisted, byId);
        prefetchSvgImages(persisted, byId);
      }

      try {
        const fresh = await getSvgCatalog();
        if (cancelled) return;
        const byId = buildCatalogById(fresh);
        setSvgCatalog(fresh, byId);
        void persistSvgCatalog(fresh);
        prefetchSvgImages(fresh, byId);
      } catch (err: unknown) {
        if (cancelled) return;
        const hasCache = useAppStore.getState().svgCatalog.length > 0;
        if (!hasCache) {
          setSvgCatalogError(
            err instanceof Error ? err.message : "Failed to load clothing icons"
          );
        }
      } finally {
        if (!cancelled) setSvgCatalogLoading(false);
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [setSvgCatalog, setSvgCatalogLoading, setSvgCatalogError]);
}
