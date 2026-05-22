import React, { useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { WeatherAvatar } from "@/components/avatar/WeatherAvatar";
import type { CalibrationScenario, SwipeDirection } from "@/types";

const SWIPE_THRESHOLD = 100;

const SCENARIOS: CalibrationScenario[] = [
  { id: "hot",  temp: 85, outfit: "shorts_tshirt", description: "85°F sunny afternoon" },
  { id: "warm", temp: 74, outfit: "pants_tshirt",  description: "74°F comfortable day" },
  { id: "mild", temp: 64, outfit: "light_jacket",  description: "64°F breezy morning" },
  { id: "cool", temp: 52, outfit: "heavy_jacket",  description: "52°F grey afternoon" },
  { id: "cold", temp: 38, outfit: "heavy_coat",    description: "38°F cold winter day" },
];

interface SwipeCalibrationProps {
  onComplete: (swipes: Array<{ temp: number; direction: SwipeDirection }>) => void;
}

export function SwipeCalibration({ onComplete }: SwipeCalibrationProps) {
  const [index, setIndex] = useState(0);
  const [swipes, setSwipes] = useState<Array<{ temp: number; direction: SwipeDirection }>>([]);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const leftOpacity = useTransform(x, [-150, -30, 0], [1, 0.2, 0]);
  const rightOpacity = useTransform(x, [0, 30, 150], [0, 0.2, 1]);

  function handleSwipe(dir: SwipeDirection) {
    const scenario = SCENARIOS[index];
    const next = [...swipes, { temp: scenario.temp, direction: dir }];
    setSwipes(next);

    if (index + 1 >= SCENARIOS.length) {
      onComplete(next);
    } else {
      setIndex((i) => i + 1);
      animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });
    }
  }

  const scenario = SCENARIOS[index];
  const nextScenario = SCENARIOS[index + 1];

  return (
    <div className="flex flex-col items-center w-full gap-4">
      {/* Header */}
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>
          {index + 1} / {SCENARIOS.length}
        </p>
        <h2 className="text-3xl font-black text-white">How does this feel?</h2>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>
          Swipe left if you'd be cold · right if warm enough
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2">
        {SCENARIOS.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i === index ? 24 : 8,
              backgroundColor: i < index ? "rgba(255,255,255,0.6)" : i === index ? "white" : "rgba(255,255,255,0.25)",
            }}
            className="h-2 rounded-full"
          />
        ))}
      </div>

      {/* Card stack */}
      <div className="relative flex items-center justify-center" style={{ width: "100%", maxWidth: 360, height: 380 }}>
        {/* Background card */}
        {nextScenario && (
          <div
            className="absolute inset-0 rounded-3xl border flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.25)",
              transform: "scale(0.94) translateY(16px)", opacity: 0.7,
            }}
          >
            <WeatherAvatar outfit={nextScenario.outfit} condition="sunny" size={160} />
          </div>
        )}

        {/* Active card */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          style={{ x, rotate, width: "100%", height: 360, position: "absolute", background: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.30)", boxShadow: "0 12px 40px rgba(0,0,0,0.3)" }}
          onDragEnd={(_, info) => {
            if (info.offset.x > SWIPE_THRESHOLD) handleSwipe("right");
            else if (info.offset.x < -SWIPE_THRESHOLD) handleSwipe("left");
            else animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });
          }}
          className="rounded-3xl border flex flex-col items-center justify-center gap-4 p-5 cursor-grab active:cursor-grabbing"
        >
          {/* Swipe labels */}
          <motion.div
            style={{ opacity: leftOpacity }}
            className="absolute top-6 left-5 px-3 py-2 rounded-xl border border-blue-300/60 bg-blue-400/10"
          >
            <span className="text-sm font-bold text-white">🥶 Too Cold</span>
          </motion.div>
          <motion.div
            style={{ opacity: rightOpacity }}
            className="absolute top-6 right-5 px-3 py-2 rounded-xl border border-green-300/60 bg-green-400/10"
          >
            <span className="text-sm font-bold text-white">😊 Feels Good</span>
          </motion.div>

          <WeatherAvatar outfit={scenario.outfit} condition="sunny" size={200} />

          <div className="text-center">
            <p className="text-5xl font-black text-white" style={{ letterSpacing: "-2px" }}>{scenario.temp}°</p>
            <p className="text-base mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>{scenario.description}</p>
          </div>
        </motion.div>
      </div>

      {/* Hint row */}
      <div className="flex justify-between w-full px-6">
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>← Too cold for me</span>
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Feels good! →</span>
      </div>
    </div>
  );
}
