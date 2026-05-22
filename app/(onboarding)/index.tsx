import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";

import { SwipeCalibration } from "@/components/onboarding/SwipeCalibration";
import { ThermalSlider } from "@/components/onboarding/ThermalSlider";
import { Button } from "@/components/ui/Button";
import { WeatherAvatar } from "@/components/avatar/WeatherAvatar";

import { upsertCalibration, upsertProfile } from "@/lib/supabase";
import { computeCalibrationFromSwipes } from "@/lib/outfit-logic";
import { useAppStore } from "@/store";
import type { ThermalSensitivity } from "@/types";
import { Colors } from "@/constants/colors";

type Step = "welcome" | "swipe" | "thermal" | "commute" | "location" | "done";

const STEP_ORDER: Step[] = ["welcome", "swipe", "thermal", "location", "done"];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { userId, setCalibration, setIsOnboarded } = useAppStore();

  const [step, setStep] = useState<Step>("welcome");
  const [swipeResults, setSwipeResults] = useState<Array<{ temp: number; direction: "left" | "right" }>>([]);
  const [thermal, setThermal] = useState<ThermalSensitivity>(0);
  const [loading, setLoading] = useState(false);

  const currentIdx = STEP_ORDER.indexOf(step);

  function nextStep() {
    const next = STEP_ORDER[currentIdx + 1];
    if (next) setStep(next);
  }

  async function handleLocationAndFinish() {
    setLoading(true);
    try {
      await Location.requestForegroundPermissionsAsync();

      const swipeDerived = computeCalibrationFromSwipes(swipeResults);
      const calibrationPayload = {
        ...swipeDerived,
        thermal_sensitivity: thermal,
        rain_tolerance: "moderate" as const,
        humidity_sensitivity: true,
      };

      if (userId) {
        const saved = await upsertCalibration(userId, calibrationPayload);
        if (saved) {
          setCalibration(saved);
        }
      }

      setIsOnboarded(true);
      setStep("done");
    } catch (err) {
      Alert.alert("Error", "Could not save your preferences. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const gradients: Record<Step, [string, string]> = {
    welcome: ["#6C63FF", "#43B0F1"],
    swipe: ["#FF6584", "#6C63FF"],
    thermal: ["#FA709A", "#6C63FF"],
    commute: ["#4481EB", "#04BEFE"],
    location: ["#0F2027", "#203A43"],
    done: ["#56ab2f", "#a8e063"],
  };

  return (
    <LinearGradient
      colors={gradients[step]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      <View style={[styles.inner, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
        {/* Progress bar */}
        {step !== "done" && (
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentIdx + 1) / (STEP_ORDER.length - 1)) * 100}%` },
              ]}
            />
          </View>
        )}

        {/* STEP: Welcome */}
        {step === "welcome" && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.centered}>
            <WeatherAvatar outfit="light_jacket" condition="sunny" size={220} />
            <Text style={styles.bigTitle}>Let's calibrate{"\n"}your WearToday</Text>
            <Text style={styles.bigSubtitle}>
              Answer a few quick questions so we can nail your outfit recommendations. Takes 60 seconds.
            </Text>
            <Button label="Let's go →" onPress={nextStep} variant="secondary" size="lg" fullWidth />
          </Animated.View>
        )}

        {/* STEP: Swipe calibration */}
        {step === "swipe" && (
          <Animated.View entering={SlideInRight} exiting={SlideOutLeft} style={styles.fill}>
            <SwipeCalibration
              onComplete={(swipes) => {
                setSwipeResults(swipes);
                nextStep();
              }}
            />
          </Animated.View>
        )}

        {/* STEP: Thermal slider */}
        {step === "thermal" && (
          <Animated.View entering={SlideInRight} exiting={SlideOutLeft} style={styles.fill}>
            <Text style={styles.stepTitle}>One more thing…</Text>
            <Text style={styles.stepSubtitle}>
              In general, how do you tend to feel about temperature?
            </Text>
            <ThermalSlider value={thermal} onChange={setThermal} />
            <Button label="Continue →" onPress={nextStep} variant="secondary" size="lg" fullWidth />
          </Animated.View>
        )}

        {/* STEP: Location */}
        {step === "location" && (
          <Animated.View entering={SlideInRight} style={styles.centered}>
            <Text style={styles.locationEmoji}>📍</Text>
            <Text style={styles.stepTitle}>Your location</Text>
            <Text style={styles.stepSubtitle}>
              WearToday needs your location to fetch local weather. We never store your precise coordinates.
            </Text>
            <Button
              label="Allow Location Access"
              onPress={handleLocationAndFinish}
              loading={loading}
              variant="secondary"
              size="lg"
              fullWidth
            />
          </Animated.View>
        )}

        {/* STEP: Done */}
        {step === "done" && (
          <Animated.View entering={FadeIn} style={styles.centered}>
            <WeatherAvatar outfit="shorts_tshirt" condition="sunny" sunglasses size={220} />
            <Text style={styles.bigTitle}>You're all set! ☀️</Text>
            <Text style={styles.bigSubtitle}>
              WearToday is calibrated to your personal temperature comfort. Let's see what to wear.
            </Text>
            <Button
              label="See Today's Outfit →"
              onPress={() => {}}
              variant="secondary"
              size="lg"
              fullWidth
            />
          </Animated.View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    gap: 20,
  },
  fill: { flex: 1 },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "white",
    borderRadius: 2,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  bigTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: "white",
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 42,
  },
  bigSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 300,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "white",
    textAlign: "center",
  },
  stepSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 300,
  },
  locationEmoji: {
    fontSize: 72,
  },
});
