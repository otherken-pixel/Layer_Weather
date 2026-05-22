import { AnimatePresence, motion } from "framer-motion";
import type { OutfitType } from "@/types";
import TShirt from "./svg/TShirt";
import Pants from "./svg/Pants";
import Shorts from "./svg/Shorts";
import Jacket from "./svg/Jacket";
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
  /** Controls icon stroke color. Defaults to white (dark mode). */
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
  rainGear,
  umbrella,
  sunglasses,
  scarf,
  beanie,
  colorScheme = "dark",
  compact = false,
}: Props) {
  const strokeColor =
    colorScheme === "dark"
      ? "rgba(255,255,255,0.92)"
      : "rgba(26,26,46,0.88)";

  const sz = compact ? 72 : 100;
  const accSz = compact ? 52 : 72;

  // Determine which top-layer and bottom garment to render
  const topGarment = (() => {
    switch (outfit) {
      case "shorts_tshirt":
      case "pants_tshirt":
        return (
          <motion.div {...ITEM_ANIM} transition={{ delay: 0 * STAGGER }}>
            <TShirt stroke={strokeColor} size={sz} />
          </motion.div>
        );
      case "light_jacket":
        return (
          <motion.div
            style={{ display: "grid", width: sz, height: sz }}
            {...ITEM_ANIM}
            transition={{ delay: 0 }}
          >
            <div style={{ gridArea: "1/1", opacity: 0.4 }}>
              <TShirt stroke={strokeColor} size={sz} />
            </div>
            <div style={{ gridArea: "1/1" }}>
              <Jacket stroke={strokeColor} size={sz} />
            </div>
          </motion.div>
        );
      case "heavy_jacket":
        return (
          <motion.div {...ITEM_ANIM} transition={{ delay: 0 }}>
            <Jacket stroke={strokeColor} size={sz} />
          </motion.div>
        );
      case "heavy_coat":
        return (
          <motion.div {...ITEM_ANIM} transition={{ delay: 0 }}>
            <HeavyCoat stroke={strokeColor} size={sz} />
          </motion.div>
        );
      case "rain_light":
      case "rain_heavy":
        return (
          <motion.div {...ITEM_ANIM} transition={{ delay: 0 }}>
            <RainJacket stroke={strokeColor} size={sz} rainActive={rainGear} />
          </motion.div>
        );
    }
  })();

  const bottomGarment =
    outfit === "shorts_tshirt" ? (
      <motion.div {...ITEM_ANIM} transition={{ delay: 1 * STAGGER }}>
        <Shorts stroke={strokeColor} size={sz} />
      </motion.div>
    ) : (
      <motion.div {...ITEM_ANIM} transition={{ delay: 1 * STAGGER }}>
        <Pants stroke={strokeColor} size={sz} />
      </motion.div>
    );

  // Accessories — always render sneakers, inject others dynamically
  const accessories = [
    <motion.div key="shoes" {...ITEM_ANIM} transition={{ delay: 2 * STAGGER }}>
      <Sneakers stroke={strokeColor} size={accSz} />
    </motion.div>,
  ];

  if (umbrella) {
    accessories.push(
      <motion.div key="umbrella" {...ITEM_ANIM} transition={{ delay: 3 * STAGGER }}>
        <Umbrella stroke={strokeColor} size={accSz} rainActive />
      </motion.div>
    );
  }
  if (sunglasses) {
    accessories.push(
      <motion.div key="sunglasses" {...ITEM_ANIM} transition={{ delay: 4 * STAGGER }}>
        <Sunglasses stroke={strokeColor} size={accSz} />
      </motion.div>
    );
  }
  if (scarf) {
    accessories.push(
      <motion.div key="scarf" {...ITEM_ANIM} transition={{ delay: 5 * STAGGER }}>
        <Scarf stroke={strokeColor} size={accSz} />
      </motion.div>
    );
  }
  if (beanie) {
    accessories.push(
      <motion.div key="beanie" {...ITEM_ANIM} transition={{ delay: 6 * STAGGER }}>
        <Beanie stroke={strokeColor} size={accSz} />
      </motion.div>
    );
  }

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

      {/* Bottom zone – two column */}
      <div className="grid grid-cols-2 gap-3">
        {/* Bottom garment */}
        <AnimatePresence mode="wait">
          <motion.div key={`btm-${outfit}`} className="flex justify-center items-center">
            {bottomGarment}
          </motion.div>
        </AnimatePresence>

        {/* Accessories grid */}
        <div className="flex flex-wrap gap-2 justify-center items-start content-start">
          <AnimatePresence>{accessories}</AnimatePresence>
        </div>
      </div>
    </div>
  );
}
