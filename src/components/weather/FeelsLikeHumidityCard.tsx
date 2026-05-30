import React from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartPoint {
  timeMs: number;
  feelsLike: number;
  humidity?: number;
}

interface Props {
  chartData: ChartPoint[];
  tempUnit: "F" | "C";
  isDark: boolean;
}

export function FeelsLikeHumidityCard({ chartData, tempUnit, isDark }: Props) {
  const hasHumidity = chartData.some((d) => d.humidity != null);

  const cardBg = isDark ? "#1C1C1E" : "#FFFFFF";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : undefined;
  const cardShadow = isDark ? "0 2px 20px rgba(0,0,0,0.25)" : "0 2px 20px rgba(0,0,0,0.07)";
  const labelColor = isDark ? "#9BA4B4" : "#6B7280";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const axisColor = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)";
  const tooltipBg = isDark ? "rgba(30,30,40,0.95)" : "rgba(255,255,255,0.97)";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const tooltipText = isDark ? "#F4F4F5" : "#111827";

  const POINT_WIDTH = 28;
  const chartWidth = Math.max(chartData.length * POINT_WIDTH, 320);

  const temps = chartData.map((d) => d.feelsLike);
  const tMin = temps.length ? Math.min(...temps) - 4 : 0;
  const tMax = temps.length ? Math.max(...temps) + 4 : 100;

  return (
    <div style={{ background: cardBg, borderRadius: 20, padding: "14px 0 10px", boxShadow: cardShadow, border: cardBorder }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: labelColor, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10, paddingLeft: 16 }}>
        Feels Like {hasHumidity ? "& Humidity" : ""}
      </p>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, paddingLeft: 16, paddingBottom: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 20, height: 2, background: "var(--accent-primary)", borderRadius: 2 }} />
          <span style={{ fontSize: 11, color: labelColor, fontWeight: 600 }}>Feels Like</span>
        </div>
        {hasHumidity && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 20, height: 2, background: "#3B82F6", borderRadius: 2 }} />
            <span style={{ fontSize: 11, color: labelColor, fontWeight: 600 }}>Humidity %</span>
          </div>
        )}
      </div>

      <div className="no-scrollbar" style={{ overflowX: "auto", overflowY: "hidden" }}>
        <div style={{ width: chartWidth, height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="timeMs"
                type="number"
                domain={["dataMin", "dataMax"]}
                scale="time"
                tickFormatter={(ms: number) => {
                  const d = new Date(ms);
                  const h = d.getHours();
                  if (h % 6 !== 0) return "";
                  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                  return `${h12}${h < 12 ? "a" : "p"}`;
                }}
                tick={{ fontSize: 10, fill: axisColor }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis yAxisId="temp" domain={[tMin, tMax]} hide />
              {hasHumidity && <YAxis yAxisId="hum" domain={[0, 100]} hide />}
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length || label == null) return null;
                  const time = new Date(label as number).toLocaleTimeString("en", { weekday: "short", hour: "numeric" });
                  const fl = payload.find((p) => p.name === "feelsLike");
                  const hum = payload.find((p) => p.name === "humidity");
                  return (
                    <div style={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 10, padding: "8px 12px", fontSize: 12, color: tooltipText }}>
                      <p style={{ fontWeight: 700, marginBottom: 4, color: labelColor }}>{time}</p>
                      {fl && <p>Feels {fl.value}°{tempUnit}</p>}
                      {hum && <p style={{ color: "#3B82F6" }}>{hum.value}% humidity</p>}
                    </div>
                  );
                }}
              />
              <Line yAxisId="temp" type="monotone" dataKey="feelsLike" stroke="var(--accent-primary)" strokeWidth={2} dot={false} isAnimationActive={false} />
              {hasHumidity && (
                <Line yAxisId="hum" type="monotone" dataKey="humidity" stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
