import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { useAppStore } from "@/store";
import { useDarkMode } from "@/hooks/useDarkMode";
import { groupHourlyByDay } from "@/lib/weather";
import { SevenDayCard } from "@/components/weather/SevenDayCard";
import { Colors } from "@/constants/colors";
import type { HourlyForecast } from "@/types";

function toUnit(f: number, unit: "F" | "C") {
  return unit === "C" ? Math.round(((f - 32) * 5) / 9) : Math.round(f);
}

function windDirLabel(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

interface ChartPoint {
  timeMs: number;
  label: string;
  dayLabel: string | null;
  temp: number;
  feelsLike: number;
  precipProb: number;
  windSpeed: number;
  windDir?: number;
  isDay: boolean;
}

function buildChartData(hourly: HourlyForecast[], tempUnit: "F" | "C"): ChartPoint[] {
  const next48 = hourly.slice(0, 48);
  let lastDay = "";
  return next48.map((h) => {
    const d = h.time;
    const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const isNewDay = dayKey !== lastDay;
    if (isNewDay) lastDay = dayKey;
    const hour = d.getHours();
    const ampm = hour < 12 ? "AM" : "PM";
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return {
      timeMs: d.getTime(),
      label: hour % 3 === 0 ? `${h12}${ampm}` : "",
      dayLabel: isNewDay ? d.toLocaleDateString("en", { weekday: "short" }) : null,
      temp: toUnit(h.temp, tempUnit),
      feelsLike: toUnit(h.feelsLike, tempUnit),
      precipProb: h.precipProb,
      windSpeed: Math.round(h.windSpeed),
      windDir: h.windDirection,
      isDay: h.isDay,
    };
  });
}

interface TooltipEntry { name?: string | number; value?: unknown; }

function CustomTooltip({ active, payload, label, tempUnit, isDark }: {
  active?: boolean;
  payload?: readonly TooltipEntry[];
  label?: unknown;
  tempUnit: "F" | "C";
  isDark: boolean;
}) {
  if (!active || !payload?.length || label == null) return null;
  const time = new Date(label as number).toLocaleTimeString("en", { weekday: "short", hour: "numeric", minute: "2-digit" });
  const bg = isDark ? "rgba(30,30,40,0.95)" : "rgba(255,255,255,0.97)";
  const border = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const text = isDark ? Colors.dark.textPrimary : "#111827";
  const muted = isDark ? Colors.dark.textMuted : "#6B7280";

  const temp = payload.find((p) => p.name === "temp");
  const precip = payload.find((p) => p.name === "precipProb");
  const wind = payload.find((p) => p.name === "windSpeed");

  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "10px 14px", fontSize: 13, color: text }}>
      <p style={{ fontWeight: 700, marginBottom: 6, color: muted }}>{time}</p>
      {temp && <p>{String(temp.value)}°{tempUnit}</p>}
      {precip && <p style={{ color: "#3B82F6" }}>{String(precip.value)}% rain</p>}
      {wind && <p style={{ color: muted }}>{String(wind.value)} mph wind</p>}
    </div>
  );
}


export default function Forecast() {
  const navigate = useNavigate();
  const { weather, profile } = useAppStore();
  const isDark = useDarkMode(profile?.theme_preference ?? null);
  const tempUnit = profile?.temp_unit ?? "F";

  const bg = isDark ? Colors.dark.pageBg : "#F2F2F7";
  const cardSurface = isDark ? Colors.dark.cardBg : "#FFFFFF";
  const textPrimary = isDark ? Colors.dark.textPrimary : "#111827";
  const textMuted = isDark ? Colors.dark.textMuted : "#6B7280";
  const border = isDark ? Colors.dark.border : "#E5E7EB";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const axisColor = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)";

  const chartData = useMemo(
    () => (weather ? buildChartData(weather.hourly, tempUnit) : []),
    [weather, tempUnit],
  );

  const hourlyByDay = useMemo(
    () => (weather ? groupHourlyByDay(weather.hourly, weather.daily) : {}),
    [weather],
  );

  const temps = chartData.map((d) => d.temp);
  const tempMin = temps.length ? Math.min(...temps) - 5 : 0;
  const tempMax = temps.length ? Math.max(...temps) + 5 : 100;

  const POINT_WIDTH = 28;
  const chartWidth = Math.max(chartData.length * POINT_WIDTH, 320);

  if (!weather) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "80px 24px", background: bg, minHeight: "100%" }}>
        <span style={{ fontSize: 40 }}>🌤️</span>
        <p style={{ color: textMuted, textAlign: "center" }}>No forecast data yet. Pull down to refresh on the Today tab.</p>
      </div>
    );
  }

  return (
    <div style={{ background: bg, minHeight: "100%", paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", paddingRight: 16, paddingBottom: 8, paddingLeft: 16 }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: textPrimary, fontSize: 22, lineHeight: 1, display: "flex" }}
        >
          ‹
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: textPrimary, margin: 0 }}>
            48-Hour Forecast
          </h1>
          {weather.current.location && (
            <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>{weather.current.location}</p>
          )}
        </div>
      </div>

      {/* Chart card */}
      <div style={{ margin: "8px 14px", background: cardSurface, borderRadius: 24, padding: "20px 0 12px", boxShadow: isDark ? "0 2px 20px rgba(0,0,0,0.25)" : "0 2px 20px rgba(0,0,0,0.07)", border: isDark ? `1px solid ${border}` : undefined, overflow: "hidden" }}>
        {/* Legend */}
        <div style={{ display: "flex", gap: 16, paddingLeft: 20, paddingBottom: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 24, height: 3, background: "var(--accent-primary)", borderRadius: 2 }} />
            <span style={{ fontSize: 11, color: textMuted, fontWeight: 600 }}>Temp</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 12, height: 12, background: "#3B82F6", borderRadius: 3, opacity: 0.7 }} />
            <span style={{ fontSize: 11, color: textMuted, fontWeight: 600 }}>Rain %</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 20, height: 2, background: "#94A3B8", borderRadius: 2, borderTop: "2px dashed #94A3B8" }} />
            <span style={{ fontSize: 11, color: textMuted, fontWeight: 600 }}>Wind</span>
          </div>
        </div>

        {/* Scrollable chart */}
        <div className="no-scrollbar" style={{ overflowX: "auto", overflowY: "hidden" }}>
          <div style={{ width: chartWidth, height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="timeMs"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  scale="time"
                  tickFormatter={(ms) => {
                    const d = new Date(ms);
                    const h = d.getHours();
                    if (h % 6 !== 0) return "";
                    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                    return `${h12}${h < 12 ? "a" : "p"}`;
                  }}
                  tick={{ fontSize: 10, fill: axisColor }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="temp"
                  domain={[tempMin, tempMax]}
                  hide
                />
                <YAxis
                  yAxisId="precip"
                  domain={[0, 100]}
                  hide
                />
                <Tooltip
                  content={(props) => (
                    <CustomTooltip
                      {...props}
                      tempUnit={tempUnit}
                      isDark={isDark}
                    />
                  )}
                />
                {/* Day boundary reference lines */}
                {chartData
                  .filter((d) => d.dayLabel !== null)
                  .map((d) => (
                    <ReferenceLine
                      key={d.timeMs}
                      yAxisId="temp"
                      x={d.timeMs}
                      stroke={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"}
                      strokeDasharray="3 3"
                      label={{ value: d.dayLabel ?? "", position: "insideTopLeft", fontSize: 10, fill: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)", fontWeight: 600 }}
                    />
                  ))}
                {/* Precipitation bars */}
                <Bar
                  yAxisId="precip"
                  dataKey="precipProb"
                  fill="#3B82F6"
                  fillOpacity={0.55}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={16}
                  isAnimationActive={false}
                />
                {/* Temperature area */}
                <Area
                  yAxisId="temp"
                  type="monotone"
                  dataKey="temp"
                  stroke="var(--accent-primary)"
                  strokeWidth={2}
                  fill="var(--accent-primary)"
                  fillOpacity={0.12}
                  dot={false}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
                {/* Wind speed line */}
                <Line
                  yAxisId="precip"
                  type="monotone"
                  dataKey="windSpeed"
                  stroke="#94A3B8"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Y-axis labels overlay */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 16px 0", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`, marginTop: 4 }}>
          <span style={{ fontSize: 10, color: textMuted }}>
            {tempMin + 5}°{tempUnit} low
          </span>
          <span style={{ fontSize: 10, color: textMuted }}>
            {tempMax - 5}°{tempUnit} high
          </span>
        </div>
      </div>

      {/* Wind summary strip */}
      {chartData.some((d) => d.windDir != null) && (
        <div style={{ margin: "0 14px 8px", background: cardSurface, borderRadius: 20, padding: "14px 16px", boxShadow: isDark ? "0 2px 12px rgba(0,0,0,0.2)" : "0 2px 12px rgba(0,0,0,0.05)", border: isDark ? `1px solid ${border}` : undefined }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
            Wind Direction
          </p>
          <div className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
            {chartData.filter((_, i) => i % 3 === 0).map((d) => (
              <div key={d.timeMs} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 44 }}>
                <div style={{ position: "relative", width: 28, height: 28 }}>
                  <svg viewBox="0 0 28 28" style={{ transform: `rotate(${d.windDir ?? 0}deg)`, width: 28, height: 28 }}>
                    <circle cx="14" cy="14" r="13" fill={isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)"} />
                    <polygon points="14,4 17,18 14,15 11,18" fill={isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.55)"} />
                  </svg>
                </div>
                <span style={{ fontSize: 10, color: textMuted, fontWeight: 600 }}>
                  {d.windDir != null ? windDirLabel(d.windDir) : "—"}
                </span>
                <span style={{ fontSize: 10, color: textMuted }}>
                  {(() => {
                    const h = new Date(d.timeMs).getHours();
                    return h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`;
                  })()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7-Day forecast */}
      {weather.daily.length > 0 && (
        <div style={{ margin: "0 14px" }}>
          <SevenDayCard
            daily={weather.daily}
            tempUnit={tempUnit}
            hourlyByDay={hourlyByDay}
            isDark={isDark}
          />
        </div>
      )}

      <p style={{ textAlign: "center", fontSize: 11, color: textMuted, padding: "12px 16px 4px" }}>
        {weather._source === "weatherkit"
          ? "Weather data provided by Apple Weather™"
          : "Weather data provided by Open-Meteo.com"}
      </p>
    </div>
  );
}
