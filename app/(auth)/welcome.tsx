import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeInUp,
  BounceIn,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WeatherAvatar } from "@/components/avatar/WeatherAvatar";
import { Button } from "@/components/ui/Button";


export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#6C63FF", "#43B0F1"]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.root}
    >
      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
        {/* Avatar hero */}
        <Animated.View entering={BounceIn.delay(200)} style={styles.avatarWrap}>
          <WeatherAvatar outfit="light_jacket" condition="sunny" sunglasses size={240} />
        </Animated.View>

        {/* Title block */}
        <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.titleBlock}>
          <Text style={styles.appName}>WearToday</Text>
          <Text style={styles.tagline}>
            Stop guessing.{"\n"}Dress for the weather you'll actually feel.
          </Text>
        </Animated.View>

        {/* Features */}
        <Animated.View entering={FadeInDown.delay(600)} style={styles.features}>
          {[
            { icon: "🌡️", text: "Feels-like temperature, not just the number" },
            { icon: "👔", text: "Personalised outfit picks, just for you" },
            { icon: "🚶", text: "Smart commute alerts before you walk out" },
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </Animated.View>

        {/* CTA buttons */}
        <Animated.View entering={FadeInDown.delay(800)} style={styles.cta}>
          <Button
            label="Get Started"
            onPress={() => router.push("/(auth)/register")}
            variant="primary"
            size="lg"
            fullWidth
          />
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            style={styles.loginLink}
          >
            <Text style={styles.loginLinkText}>
              Already have an account?{" "}
              <Text style={styles.loginLinkBold}>Sign in</Text>
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 28,
    gap: 24,
  },
  avatarWrap: {
    alignItems: "center",
  },
  titleBlock: {
    alignItems: "center",
    gap: 12,
  },
  appName: {
    fontSize: 44,
    fontWeight: "900",
    color: "white",
    letterSpacing: -1.5,
  },
  tagline: {
    fontSize: 18,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 26,
  },
  features: {
    gap: 12,
    width: "100%",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  featureIcon: {
    fontSize: 22,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: "white",
    fontWeight: "500",
  },
  cta: {
    width: "100%",
    gap: 16,
    alignItems: "center",
  },
  loginLink: {
    paddingVertical: 4,
  },
  loginLinkText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
  },
  loginLinkBold: {
    fontWeight: "700",
    color: "white",
  },
});
