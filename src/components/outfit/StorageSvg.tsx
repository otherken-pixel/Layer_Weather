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
}

function StorageSvg({ id, size = 100, className, alt }: Props) {
  const svgCatalogById = useAppStore((s) => s.svgCatalogById);
  const resolved = resolveSvgId(id, svgCatalogById);
  const [urlIndex, setUrlIndex] = useState(0);

  const entry = resolved ? svgCatalogById[resolved] : undefined;
  const urls = useMemo(() => {
    if (!entry) return [];
    const path = entry.storage_path;
    return [getSvgPublicUrl(path)];
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
      loading="lazy"
      decoding="async"
      draggable={false}
      style={{ objectFit: "contain" }}
      onError={() => {
        setUrlIndex((i) => (i + 1 < urls.length ? i + 1 : i));
      }}
    />
  );
}

export default memo(StorageSvg);
