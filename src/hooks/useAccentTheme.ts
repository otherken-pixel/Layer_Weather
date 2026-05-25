import { useEffect } from "react";

export const ACCENT_DEFAULT = "#7C3AED";

const STORAGE_KEY = "weartoday:accent_color";

// ── Color math ────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] | null {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : null;
}

function hexToHsl(hex: string): [number, number, number] | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function luminance(r: number, g: number, b: number): number {
  return [r, g, b]
    .map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); })
    .reduce((acc, c, i) => acc + c * [0.2126, 0.7152, 0.0722][i], 0);
}

function contrastOnWhite(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 1;
  const l = luminance(...rgb);
  return (1.05) / (l + 0.05);
}

// ── Palette derivation ────────────────────────────────────────────────────────

export interface AccentPalette {
  primary: string;
  dark: string;
  light: string;
  surface: string;   // rgba at 12% for subtle tints
  tabBg: string;     // very-light tint for active tab bg (light mode)
  textSafe: string;  // WCAG AA on white (≥4.5:1)
}

export function deriveAccentPalette(hex: string): AccentPalette {
  const hsl = hexToHsl(hex);
  if (!hsl) return deriveAccentPalette(ACCENT_DEFAULT);
  const [h, s, l] = hsl;

  const dark = hslToHex(h, s, Math.max(l - 15, 5));
  const light = hslToHex(h, Math.max(s - 10, 20), Math.min(l + 35, 88));
  const rgb = hexToRgb(hex)!;
  const surface = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.12)`;
  const tabBg = hslToHex(h, Math.max(s - 20, 20), 96);

  let textL = Math.min(l, 38);
  let textSafe = hslToHex(h, s, textL);
  while (contrastOnWhite(textSafe) < 4.5 && textL > 3) {
    textL -= 2;
    textSafe = hslToHex(h, s, textL);
  }

  return { primary: hex, dark, light, surface, tabBg, textSafe };
}

// ── Apply palette to CSS custom properties ────────────────────────────────────

export function applyAccentPalette(hex: string): void {
  const p = deriveAccentPalette(hex);
  const root = document.documentElement;
  root.style.setProperty("--accent-primary", p.primary);
  root.style.setProperty("--accent-dark", p.dark);
  root.style.setProperty("--accent-light", p.light);
  root.style.setProperty("--accent-surface", p.surface);
  root.style.setProperty("--accent-tab-bg", p.tabBg);
  root.style.setProperty("--accent-text", p.textSafe);
  const rgb = hexToRgb(p.primary)!;
  root.style.setProperty("--accent-rgb", `${rgb[0]},${rgb[1]},${rgb[2]}`);
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAccentTheme(accentColor: string | null | undefined): void {
  const hex = accentColor ?? localStorage.getItem(STORAGE_KEY) ?? ACCENT_DEFAULT;
  useEffect(() => {
    applyAccentPalette(hex);
  }, [hex]);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function saveAccentLocal(hex: string): void {
  localStorage.setItem(STORAGE_KEY, hex);
}

export function loadAccentLocal(): string {
  return localStorage.getItem(STORAGE_KEY) ?? ACCENT_DEFAULT;
}
