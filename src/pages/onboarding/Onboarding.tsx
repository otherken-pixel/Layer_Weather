import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { SwipeCalibration } from "@/components/onboarding/SwipeCalibration";
import { ThermalSlider } from "@/components/onboarding/ThermalSlider";
import { Button } from "@/components/ui/Button";
import { WeatherAvatar } from "@/components/avatar/WeatherAvatar";
import { upsertCalibration } from "@/lib/supabase";
import { computeCalibrationFromSwipes } from "@/lib/outfit-logic";
import { useAppStore } from "@/store";
import type { ThermalSensitivity, SwipeDirection } from "@/types";

type Step = "welcome" | "swipe" | "thermal" | "location" | "done";
const STEPS: Step[] = ["welcome", "swipe", "thermal", "location", "done"];

const GRADIENTS: Record<Step, string> = {
  welcome:  "linear-gradient(135deg,#6C63FF,#43B0F1)",
  swipe:    "linear-gradient(135deg,#FF6584,#6C63FF)",
  thermal:  "linear-gradient(135deg,#FA709A,#6C63FF)",
  location: "linear-gradient(135deg,#0F2027,#203A43)",
  done:     "linear-gradient(135deg,#56ab2f,#a8e063)",
};

async function requestBrowserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  if (!navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  });
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { userId, setCalibration, setIsOnboarded, setLocation } = useAppStore();
  const [step, setStep] = useState<Step>("welcome");
  const [swipeResults, setSwipeResults] = useState<{ temp: number; direction: SwipeDirection }[]>([]);
  const [thermal, setThermal] = useState<ThermalSensitivity>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const stepIdx = STEPS.indexOf(step);
  const progress = ((stepIdx + 1) / (STEPS.length - 1)) * 100;

  function next() { setStep(STEPS[stepIdx + 1]); }

  async function handleFinish() {
    setLoading(true); setError("");
    try {
      // 1. Get location — triggers browser permission dialog on web
      let coords: { latitude: number; longitude: number } | null = null;
      if (Capacitor.isNativePlatform()) {
        const { location: perm } = await Geolocation.requestPermissions();
        if (perm === "granted") {
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
          coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        }
      } else {
        coords = await requestBrowserLocation();
      }
      if (coords) {
        setLocation({ ...coords, city: "", region: "", country: "" });
      }

      // 2. Save calibration — non-fatal so location denial doesn't block the user
      const derived = computeCalibrationFromSwipes(swipeResults);
      const payload = { ...derived, thermal_sensitivity: thermal, rain_tolerance: "moderate" as const, humidity_sensitivity: true };
      if (userId) {
        try {
          const saved = await upsertCalibration(userId, payload);
          if (saved) setCalibration(saved);
        } catch (err) {
          console.error("Calibration save failed (non-fatal):", err);
        }
      }

      setIsOnboarded(true);
      setStep("done");
    } catch (err) {
      console.error("Onboarding finish error:", err);
      setError("Something went wrong. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <motion.div
      key={step}
      initial={{ background: GRADIENTS[step] }}
      animate={{ background: GRADIENTS[step] }}
      transition={{ duration: 0.5 }}
      className="flex flex-col min-h-full px-6 py-8 pt-safe"
    >
      {/* Progress bar */}
      {step !== "done" && (
        <div className="w-full h-1 rounded-full mb-6" style={{ background: "rgba(255,255,255,0.2)" }}>
          <motion.div className="h-full rounded-full bg-white" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col flex-1 items-center justify-center gap-6"
        >
          {step === "welcome" && (
            <>
              <WeatherAvatar outfit="light_jacket" condition="sunny" size={220} />
              <div className="text-center">
                <h1 className="text-4xl font-black text-white leading-tight">Let's calibrate{"\n"}your WearToday</h1>
                <p className="text-base mt-3 max-w-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
                  Answer a few quick questions so we can nail your outfit recommendations. Takes 60 seconds.
                </p>
              </div>
              <Button label="Let's go →" onPress={next} variant="secondary" size="lg" fullWidth />
            </>
          )}

          {step === "swipe" && (
            <SwipeCalibration onComplete={(s) => { setSwipeResults(s); next(); }} />
          )}

          {step === "thermal" && (
            <div className="flex flex-col items-center gap-6 w-full">
              <div className="text-center">
                <h2 className="text-3xl font-black text-white">One more thing…</h2>
                <p className="text-base mt-2" style={{ color: "rgba(255,255,255,0.7)" }}>In general, how do you tend to feel about temperature?</p>
              </div>
              <ThermalSlider value={thermal} onChange={setThermal} />
              <Button label="Continue →" onPress={next} variant="secondary" size="lg" fullWidth />
            </div>
          )}

          {step === "location" && (
            <div className="flex flex-col items-center text-center gap-6 max-w-xs">
              <span className="text-8xl">📍</span>
              <div>
                <h2 className="text-3xl font-black text-white">Your location</h2>
                <p className="text-base mt-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
                  WearToday needs your location to fetch local weather. We never store your precise coordinates.
                </p>
              </div>
              {error && <p className="text-red-300 text-sm">{error}</p>}
              <Button label="Allow Location Access" onPress={handleFinish} loading={loading} variant="secondary" size="lg" fullWidth />
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center text-center gap-6 max-w-xs">
              <WeatherAvatar outfit="shorts_tshirt" condition="sunny" sunglasses size={220} />
              <div>
                <h1 className="text-4xl font-black text-white">You're all set! ☀️</h1>
                <p className="text-base mt-3 leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>
                  WearToday is calibrated to your personal temperature comfort. Let's see what to wear.
                </p>
              </div>
              <Button label="See Today's Outfit →" onPress={() => navigate("/app/home")} variant="secondary" size="lg" fullWidth />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
