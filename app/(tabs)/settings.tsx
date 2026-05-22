import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { WeatherAvatar } from "@/components/avatar/WeatherAvatar";
import { signOut, upsertProfile } from "@/lib/supabase";
import { useAppStore } from "@/store";
import { Colors } from "@/constants/colors";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, calibration, userId, setProfile, setCalibration } = useAppStore();

  const [tempUnit, setTempUnit] = useState<"F" | "C">(profile?.temp_unit ?? "F");
  const [commuteStart, setCommuteStart] = useState(profile?.commute_start ?? "07:30");
  const [commuteEnd, setCommuteEnd] = useState(profile?.commute_end ?? "18:00");
  const [rainAlerts, setRainAlerts] = useState(true);
  const [saving, setSaving] = useState(false);

  async function saveSettings() {
    if (!userId) return;
    setSaving(true);
    try {
      const updated = await upsertProfile(userId, {
        temp_unit: tempUnit,
        commute_start: commuteStart,
        commute_end: commuteEnd,
      });
      if (updated) setProfile(updated);
      Alert.alert("Saved", "Your preferences have been updated.");
    } catch {
      Alert.alert("Error", "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          // Auth state change handles navigation
        },
      },
    ]);
  }

  function handleRecalibrate() {
    Alert.alert(
      "Recalibrate",
      "This will walk you through the calibration wizard again to update your outfit thresholds.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Recalibrate",
          onPress: () => router.push("/(onboarding)"),
        },
      ]
    );
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
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <WeatherAvatar outfit="pants_tshirt" condition="sunny" size={100} />
          <Text style={styles.displayName}>
            {profile?.display_name ?? "Weather Enthusiast"}
          </Text>
          <Text style={styles.email}>{profile?.email ?? ""}</Text>
        </View>

        {/* Temperature unit */}
        <SettingSection title="Units">
          <Card style={styles.settingCard}>
            <Text style={styles.settingLabel}>Temperature</Text>
            <View style={styles.segmentRow}>
              {(["F", "C"] as const).map((u) => (
                <Pressable
                  key={u}
                  onPress={() => setTempUnit(u)}
                  style={[styles.segment, tempUnit === u && styles.segmentActive]}
                >
                  <Text style={[styles.segmentText, tempUnit === u && styles.segmentTextActive]}>
                    °{u}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Card>
        </SettingSection>

        {/* Commute times */}
        <SettingSection title="Commute">
          <Card style={styles.settingCard}>
            <TimeRow label="Morning departure" value={commuteStart} onChange={setCommuteStart} />
            <View style={styles.divider} />
            <TimeRow label="Evening return" value={commuteEnd} onChange={setCommuteEnd} />
          </Card>
          <Text style={styles.settingHint}>
            WearToday uses these times to warn you about temperature swings during your commute.
          </Text>
        </SettingSection>

        {/* Notifications */}
        <SettingSection title="Notifications">
          <Card style={styles.settingCard}>
            <ToggleRow
              label="Rain alerts"
              sublabel="Be warned when rain is expected"
              value={rainAlerts}
              onToggle={setRainAlerts}
            />
          </Card>
        </SettingSection>

        {/* Calibration */}
        <SettingSection title="Outfit Calibration">
          {calibration && (
            <Card style={styles.calibrationCard}>
              <CalibrationStat label="Shorts from" value={`${calibration.shorts_min_temp}°F`} />
              <CalibrationStat label="Light jacket below" value={`${calibration.light_jacket_max_temp}°F`} />
              <CalibrationStat label="Heavy coat below" value={`${calibration.heavy_coat_max_temp}°F`} />
              <CalibrationStat
                label="Thermal sensitivity"
                value={
                  ["Always cold", "Runs cold", "Average", "Runs warm", "Always warm"][
                    calibration.thermal_sensitivity + 2
                  ]
                }
              />
            </Card>
          )}
          <Button
            label="Recalibrate preferences"
            onPress={handleRecalibrate}
            variant="ghost"
            size="md"
            leftIcon={<Ionicons name="refresh" size={16} color={Colors.brand.primary} />}
          />
        </SettingSection>

        {/* Save button */}
        <Button
          label="Save Changes"
          onPress={saveSettings}
          loading={saving}
          variant="primary"
          size="lg"
          fullWidth
        />

        {/* Sign out */}
        <Button
          label="Sign Out"
          onPress={handleSignOut}
          variant="ghost"
          size="md"
          fullWidth
        />

        <Text style={styles.version}>WearToday v1.0.0</Text>
      </ScrollView>
    </LinearGradient>
  );
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function ToggleRow({
  label,
  sublabel,
  value,
  onToggle,
}: {
  label: string;
  sublabel?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        {sublabel && <Text style={styles.settingHint}>{sublabel}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "rgba(255,255,255,0.15)", true: Colors.brand.primary }}
        thumbColor="white"
      />
    </View>
  );
}

function TimeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.timeRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <TextInput
        style={styles.timeInput}
        value={value}
        onChangeText={onChange}
        placeholder="HH:MM"
        placeholderTextColor={Colors.text.muted}
        keyboardType="numbers-and-punctuation"
        maxLength={5}
      />
    </View>
  );
}

function CalibrationStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.calibStat}>
      <Text style={styles.calibLabel}>{label}</Text>
      <Text style={styles.calibValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 24 },
  profileHeader: { alignItems: "center", gap: 8, paddingTop: 8, paddingBottom: 8 },
  displayName: { fontSize: 24, fontWeight: "800", color: "white" },
  email: { fontSize: 14, color: Colors.text.inverseSecondary },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text.inverseSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionContent: { gap: 8 },
  settingCard: { marginHorizontal: 0, gap: 16 },
  calibrationCard: { marginHorizontal: 0, gap: 12 },
  settingLabel: { fontSize: 15, fontWeight: "600", color: "white" },
  settingHint: { fontSize: 12, color: Colors.text.inverseSecondary, marginTop: 2 },
  segmentRow: { flexDirection: "row", gap: 8 },
  segment: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  segmentActive: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  segmentText: { fontSize: 16, fontWeight: "700", color: Colors.text.inverseSecondary },
  segmentTextActive: { color: "white" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  timeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  timeInput: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 16,
    color: "white",
    fontWeight: "600",
    width: 90,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  calibStat: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  calibLabel: { fontSize: 14, color: Colors.text.inverseSecondary },
  calibValue: { fontSize: 15, fontWeight: "700", color: "white" },
  version: { textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.25)" },
});
