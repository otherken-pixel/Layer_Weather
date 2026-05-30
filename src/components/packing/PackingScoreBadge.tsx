import type { PackingScore } from "@/lib/trip-packing";

export function PackingScoreBadge({
  score,
  isDark,
}: {
  score: PackingScore;
  isDark: boolean;
}) {
  const color =
    score.score >= 85 ? "#22C55E" : score.score >= 65 ? "#F59E0B" : isDark ? "#F87171" : "#EF4444";

  return (
    <div
      style={{
        background: isDark ? "rgba(34,197,94,0.1)" : "#F0FDF4",
        borderRadius: 14,
        padding: "12px 14px",
        marginBottom: 12,
        border: `1px solid ${color}33`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
          Light packer score
        </p>
        <span style={{ fontSize: 22, fontWeight: 800, color }}>{score.score}</span>
      </div>
      <p style={{ fontSize: 13, color: isDark ? "#9BA4B4" : "#4B5563", margin: "6px 0 0", lineHeight: 1.4 }}>
        {score.tip}
        {score.carryOnLikely ? " Carry-on friendly." : ""}
      </p>
    </div>
  );
}
