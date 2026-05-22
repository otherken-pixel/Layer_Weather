import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/store";
import { fetchWeatherData } from "@/lib/weather";
import { generatePackingList, DEFAULT_CALIBRATION } from "@/lib/outfit-logic";
import { Colors } from "@/constants/colors";

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

export default function PackingScreen() {
  const insets = useSafeAreaInsets();
  const { calibration } = useAppStore();
  const cal = calibration ?? DEFAULT_CALIBRATION;

  const [destination, setDestination] = useState("");
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [selected, setSelected] = useState<GeoResult | null>(null);
  const [days, setDays] = useState("5");
  const [loading, setLoading] = useState(false);
  const [packingItems, setPackingItems] = useState<
    Array<{ category: string; name: string; quantity: number; reason?: string }>
  >([]);

  async function searchDestination() {
    if (!destination.trim()) return;
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=5&language=en&format=json`
      );
      const json = await res.json();
      setGeoResults(json.results ?? []);
    } catch {
      Alert.alert("Error", "Could not search for destination.");
    }
  }

  async function generatePacking() {
    if (!selected) return;
    setLoading(true);
    try {
      const tripDays = Math.max(1, Math.min(14, parseInt(days) || 5));
      const weather = await fetchWeatherData(selected.latitude, selected.longitude);
      const items = generatePackingList(weather.daily.slice(0, tripDays), cal);
      setPackingItems(items);
    } catch {
      Alert.alert("Error", "Could not fetch weather for this destination.");
    } finally {
      setLoading(false);
    }
  }

  const categories = ["outerwear", "tops", "bottoms", "footwear", "accessories"];

  return (
    <LinearGradient colors={["#1a1a2e", "#203A43"]} style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 90 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Travel Packing</Text>
        <Text style={styles.subtitle}>Weather-smart packing lists for any trip</Text>

        {/* Search */}
        <Card style={styles.searchCard}>
          <Text style={styles.inputLabel}>Destination</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              placeholder="Paris, Tokyo, New York…"
              placeholderTextColor={Colors.text.muted}
              value={destination}
              onChangeText={setDestination}
              onSubmitEditing={searchDestination}
              returnKeyType="search"
            />
            <Pressable onPress={searchDestination} style={styles.searchBtn}>
              <Ionicons name="search" size={20} color="white" />
            </Pressable>
          </View>

          {geoResults.length > 0 && !selected && (
            <View style={styles.results}>
              {geoResults.map((r, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    setSelected(r);
                    setDestination(`${r.name}, ${r.country}`);
                    setGeoResults([]);
                  }}
                  style={styles.resultRow}
                >
                  <Ionicons name="location" size={16} color={Colors.text.inverseSecondary} />
                  <Text style={styles.resultText}>
                    {r.name}{r.admin1 ? `, ${r.admin1}` : ""}, {r.country}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={styles.inputLabel}>Trip length (days)</Text>
          <TextInput
            style={[styles.input, { width: 100 }]}
            keyboardType="numeric"
            value={days}
            onChangeText={setDays}
            maxLength={2}
            placeholderTextColor={Colors.text.muted}
          />
        </Card>

        <Button
          label={selected ? `Generate list for ${selected.name}` : "Select a destination first"}
          onPress={generatePacking}
          disabled={!selected}
          loading={loading}
          variant="primary"
          size="lg"
          fullWidth
        />

        {/* Packing list */}
        {packingItems.length > 0 && (
          <View style={styles.listWrap}>
            <Text style={styles.listTitle}>
              Packing list for {selected?.name} · {days} days
            </Text>
            {categories.map((cat) => {
              const items = packingItems.filter((i) => i.category === cat);
              if (items.length === 0) return null;
              return (
                <Card key={cat} style={styles.categoryCard}>
                  <Text style={styles.categoryTitle}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
                  {items.map((item, i) => (
                    <View key={i} style={styles.itemRow}>
                      <View style={styles.itemQty}>
                        <Text style={styles.qtyText}>{item.quantity}×</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        {item.reason && <Text style={styles.itemReason}>{item.reason}</Text>}
                      </View>
                      <Ionicons name="checkmark-circle-outline" size={20} color="rgba(255,255,255,0.3)" />
                    </View>
                  ))}
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  title: { fontSize: 32, fontWeight: "800", color: "white", letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: Colors.text.inverseSecondary },
  searchCard: { marginHorizontal: 0, gap: 12 },
  inputLabel: { fontSize: 13, color: Colors.text.inverseSecondary, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  searchRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  input: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "white",
  },
  searchBtn: {
    width: 46,
    height: 46,
    backgroundColor: Colors.brand.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  results: { gap: 2, marginTop: -4 },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  resultText: { fontSize: 14, color: "white" },
  listWrap: { gap: 12 },
  listTitle: { fontSize: 18, fontWeight: "700", color: "white" },
  categoryCard: { marginHorizontal: 0, gap: 8 },
  categoryTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text.inverseSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  itemQty: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.brand.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: { fontSize: 14, fontWeight: "700", color: Colors.brand.light },
  itemName: { fontSize: 15, color: "white", fontWeight: "500" },
  itemReason: { fontSize: 12, color: Colors.text.inverseSecondary, marginTop: 1 },
});
