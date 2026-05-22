import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { WeatherAvatar } from "@/components/avatar/WeatherAvatar";
import { signOut, upsertProfile } from "@/lib/supabase";
import { useAppStore } from "@/store";

export default function Settings() {
  const navigate = useNavigate();
  const { profile, calibration, userId, setProfile } = useAppStore();
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
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  }

  async function handleSignOut() {
    if (!confirm("Are you sure you want to sign out?")) return;
    await signOut();
  }

  return (
    <div className="min-h-full px-5 py-6 pt-safe flex flex-col gap-6" style={{ background: "linear-gradient(to bottom,#1a1a2e,#16213e)" }}>
      {/* Profile header */}
      <div className="flex flex-col items-center gap-2 py-2">
        <WeatherAvatar outfit="pants_tshirt" condition="sunny" size={90} />
        <h2 className="text-2xl font-black text-white">{profile?.display_name ?? "Weather Enthusiast"}</h2>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{profile?.email}</p>
      </div>

      {/* Units */}
      <Section title="Units">
        <Card padding="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Temperature</span>
            <div className="flex gap-2">
              {(["F", "C"] as const).map(u => (
                <button key={u} onClick={() => setTempUnit(u)}
                  className="px-5 py-2 rounded-xl text-sm font-bold border transition-colors"
                  style={{ background: tempUnit === u ? "#6C63FF" : "rgba(255,255,255,0.08)", borderColor: tempUnit === u ? "#6C63FF" : "rgba(255,255,255,0.15)", color: "white" }}>
                  °{u}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </Section>

      {/* Commute */}
      <Section title="Commute">
        <Card padding="p-4">
          <TimeRow label="Morning departure" value={commuteStart} onChange={setCommuteStart} />
          <div className="h-px my-3" style={{ background: "rgba(255,255,255,0.08)" }} />
          <TimeRow label="Evening return" value={commuteEnd} onChange={setCommuteEnd} />
        </Card>
        <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>
          WearToday uses these times to warn you about temperature swings during your commute.
        </p>
      </Section>

      {/* Calibration */}
      {calibration && (
        <Section title="Outfit Calibration">
          <Card padding="p-4">
            <div className="flex flex-col gap-3">
              <CalibStat label="Shorts from" value={`${calibration.shorts_min_temp}°F`} />
              <CalibStat label="Light jacket below" value={`${calibration.light_jacket_max_temp}°F`} />
              <CalibStat label="Heavy coat below" value={`${calibration.heavy_coat_max_temp}°F`} />
              <CalibStat label="Thermal sensitivity" value={["Always cold","Runs cold","Average","Runs warm","Always warm"][calibration.thermal_sensitivity + 2]} />
            </div>
          </Card>
          <Button label="Recalibrate preferences" onPress={() => navigate("/onboarding")} variant="ghost" size="md" leftIcon={<span>🔄</span>} />
        </Section>
      )}

      <Button label={saved ? "✓ Saved!" : "Save Changes"} onPress={saveSettings} loading={saving} variant="primary" size="lg" fullWidth />
      <Button label="Sign Out" onPress={handleSignOut} variant="ghost" size="md" fullWidth />
      <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>WearToday v1.0.0</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.5)" }}>{title}</p>
      {children}
    </div>
  );
}

function TimeRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-white">{label}</span>
      <input type="time" value={value} onChange={e => onChange(e.target.value)}
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
