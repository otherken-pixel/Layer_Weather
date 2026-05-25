import { useEffect } from "react";
import { getSvgCatalog } from "@/lib/supabase";
import { buildCatalogById } from "@/lib/svgCatalog";
import { useAppStore } from "@/store";

/** Loads the public svg_clothes catalog into the app store (once per session). */
export function useSvgCatalog() {
  const catalog = useAppStore((s) => s.svgCatalog);
  const setSvgCatalog = useAppStore((s) => s.setSvgCatalog);
  const setSvgCatalogLoading = useAppStore((s) => s.setSvgCatalogLoading);
  const setSvgCatalogError = useAppStore((s) => s.setSvgCatalogError);

  useEffect(() => {
    if (catalog.length > 0) return;

    let cancelled = false;
    setSvgCatalogLoading(true);
    setSvgCatalogError(null);

    getSvgCatalog()
      .then((items) => {
        if (cancelled) return;
        setSvgCatalog(items, buildCatalogById(items));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSvgCatalogError(err instanceof Error ? err.message : "Failed to load clothing icons");
      })
      .finally(() => {
        if (!cancelled) setSvgCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [catalog.length, setSvgCatalog, setSvgCatalogLoading, setSvgCatalogError]);
}
