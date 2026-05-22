import React from "react";
import { Card } from "@/components/ui/Card";
import type { CurrentWeather } from "@/types";

const CONDITION_EMOJI: Record<string, string> = {
  clear: "☀️", partly_cloudy: "⛅", cloudy: "☁️",
  foggy: "🌫️", drizzle: "🌦️", rain: "🌧️",
  heavy_rain: "⛈️", snow: "❄️", thunderstorm: "⛈️",
};

function convertTemp(f: number, unit: "F" | "C") {
  return unit === "C" ? Math.round(((f - 32) * 5) / 9) : Math.round(f);
}

interface WeatherWidgetProps {
  weather: CurrentWeather;
  tempUnit: "F" | "C";
}

export function WeatherWidget({ weather, tempUnit }: WeatherWidgetProps) {
  const temp = convertTemp(weather.temp, tempUnit);
  const feelsLike = convertTemp(weather.feelsLike, tempUnit);
  const emoji = CONDITION_EMOJI[weather.condition] ?? "🌤️";

  return (
    <Card>
      <div className="flex justify-between items-start">
        <div>
          {weather.location && (
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>
              {weather.location}
            </p>
          )}
          <div className="flex items-start gap-2">
            <span className="text-6xl font-black text-white leading-none" style={{ letterSpacing: "-2px" }}>
              {temp}°
            </span>
            <span className="text-4xl mt-1">{emoji}</span>
          </div>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>
            Feels like {feelsLike}°{tempUnit}
          </p>
        </div>
        <div className="flex flex-col gap-3 pt-2">
          <Stat label="Humidity" value={`${weather.humidity}%`} />
          <Stat label="Wind" value={`${weather.windSpeed} mph`} />
          <Stat label="Rain" value={`${weather.precipProb}%`} />
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold text-white">{value}</span>
      <span className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>{label}</span>
    </div>
  );
}
