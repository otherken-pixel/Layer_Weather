import React, { useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import OutfitFlatLay from "@/components/outfit/OutfitFlatLay";
import { resolveFootwearForScenario } from "@/lib/outfit-logic";
import type { CalibrationScenario, SwipeDirection, OutfitType } from "@/types";

const SWIPE_THRESHOLD = 80;

interface ScenarioWithAccessories extends CalibrationScenario {
  sunglasses?: boolean;
  beanie?: boolean;
  scarf?: boolean;
  gloves?: boolean;
}

const SCENARIOS: ScenarioWithAccessories[] = [
  { id: "hot",  temp: 85, outfit: "shorts_tshirt", description: "85°F — sunny afternoon",  sunglasses: true },
  { id: "warm", temp: 74, outfit: "pants_longsleeve", description: "74°F — comfortable day" },
  { id: "mild", temp: 64, outfit: "light_jacket",  description: "64°F — breezy morning" },
  { id: "cool", temp: 52, outfit: "heavy_jacket",  description: "52°F — grey afternoon" },
  { id: "cold", temp: 38, outfit: "heavy_coat",    description: "38°F — cold winter day",  beanie: true, scarf: true, gloves: true },
];

function isRainOutfit(outfit: OutfitType) {
  return outfit === "rain_light" || outfit === "rain_heavy";
}

interface SwipeCalibrationProps {
  onComplete: (swipes: Array<{ temp: number; direction: SwipeDirection }>) => void;
}

export function SwipeCalibration({ onComplete }: SwipeCalibrationProps) {
  const [index, setIndex] = useState(0);
  const [swipes, setSwipes] = useState<Array<{ temp: number; direction: SwipeDirection }>>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12]);
  const leftOpacity = useTransform(x, [-160, -50, 0], [1, 0.3, 0]);
  const rightOpacity = useTransform(x, [0, 50, 160], [0, 0.3, 1]);
  const cardScale = useTransform(x, [-200, 0, 200], [0.97, 1, 0.97]);
  const cardOpacity = useMotionValue(1);

  function handleSwipe(dir: SwipeDirection) {
    if (isAnimating) return;
    setIsAnimating(true);

    const scenario = SCENARIOS[index];
    const next = [...swipes, { temp: scenario.temp, direction: dir }];
    setSwipes(next);

    if (dir === "center") {
      animate(cardOpacity, 0, { duration: 0.2 });
    } else {
      x.set(dir === "left" ? -400 : 400);
    }

    setTimeout(() => {
      cardOpacity.set(1);
      if (index + 1 >= SCENARIOS.length) {
        onComplete(next);
      } else {
        setIndex((i) => i + 1);
        animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
      }
      setIsAnimating(false);
    }, 220);
  }

  const scenario = SCENARIOS[index];
  const nextScenario = SCENARIOS[index + 1];

  return (
    <div className="flex flex-col items-center w-full gap-5">
      {/* Header */}
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.55)" }}>
          {index + 1} of {SCENARIOS.length}
        </p>
        <h2 className="text-3xl font-black text-white" style={{ letterSpacing: "-0.02em" }}>
          How does this feel?
        </h2>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
          Swipe left if cold · tap if just right · swipe right if warm
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 items-center">
        {SCENARIOS.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i === index ? 20 : 6,
              backgroundColor:
                i < index
                  ? "rgba(255,255,255,0.65)"
                  : i === index
                  ? "white"
                  : "rgba(255,255,255,0.2)",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="h-1.5 rounded-full"
          />
        ))}
      </div>

      {/* Card stack */}
      <div
        className="relative w-full"
        style={{ maxWidth: 340, minHeight: 380 }}
      >
        {/* Background card (next scenario peek) */}
        {nextScenario && (
          <div
            className="absolute inset-0 rounded-3xl flex flex-col items-center justify-center p-5"
            style={{
              background: "rgba(15,25,45,0.70)",
              border: "1px solid rgba(255,255,255,0.10)",
              transform: "scale(0.93) translateY(14px)",
              opacity: 0.6,
            }}
          >
            <div
              className="rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.08)", padding: 16, opacity: 0.5 }}
            >
              <OutfitFlatLay
                outfit={nextScenario.outfit}
                rainGear={isRainOutfit(nextScenario.outfit)}
                umbrella={false}
                sunglasses={nextScenario.sunglasses ?? false}
                scarf={nextScenario.scarf ?? false}
                beanie={nextScenario.beanie ?? false}
                gloves={nextScenario.gloves ?? false}
                footwear={resolveFootwearForScenario(nextScenario.temp, nextScenario.outfit)}
                compact
              />
            </div>
          </div>
        )}

        {/* Active swipe card */}
        <motion.div
          key={scenario.id}
          drag="x"
          dragConstraints={{ left: -120, right: 120 }}
          dragElastic={0.15}
          dragMomentum={false}
          style={{
            x,
            rotate,
            scale: cardScale,
            opacity: cardOpacity,
            width: "100%",
            minHeight: 360,
            position: "relative",
            zIndex: 1,
            background: "rgba(15,25,45,0.95)",
            borderColor: "rgba(255,255,255,0.12)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
            touchAction: "none",
          }}
          onDragEnd={(_, info) => {
            if (info.offset.x > SWIPE_THRESHOLD) handleSwipe("right");
            else if (info.offset.x < -SWIPE_THRESHOLD) handleSwipe("left");
            else if (Math.abs(info.offset.x) < 8 && Math.abs(info.velocity.x) < 120) {
              handleSwipe("center");
            } else {
              animate(x, 0, { type: "spring", stiffness: 350, damping: 28 });
            }
          }}
          aria-live="polite"
          aria-label={`${scenario.temp} degrees, ${scenario.description}`}
          className="rounded-3xl border flex flex-col items-stretch p-5 swipe-card overflow-hidden"
        >
          {/* Swipe direction labels — animate on drag */}
          <motion.div className="relative w-full flex justify-between items-start shrink-0" style={{ minHeight: 36 }}>
            <motion.div
              style={{ opacity: leftOpacity, background: "rgba(59,130,246,0.2)", border: "1px solid rgba(147,197,253,0.5)" }}
              className="px-3 py-2 rounded-xl"
            >
              <span className="text-sm font-bold text-white">🥶 Too Cold</span>
            </motion.div>
            <motion.div
              style={{ opacity: rightOpacity, background: "rgba(239,68,68,0.2)", border: "1px solid rgba(252,165,165,0.5)" }}
              className="px-3 py-2 rounded-xl"
            >
              <span className="text-sm font-bold text-white">🔥 Too Warm</span>
            </motion.div>
          </motion.div>

          {/* Temperature + description — above icons so it won't overlap buttons */}
          <div className="text-center w-full shrink-0 py-2">
            <p className="text-3xl font-black text-white leading-none" style={{ letterSpacing: "-0.04em" }}>
              {scenario.temp}°
            </p>
            <p className="text-xs mt-1 truncate px-2" style={{ color: "rgba(255,255,255,0.6)" }}>
              {scenario.description}
            </p>
          </div>

          {/* Icon area — grows with card height so flat lay can use available space */}
          <div
            className="w-full rounded-2xl flex flex-1 min-h-0 items-center justify-center overflow-hidden"
            style={{
              background: "#F0F2F6",
              padding: "14px 12px",
              minHeight: 200,
            }}
          >
            <OutfitFlatLay
              outfit={scenario.outfit}
              rainGear={isRainOutfit(scenario.outfit)}
              umbrella={false}
              sunglasses={scenario.sunglasses ?? false}
              scarf={scenario.scarf ?? false}
              beanie={scenario.beanie ?? false}
              gloves={scenario.gloves ?? false}
              footwear={resolveFootwearForScenario(scenario.temp, scenario.outfit)}
              compact
            />
          </div>
        </motion.div>
      </div>

      {/* Button row */}
      <div className="flex gap-2 w-full">
        <button
          type="button"
          onClick={() => handleSwipe("left")}
          className="flex-1 min-h-[44px] py-3.5 rounded-2xl text-sm font-bold text-white transition-opacity active:opacity-70"
          style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(147,197,253,0.4)" }}
        >
          🥶 Too Cold
        </button>
        <button
          type="button"
          onClick={() => handleSwipe("center")}
          className="flex-1 min-h-[44px] py-3.5 rounded-2xl text-sm font-bold text-white transition-opacity active:opacity-70"
          style={{ background: "rgba(52,199,89,0.18)", border: "1px solid rgba(134,239,172,0.45)" }}
        >
          ✅ Just Right
        </button>
        <button
          type="button"
          onClick={() => handleSwipe("right")}
          className="flex-1 min-h-[44px] py-3.5 rounded-2xl text-sm font-bold text-white transition-opacity active:opacity-70"
          style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(252,165,165,0.4)" }}
        >
          🔥 Too Warm
        </button>
      </div>
    </div>
  );
}
