import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { SwipeCalibration } from "@/components/onboarding/SwipeCalibration";
import { ThermalSlider } from "@/components/onboarding/ThermalSlider";
import { Button } from "@/components/ui/Button";
import OutfitFlatLay from "@/components/outfit/OutfitFlatLay";
import { upsertCalibration, upsertProfile } from "@/lib/supabase";
import { computeCalibrationFromSwipes, resolveFootwearForScenario } from "@/lib/outfit-logic";
import { geocodeCity } from "@/lib/location-search";
import { useAppStore } from "@/store";
import type { ThermalSensitivity, SwipeDirection, UserCalibration } from "@/types";

const CALIBRATION_PENDING_KEY = "wt_calibration_pending";

type Step = "welcome" | "swipe" | "thermal" | "location" | "done";
const STEPS: Step[] = ["welcome", "swipe", "thermal", "location", "done"];

const GRADIENTS: Record<Step, string> = {
  welcome:  "linear-gradient(160deg,#2E2550,#4A3F6B)",
  swipe:    "linear-gradient(160deg,#2E3F58,#4A5E78)",
  thermal:  "linear-gradient(160deg,#4A5E78,#5B9BD5)",
  location: "linear-gradient(160deg,#3A8EE6,#5B9BD5)",
  done:     "linear-gradient(160deg,#2D6A4F,#52B788)",
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
  const { userId, calibration, setCalibration, setIsOnboarded, setLocation } = useAppStore();

  // Lock in mode at mount — calibration may update during the flow so we can't derive this reactively
  const [isRecalibration] = useState(calibration !== null);
  const ACTIVE_STEPS: Step[] = isRecalibration
    ? ["swipe", "thermal", "location", "done"]
    : STEPS;

  const [step, setStep] = useState<Step>(ACTIVE_STEPS[0]);
  const [swipeResults, setSwipeResults] = useState<{ temp: number; direction: SwipeDirection }[]>([]);
  const [thermal, setThermal] = useState<ThermalSensitivity>(0);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [error, setError] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [useManualCity, setUseManualCity] = useState(false);

  const stepIdx = ACTIVE_STEPS.indexOf(step);
  const progress = ((stepIdx + 1) / (ACTIVE_STEPS.length - 1)) * 100;

  function next() { setStep(ACTIVE_STEPS[stepIdx + 1]); }

  async function handleFinish() {
    setLoading(true); setError(""); setLoadingStatus("Getting your location…");
    try {
      // 1. Get location — GPS, or manual city when permission denied / user opts in
      let coords: { latitude: number; longitude: number; city?: string } | null = null;

      if (useManualCity && manualCity.trim()) {
        setLoadingStatus("Looking up your city…");
        const place = await geocodeCity(manualCity);
        if (!place) {
          setError("City not found. Check the spelling and try again.");
          return;
        }
        coords = { latitude: place.latitude, longitude: place.longitude, city: place.city };
      } else if (Capacitor.isNativePlatform()) {
        const { location: perm } = await Geolocation.requestPermissions();
        if (perm === "granted") {
          const pos = await withTimeout(
            Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 20000 }),
            22000,
            null
          );
          if (pos) coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        } else if (manualCity.trim()) {
          const place = await geocodeCity(manualCity);
          if (place) coords = { latitude: place.latitude, longitude: place.longitude, city: place.city };
        }
      } else {
        coords = await requestBrowserLocation();
      }

      if (coords) {
        setLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
          city: coords.city ?? "",
          region: "",
          country: "",
        });
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
                <h2 className="text-3xl font-black text-white">One more thing…</h2>
                <p className="text-base mt-2" style={{ color: "rgba(255,255,255,0.7)" }}>In general, how do you tend to feel about temperature?</p>
              </div>
              <ThermalSlider value={thermal} onChange={setThermal} />
              <Button label="Continue →" onPress={next} variant="secondary" size="lg" fullWidth />
            </div>
          )}

          {step === "location" && (
            <div className="flex flex-col items-center text-center gap-6 max-w-xs w-full">
              <span className="text-8xl">📍</span>
              <div>
                <h2 className="text-3xl font-black text-white">Your location</h2>
                <p className="text-base mt-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
                  WearToday needs your location for local weather and radar.
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
              {loadingStatus && (
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{loadingStatus}</p>
              )}
              {error && <p className="text-red-300 text-sm">{error}</p>}
              <Button
                label={loading ? loadingStatus || "Working…" : "Allow Location Access"}
                onPress={() => { setUseManualCity(false); handleFinish(); }}
                loading={loading && !useManualCity}
                variant="secondary"
                size="lg"
                fullWidth
              />
              <button
                type="button"
                disabled={loading || !manualCity.trim()}
                onClick={() => { setUseManualCity(true); handleFinish(); }}
                className="w-full py-3 rounded-2xl text-sm font-bold text-white"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  opacity: loading || !manualCity.trim() ? 0.5 : 1,
                }}
              >
                Use city instead
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
                    ? "Your temperature profile has been recalibrated."
                    : "WearToday is calibrated to your personal temperature comfort. Let's see what to wear."}
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
