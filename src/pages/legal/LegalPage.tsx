import React from "react";
import { useNavigate } from "react-router-dom";
import { useIsDark } from "@/hooks/useDarkMode";

interface Section {
  heading: string;
  body: React.ReactNode;
}

interface LegalPageProps {
  title: string;
  effectiveDate: string;
  intro?: string;
  sections: Section[];
}

export default function LegalPage({ title, effectiveDate, intro, sections }: LegalPageProps) {
  const navigate = useNavigate();
  const isDark = useIsDark();

  const pageBg = isDark ? "#1C1C1E" : "#F2F2F7";
  const cardBg = isDark ? "#2C2C2E" : "#FFFFFF";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)";
  const rowTextColor = isDark ? "#F4F4F5" : "#111827";
  const hintColor = isDark ? "#9BA4B4" : "#4B5563";
  const sectionLabelColor = isDark ? "#9BA4B4" : "#6B7280";

  return (
    <div style={{ minHeight: "100%", background: pageBg, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          background: pageBg,
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
          paddingBottom: 16,
          paddingLeft: 16,
          paddingRight: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "none",
            background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            color: rowTextColor,
            fontSize: 18,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          aria-label="Go back"
        >
          ‹
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: rowTextColor, margin: 0, letterSpacing: "-0.02em" }}>
          {title}
        </h1>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "0 14px 48px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Effective date + intro */}
        <div style={{ background: cardBg, border: cardBorder, borderRadius: 16, padding: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: sectionLabelColor, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Effective {effectiveDate}
          </p>
          {intro && (
            <p style={{ fontSize: 14, lineHeight: 1.65, color: hintColor, margin: 0 }}>{intro}</p>
          )}
        </div>

        {sections.map((section, i) => (
          <div key={i} style={{ background: cardBg, border: cardBorder, borderRadius: 16, padding: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: rowTextColor, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
              {section.heading}
            </p>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: hintColor }}>
              {section.body}
            </div>
          </div>
        ))}

        <p style={{ fontSize: 12, color: sectionLabelColor, textAlign: "center", margin: "8px 0 0" }}>
          Layer Weather · layerweather.com
        </p>
      </div>
    </div>
  );
}
