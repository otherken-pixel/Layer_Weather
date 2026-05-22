import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { format } from "date-fns";
import { Ionicons } from "@expo/vector-icons";

import { Card } from "@/components/ui/Card";
import { WeatherAvatar } from "@/components/avatar/WeatherAvatar";
import { useWeather } from "@/hooks/useWeather";
import { useAppStore } from "@/store";
import { getOutfitRecommendation, DEFAULT_CALIBRATION } from "@/lib/outfit-logic";
import { Colors } from "@/constants/colors";
import type { DailyForecast } from "@/types";

const CONDITION_ICONS: Record<string, string> = {
  clear: "☀️", partly_cloudy: "⛅", cloudy: "☁️",
  foggy: "🌫️", drizzle: "🌦️", rain: "🌧️",
  heavy_rain: "⛈️", snow: "❄️", thunderstorm: "⛈️",
};

export default function ForecastScreen() {
  const insets = useSafeAreaInsets();
  const { weather, isLoadingWeather } = useWeather();
  const { profile, calibration } = useAppStore();

  const tempUnit = profile?.temp_unit ?? "F";
  const cal = calibration ?? DEFAULT_CALIBRATION;

  function convertTemp(f: number): number {
    return tempUnit === "C" ? Math.round(((f - 32) * 5) / 9) : Math.round(f);
  }

  return (
    <LinearGradient colors={["#1a1a2e", "#16213e"]} style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>7-Day Forecast</Text>
        <Text style={styles.subtitle}>Outfit picks for the week ahead</Text>

        {isLoadingWeather && !weather && (
          <ActivityIndicator color="white" size="large" style={{ marginTop: 60 }} />
        )}

        {weather?.daily.map((day, i) => (
          <DayCard
            key={i}
            day={day}
            calibration={cal}
            tempUnit={tempUnit}
            convertTemp={convertTemp}
            isToday={i === 0}
          />
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

function DayCard({
  day,
  calibration,
  tempUnit,
  convertTemp,
  isToday,
}: {
  day: DailyForecast;
  calibration: typeof DEFAULT_CALIBRATION;
  tempUnit: "F" | "C";
  convertTemp: (f: number) => number;
  isToday: boolean;
}) {
  const rec = getOutfitRecommendation({
    feelsLike: day.feelsLikeMin + (day.feelsLikeMax - day.feelsLikeMin) * 0.35,
    weatherCode: day.weatherCode,
    windSpeed: 10,
    precipProb: day.precipProb,
    humidity: 55,
    calibration,
    hourly: [],
  });

  return (
    <Card style={styles.dayCard}>
      <View style={styles.dayRow}>
        {/* Date */}
        <View style={styles.dateCol}>
          <Text style={[styles.dayName, isToday && styles.todayLabel]}>
            {isToday ? "Today" : format(day.date, "EEE")}
          </Text>
          <Text style={styles.dayDate}>{format(day.date, "MMM d")}</Text>
        </View>

        {/* Avatar mini */}
        <WeatherAvatar
          outfit={rec.outfit}
          condition={rec.avatarCondition}
          umbrella={rec.umbrella}
          size={80}
        />

        {/* Info */}
        <View style={styles.infoCol}>
          <Text style={styles.outfitName}>{rec.label}</Text>
          <Text style={styles.conditionIcon}>
            {CONDITION_ICONS[day.condition] ?? "🌤️"}{" "}
            {day.precipProb > 20 && <Text style={styles.rainPct}>{day.precipProb}% rain</Text>}
          </Text>
          <View style={styles.tempRange}>
            <Text style={styles.tempHigh}>{convertTemp(day.feelsLikeMax)}°</Text>
            <Text style={styles.tempLow}> / {convertTemp(day.feelsLikeMin)}°</Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "white",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.text.inverseSecondary,
    marginBottom: 8,
  },
  dayCard: { marginHorizontal: 0 },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateCol: {
    width: 56,
  },
  dayName: {
    fontSize: 15,
    fontWeight: "700",
    color: "white",
  },
  todayLabel: {
    color: Colors.brand.light,
  },
  dayDate: {
    fontSize: 12,
    color: Colors.text.inverseSecondary,
    marginTop: 2,
  },
  infoCol: {
    flex: 1,
    gap: 3,
  },
  outfitName: {
    fontSize: 15,
    fontWeight: "700",
    color: "white",
  },
  conditionIcon: {
    fontSize: 14,
    color: Colors.text.inverseSecondary,
  },
  rainPct: {
    fontSize: 12,
    color: "#90CAF9",
  },
  tempRange: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  tempHigh: {
    fontSize: 18,
    fontWeight: "800",
    color: "white",
  },
  tempLow: {
    fontSize: 14,
    color: Colors.text.inverseSecondary,
  },
});
