import React, { useEffect, useRef, useState } from "react";
import type { SvgCatalogEntry } from "@/lib/svgCatalog.types";
import StorageSvg from "@/components/outfit/StorageSvg";

const INITIAL_VISIBLE = 12;
const LOAD_MORE_BATCH = 12;

interface SvgPickerGridProps {
  entries: SvgCatalogEntry[];
  renderTile: (entry: SvgCatalogEntry) => React.ReactNode;
  header?: React.ReactNode;
  gridStyle?: React.CSSProperties;
}

/**
 * Renders picker tiles in batches to avoid dozens of parallel image requests.
 */
export default function SvgPickerGrid({
  entries,
  renderTile,
  header,
  gridStyle,
}: SvgPickerGridProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [entries.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || visibleCount >= entries.length) return;

    const observer = new IntersectionObserver(
      (observed) => {
        if (observed.some((e) => e.isIntersecting)) {
          setVisibleCount((n) => Math.min(n + LOAD_MORE_BATCH, entries.length));
        }
      },
      { root: null, rootMargin: "120px", threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [entries.length, visibleCount]);

  const visible = entries.slice(0, visibleCount);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 10,
        paddingBottom: 8,
        ...gridStyle,
      }}
    >
      {header}
      {visible.map((entry) => (
        <React.Fragment key={entry.id}>{renderTile(entry)}</React.Fragment>
      ))}
      {visibleCount < entries.length && (
        <div
          ref={sentinelRef}
          style={{ gridColumn: "1 / -1", height: 1 }}
          aria-hidden
        />
      )}
    </div>
  );
}

export function PickerSvgThumb({ id, size = 56 }: { id: string; size?: number }) {
  return <StorageSvg id={id} size={size} loading="lazy" fetchPriority="low" />;
}
