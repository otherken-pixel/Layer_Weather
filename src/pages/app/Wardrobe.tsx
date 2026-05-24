import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store";
import {
  getWardrobeItems,
  addWardrobeItem,
  deleteWardrobeItem,
} from "@/lib/supabase";
import type { WardrobeItem, WardrobeCategory, StyleTag } from "@/types";
import { hapticLight, hapticSuccess } from "@/lib/haptics";

const CATEGORIES: { key: WardrobeCategory | "all"; label: string; emoji: string }[] = [
  { key: "all", label: "All", emoji: "👗" },
  { key: "tops", label: "Tops", emoji: "👕" },
  { key: "bottoms", label: "Bottoms", emoji: "👖" },
  { key: "outerwear", label: "Outerwear", emoji: "🧥" },
  { key: "footwear", label: "Footwear", emoji: "👟" },
  { key: "accessories", label: "Accessories", emoji: "🧣" },
];

const STYLE_TAGS: { key: StyleTag; label: string }[] = [
  { key: "casual", label: "Casual" },
  { key: "formal", label: "Formal" },
  { key: "activewear", label: "Activewear" },
  { key: "outdoor", label: "Outdoor" },
  { key: "work", label: "Work" },
  { key: "smart-casual", label: "Smart-Casual" },
];

const WARMTH_LABELS = ["", "Very Light", "Light", "Medium", "Warm", "Very Warm"];

function WarmthDots({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <div
          key={n}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: n <= rating ? "#7C3AED" : "#E5E7EB",
          }}
        />
      ))}
    </div>
  );
}

interface AddSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved: (item: WardrobeItem) => void;
  userId: string;
}

function AddItemSheet({ open, onClose, onSaved, userId }: AddSheetProps) {
  const [category, setCategory] = useState<WardrobeCategory>("tops");
  const [name, setName] = useState("");
  const [warmth, setWarmth] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [waterproof, setWaterproof] = useState(false);
  const [color, setColor] = useState("");
  const [tags, setTags] = useState<StyleTag[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setCategory("tops");
      setName("");
      setWarmth(3);
      setWaterproof(false);
      setColor("");
      setTags([]);
      setError("");
    }
  }, [open]);

  function toggleTag(tag: StyleTag) {
    hapticLight();
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Please enter a name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const item = await addWardrobeItem({
        user_id: userId,
        category,
        name: name.trim(),
        warmth_rating: warmth,
        is_waterproof: waterproof,
        style_tags: tags,
        color: color.trim() || null,
        active: true,
      });
      if (item) {
        hapticSuccess();
        onSaved(item);
        onClose();
      }
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
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
            aria-label="Close"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-item-title"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed left-0 right-0 bottom-0 z-[90] rounded-t-[28px] px-5 pt-5 overflow-y-auto"
            style={{
              maxHeight: "90vh",
              background: "#FFFFFF",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
              paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "#D1D5DB" }} />
            <h2
              id="add-item-title"
              className="text-lg font-bold text-center mb-4"
              style={{ color: "#111827" }}
            >
              Add Wardrobe Item
            </h2>

            {/* Category */}
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#6B7280" }}>
              Category
            </p>
            <div className="flex gap-2 flex-wrap mb-4">
              {CATEGORIES.filter((c) => c.key !== "all").map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategory(cat.key as WardrobeCategory)}
                  className="px-3 py-1.5 rounded-xl text-sm font-semibold border-0 cursor-pointer"
                  style={{
                    background: category === cat.key ? "#7C3AED" : "#F3F4F6",
                    color: category === cat.key ? "#FFFFFF" : "#374151",
                  }}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>

            {/* Name */}
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#6B7280" }}>
              Name
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grey Merino Sweater"
              className="w-full rounded-2xl px-4 py-3 text-base font-semibold mb-4"
              style={{
                background: "#F3F4F6",
                border: "1.5px solid #E5E7EB",
                color: "#111827",
                outline: "none",
              }}
            />

            {/* Color */}
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#6B7280" }}>
              Color (optional)
            </p>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="e.g. Navy, Olive, Charcoal"
              className="w-full rounded-2xl px-4 py-3 text-base mb-4"
              style={{
                background: "#F3F4F6",
                border: "1.5px solid #E5E7EB",
                color: "#111827",
                outline: "none",
              }}
            />

            {/* Warmth */}
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#6B7280" }}>
              Warmth — {WARMTH_LABELS[warmth]}
            </p>
            <div className="flex gap-2 mb-4">
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setWarmth(n)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold border-0 cursor-pointer"
                  style={{
                    background: warmth === n ? "#7C3AED" : "#F3F4F6",
                    color: warmth === n ? "#FFFFFF" : "#6B7280",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Waterproof */}
            <div className="flex items-center justify-between mb-4 px-1">
              <div>
                <p className="text-sm font-semibold" style={{ color: "#111827" }}>
                  Waterproof / Water-resistant
                </p>
                <p className="text-xs" style={{ color: "#6B7280" }}>
                  Used to suggest rain gear alternatives
                </p>
              </div>
              <button
                type="button"
                onClick={() => { hapticLight(); setWaterproof((v) => !v); }}
                className="relative rounded-full border-0 cursor-pointer flex-shrink-0"
                style={{
                  width: 50,
                  height: 30,
                  background: waterproof ? "#7C3AED" : "#D1D5DB",
                  transition: "background 0.2s",
                }}
                aria-checked={waterproof}
                role="switch"
              >
                <motion.div
                  animate={{ x: waterproof ? 22 : 2 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  style={{
                    position: "absolute",
                    top: 3,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "#FFFFFF",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                  }}
                />
              </button>
            </div>

            {/* Style Tags */}
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#6B7280" }}>
              Style Tags (optional)
            </p>
            <div className="flex gap-2 flex-wrap mb-5">
              {STYLE_TAGS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => toggleTag(t.key)}
                  className="px-3 py-1.5 rounded-xl text-sm font-semibold border-0 cursor-pointer"
                  style={{
                    background: tags.includes(t.key) ? "#EDE9FE" : "#F3F4F6",
                    color: tags.includes(t.key) ? "#6D28D9" : "#6B7280",
                    border: tags.includes(t.key) ? "1.5px solid #C4B5FD" : "1.5px solid transparent",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {error && (
              <p className="text-sm mb-3" style={{ color: "#EF4444" }}>
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={saving || !name.trim()}
              onClick={handleSave}
              className="w-full min-h-[52px] rounded-2xl border-0 font-bold text-white cursor-pointer disabled:opacity-50"
              style={{ background: "#7C3AED", fontSize: 16 }}
            >
              {saving ? "Saving…" : "Add to Wardrobe"}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface ItemCardProps {
  item: WardrobeItem;
  onDelete: (id: string) => void;
}

function ItemCard({ item, onDelete }: ItemCardProps) {
  const cat = CATEGORIES.find((c) => c.key === item.category);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      style={{
        background: "#FFFFFF",
        borderRadius: 18,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
        marginBottom: 10,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: "#F3F0FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        {cat?.emoji ?? "👗"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <p
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#111827",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.name}
          </p>
          {item.is_waterproof && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#1D4ED8",
                background: "#DBEAFE",
                borderRadius: 6,
                padding: "1px 6px",
                flexShrink: 0,
              }}
            >
              ☂ DRY
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <WarmthDots rating={item.warmth_rating} />
          {item.color && (
            <span style={{ fontSize: 12, color: "#6B7280" }}>{item.color}</span>
          )}
          {item.style_tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#6D28D9",
                background: "#EDE9FE",
                borderRadius: 6,
                padding: "1px 6px",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => { hapticLight(); onDelete(item.id); }}
        aria-label={`Remove ${item.name}`}
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "none",
          background: "#FEE2E2",
          color: "#DC2626",
          fontSize: 16,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </motion.div>
  );
}

export default function Wardrobe() {
  const userId = useAppStore((s) => s.userId);
  const profile = useAppStore((s) => s.profile);
  const isDark = profile?.theme_preference === "dark";

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<WardrobeCategory | "all">("all");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [dbError, setDbError] = useState(false);

  const bgPage = isDark ? "#1C1C1E" : "#F2F2F7";
  const surface = isDark ? "#2C2C2E" : "#FFFFFF";
  const textPrimary = isDark ? "#FFFFFF" : "#111827";
  const textSecondary = isDark ? "#9CA3AF" : "#6B7280";

  const loadItems = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setDbError(false);
    try {
      const data = await getWardrobeItems(userId);
      setItems(data);
    } catch {
      setDbError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadItems(); }, [loadItems]);

  async function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await deleteWardrobeItem(id);
    } catch {
      await loadItems();
    }
  }

  function handleSaved(item: WardrobeItem) {
    setItems((prev) => [item, ...prev]);
  }

  const filtered =
    activeCategory === "all"
      ? items
      : items.filter((i) => i.category === activeCategory);

  const categoryCounts = Object.fromEntries(
    CATEGORIES.filter((c) => c.key !== "all").map((c) => [
      c.key,
      items.filter((i) => i.category === c.key).length,
    ])
  );

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: bgPage,
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: surface,
          borderBottom: `1px solid ${isDark ? "#3A3A3C" : "#E5E7EB"}`,
          padding: "20px 20px 0",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: textPrimary, lineHeight: 1.2 }}>
              My Wardrobe
            </h1>
            <p style={{ fontSize: 13, color: textSecondary, marginTop: 2 }}>
              {items.length} {items.length === 1 ? "item" : "items"} saved
            </p>
          </div>
          <button
            type="button"
            onClick={() => { hapticLight(); setShowAdd(true); }}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "none",
              background: "#7C3AED",
              color: "#FFFFFF",
              fontSize: 22,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            aria-label="Add wardrobe item"
          >
            +
          </button>
        </div>

        {/* Category tabs */}
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 14,
            scrollbarWidth: "none",
          }}
        >
          {CATEGORIES.map((cat) => {
            const count = cat.key === "all" ? items.length : categoryCounts[cat.key] ?? 0;
            const active = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => { hapticLight(); setActiveCategory(cat.key); }}
                style={{
                  flexShrink: 0,
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: "none",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  background: active ? "#7C3AED" : isDark ? "#3A3A3C" : "#F3F4F6",
                  color: active ? "#FFFFFF" : textSecondary,
                  transition: "all 0.15s",
                }}
              >
                {cat.emoji} {cat.label}
                {count > 0 && (
                  <span
                    style={{
                      marginLeft: 5,
                      background: active ? "rgba(255,255,255,0.25)" : isDark ? "#555" : "#E5E7EB",
                      color: active ? "#FFFFFF" : textSecondary,
                      borderRadius: 10,
                      padding: "0 6px",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "16px 16px 0" }}>
        {loading && (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "3px solid #E5E7EB",
                borderTopColor: "#7C3AED",
                margin: "0 auto 12px",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <p style={{ fontSize: 14, color: textSecondary }}>Loading wardrobe…</p>
          </div>
        )}

        {!loading && dbError && (
          <div
            style={{
              textAlign: "center",
              paddingTop: 60,
              background: surface,
              borderRadius: 20,
              padding: 32,
            }}
          >
            <p style={{ fontSize: 32, marginBottom: 12 }}>⚠️</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>
              Wardrobe unavailable
            </p>
            <p style={{ fontSize: 13, color: textSecondary, marginBottom: 20 }}>
              The wardrobe database table hasn&apos;t been set up yet. Run the migration to enable this feature.
            </p>
            <button
              type="button"
              onClick={loadItems}
              style={{
                padding: "10px 24px",
                borderRadius: 14,
                border: "none",
                background: "#7C3AED",
                color: "#FFFFFF",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !dbError && filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              textAlign: "center",
              paddingTop: 60,
              paddingBottom: 40,
            }}
          >
            <p style={{ fontSize: 48, marginBottom: 16 }}>
              {activeCategory === "all" ? "👗" : CATEGORIES.find((c) => c.key === activeCategory)?.emoji}
            </p>
            <p style={{ fontSize: 18, fontWeight: 700, color: textPrimary, marginBottom: 6 }}>
              {activeCategory === "all" ? "No items yet" : `No ${activeCategory} yet`}
            </p>
            <p style={{ fontSize: 14, color: textSecondary, marginBottom: 24 }}>
              Add your clothes to get personalized outfit suggestions based on what you actually own.
            </p>
            <button
              type="button"
              onClick={() => { hapticLight(); setShowAdd(true); }}
              style={{
                padding: "12px 28px",
                borderRadius: 16,
                border: "none",
                background: "#7C3AED",
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              + Add first item
            </button>
          </motion.div>
        )}

        {!loading && !dbError && filtered.length > 0 && (
          <AnimatePresence mode="popLayout">
            {filtered.map((item) => (
              <ItemCard key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Add Item Sheet */}
      {userId && (
        <AddItemSheet
          open={showAdd}
          onClose={() => setShowAdd(false)}
          onSaved={handleSaved}
          userId={userId}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
