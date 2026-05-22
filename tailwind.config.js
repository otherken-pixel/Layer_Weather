/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#6C63FF",
          light: "#9D97FF",
          dark: "#4A3FDB",
          surface: "rgba(108,99,255,0.12)",
        },
        rain: "#007AFF",
        night: {
          900: "#0d1117",
          800: "#1a1a2e",
          700: "#16213e",
          600: "#1e2a4a",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      backdropBlur: {
        xs: "4px",
      },
      animation: {
        shimmer: "shimmer 1.8s infinite linear",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
    },
  },
  plugins: [],
};
