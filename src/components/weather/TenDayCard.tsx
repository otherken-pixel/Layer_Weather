import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Sunrise, Sunset } from "lucide-react";
import type { DailyForecast, HourlyForecast } from "@/types";
import { WeatherIcon } from "@/components/weather/WeatherIcon";

function formatTime12(date: Date): string {
  return date.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
}

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
  isDark?: boolean;
}

export function TenDayCard({ daily, tempUnit, hourlyByDay, isDark = false }: Props) {
  const [selectedDay, setSelectedDay] = React.useState<number | null>(null);

  const allMin = Math.min(...daily.map((d) => toUnit(d.tempMin, tempUnit)));
  const allMax = Math.max(...daily.map((d) => toUnit(d.tempMax, tempUnit)));
  const range = allMax - allMin || 1;

  const cardBg = isDark ? "#2C2C2E" : "#FFFFFF";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : undefined;
  const cardShadow = isDark ? "0 2px 20px rgba(0,0,0,0.25)" : "0 2px 20px rgba(0,0,0,0.07)";
  const labelColor = isDark ? "#9BA4B4" : "#4B5563";
  const dayNameColor = isDark ? "#F4F4F5" : "#111827";
  const hiTempColor = isDark ? "#F4F4F5" : "#111827";
  // Lo temp — #4B5563 on white (7.4:1 ✓); #9BA4B4 on dark card (5.0:1 ✓)
  const loTempColor = isDark ? "#9BA4B4" : "#4B5563";
  const barTrackColor = isDark ? "#3A3A3C" : "#E5E7EB";
  const dividerColor = isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6";
  const chevronColor = isDark ? "#9BA4B4" : "#4B5563";
  const rowHoverBg = isDark ? "rgba(255,255,255,0.04)" : "#F9FAFB";
  // Precip % — #4338CA on white (9.5:1 ✓); #818CF8 on dark (5.5:1 ✓)
  const precipNormal = isDark ? "#60A5FA" : "#1D4ED8";
  const precipHigh = isDark ? "#818CF8" : "#4338CA";

  function toggleDay(i: number) {
    setSelectedDay((prev) => (prev === i ? null : i));
  }

  return (
    <div
      style={{
        background: cardBg,
        borderRadius: 24,
        padding: "20px",
        boxShadow: cardShadow,
        border: cardBorder,
      }}
    >
      <p
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: labelColor,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        10-Day Forecast
      </p>

      {daily.slice(0, 10).map((day, i) => {
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
              borderBottom: i < daily.slice(0, 10).length - 1 ? `1px solid ${dividerColor}` : "none",
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
                paddingTop: 13,
                paddingBottom: 13,
                cursor: hasHourly ? "pointer" : "default",
                borderRadius: 10,
                transition: "background 0.12s",
                marginLeft: -6,
                marginRight: -6,
                paddingLeft: 6,
                paddingRight: 6,
              }}
              onMouseEnter={(e) => {
                if (hasHourly) (e.currentTarget as HTMLDivElement).style.background = rowHoverBg;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "transparent";
              }}
            >
              {/* Day name */}
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: dayNameColor,
                  width: 60,
                  flexShrink: 0,
                }}
              >
                {i === 0 ? "Today" : format(day.date, "EEE")}
              </span>

              {/* Weather icon */}
              <WeatherIcon condition={day.condition} size="md" />

              {/* Precip % */}
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: highPrecip ? precipHigh : precipNormal,
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
                    fontSize: 16,
                    color: loTempColor,
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
                    height: 3,
                    background: barTrackColor,
                    borderRadius: 2,
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
                    fontSize: 16,
                    color: hiTempColor,
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
                    color: chevronColor,
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
                  <HourlyDrillDown
                    hourly={dayHourly}
                    tempUnit={tempUnit}
                    isDark={isDark}
                    sunrise={day.sunrise}
                    sunset={day.sunset}
                  />
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

function HourlyDrillDown({
  hourly,
  tempUnit,
  isDark,
  sunrise,
  sunset,
}: {
  hourly: HourlyForecast[];
  tempUnit: "F" | "C";
  isDark: boolean;
  sunrise?: Date;
  sunset?: Date;
}) {
  const pillBg = isDark ? "#3A3A3C" : "#F3F4F6";
  const timeColor = isDark ? "#9BA4B4" : "#4B5563";
  const tempColor = isDark ? "#F4F4F5" : "#111827";
  const precipColor = isDark ? "#60A5FA" : "#1D4ED8";
  const sunInfoColor = isDark ? "#9BA4B4" : "#6B7280";

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
          const condKey = h.condition;
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
                background: pillBg,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: timeColor,
                  textTransform: "uppercase",
                }}
              >
                {h.time.toLocaleTimeString("en", { hour: "numeric" })}
              </span>
              <WeatherIcon condition={condKey} size="sm" />
              <span style={{ fontSize: 15, fontWeight: 700, color: tempColor }}>
                {toUnit(h.feelsLike, tempUnit)}°
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: precipColor,
                  opacity: showPrecip ? 1 : 0,
                }}
              >
                {h.precipProb}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Sunrise / Sunset info row */}
      {(sunrise || sunset) && (
        <div style={{ display: "flex", gap: 16, paddingTop: 6, paddingLeft: 2 }}>
          {sunrise && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Sunrise size={13} color="rgba(255,193,7,1)" strokeWidth={2} aria-hidden="true" />
              <span style={{ fontSize: 12, fontWeight: 500, color: sunInfoColor }}>
                {formatTime12(sunrise)}
              </span>
            </div>
          )}
          {sunset && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Sunset size={13} color="rgba(255,120,50,1)" strokeWidth={2} aria-hidden="true" />
              <span style={{ fontSize: 12, fontWeight: 500, color: sunInfoColor }}>
                {formatTime12(sunset)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
