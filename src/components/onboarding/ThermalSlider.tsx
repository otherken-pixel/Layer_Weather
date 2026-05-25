import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ThermalSensitivity } from "@/types";

const LABELS: Array<{ emoji: string; text: string; sub: string }> = [
  { emoji: "🥶", text: "Always Freezing", sub: "You're the one cranking the heat up" },
  { emoji: "😬", text: "Runs Cold", sub: "Usually reach for a layer first" },
  { emoji: "😌", text: "Just Right", sub: "Pretty average temperature tolerance" },
  { emoji: "😅", text: "Runs Warm", sub: "You're first to complain it's stuffy" },
  { emoji: "🔥", text: "Always Hot", sub: "You're the one secretly turning the AC up" },
];

interface ThermalSliderProps {
  value: ThermalSensitivity;
  onChange: (v: ThermalSensitivity) => void;
}

export function ThermalSlider({ value, onChange }: ThermalSliderProps) {
  const info = LABELS[value + 2];

  return (
    <div className="flex flex-col items-center py-6 w-full gap-4">
      <AnimatePresence mode="wait">
        <motion.span
          key={value}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="text-7xl leading-none"
        >
          {info.emoji}
        </motion.span>
      </AnimatePresence>

      <div className="text-center">
        <p className="text-2xl font-black text-white">{info.text}</p>
        <p className="text-sm mt-1 max-w-xs" style={{ color: "rgba(255,255,255,0.65)" }}>{info.sub}</p>
      </div>

      {/* Slider */}
      <div className="flex items-center gap-3 w-full px-2 mt-4 min-h-[44px]">
        <span className="text-2xl">🥶</span>
        <input
          type="range"
          min={-2}
          max={2}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) as ThermalSensitivity)}
          className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--accent-light) 0%, var(--accent-light) ${((value + 2) / 4) * 100}%, rgba(255,255,255,0.2) ${((value + 2) / 4) * 100}%, rgba(255,255,255,0.2) 100%)`,
            accentColor: "var(--accent-primary)",
          }}
        />
        <span className="text-2xl">🔥</span>
      </div>

      {/* Tick marks */}
      <div className="flex gap-8">
        {([-2, -1, 0, 1, 2] as ThermalSensitivity[]).map((v) => (
          <motion.div
            key={v}
            animate={{ scale: v === value ? 1.6 : 1, backgroundColor: v === value ? "white" : "rgba(255,255,255,0.25)" }}
            className="w-1.5 h-1.5 rounded-full"
          />
        ))}
      </div>
    </div>
  );
}
