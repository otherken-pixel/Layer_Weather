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

export default function OutfitFlatLay({
  outfit,
  umbrella,
  sunglasses,
  scarf,
  beanie,
  footwear = null,
  compact = false,
}: Props) {
  const sz = compact ? 72 : 100;
  const accSz = compact ? 52 : 72;

  const wrap = (node: React.ReactNode, delay: number) => (
    <motion.div {...ITEM_ANIM} transition={{ delay }}>
      {node}
    </motion.div>
  );

  const topGarment = (() => {
    switch (outfit) {
      case "shorts_tshirt":
        return wrap(<TShirt size={sz} />, 0 * STAGGER);
      case "pants_tshirt":
        return wrap(<LongSleeve size={sz} />, 0 * STAGGER);
      case "light_jacket":
        return wrap(<Jacket size={sz} />, 0);
      case "heavy_jacket":
        return wrap(<HeavyJacket size={sz} />, 0);
      case "heavy_coat":
        return wrap(<HeavyCoat size={sz} />, 0);
      case "rain_light":
      case "rain_heavy":
        return wrap(<RainJacket size={sz} />, 0);
    }
  })();

  const bottomGarment =
    outfit === "shorts_tshirt"
      ? wrap(<Shorts size={sz} />, 1 * STAGGER)
      : wrap(<Pants size={sz} />, 1 * STAGGER);

  const accessories: React.ReactNode[] = [];
  let delay = 2;

  if (footwear) {
    accessories.push(wrap(<FootwearIcon kind={footwear} size={accSz} />, delay * STAGGER));
    delay += 1;
  }
  if (umbrella) {
    accessories.push(wrap(<Umbrella size={accSz} />, delay * STAGGER));
    delay += 1;
  }
  if (sunglasses) {
    accessories.push(wrap(<Sunglasses size={accSz} />, delay * STAGGER));
    delay += 1;
  }
  if (scarf) {
    accessories.push(wrap(<Scarf size={accSz} />, delay * STAGGER));
    delay += 1;
  }
  if (beanie) {
    accessories.push(wrap(<Beanie size={accSz} />, delay * STAGGER));
  }

  const collapseBottomRow = accessories.length <= 1;
  const bottomOnly = accessories.length === 0;

  return (
    <motion.div
      layout
      className="flex flex-col gap-3 w-full max-w-[320px] mx-auto overflow-hidden"
      aria-label="Outfit flat lay"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={outfit}
          className="flex justify-center items-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {topGarment}
        </motion.div>
      </AnimatePresence>

      {bottomOnly ? (
        <AnimatePresence mode="wait">
          <motion.div key={`btm-only-${outfit}`} className="flex justify-center items-center">
            {bottomGarment}
          </motion.div>
        </AnimatePresence>
      ) : (
        <motion.div
          layout
          className={collapseBottomRow ? "flex justify-center items-center gap-6" : "grid grid-cols-2 gap-3"}
        >
          <AnimatePresence mode="wait">
            <motion.div key={`btm-${outfit}`} className="flex justify-center items-center">
              {bottomGarment}
            </motion.div>
          </AnimatePresence>

          <motion.div
            layout
            className={
              collapseBottomRow
                ? "flex justify-center items-center"
                : "flex flex-wrap gap-2 justify-center items-start content-start"
            }
          >
            <AnimatePresence>{accessories}</AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
