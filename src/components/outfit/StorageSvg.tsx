import React, { memo, useMemo, useState } from "react";
import { getSvgPublicUrl } from "@/lib/svgStorage";
import { resolveSvgId } from "@/lib/svgCatalog";
import { useAppStore } from "@/store";

interface Props {
  /** Stable catalog id (e.g. tops-neutral-tshirt) or legacy PascalCase key. */
  id: string;
  size?: number;
  className?: string;
  alt?: string;
  /** Use eager for above-the-fold outfit previews; lazy for picker grids. */
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
}

function StorageSvg({
  id,
  size = 100,
  className,
  alt,
  loading = "lazy",
  fetchPriority = "auto",
}: Props) {
  const svgCatalogById = useAppStore((s) => s.svgCatalogById);
  const resolved = resolveSvgId(id, svgCatalogById);
  const [urlIndex, setUrlIndex] = useState(0);

  const entry = resolved ? svgCatalogById[resolved] : undefined;
  const urls = useMemo(() => {
    if (!entry) return [];
    return [getSvgPublicUrl(entry.storage_path)];
  }, [entry]);

  if (!entry || urls.length === 0) return null;

  const src = urls[urlIndex] ?? urls[0];
  const label = alt ?? entry.label;

  return (
    <img
      src={src}
      width={size}
      height={size}
      className={className}
      alt={label}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      draggable={false}
      style={{ objectFit: "contain" }}
      onError={() => {
        setUrlIndex((i) => (i + 1 < urls.length ? i + 1 : i));
      }}
    />
  );
}

export default memo(StorageSvg);
