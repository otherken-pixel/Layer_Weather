import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";

interface ChartPoint {
  timeMs: number;
  uvIndex?: number;
}

interface Props {
  chartData: ChartPoint[];
  isDark: boolean;
}

function uvColor(uvi: number): string {
  if (uvi <= 2) return "#22C55E";
  if (uvi <= 5) return "#EAB308";
  if (uvi <= 7) return "#F97316";
  if (uvi <= 10) return "#EF4444";
  return "#8B5CF6";
}

function uvLabel(uvi: number): string {
  if (uvi <= 2) return "Low";
  if (uvi <= 5) return "Moderate";
  if (uvi <= 7) return "High";
  if (uvi <= 10) return "Very High";
  return "Extreme";
}

export function UVIndexCard({ chartData, isDark }: Props) {
  const uvData = chartData.filter((d) => d.uvIndex != null);
  if (uvData.length === 0) return null;

  const maxUV = Math.max(...uvData.map((d) => d.uvIndex!));
  const maxPoint = uvData.find((d) => d.uvIndex === maxUV);

  const cardBg = isDark ? "#1C1C1E" : "#FFFFFF";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : undefined;
  const cardShadow = isDark ? "0 2px 20px rgba(0,0,0,0.25)" : "0 2px 20px rgba(0,0,0,0.07)";
  const labelColor = isDark ? "#9BA4B4" : "#6B7280";
  const textPrimary = isDark ? "#F4F4F5" : "#111827";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const axisColor = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)";
  const tooltipBg = isDark ? "rgba(30,30,40,0.95)" : "rgba(255,255,255,0.97)";
  const tooltipBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  const POINT_WIDTH = 28;
  const chartWidth = Math.max(uvData.length * POINT_WIDTH, 320);

  const peakTime = maxPoint ? new Date(maxPoint.timeMs).toLocaleTimeString("en", { hour: "numeric" }) : "";

  return (
    <div style={{ background: cardBg, borderRadius: 20, padding: "14px 0 10px", boxShadow: cardShadow, border: cardBorder }}>
      {/* Header with peak UV */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 16, paddingRight: 16, marginBottom: 10 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: labelColor, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          UV Index
        </p>
        {maxUV > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: uvColor(maxUV) }}>{maxUV}</span>
            <span style={{ fontSize: 11, color: labelColor }}>{uvLabel(maxUV)}</span>
            {peakTime && <span style={{ fontSize: 11, color: labelColor }}>· peak {peakTime}</span>}
          </div>
        )}
      </div>

      {/* Scale legend */}
      <div style={{ display: "flex", gap: 6, paddingLeft: 16, paddingBottom: 8, flexWrap: "wrap" }}>
        {(["Low", "Moderate", "High", "Very High", "Extreme"] as const).map((lbl, i) => {
          const colors = ["#22C55E", "#EAB308", "#F97316", "#EF4444", "#8B5CF6"];
          return (
            <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors[i] }} />
              <span style={{ fontSize: 10, color: labelColor }}>{lbl}</span>
            </div>
          );
        })}
      </div>

      <div className="no-scrollbar" style={{ overflowX: "auto", overflowY: "hidden" }}>
        <div style={{ width: chartWidth, height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={uvData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
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
              <YAxis domain={[0, Math.max(maxUV + 2, 12)]} hide />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length || label == null) return null;
                  const uvi = payload[0]?.value as number;
                  const time = new Date(label as number).toLocaleTimeString("en", { weekday: "short", hour: "numeric" });
                  return (
                    <div style={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 10, padding: "8px 12px", fontSize: 12, color: textPrimary }}>
                      <p style={{ fontWeight: 700, marginBottom: 4, color: labelColor }}>{time}</p>
                      <p style={{ color: uvColor(uvi) }}>UV {uvi} · {uvLabel(uvi)}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="uvIndex" radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={false}>
                {uvData.map((d) => (
                  <Cell key={d.timeMs} fill={uvColor(d.uvIndex ?? 0)} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
