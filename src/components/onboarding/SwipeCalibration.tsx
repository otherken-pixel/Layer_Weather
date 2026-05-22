import React, { useCallback, useRef, useState } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  interpolateColor,
  Extrapolation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { WeatherAvatar } from "@/components/avatar/WeatherAvatar";
import type { OutfitType, CalibrationScenario, SwipeDirection } from "@/types";
import { Colors } from "@/constants/colors";

const { width: SCREEN_W } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_W * 0.35;

const SCENARIOS: CalibrationScenario[] = [
  {
    id: "hot",
    temp: 85,
    outfit: "shorts_tshirt",
    description: "85°F sunny afternoon",
  },
  {
    id: "warm",
    temp: 74,
    outfit: "pants_tshirt",
    description: "74°F comfortable day",
  },
  {
    id: "mild",
    temp: 64,
    outfit: "light_jacket",
    description: "64°F breezy morning",
  },
  {
    id: "cool",
    temp: 52,
    outfit: "heavy_jacket",
    description: "52°F grey afternoon",
  },
  {
    id: "cold",
    temp: 38,
    outfit: "heavy_coat",
    description: "38°F cold winter day",
  },
];

interface SwipeCalibrationProps {
  onComplete: (swipes: Array<{ temp: number; direction: SwipeDirection }>) => void;
}

export function SwipeCalibration({ onComplete }: SwipeCalibrationProps) {
  const [index, setIndex] = useState(0);
  const [swipes, setSwipes] = useState<Array<{ temp: number; direction: SwipeDirection }>>([]);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isGesturing = useSharedValue(false);

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const advanceCard = useCallback(
    (dir: SwipeDirection) => {
      const scenario = SCENARIOS[index];
      const next = [...swipes, { temp: scenario.temp, direction: dir }];
      setSwipes(next);

      if (index + 1 >= SCENARIOS.length) {
        onComplete(next);
      } else {
        setIndex((i) => i + 1);
        translateX.value = 0;
        translateY.value = 0;
      }
    },
    [index, swipes, onComplete]
  );

  const gesture = Gesture.Pan()
    .onStart(() => {
      isGesturing.value = true;
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.3;
    })
    .onEnd((e) => {
      isGesturing.value = false;
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        const dir: SwipeDirection = e.translationX > 0 ? "right" : "left";
        const targetX = dir === "right" ? SCREEN_W * 1.5 : -SCREEN_W * 1.5;
        translateX.value = withTiming(targetX, { duration: 300 });
        runOnJS(triggerHaptic)();
        runOnJS(advanceCard)(dir);
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
        translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
      }
    });

  const cardAnimStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      translateX.value,
      [-SCREEN_W / 2, 0, SCREEN_W / 2],
      [-15, 0, 15],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotation}deg` },
      ],
    };
  });

  const leftLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SCREEN_W * 0.3, -60, 0],
      [1, 0.2, 0],
      Extrapolation.CLAMP
    ),
    transform: [{ scale: interpolate(translateX.value, [-SCREEN_W * 0.3, 0], [1.2, 0.8], Extrapolation.CLAMP) }],
  }));

  const rightLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, 60, SCREEN_W * 0.3],
      [0, 0.2, 1],
      Extrapolation.CLAMP
    ),
    transform: [{ scale: interpolate(translateX.value, [0, SCREEN_W * 0.3], [0.8, 1.2], Extrapolation.CLAMP) }],
  }));

  const scenario = SCENARIOS[index];
  const nextScenario = SCENARIOS[index + 1];

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.step}>{index + 1} / {SCENARIOS.length}</Text>
        <Text style={styles.title}>How does this feel?</Text>
        <Text style={styles.subtitle}>Swipe left if you'd be cold · right if warm enough</Text>
      </View>

      {/* Progress dots */}
      <View style={styles.dots}>
        {SCENARIOS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === index && styles.dotActive, i < index && styles.dotDone]}
          />
        ))}
      </View>

      {/* Cards stack */}
      <View style={styles.cardStack}>
        {/* Background card (next) */}
        {nextScenario && (
          <View style={[styles.card, styles.nextCard]}>
            <WeatherAvatar outfit={nextScenario.outfit} condition="sunny" size={180} />
          </View>
        )}

        {/* Active card */}
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.card, cardAnimStyle]}>
            {/* Swipe direction labels */}
            <Animated.View style={[styles.swipeLabel, styles.swipeLabelLeft, leftLabelStyle]}>
              <Text style={styles.swipeLabelText}>🥶 Too Cold</Text>
            </Animated.View>
            <Animated.View style={[styles.swipeLabel, styles.swipeLabelRight, rightLabelStyle]}>
              <Text style={styles.swipeLabelText}>😊 Feels Good</Text>
            </Animated.View>

            <WeatherAvatar
              outfit={scenario.outfit}
              condition="sunny"
              size={200}
            />

            <View style={styles.tempBadge}>
              <Text style={styles.tempText}>{scenario.temp}°</Text>
              <Text style={styles.tempDesc}>{scenario.description}</Text>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Hint arrows */}
      <View style={styles.hints}>
        <Text style={styles.hintText}>← Too cold for me</Text>
        <Text style={styles.hintText}>Feels good! →</Text>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  step: {
    fontSize: 13,
    color: Colors.text.inverseSecondary,
    marginBottom: 6,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.text.inverse,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.text.inverseSecondary,
    textAlign: "center",
  },
  dots: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  dotActive: {
    backgroundColor: "white",
    width: 24,
  },
  dotDone: {
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  cardStack: {
    width: SCREEN_W - 48,
    height: 380,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    position: "absolute",
    width: "100%",
    height: 360,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  nextCard: {
    transform: [{ scale: 0.94 }, { translateY: 16 }],
    opacity: 0.7,
  },
  swipeLabel: {
    position: "absolute",
    top: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    zIndex: 10,
  },
  swipeLabelLeft: {
    left: 20,
    borderColor: "#4FC3F7",
    backgroundColor: "rgba(79, 195, 247, 0.1)",
  },
  swipeLabelRight: {
    right: 20,
    borderColor: "#81C784",
    backgroundColor: "rgba(129, 199, 132, 0.1)",
  },
  swipeLabelText: {
    fontSize: 15,
    fontWeight: "700",
    color: "white",
  },
  tempBadge: {
    alignItems: "center",
    marginTop: 8,
  },
  tempText: {
    fontSize: 52,
    fontWeight: "800",
    color: "white",
    letterSpacing: -2,
  },
  tempDesc: {
    fontSize: 16,
    color: Colors.text.inverseSecondary,
    marginTop: 4,
  },
  hints: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 24,
    marginTop: 16,
  },
  hintText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "500",
  },
});
