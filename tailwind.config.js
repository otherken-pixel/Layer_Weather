/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#6C63FF",
          light: "#9D97FF",
          dark: "#4A3FDB",
        },
        warm: {
          50: "#FFF8F0",
          400: "#FFB347",
          500: "#FF9500",
        },
        cool: {
          400: "#43B0F1",
          500: "#0080C6",
          600: "#005FA3",
        },
        night: {
          800: "#1a1a2e",
          900: "#16213e",
        },
        rain: {
          600: "#4A5568",
          800: "#2D3748",
        },
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};
