import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}

export function Card({ children, className = "", padding = "p-5" }: CardProps) {
  return (
    <div
      className={[
        "rounded-3xl border",
        "bg-white/[0.14] border-white/30",
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
