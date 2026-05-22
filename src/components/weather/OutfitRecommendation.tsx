import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { WeatherAvatar } from "@/components/avatar/WeatherAvatar";
import { Card } from "@/components/ui/Card";
import type { OutfitRecommendation as OutfitRec } from "@/types";
import { Colors } from "@/constants/colors";

interface OutfitRecommendationProps {
  recommendation: OutfitRec;
  tempUnit: "F" | "C";
  feelsLike: number;
  onRecalibrate?: () => void;
}

export function OutfitRecommendationCard({
  recommendation,
  tempUnit,
  feelsLike,
  onRecalibrate,
}: OutfitRecommendationProps) {
  const { outfit, label, description, umbrella, sunglasses, scarf, beanie, avatarCondition, commuteAlert } = recommendation;

  const accessories: string[] = [];
  if (umbrella) accessories.push("☂️ Umbrella");
  if (sunglasses) accessories.push("🕶️ Sunglasses");
  if (scarf) accessories.push("🧣 Scarf");
  if (beanie) accessories.push("🧢 Beanie");

  return (
    <View style={styles.root}>
      {/* Avatar section */}
      <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.avatarWrap}>
        <WeatherAvatar
          outfit={outfit}
          condition={avatarCondition}
          umbrella={umbrella}
          sunglasses={sunglasses}
          scarf={scarf}
          beanie={beanie}
          size={260}
        />
      </Animated.View>

      {/* Outfit label */}
      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.labelWrap}>
        <Text style={styles.outfitLabel}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </Animated.View>

      {/* Accessories row */}
      {accessories.length > 0 && (
        <Animated.View entering={FadeInDown.delay(300)} style={styles.accessoriesRow}>
          {accessories.map((acc) => (
            <View key={acc} style={styles.accessoryChip}>
              <Text style={styles.accessoryText}>{acc}</Text>
            </View>
          ))}
        </Animated.View>
      )}

      {/* Commute alert */}
      {commuteAlert && (
        <Animated.View entering={FadeInDown.delay(400)}>
          <Card style={[styles.alertCard, commuteAlert.urgency === "warning" && styles.alertWarning]}>
            <View style={styles.alertInner}>
              <Ionicons
                name={commuteAlert.urgency === "warning" ? "warning" : "information-circle"}
                size={20}
                color={commuteAlert.urgency === "warning" ? "#F6AD55" : Colors.text.inverseSecondary}
              />
              <Text style={styles.alertText}>{commuteAlert.message}</Text>
            </View>
          </Card>
        </Animated.View>
      )}

      {/* Recalibrate nudge */}
      {onRecalibrate && (
        <Pressable onPress={onRecalibrate} style={styles.recalibrate}>
          <Ionicons name="refresh" size={14} color={Colors.text.inverseSecondary} />
          <Text style={styles.recalibrateText}>Not quite right? Recalibrate</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    gap: 8,
  },
  avatarWrap: {
    alignItems: "center",
    marginBottom: 4,
  },
  labelWrap: {
    alignItems: "center",
    gap: 4,
  },
  outfitLabel: {
    fontSize: 32,
    fontWeight: "800",
    color: "white",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: Colors.text.inverseSecondary,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 22,
  },
  accessoriesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 4,
  },
  accessoryChip: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  accessoryText: {
    fontSize: 14,
    color: "white",
    fontWeight: "600",
  },
  alertCard: {
    marginHorizontal: 0,
    marginTop: 4,
  },
  alertWarning: {
    borderColor: "rgba(246, 173, 85, 0.5)",
  },
  alertInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: "white",
    lineHeight: 20,
  },
  recalibrate: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    opacity: 0.6,
  },
  recalibrateText: {
    fontSize: 13,
    color: Colors.text.inverseSecondary,
    fontWeight: "500",
  },
});
