import "../global.css";
import "react-native-reanimated";
import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { userId, isAuthenticated } = useAuth();
  const { isOnboarded } = useAppStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    const inAuth = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "(onboarding)";

    if (!isAuthenticated && !inAuth) {
      router.replace("/(auth)/welcome");
    } else if (isAuthenticated && !isOnboarded && !inOnboarding) {
      router.replace("/(onboarding)");
    } else if (isAuthenticated && isOnboarded && (inAuth || inOnboarding)) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isOnboarded, segments]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </GestureHandlerRootView>
  );
}
