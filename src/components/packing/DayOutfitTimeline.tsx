import type { TripDayOutfit } from "@/lib/trip-packing";
import { topMap, bottomMap, footwearMap } from "@/components/outfit/outfitMap";

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
}

function conditionEmoji(condition: string, precip: number): string {
  if (precip > 50) return "🌧️";
  if (condition === "snow") return "❄️";
  if (condition === "cloudy" || condition === "overcast") return "☁️";
  return "☀️";
}

export function DayOutfitTimeline({
  days,
  isDark,
  accentSolid,
}: {
  days: TripDayOutfit[];
  isDark: boolean;
  accentSolid: string;
}) {
  const textPrimary = isDark ? "#F4F4F5" : "#111827";
  const hintColor = isDark ? "#9BA4B4" : "#9CA3AF";
  const cardBg = isDark ? "#3A3A3C" : "#F9FAFB";

  return (
    <div style={{ marginBottom: 12 }}>
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: hintColor,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          margin: "0 0 10px 4px",
        }}
      >
        What to wear each day
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {days.map((day) => {
          const o = day.outfit;
          const topId = topMap[o.outfit];
          const bottomId = bottomMap[o.outfit];
          const shoeId = footwearMap[o.footwear];
          return (
            <div
              key={day.date}
              style={{
                background: cardBg,
                borderRadius: 14,
                padding: "12px 14px",
                border: isDark ? "1px solid rgba(255,255,255,0.06)" : undefined,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: textPrimary, margin: "0 0 2px" }}>
                    {formatDayLabel(day.date)}
                  </p>
                  <p style={{ fontSize: 12, color: hintColor, margin: "0 0 6px" }}>
                    {conditionEmoji(day.condition, day.precipProb)}{" "}
                    {Math.round(day.feelsLikeMin)}–{Math.round(day.feelsLikeMax)}°F
                    {day.precipProb > 30 ? ` · ${Math.round(day.precipProb)}% rain` : ""}
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: accentSolid, margin: 0 }}>{o.label}</p>
                  <p style={{ fontSize: 12, color: hintColor, margin: "4px 0 0", lineHeight: 1.35 }}>
                    {o.garmentTop}
                    {o.garmentBottom ? ` · ${o.garmentBottom}` : ""}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0, fontSize: 10, color: hintColor }}>
                  {topId && <span title="top">👕</span>}
                  {bottomId && <span title="bottom">👖</span>}
                  {shoeId && <span title="shoes">👟</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
