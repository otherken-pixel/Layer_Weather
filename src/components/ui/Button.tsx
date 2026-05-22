import React from "react";
import { motion } from "framer-motion";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled = false,
  leftIcon,
}: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold rounded-2xl select-none cursor-pointer border-0 outline-none";

  const variants = {
    primary: "bg-brand text-white shadow-lg",
    secondary: "bg-white/20 text-white border border-white/30 backdrop-blur-sm",
    ghost: "bg-transparent text-brand",
    danger: "bg-red-500 text-white",
  };

  const sizes = {
    sm: "text-sm px-4 py-2.5",
    md: "text-base px-6 py-3.5",
    lg: "text-lg px-8 py-4",
  };

  const isDisabled = disabled || loading;

  return (
    <motion.button
      onClick={onPress}
      disabled={isDisabled}
      whileTap={isDisabled ? {} : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={[
        base,
        variants[variant],
        sizes[size],
        fullWidth ? "w-full" : "",
        isDisabled ? "opacity-50 cursor-not-allowed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {leftIcon && <span>{leftIcon}</span>}
      {loading ? <span className="inline-block animate-spin">⟳</span> : label}
    </motion.button>
  );
}
