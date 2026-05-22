import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { OutfitType } from "@/types";
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
import Sneakers from "./svg/Sneakers";

interface Props {
  outfit: OutfitType;
  rainGear: boolean;
  umbrella: boolean;
  sunglasses: boolean;
  scarf: boolean;
  beanie: boolean;
  /** No longer affects rendering — icons carry their own colors. Kept for call-site compatibility. */
  colorScheme?: "dark" | "light";
  /** Compact mode for use in small cards (e.g. onboarding swipe cards) */
  compact?: boolean;
}

const ITEM_ANIM = {
  initial: { opacity: 0, scale: 0.75 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.75 },
};

const STAGGER = 0.06;

export default function OutfitFlatLay({
  outfit,
  umbrella,
  sunglasses,
  scarf,
  beanie,
  compact = false,
}: Props) {
  const sz = compact ? 72 : 100;
  const accSz = compact ? 52 : 72;

  const topGarment = (() => {
    switch (outfit) {
      case "shorts_tshirt":
        return (
          <motion.div {...ITEM_ANIM} transition={{ delay: 0 * STAGGER }}>
            <TShirt size={sz} />
          </motion.div>
        );
      case "pants_tshirt":
        return (
          <motion.div {...ITEM_ANIM} transition={{ delay: 0 * STAGGER }}>
            <LongSleeve size={sz} />
          </motion.div>
        );
      case "light_jacket":
        return (
          <motion.div {...ITEM_ANIM} transition={{ delay: 0 }}>
            <Jacket size={sz} />
          </motion.div>
        );
      case "heavy_jacket":
        return (
          <motion.div {...ITEM_ANIM} transition={{ delay: 0 }}>
            <HeavyJacket size={sz} />
          </motion.div>
        );
      case "heavy_coat":
        return (
          <motion.div {...ITEM_ANIM} transition={{ delay: 0 }}>
            <HeavyCoat size={sz} />
          </motion.div>
        );
      case "rain_light":
      case "rain_heavy":
        return (
          <motion.div {...ITEM_ANIM} transition={{ delay: 0 }}>
            <RainJacket size={sz} />
          </motion.div>
        );
    }
  })();

  const isRainOutfit = outfit === "rain_light" || outfit === "rain_heavy";

  const accessories: React.ReactNode[] = isRainOutfit
    ? [
        <motion.div key="umbrella" {...ITEM_ANIM} transition={{ delay: 2 * STAGGER }}>
          <Umbrella size={accSz} />
        </motion.div>,
      ]
    : outfit === "shorts_tshirt"
    ? [
        <motion.div key="shoes" {...ITEM_ANIM} transition={{ delay: 2 * STAGGER }}>
          <Sneakers size={accSz} />
        </motion.div>,
      ]
    : [];

  if (!isRainOutfit && umbrella) {
    accessories.push(
      <motion.div key="umbrella" {...ITEM_ANIM} transition={{ delay: 3 * STAGGER }}>
        <Umbrella size={accSz} />
      </motion.div>
    );
  }
  if (sunglasses) {
    accessories.push(
      <motion.div key="sunglasses" {...ITEM_ANIM} transition={{ delay: 4 * STAGGER }}>
        <Sunglasses size={accSz} />
      </motion.div>
    );
  }
  if (scarf) {
    accessories.push(
      <motion.div key="scarf" {...ITEM_ANIM} transition={{ delay: 5 * STAGGER }}>
        <Scarf size={accSz} />
      </motion.div>
    );
  }
  if (beanie) {
    accessories.push(
      <motion.div key="beanie" {...ITEM_ANIM} transition={{ delay: 6 * STAGGER }}>
        <Beanie size={accSz} />
      </motion.div>
    );
  }

  const hasAccessories = accessories.length > 0;
  const btmSz = hasAccessories ? sz : compact ? 90 : 130;

  const bottomGarment =
    outfit === "shorts_tshirt" ? (
      <motion.div {...ITEM_ANIM} transition={{ delay: 1 * STAGGER }}>
        <Shorts size={btmSz} />
      </motion.div>
    ) : (
      <motion.div {...ITEM_ANIM} transition={{ delay: 1 * STAGGER }}>
        <Pants size={btmSz} />
      </motion.div>
    );

  return (
    <div className="flex flex-col gap-3">
      {/* Top zone – full width */}
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

      {/* Bottom zone – two column when accessories present, full-width otherwise */}
      {hasAccessories ? (
        <div className="grid grid-cols-2 gap-3">
          <AnimatePresence mode="wait">
            <motion.div key={`btm-${outfit}`} className="flex justify-center items-center">
              {bottomGarment}
            </motion.div>
          </AnimatePresence>
          <div className="flex flex-wrap gap-2 justify-center items-start content-start">
            <AnimatePresence>{accessories}</AnimatePresence>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={`btm-${outfit}`} className="flex justify-center items-center">
            {bottomGarment}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
