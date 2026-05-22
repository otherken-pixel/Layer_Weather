import React from "react";
import { format } from "date-fns";
import { Card } from "@/components/ui/Card";
import { WeatherAvatar } from "@/components/avatar/WeatherAvatar";
import { useWeather } from "@/hooks/useWeather";
import { useAppStore } from "@/store";
import { getOutfitRecommendation, DEFAULT_CALIBRATION } from "@/lib/outfit-logic";
import type { DailyForecast } from "@/types";

const CONDITION_EMOJI: Record<string, string> = {
  clear: "☀️", partly_cloudy: "⛅", cloudy: "☁️", foggy: "🌫️",
  drizzle: "🌦️", rain: "🌧️", heavy_rain: "⛈️", snow: "❄️", thunderstorm: "⛈️",
};

export default function Forecast() {
  const { weather } = useWeather();
  const { profile, calibration } = useAppStore();
  const tempUnit = profile?.temp_unit ?? "F";
  const cal = calibration ?? DEFAULT_CALIBRATION;

  function convertTemp(f: number) {
    return tempUnit === "C" ? Math.round(((f - 32) * 5) / 9) : Math.round(f);
  }

  return (
    <div className="min-h-full px-5 py-6 pt-safe flex flex-col gap-4" style={{ background: "linear-gradient(to bottom,#1a1a2e,#16213e)" }}>
      <div>
        <h1 className="text-3xl font-black text-white" style={{ letterSpacing: "-0.5px" }}>7-Day Forecast</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>Outfit picks for the week ahead</p>
      </div>

      {!weather && (
        <div className="flex justify-center py-20">
          <div className="text-5xl animate-pulse">📅</div>
        </div>
      )}

      {weather?.daily.map((day, i) => (
        <DayCard key={i} day={day} calibration={cal} convertTemp={convertTemp} isToday={i === 0} />
      ))}
    </div>
  );
}

function DayCard({ day, calibration, convertTemp, isToday }: {
  day: DailyForecast;
  calibration: typeof DEFAULT_CALIBRATION;
  convertTemp: (f: number) => number;
  isToday: boolean;
}) {
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
    <Card padding="p-4">
      <div className="flex items-center gap-3">
        {/* Date */}
        <div className="w-14 flex-shrink-0">
          <p className="text-sm font-bold" style={{ color: isToday ? "#9D97FF" : "white" }}>
            {isToday ? "Today" : format(day.date, "EEE")}
          </p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{format(day.date, "MMM d")}</p>
        </div>

        {/* Mini avatar */}
        <div className="flex-shrink-0">
          <WeatherAvatar outfit={rec.outfit} condition={rec.avatarCondition} umbrella={rec.umbrella} size={72} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{rec.label}</p>
          <p className="text-sm">{CONDITION_EMOJI[day.condition] ?? "🌤️"}{day.precipProb > 20 && <span style={{ color: "#90CAF9" }}> {day.precipProb}% rain</span>}</p>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-black text-white">{convertTemp(day.feelsLikeMax)}°</span>
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>/ {convertTemp(day.feelsLikeMin)}°</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
