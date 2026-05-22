import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { Colors } from "@/constants/colors";

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  frosted?: boolean;
  padding?: number;
}

export function Card({ children, style, frosted = true, padding = 20 }: CardProps) {
  if (frosted) {
    return (
      <BlurView intensity={18} tint="light" style={[styles.base, { padding }, style]}>
        <View style={styles.overlay}>{children}</View>
      </BlurView>
    );
  }

  return (
    <View style={[styles.base, styles.solid, { padding }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.surface.cardBorder,
  },
  solid: {
    backgroundColor: Colors.surface.card,
  },
  overlay: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
});
