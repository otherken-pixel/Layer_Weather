import React from "react";
import type { CurrentWeather, DailyForecast } from "@/types";
import { CONDITION_LABEL } from "@/constants/colors";

const CONDITION_EMOJI: Record<string, string> = {
  clear: "☀️", partly_cloudy: "⛅", cloudy: "☁️", foggy: "🌫️",
  drizzle: "🌦️", rain: "🌧️", heavy_rain: "🌧️", snow: "❄️", thunderstorm: "⛈️",
};

function toUnit(f: number, unit: "F" | "C") {
  return unit === "C" ? Math.round(((f - 32) * 5) / 9) : Math.round(f);
}

interface Props {
  weather: CurrentWeather;
  today: DailyForecast | null;
  tempUnit: "F" | "C";
  onRefresh: () => void;
  onLocationPress?: () => void;
  isRefreshing?: boolean;
}

export function SkyHeader({ weather, today, tempUnit, onRefresh, onLocationPress, isRefreshing = false }: Props) {
  const temp = toUnit(weather.temp, tempUnit);
  const hiTemp = today ? toUnit(today.tempMax, tempUnit) : null;
  const loTemp = today ? toUnit(today.tempMin, tempUnit) : null;
  const locationLabel = weather.location || "Your Location";

  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 44px)",
        paddingBottom: 16,
        paddingLeft: 24,
        paddingRight: 24,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
      }}
    >
      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        aria-label="Refresh weather"
        aria-busy={isRefreshing}
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top, 0px) + 8px)",
          right: 16,
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "none",
          cursor: isRefreshing ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.2)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          opacity: isRefreshing ? 0.65 : 1,
          transition: "opacity 0.2s",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={isRefreshing ? "animate-spin" : undefined}
        >
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <polyline points="21 3 21 9 15 9" />
        </svg>
      </button>

      {onLocationPress ? (
        <button
          type="button"
          onClick={onLocationPress}
          className="truncate max-w-full px-12 text-center border-0 bg-transparent cursor-pointer"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "rgba(255,255,255,0.85)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
          title={`${locationLabel} — tap to change`}
          aria-label={`Location: ${locationLabel}. Tap to change.`}
        >
          {locationLabel}
        </button>
      ) : (
        <span
          className="truncate max-w-full px-12 text-center"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "rgba(255,255,255,0.85)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
          title={locationLabel}
        >
          {locationLabel}
        </span>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10 }}>
        <span style={{ fontSize: 72, lineHeight: 1, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.2))" }}>
          {CONDITION_EMOJI[weather.condition] ?? "🌤️"}
        </span>
        <span
          style={{
            fontSize: 96,
            fontWeight: 700,
            color: "white",
            lineHeight: 1,
            letterSpacing: "-4px",
            textShadow: "0 2px 16px rgba(0,0,0,0.15)",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
          }}
        >
          {temp}°
        </span>
      </div>

      <span style={{ fontSize: 17, fontWeight: 400, color: "rgba(255,255,255,0.9)", letterSpacing: "0.02em", marginTop: 4 }}>
        {CONDITION_LABEL[weather.condition]}
      </span>

      {hiTemp !== null && loTemp !== null && (
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", fontWeight: 400, marginTop: 2 }}>
          H: {hiTemp}° · L: {loTemp}°
        </span>
      )}
    </div>
  );
}
