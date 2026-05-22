import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { SwipeCalibration } from "@/components/onboarding/SwipeCalibration";
import { ThermalSlider } from "@/components/onboarding/ThermalSlider";
import { Button } from "@/components/ui/Button";
import { WeatherAvatar } from "@/components/avatar/WeatherAvatar";
import { upsertCalibration, upsertProfile } from "@/lib/supabase";
import { computeCalibrationFromSwipes } from "@/lib/outfit-logic";
import { useAppStore } from "@/store";
import type { ThermalSensitivity, SwipeDirection, UserCalibration } from "@/types";

const CALIBRATION_PENDING_KEY = "wt_calibration_pending";

type Step = "welcome" | "swipe" | "thermal" | "location" | "done";
const STEPS: Step[] = ["welcome", "swipe", "thermal", "location", "done"];

const GRADIENTS: Record<Step, string> = {
  welcome:  "linear-gradient(135deg,#6C63FF,#43B0F1)",
  swipe:    "linear-gradient(135deg,#FF6584,#6C63FF)",
  thermal:  "linear-gradient(135deg,#FA709A,#6C63FF)",
  location: "linear-gradient(135deg,#0F2027,#203A43)",
  done:     "linear-gradient(135deg,#56ab2f,#a8e063)",
};

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function requestBrowserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  if (!navigator.geolocation) return null;
  return withTimeout(
    new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
      );
    }),
    22000,
    null
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { userId, setCalibration, setIsOnboarded, setLocation } = useAppStore();
  const [step, setStep] = useState<Step>("welcome");
  const [swipeResults, setSwipeResults] = useState<{ temp: number; direction: SwipeDirection }[]>([]);
  const [thermal, setThermal] = useState<ThermalSensitivity>(0);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [error, setError] = useState("");

  const stepIdx = STEPS.indexOf(step);
  const progress = ((stepIdx + 1) / (STEPS.length - 1)) * 100;

  function next() { setStep(STEPS[stepIdx + 1]); }

  async function handleFinish() {
    setLoading(true); setError(""); setLoadingStatus("Getting your location…");
    try {
      // 1. Get location with generous timeout — iOS GPS can be slow on first fix
      let coords: { latitude: number; longitude: number } | null = null;
      if (Capacitor.isNativePlatform()) {
        const { location: perm } = await Geolocation.requestPermissions();
        if (perm === "granted") {
          const pos = await withTimeout(
            Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 20000 }),
            22000,
            null
          );
          if (pos) coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        }
      } else {
        coords = await requestBrowserLocation();
      }
      if (coords) {
        setLocation({ ...coords, city: "", region: "", country: "" });
      }

      // 2. Save calibration — non-fatal with pending flag for retry on next session
      setLoadingStatus("Saving preferences…");
      const derived = computeCalibrationFromSwipes(swipeResults);
      const payload = { ...derived, thermal_sensitivity: thermal, rain_tolerance: "moderate" as const, humidity_sensitivity: true };

      if (userId) {
        try {
          const saved = await withTimeout(upsertCalibration(userId, payload), 12000, null);
          if (saved) {
            setCalibration(saved);
            localStorage.removeItem(CALIBRATION_PENDING_KEY);
          } else {
            // Timed out — store locally and retry on next load
            localStorage.setItem(CALIBRATION_PENDING_KEY, JSON.stringify({ userId, payload }));
            setCalibration({ user_id: userId, ...payload, updated_at: new Date().toISOString() } as UserCalibration);
          }
          // Save location to profile (fire-and-forget, columns may not exist yet)
          if (coords) {
            upsertProfile(userId, { last_latitude: coords.latitude, last_longitude: coords.longitude }).catch(() => {});
          }
        } catch {
          // Save failed — store locally and retry on next load
          localStorage.setItem(CALIBRATION_PENDING_KEY, JSON.stringify({ userId, payload }));
          setCalibration({ user_id: userId, ...payload, updated_at: new Date().toISOString() } as UserCalibration);
        }
      }

      setIsOnboarded(true);
      setStep("done");
    } catch (err) {
      console.error("Onboarding finish error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      setLoadingStatus("");
    }
  }

  return (
    <motion.div
      key={step}
      initial={{ background: GRADIENTS[step] }}
      animate={{ background: GRADIENTS[step] }}
      transition={{ duration: 0.5 }}
      className="flex flex-col min-h-full px-6 py-8 pt-safe"
    >
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
              {loadingStatus && (
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{loadingStatus}</p>
              )}
              {error && <p className="text-red-300 text-sm">{error}</p>}
              <Button
                label={loading ? loadingStatus || "Working…" : "Allow Location Access"}
                onPress={handleFinish}
                loading={loading}
                variant="secondary"
                size="lg"
                fullWidth
              />
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
