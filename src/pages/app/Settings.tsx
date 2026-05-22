import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { signOut, upsertProfile } from "@/lib/supabase";
import { useAppStore } from "@/store";
import { useCalendarContext } from "@/hooks/useCalendarContext";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/calendar";

const ACCENT = "#7C3AED";

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
      const updated = await upsertProfile(userId, { temp_unit: tempUnit, commute_start: commuteStart, commute_end: commuteEnd });
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
    <div style={{ minHeight: "100%", background: "#F2F2F7", display: "flex", flexDirection: "column" }}>

      {/* ── Profile header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "#F2F2F7",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 36px)",
          paddingBottom: 24,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        }}
      >
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "linear-gradient(135deg,#7C3AED,#4A3FDB)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, fontWeight: 900, color: "white", letterSpacing: "-0.02em",
        }}>
          {initials}
        </div>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em", margin: 0 }}>
            {profile?.display_name ?? "Weather Enthusiast"}
          </h2>
          <p style={{ fontSize: 14, color: "#9CA3AF", marginTop: 2 }}>{profile?.email}</p>
        </div>
      </motion.div>

      {/* ── Sections ── */}
      <div style={{ flex: 1, padding: "0 14px 32px", display: "flex", flexDirection: "column", gap: 22 }}>

        {/* Units */}
        <Section title="Units">
          <WhiteCard>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>Temperature</span>
              <PillToggle
                options={["F", "C"] as const}
                active={tempUnit}
                onSelect={(u) => setTempUnit(u)}
                format={(u) => `°${u}`}
              />
            </div>
          </WhiteCard>
        </Section>

        {/* Commute */}
        <Section title="Commute">
          <WhiteCard>
            <TimeRow label="Morning departure" value={commuteStart} onChange={setCommuteStart} />
            <Divider />
            <TimeRow label="Evening return" value={commuteEnd} onChange={setCommuteEnd} />
          </WhiteCard>
          <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6, paddingLeft: 4 }}>
            WearToday warns you about temperature drops during your commute.
          </p>
        </Section>

        {/* Calibration */}
        {calibration && (
          <Section title="Your Temperature Profile">
            <WhiteCard>
              <CalibRow label="Shorts from" value={`${calibration.shorts_min_temp}°F`} />
              <Divider />
              <CalibRow label="Light jacket below" value={`${calibration.light_jacket_max_temp}°F`} />
              <Divider />
              <CalibRow label="Heavy coat below" value={`${calibration.heavy_coat_max_temp}°F`} />
              <Divider />
              <CalibRow
                label="Thermal sensitivity"
                value={["Always Cold","Runs Cold","Average","Runs Warm","Always Warm"][calibration.thermal_sensitivity + 2]}
              />
              <Divider />
              <CalibRow
                label="Rain tolerance"
                value={{ low: "Avoids rain", moderate: "Moderate", high: "Doesn't mind" }[calibration.rain_tolerance]}
              />
            </WhiteCard>
            <button
              onClick={() => navigate("/onboarding")}
              style={{
                marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                background: "none", border: `1.5px solid ${ACCENT}`, borderRadius: 14,
                padding: "10px 0", width: "100%", color: ACCENT, fontWeight: 600, fontSize: 14, cursor: "pointer",
              }}
            >
              🔄 Recalibrate preferences
            </button>
          </Section>
        )}

        {/* Today's Agenda */}
        <Section title="Today's Agenda">
          <WhiteCard padding="p-3">
            <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 10 }}>
              Set the event type so WearToday can tailor the outfit style.
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
                      background: active ? "#EDE9FE" : "#F9FAFB",
                      border: `1.5px solid ${active ? ACCENT : "#F3F4F6"}`,
                      cursor: "pointer", width: "100%",
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{info.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: active ? ACCENT : "#111827", margin: 0 }}>{info.label}</p>
                      <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>{info.description}</p>
                    </div>
                    {active && <span style={{ color: ACCENT, fontSize: 16 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </WhiteCard>
        </Section>

        {/* App info */}
        <Section title="App">
          <WhiteCard>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="20" fill="rgba(124,58,237,0.15)" />
                  <circle cx="20" cy="20" r="7" fill="#7C3AED" />
                  <line x1="20" y1="4" x2="20" y2="8" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="20" y1="32" x2="20" y2="36" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="4" y1="20" x2="8" y2="20" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="32" y1="20" x2="36" y2="20" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#111827", letterSpacing: "-0.01em" }}>WearToday</span>
              </div>
              <span style={{ fontSize: 12, color: "#9CA3AF" }}>v1.0.0</span>
            </div>
          </WhiteCard>
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
            onClick={handleSignOut}
            className="min-h-[44px] w-full bg-transparent border-0 text-red-500 text-[15px] font-semibold cursor-pointer"
          >
            Sign Out
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", paddingLeft: 4, margin: 0 }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function WhiteCard({ children, padding = "p-4" }: { children: React.ReactNode; padding?: string }) {
  void padding;
  return (
    <div style={{ background: "#FFFFFF", borderRadius: 20, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "#F3F4F6", margin: "10px 0" }} />;
}

function PillToggle<T extends string>({ options, active, onSelect, format }: {
  options: readonly T[];
  active: T;
  onSelect: (v: T) => void;
  format: (v: T) => string;
}) {
  return (
    <div className="flex bg-neutral-100 rounded-full p-1 gap-0.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onSelect(o)}
          aria-pressed={active === o}
          className={`min-h-[44px] min-w-[44px] px-4 rounded-full text-sm font-bold border-0 cursor-pointer transition-colors ${
            active === o ? "text-white" : "text-neutral-600"
          }`}
          style={{ background: active === o ? ACCENT : "transparent" }}
        >
          {format(o)}
        </button>
      ))}
    </div>
  );
}

function TimeRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontSize: 15, fontWeight: 600, color: "#111827", flex: 1 }}>{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: "#F3F4F6", border: "1.5px solid #E5E7EB", borderRadius: 12,
          padding: "6px 12px", fontSize: 14, fontWeight: 700, color: "#111827",
          outline: "none", width: 100, textAlign: "center", colorScheme: "light",
        }}
      />
    </div>
  );
}

function CalibRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 14, color: "#6B7280" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{value}</span>
    </div>
  );
}
