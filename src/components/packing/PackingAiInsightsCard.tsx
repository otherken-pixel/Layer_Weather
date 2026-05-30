import { useState } from "react";
import { useIsDark } from "@/hooks/useDarkMode";
import type { PackingAiInsights } from "@/types";

export function PackingAiInsightsCard({
  insights,
  accentSolid,
}: {
  insights: PackingAiInsights;
  accentSolid: string;
}) {
  const isDark = useIsDark();
  const [highlightsOpen, setHighlightsOpen] = useState(false);
  return (
    <div
      style={{
        background: isDark ? "rgba(124,58,237,0.12)" : "#F5F3FF",
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        border: `1px solid ${accentSolid}22`,
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: accentSolid,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          margin: "0 0 8px",
        }}
      >
        Smart packing advice
      </p>
      <p style={{ fontSize: 14, color: isDark ? "#E5E7EB" : "#374151", margin: "0 0 8px", lineHeight: 1.45 }}>
        {insights.weather_summary}
      </p>
      {insights.packing_notes && (
        <p style={{ fontSize: 13, color: isDark ? "#9BA4B4" : "#6B7280", margin: 0, fontStyle: "italic" }}>
          {insights.packing_notes}
        </p>
      )}
      {insights.daily_highlights.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            onClick={() => setHighlightsOpen((o) => !o)}
            style={{ fontSize: 12, fontWeight: 700, color: accentSolid, background: "none", border: "none", padding: 0, cursor: "pointer" }}
          >
            {highlightsOpen ? "Hide" : "Show"} day-by-day ({insights.daily_highlights.length})
          </button>
          {highlightsOpen && (
            <ul
              style={{
                margin: "8px 0 0",
                paddingLeft: 18,
                fontSize: 12,
                color: isDark ? "#9BA4B4" : "#4B5563",
                lineHeight: 1.5,
              }}
            >
              {insights.daily_highlights.map((h) => (
                <li key={h.date}>
                  <strong>{h.date}</strong> — {h.summary}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
