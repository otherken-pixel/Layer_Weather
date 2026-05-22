import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { OutfitRecommendationCard } from "@/components/weather/OutfitRecommendation";
import { WeatherWidget } from "@/components/weather/WeatherWidget";
import { Card } from "@/components/ui/Card";
import { useWeather } from "@/hooks/useWeather";
import { useAppStore } from "@/store";
import { getWeatherGradient } from "@/constants/colors";
import { useCalendarContext } from "@/hooks/useCalendarContext";
import { EVENT_TYPE_LABELS } from "@/lib/calendar";

const CONDITION_EMOJI: Record<string, string> = {
  clear: "☀️", partly_cloudy: "⛅", cloudy: "☁️", foggy: "🌫️",
  drizzle: "🌦️", rain: "🌧️", heavy_rain: "⛈️", snow: "❄️", thunderstorm: "⛈️",
};

function wmoKey(code: number) {
  if (code === 0) return "clear"; if (code <= 2) return "partly_cloudy";
  if (code <= 3) return "cloudy"; if (code <= 48) return "foggy";
  if (code <= 57) return "drizzle"; if (code <= 67) return "rain";
  if (code <= 77) return "snow"; if (code <= 82) return "rain";
  return "thunderstorm";
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function Home() {
  const { weather, outfit, isLoadingWeather, weatherError, refresh } = useWeather();
  const { profile } = useAppStore();
  const { eventType, styleHint } = useCalendarContext();
  const tempUnit = profile?.temp_unit ?? "F";

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, []);

  const [g0, g1] = weather
    ? getWeatherGradient(weather.current.condition, weather.current.isDay, new Date().getHours())
    : ["#1a1a2e", "#16213e"];

  function convertTemp(f: number) {
    return tempUnit === "C" ? Math.round(((f - 32) * 5) / 9) : Math.round(f);
  }

  return (
    <div className="min-h-full px-5 py-6 pt-safe flex flex-col gap-4" style={{ background: `linear-gradient(to bottom, ${g0}, ${g1})` }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white" style={{ letterSpacing: "-0.5px" }}>
            {greeting()}, {profile?.display_name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>
            {format(new Date(), "EEEE, MMMM d")}
          </p>
        </div>
        <button
          onClick={() => refresh(true)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white"
          style={{ background: "rgba(255,255,255,0.15)" }}
        >
          🔄
        </button>
      </div>

      {/* Loading */}
      {isLoadingWeather && !weather && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="text-5xl animate-pulse">⛅</div>
          <p style={{ color: "rgba(255,255,255,0.65)" }}>Fetching your weather…</p>
        </div>
      )}

      {/* Error */}
      {weatherError && !weather && (
        <Card className="text-center" padding="p-6">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-white mb-4">{weatherError}</p>
          <button onClick={() => refresh(true)} className="px-5 py-2 rounded-full text-sm font-semibold text-white" style={{ background: "rgba(255,255,255,0.15)" }}>
            Try again
          </button>
        </Card>
      )}

      {/* Main */}
      {weather && outfit && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
          <OutfitRecommendationCard recommendation={outfit} tempUnit={tempUnit} feelsLike={weather.current.feelsLike} />

          {/* Calendar style hint */}
          {styleHint && eventType !== "default" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ background: "rgba(108,99,255,0.15)", border: "1px solid rgba(108,99,255,0.35)" }}
            >
              <span className="text-lg">{EVENT_TYPE_LABELS[eventType].emoji}</span>
              <p className="text-sm text-white flex-1">{styleHint}</p>
            </motion.div>
          )}

          <WeatherWidget weather={weather.current} tempUnit={tempUnit} />
          <HourlyStrip hourly={weather.hourly.slice(0, 12)} convertTemp={convertTemp} />
          <SignificantChanges hourly={weather.hourly.slice(0, 12)} currentFeelsLike={weather.current.feelsLike} />
        </motion.div>
      )}
    </div>
  );
}

function HourlyStrip({ hourly, convertTemp }: {
  hourly: { time: Date; feelsLike: number; weatherCode: number; precipProb: number }[];
  convertTemp: (f: number) => number;
}) {
  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.55)" }}>Next 12 Hours</p>
      <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {hourly.map((h, i) => (
          <div key={i} className="flex flex-col items-center gap-1 min-w-14 py-1">
            <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>
              {i === 0 ? "Now" : h.time.toLocaleTimeString("en", { hour: "numeric" })}
            </span>
            <span className="text-2xl">{CONDITION_EMOJI[wmoKey(h.weatherCode)] ?? "🌤️"}</span>
            <span className="text-sm font-bold text-white">{convertTemp(h.feelsLike)}°</span>
            {h.precipProb > 20 && <span className="text-xs" style={{ color: "#90CAF9" }}>{h.precipProb}%</span>}
          </div>
        ))}
      </div>
    </Card>
  );
}

function SignificantChanges({ hourly, currentFeelsLike }: {
  hourly: { time: Date; feelsLike: number }[];
  currentFeelsLike: number;
}) {
  const alerts: string[] = [];
  for (let i = 1; i < hourly.length && alerts.length < 2; i++) {
    const delta = hourly[i].feelsLike - currentFeelsLike;
    if (Math.abs(delta) >= 15) {
      const dir = delta < 0 ? "drops" : "rises";
      alerts.push(`Feels-like ${dir} ${Math.abs(Math.round(delta))}° by ${hourly[i].time.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}`);
    }
  }
  if (!alerts.length) return null;
  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.55)" }}>Heads Up</p>
      {alerts.map((a, i) => (
        <div key={i} className="flex items-center gap-2">
          <span>📉</span>
          <span className="text-sm text-white">{a}</span>
        </div>
      ))}
    </Card>
  );
}
