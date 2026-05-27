import React, { useEffect, useMemo, useState } from "react";
import { MapPin, ArrowUp, ArrowDown, Sunrise, Sunset } from "lucide-react";
import type { CurrentWeather, DailyForecast } from "@/types";
import { CONDITION_LABEL } from "@/constants/colors";
import { WeatherIcon } from "@/components/weather/WeatherIcon";

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

  const sunProgress = useMemo(() => {
    if (!today) return null;
    const now = sunNowMs;
    const rise = today.sunrise.getTime();
    const set = today.sunset.getTime();
    if (now < rise || now > set) return null;
    return (now - rise) / (set - rise);
  }, [today, sunNowMs]);

  const frostedPill = {
    background: "rgba(0,0,0,0.28)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
  } as const;

  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        paddingTop: "env(safe-area-inset-top, 44px)",
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
          top: "calc(env(safe-area-inset-top, 44px) + 4px)",
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
          className="max-w-full min-w-0 px-12 text-center border-0 bg-transparent cursor-pointer"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(255,255,255,0.9)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
          title={`${locationLabel} — tap to change`}
          aria-label={`Location: ${locationLabel}. Tap to change.`}
        >
          <MapPin className="shrink-0" size={12} color="rgba(255,255,255,0.9)" strokeWidth={2.5} aria-hidden="true" />
          <span className="truncate min-w-0">{locationLabel}</span>
        </button>
      ) : (
        <span
          className="max-w-full min-w-0 px-12 text-center"
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(255,255,255,0.9)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <MapPin className="shrink-0" size={12} color="rgba(255,255,255,0.9)" strokeWidth={2.5} aria-hidden="true" />
          <span className="truncate min-w-0">{locationLabel}</span>
        </span>
      )}

      {/* Weather icon + temperature */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
        <WeatherIcon condition={weather.condition} size="xl" color="white" />
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

      {/* Condition label pill */}
      <div style={{ marginTop: 6, ...frostedPill, padding: "3px 14px" }}>
        <span style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.95)" }}>
          {CONDITION_LABEL[weather.condition]}
        </span>
      </div>

      {/* H/L + sunrise/sunset — unified frosted pill */}
      {hiTemp !== null && loTemp !== null && (
        <div
          style={{
            marginTop: 8,
            ...frostedPill,
            padding: "7px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {/* High */}
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <ArrowUp size={12} color="rgba(255,220,180,1)" strokeWidth={2.5} aria-hidden="true" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>
              {hiTemp}°
            </span>
          </div>

          {/* Low */}
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <ArrowDown size={12} color="rgba(180,220,255,1)" strokeWidth={2.5} aria-hidden="true" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>
              {loTemp}°
            </span>
          </div>

          {today && (
            <>
              {/* Divider */}
              <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.25)" }} />

              {/* Sunrise */}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Sunrise size={14} color="rgba(255,210,120,1)" strokeWidth={2.5} aria-hidden="true" />
                <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>
                  {formatTime12(today.sunrise)}
                </span>
              </div>

              {/* Sunset */}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Sunset size={14} color="rgba(255,160,80,1)" strokeWidth={2.5} aria-hidden="true" />
                <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>
                  {formatTime12(today.sunset)}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Sun position progress bar with thumb */}
      {sunProgress !== null && (
        <div
          style={{
            marginTop: 10,
            width: "100%",
            maxWidth: 240,
            position: "relative",
            height: 16,
            display: "flex",
            alignItems: "center",
          }}
        >
          {/* Track */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 4,
              background: "rgba(255,255,255,0.25)",
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

          {/* Sun thumb */}
          <div
            style={{
              position: "absolute",
              left: `calc(${Math.round(sunProgress * 100)}% - 8px)`,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "radial-gradient(circle at 40% 40%, #FFF176, #FFD700 50%, #FF9500)",
              boxShadow: "0 0 6px 2px rgba(255,185,0,0.5), 0 1px 3px rgba(0,0,0,0.3)",
              transition: "left 2s ease",
              flexShrink: 0,
            }}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
