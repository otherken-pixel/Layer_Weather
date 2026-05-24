import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
  /** "dark" = white-glass; "light" = dark-glass; "weather" = solid card that respects isDark */
  mode?: "dark" | "light" | "weather";
  isDark?: boolean;
}

export function Card({ children, className = "", padding = "p-5", mode = "dark", isDark = false }: CardProps) {
  if (mode === "weather") {
    return (
      <div
        className={[padding, className].filter(Boolean).join(" ")}
        style={{
          background: isDark ? "#2C2C2E" : "#FFFFFF",
          borderRadius: 24,
          boxShadow: isDark ? "0 2px 20px rgba(0,0,0,0.25)" : "0 2px 20px rgba(0,0,0,0.07)",
          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #F0F0F0",
        }}
      >
        {children}
      </div>
    );
  }

  const glass =
    mode === "light"
      ? "bg-black/[0.10] border-black/[0.18]"
      : "bg-white/[0.14] border-white/30";
  return (
    <div
      className={[
        "rounded-3xl border",
        glass,
        "backdrop-blur-sm",
        padding,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
