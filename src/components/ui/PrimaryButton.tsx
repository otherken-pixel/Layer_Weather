import React from "react";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export default function PrimaryButton({
  loading,
  variant = "primary",
  size = "md",
  children,
  className = "",
  disabled,
  style,
  ...props
}: Props) {
  const base =
    "w-full font-semibold rounded-2xl transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";

  const sizeStyles = {
    sm: "py-2.5 px-4 text-sm",
    md: "py-4 px-6 text-base",
    lg: "py-5 px-8 text-lg",
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: "linear-gradient(135deg, #6C63FF, #4A3FDB)",
      color: "#FFFFFF",
      boxShadow: "0 4px 20px rgba(108,99,255,0.4)",
    },
    ghost: {
      background: "rgba(255,255,255,0.10)",
      color: "#FFFFFF",
      border: "1.5px solid rgba(255,255,255,0.18)",
    },
    danger: {
      background: "rgba(255,59,48,0.15)",
      color: "#FF3B30",
      border: "1.5px solid rgba(255,59,48,0.3)",
    },
  };

  return (
    <button
      className={`${base} ${sizeStyles[size]} ${className}`}
      style={{ ...variantStyles[variant], ...style }}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span
            className="w-4 h-4 border-2 rounded-full animate-spin"
            style={{
              borderColor: "rgba(255,255,255,0.3)",
              borderTopColor: "white",
            }}
          />
          <span>Loading…</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
