import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Logo from "@/components/ui/Logo";
import { signOut, upsertProfile } from "@/lib/supabase";
import { useAppStore } from "@/store";
import { useCalendarContext } from "@/hooks/useCalendarContext";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/calendar";

export default function Settings() {
  const navigate = useNavigate();
  const { profile, calibration, userId, setProfile } = useAppStore();
  const { eventType, setEventType } = useCalendarContext();
  const [tempUnit, setTempUnit] = useState<"F" | "C">(profile?.temp_unit ?? "F");
  const [commuteStart, setCommuteStart] = useState(profile?.commute_start ?? "07:30");
  const [commuteEnd, setCommuteEnd] = useState(profile?.commute_end ?? "18:00");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    if (!confirm("Sign out of WearToday?")) return;
    await signOut();
  }

  const initials = profile?.display_name
    ? profile.display_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "W";

  return (
    <div
      className="min-h-full px-5 py-6 pt-safe flex flex-col gap-6"
      style={{ background: "linear-gradient(to bottom,#1a1a2e,#16213e)" }}
    >
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-3 py-4"
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black text-white"
          style={{ background: "linear-gradient(135deg,#6C63FF,#4A3FDB)", letterSpacing: "-0.02em" }}
        >
          {initials}
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black text-white" style={{ letterSpacing: "-0.02em" }}>
            {profile?.display_name ?? "Weather Enthusiast"}
          </h2>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{profile?.email}</p>
        </div>
      </motion.div>

      {/* Temperature units */}
      <Section title="Units">
        <Card padding="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Temperature</span>
            <div className="flex gap-2">
              {(["F", "C"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setTempUnit(u)}
                  className="px-5 py-2 rounded-xl text-sm font-bold border transition-all"
                  style={{
                    background: tempUnit === u ? "#6C63FF" : "rgba(255,255,255,0.08)",
                    borderColor: tempUnit === u ? "#6C63FF" : "rgba(255,255,255,0.15)",
                    color: "white",
                    boxShadow: tempUnit === u ? "0 2px 12px rgba(108,99,255,0.4)" : undefined,
                  }}
                >
                  °{u}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </Section>

      {/* Commute times */}
      <Section title="Commute">
        <Card padding="p-4">
          <TimeRow label="Morning departure" value={commuteStart} onChange={setCommuteStart} />
          <div className="h-px my-3" style={{ background: "rgba(255,255,255,0.08)" }} />
          <TimeRow label="Evening return" value={commuteEnd} onChange={setCommuteEnd} />
        </Card>
        <p className="text-xs mt-1.5 px-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          WearToday warns you about temperature drops during your commute.
        </p>
      </Section>

      {/* Calibration stats */}
      {calibration && (
        <Section title="Your Temperature Profile">
          <Card padding="p-4">
            <div className="flex flex-col gap-3">
              <CalibStat
                label="Shorts from"
                value={`${calibration.shorts_min_temp}°F`}
              />
              <CalibStat
                label="Light jacket below"
                value={`${calibration.light_jacket_max_temp}°F`}
              />
              <CalibStat
                label="Heavy coat below"
                value={`${calibration.heavy_coat_max_temp}°F`}
              />
              <CalibStat
                label="Thermal sensitivity"
                value={
                  ["Always Cold", "Runs Cold", "Average", "Runs Warm", "Always Warm"][
                    calibration.thermal_sensitivity + 2
                  ]
                }
              />
              <CalibStat
                label="Rain tolerance"
                value={
                  { low: "Avoids rain", moderate: "Moderate", high: "Doesn't mind rain" }[
                    calibration.rain_tolerance
                  ]
                }
              />
            </div>
          </Card>
          <Button
            label="Recalibrate preferences"
            onPress={() => navigate("/onboarding")}
            variant="ghost"
            size="md"
            leftIcon={<span>🔄</span>}
          />
        </Section>
      )}

      {/* Today's calendar context */}
      <Section title="Today's Agenda">
        <Card padding="p-4">
          <p className="text-xs mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>
            Set the event type for today so WearToday can tailor the outfit style.
          </p>
          <div className="flex flex-col gap-2">
            {(Object.entries(EVENT_TYPE_LABELS) as [EventType, typeof EVENT_TYPE_LABELS[EventType]][]).map(
              ([key, info]) => (
                <button
                  key={key}
                  onClick={() => setEventType(key)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                  style={{
                    background: eventType === key ? "rgba(108,99,255,0.25)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${eventType === key ? "rgba(108,99,255,0.6)" : "rgba(255,255,255,0.1)"}`,
                  }}
                >
                  <span className="text-xl">{info.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{info.label}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{info.description}</p>
                  </div>
                  {eventType === key && <span style={{ color: "#9D97FF" }}>✓</span>}
                </button>
              )
            )}
          </div>
        </Card>
      </Section>

      {/* About */}
      <Section title="App">
        <Card padding="p-4">
          <div className="flex items-center justify-between">
            <Logo size={22} />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              v1.0.0
            </span>
          </div>
        </Card>
      </Section>

      {/* Save + sign out */}
      <div className="flex flex-col gap-3 pb-4">
        <Button
          label={saved ? "✓ Saved!" : "Save Changes"}
          onPress={saveSettings}
          loading={saving}
          variant="primary"
          size="lg"
          fullWidth
        />
        <Button label="Sign Out" onPress={handleSignOut} variant="ghost" size="md" fullWidth />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-widest px-1" style={{ color: "rgba(255,255,255,0.5)" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function TimeRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-semibold text-white flex-1">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl px-3 py-2 text-sm font-bold text-white text-center outline-none border"
        style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)", width: 90 }}
      />
    </div>
  );
}

function CalibStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}
