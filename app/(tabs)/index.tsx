import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";

import { WeatherWidget } from "@/components/weather/WeatherWidget";
import { OutfitRecommendationCard } from "@/components/weather/OutfitRecommendation";
import { Card } from "@/components/ui/Card";
import { WeatherAvatar } from "@/components/avatar/WeatherAvatar";

import { useWeather } from "@/hooks/useWeather";
import { useAppStore } from "@/store";
import { getWeatherGradient } from "@/constants/colors";

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { weather, outfit, isLoadingWeather, weatherError, refresh } = useWeather();
  const { profile } = useAppStore();

  useEffect(() => {
    refresh();
  }, []);

  const onRefresh = useCallback(() => refresh(true), [refresh]);

  const gradient = weather
    ? getWeatherGradient(weather.current.condition, weather.current.isDay, new Date().getHours())
    : ["#1a1a2e" as const, "#16213e" as const];

  const tempUnit = profile?.temp_unit ?? "F";

  return (
    <LinearGradient colors={gradient as [string, string]} style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 90 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingWeather}
            onRefresh={onRefresh}
            tintColor="white"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}, {profile?.display_name?.split(" ")[0] ?? "there"}
            </Text>
            <Text style={styles.date}>{format(new Date(), "EEEE, MMMM d")}</Text>
          </View>
          <Pressable onPress={() => refresh(true)} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color="white" />
          </Pressable>
        </View>

        {/* Loading state */}
        {isLoadingWeather && !weather && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.loadingText}>Fetching your weather…</Text>
          </View>
        )}

        {/* Error state */}
        {weatherError && !weather && (
          <Card style={styles.errorCard}>
            <Ionicons name="alert-circle" size={32} color="#FC8181" />
            <Text style={styles.errorText}>{weatherError}</Text>
            <Pressable onPress={() => refresh(true)} style={styles.retryBtn}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </Card>
        )}

        {/* Main content */}
        {weather && outfit && (
          <Animated.View entering={FadeIn} style={styles.main}>
            {/* Outfit recommendation hero */}
            <OutfitRecommendationCard
              recommendation={outfit}
              tempUnit={tempUnit}
              feelsLike={weather.current.feelsLike}
            />

            {/* Weather widget */}
            <WeatherWidget weather={weather.current} tempUnit={tempUnit} />

            {/* Hourly strip */}
            <HourlyStrip hourly={weather.hourly.slice(0, 12)} tempUnit={tempUnit} />

            {/* Significant changes */}
            {weather.hourly.length > 0 && (
              <SignificantChanges weather={weather} />
            )}
          </Animated.View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function HourlyStrip({
  hourly,
  tempUnit,
}: {
  hourly: Array<{ time: Date; feelsLike: number; weatherCode: number; precipProb: number; isDay: boolean }>;
  tempUnit: "F" | "C";
}) {
  function convertTemp(f: number): number {
    return tempUnit === "C" ? Math.round(((f - 32) * 5) / 9) : Math.round(f);
  }

  const icons: Record<string, string> = {
    clear: "☀️", partly_cloudy: "⛅", cloudy: "☁️",
    foggy: "🌫️", drizzle: "🌦️", rain: "🌧️",
    heavy_rain: "⛈️", snow: "❄️", thunderstorm: "⛈️",
  };

  function wmoToKey(code: number): string {
    if (code === 0) return "clear";
    if (code <= 2) return "partly_cloudy";
    if (code <= 3) return "cloudy";
    if (code <= 48) return "foggy";
    if (code <= 57) return "drizzle";
    if (code <= 67) return "rain";
    if (code <= 77) return "snow";
    if (code <= 82) return "rain";
    return "thunderstorm";
  }

  return (
    <Card style={styles.hourlyCard}>
      <Text style={styles.sectionTitle}>Next 12 Hours</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourlyScroll}>
        <View style={styles.hourlyRow}>
          {hourly.map((h, i) => (
            <View key={i} style={styles.hourlyItem}>
              <Text style={styles.hourlyTime}>
                {i === 0
                  ? "Now"
                  : h.time.toLocaleTimeString("en", { hour: "numeric" })}
              </Text>
              <Text style={styles.hourlyIcon}>{icons[wmoToKey(h.weatherCode)] ?? "🌤️"}</Text>
              <Text style={styles.hourlyTemp}>{convertTemp(h.feelsLike)}°</Text>
              {h.precipProb > 20 && (
                <Text style={styles.hourlyRain}>{h.precipProb}%</Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </Card>
  );
}

function SignificantChanges({ weather }: { weather: { hourly: Array<{ time: Date; feelsLike: number; weatherCode: number; precipProb: number; condition: string; windSpeed: number; isDay: boolean }>; current: { feelsLike: number } } }) {
  const changes: string[] = [];
  const next12 = weather.hourly.slice(0, 12);

  for (let i = 1; i < next12.length; i++) {
    const delta = next12[i].feelsLike - weather.current.feelsLike;
    if (Math.abs(delta) >= 15 && changes.length < 2) {
      const dir = delta < 0 ? "drops" : "rises";
      changes.push(
        `Feels-like ${dir} ${Math.abs(Math.round(delta))}° by ${next12[i].time.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}`
      );
    }
  }

  if (changes.length === 0) return null;

  return (
    <Card style={styles.changesCard}>
      <Text style={styles.sectionTitle}>Heads Up</Text>
      {changes.map((c, i) => (
        <View key={i} style={styles.changeRow}>
          <Ionicons name="trending-down" size={16} color="#FC8181" />
          <Text style={styles.changeText}>{c}</Text>
        </View>
      ))}
    </Card>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "800",
    color: "white",
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 15,
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 80,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
  },
  errorCard: {
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    color: "white",
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
  },
  retryText: {
    color: "white",
    fontWeight: "600",
  },
  main: { gap: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  hourlyCard: { marginHorizontal: 0 },
  hourlyScroll: { marginHorizontal: -4 },
  hourlyRow: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 4,
  },
  hourlyItem: {
    alignItems: "center",
    width: 60,
    gap: 4,
    paddingVertical: 4,
  },
  hourlyTime: { fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: "600" },
  hourlyIcon: { fontSize: 22 },
  hourlyTemp: { fontSize: 15, fontWeight: "700", color: "white" },
  hourlyRain: { fontSize: 11, color: "#90CAF9" },
  changesCard: { marginHorizontal: 0, gap: 8 },
  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  changeText: { fontSize: 14, color: "rgba(255,255,255,0.85)", flex: 1 },
});
