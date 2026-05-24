import React, { useEffect, useMemo, useState } from "react";
import type { CurrentWeather, DailyForecast } from "@/types";
import { CONDITION_LABEL } from "@/constants/colors";

const CONDITION_EMOJI: Record<string, string> = {
  clear: "☀️", partly_cloudy: "⛅", cloudy: "☁️", foggy: "🌫️",
  drizzle: "🌦️", rain: "🌧️", heavy_rain: "🌧️", snow: "❄️", thunderstorm: "⛈️",
};

function toUnit(f: number, unit: "F" | "C") {
  return unit === "C" ? Math.round(((f - 32) * 5) / 9) : Math.round(f);
}

function formatTime12(date: Date): string {
  return date.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
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

  const [sunNowMs, setSunNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!today) return;
    const update = () => setSunNowMs(Date.now());
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [today]);

  // Sunrise/sunset progress (0–1), recomputed as time advances
  const sunProgress = useMemo(() => {
    if (!today) return null;
    const now = sunNowMs;
    const rise = today.sunrise.getTime();
    const set = today.sunset.getTime();
    if (now < rise || now > set) return null;
    return (now - rise) / (set - rise);
  }, [today, sunNowMs]);

  const textShadow = "0 1px 8px rgba(0,0,0,0.55), 0 0 24px rgba(0,0,0,0.3)";

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
      {/* Refresh button */}
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
          width="20" height="20" viewBox="0 0 24 24"
          fill="none" stroke="white" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
          className={isRefreshing ? "animate-spin" : undefined}
        >
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <polyline points="21 3 21 9 15 9" />
        </svg>
      </button>

      {/* Location label */}
      {onLocationPress ? (
        <button
          type="button"
          onClick={onLocationPress}
          className="truncate max-w-full px-12 text-center border-0 bg-transparent cursor-pointer"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(255,255,255,0.9)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            textShadow,
          }}
          title={`${locationLabel} — tap to change`}
          aria-label={`Location: ${locationLabel}. Tap to change.`}
        >
          📍 {locationLabel}
        </button>
      ) : (
        <span
          className="truncate max-w-full px-12 text-center"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(255,255,255,0.9)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            textShadow,
          }}
        >
          📍 {locationLabel}
        </span>
      )}

      {/* Temperature + emoji row */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10 }}>
        <span style={{ fontSize: 64, lineHeight: 1, filter: "drop-shadow(0 3px 10px rgba(0,0,0,0.3))" }}>
          {CONDITION_EMOJI[weather.condition] ?? "🌤️"}
        </span>
        <span
          style={{
            fontSize: 96,
            fontWeight: 700,
            color: "white",
            lineHeight: 1,
            letterSpacing: "-4px",
            textShadow: "0 2px 20px rgba(0,0,0,0.25)",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
          }}
        >
          {temp}°
        </span>
      </div>

      {/* Condition label — pill so it's always readable over clouds */}
      <div
        style={{
          marginTop: 6,
          background: "rgba(0,0,0,0.28)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderRadius: 999,
          padding: "3px 14px",
          border: "1px solid rgba(255,255,255,0.18)",
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.95)" }}>
          {CONDITION_LABEL[weather.condition]}
        </span>
      </div>

      {/* H/L + sunrise/sunset row */}
      {hiTemp !== null && loTemp !== null && (
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 500, textShadow }}>
            H: {hiTemp}° · L: {loTemp}°
          </span>
          {today && (
            <>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>|</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", textShadow }}>
                🌅 {formatTime12(today.sunrise)}
              </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", textShadow }}>
                🌇 {formatTime12(today.sunset)}
              </span>
            </>
          )}
        </div>
      )}

      {/* Sun position progress bar */}
      {sunProgress !== null && (
        <div
          style={{
            marginTop: 8,
            width: "100%",
            maxWidth: 240,
            height: 3,
            background: "rgba(255,255,255,0.2)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.round(sunProgress * 100)}%`,
              background: "linear-gradient(90deg, #FFD700, #FF9500)",
              borderRadius: 2,
              transition: "width 2s ease",
            }}
          />
        </div>
      )}
    </div>
  );
}
