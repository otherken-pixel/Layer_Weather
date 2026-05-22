import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { SwipeCalibration } from "@/components/onboarding/SwipeCalibration";
import { ThermalSlider } from "@/components/onboarding/ThermalSlider";
import { RainTolerancePicker } from "@/components/onboarding/RainTolerancePicker";
import { Button } from "@/components/ui/Button";
import OutfitFlatLay from "@/components/outfit/OutfitFlatLay";
import { upsertCalibration } from "@/lib/supabase";
import { computeCalibrationFromSwipes, resolveFootwearForScenario } from "@/lib/outfit-logic";
import { useSaveLocation } from "@/hooks/useSaveLocation";
import { useAppStore } from "@/store";
import type { ThermalSensitivity, SwipeDirection, UserCalibration, RainTolerance } from "@/types";

const CALIBRATION_PENDING_KEY = "wt_calibration_pending";
const IS_ONBOARDED_KEY = "wt_is_onboarded";

type Step = "welcome" | "swipe" | "thermal" | "rain" | "location" | "done";
const FIRST_TIME_STEPS: Step[] = ["welcome", "swipe", "thermal", "rain", "location", "done"];
const RECALIBRATE_STEPS: Step[] = ["swipe", "thermal", "rain", "done"];

const GRADIENTS: Record<Step, string> = {
  welcome:  "linear-gradient(160deg,#2E2550,#4A3F6B)",
  swipe:    "linear-gradient(160deg,#2E3F58,#4A5E78)",
  thermal:  "linear-gradient(160deg,#4A5E78,#5B9BD5)",
  rain:     "linear-gradient(160deg,#3A6E8E,#5B9BD5)",
  location: "linear-gradient(160deg,#3A8EE6,#5B9BD5)",
  done:     "linear-gradient(160deg,#2D6A4F,#52B788)",
};

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { userId, calibration, setCalibration, setIsOnboarded } = useAppStore();
  const { saveFromCity, saveFromDevice, saving: locationSaving } = useSaveLocation();

  const [isRecalibration] = useState(calibration !== null);
  const ACTIVE_STEPS = isRecalibration ? RECALIBRATE_STEPS : FIRST_TIME_STEPS;

  const [step, setStep] = useState<Step>(ACTIVE_STEPS[0]);
  const [swipeResults, setSwipeResults] = useState<{ temp: number; direction: SwipeDirection }[]>([]);
  const [thermal, setThermal] = useState<ThermalSensitivity>(calibration?.thermal_sensitivity ?? 0);
  const [rainTolerance, setRainTolerance] = useState<RainTolerance>(calibration?.rain_tolerance ?? "moderate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [manualCity, setManualCity] = useState("");

  const stepIdx = ACTIVE_STEPS.indexOf(step);
  const progress = ((stepIdx + 1) / (ACTIVE_STEPS.length - 1)) * 100;

  function next() {
    setStep(ACTIVE_STEPS[stepIdx + 1]);
  }

  async function saveCalibrationToProfile(): Promise<boolean> {
    const derived = computeCalibrationFromSwipes(swipeResults);
    const payload = {
      ...derived,
      thermal_sensitivity: thermal,
      rain_tolerance: rainTolerance,
      humidity_sensitivity: calibration?.humidity_sensitivity ?? true,
    };

    if (!userId) {
      setCalibration({ user_id: "", ...payload, updated_at: new Date().toISOString() } as UserCalibration);
      return true;
    }

    try {
      const saved = await withTimeout(upsertCalibration(userId, payload), 12000, null);
      if (saved) {
        setCalibration(saved);
        localStorage.removeItem(CALIBRATION_PENDING_KEY);
        localStorage.setItem(IS_ONBOARDED_KEY, "1");
        setIsOnboarded(true);
        return true;
      }
      localStorage.setItem(CALIBRATION_PENDING_KEY, JSON.stringify({ userId, payload }));
      localStorage.setItem(IS_ONBOARDED_KEY, "1");
      setCalibration({ user_id: userId, ...payload, updated_at: new Date().toISOString() } as UserCalibration);
      setIsOnboarded(true);
      return true;
    } catch {
      localStorage.setItem(CALIBRATION_PENDING_KEY, JSON.stringify({ userId, payload }));
      localStorage.setItem(IS_ONBOARDED_KEY, "1");
      setCalibration({ user_id: userId, ...payload, updated_at: new Date().toISOString() } as UserCalibration);
      setIsOnboarded(true);
      return true;
    }
  }

  async function handleRainContinue() {
    setLoading(true);
    setError("");
    const ok = await saveCalibrationToProfile();
    setLoading(false);
    if (!ok) {
      setError("Could not save preferences. Please try again.");
      return;
    }
    if (isRecalibration) {
      setStep("done");
    } else {
      next();
    }
  }

  async function handleLocationFinish(useGps: boolean) {
    setLoading(true);
    setError("");
    const result = useGps ? await saveFromDevice() : await saveFromCity(manualCity);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setStep("done");
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
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
            <motion.div className="h-full rounded-full bg-white" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
          </div>
          {isRecalibration && (
            <button
              type="button"
              onClick={() => navigate("/app/settings")}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-white flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.15)", fontSize: 18 }}
              aria-label="Cancel recalibration"
            >
              ✕
            </button>
          )}
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
              <div className="flex flex-col items-center gap-3">
                <span style={{ fontSize: 56 }}>🌤️</span>
                <div
                  className="rounded-3xl p-5"
                  style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)" }}
                >
                  <OutfitFlatLay
                    outfit="light_jacket"
                    rainGear={false}
                    umbrella={false}
                    sunglasses={false}
                    scarf={false}
                    beanie={false}
                    footwear={resolveFootwearForScenario(64, "light_jacket")}
                    colorScheme="dark"
                  />
                </div>
              </div>
              <div className="text-center">
                <h1 className="text-4xl font-black text-white leading-tight">Let's calibrate{"\n"}your WearToday</h1>
                <p className="text-base mt-3 max-w-[260px] mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
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
                <h2 className="text-3xl font-black text-white">How do you run?</h2>
                <p className="text-base mt-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                  In general, do you tend to feel hot or cold?
                </p>
              </div>
              <ThermalSlider value={thermal} onChange={setThermal} />
              <Button label="Continue →" onPress={next} variant="secondary" size="lg" fullWidth />
            </div>
          )}

          {step === "rain" && (
            <div className="flex flex-col items-center gap-6 w-full">
              <div className="text-center">
                <h2 className="text-3xl font-black text-white">Rain tolerance</h2>
                <p className="text-base mt-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                  How much does rain change what you wear?
                </p>
              </div>
              <RainTolerancePicker value={rainTolerance} onChange={setRainTolerance} />
              {error && <p className="text-red-300 text-sm">{error}</p>}
              <Button
                label={loading ? "Saving…" : "Continue →"}
                onPress={handleRainContinue}
                loading={loading}
                variant="secondary"
                size="lg"
                fullWidth
              />
            </div>
          )}

          {step === "location" && (
            <div className="flex flex-col items-center text-center gap-6 max-w-xs w-full">
              <span className="text-8xl">📍</span>
              <div>
                <h2 className="text-3xl font-black text-white">Your location</h2>
                <p className="text-base mt-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
                  WearToday needs your location for local weather and radar. You can change this anytime on Today.
                </p>
              </div>
              <input
                type="text"
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                placeholder="Or enter your city"
                className="w-full rounded-2xl px-4 py-3 text-base font-semibold text-white"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  outline: "none",
                }}
              />
              {error && <p className="text-red-300 text-sm">{error}</p>}
              <Button
                label={loading || locationSaving ? "Working…" : "Use current location"}
                onPress={() => handleLocationFinish(true)}
                loading={loading || locationSaving}
                variant="secondary"
                size="lg"
                fullWidth
              />
              <button
                type="button"
                disabled={loading || locationSaving || !manualCity.trim()}
                onClick={() => handleLocationFinish(false)}
                className="w-full py-3 rounded-2xl text-sm font-bold text-white"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  opacity: loading || locationSaving || !manualCity.trim() ? 0.5 : 1,
                }}
              >
                Use city instead
              </button>
              <button
                type="button"
                onClick={() => setStep("done")}
                className="text-sm font-semibold"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                Skip for now
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center text-center gap-6 max-w-xs">
              <div className="flex flex-col items-center gap-3">
                <span style={{ fontSize: 56 }}>{isRecalibration ? "🎯" : "☀️"}</span>
                <div
                  className="rounded-3xl p-5"
                  style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)" }}
                >
                  <OutfitFlatLay
                    outfit="shorts_tshirt"
                    rainGear={false}
                    umbrella={false}
                    sunglasses={true}
                    scarf={false}
                    beanie={false}
                    footwear={resolveFootwearForScenario(85, "shorts_tshirt")}
                    colorScheme="dark"
                  />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-black text-white">
                  {isRecalibration ? "Preferences updated!" : "You're all set! ☀️"}
                </h1>
                <p className="text-base mt-3 max-w-[240px] mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>
                  {isRecalibration
                    ? "Your outfit preferences have been updated."
                    : "WearToday is calibrated to your comfort. Let's see what to wear."}
                </p>
              </div>
              <Button
                label={isRecalibration ? "Back to Settings" : "See Today's Outfit →"}
                onPress={() => navigate(isRecalibration ? "/app/settings" : "/app/home")}
                variant="secondary"
                size="lg"
                fullWidth
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
