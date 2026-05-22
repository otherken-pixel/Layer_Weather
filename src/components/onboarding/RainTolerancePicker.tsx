import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { RainTolerance } from "@/types";

const OPTIONS: Array<{
  value: RainTolerance;
  emoji: string;
  title: string;
  sub: string;
}> = [
  { value: "low", emoji: "☂️", title: "Avoid rain", sub: "Umbrella at the first drop — I'd rather stay dry" },
  { value: "moderate", emoji: "🌦️", title: "Moderate", sub: "Rain gear when it's actually raining" },
  { value: "high", emoji: "🌧️", title: "Don't mind rain", sub: "A little rain won't change my outfit much" },
];

interface RainTolerancePickerProps {
  value: RainTolerance;
  onChange: (v: RainTolerance) => void;
}

export function RainTolerancePicker({ value, onChange }: RainTolerancePickerProps) {
  const active = OPTIONS.find((o) => o.value === value) ?? OPTIONS[1];

  return (
    <div className="flex flex-col items-center w-full gap-4">
      <AnimatePresence mode="wait">
        <motion.span
          key={value}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="text-7xl leading-none"
        >
          {active.emoji}
        </motion.span>
      </AnimatePresence>

      <div className="text-center">
        <p className="text-2xl font-black text-white">{active.title}</p>
        <p className="text-sm mt-1 max-w-xs mx-auto" style={{ color: "rgba(255,255,255,0.65)" }}>
          {active.sub}
        </p>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-sm mt-2">
        {OPTIONS.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className="w-full text-left rounded-2xl px-4 py-3 border-0 cursor-pointer transition-colors"
              style={{
                background: selected ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)",
                border: selected ? "1px solid rgba(255,255,255,0.45)" : "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <span className="text-base font-bold text-white">
                {opt.emoji} {opt.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
