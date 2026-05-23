import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { FootwearKind, OutfitType } from "@/types";
import TShirt from "./svg/TShirt";
import LongSleeve from "./svg/LongSleeve";
import Pants from "./svg/Pants";
import Shorts from "./svg/Shorts";
import Jacket from "./svg/Jacket";
import HeavyJacket from "./svg/HeavyJacket";
import HeavyCoat from "./svg/HeavyCoat";
import RainJacket from "./svg/RainJacket";
import Umbrella from "./svg/Umbrella";
import Sunglasses from "./svg/Sunglasses";
import Scarf from "./svg/Scarf";
import Beanie from "./svg/Beanie";
import Gloves from "./svg/Gloves";
import FlipFlops from "./svg/FlipFlops";
import Sneakers from "./svg/Sneakers";
import SnowBoots from "./svg/SnowBoots";
import RainBoots from "./svg/RainBoots";

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
}

const ITEM_ANIM = {
  initial: { opacity: 0, scale: 0.75 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.75 },
};

const STAGGER = 0.06;

function FootwearIcon({ kind, size }: { kind: FootwearKind; size: number }) {
  switch (kind) {
    case "flip_flops":
      return <FlipFlops size={size} />;
    case "sneakers":
      return <Sneakers size={size} />;
    case "snow_boots":
      return <SnowBoots size={size} />;
    case "rain_boots":
      return <RainBoots size={size} />;
  }
}

function TopGarment({ outfit, size }: { outfit: OutfitType; size: number }) {
  switch (outfit) {
    case "shorts_tshirt":
      return <TShirt size={size} />;
    case "pants_tshirt":
      return <LongSleeve size={size} />;
    case "light_jacket":
      return <Jacket size={size} />;
    case "heavy_jacket":
      return <HeavyJacket size={size} />;
    case "heavy_coat":
      return <HeavyCoat size={size} />;
    case "rain_light":
    case "rain_heavy":
      return <RainJacket size={size} />;
  }
}

function BottomGarment({ outfit, size }: { outfit: OutfitType; size: number }) {
  return outfit === "shorts_tshirt" ? <Shorts size={size} /> : <Pants size={size} />;
}

/** Layout width (px) the base sizes below are tuned for — scaling uses measured container width / this value. */
const LAYOUT_REF_WIDTH = 280;
const SCALE_MIN = 0.72;
const SCALE_MAX = 1.28;

function iconSizesForWidth(compact: boolean, containerWidth: number | null) {
  const base = compact
    ? { top: 70, bottom: 60, acc: 50 }
    : { top: 80, bottom: 68, acc: 56 };
  const w = containerWidth ?? LAYOUT_REF_WIDTH;
  const scale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, w / LAYOUT_REF_WIDTH));
  return {
    topSz: Math.round(base.top * scale),
    bottomSz: Math.round(base.bottom * scale),
    accSz: Math.round(base.acc * scale),
  };
}

export default function OutfitFlatLay({
  outfit,
  rainGear,
  umbrella,
  sunglasses,
  scarf,
  beanie,
  gloves = false,
  footwear = null,
  compact = false,
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

  const { topSz, bottomSz, accSz } = iconSizesForWidth(compact, containerWidth);

  const wrap = (node: React.ReactNode, delay: number) => (
    <motion.div
      {...ITEM_ANIM}
      transition={{ delay }}
      className="flex items-center justify-center"
      style={{ width: accSz, height: accSz }}
    >
      {node}
    </motion.div>
  );

  const hasAccessories = Boolean(footwear || umbrella || sunglasses || scarf || beanie || gloves);
  const row3 = scarf || gloves;
  const stackFootwearUmbrella = Boolean(footwear && umbrella);
  const col3Sunglasses =
    sunglasses &&
    !beanie &&
    (stackFootwearUmbrella || (footwear && !umbrella));

  return (
    <motion.div
      ref={containerRef}
      layout
      className="mx-auto w-full overflow-hidden"
      style={{ maxWidth: compact ? 260 : 280 }}
      aria-label="Outfit flat lay"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={outfit}
          className="grid"
          style={{
            gridTemplateColumns: "1fr 1fr 1fr",
            gridTemplateRows: row3 ? "auto auto auto" : "auto auto",
            gap: compact ? 2 : 4,
            alignItems: "end",
            outline: rainGear ? "1px solid rgba(59, 130, 246, 0.35)" : undefined,
            outlineOffset: rainGear ? 2 : undefined,
            borderRadius: rainGear ? 12 : undefined,
          }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {/* Hero top — centered, full width */}
          <motion.div
            {...ITEM_ANIM}
            transition={{ delay: 0 }}
            className="flex justify-center items-center"
            style={{ gridColumn: "1 / 4", gridRow: 1, minHeight: topSz }}
          >
            <TopGarment outfit={outfit} size={topSz} />
          </motion.div>

          {hasAccessories ? (
            <>
              {/* Bottom garment — lower left */}
              <motion.div
                {...ITEM_ANIM}
                transition={{ delay: STAGGER }}
                className="flex justify-center items-end"
                style={{ gridColumn: 1, gridRow: 2, justifySelf: "center" }}
              >
                <BottomGarment outfit={outfit} size={bottomSz} />
              </motion.div>

              {/* Center column: stack footwear + umbrella when both; else single accessory */}
              {(footwear || umbrella || (!footwear && !umbrella && sunglasses)) && (
                <div
                  className="flex flex-col justify-end items-center gap-0.5"
                  style={{ gridColumn: 2, gridRow: 2, justifySelf: "center" }}
                >
                  {stackFootwearUmbrella && (
                    <>
                      {wrap(<Umbrella size={accSz} />, 2 * STAGGER)}
                      {wrap(<FootwearIcon kind={footwear} size={accSz} />, 3 * STAGGER)}
                    </>
                  )}
                  {footwear && !umbrella && wrap(<FootwearIcon kind={footwear} size={accSz} />, 2 * STAGGER)}
                  {!footwear && umbrella && wrap(<Umbrella size={accSz} />, 2 * STAGGER)}
                  {!footwear && !umbrella && sunglasses && wrap(<Sunglasses size={accSz} />, 2 * STAGGER)}
                </div>
              )}

              {(beanie || col3Sunglasses) && (
                <div
                  className="flex justify-center items-end"
                  style={{ gridColumn: 3, gridRow: 2, justifySelf: "center" }}
                >
                  {beanie && wrap(<Beanie size={accSz} />, 3 * STAGGER)}
                  {!beanie && col3Sunglasses && wrap(<Sunglasses size={accSz} />, 3 * STAGGER)}
                </div>
              )}

              {row3 && (
                <>
                  {scarf && (
                    <div
                      className="flex justify-center items-start"
                      style={{
                        gridColumn: footwear ? 2 : 1,
                        gridRow: 3,
                        justifySelf: "center",
                      }}
                    >
                      {wrap(<Scarf size={accSz} />, 5 * STAGGER)}
                    </div>
                  )}
                  {gloves && (
                    <div
                      className="flex justify-center items-start"
                      style={{
                        gridColumn: scarf && footwear ? 1 : 2,
                        gridRow: 3,
                        justifySelf: "center",
                      }}
                    >
                      {wrap(<Gloves size={accSz} />, 6 * STAGGER)}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <motion.div
              {...ITEM_ANIM}
              transition={{ delay: STAGGER }}
              className="flex justify-center items-center"
              style={{ gridColumn: "1 / 4", gridRow: 2 }}
            >
              <BottomGarment outfit={outfit} size={bottomSz} />
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
