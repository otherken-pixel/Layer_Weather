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
  colorMode?: "dark" | "light";
}

export function WeatherWidget({ weather, tempUnit, colorMode = "dark" }: WeatherWidgetProps) {
  const temp = convertTemp(weather.temp, tempUnit);
  const feelsLike = convertTemp(weather.feelsLike, tempUnit);
  const emoji = CONDITION_EMOJI[weather.condition] ?? "🌤️";
  const isLight = colorMode === "light";
  const textPrimary = isLight ? "rgba(0,0,0,0.85)" : "#fff";
  const textSecondary = isLight ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.65)";
  const textMuted = isLight ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.55)";

  return (
    <Card mode={colorMode}>
      <div className="flex justify-between items-start">
        <div>
          {weather.location && (
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: textMuted }}>
              {weather.location}
            </p>
          )}
          <div className="flex items-start gap-2">
            <span className="text-6xl font-black leading-none" style={{ letterSpacing: "-2px", color: textPrimary }}>
              {temp}°
            </span>
            <span className="text-4xl mt-1">{emoji}</span>
          </div>
          <p className="text-sm mt-1" style={{ color: textSecondary }}>
            Feels like {feelsLike}°{tempUnit}
          </p>
        </div>
        <div className="flex flex-col gap-3 pt-2">
          <Stat label="Humidity" value={`${weather.humidity}%`} colorMode={colorMode} />
          <Stat label="Wind" value={`${weather.windSpeed} mph`} colorMode={colorMode} />
          <Stat label="Rain" value={`${weather.precipProb}%`} colorMode={colorMode} />
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value, colorMode = "dark" }: { label: string; value: string; colorMode?: "dark" | "light" }) {
  const isLight = colorMode === "light";
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold" style={{ color: isLight ? "rgba(0,0,0,0.85)" : "#fff" }}>{value}</span>
      <span className="text-xs" style={{ color: isLight ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.55)" }}>{label}</span>
    </div>
  );
}
