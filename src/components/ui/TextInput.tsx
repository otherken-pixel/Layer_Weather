import React, { useState } from "react";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export default function TextInput({ label, error, hint, className = "", id, ...props }: Props) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-sm font-medium"
        style={{ color: "rgba(255,255,255,0.65)" }}
      >
        {label}
      </label>
      <input
        id={inputId}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`w-full px-4 py-3.5 rounded-2xl text-white text-base transition-all outline-none ${className}`}
        style={{
          background: focused
            ? "rgba(255,255,255,0.14)"
            : "rgba(255,255,255,0.08)",
          border: `1.5px solid ${
            error
              ? "rgba(255,59,48,0.7)"
              : focused
              ? "rgba(108,99,255,0.8)"
              : "rgba(255,255,255,0.14)"
          }`,
          caretColor: "#6C63FF",
        }}
        {...props}
      />
      {error && (
        <p className="text-sm font-medium" style={{ color: "#FF3B30" }}>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
