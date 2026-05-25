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

function PlaceholderIcon({ size, label }: { size: number; label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="flex items-center justify-center rounded-lg bg-black/5 text-neutral-500"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      👕
    </div>
  );
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
  const [loadFailed, setLoadFailed] = useState(false);

  const entry = resolved ? svgCatalogById[resolved] : undefined;
  const urls = useMemo(() => {
    if (!entry) return [];
    return [getSvgPublicUrl(entry.storage_path)];
  }, [entry]);

  const label = alt ?? entry?.label ?? "Clothing item";

  if (!entry || urls.length === 0 || loadFailed) {
    return <PlaceholderIcon size={size} label={label} />;
  }

  const src = urls[urlIndex] ?? urls[0];

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
        if (urlIndex + 1 < urls.length) {
          setUrlIndex((i) => i + 1);
        } else {
          setLoadFailed(true);
        }
      }}
    />
  );
}

export default memo(StorageSvg);
