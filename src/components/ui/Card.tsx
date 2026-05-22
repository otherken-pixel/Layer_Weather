import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
  /** "dark" (default) = white-glass for dark backgrounds; "light" = dark-glass for light backgrounds */
  mode?: "dark" | "light";
}

export function Card({ children, className = "", padding = "p-5", mode = "dark" }: CardProps) {
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
