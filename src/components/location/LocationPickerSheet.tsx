import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSaveLocation } from "@/hooks/useSaveLocation";
import { useAppStore } from "@/store";
import { useIsDark } from "@/hooks/useDarkMode";
import { addSavedLocation } from "@/lib/saved-locations";
import { getPlaceSuggestions, getPlaceDetails, type PlaceSuggestion } from "@/lib/googleGeocodingService";

interface LocationPickerSheetProps {
  open: boolean;
  onClose: () => void;
  /** `fromCitySave` when the sheet already persisted the city to the saved list (GPS path skips that until geocode). */
  onSaved?: (ctx?: { fromCitySave?: boolean }) => void | Promise<void>;
  /** When true, sheet uses light styling for the Today sky header context */
  variant?: "sky" | "card";
  /** "add" shows "Add a city" copy and clears the input; "update" (default) pre-fills current city. */
  mode?: "add" | "update";
}

export function LocationPickerSheet({
  open,
  onClose,
  onSaved,
  variant = "card",
  mode = "update",
}: LocationPickerSheetProps) {
  const location = useAppStore((s) => s.location);
  const profile = useAppStore((s) => s.profile);
  const userId = useAppStore((s) => s.userId);
  const setSavedLocations = useAppStore((s) => s.setSavedLocations);
  const [cityQuery, setCityQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { saveFromCity, saveFromCoords, saveFromDevice, saving, error, setError } = useSaveLocation();
  const isDark = useIsDark();

  useEffect(() => {
    if (open) {
      setCityQuery(mode === "add" ? "" : (location?.city || profile?.last_city || ""));
      setSuggestions([]);
      setError("");
    }
  }, [open, mode, location?.city, profile?.last_city, setError]);

  // Debounced autocomplete
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = cityQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    setSuggestionsLoading(true);
    debounceRef.current = setTimeout(async () => {
      const results = await getPlaceSuggestions(trimmed);
      setSuggestions(results);
      setSuggestionsLoading(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cityQuery]);

  const isSky = variant === "sky";

  async function persistToSavedList() {
    const loc = useAppStore.getState().location;
    if (loc?.city) {
      const updated = await addSavedLocation(loc, userId ?? undefined).catch(() => null);
      if (updated) setSavedLocations(updated);
    }
  }

  async function handleSuggestionSelect(suggestion: PlaceSuggestion) {
    setSuggestions([]);
    setSuggestionsLoading(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setCityQuery(suggestion.mainText);

    const place = await getPlaceDetails(suggestion.placeId);
    if (!place) {
      setError("Could not get location details. Try again.");
      return;
    }
    const result = await saveFromCoords(place);
    if (result.ok) {
      await persistToSavedList();
      await onSaved?.({ fromCitySave: true });
      onClose();
    }
  }

  async function handleCitySave() {
    setSuggestions([]);
    const result = await saveFromCity(cityQuery);
    if (result.ok) {
      await persistToSavedList();
      await onSaved?.({ fromCitySave: true });
      onClose();
    }
  }

  async function handleGpsSave() {
    setSuggestions([]);
    const result = await saveFromDevice();
    if (result.ok) {
      await persistToSavedList();
      await onSaved?.();
      onClose();
    }
  }

  const sheetBg = isDark
    ? "#2C2C2E"
    : isSky ? "rgba(255,255,255,0.98)" : "#FFFFFF";
  const handleBg = isDark ? "#4B5563" : "#D1D5DB";
  const titleColor = isDark ? "#F4F4F5" : "#111827";
  const subtitleColor = isDark ? "#9BA4B4" : "#6B7280";
  const inputBg = isDark ? "#3A3A3C" : "#F3F4F6";
  const inputBorder = isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB";
  const inputText = isDark ? "#F4F4F5" : "#111827";
  const secondaryBtnBg = isDark ? "#3A3A3C" : "#F3F4F6";
  const secondaryBtnBorder = isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB";
  const secondaryBtnText = isDark ? "#F4F4F5" : "#111827";
  const cancelText = isDark ? "#9BA4B4" : "#6B7280";
  const sheetBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : undefined;
  const suggestionDivider = isDark ? "rgba(255,255,255,0.07)" : "#F3F4F6";
  const suggestionHover = isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB";

  const showSuggestions = suggestions.length > 0 && !saving;

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
              background: sheetBg,
              boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
              borderTop: sheetBorder,
            }}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: handleBg }} />
            <h2
              id="location-picker-title"
              className="text-lg font-bold text-center mb-1"
              style={{ color: titleColor }}
            >
              {mode === "add" ? "Add a city" : "Update location"}
            </h2>
            <p className="text-sm text-center mb-4" style={{ color: subtitleColor }}>
              {mode === "add"
                ? "Search for a city to add to your list."
                : "Use your phone's location or search for a city."}
            </p>

            {/* Search input */}
            <input
              type="text"
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !showSuggestions) handleCitySave(); }}
              placeholder="e.g. Seattle, WA"
              className="w-full rounded-2xl px-4 py-3 text-base font-semibold"
              style={{
                background: inputBg,
                border: `1.5px solid ${inputBorder}`,
                color: inputText,
                outline: "none",
                borderRadius: showSuggestions ? "16px 16px 0 0" : undefined,
                marginBottom: showSuggestions ? 0 : 8,
              }}
            />

            {/* Autocomplete suggestions */}
            {showSuggestions && (
              <div style={{
                background: inputBg,
                border: `1.5px solid ${inputBorder}`,
                borderTop: "none",
                borderRadius: "0 0 16px 16px",
                overflow: "hidden",
                marginBottom: 8,
              }}>
                {suggestions.map((s, i) => (
                  <button
                    key={s.placeId}
                    type="button"
                    disabled={saving}
                    onClick={() => handleSuggestionSelect(s)}
                    style={{
                      width: "100%",
                      padding: "11px 16px",
                      background: "transparent",
                      border: "none",
                      borderTop: i > 0 ? `1px solid ${suggestionDivider}` : "none",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = suggestionHover; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: 15, fontWeight: 600, color: inputText, lineHeight: 1.3 }}>
                      {s.mainText}
                    </span>
                    {s.secondaryText && (
                      <span style={{ fontSize: 12, color: subtitleColor, lineHeight: 1.3 }}>
                        {s.secondaryText}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Loading indicator */}
            {suggestionsLoading && cityQuery.trim().length >= 2 && suggestions.length === 0 && (
              <p style={{ fontSize: 12, color: subtitleColor, textAlign: "center", marginBottom: 8 }}>
                Searching…
              </p>
            )}

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
              style={{ background: "var(--accent-primary)" }}
            >
              {saving ? "Saving…" : "Save city"}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleGpsSave}
              className="w-full min-h-[48px] rounded-2xl font-bold cursor-pointer disabled:opacity-50"
              style={{
                background: secondaryBtnBg,
                border: `1.5px solid ${secondaryBtnBorder}`,
                color: secondaryBtnText,
              }}
            >
              Use current location
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[44px] mt-2 border-0 bg-transparent text-sm font-semibold cursor-pointer"
              style={{ color: cancelText }}
            >
              Cancel
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
