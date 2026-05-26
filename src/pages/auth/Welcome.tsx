import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import Logo from "@/components/ui/Logo";

const FEATURE_ITEMS = [
  { icon: "🌡️", text: "Feels-Like temperature, not just actual" },
  { icon: "🧥", text: "Outfit updated when weather changes" },
  { icon: "🚶", text: "Commute alerts for temperature swings" },
  { icon: "🧳", text: "Travel packing lists in seconds" },
];

export default function Welcome() {
  const navigate = useNavigate();
  return (
    <div
      className="relative flex flex-col h-full overflow-hidden pt-safe"
      style={{ background: "linear-gradient(160deg, #1a1a2e 0%, #2d1b4e 55%, #162033 100%)" }}
    >
      {/* Background glow blobs */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 380,
          height: 380,
          background: "radial-gradient(circle, rgba(108,99,255,0.22) 0%, transparent 70%)",
          top: -120,
          left: -120,
        }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 280,
          height: 280,
          background: "radial-gradient(circle, rgba(0,122,255,0.15) 0%, transparent 70%)",
          bottom: 100,
          right: -80,
        }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* Content */}
      <div className="relative flex flex-col flex-1 items-center justify-center px-7 gap-10">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="flex flex-col items-center gap-7"
        >
          {/* Logo */}
          <Logo size={48} />

          {/* Headline */}
          <div className="text-center">
            <h1
              className="text-[2.75rem] font-black text-white leading-tight"
              style={{ letterSpacing: "-0.04em" }}
            >
              Stop guessing.<br />
              Dress with<br />
              confidence.
            </h1>
            <p className="text-base mt-4 leading-relaxed text-white/80">
              Layer Weather learns your exact temperature<br />
              comfort zone and recommends the perfect<br />
              outfit every single morning.
            </p>
          </div>
        </motion.div>

        {/* Feature list */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex flex-col gap-3 w-full"
        >
          {FEATURE_ITEMS.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.08 }}
              className="flex items-center gap-3"
            >
              <span
                className="w-9 h-9 flex items-center justify-center rounded-xl text-lg flex-shrink-0"
                style={{ background: "rgba(108,99,255,0.2)" }}
              >
                {item.icon}
              </span>
              <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>
                {item.text}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* CTA buttons */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.45 }}
        className="relative px-6 flex flex-col gap-3"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 40px)" }}
      >
        <Button label="Get Started — It's Free" onPress={() => navigate("/register")} variant="primary" size="lg" fullWidth />
        <Button label="I Already Have an Account" onPress={() => navigate("/login")} variant="secondary" size="lg" fullWidth />
      </motion.div>
    </div>
  );
}
