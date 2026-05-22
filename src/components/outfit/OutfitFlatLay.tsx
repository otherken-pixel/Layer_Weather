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

export default function OutfitFlatLay({
  outfit,
  umbrella,
  sunglasses,
  scarf,
  beanie,
  gloves = false,
  footwear = null,
  compact = false,
}: Props) {
  /** Reference icons are 70×70px — scale proportionally by role */
  const topSz = compact ? 64 : 80;
  const bottomSz = compact ? 52 : 68;
  const accSz = compact ? 44 : 56;

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

  return (
    <motion.div
      layout
      className="mx-auto w-full overflow-hidden"
      style={{ maxWidth: compact ? 220 : 280 }}
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

              {footwear && (
                <div
                  className="flex justify-center items-end"
                  style={{ gridColumn: 2, gridRow: 2, justifySelf: "center" }}
                >
                  {wrap(<FootwearIcon kind={footwear} size={accSz} />, 2 * STAGGER)}
                </div>
              )}

              {!footwear && umbrella && (
                <div
                  className="flex justify-center items-end"
                  style={{ gridColumn: 2, gridRow: 2, justifySelf: "center" }}
                >
                  {wrap(<Umbrella size={accSz} />, 2 * STAGGER)}
                </div>
              )}

              {!footwear && !umbrella && sunglasses && (
                <div
                  className="flex justify-center items-end"
                  style={{ gridColumn: 2, gridRow: 2, justifySelf: "center" }}
                >
                  {wrap(<Sunglasses size={accSz} />, 2 * STAGGER)}
                </div>
              )}

              {beanie && (
                <div
                  className="flex justify-center items-end"
                  style={{ gridColumn: 3, gridRow: 2, justifySelf: "center" }}
                >
                  {wrap(<Beanie size={accSz} />, 3 * STAGGER)}
                </div>
              )}

              {footwear && umbrella && (
                <div
                  className="flex justify-center items-end"
                  style={{ gridColumn: 3, gridRow: 2, justifySelf: "center" }}
                >
                  {!beanie && wrap(<Umbrella size={accSz} />, 4 * STAGGER)}
                </div>
              )}

              {footwear && sunglasses && !umbrella && (
                <div
                  className="flex justify-center items-end"
                  style={{ gridColumn: 3, gridRow: 2, justifySelf: "center" }}
                >
                  {!beanie && wrap(<Sunglasses size={accSz} />, 4 * STAGGER)}
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
                  {!scarf && !gloves && umbrella && sunglasses && (
                    <div
                      className="flex justify-center items-start"
                      style={{ gridColumn: 2, gridRow: 3, justifySelf: "center" }}
                    >
                      {wrap(<Sunglasses size={accSz} />, 4 * STAGGER)}
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
