import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface WeatherAlert {
  message: string;
  feelsLike: number;
  type?: "info" | "warning";
}

interface Props {
  alerts: WeatherAlert[];
}

const STORAGE_KEY = "dismissedRainAlerts";

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(dismissed: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed]));
  } catch {
    // localStorage unavailable
  }
}

export function AlertBanner({ alerts }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);

  // Cleanup: remove dismissed entries whose alerts are no longer active,
  // so storage doesn't grow unboundedly and stale dismissals don't block future alerts.
  useEffect(() => {
    const activeMessages = new Set(alerts.map((a) => a.message));
    setDismissed((prev) => {
      const cleaned = new Set([...prev].filter((msg) => activeMessages.has(msg)));
      if (cleaned.size !== prev.size) {
        saveDismissed(cleaned);
        return cleaned;
      }
      return prev;
    });
  }, [alerts]);

  function dismiss(message: string) {
    setDismissed((prev) => {
      const next = new Set([...prev, message]);
      saveDismissed(next);
      return next;
    });
  }

  const visible = alerts.filter((a) => !dismissed.has(a.message));
  if (visible.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <AnimatePresence>
        {visible.map((alert) => {
          const isInfo = alert.type === "info";
          const bannerBg = isInfo ? "#EFF6FF" : "#FEF3C7";
          const bannerBorder = isInfo ? "#BFDBFE" : "#F59E0B";
          const bannerText = isInfo ? "#1D4ED8" : "#92400E";
          const bannerDismissBg = isInfo ? "rgba(59,130,246,0.15)" : "rgba(245,158,11,0.2)";
          const bannerIcon = isInfo ? "ℹ️" : "⚠️";
          return (
            <motion.div
              key={alert.message}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                background: bannerBg,
                border: `1px solid ${bannerBorder}`,
                borderRadius: 16,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                overflow: "hidden",
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{bannerIcon}</span>
              <p style={{ fontSize: 13, color: bannerText, flex: 1, lineHeight: 1.4 }}>
                {alert.message}
              </p>
              <button
                type="button"
                onClick={() => dismiss(alert.message)}
                aria-label="Dismiss alert"
                style={{
                  flexShrink: 0,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: "none",
                  background: bannerDismissBg,
                  color: bannerText,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
