import React, { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { OutfitRecommendationCard } from "@/components/weather/OutfitRecommendation";
import { WeatherWidget } from "@/components/weather/WeatherWidget";
import { SkyHeader } from "@/components/weather/SkyHeader";
import { VectorLandscape } from "@/components/weather/VectorLandscape";
import { Card } from "@/components/ui/Card";
import { useWeather } from "@/hooks/useWeather";
import { useAppStore } from "@/store";
import { getSkyColor } from "@/constants/colors";
import { useCalendarContext } from "@/hooks/useCalendarContext";
import { EVENT_TYPE_LABELS } from "@/lib/calendar";
import { getOutfitRecommendation, DEFAULT_CALIBRATION } from "@/lib/outfit-logic";
import TShirt from "@/components/outfit/svg/TShirt";
import Jacket from "@/components/outfit/svg/Jacket";
import HeavyCoat from "@/components/outfit/svg/HeavyCoat";
import RainJacket from "@/components/outfit/svg/RainJacket";
import type { DailyForecast, OutfitType } from "@/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const CONDITION_EMOJI: Record<string, string> = {
  clear: "☀️", partly_cloudy: "⛅", cloudy: "☁️", foggy: "🌫️",
  drizzle: "🌦️", rain: "🌧️", heavy_rain: "⛈️", snow: "❄️", thunderstorm: "⛈️",
};

function toUnit(f: number, unit: "F" | "C") {
  return unit === "C" ? Math.round(((f - 32) * 5) / 9) : Math.round(f);
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const { weather, outfit, isLoadingWeather, weatherError, refresh } = useWeather();
  const { profile, calibration } = useAppStore();
  const { eventType, styleHint } = useCalendarContext();
  const tempUnit = profile?.temp_unit ?? "F";
  const cal = calibration ?? DEFAULT_CALIBRATION;

  const skyColor = weather
    ? getSkyColor(weather.current.condition, weather.current.isDay)
    : "#1a1a2e";

  return (
    <div style={{ minHeight: "100%", background: skyColor, display: "flex", flexDirection: "column" }}>
      {/* ── Loading ── */}
      {isLoadingWeather && !weather && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 120 }}>
          <span style={{ fontSize: 56 }} className="animate-pulse">⛅</span>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 15 }}>Fetching your weather…</p>
        </div>
      )}

      {/* ── Error ── */}
      {weatherError && !weather && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "120px 24px 24px" }}>
          <span style={{ fontSize: 48 }}>⚠️</span>
          <p style={{ color: "rgba(255,255,255,0.85)", textAlign: "center" }}>{weatherError}</p>
          <button
            onClick={() => refresh(true)}
            style={{ padding: "10px 24px", borderRadius: 999, background: "rgba(255,255,255,0.2)", border: "none", color: "white", fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      )}

      {/* ── Main content ── */}
      {weather && outfit && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {/* Sky header */}
          <SkyHeader
            weather={weather.current}
            today={weather.daily[0] ?? null}
            tempUnit={tempUnit}
            onRefresh={() => refresh(true)}
          />

          {/* Vector landscape */}
          <VectorLandscape skyColor={skyColor} isDay={weather.current.isDay} />

          {/* ── Cards area — overlaps landscape, scrolls upward ── */}
          <div style={{
            flex: 1,
            background: "#F2F2F7",
            borderRadius: "32px 32px 0 0",
            marginTop: -32,
            padding: "16px 14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}>
            {/* Today outfit */}
            <OutfitRecommendationCard
              recommendation={outfit}
              tempUnit={tempUnit}
              feelsLike={weather.current.feelsLike}
            />

            {/* Calendar style hint */}
            {styleHint && eventType !== "default" && (
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", borderRadius: 20,
                background: "#EDE9FE", border: "1px solid #C4B5FD",
              }}>
                <span style={{ fontSize: 18 }}>{EVENT_TYPE_LABELS[eventType].emoji}</span>
                <p style={{ fontSize: 13, color: "#5B21B6", flex: 1 }}>{styleHint}</p>
              </div>
            )}

            {/* Conditions */}
            <WeatherWidget
              weather={weather.current}
              tempUnit={tempUnit}
              hiTemp={weather.daily[0]?.tempMax}
              loTemp={weather.daily[0]?.tempMin}
            />

            {/* Hourly strip */}
            <HourlyStrip hourly={weather.hourly.slice(0, 12)} tempUnit={tempUnit} />

            {/* Week outfits (Option B: combined forecast + outfit per day) */}
            {weather.daily.length > 0 && (
              <WeekOutfitsCard daily={weather.daily} calibration={cal} tempUnit={tempUnit} />
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Hourly Strip (white card) ─────────────────────────────────────────────────

function HourlyStrip({ hourly, tempUnit }: {
  hourly: { time: Date; feelsLike: number; weatherCode: number; precipProb: number }[];
  tempUnit: "F" | "C";
}) {
  return (
    <Card mode="weather">
      <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
        Next 12 Hours
      </p>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
        {hourly.map((h, i) => {
          const isNow = i === 0;
          const condKey = wmoToCondition(h.weatherCode);
          return (
            <div
              key={i}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                minWidth: 52, padding: "10px 6px", borderRadius: 16, flexShrink: 0,
                background: isNow ? "#7C3AED" : "#F3F4F6",
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 600, color: isNow ? "rgba(255,255,255,0.8)" : "#9CA3AF", textTransform: "uppercase" }}>
                {isNow ? "Now" : h.time.toLocaleTimeString("en", { hour: "numeric" })}
              </span>
              <span style={{ fontSize: 18 }}>{CONDITION_EMOJI[condKey] ?? "🌤️"}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: isNow ? "white" : "#111827" }}>
                {toUnit(h.feelsLike, tempUnit)}°
              </span>
              {h.precipProb > 20 && (
                <span style={{ fontSize: 10, fontWeight: 600, color: isNow ? "rgba(255,255,255,0.75)" : "#3B82F6" }}>
                  {h.precipProb}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Week Outfits Card (Option B) ──────────────────────────────────────────────

function WeekOutfitsCard({ daily, calibration, tempUnit }: {
  daily: DailyForecast[];
  calibration: typeof DEFAULT_CALIBRATION;
  tempUnit: "F" | "C";
}) {
  const [selectedDay, setSelectedDay] = useState(0);
  const day = daily[selectedDay];

  const rec = getOutfitRecommendation({
    feelsLike: day.feelsLikeMin + (day.feelsLikeMax - day.feelsLikeMin) * 0.35,
    weatherCode: day.weatherCode,
    windSpeed: 10,
    precipProb: day.precipProb,
    humidity: 55,
    calibration,
    hourly: [],
  });

  return (
    <Card mode="weather">
      <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
        Week Ahead
      </p>

      {/* Day chip selector */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 16, paddingBottom: 2, scrollbarWidth: "none" }}>
        {daily.map((d, i) => {
          const active = selectedDay === i;
          const condKey = d.condition as string;
          return (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                minWidth: 54, padding: "9px 6px", borderRadius: 16, flexShrink: 0,
                background: active ? "#7C3AED" : "#F3F4F6",
                border: "none", cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 600, color: active ? "rgba(255,255,255,0.8)" : "#9CA3AF", textTransform: "uppercase" }}>
                {i === 0 ? "Today" : format(d.date, "EEE")}
              </span>
              <span style={{ fontSize: 18 }}>{CONDITION_EMOJI[condKey] ?? "🌤️"}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: active ? "white" : "#111827" }}>
                {toUnit(d.tempMax, tempUnit)}°
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected day outfit detail */}
      <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
          {/* Outfit icon */}
          <div style={{
            width: 72, height: 72, background: "#F9FAFB", borderRadius: 18,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <OutfitIconDark outfit={rec.outfit} rainGear={rec.rainGear} />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 3, lineHeight: 1.2 }}>{rec.label}</p>
            <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 6 }}>
              {CONDITION_EMOJI[day.condition] ?? "🌤️"}&nbsp;
              H: {toUnit(day.tempMax, tempUnit)}°&nbsp;·&nbsp;L: {toUnit(day.tempMin, tempUnit)}°
            </p>
            {day.precipProb > 20 && (
              <span style={{ fontSize: 11, fontWeight: 600, color: "#3B82F6", background: "#EFF6FF", padding: "2px 10px", borderRadius: 999 }}>
                {day.precipProb}% rain
              </span>
            )}
          </div>
        </div>

        <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.55 }}>{rec.description}</p>

        {/* Accessory pills */}
        {(rec.umbrella || rec.sunglasses || rec.scarf || rec.beanie) && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {rec.umbrella && <ChipPill label="Umbrella" emoji="☂️" color="#1D4ED8" bg="#EFF6FF" />}
            {rec.sunglasses && <ChipPill label="Sunglasses" emoji="🕶️" color="#92400E" bg="#FEF9C3" />}
            {rec.scarf && <ChipPill label="Scarf" emoji="🧣" color="#6B21A8" bg="#F3E8FF" />}
            {rec.beanie && <ChipPill label="Beanie" emoji="🧢" color="#166534" bg="#F0FDF4" />}
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ChipPill({ label, emoji, color, bg }: { label: string; emoji: string; color: string; bg: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color, background: bg, padding: "4px 10px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 4 }}>
      {emoji} {label}
    </span>
  );
}

function OutfitIconDark({ outfit, rainGear }: { outfit: OutfitType; rainGear: boolean }) {
  const stroke = "#374151";
  const sz = 40;
  if (outfit === "rain_light" || outfit === "rain_heavy") return <RainJacket stroke={stroke} size={sz} rainActive={rainGear} />;
  if (outfit === "heavy_coat") return <HeavyCoat stroke={stroke} size={sz} />;
  if (outfit === "heavy_jacket" || outfit === "light_jacket") return <Jacket stroke={stroke} size={sz} />;
  return <TShirt stroke={stroke} size={sz} />;
}

function wmoToCondition(code: number): string {
  if (code === 0) return "clear";
  if (code <= 2) return "partly_cloudy";
  if (code <= 3) return "cloudy";
  if (code <= 48) return "foggy";
  if (code <= 57) return "drizzle";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "rain";
  return "thunderstorm";
}
