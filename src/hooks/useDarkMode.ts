import { useEffect, useState } from "react";

export function useDarkMode(themePreference: string | null): boolean {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const [isDark, setIsDark] = useState(
    themePreference === "light" ? false : themePreference === "dark" ? true : systemDark,
  );
  useEffect(() => {
    if (themePreference === "light") {
      setIsDark(false);
      return;
    }
    if (themePreference === "dark") {
      setIsDark(true);
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [themePreference]);
  return isDark;
}
