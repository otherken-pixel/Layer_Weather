import React, { memo, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { FootwearKind, OutfitType } from "@/types";
import { svgRegistry } from "./svg/index";
import { accessoryMap, bottomMap, footwearMap, topMap } from "./outfitMap";

/** When provided, bypasses outfit-type lookups and renders user-chosen SVG names directly. */
export interface OutfitOverride {
  top: string | null;
  bottom: string | null;
  outerwear: string | null;
  footwear: string | null;
  accessories: string[];
}

interface Props {
  outfit: OutfitType;
  rainGear: boolean;
  umbrella: boolean;
  sunglasses: boolean;
  scarf: boolean;
  beanie: boolean;
  gloves?: boolean;
  footwear?: FootwearKind | null;
  /** Kept for call-site compatibility — icons use their own colors */
  colorScheme?: "dark" | "light";
  /**
   * Denser layout: narrower `maxWidth`, tighter grid `gap`, and **smaller** base icon sizes
   * than the default weather card (e.g. swipe calibration preview stacks).
   */
  compact?: boolean;
  /** When provided, bypasses the system outfit-type maps and renders user-chosen SVGs. */
  override?: OutfitOverride | null;
}

const ITEM_ANIM = {
  initial: { opacity: 0, scale: 0.6, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.7, y: -6 },
};

const STAGGER = 0.06;

function SvgIcon({ name, size }: { name: string; size: number }) {
  const Component = svgRegistry[name];
  if (!Component) return null;
  return <Component size={size} />;
}

function FootwearIcon({ kind, size }: { kind: FootwearKind; size: number }) {
  return <SvgIcon name={footwearMap[kind]} size={size} />;
}

function TopGarment({ outfit, size }: { outfit: OutfitType; size: number }) {
  return <SvgIcon name={topMap[outfit]} size={size} />;
}

function BottomGarment({ outfit, size }: { outfit: OutfitType; size: number }) {
  const name = bottomMap[outfit];
  if (!name) return null;
  return <SvgIcon name={name} size={size} />;
}

/** Layout width (px) the base sizes below are tuned for — scaling uses measured container width / this value. */
const LAYOUT_REF_WIDTH = 280;
const SCALE_MIN = 0.72;
const SCALE_MAX = 1.28;

function iconSizesForWidth(compact: boolean, containerWidth: number | null) {
  const base = compact
    ? { top: 82, bottom: 72, acc: 56 }
    : { top: 96, bottom: 84, acc: 62 };
  const w = containerWidth ?? LAYOUT_REF_WIDTH;
  const scale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, w / LAYOUT_REF_WIDTH));
  return {
    topSz: Math.round(base.top * scale),
    bottomSz: Math.round(base.bottom * scale),
    accSz: Math.round(base.acc * scale),
  };
}

const OutfitFlatLay = memo(function OutfitFlatLay({
  outfit,
  rainGear,
  umbrella,
  sunglasses,
  scarf,
  beanie,
  gloves = false,
  footwear = null,
  compact = false,
  override = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const update = () => setContainerWidth(el.clientWidth);
    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { topSz, bottomSz: baseBottomSz, accSz } = iconSizesForWidth(compact, containerWidth);
  const footwearSz = Math.round(accSz * 1.25);

  const wrap = (node: React.ReactNode, delay: number, sz = accSz, reactKey?: React.Key) => (
    <motion.div
      key={reactKey}
      {...ITEM_ANIM}
      transition={{ delay, type: "spring", stiffness: 280, damping: 22 }}
      className="flex items-center justify-center"
      style={{ width: sz, height: sz }}
    >
      {node}
    </motion.div>
  );

  // ── Override mode: render user-chosen SVGs directly ──
  if (override) {
    const topSvg = override.outerwear ?? override.top;
    const isDressOverride = override.top === "Dress" && !override.outerwear;
    return (
      <motion.div
        ref={containerRef}
        layout
        className="mx-auto w-full overflow-hidden"
        style={{ maxWidth: compact ? 270 : 320 }}
        aria-label="Your wardrobe outfit"
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "auto auto",
            gap: compact ? 8 : 12,
          }}
        >
          {isDressOverride ? (
            <motion.div
              {...ITEM_ANIM}
              transition={{ delay: 0, type: "spring", stiffness: 300, damping: 20 }}
              className="flex justify-center items-center"
              style={{ gridColumn: "1 / 3", gridRow: 1, minHeight: topSz }}
            >
              {topSvg && <SvgIcon name={topSvg} size={topSz} />}
            </motion.div>
          ) : (
            <>
              <motion.div
                {...ITEM_ANIM}
                transition={{ delay: 0, type: "spring", stiffness: 300, damping: 20 }}
                className="flex justify-center items-center"
                style={{ gridColumn: 1, gridRow: 1, minHeight: topSz }}
              >
                {topSvg && <SvgIcon name={topSvg} size={topSz} />}
              </motion.div>
              <motion.div
                {...ITEM_ANIM}
                transition={{ delay: STAGGER, type: "spring", stiffness: 280, damping: 22 }}
                className="flex justify-center items-center"
                style={{ gridColumn: 2, gridRow: 1, minHeight: topSz }}
              >
                {override.bottom && <SvgIcon name={override.bottom} size={baseBottomSz} />}
              </motion.div>
            </>
          )}
          <div
            className="flex justify-center items-center"
            style={{ gridColumn: 1, gridRow: 2, minHeight: footwearSz }}
          >
            {override.footwear &&
              wrap(<SvgIcon name={override.footwear} size={footwearSz} />, 2 * STAGGER, footwearSz)}
          </div>
          <div
            className="flex flex-wrap justify-center items-center gap-1"
            style={{ gridColumn: 2, gridRow: 2, minHeight: footwearSz }}
          >
            {override.accessories.map((name, i) =>
              wrap(<SvgIcon name={name} size={accSz} />, (3 + i) * STAGGER)
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Standard mode: system-generated outfit ──
  const isDress = outfit === "dress";
  const accessories = [
    umbrella && { key: "umbrella", node: <SvgIcon name={accessoryMap.umbrella} size={accSz} /> },
    sunglasses && { key: "sunglasses", node: <SvgIcon name={accessoryMap.sunglasses} size={accSz} /> },
    scarf && { key: "scarf", node: <SvgIcon name={accessoryMap.scarf} size={accSz} /> },
    beanie && { key: "beanie", node: <SvgIcon name={accessoryMap.beanie} size={accSz} /> },
    gloves && { key: "gloves", node: <SvgIcon name={accessoryMap.gloves} size={accSz} /> },
  ].filter((item): item is { key: string; node: React.ReactElement } => Boolean(item));

  return (
    <motion.div
      ref={containerRef}
      layout
      className="mx-auto w-full overflow-hidden"
      style={{ maxWidth: compact ? 270 : 320 }}
      aria-label="Outfit flat lay"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={outfit}
          className="grid"
          style={{
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "auto auto",
            gap: compact ? 8 : 12,
            outline: rainGear ? "1px solid rgba(59, 130, 246, 0.35)" : undefined,
            outlineOffset: rainGear ? 2 : undefined,
            borderRadius: rainGear ? 12 : undefined,
          }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {/* Top row */}
          {isDress ? (
            /* Dress — centered across full top row */
            <motion.div
              {...ITEM_ANIM}
              transition={{ delay: 0, type: "spring", stiffness: 300, damping: 20 }}
              className="flex justify-center items-center"
              style={{ gridColumn: "1 / 3", gridRow: 1, minHeight: topSz }}
            >
              <TopGarment outfit={outfit} size={topSz} />
            </motion.div>
          ) : (
            <>
              {/* Top-left: top garment */}
              <motion.div
                {...ITEM_ANIM}
                transition={{ delay: 0, type: "spring", stiffness: 300, damping: 20 }}
                className="flex justify-center items-center"
                style={{ gridColumn: 1, gridRow: 1, minHeight: topSz }}
              >
                <TopGarment outfit={outfit} size={topSz} />
              </motion.div>

              {/* Top-right: bottom garment */}
              <motion.div
                {...ITEM_ANIM}
                transition={{ delay: STAGGER, type: "spring", stiffness: 280, damping: 22 }}
                className="flex justify-center items-center"
                style={{ gridColumn: 2, gridRow: 1, minHeight: topSz }}
              >
                <BottomGarment outfit={outfit} size={baseBottomSz} />
              </motion.div>
            </>
          )}

          {/* Bottom-left: footwear */}
          <div
            className="flex justify-center items-center"
            style={{ gridColumn: 1, gridRow: 2, minHeight: footwearSz }}
          >
            {footwear && wrap(<FootwearIcon kind={footwear} size={footwearSz} />, 2 * STAGGER, footwearSz)}
          </div>

          {/* Bottom-right: accessories */}
          <div
            className="flex flex-wrap justify-center items-center gap-1"
            style={{ gridColumn: 2, gridRow: 2, minHeight: footwearSz }}
          >
            {accessories.map(({ key, node }, i) =>
              wrap(node, (3 + i) * STAGGER, accSz, key)
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
});

export default OutfitFlatLay;
