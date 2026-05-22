import React, { useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import OutfitFlatLay from "@/components/outfit/OutfitFlatLay";
import type { CalibrationScenario, SwipeDirection, OutfitType } from "@/types";

const SWIPE_THRESHOLD = 80;

const SCENARIOS: CalibrationScenario[] = [
  { id: "hot",  temp: 85, outfit: "shorts_tshirt", description: "85°F — sunny afternoon" },
  { id: "warm", temp: 74, outfit: "pants_tshirt",  description: "74°F — comfortable day" },
  { id: "mild", temp: 64, outfit: "light_jacket",  description: "64°F — breezy morning" },
  { id: "cool", temp: 52, outfit: "heavy_jacket",  description: "52°F — grey afternoon" },
  { id: "cold", temp: 38, outfit: "heavy_coat",    description: "38°F — cold winter day" },
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

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12]);
  const leftOpacity = useTransform(x, [-160, -50, 0], [1, 0.3, 0]);
  const rightOpacity = useTransform(x, [0, 50, 160], [0, 0.3, 1]);
  const cardScale = useTransform(x, [-200, 0, 200], [0.97, 1, 0.97]);

  function handleSwipe(dir: SwipeDirection) {
    const scenario = SCENARIOS[index];
    const next = [...swipes, { temp: scenario.temp, direction: dir }];
    setSwipes(next);
    x.set(dir === "left" ? -400 : 400);

    setTimeout(() => {
      if (index + 1 >= SCENARIOS.length) {
        onComplete(next);
      } else {
        setIndex((i) => i + 1);
        animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
      }
    }, 200);
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
          Swipe left if you'd be cold · swipe right if too warm
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
        className="relative flex items-center justify-center"
        style={{ width: "100%", maxWidth: 340, height: 340 }}
      >
        {/* Background card (next scenario) */}
        {nextScenario && (
          <div
            className="absolute inset-0 rounded-3xl flex flex-col items-center justify-center gap-3 p-5"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.2)",
              transform: "scale(0.93) translateY(14px)",
              opacity: 0.6,
            }}
          >
            <div style={{ opacity: 0.5 }}>
              <OutfitFlatLay
                outfit={nextScenario.outfit}
                rainGear={isRainOutfit(nextScenario.outfit)}
                umbrella={false}
                sunglasses={false}
                scarf={false}
                beanie={false}
                colorScheme="dark"
                compact
              />
            </div>
          </div>
        )}

        {/* Active swipe card */}
        <motion.div
          key={scenario.id}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.8}
          style={{
            x,
            rotate,
            scale: cardScale,
            width: "100%",
            height: 320,
            position: "absolute",
            background: "rgba(255,255,255,0.14)",
            borderColor: "rgba(255,255,255,0.28)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
          }}
          onDragEnd={(_, info) => {
            if (info.offset.x > SWIPE_THRESHOLD) handleSwipe("right");
            else if (info.offset.x < -SWIPE_THRESHOLD) handleSwipe("left");
            else animate(x, 0, { type: "spring", stiffness: 350, damping: 28 });
          }}
          className="rounded-3xl border flex flex-col items-center justify-center gap-4 p-5 swipe-card"
        >
          {/* Swipe direction labels */}
          <motion.div
            style={{ opacity: leftOpacity, background: "rgba(59,130,246,0.2)", border: "1px solid rgba(147,197,253,0.5)" }}
            className="absolute top-4 left-4 px-3 py-2 rounded-xl"
          >
            <span className="text-sm font-bold text-white">🥶 Too Cold</span>
          </motion.div>
          <motion.div
            style={{ opacity: rightOpacity, background: "rgba(239,68,68,0.2)", border: "1px solid rgba(252,165,165,0.5)" }}
            className="absolute top-4 right-4 px-3 py-2 rounded-xl"
          >
            <span className="text-sm font-bold text-white">🔥 Too Warm</span>
          </motion.div>

          {/* Flat Lay outfit display */}
          <OutfitFlatLay
            outfit={scenario.outfit}
            rainGear={isRainOutfit(scenario.outfit)}
            umbrella={false}
            sunglasses={false}
            scarf={false}
            beanie={false}
            colorScheme="dark"
            compact
          />

          {/* Temperature + description */}
          <div className="text-center">
            <p className="text-4xl font-black text-white" style={{ letterSpacing: "-0.04em" }}>
              {scenario.temp}°
            </p>
            <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>
              {scenario.description}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Button row */}
      <div className="flex gap-4 w-full">
        <button
          onClick={() => handleSwipe("left")}
          className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white transition-opacity active:opacity-70"
          style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(147,197,253,0.4)" }}
        >
          🥶 Too Cold
        </button>
        <button
          onClick={() => handleSwipe("right")}
          className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-white transition-opacity active:opacity-70"
          style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(252,165,165,0.4)" }}
        >
          🔥 Too Warm
        </button>
      </div>
    </div>
  );
}
