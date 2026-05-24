import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import type { DailyForecast, HourlyForecast } from "@/types";

const EMOJI: Record<string, string> = {
  clear: "☀️", partly_cloudy: "⛅", cloudy: "☁️", foggy: "🌫️",
  drizzle: "🌦️", rain: "🌧️", heavy_rain: "🌧️", snow: "❄️", thunderstorm: "⛈️",
};

function toUnit(f: number, unit: "F" | "C") {
  return unit === "C" ? Math.round(((f - 32) * 5) / 9) : Math.round(f);
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

interface Props {
  daily: DailyForecast[];
  tempUnit: "F" | "C";
  hourlyByDay?: Record<string, HourlyForecast[]>;
}

export function SevenDayCard({ daily, tempUnit, hourlyByDay }: Props) {
  const [selectedDay, setSelectedDay] = React.useState<number | null>(null);

  const allMin = Math.min(...daily.map((d) => toUnit(d.tempMin, tempUnit)));
  const allMax = Math.max(...daily.map((d) => toUnit(d.tempMax, tempUnit)));
  const range = allMax - allMin || 1;

  function toggleDay(i: number) {
    setSelectedDay((prev) => (prev === i ? null : i));
  }

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 24,
        padding: "20px",
        boxShadow: "0 2px 20px rgba(0,0,0,0.07)",
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#9CA3AF",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        7-Day Forecast
      </p>

      {daily.slice(0, 7).map((day, i) => {
        const lo = toUnit(day.tempMin, tempUnit);
        const hi = toUnit(day.tempMax, tempUnit);
        const barLeft = ((lo - allMin) / range) * 100;
        const barWidth = Math.max(((hi - lo) / range) * 100, 8);
        const highPrecip = day.precipProb >= 50;
        const isExpanded = selectedDay === i;
        const dayKey = localDateKey(day.date);
        const dayHourly = hourlyByDay?.[dayKey] ?? [];
        const hasHourly = dayHourly.length > 0;

        return (
          <div
            key={i}
            style={{
              borderBottom: i < daily.slice(0, 7).length - 1 ? "1px solid #F3F4F6" : "none",
            }}
          >
            {/* Day row — clickable */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggleDay(i)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggleDay(i)}
              style={{
                display: "flex",
                alignItems: "center",
                paddingTop: 10,
                paddingBottom: 10,
                cursor: hasHourly ? "pointer" : "default",
                borderRadius: 10,
                transition: "background 0.12s",
                marginLeft: -6,
                marginRight: -6,
                paddingLeft: 6,
                paddingRight: 6,
              }}
              onMouseEnter={(e) => {
                if (hasHourly) (e.currentTarget as HTMLDivElement).style.background = "#F9FAFB";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "transparent";
              }}
            >
              {/* Day name */}
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#374151",
                  width: 44,
                  flexShrink: 0,
                }}
              >
                {i === 0 ? "Today" : format(day.date, "EEE")}
              </span>

              {/* Weather icon */}
              <span style={{ fontSize: 20, width: 28, flexShrink: 0 }}>
                {EMOJI[day.condition] ?? "🌤️"}
              </span>

              {/* Precip % */}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: highPrecip ? "#6366F1" : "#3B82F6",
                  width: 34,
                  textAlign: "right",
                  flexShrink: 0,
                  opacity: day.precipProb > 10 ? 1 : 0,
                }}
              >
                {day.precipProb}%
              </span>

              {/* Temperature range bar */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginLeft: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    color: "#9CA3AF",
                    fontWeight: 500,
                    width: 30,
                    textAlign: "right",
                  }}
                >
                  {lo}°
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 5,
                    background: "#E5E7EB",
                    borderRadius: 3,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: `${barLeft}%`,
                      width: `${barWidth}%`,
                      height: "100%",
                      borderRadius: 3,
                      background: "linear-gradient(90deg, #3B82F6, #F97316)",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 14,
                    color: "#111827",
                    fontWeight: 700,
                    width: 30,
                  }}
                >
                  {hi}°
                </span>
              </div>

              {/* Chevron */}
              {hasHourly && (
                <motion.span
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    fontSize: 12,
                    color: "#9CA3AF",
                    marginLeft: 6,
                    flexShrink: 0,
                    display: "inline-block",
                  }}
                >
                  ›
                </motion.span>
              )}
            </div>

            {/* Expanded hourly strip */}
            <AnimatePresence initial={false}>
              {isExpanded && hasHourly && (
                <motion.div
                  key="hourly"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <HourlyDrillDown hourly={dayHourly} tempUnit={tempUnit} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ── Hourly drill-down strip ───────────────────────────────────────────────────

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

function HourlyDrillDown({
  hourly,
  tempUnit,
}: {
  hourly: HourlyForecast[];
  tempUnit: "F" | "C";
}) {
  return (
    <div
      style={{
        paddingBottom: 12,
        paddingTop: 4,
      }}
    >
      <div
        className="no-scrollbar"
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 2,
          paddingLeft: 2,
          paddingRight: 2,
        }}
      >
        {hourly.map((h, idx) => {
          const condKey = wmoToCondition(h.weatherCode);
          const showPrecip = h.precipProb > 5;
          return (
            <div
              key={idx}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                minWidth: 50,
                padding: "8px 5px",
                borderRadius: 14,
                flexShrink: 0,
                background: "#F3F4F6",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#6B7280",
                  textTransform: "uppercase",
                }}
              >
                {h.time.toLocaleTimeString("en", { hour: "numeric" })}
              </span>
              <span style={{ fontSize: 16 }}>{EMOJI[condKey] ?? "🌤️"}</span>
              <span
                style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}
              >
                {toUnit(h.feelsLike, tempUnit)}°
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#3B82F6",
                  opacity: showPrecip ? 1 : 0,
                }}
              >
                {h.precipProb}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
