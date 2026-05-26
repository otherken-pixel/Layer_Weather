import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { signOut, deleteUserAccount, upsertProfile } from "@/lib/supabase";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useAppStore } from "@/store";
import type { FormalityPreference, StylePreference } from "@/types";
import { useCalendarContext } from "@/hooks/useCalendarContext";
import { useIsDark } from "@/hooks/useDarkMode";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/calendar";
import { useWeather } from "@/hooks/useWeather";
import { useSaveLocation } from "@/hooks/useSaveLocation";
import { getSavedLocations, removeSavedLocation } from "@/lib/saved-locations";
import type { LocationData } from "@/types";
import { Colors } from "@/constants/colors";
import { applyAccentPalette, saveAccentLocal, loadAccentLocal, ACCENT_DEFAULT } from "@/hooks/useAccentTheme";

const ACCENT = "var(--accent-primary)";

const ACCENT_SWATCHES = [
  { label: "Red",     hex: "#DC2626" },
  { label: "Orange",  hex: "#EA580C" },
  { label: "Amber",   hex: "#D97706" },
  { label: "Lime",    hex: "#65A30D" },
  { label: "Green",   hex: "#16A34A" },
  { label: "Teal",    hex: "#0D9488" },
  { label: "Sky",     hex: "#0284C7" },
  { label: "Blue",    hex: "#2563EB" },
  { label: "Indigo",  hex: "#4F46E5" },
  { label: "Purple",  hex: "#7C3AED" },
  { label: "Pink",    hex: "#DB2777" },
  { label: "Magenta", hex: "#C026D3" },
] as const;

const DELETE_ACCOUNT_CONFIRM_MESSAGE =
  "Your account and all Layer Weather data will be permanently erased. There is no way to recover it.";

export default function Settings() {
  const navigate = useNavigate();
  const { profile, calibration, userId, setProfile, setFormality: setStoreFormality, location, savedLocations, setSavedLocations } = useAppStore();
  const { eventType, setEventType } = useCalendarContext();
  const { refresh } = useWeather();
  const { saveFromCity, saveFromDevice, saving: citySaving, error: cityError } = useSaveLocation();
  const isDark = useIsDark();
  const [tempUnit, setTempUnit] = useState<"F" | "C">(profile?.temp_unit ?? "F");
  const [displayMode, setDisplayMode] = useState<"visual" | "text">(profile?.outfit_display_mode ?? "visual");
  const [stylePreference, setStylePreference] = useState<StylePreference>(profile?.style_preference ?? "all");
  const [formality, setFormality] = useState<FormalityPreference>(profile?.formality_preference ?? "casual");
  const [commuteStart, setCommuteStart] = useState(profile?.commute_start ?? "07:30");
  const [commuteEnd, setCommuteEnd] = useState(profile?.commute_end ?? "18:00");
  const [cityQuery, setCityQuery] = useState(location?.city ?? profile?.last_city ?? "");
  const [accentColor, setAccentColor] = useState<string>(profile?.accent_color ?? loadAccentLocal());
  const [themePreference, setThemePreference] = useState<"light" | "dark" | "system">(
    profile?.theme_preference === "light" ? "light"
    : profile?.theme_preference === "dark" ? "dark"
    : "system"
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [localSavedLocations, setLocalSavedLocations] = useState<LocationData[]>(savedLocations);
  const [signOutModalOpen, setSignOutModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const label = location?.city || profile?.last_city;
    if (label) setCityQuery(label);
  }, [location?.city, profile?.last_city]);

  useEffect(() => {
    getSavedLocations().then((locs) => {
      setLocalSavedLocations(locs);
      setSavedLocations(locs);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveCity() {
    if (!userId || !cityQuery.trim()) return;
    const result = await saveFromCity(cityQuery);
    if (result.ok) await refresh(true);
  }

  async function saveGpsLocation() {
    if (!userId) return;
    const result = await saveFromDevice();
    if (result.ok) await refresh(true, { useDeviceLocation: true });
  }

  async function saveSettings() {
    if (!userId) return;
    setSaving(true);
    saveAccentLocal(accentColor);
    try {
      const updated = await upsertProfile(userId, {
        temp_unit: tempUnit,
        outfit_display_mode: displayMode,
        style_preference: stylePreference,
        formality_preference: formality,
        commute_start: commuteStart,
        commute_end: commuteEnd,
        theme_preference: themePreference === "system" ? null : themePreference,
      });
      setStoreFormality(formality);
      if (updated) {
        // Sync accent_color to DB if the column exists; ignore error if it doesn't
        try {
          const withAccent = await upsertProfile(userId, { accent_color: accentColor });
          if (withAccent) setProfile(withAccent);
        } catch {
          setProfile(updated);
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
  }

  async function handleDeleteAccount() {
    if (!userId) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteUserAccount(userId);
      setDeleteConfirmModalOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Account deletion failed. Please try again.";
      setDeleteError(message);
    } finally {
      setDeleting(false);
    }
  }

  const initials = profile?.display_name
    ? profile.display_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "W";

  // Theme-dependent values
  const pageBg = isDark ? "#1C1C1E" : "#F2F2F7";
  const nameColor = isDark ? "#F4F4F5" : "#111827";
  // Email/secondary — #4B5563 on #F2F2F7 (6.76:1 ✓); #9BA4B4 on #1C1C1E (6.6:1 ✓)
  const emailColor = isDark ? "#9BA4B4" : "#4B5563";
  // Section labels — #4B5563 on gray bg (6.76:1 ✓); #9BA4B4 on dark (6.6:1 ✓)
  const sectionLabelColor = isDark ? Colors.dark.textMuted : Colors.text.mutedLabel;
  // Footnote text below cards
  const footnoteColor = isDark ? "#9BA4B4" : "#4B5563";
  // Card surface
  const cardBg = isDark ? "#2C2C2E" : "#FFFFFF";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : undefined;
  const cardShadow = isDark ? "0 2px 12px rgba(0,0,0,0.25)" : "0 2px 12px rgba(0,0,0,0.06)";
  // Hint text inside white cards — #6B7280 on white (4.87:1 ✓); #9BA4B4 on dark (5.0:1 ✓)
  const hintColor = isDark ? "#9BA4B4" : "#6B7280";
  // Primary text inside cards
  const rowTextColor = isDark ? "#F4F4F5" : "#111827";
  const rowSecondaryColor = isDark ? "#9BA4B4" : "#6B7280";
  const dividerColor = isDark ? Colors.dark.divider : "#F3F4F6";
  const inputBg = isDark ? "#3A3A3C" : "#F3F4F6";
  const inputBorder = isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB";
  const inputText = isDark ? "#F4F4F5" : "#111827";
  const pillBg = isDark ? "#3A3A3C" : "#F3F4F6";
  const pillInactiveText = isDark ? Colors.dark.textSecondary : "#4B5563";

  return (
    <div style={{ minHeight: "100%", background: pageBg, display: "flex", flexDirection: "column" }}>

      {/* ── Profile header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: pageBg,
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 36px)",
          paddingBottom: 24,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        }}
      >
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "linear-gradient(135deg,var(--accent-primary),var(--accent-dark))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, fontWeight: 900, color: "white", letterSpacing: "-0.02em",
        }}>
          {initials}
        </div>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: nameColor, letterSpacing: "-0.02em", margin: 0 }}>
            {profile?.display_name ?? "Weather Enthusiast"}
          </h2>
          <p style={{ fontSize: 14, color: emailColor, marginTop: 2 }}>{profile?.email}</p>
        </div>
      </motion.div>

      {/* ── Sections ── */}
      <div style={{ flex: 1, padding: "0 14px 32px", display: "flex", flexDirection: "column", gap: 22 }}>

        {/* Location */}
        <Section title="Location" labelColor={sectionLabelColor}>
          <ThemedCard cardBg={cardBg} cardBorder={cardBorder} cardShadow={cardShadow}>
            <p style={{ fontSize: 12, color: hintColor, marginBottom: 10 }}>
              Used for weather and radar when GPS is off or denied.
            </p>
            <input
              type="text"
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
              placeholder="e.g. Seattle, WA"
              style={{
                width: "100%",
                background: inputBg,
                border: `1.5px solid ${inputBorder}`,
                borderRadius: 12,
                padding: "10px 12px",
                fontSize: 15,
                fontWeight: 600,
                color: inputText,
                outline: "none",
                marginBottom: 8,
              }}
            />
            {cityError && (
              <p style={{ fontSize: 12, color: "#EF4444", marginBottom: 8 }}>{cityError}</p>
            )}
            <button
              type="button"
              onClick={saveCity}
              disabled={citySaving || !cityQuery.trim()}
              style={{
                width: "100%",
                padding: "10px 0",
                borderRadius: 12,
                border: "none",
                background: ACCENT,
                color: "white",
                fontWeight: 700,
                fontSize: 14,
                cursor: citySaving ? "not-allowed" : "pointer",
                opacity: citySaving || !cityQuery.trim() ? 0.6 : 1,
                marginBottom: 8,
              }}
            >
              {citySaving ? "Saving…" : "Save city"}
            </button>
            <button
              type="button"
              onClick={saveGpsLocation}
              disabled={citySaving}
              style={{
                width: "100%",
                padding: "10px 0",
                borderRadius: 12,
                border: `1.5px solid ${inputBorder}`,
                background: inputBg,
                color: inputText,
                fontWeight: 700,
                fontSize: 14,
                cursor: citySaving ? "not-allowed" : "pointer",
                opacity: citySaving ? 0.6 : 1,
              }}
            >
              Use current location
            </button>
          </ThemedCard>
        </Section>

        {/* Units */}
        <Section title="Units" labelColor={sectionLabelColor}>
          <ThemedCard cardBg={cardBg} cardBorder={cardBorder} cardShadow={cardShadow}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: rowTextColor }}>Temperature</span>
              <PillToggle
                options={["F", "C"] as const}
                active={tempUnit}
                onSelect={(u) => setTempUnit(u)}
                format={(u) => `°${u}`}
                pillBg={pillBg}
                pillInactiveText={pillInactiveText}
                accentColor={ACCENT}
              />
            </div>
          </ThemedCard>
        </Section>

        {/* Display */}
        <Section title="Display" labelColor={sectionLabelColor}>
          <ThemedCard cardBg={cardBg} cardBorder={cardBorder} cardShadow={cardShadow}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontSize: 15, fontWeight: 600, color: rowTextColor }}>Outfit Style</span>
                <p style={{ fontSize: 12, color: hintColor, marginTop: 2 }}>
                  {displayMode === "text" ? "Text descriptions instead of illustrations" : "SVG clothing illustrations"}
                </p>
              </div>
              <PillToggle
                options={["visual", "text"] as const}
                active={displayMode}
                onSelect={(m) => setDisplayMode(m)}
                format={(m) => m === "visual" ? "Visual" : "Text Only"}
                pillBg={pillBg}
                pillInactiveText={pillInactiveText}
                accentColor={ACCENT}
              />
            </div>
          </ThemedCard>
        </Section>

        {/* Wardrobe style */}
        <Section title="Wardrobe Style" labelColor={sectionLabelColor}>
          <ThemedCard cardBg={cardBg} cardBorder={cardBorder} cardShadow={cardShadow}>
            <p style={{ fontSize: 15, fontWeight: 600, color: rowTextColor, marginBottom: 4 }}>Style Preference</p>
            <p style={{ fontSize: 12, color: hintColor, marginBottom: 12 }}>
              Filters the clothing drawings shown when you set up your wardrobes.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(
                [
                  { key: "feminine",  label: "Feminine",  desc: "Dresses, women's cuts, and shared styles" },
                  { key: "masculine", label: "Masculine",  desc: "Men's cuts and shared styles" },
                  { key: "all",       label: "Show All",   desc: "Every clothing option available" },
                ] as const
              ).map(({ key, label, desc }) => {
                const active = stylePreference === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStylePreference(key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      borderRadius: 14,
                      textAlign: "left",
                      background: active
                        ? isDark ? "var(--accent-surface)" : "var(--accent-tab-bg)"
                        : isDark ? "#3A3A3C" : "#F9FAFB",
                      border: `1.5px solid ${active ? "var(--accent-primary)" : isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6"}`,
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: active ? isDark ? "var(--accent-light)" : "var(--accent-primary)" : rowTextColor, margin: 0 }}>
                        {label}
                      </p>
                      <p style={{ fontSize: 12, color: isDark ? "#9BA4B4" : "#4B5563", margin: 0 }}>{desc}</p>
                    </div>
                    {active && <span style={{ color: isDark ? "var(--accent-light)" : "var(--accent-primary)", fontSize: 16 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </ThemedCard>
        </Section>

        {/* Outfit Formality */}
        <Section title="Outfit Formality" labelColor={sectionLabelColor}>
          <ThemedCard cardBg={cardBg} cardBorder={cardBorder} cardShadow={cardShadow}>
            <p style={{ fontSize: 15, fontWeight: 600, color: rowTextColor, marginBottom: 4 }}>Formality Level</p>
            <p style={{ fontSize: 12, color: hintColor, marginBottom: 12 }}>
              Shapes recommendations — activewear to business dressing.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(
                [
                  { key: "activewear", label: "Activewear",  desc: "Athletic fits, running gear, performance fabrics" },
                  { key: "casual",     label: "Casual",       desc: "Everyday relaxed outfits — the default" },
                  { key: "business",   label: "Business",     desc: "Office-ready, dress shoes, polished layers" },
                ] as const
              ).map(({ key, label, desc }) => {
                const active = formality === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormality(key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      borderRadius: 14,
                      textAlign: "left",
                      background: active
                        ? isDark ? "var(--accent-surface)" : "var(--accent-tab-bg)"
                        : isDark ? "#3A3A3C" : "#F9FAFB",
                      border: `1.5px solid ${active ? "var(--accent-primary)" : isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6"}`,
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: active ? isDark ? "var(--accent-light)" : "var(--accent-primary)" : rowTextColor, margin: 0 }}>
                        {label}
                      </p>
                      <p style={{ fontSize: 12, color: isDark ? "#9BA4B4" : "#4B5563", margin: 0 }}>{desc}</p>
                    </div>
                    {active && <span style={{ color: isDark ? "var(--accent-light)" : "var(--accent-primary)", fontSize: 16 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </ThemedCard>
          <p style={{ fontSize: 12, color: footnoteColor, marginTop: 6, paddingLeft: 4 }}>
            Saved with your profile. Tap Save below to apply.
          </p>
        </Section>

        {/* Appearance */}
        <Section title="Appearance" labelColor={sectionLabelColor}>
          <ThemedCard cardBg={cardBg} cardBorder={cardBorder} cardShadow={cardShadow}>
            <p style={{ fontSize: 15, fontWeight: 600, color: rowTextColor, marginBottom: 4 }}>Color Mode</p>
            <p style={{ fontSize: 12, color: hintColor, marginBottom: 12 }}>
              Override the system setting or let your phone decide.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(
                [
                  { key: "system", label: "Follow Phone", emoji: "📱", desc: "Matches your device's light/dark setting" },
                  { key: "light",  label: "Light",        emoji: "☀️",  desc: "Always use light mode" },
                  { key: "dark",   label: "Dark",         emoji: "🌙",  desc: "Always use dark mode" },
                ] as const
              ).map(({ key, label, emoji, desc }) => {
                const active = themePreference === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setThemePreference(key);
                      if (profile) {
                        setProfile({ ...profile, theme_preference: key === "system" ? null : key });
                      }
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                      borderRadius: 14, textAlign: "left",
                      background: active
                        ? isDark ? "var(--accent-surface)" : "var(--accent-tab-bg)"
                        : isDark ? "#3A3A3C" : "#F9FAFB",
                      border: `1.5px solid ${active ? "var(--accent-primary)" : isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6"}`,
                      cursor: "pointer", width: "100%",
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{emoji}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: active ? isDark ? "var(--accent-light)" : "var(--accent-primary)" : rowTextColor, margin: 0 }}>
                        {label}
                      </p>
                      <p style={{ fontSize: 12, color: isDark ? "#9BA4B4" : "#4B5563", margin: 0 }}>{desc}</p>
                    </div>
                    {active && <span style={{ color: isDark ? "var(--accent-light)" : "var(--accent-primary)", fontSize: 16 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </ThemedCard>
          <p style={{ fontSize: 12, color: footnoteColor, marginTop: 6, paddingLeft: 4 }}>
            Takes effect immediately. Saved with your profile.
          </p>
        </Section>

        {/* Theme */}
        <Section title="Theme" labelColor={sectionLabelColor}>
          <ThemedCard cardBg={cardBg} cardBorder={cardBorder} cardShadow={cardShadow}>
            <p style={{ fontSize: 15, fontWeight: 600, color: rowTextColor, marginBottom: 4 }}>Accent Color</p>
            <p style={{ fontSize: 12, color: hintColor, marginBottom: 14 }}>
              Personalizes highlights, buttons, and labels throughout the app.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 16 }}>
              {ACCENT_SWATCHES.map((swatch) => {
                const isSelected = accentColor === swatch.hex;
                return (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => {
                      setAccentColor(swatch.hex);
                      applyAccentPalette(swatch.hex);
                    }}
                    aria-label={swatch.label}
                    aria-pressed={isSelected}
                    style={{
                      aspectRatio: "1",
                      borderRadius: "50%",
                      background: swatch.hex,
                      border: isSelected
                        ? `3px solid ${isDark ? "#FFFFFF" : "#111827"}`
                        : "3px solid transparent",
                      cursor: "pointer",
                      transition: "transform 0.12s, border-color 0.12s",
                      transform: isSelected ? "scale(1.18)" : "scale(1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                    }}
                  >
                    {isSelected && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
            {/* Live preview strip */}
            <div style={{
              background: isDark ? Colors.dark.cellBg : "#F3F4F6",
              borderRadius: 14, padding: "12px 14px",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{
                background: accentColor, borderRadius: 10,
                padding: "6px 12px", color: "white",
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                NOW
              </div>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB", overflow: "hidden" }}>
                <div style={{ width: "65%", height: "100%", background: accentColor, borderRadius: 3 }} />
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: accentColor,
                borderBottom: `2px solid ${accentColor}`,
                paddingBottom: 2,
              }}>
                Active
              </span>
            </div>
          </ThemedCard>
        </Section>

        {/* Commute */}
        <Section title="Commute" labelColor={sectionLabelColor}>
          <ThemedCard cardBg={cardBg} cardBorder={cardBorder} cardShadow={cardShadow}>
            <TimeRow
              label="Morning departure"
              value={commuteStart}
              onChange={setCommuteStart}
              isDark={isDark}
              rowTextColor={rowTextColor}
              inputBg={inputBg}
              inputBorder={inputBorder}
              inputText={inputText}
            />
            <Divider dividerColor={dividerColor} />
            <TimeRow
              label="Evening return"
              value={commuteEnd}
              onChange={setCommuteEnd}
              isDark={isDark}
              rowTextColor={rowTextColor}
              inputBg={inputBg}
              inputBorder={inputBorder}
              inputText={inputText}
            />
          </ThemedCard>
          <p style={{ fontSize: 12, color: footnoteColor, marginTop: 6, paddingLeft: 4 }}>
            Layer Weather warns you about temperature drops during your commute.
          </p>
        </Section>

        {/* Calibration */}
        {calibration && (
          <Section title="Your Temperature Profile" labelColor={sectionLabelColor}>
            <ThemedCard cardBg={cardBg} cardBorder={cardBorder} cardShadow={cardShadow}>
              <CalibRow label="Shorts from" value={`${calibration.shorts_min_temp}°F`} labelColor={rowSecondaryColor} valueColor={rowTextColor} />
              <Divider dividerColor={dividerColor} />
              <CalibRow label="Light jacket below" value={`${calibration.light_jacket_max_temp}°F`} labelColor={rowSecondaryColor} valueColor={rowTextColor} />
              <Divider dividerColor={dividerColor} />
              <CalibRow label="Heavy coat below" value={`${calibration.heavy_coat_max_temp}°F`} labelColor={rowSecondaryColor} valueColor={rowTextColor} />
              <Divider dividerColor={dividerColor} />
              <CalibRow
                label="Thermal sensitivity"
                value={["Always Cold","Runs Cold","Average","Runs Warm","Always Warm"][calibration.thermal_sensitivity + 2]}
                labelColor={rowSecondaryColor}
                valueColor={rowTextColor}
              />
              <Divider dividerColor={dividerColor} />
              <CalibRow
                label="Rain tolerance"
                value={{ low: "Avoids rain", moderate: "Moderate", high: "Doesn't mind" }[calibration.rain_tolerance]}
                labelColor={rowSecondaryColor}
                valueColor={rowTextColor}
              />
            </ThemedCard>
            <button
              onClick={() => navigate("/onboarding")}
              style={{
                marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                background: "none",
                border: `1.5px solid ${ACCENT}`,
                borderRadius: 14,
                padding: "10px 0", width: "100%", color: ACCENT, fontWeight: 600, fontSize: 14, cursor: "pointer",
              }}
            >
              🔄 Recalibrate outfit preferences
            </button>
          </Section>
        )}

        {/* Today's Agenda */}
        <Section title="Today's Agenda" labelColor={sectionLabelColor}>
          <ThemedCard cardBg={cardBg} cardBorder={cardBorder} cardShadow={cardShadow} padding="p-3">
            <p style={{ fontSize: 12, color: hintColor, marginBottom: 10 }}>
              Set the event type so Layer Weather can tailor the outfit style.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(Object.entries(EVENT_TYPE_LABELS) as [EventType, typeof EVENT_TYPE_LABELS[EventType]][]).map(([key, info]) => {
                const active = eventType === key;
                return (
                  <button
                    key={key}
                    onClick={() => setEventType(key)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 12px", borderRadius: 14, textAlign: "left",
                      background: active
                        ? (isDark ? "var(--accent-surface)" : "var(--accent-tab-bg)")
                        : (isDark ? "#3A3A3C" : "#F9FAFB"),
                      border: `1.5px solid ${active ? "var(--accent-primary)" : (isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6")}`,
                      cursor: "pointer", width: "100%",
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{info.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: active ? (isDark ? "var(--accent-light)" : "var(--accent-primary)") : rowTextColor, margin: 0 }}>{info.label}</p>
                      {/* Description — #4B5563 on both light bg types (passes AA ✓) */}
                      <p style={{ fontSize: 12, color: isDark ? "#9BA4B4" : "#4B5563", margin: 0 }}>{info.description}</p>
                    </div>
                    {active && <span style={{ color: isDark ? "var(--accent-light)" : "var(--accent-primary)", fontSize: 16 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </ThemedCard>
        </Section>

        {/* Saved Locations */}
        {localSavedLocations.length > 0 && (
          <Section title="Saved Locations" labelColor={sectionLabelColor}>
            <ThemedCard cardBg={cardBg} cardBorder={cardBorder} cardShadow={cardShadow}>
              {localSavedLocations.map((loc, i) => (
                <div key={loc.city}>
                  {i > 0 && <Divider dividerColor={dividerColor} />}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>📍</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: rowTextColor }}>{loc.city}</span>
                      {loc.city === location?.city && (
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          color: isDark ? "var(--accent-light)" : "var(--accent-primary)",
                          background: isDark ? "var(--accent-surface)" : "var(--accent-tab-bg)",
                          padding: "2px 8px", borderRadius: 999,
                        }}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const updated = await removeSavedLocation(loc.city).catch(() => localSavedLocations);
                        setLocalSavedLocations(updated);
                        setSavedLocations(updated);
                      }}
                      aria-label={`Remove ${loc.city}`}
                      style={{
                        width: 32, height: 32, borderRadius: "50%",
                        border: "none",
                        background: isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2",
                        color: isDark ? "#F87171" : "#DC2626",
                        fontSize: 16, cursor: "pointer", display: "flex",
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </ThemedCard>
            <p style={{ fontSize: 12, color: footnoteColor, marginTop: 6, paddingLeft: 4 }}>
              Switch between locations from the Today tab. Max 5.
            </p>
          </Section>
        )}

        {/* App info */}
        <Section title="App" labelColor={sectionLabelColor}>
          <ThemedCard cardBg={cardBg} cardBorder={cardBorder} cardShadow={cardShadow}>
            <button
              type="button"
              onClick={() => navigate("/app/help")}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: isDark ? "rgba(99,102,241,0.18)" : "rgba(99,102,241,0.10)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16,
                  color: rowTextColor,
                }}>
                  ?
                </div>
                <span style={{ fontSize: 15, fontWeight: 600, color: rowTextColor }}>Help</span>
              </div>
              <span style={{ fontSize: 18, color: hintColor }}>›</span>
            </button>
            <Divider dividerColor={dividerColor} />
            <a
              href="/privacy"
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                textDecoration: "none", marginTop: 14, marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: isDark ? "rgba(99,102,241,0.18)" : "rgba(99,102,241,0.10)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14,
                }}>
                  🔒
                </div>
                <span style={{ fontSize: 15, fontWeight: 600, color: rowTextColor }}>Privacy Policy</span>
              </div>
              <span style={{ fontSize: 18, color: hintColor }}>›</span>
            </a>
            <Divider dividerColor={dividerColor} />
            <a
              href="/terms"
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                textDecoration: "none", marginTop: 14, marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: isDark ? "rgba(99,102,241,0.18)" : "rgba(99,102,241,0.10)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14,
                }}>
                  📄
                </div>
                <span style={{ fontSize: 15, fontWeight: 600, color: rowTextColor }}>Terms of Service</span>
              </div>
              <span style={{ fontSize: 18, color: hintColor }}>›</span>
            </a>
            <Divider dividerColor={dividerColor} />
            <a
              href="/eula"
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                textDecoration: "none", marginTop: 14, marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: isDark ? "rgba(99,102,241,0.18)" : "rgba(99,102,241,0.10)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14,
                }}>
                  📋
                </div>
                <span style={{ fontSize: 15, fontWeight: 600, color: rowTextColor }}>EULA</span>
              </div>
              <span style={{ fontSize: 18, color: hintColor }}>›</span>
            </a>
            <Divider dividerColor={dividerColor} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="20" fill="var(--accent-surface)" />
                  <circle cx="20" cy="20" r="7" fill="var(--accent-primary)" />
                  <line x1="20" y1="4" x2="20" y2="8" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="20" y1="32" x2="20" y2="36" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="4" y1="20" x2="8" y2="20" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="32" y1="20" x2="36" y2="20" stroke="var(--accent-primary)" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <span style={{ fontSize: 15, fontWeight: 700, color: rowTextColor, letterSpacing: "-0.01em" }}>Layer Weather</span>
              </div>
              {/* Version — #6B7280 on white (4.87:1 ✓); #9BA4B4 on dark card (5.0:1 ✓) */}
              <span style={{ fontSize: 12, color: hintColor }}>v1.0.0</span>
            </div>
          </ThemedCard>
        </Section>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={saveSettings}
            disabled={saving}
            style={{
              background: saved ? "#10B981" : ACCENT,
              color: "white", border: "none", borderRadius: 16,
              padding: "16px 0", fontSize: 16, fontWeight: 700,
              width: "100%", cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1, transition: "background 0.3s",
            }}
          >
            {saving ? "⟳ Saving…" : saved ? "✓ Saved!" : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => setSignOutModalOpen(true)}
            className="min-h-[44px] w-full bg-transparent border-0 text-[15px] font-semibold cursor-pointer"
            style={{ color: isDark ? "#F87171" : "#B91C1C" }}
          >
            Sign Out
          </button>
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="min-h-[44px] w-full bg-transparent border-0 text-[13px] font-medium cursor-pointer"
            style={{ color: isDark ? "#9BA4B4" : "#6B7280" }}
          >
            Delete Account
          </button>
        </div>

        <ConfirmModal
          open={signOutModalOpen}
          title="Sign Out"
          message="Are you sure you want to sign out of Layer Weather?"
          confirmLabel="Sign Out"
          cancelLabel="Cancel"
          onConfirm={() => { setSignOutModalOpen(false); handleSignOut(); }}
          onCancel={() => setSignOutModalOpen(false)}
          isDark={isDark}
        />

        <ConfirmModal
          open={deleteModalOpen}
          title="Delete Account"
          message="This will permanently delete your account and all your data — wardrobe, calibration, and preferences. This cannot be undone."
          confirmLabel="Continue"
          cancelLabel="Cancel"
          destructive
          onConfirm={() => {
            setDeleteModalOpen(false);
            setDeleteError(null);
            setDeleteConfirmModalOpen(true);
          }}
          onCancel={() => setDeleteModalOpen(false)}
          isDark={isDark}
        />

        <ConfirmModal
          open={deleteConfirmModalOpen}
          title="Last chance"
          message={
            deleteError
              ? `${DELETE_ACCOUNT_CONFIRM_MESSAGE}\n\n${deleteError}`
              : DELETE_ACCOUNT_CONFIRM_MESSAGE
          }
          confirmLabel={deleting ? "Deleting…" : "Delete Forever"}
          cancelLabel="Cancel"
          destructive
          actionsDisabled={deleting}
          onConfirm={() => {
            void handleDeleteAccount();
          }}
          onCancel={() => {
            setDeleteConfirmModalOpen(false);
            setDeleteError(null);
          }}
          isDark={isDark}
        />

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children, labelColor }: { title: string; children: React.ReactNode; labelColor: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: labelColor, letterSpacing: "0.1em", textTransform: "uppercase", paddingLeft: 4, margin: 0 }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function ThemedCard({
  children,
  cardBg,
  cardBorder,
  cardShadow,
  padding = "p-4",
}: {
  children: React.ReactNode;
  cardBg: string;
  cardBorder: string | undefined;
  cardShadow: string;
  padding?: string;
}) {
  return (
    <div
      className={`rounded-[20px] ${padding}`}
      style={{ background: cardBg, border: cardBorder, boxShadow: cardShadow }}
    >
      {children}
    </div>
  );
}

function Divider({ dividerColor }: { dividerColor: string }) {
  return <div style={{ height: 1, background: dividerColor, margin: "10px 0" }} />;
}

function PillToggle<T extends string>({
  options,
  active,
  onSelect,
  format,
  pillBg,
  pillInactiveText,
  accentColor,
}: {
  options: readonly T[];
  active: T;
  onSelect: (v: T) => void;
  format: (v: T) => string;
  pillBg: string;
  pillInactiveText: string;
  accentColor: string;
}) {
  return (
    <div className="flex rounded-full p-1 gap-0.5" style={{ background: pillBg }}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onSelect(o)}
          aria-pressed={active === o}
          className="min-h-[44px] min-w-[44px] px-4 rounded-full text-sm font-bold border-0 cursor-pointer transition-colors"
          style={{
            background: active === o ? accentColor : "transparent",
            color: active === o ? "white" : pillInactiveText,
          }}
        >
          {format(o)}
        </button>
      ))}
    </div>
  );
}

function TimeRow({
  label,
  value,
  onChange,
  isDark,
  rowTextColor,
  inputBg,
  inputBorder,
  inputText,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  isDark: boolean;
  rowTextColor: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontSize: 15, fontWeight: 600, color: rowTextColor, flex: 1 }}>{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: inputBg,
          border: `1.5px solid ${inputBorder}`,
          borderRadius: 12,
          padding: "6px 12px",
          fontSize: 14,
          fontWeight: 700,
          color: inputText,
          outline: "none",
          width: 100,
          textAlign: "center",
          colorScheme: isDark ? "dark" : "light",
        }}
      />
    </div>
  );
}

function CalibRow({ label, value, labelColor, valueColor }: { label: string; value: string; labelColor: string; valueColor: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 14, color: labelColor }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: valueColor }}>{value}</span>
    </div>
  );
}
