import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useAppStore } from "@/store";
import { getWeatherWardrobes, getWardrobeItems, upsertWeatherWardrobe, deleteWeatherWardrobe } from "@/lib/supabase";
import { SCENARIOS, getScenarioMeta, normalizeSvgId } from "@/lib/wardrobeCatalog";
import { catalogForPreference } from "@/lib/svgCatalog";
import type { SvgCategory } from "@/lib/svgCatalog";
import type { WeatherScenario, WeatherWardrobePreset, StylePreference } from "@/types";
import SvgPickerGrid, { PickerSvgThumb } from "@/components/wardrobe/SvgPickerGrid";
import OutfitFlatLay from "@/components/outfit/OutfitFlatLay";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { prefetchSvgImages } from "@/lib/svgImageCache";
import { useIsDark } from "@/hooks/useDarkMode";

const DRESS_SVG_ID = "tops-feminine-dress";

// ── Scenario grid card ────────────────────────────────────────────────────────

interface ScenarioCardProps {
  scenario: (typeof SCENARIOS)[number];
  preset: WeatherWardrobePreset | undefined;
  onEdit: () => void;
  isDark: boolean;
}

function ScenarioCard({ scenario, preset, onEdit, isDark }: ScenarioCardProps) {
  const surface = isDark ? "#2C2C2E" : "#FFFFFF";
  const textPrimary = isDark ? "#FFFFFF" : "#111827";
  const textSecondary = isDark ? "#9CA3AF" : "#6B7280";
  const hasPreset = !!preset;

  return (
    <motion.button
      type="button"
      onClick={() => { hapticLight(); onEdit(); }}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.97 }}
      style={{
        background: surface,
        borderRadius: 20,
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        boxShadow: isDark ? "0 2px 12px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.07)",
        border: hasPreset
          ? "2px solid var(--accent-primary)"
          : isDark ? "2px solid #3A3A3C" : "2px solid #E5E7EB",
        cursor: "pointer",
        width: "100%",
        position: "relative",
      }}
    >
      {hasPreset && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--accent-primary)",
          }}
        />
      )}

      {/* Mini outfit preview or placeholder */}
      <div style={{ width: "100%", minHeight: 90 }}>
        {hasPreset ? (
          <OutfitFlatLay
            outfit="pants_longsleeve"
            rainGear={false}
            umbrella={false}
            sunglasses={false}
            scarf={false}
            beanie={false}
            compact
            override={{
              top: preset.top_svg,
              bottom: preset.bottom_svg,
              outerwear: preset.outerwear_svg,
              footwear: preset.footwear_svg,
              accessories: preset.accessory_svgs,
            }}
          />
        ) : (
          <div
            style={{
              height: 90,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              opacity: 0.35,
            }}
          >
            {scenario.emoji}
          </div>
        )}
      </div>

      {/* Label */}
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: textPrimary, marginBottom: 2 }}>
          {scenario.emoji} {scenario.label}
        </p>
        <p style={{ fontSize: 11, color: textSecondary }}>
          {hasPreset ? "Tap to edit" : scenario.description}
        </p>
      </div>
    </motion.button>
  );
}

// ── Category picker tab bar ───────────────────────────────────────────────────

const EDITOR_TABS: { key: SvgCategory; label: string; emoji: string; multi: boolean }[] = [
  { key: "tops",        label: "Top",        emoji: "👕", multi: false },
  { key: "bottoms",     label: "Bottom",     emoji: "👖", multi: false },
  { key: "outerwear",   label: "Outer",      emoji: "🧥", multi: false },
  { key: "footwear",    label: "Shoes",      emoji: "👟", multi: false },
  { key: "accessories", label: "Extras",     emoji: "🧣", multi: true  },
];

// ── Scenario editor sheet ─────────────────────────────────────────────────────

interface EditorSheetProps {
  open: boolean;
  scenario: WeatherScenario;
  preset: WeatherWardrobePreset | undefined;
  userId: string;
  stylePreference: StylePreference;
  isDark: boolean;
  onClose: () => void;
  onSaved: (preset: WeatherWardrobePreset) => void;
  onDeleted: (scenario: WeatherScenario) => void;
}

function EditorSheet({
  open,
  scenario,
  preset,
  userId,
  stylePreference,
  isDark,
  onClose,
  onSaved,
  onDeleted,
}: EditorSheetProps) {
  const meta = getScenarioMeta(scenario);
  const dragControls = useDragControls();
  const svgCatalog = useAppStore((s) => s.svgCatalog);
  const svgCatalogById = useAppStore((s) => s.svgCatalogById);
  const svgCatalogLoading = useAppStore((s) => s.svgCatalogLoading);

  const [activeTab, setActiveTab] = useState<SvgCategory>("tops");
  const [topSvg,       setTopSvg]       = useState<string | null>(null);
  const [bottomSvg,    setBottomSvg]    = useState<string | null>(null);
  const [outerwearSvg, setOuterwearSvg] = useState<string | null>(null);
  const [footwearSvg,  setFootwearSvg]  = useState<string | null>(null);
  const [accessories,  setAccessories]  = useState<string[]>([]);
  const [saving,  setSaving]  = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Seed from existing preset or scenario defaults when sheet opens
  useEffect(() => {
    if (!open) return;
    setActiveTab("tops");
    if (preset) {
      setTopSvg(normalizeSvgId(preset.top_svg));
      setBottomSvg(normalizeSvgId(preset.bottom_svg));
      setOuterwearSvg(normalizeSvgId(preset.outerwear_svg));
      setFootwearSvg(normalizeSvgId(preset.footwear_svg));
      setAccessories(
        preset.accessory_svgs.map((a) => normalizeSvgId(a) ?? a).filter(Boolean) as string[]
      );
    } else {
      setTopSvg(meta.defaults.top);
      setBottomSvg(meta.defaults.bottom);
      setOuterwearSvg(meta.defaults.outerwear);
      setFootwearSvg(meta.defaults.footwear);
      setAccessories(meta.defaults.accessories);
    }
  }, [open, preset, meta]);

  function toggleAccessory(name: string) {
    hapticLight();
    setAccessories((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  }

  function handleSingleSelect(category: SvgCategory, name: string) {
    hapticLight();
    if (category === "tops") {
      setTopSvg((v) => {
        const next = v === name ? null : name;
        if (next === DRESS_SVG_ID) {
          setBottomSvg(null);
          setActiveTab("outerwear");
        }
        return next;
      });
      return;
    }
    if (category === "bottoms")   setBottomSvg((v)   => v === name ? null : name);
    if (category === "outerwear") setOuterwearSvg((v) => v === name ? null : name);
    if (category === "footwear")  setFootwearSvg((v) => v === name ? null : name);
  }

  function isSelected(category: SvgCategory, name: string): boolean {
    if (category === "tops")        return topSvg       === name;
    if (category === "bottoms")     return bottomSvg    === name;
    if (category === "outerwear")   return outerwearSvg === name;
    if (category === "footwear")    return footwearSvg  === name;
    if (category === "accessories") return accessories.includes(name);
    return false;
  }

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await upsertWeatherWardrobe({
        user_id: userId,
        scenario,
        top_svg: topSvg,
        bottom_svg: topSvg === DRESS_SVG_ID ? null : bottomSvg,
        outerwear_svg: outerwearSvg,
        footwear_svg: footwearSvg,
        accessory_svgs: accessories,
      });
      hapticSuccess();
      onSaved(saved);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteWeatherWardrobe(userId, scenario);
      hapticLight();
      onDeleted(scenario);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  const surface = isDark ? "#1C1C1E" : "#FFFFFF";
  const textPrimary = isDark ? "#FFFFFF" : "#111827";
  const textSecondary = isDark ? "#9CA3AF" : "#6B7280";
  const tabBg = isDark ? "#2C2C2E" : "#F3F4F6";

  const currentOptions = catalogForPreference(svgCatalog, stylePreference, activeTab);

  useEffect(() => {
    if (!open || svgCatalog.length === 0) return;
    prefetchSvgImages(
      currentOptions.slice(0, 18),
      svgCatalogById
    );
  }, [open, activeTab, stylePreference, currentOptions.length, svgCatalog.length, svgCatalogById]);

  // Live preview override
  const previewOverride = {
    top: topSvg,
    bottom: topSvg === DRESS_SVG_ID ? null : bottomSvg,
    outerwear: outerwearSvg,
    footwear: footwearSvg,
    accessories,
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] border-0 cursor-pointer"
            style={{ background: "rgba(0,0,0,0.5)" }}
            aria-label="Close"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Edit ${meta.label} wardrobe`}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 500) onClose();
            }}
            className="fixed inset-0 z-[90] flex flex-col"
            style={{ height: "100dvh", background: surface }}
          >
            {/* Drag handle + header */}
            <div
              className="px-5 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
              style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "#D1D5DB" }} />
              <h2 className="text-lg font-bold text-center mb-1" style={{ color: textPrimary }}>
                {meta.emoji} {meta.label}
              </h2>
              <p className="text-sm text-center mb-4" style={{ color: textSecondary }}>
                {meta.description} — tap a drawing to select it
              </p>
            </div>

            {/* Live preview strip */}
            <div className="flex-shrink-0 px-5 mb-2">
              <OutfitFlatLay
                outfit="pants_longsleeve"
                rainGear={false}
                umbrella={false}
                sunglasses={false}
                scarf={false}
                beanie={false}
                compact
                override={previewOverride}
              />
            </div>

            {/* Category tab bar */}
            <div
              className="flex-shrink-0 px-5 mb-3"
              style={{ overflowX: "auto" }}
            >
              <div className="flex gap-2" style={{ width: "max-content" }}>
                {EDITOR_TABS.map((tab) => {
                  const active = activeTab === tab.key;
                  const isDressBottom = tab.key === "bottoms" && topSvg === DRESS_SVG_ID;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => { hapticLight(); setActiveTab(tab.key); }}
                      style={{
                        padding: "7px 14px",
                        borderRadius: 20,
                        border: "none",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                        background: active ? "var(--accent-primary)" : tabBg,
                        color: active ? "#FFFFFF" : isDressBottom ? (isDark ? "#4B5563" : "#D1D5DB") : textSecondary,
                        flexShrink: 0,
                      }}
                    >
                      {tab.emoji} {tab.label}
                      {tab.key === "accessories" && accessories.length > 0 && (
                        <span
                          style={{
                            marginLeft: 5,
                            background: active ? "rgba(255,255,255,0.3)" : "var(--accent-primary)",
                            color: "#fff",
                            borderRadius: 10,
                            padding: "0 5px",
                            fontSize: 11,
                          }}
                        >
                          {accessories.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SVG picker grid */}
            <div className="flex-1 overflow-y-auto px-5 pb-2">
              {activeTab === "accessories" && (
                <p style={{ fontSize: 12, color: textSecondary, marginBottom: 10 }}>
                  Select as many as you like.
                </p>
              )}

              {activeTab === "bottoms" && topSvg === DRESS_SVG_ID ? (
                <div style={{ textAlign: "center", paddingTop: 60, color: textSecondary }}>
                  <p style={{ fontSize: 40, marginBottom: 12 }}>👗</p>
                  <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: textPrimary }}>
                    Dress selected
                  </p>
                  <p style={{ fontSize: 13 }}>No bottom needed — a dress is a full outfit.</p>
                </div>
              ) : svgCatalogLoading ? (
                <div style={{ textAlign: "center", paddingTop: 32, color: textSecondary }}>
                  <p style={{ fontSize: 14 }}>Loading clothing icons…</p>
                </div>
              ) : currentOptions.length === 0 ? (
                <div style={{ textAlign: "center", paddingTop: 32, color: textSecondary }}>
                  <p style={{ fontSize: 32, marginBottom: 8 }}>🚫</p>
                  <p style={{ fontSize: 14 }}>No options for your style preference in this category.</p>
                </div>
              ) : (
                <SvgPickerGrid
                  key={`${activeTab}-${stylePreference}`}
                  entries={currentOptions}
                  header={
                    activeTab === "outerwear" ? (
                      <button
                        type="button"
                        onClick={() => { hapticLight(); setOuterwearSvg(null); }}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          padding: "12px 8px",
                          borderRadius: 16,
                          border: outerwearSvg === null
                            ? "2.5px solid var(--accent-primary)"
                            : isDark ? "2px solid #3A3A3C" : "2px solid #E5E7EB",
                          background: outerwearSvg === null
                            ? isDark ? "var(--accent-surface)" : "var(--accent-tab-bg)"
                            : isDark ? "#2C2C2E" : "#F9FAFB",
                          cursor: "pointer",
                          transition: "border-color 0.15s, background 0.15s",
                        }}
                      >
                        <span style={{ fontSize: 32, lineHeight: 1, opacity: outerwearSvg === null ? 1 : 0.4 }}>✕</span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: outerwearSvg === null
                              ? isDark ? "var(--accent-light)" : "var(--accent-text)"
                              : textSecondary,
                          }}
                        >
                          None
                        </span>
                      </button>
                    ) : null
                  }
                  renderTile={(entry) => {
                    const selected = isSelected(activeTab, entry.id);
                    const isMulti = activeTab === "accessories";
                    return (
                      <button
                        type="button"
                        onClick={() =>
                          isMulti
                            ? toggleAccessory(entry.id)
                            : handleSingleSelect(activeTab, entry.id)
                        }
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          padding: "12px 8px",
                          borderRadius: 16,
                          border: selected
                            ? "2.5px solid var(--accent-primary)"
                            : isDark ? "2px solid #3A3A3C" : "2px solid #E5E7EB",
                          background: selected
                            ? isDark ? "var(--accent-surface)" : "var(--accent-tab-bg)"
                            : isDark ? "#2C2C2E" : "#F9FAFB",
                          cursor: "pointer",
                          transition: "border-color 0.15s, background 0.15s",
                        }}
                      >
                        <PickerSvgThumb id={entry.id} size={56} />
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: selected
                              ? isDark ? "var(--accent-light)" : "var(--accent-text)"
                              : textSecondary,
                          }}
                        >
                          {entry.label}
                        </span>
                      </button>
                    );
                  }}
                />
              )}
            </div>

            {/* Footer — always visible, never inside the scroll area */}
            <div
              className="px-5 flex-shrink-0 pt-3 flex flex-col gap-2"
              style={{
                background: surface,
                borderTop: `1px solid ${isDark ? "#3A3A3C" : "#E5E7EB"}`,
                paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
              }}
            >
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="w-full min-h-[52px] rounded-2xl border-0 font-bold text-white cursor-pointer disabled:opacity-50"
                style={{ background: "var(--accent-primary)", fontSize: 16 }}
              >
                {saving ? "Saving…" : "Save Wardrobe"}
              </button>
              {preset && (
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="w-full min-h-[44px] rounded-2xl border-0 font-semibold cursor-pointer disabled:opacity-50"
                  style={{
                    background: isDark ? "rgba(239,68,68,0.12)" : "#FEF2F2",
                    color: isDark ? "#F87171" : "#DC2626",
                    fontSize: 14,
                  }}
                >
                  {deleting ? "Clearing…" : "Clear this wardrobe"}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ── Main Wardrobe page ────────────────────────────────────────────────────────

export default function Wardrobe() {
  const userId   = useAppStore((s) => s.userId);
  const profile  = useAppStore((s) => s.profile);
  const weatherWardrobes  = useAppStore((s) => s.weatherWardrobes);
  const setWeatherWardrobes = useAppStore((s) => s.setWeatherWardrobes);
  const setWardrobeItems = useAppStore((s) => s.setWardrobeItems);
  const isDark = useIsDark();

  const [loading, setLoading] = useState(true);
  const [editingScenario, setEditingScenario] = useState<WeatherScenario | null>(null);

  const bgPage    = isDark ? "#1C1C1E" : "#F2F2F7";
  const surface   = isDark ? "#2C2C2E" : "#FFFFFF";
  const textPrimary   = isDark ? "#FFFFFF"  : "#111827";
  const textSecondary = isDark ? "#9CA3AF"  : "#6B7280";

  const stylePreference = profile?.style_preference ?? "all";

  const loadPresets = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getWeatherWardrobes(userId);
      setWeatherWardrobes(data);
    } catch {
      // table may not exist in dev; silently ignore
    }
    try {
      const items = await getWardrobeItems(userId);
      setWardrobeItems(items);
    } catch {
      // table may not exist in dev; silently ignore
    } finally {
      setLoading(false);
    }
  }, [userId, setWeatherWardrobes, setWardrobeItems]);

  useEffect(() => { void loadPresets(); }, [loadPresets]);

  function presetForScenario(key: WeatherScenario): WeatherWardrobePreset | undefined {
    return weatherWardrobes.find((p) => p.scenario === key);
  }

  function handleSaved(saved: WeatherWardrobePreset) {
    setWeatherWardrobes(
      weatherWardrobes.some((p) => p.scenario === saved.scenario)
        ? weatherWardrobes.map((p) => (p.scenario === saved.scenario ? saved : p))
        : [...weatherWardrobes, saved]
    );
  }

  function handleDeleted(scenario: WeatherScenario) {
    setWeatherWardrobes(weatherWardrobes.filter((p) => p.scenario !== scenario));
  }

  const savedCount = weatherWardrobes.length;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: bgPage,
        paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: surface,
          borderBottom: `1px solid ${isDark ? "#3A3A3C" : "#E5E7EB"}`,
          padding: "20px 20px 20px",
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 800, color: textPrimary, lineHeight: 1.2, marginBottom: 4 }}>
          My Wardrobe
        </h1>
        <p style={{ fontSize: 13, color: textSecondary }}>
          {savedCount === 0
            ? "Pick your outfits for each weather type"
            : `${savedCount} of ${SCENARIOS.length} weather wardrobes set up`}
        </p>
      </div>

      {/* Content */}
      <div style={{ padding: "16px 16px 0" }}>
        {loading ? (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "3px solid #E5E7EB",
                borderTopColor: "var(--accent-primary)",
                margin: "0 auto 12px",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <p style={{ fontSize: 14, color: textSecondary }}>Loading wardrobes…</p>
          </div>
        ) : (
          <>
            {/* How it works banner — shown until all 6 are filled */}
            {savedCount < SCENARIOS.length && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: isDark ? "rgba(59,130,246,0.15)" : "#EFF6FF",
                  border: "1px solid #BFDBFE",
                  borderRadius: 16,
                  padding: "12px 16px",
                  marginBottom: 16,
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>👗</span>
                <p style={{ fontSize: 13, color: isDark ? "#93C5FD" : "#1D4ED8", lineHeight: 1.5 }}>
                  Tap a card to choose your outfit drawings for that weather. When it matches, your wardrobe appears on the home screen.
                </p>
              </motion.div>
            )}

            {/* 2-column scenario grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              {SCENARIOS.map((scenario, i) => {
                const isOrphan = SCENARIOS.length % 2 !== 0 && i === SCENARIOS.length - 1;
                return (
                  <motion.div
                    key={scenario.key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={isOrphan ? { gridColumn: "1 / -1" } : undefined}
                  >
                    <ScenarioCard
                      scenario={scenario}
                      preset={presetForScenario(scenario.key)}
                      onEdit={() => setEditingScenario(scenario.key)}
                      isDark={isDark}
                    />
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Editor sheet */}
      {userId && editingScenario && (
        <EditorSheet
          open={editingScenario !== null}
          scenario={editingScenario}
          preset={presetForScenario(editingScenario)}
          userId={userId}
          stylePreference={stylePreference}
          isDark={isDark}
          onClose={() => setEditingScenario(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
