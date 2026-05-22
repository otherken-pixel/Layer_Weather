import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { WeatherAvatar } from "@/components/avatar/WeatherAvatar";
import { Button } from "@/components/ui/Button";

export default function Welcome() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-8 py-12 pt-safe" style={{ background: "linear-gradient(135deg,#6C63FF,#43B0F1)" }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col items-center gap-8 w-full max-w-sm">
        <WeatherAvatar outfit="light_jacket" condition="sunny" size={220} />
        <div className="text-center">
          <h1 className="text-5xl font-black text-white leading-tight" style={{ letterSpacing: "-1px" }}>WearToday</h1>
          <p className="text-lg mt-3 leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>
            Stop guessing what to wear. Let the weather decide.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full">
          <Button label="Create Account" onPress={() => navigate("/register")} variant="secondary" size="lg" fullWidth />
          <Button label="Sign In" onPress={() => navigate("/login")} variant="ghost" size="lg" fullWidth />
        </div>
      </motion.div>
    </div>
  );
}
