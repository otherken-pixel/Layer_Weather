import React from "react";
import { Sunrise, Sunset } from "lucide-react";
import type { DailyForecast } from "@/types";

interface Props {
  daily: DailyForecast[];
  isDark: boolean;
}

const GOLDEN_MINUTES = 30;
const CIVIL_TWILIGHT_MINUTES = 30;

function timeLabel(d: Date): string {
  return d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
}

function addMinutes(d: Date, mins: number): Date {
  return new Date(d.getTime() + mins * 60 * 1000);
}

interface DaySegment {
  label: string;
  date: Date;
  sunrise: Date;
  sunset: Date;
}

export function SunriseSunsetCard({ daily, isDark }: Props) {
  const days: DaySegment[] = daily.slice(0, 2).map((d) => ({
    label: d.date.toLocaleDateString("en", { weekday: "short" }),
    date: d.date,
    sunrise: d.sunrise,
    sunset: d.sunset,
  }));

  if (days.length === 0) return null;

  const cardBg = isDark ? "#1C1C1E" : "#FFFFFF";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : undefined;
  const cardShadow = isDark ? "0 2px 20px rgba(0,0,0,0.25)" : "0 2px 20px rgba(0,0,0,0.07)";
  const labelColor = isDark ? "#9BA4B4" : "#6B7280";
  const textPrimary = isDark ? "#F4F4F5" : "#111827";
  const divider = isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6";

  return (
    <div style={{ background: cardBg, borderRadius: 20, padding: "14px 16px", boxShadow: cardShadow, border: cardBorder }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: labelColor, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
        Sunrise & Sunset
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {days.map((day, idx) => {
          const sr = day.sunrise;
          const ss = day.sunset;
          const dayStart = new Date(sr); dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(sr); dayEnd.setHours(23, 59, 59, 999);

          const totalMs = dayEnd.getTime() - dayStart.getTime();

          // Calculate segment positions as percentages
          const pct = (d: Date) => Math.max(0, Math.min(100, ((d.getTime() - dayStart.getTime()) / totalMs) * 100));

          const civilBeforeSunrise = addMinutes(sr, -CIVIL_TWILIGHT_MINUTES);
          const goldenAfterSunrise = addMinutes(sr, GOLDEN_MINUTES);
          const goldenBeforeSunset = addMinutes(ss, -GOLDEN_MINUTES);
          const civilAfterSunset = addMinutes(ss, CIVIL_TWILIGHT_MINUTES);

          const dayLength = ss.getTime() - sr.getTime();
          const hours = Math.floor(dayLength / 3600000);
          const mins = Math.floor((dayLength % 3600000) / 60000);

          return (
            <div key={idx}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>{idx === 0 ? "Today" : day.label}</span>
                <span style={{ fontSize: 11, color: labelColor }}>{hours}h {mins}m daylight</span>
              </div>

              {/* Timeline bar */}
              <div style={{ position: "relative", height: 18, borderRadius: 9, overflow: "hidden", background: isDark ? "#0F172A" : "#1E293B" }}>
                {/* Civil twilight before sunrise */}
                <div style={{
                  position: "absolute", top: 0, bottom: 0,
                  left: `${pct(civilBeforeSunrise)}%`,
                  width: `${pct(sr) - pct(civilBeforeSunrise)}%`,
                  background: "linear-gradient(90deg, transparent, #F59E0B55)",
                }} />
                {/* Golden hour morning */}
                <div style={{
                  position: "absolute", top: 0, bottom: 0,
                  left: `${pct(sr)}%`,
                  width: `${pct(goldenAfterSunrise) - pct(sr)}%`,
                  background: "#F59E0B88",
                }} />
                {/* Daylight */}
                <div style={{
                  position: "absolute", top: 0, bottom: 0,
                  left: `${pct(goldenAfterSunrise)}%`,
                  width: `${pct(goldenBeforeSunset) - pct(goldenAfterSunrise)}%`,
                  background: isDark ? "#FBBF24CC" : "#FCD34DCC",
                }} />
                {/* Golden hour evening */}
                <div style={{
                  position: "absolute", top: 0, bottom: 0,
                  left: `${pct(goldenBeforeSunset)}%`,
                  width: `${pct(ss) - pct(goldenBeforeSunset)}%`,
                  background: "#F59E0B88",
                }} />
                {/* Civil twilight after sunset */}
                <div style={{
                  position: "absolute", top: 0, bottom: 0,
                  left: `${pct(ss)}%`,
                  width: `${pct(civilAfterSunset) - pct(ss)}%`,
                  background: "linear-gradient(90deg, #F59E0B55, transparent)",
                }} />
              </div>

              {/* Time labels */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Sunrise size={16} color="rgba(255,210,120,1)" strokeWidth={2.5} aria-hidden="true" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: textPrimary }}>{timeLabel(sr)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: textPrimary }}>{timeLabel(ss)}</span>
                  <Sunset size={16} color="rgba(255,160,80,1)" strokeWidth={2.5} aria-hidden="true" />
                </div>
              </div>

              {/* Golden hour times */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 10, color: "#F59E0B" }}>Golden {timeLabel(sr)}–{timeLabel(goldenAfterSunrise)}</span>
                <span style={{ fontSize: 10, color: "#F59E0B" }}>{timeLabel(goldenBeforeSunset)}–{timeLabel(ss)}</span>
              </div>

              {idx < days.length - 1 && (
                <div style={{ height: 1, background: divider, marginTop: 10 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
