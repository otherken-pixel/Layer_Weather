import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSaveLocation } from "@/hooks/useSaveLocation";
import { useAppStore } from "@/store";

interface LocationPickerSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
  /** When true, sheet uses light styling for the Today sky header context */
  variant?: "sky" | "card";
}

export function LocationPickerSheet({
  open,
  onClose,
  onSaved,
  variant = "card",
}: LocationPickerSheetProps) {
  const location = useAppStore((s) => s.location);
  const profile = useAppStore((s) => s.profile);
  const [cityQuery, setCityQuery] = useState("");
  const { saveFromCity, saveFromDevice, saving, error, setError } = useSaveLocation();

  useEffect(() => {
    if (open) {
      setCityQuery(location?.city || profile?.last_city || "");
      setError("");
    }
  }, [open, location?.city, profile?.last_city, setError]);

  const isSky = variant === "sky";

  async function handleCitySave() {
    const result = await saveFromCity(cityQuery);
    if (result.ok) {
      await onSaved?.();
      onClose();
    }
  }

  async function handleGpsSave() {
    const result = await saveFromDevice();
    if (result.ok) {
      await onSaved?.();
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] border-0 cursor-pointer"
            style={{ background: "rgba(0,0,0,0.45)" }}
            aria-label="Close location picker"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-picker-title"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed left-0 right-0 bottom-0 z-[90] rounded-t-[28px] px-5 pt-5"
            style={{
              paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
              background: isSky ? "rgba(255,255,255,0.98)" : "#FFFFFF",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
            }}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "#D1D5DB" }} />
            <h2
              id="location-picker-title"
              className="text-lg font-bold text-center mb-1"
              style={{ color: "#111827" }}
            >
              Update location
            </h2>
            <p className="text-sm text-center mb-4" style={{ color: "#6B7280" }}>
              Use your phone&apos;s location or search for a city.
            </p>

            <input
              type="text"
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
              placeholder="e.g. Seattle, WA"
              className="w-full rounded-2xl px-4 py-3 text-base font-semibold mb-2"
              style={{
                background: "#F3F4F6",
                border: "1.5px solid #E5E7EB",
                color: "#111827",
                outline: "none",
              }}
            />
            {error && (
              <p className="text-sm mb-2" style={{ color: "#EF4444" }}>
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={saving || !cityQuery.trim()}
              onClick={handleCitySave}
              className="w-full min-h-[48px] rounded-2xl border-0 font-bold text-white mb-2 cursor-pointer disabled:opacity-50"
              style={{ background: "#7C3AED" }}
            >
              {saving ? "Saving…" : "Save city"}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleGpsSave}
              className="w-full min-h-[48px] rounded-2xl font-bold cursor-pointer disabled:opacity-50"
              style={{
                background: "#F3F4F6",
                border: "1.5px solid #E5E7EB",
                color: "#111827",
              }}
            >
              Use current location
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[44px] mt-2 border-0 bg-transparent text-sm font-semibold cursor-pointer"
              style={{ color: "#6B7280" }}
            >
              Cancel
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
