import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import type { ThermalSensitivity } from "@/types";
import { Colors } from "@/constants/colors";

interface ThermalSliderProps {
  value: ThermalSensitivity;
  onChange: (v: ThermalSensitivity) => void;
}

// Ordered -2 → +2; index with (value + 2)
const LABELS: Array<{ emoji: string; text: string; sub: string }> = [
  { emoji: "🥶", text: "Always Freezing", sub: "You're the one cranking the heat up" },
  { emoji: "😬", text: "Runs Cold", sub: "Usually reach for a layer first" },
  { emoji: "😌", text: "Just Right", sub: "Pretty average temperature tolerance" },
  { emoji: "😅", text: "Runs Warm", sub: "You're first to complain it's stuffy" },
  { emoji: "🔥", text: "Always Hot", sub: "You're the one secretly turning the AC up" },
];

export function ThermalSlider({ value, onChange }: ThermalSliderProps) {
  const emoji = useSharedValue(1);

  const labelStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(emoji.value, { damping: 10 }) }],
  }));

  const info = LABELS[value + 2];

  return (
    <View style={styles.root}>
      <Animated.Text style={[styles.emoji, labelStyle]}>{info.emoji}</Animated.Text>
      <Text style={styles.label}>{info.text}</Text>
      <Text style={styles.sublabel}>{info.sub}</Text>

      <View style={styles.sliderRow}>
        <Text style={styles.endLabel}>🥶</Text>
        <Slider
          style={styles.slider}
          minimumValue={-2}
          maximumValue={2}
          step={1}
          value={value}
          onValueChange={(v) => {
            emoji.value = 0.8;
            setTimeout(() => { emoji.value = 1; }, 100);
            onChange(v as ThermalSensitivity);
          }}
          minimumTrackTintColor={Colors.brand.light}
          maximumTrackTintColor="rgba(255,255,255,0.2)"
          thumbTintColor={Colors.brand.primary}
        />
        <Text style={styles.endLabel}>🔥</Text>
      </View>

      <View style={styles.ticks}>
        {([-2, -1, 0, 1, 2] as ThermalSensitivity[]).map((v) => (
          <View key={v} style={[styles.tick, v === value && styles.tickActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  label: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
    marginBottom: 6,
  },
  sublabel: {
    fontSize: 15,
    color: Colors.text.inverseSecondary,
    textAlign: "center",
    marginBottom: 32,
    maxWidth: 260,
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    paddingHorizontal: 8,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  endLabel: {
    fontSize: 24,
  },
  ticks: {
    flexDirection: "row",
    gap: 32,
    marginTop: 8,
  },
  tick: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  tickActive: {
    backgroundColor: "white",
    transform: [{ scale: 1.5 }],
  },
});
