import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { OutfitRecommendationCard } from "@/components/weather/OutfitRecommendation";
import { WeatherWidget } from "@/components/weather/WeatherWidget";
import { SkyHeader } from "@/components/weather/SkyHeader";
import { VectorLandscape } from "@/components/weather/VectorLandscape";
import { SevenDayCard } from "@/components/weather/SevenDayCard";
import { NowcastCard } from "@/components/weather/NowcastCard";
import { useWeather } from "@/hooks/useWeather";
import { useAppStore } from "@/store";
import { getSkyColor } from "@/constants/colors";
import { useCalendarContext } from "@/hooks/useCalendarContext";
import { EVENT_TYPE_LABELS } from "@/lib/calendar";
import { upsertProfile } from "@/lib/supabase";

const CONDITION_EMOJI: Record<string, string> = {
  clear: "☀️", partly_cloudy: "⛅", cloudy: "☁️", foggy: "🌫️",
  drizzle: "🌦️", rain: "🌧️", heavy_rain: "⛈️", snow: "❄️", thunderstorm: "⛈️",
};

function toUnit(f: number, unit: "F" | "C") {
  return unit === "C" ? Math.round(((f - 32) * 5) / 9) : Math.round(f);
}

export default function Home() {
  const { weather, outfit, isLoadingWeather, weatherError, refresh } = useWeather();
  const { profile, calibration, userId, setProfile } = useAppStore();
  const { eventType, styleHint } = useCalendarContext();
  const tempUnit = profile?.temp_unit ?? "F";

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, []);

  const skyColor = weather
    ? getSkyColor(weather.current.condition, weather.current.isDay)
    : "#1a1a2e";

  async function handleUnitChange(unit: "F" | "C") {
    if (!userId) return;
    setProfile({ ...(profile!), temp_unit: unit });
    upsertProfile(userId, { temp_unit: unit }).catch(console.error);
  }

  return (
    <div style={{ minHeight: "100%", background: skyColor, display: "flex", flexDirection: "column" }}>

      {/* Loading */}
      {isLoadingWeather && !weather && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 120 }}>
          <span style={{ fontSize: 56 }} className="animate-pulse">⛅</span>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 15 }}>Fetching your weather…</p>
        </div>
      )}

      {/* Error */}
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

      {/* Main content */}
      {weather && outfit && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", flex: 1 }}>

          <SkyHeader
            weather={weather.current}
            today={weather.daily[0] ?? null}
            tempUnit={tempUnit}
            onRefresh={() => refresh(true)}
          />

          <VectorLandscape skyColor={skyColor} isDay={weather.current.isDay} />

          {/* Cards area — overlaps landscape */}
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

            {/* Today's outfit */}
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

            {/* Current Conditions (2×2 grid, UV, unit toggle) */}
            <WeatherWidget
              weather={weather.current}
              tempUnit={tempUnit}
              onUnitChange={handleUnitChange}
            />

            {/* Nowcast — only when next-hour precip data exists */}
            {weather.nextHourPrecip && (
              <NowcastCard data={weather.nextHourPrecip} />
            )}

            {/* Hourly strip */}
            <HourlyStrip hourly={weather.hourly.slice(0, 12)} tempUnit={tempUnit} />

            {/* 7-Day forecast */}
            {weather.daily.length > 0 && (
              <SevenDayCard daily={weather.daily} tempUnit={tempUnit} />
            )}

          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Hourly Strip ──────────────────────────────────────────────────────────────

function HourlyStrip({
  hourly,
  tempUnit,
}: {
  hourly: { time: Date; feelsLike: number; weatherCode: number; precipProb: number }[];
  tempUnit: "F" | "C";
}) {
  return (
    <div style={{ background: "#FFFFFF", borderRadius: 24, padding: "20px", boxShadow: "0 2px 20px rgba(0,0,0,0.07)" }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
        Hourly Forecast
      </p>
      <div className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
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
              <span style={{ fontSize: 10, fontWeight: 600, color: isNow ? "rgba(255,255,255,0.75)" : "#3B82F6" }}>
                {h.precipProb}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
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
