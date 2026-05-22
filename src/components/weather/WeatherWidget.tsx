import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui/Card";
import type { CurrentWeather } from "@/types";
import { Colors } from "@/constants/colors";

interface WeatherWidgetProps {
  weather: CurrentWeather;
  tempUnit: "F" | "C";
}

function convertTemp(f: number, unit: "F" | "C"): number {
  if (unit === "C") return Math.round(((f - 32) * 5) / 9);
  return Math.round(f);
}

const CONDITION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  clear: "sunny",
  partly_cloudy: "partly-sunny",
  cloudy: "cloud",
  foggy: "cloud",
  drizzle: "rainy",
  rain: "rainy",
  heavy_rain: "thunderstorm",
  snow: "snow",
  thunderstorm: "thunderstorm",
};

export function WeatherWidget({ weather, tempUnit }: WeatherWidgetProps) {
  const temp = convertTemp(weather.temp, tempUnit);
  const feelsLike = convertTemp(weather.feelsLike, tempUnit);
  const iconName = CONDITION_ICONS[weather.condition] ?? "cloud";

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        {/* Main temp */}
        <View>
          <Text style={styles.location}>{weather.location}</Text>
          <View style={styles.tempRow}>
            <Text style={styles.temp}>{temp}°</Text>
            <Ionicons name={iconName} size={36} color="white" style={{ marginTop: 8 }} />
          </View>
          <Text style={styles.feelsLike}>Feels like {feelsLike}°{tempUnit}</Text>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <StatRow icon="water" value={`${weather.humidity}%`} label="Humidity" />
          <StatRow icon="speedometer" value={`${weather.windSpeed} mph`} label="Wind" />
          <StatRow icon="umbrella" value={`${weather.precipProb}%`} label="Rain" />
        </View>
      </View>
    </Card>
  );
}

function StatRow({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View style={styles.statRow}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={14} color={Colors.text.inverseSecondary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 0,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  location: {
    fontSize: 13,
    color: Colors.text.inverseSecondary,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  tempRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  temp: {
    fontSize: 56,
    fontWeight: "800",
    color: "white",
    letterSpacing: -2,
    lineHeight: 60,
  },
  feelsLike: {
    fontSize: 14,
    color: Colors.text.inverseSecondary,
    marginTop: 2,
  },
  stats: {
    gap: 12,
    justifyContent: "center",
    paddingTop: 8,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "white",
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.inverseSecondary,
  },
});
