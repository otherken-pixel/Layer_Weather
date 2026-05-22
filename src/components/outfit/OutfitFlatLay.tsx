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
  colorScheme?: "dark" | "light";
  compact?: boolean;
}

const ITEM_ANIM = {
  initial: { opacity: 0, scale: 0.75 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.75 },
};

const STAGGER = 0.06;

function FootwearIcon({ kind, className }: { kind: FootwearKind; className: string }) {
  switch (kind) {
    case "flip_flops":
      return <FlipFlops className={className} />;
    case "sneakers":
      return <Sneakers className={className} />;
    case "snow_boots":
      return <SnowBoots className={className} />;
    case "rain_boots":
      return <RainBoots className={className} />;
  }
}

export default function OutfitFlatLay({
  outfit,
  umbrella,
  sunglasses,
  scarf,
  beanie,
  footwear = null,
  colorScheme = "light",
  compact = false,
}: Props) {
  const iconClass = colorScheme === "dark" ? "text-white/90" : "text-neutral-800";
  const garmentSize = compact ? "min(72px, 22vw)" : "min(100px, 28vw)";
  const accessorySize = compact ? "min(52px, 16vw)" : "min(72px, 20vw)";

  const wrap = (node: React.ReactNode, delay: number, size: string) => (
    <motion.div {...ITEM_ANIM} transition={{ delay }} style={{ width: size, height: size }}>
      {node}
    </motion.div>
  );

  const topGarment = (() => {
    switch (outfit) {
      case "shorts_tshirt":
        return wrap(<TShirt className={`w-full h-full ${iconClass}`} />, 0 * STAGGER, garmentSize);
      case "pants_tshirt":
        return wrap(<LongSleeve className={`w-full h-full ${iconClass}`} />, 0 * STAGGER, garmentSize);
      case "light_jacket":
        return wrap(<Jacket className={`w-full h-full ${iconClass}`} />, 0, garmentSize);
      case "heavy_jacket":
        return wrap(<HeavyJacket className={`w-full h-full ${iconClass}`} />, 0, garmentSize);
      case "heavy_coat":
        return wrap(<HeavyCoat className={`w-full h-full ${iconClass}`} />, 0, garmentSize);
      case "rain_light":
      case "rain_heavy":
        return wrap(<RainJacket className={`w-full h-full ${iconClass}`} />, 0, garmentSize);
    }
  })();

  const bottomGarment =
    outfit === "shorts_tshirt"
      ? wrap(<Shorts className={`w-full h-full ${iconClass}`} />, 1 * STAGGER, garmentSize)
      : wrap(<Pants className={`w-full h-full ${iconClass}`} />, 1 * STAGGER, garmentSize);

  const accessories: React.ReactNode[] = [];
  let delay = 2;

  if (footwear) {
    accessories.push(
      wrap(
        <FootwearIcon kind={footwear} className={`w-full h-full ${iconClass}`} />,
        delay * STAGGER,
        accessorySize,
      ),
    );
    delay += 1;
  }

  if (umbrella) {
    accessories.push(
      wrap(<Umbrella className={`w-full h-full ${iconClass}`} />, delay * STAGGER, accessorySize),
    );
    delay += 1;
  }
  if (sunglasses) {
    accessories.push(
      wrap(<Sunglasses className={`w-full h-full ${iconClass}`} />, delay * STAGGER, accessorySize),
    );
    delay += 1;
  }
  if (scarf) {
    accessories.push(
      wrap(<Scarf className={`w-full h-full ${iconClass}`} />, delay * STAGGER, accessorySize),
    );
    delay += 1;
  }
  if (beanie) {
    accessories.push(
      wrap(<Beanie className={`w-full h-full ${iconClass}`} />, delay * STAGGER, accessorySize),
    );
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
