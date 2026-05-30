import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartPoint {
  timeMs: number;
  pressure?: number;
}

interface Props {
  chartData: ChartPoint[];
  pressureTrend?: "rising" | "falling" | "steady" | null;
  isDark: boolean;
}

function trendLabel(trend: "rising" | "falling" | "steady" | null | undefined): { text: string; color: string } {
  if (trend === "rising") return { text: "Rising", color: "#22C55E" };
  if (trend === "falling") return { text: "Falling", color: "#F97316" };
  if (trend === "steady") return { text: "Steady", color: "#94A3B8" };
  return { text: "", color: "#94A3B8" };
}

export function PressureTrendCard({ chartData, pressureTrend, isDark }: Props) {
  const pressureData = chartData.filter((d) => d.pressure != null);
  if (pressureData.length === 0) return null;

  const pressures = pressureData.map((d) => d.pressure!);
  const pMin = Math.min(...pressures) - 2;
  const pMax = Math.max(...pressures) + 2;

  // Compute trend from the 48h data if not provided
  const computedTrend = pressureTrend ?? (() => {
    if (pressures.length < 4) return null;
    const diff = pressures[pressures.length - 1] - pressures[0];
    if (diff >= 2) return "rising" as const;
    if (diff <= -2) return "falling" as const;
    return "steady" as const;
  })();

  const trend = trendLabel(computedTrend);

  const cardBg = isDark ? "#1C1C1E" : "#FFFFFF";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : undefined;
  const cardShadow = isDark ? "0 2px 20px rgba(0,0,0,0.25)" : "0 2px 20px rgba(0,0,0,0.07)";
  const labelColor = isDark ? "#9BA4B4" : "#6B7280";
  const textPrimary = isDark ? "#F4F4F5" : "#111827";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const axisColor = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)";
  const tooltipBg = isDark ? "rgba(30,30,40,0.95)" : "rgba(255,255,255,0.97)";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const lineColor = isDark ? "#94A3B8" : "#64748B";

  const POINT_WIDTH = 28;
  const chartWidth = Math.max(pressureData.length * POINT_WIDTH, 320);

  return (
    <div style={{ background: cardBg, borderRadius: 20, padding: "14px 0 10px", boxShadow: cardShadow, border: cardBorder }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 16, paddingRight: 16, marginBottom: 10 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: labelColor, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Pressure
        </p>
        {trend.text && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 13, color: trend.color }}>
              {computedTrend === "rising" ? "↑" : computedTrend === "falling" ? "↓" : "→"}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: trend.color }}>{trend.text}</span>
          </div>
        )}
      </div>

      <div className="no-scrollbar" style={{ overflowX: "auto", overflowY: "hidden" }}>
        <div style={{ width: chartWidth, height: 130 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={pressureData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
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
              <YAxis domain={[pMin, pMax]} hide />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length || label == null) return null;
                  const pres = payload[0]?.value as number;
                  const time = new Date(label as number).toLocaleTimeString("en", { weekday: "short", hour: "numeric" });
                  return (
                    <div style={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 10, padding: "8px 12px", fontSize: 12, color: textPrimary }}>
                      <p style={{ fontWeight: 700, marginBottom: 4, color: labelColor }}>{time}</p>
                      <p style={{ color: lineColor }}>{pres} hPa</p>
                    </div>
                  );
                }}
              />
              <Line type="monotone" dataKey="pressure" stroke={lineColor} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Current pressure reading */}
      {pressureData.length > 0 && (
        <div style={{ paddingLeft: 16, paddingRight: 16, paddingTop: 6, borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`, marginTop: 4, display: "flex", gap: 4, alignItems: "baseline" }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: textPrimary }}>
            {pressureData[0].pressure}
          </span>
          <span style={{ fontSize: 12, color: labelColor }}>hPa now</span>
        </div>
      )}
    </div>
  );
}
