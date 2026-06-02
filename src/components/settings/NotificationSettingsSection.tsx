import React, { useState, useEffect } from "react";
import type { NotificationPrefs, PollenAlertType } from "@/types/notification-prefs";
import { DEFAULT_NOTIF_PREFS, AQI_THRESHOLD_LABELS } from "@/types/notification-prefs";
import { loadNotifPrefs, saveNotifPrefs } from "@/lib/notification-prefs";
import { rescheduleAllNotifications } from "@/lib/local-notifications";
import { requestLocalNotificationPermission } from "@/lib/local-notifications";
import { useAppStore } from "@/store";
import { getPackingTrips } from "@/lib/supabase";

interface Props {
  isDark: boolean;
  cardBg: string;
  cardBorder: string | undefined;
  cardShadow: string;
  rowTextColor: string;
  hintColor: string;
  sectionLabelColor: string;
  dividerColor: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
}

interface SectionHeaderProps {
  title: string;
  labelColor: string;
}

function SectionLabel({ title, labelColor }: SectionHeaderProps) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, color: labelColor,
      letterSpacing: "0.1em", textTransform: "uppercase",
      paddingLeft: 4, margin: "0 0 8px 0",
    }}>
      {title}
    </p>
  );
}

interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  isDark: boolean;
  rowTextColor: string;
  hintColor: string;
  disabled?: boolean;
}

function ToggleRow({ label, description, value, onChange, isDark, rowTextColor, hintColor, disabled }: ToggleRowProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, opacity: disabled ? 0.5 : 1 }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: rowTextColor, margin: 0 }}>{label}</p>
        {description && <p style={{ fontSize: 12, color: hintColor, marginTop: 2 }}>{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        disabled={disabled}
        onClick={() => onChange(!value)}
        style={{
          width: 51, height: 31, borderRadius: 999, border: "none",
          background: value ? "var(--accent-primary)" : isDark ? "#636366" : "#D1D5DB",
          cursor: disabled ? "not-allowed" : "pointer",
          position: "relative", flexShrink: 0, transition: "background 0.2s",
        }}
      >
        <div style={{
          position: "absolute",
          top: 3, left: value ? 23 : 3,
          width: 25, height: 25, borderRadius: "50%",
          background: "white",
          boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
          transition: "left 0.2s",
        }} />
      </button>
    </div>
  );
}

interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  isDark: boolean;
  rowTextColor: string;
  hintColor: string;
}

function Stepper({ label, value, min, max, format, onChange, isDark, rowTextColor, hintColor }: StepperProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <p style={{ fontSize: 14, color: hintColor, margin: 0, flex: 1 }}>{label}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          style={{
            width: 32, height: 32, borderRadius: 8, border: "none",
            background: isDark ? "#3A3A3C" : "#F3F4F6",
            color: rowTextColor, fontWeight: 700, fontSize: 18,
            cursor: value <= min ? "not-allowed" : "pointer",
            opacity: value <= min ? 0.4 : 1,
          }}
        >
          −
        </button>
        <span style={{ fontSize: 14, fontWeight: 700, color: rowTextColor, minWidth: 32, textAlign: "center" }}>
          {format(value)}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          style={{
            width: 32, height: 32, borderRadius: 8, border: "none",
            background: isDark ? "#3A3A3C" : "#F3F4F6",
            color: rowTextColor, fontWeight: 700, fontSize: 18,
            cursor: value >= max ? "not-allowed" : "pointer",
            opacity: value >= max ? 0.4 : 1,
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

function Divider({ color }: { color: string }) {
  return <div style={{ height: 1, background: color, margin: "10px 0" }} />;
}

function Card({ children, cardBg, cardBorder, cardShadow }: { children: React.ReactNode; cardBg: string; cardBorder: string | undefined; cardShadow: string }) {
  return (
    <div style={{ background: cardBg, border: cardBorder, boxShadow: cardShadow, borderRadius: 20, padding: "16px 16px" }}>
      {children}
    </div>
  );
}

export default function NotificationSettingsSection({
  isDark, cardBg, cardBorder, cardShadow,
  rowTextColor, hintColor, sectionLabelColor,
  dividerColor, inputBg, inputBorder, inputText,
}: Props) {
  const { userId, profile } = useAppStore();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIF_PREFS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  useEffect(() => {
    loadNotifPrefs(profile?.notif_prefs).then(setPrefs).catch(() => {});
  }, [profile?.notif_prefs]);

  async function handleRequestPermission() {
    const granted = await requestLocalNotificationPermission();
    setPermissionGranted(granted);
  }

  useEffect(() => {
    requestLocalNotificationPermission().then(setPermissionGranted).catch(() => setPermissionGranted(false));
  }, []);

  async function handleSave(updated: NotificationPrefs) {
    setPrefs(updated);
    setSaving(true);
    try {
      await saveNotifPrefs(updated, userId);
      const city = profile?.last_city ?? "your location";
      const trips = userId ? await getPackingTrips(userId).catch(() => []) : [];
      await rescheduleAllNotifications({
        prefs: updated,
        commuteStart: profile?.commute_start ?? null,
        commuteEnd: profile?.commute_end ?? null,
        city,
        trips,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) {
    const updated = { ...prefs, [key]: value };
    void handleSave(updated);
  }

  const footerColor = isDark ? "#9BA4B4" : "#4B5563";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

      {/* Permission banner */}
      {permissionGranted === false && (
        <div style={{
          background: isDark ? "rgba(234,179,8,0.15)" : "rgba(234,179,8,0.1)",
          border: `1.5px solid ${isDark ? "rgba(234,179,8,0.4)" : "rgba(234,179,8,0.3)"}`,
          borderRadius: 16, padding: "12px 14px",
          display: "flex", flexDirection: "column", gap: 8,
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: isDark ? "#FDE68A" : "#92400E", margin: 0 }}>
            Notifications are off
          </p>
          <p style={{ fontSize: 12, color: isDark ? "#FCD34D" : "#92400E", margin: 0 }}>
            Layer Weather needs notification permission to deliver weather alerts, outfit briefings, and commute alerts.
          </p>
          <button
            type="button"
            onClick={handleRequestPermission}
            style={{
              background: "#EAB308", color: "white", border: "none",
              borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700,
              cursor: "pointer", alignSelf: "flex-start",
            }}
          >
            Enable Notifications
          </button>
        </div>
      )}

      {/* Tier 1 — Critical / Safety */}
      <div>
        <SectionLabel title="Safety Alerts" labelColor={sectionLabelColor} />
        <Card cardBg={cardBg} cardBorder={cardBorder} cardShadow={cardShadow}>
          <ToggleRow
            label="Severe Weather Alerts"
            description="NWS tornado, hurricane, flash flood, and storm warnings"
            value={prefs.severeWeatherAlerts}
            onChange={(v) => update("severeWeatherAlerts", v)}
            isDark={isDark} rowTextColor={rowTextColor} hintColor={hintColor}
          />
          <Divider color={dividerColor} />
          <ToggleRow
            label="Precipitation Nowcast"
            description="Rain starting or stopping in the next 20 minutes"
            value={prefs.precipNowcast}
            onChange={(v) => update("precipNowcast", v)}
            isDark={isDark} rowTextColor={rowTextColor} hintColor={hintColor}
          />
          <Divider color={dividerColor} />
          <ToggleRow
            label="Lightning Proximity Alert"
            description="When NOAA detects lightning strikes in your area"
            value={prefs.lightningAlerts}
            onChange={(v) => update("lightningAlerts", v)}
            isDark={isDark} rowTextColor={rowTextColor} hintColor={hintColor}
          />
        </Card>
        <p style={{ fontSize: 12, color: footerColor, marginTop: 6, paddingLeft: 4 }}>
          Safety alerts are always delivered even during quiet hours.
        </p>
      </div>

      {/* Tier 2 — Daily utility */}
      <div>
        <SectionLabel title="Daily Briefings" labelColor={sectionLabelColor} />
        <Card cardBg={cardBg} cardBorder={cardBorder} cardShadow={cardShadow}>
          <ToggleRow
            label="Morning Outfit Briefing"
            description="Sent 1 hour before your commute departure time"
            value={prefs.morningOutfitBriefing}
            onChange={(v) => update("morningOutfitBriefing", v)}
            isDark={isDark} rowTextColor={rowTextColor} hintColor={hintColor}
          />
          <Divider color={dividerColor} />
          <ToggleRow
            label="Evening Tomorrow Preview"
            description="Sent at 8 PM — plan tomorrow's outfit tonight"
            value={prefs.eveningTomorrowPreview}
            onChange={(v) => update("eveningTomorrowPreview", v)}
            isDark={isDark} rowTextColor={rowTextColor} hintColor={hintColor}
          />
          <Divider color={dividerColor} />
          <ToggleRow
            label="Commute Weather Alerts"
            description="30 minutes before your commute start and end"
            value={prefs.commuteWeatherAlert}
            onChange={(v) => update("commuteWeatherAlert", v)}
            isDark={isDark} rowTextColor={rowTextColor} hintColor={hintColor}
          />
        </Card>
        <p style={{ fontSize: 12, color: footerColor, marginTop: 6, paddingLeft: 4 }}>
          Set your commute times in the Commute section above.
        </p>
      </div>

      {/* Tier 3 — Health & environment */}
      <div>
        <SectionLabel title="Health & Environment" labelColor={sectionLabelColor} />
        <Card cardBg={cardBg} cardBorder={cardBorder} cardShadow={cardShadow}>
          {/* Air Quality */}
          <ToggleRow
            label="Air Quality Alerts"
            description="Notifies when AQI crosses your threshold"
            value={prefs.airQualityAlerts}
            onChange={(v) => update("airQualityAlerts", v)}
            isDark={isDark} rowTextColor={rowTextColor} hintColor={hintColor}
          />
          {prefs.airQualityAlerts && (
            <div style={{ marginTop: 10, paddingLeft: 0 }}>
              <p style={{ fontSize: 12, color: hintColor, marginBottom: 8 }}>
                Alert when AQI reaches: <strong style={{ color: rowTextColor }}>{AQI_THRESHOLD_LABELS[prefs.aqiThreshold]}</strong>
              </p>
              <Stepper
                label="AQI category"
                value={prefs.aqiThreshold}
                min={1} max={5}
                format={(v) => ["Good", "Moderate", "USG", "Unhealthy", "Very Unhealthy"][v - 1]}
                onChange={(v) => update("aqiThreshold", v as 1 | 2 | 3 | 4 | 5)}
                isDark={isDark} rowTextColor={rowTextColor} hintColor={hintColor}
              />
            </div>
          )}

          <Divider color={dividerColor} />

          {/* Pollen */}
          <ToggleRow
            label="High Pollen Alerts"
            description="Notifies on high/very high pollen days"
            value={prefs.pollenAlerts}
            onChange={(v) => update("pollenAlerts", v)}
            isDark={isDark} rowTextColor={rowTextColor} hintColor={hintColor}
          />
          {prefs.pollenAlerts && (
            <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["tree", "grass", "weed"] as PollenAlertType[]).map((type) => {
                const active = prefs.pollenTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      const next = active
                        ? prefs.pollenTypes.filter((t) => t !== type)
                        : [...prefs.pollenTypes, type];
                      if (next.length === 0) return;
                      update("pollenTypes", next);
                    }}
                    style={{
                      padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                      border: `1.5px solid ${active ? "var(--accent-primary)" : isDark ? "rgba(255,255,255,0.15)" : "#E5E7EB"}`,
                      background: active ? (isDark ? "var(--accent-surface)" : "var(--accent-tab-bg)") : (isDark ? "#3A3A3C" : "#F9FAFB"),
                      color: active ? (isDark ? "var(--accent-light)" : "var(--accent-primary)") : rowTextColor,
                      cursor: "pointer",
                    }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                );
              })}
            </div>
          )}

          <Divider color={dividerColor} />

          {/* UV */}
          <ToggleRow
            label="UV Index Alert"
            description="Notifies when UV index reaches your threshold"
            value={prefs.uvAlerts}
            onChange={(v) => update("uvAlerts", v)}
            isDark={isDark} rowTextColor={rowTextColor} hintColor={hintColor}
          />
          {prefs.uvAlerts && (
            <div style={{ marginTop: 10 }}>
              <Stepper
                label="UV threshold"
                value={prefs.uvThreshold}
                min={3} max={11}
                format={(v) => v >= 11 ? `${v} (Extreme)` : v >= 8 ? `${v} (Very High)` : v >= 6 ? `${v} (High)` : `${v} (Moderate)`}
                onChange={(v) => update("uvThreshold", v)}
                isDark={isDark} rowTextColor={rowTextColor} hintColor={hintColor}
              />
            </div>
          )}
        </Card>
      </div>

      {/* Tier 5 — Trip & planning */}
      <div>
        <SectionLabel title="Trip & Packing" labelColor={sectionLabelColor} />
        <Card cardBg={cardBg} cardBorder={cardBorder} cardShadow={cardShadow}>
          <ToggleRow
            label="Trip Weather Reminder"
            description="Night before a trip — check packing list and forecast"
            value={prefs.tripWeatherReminder}
            onChange={(v) => update("tripWeatherReminder", v)}
            isDark={isDark} rowTextColor={rowTextColor} hintColor={hintColor}
          />
          <Divider color={dividerColor} />
          <ToggleRow
            label="Trip Weather Change Alert"
            description="Notified if the forecast changes significantly after packing"
            value={prefs.tripWeatherChange}
            onChange={(v) => update("tripWeatherChange", v)}
            isDark={isDark} rowTextColor={rowTextColor} hintColor={hintColor}
          />
        </Card>
      </div>

      {/* Tier 6 — Engagement */}
      <div>
        <SectionLabel title="Engagement" labelColor={sectionLabelColor} />
        <Card cardBg={cardBg} cardBorder={cardBorder} cardShadow={cardShadow}>
          <ToggleRow
            label="Outfit Feedback Request"
            description="Evening prompt to rate today's recommendation"
            value={prefs.outfitFeedbackRequest}
            onChange={(v) => update("outfitFeedbackRequest", v)}
            isDark={isDark} rowTextColor={rowTextColor} hintColor={hintColor}
          />
          <Divider color={dividerColor} />
          <ToggleRow
            label="Weekly Weather Preview"
            description="Sunday evening: your week ahead at a glance"
            value={prefs.weeklyWeatherPreview}
            onChange={(v) => update("weeklyWeatherPreview", v)}
            isDark={isDark} rowTextColor={rowTextColor} hintColor={hintColor}
          />
        </Card>
      </div>

      {/* Quiet hours */}
      <div>
        <SectionLabel title="Quiet Hours" labelColor={sectionLabelColor} />
        <Card cardBg={cardBg} cardBorder={cardBorder} cardShadow={cardShadow}>
          <ToggleRow
            label="Enable Quiet Hours"
            description="Non-critical notifications are silenced during this window"
            value={prefs.quietHoursEnabled}
            onChange={(v) => update("quietHoursEnabled", v)}
            isDark={isDark} rowTextColor={rowTextColor} hintColor={hintColor}
          />
          {prefs.quietHoursEnabled && (
            <>
              <Divider color={dividerColor} />
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, color: hintColor, fontWeight: 600 }}>From</label>
                  <input
                    type="time"
                    value={prefs.quietHoursStart}
                    onChange={(e) => update("quietHoursStart", e.target.value)}
                    style={{
                      background: inputBg, border: `1.5px solid ${inputBorder}`,
                      borderRadius: 12, padding: "8px 12px",
                      fontSize: 15, fontWeight: 700, color: inputText, outline: "none",
                      colorScheme: isDark ? "dark" : "light",
                    }}
                  />
                </div>
                <span style={{ fontSize: 18, color: hintColor, marginTop: 20 }}>→</span>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, color: hintColor, fontWeight: 600 }}>To</label>
                  <input
                    type="time"
                    value={prefs.quietHoursEnd}
                    onChange={(e) => update("quietHoursEnd", e.target.value)}
                    style={{
                      background: inputBg, border: `1.5px solid ${inputBorder}`,
                      borderRadius: 12, padding: "8px 12px",
                      fontSize: 15, fontWeight: 700, color: inputText, outline: "none",
                      colorScheme: isDark ? "dark" : "light",
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </Card>
        <p style={{ fontSize: 12, color: footerColor, marginTop: 6, paddingLeft: 4 }}>
          Severe weather alerts always bypass quiet hours for your safety.
        </p>
      </div>

      {saving && (
        <p style={{ fontSize: 12, color: hintColor, textAlign: "center" }}>Saving preferences…</p>
      )}
      {saved && (
        <p style={{ fontSize: 12, color: isDark ? "#86EFAC" : "#15803D", textAlign: "center" }}>
          ✓ Notification settings saved
        </p>
      )}
    </div>
  );
}
