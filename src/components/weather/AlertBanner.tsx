import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface WeatherAlert {
  message: string;
  feelsLike: number;
}

interface Props {
  alerts: WeatherAlert[];
}

export function AlertBanner({ alerts }: Props) {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    setDismissed(new Set());
  }, [alerts]);

  const visible = alerts.filter((_, i) => !dismissed.has(i));
  if (visible.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <AnimatePresence>
        {visible.map((alert, originalIdx) => {
          const idx = alerts.indexOf(alert);
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                background: "#FEF3C7",
                border: "1px solid #F59E0B",
                borderRadius: 16,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                overflow: "hidden",
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
              <p style={{ fontSize: 13, color: "#92400E", flex: 1, lineHeight: 1.4 }}>
                {alert.message}
              </p>
              <button
                type="button"
                onClick={() => setDismissed((prev) => new Set([...prev, idx]))}
                aria-label="Dismiss alert"
                style={{
                  flexShrink: 0,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: "none",
                  background: "rgba(245,158,11,0.2)",
                  color: "#92400E",
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
