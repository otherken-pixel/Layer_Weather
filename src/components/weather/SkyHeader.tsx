import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ArrowUp, ArrowDown, Sunrise, Sunset, Clock } from "lucide-react";
import type { CurrentWeather, DailyForecast, HourlyForecast } from "@/types";
import { CONDITION_LABEL } from "@/constants/colors";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { SunMoonScrubber } from "@/components/weather/SunMoonScrubber";

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
  hourlyToday: HourlyForecast[];
  scrubHour: HourlyForecast | null;
  onScrubChange: (hour: HourlyForecast | null) => void;
}

export function SkyHeader({
  weather,
  today,
  tempUnit,
  onRefresh,
  onLocationPress,
  isRefreshing = false,
  hourlyToday,
  scrubHour,
  onScrubChange,
}: Props) {
  const isScrubbing = scrubHour !== null;

  const displayTemp = isScrubbing
    ? toUnit(scrubHour.temp, tempUnit)
    : toUnit(weather.temp, tempUnit);
  const displayCondition = isScrubbing ? scrubHour.condition : weather.condition;

  const hiTemp = today ? toUnit(today.tempMax, tempUnit) : null;
  const loTemp = today ? toUnit(today.tempMin, tempUnit) : null;
  const locationLabel = weather.location || "Your Location";

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
          top: "calc(env(safe-area-inset-top, 0px) + 44px + 4px)",
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
        <AnimatePresence mode="wait">
          <motion.div
            key={displayCondition}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <WeatherIcon condition={displayCondition} size="xl" color="white" />
          </motion.div>
        </AnimatePresence>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={displayTemp}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
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
            {displayTemp}°
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Condition label pill with live/scrub indicator */}
      <div style={{ marginTop: 6, ...frostedPill, padding: "4px 14px", display: "flex", alignItems: "center", gap: 7 }}>
        <AnimatePresence mode="wait">
          <motion.span
            key={displayCondition}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.95)" }}
          >
            {CONDITION_LABEL[displayCondition]}
          </motion.span>
        </AnimatePresence>

        {/* Live dot — only when not scrubbing */}
        <AnimatePresence>
          {!isScrubbing && (
            <motion.div
              key="live-dot"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#34C759",
                boxShadow: "0 0 4px rgba(52,199,89,0.7)",
                flexShrink: 0,
              }}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>
      </div>

      {/* H/L + sunrise/sunset pill  OR  scrubbed-time pill */}
      <AnimatePresence mode="wait">
        {isScrubbing ? (
          <motion.div
            key="scrub-pill"
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            style={{
              marginTop: 8,
              ...frostedPill,
              padding: "7px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Clock size={12} color="rgba(255,255,255,0.75)" strokeWidth={2.5} aria-hidden="true" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>
              {formatTime12(scrubHour.time)}
            </span>
            <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.25)" }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.65)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Forecast
            </span>
          </motion.div>
        ) : (
          hiTemp !== null && loTemp !== null && (
            <motion.div
              key="hl-pill"
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              style={{
                marginTop: 8,
                ...frostedPill,
                padding: "7px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <ArrowUp size={12} color="rgba(255,220,180,1)" strokeWidth={2.5} aria-hidden="true" />
                <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>
                  {hiTemp}°
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <ArrowDown size={12} color="rgba(180,220,255,1)" strokeWidth={2.5} aria-hidden="true" />
                <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>
                  {loTemp}°
                </span>
              </div>

              {today && (
                <>
                  <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.25)" }} />

                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Sunrise size={14} color="rgba(255,210,120,1)" strokeWidth={2.5} aria-hidden="true" />
                    <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>
                      {formatTime12(today.sunrise)}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Sunset size={14} color="rgba(255,160,80,1)" strokeWidth={2.5} aria-hidden="true" />
                    <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>
                      {formatTime12(today.sunset)}
                    </span>
                  </div>
                </>
              )}
            </motion.div>
          )
        )}
      </AnimatePresence>

      {/* Interactive sun/moon scrubber */}
      {today && hourlyToday.length > 0 && (
        <SunMoonScrubber
          hourlyToday={hourlyToday}
          today={today}
          onScrubChange={onScrubChange}
        />
      )}
    </div>
  );
}
