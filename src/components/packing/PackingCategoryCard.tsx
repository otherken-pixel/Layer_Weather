import { useIsDark } from "@/hooks/useDarkMode";
import type { AnnotatedPackingItem } from "@/lib/wardrobe-matching";
import { packingItemKey } from "@/lib/trip-packing";
import { CATEGORY_EMOJI } from "@/lib/packing-utils";

export function PackingCategoryCard({
  cat,
  items,
  accentSolid,
  diffAdded,
  diffRemoved,
  checklistState,
  onTogglePacked,
}: {
  cat: string;
  items: AnnotatedPackingItem[];
  accentSolid: string;
  diffAdded: Set<string>;
  diffRemoved: string[];
  checklistState?: Record<string, { packed: boolean }>;
  onTogglePacked?: (key: string) => void;
}) {
  const isDark = useIsDark();
  const removedSet = new Set(diffRemoved);

  return (
    <div
      style={{
        background: isDark ? "#2C2C2E" : "#F9FAFB",
        borderRadius: 18,
        padding: 14,
        marginBottom: 10,
        border: isDark ? "1px solid rgba(255,255,255,0.06)" : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>{CATEGORY_EMOJI[cat]}</span>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: isDark ? "#6B7280" : "#9CA3AF",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          {cat}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item, i) => {
          const key = packingItemKey(item.category, item.name);
          const packed = checklistState?.[key]?.packed ?? false;
          const isNew = diffAdded.has(item.name);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                opacity: removedSet.has(item.name) ? 0.4 : packed ? 0.55 : 1,
              }}
            >
              {onTogglePacked ? (
                <button
                  type="button"
                  onClick={() => onTogglePacked(key)}
                  aria-label={packed ? "Mark unpacked" : "Mark packed"}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: `2px solid ${packed ? "#22C55E" : isDark ? "#4B5563" : "#D1D5DB"}`,
                    background: packed ? "#22C55E" : "transparent",
                    color: packed ? "white" : "transparent",
                    cursor: "pointer",
                    flexShrink: 0,
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {packed ? "✓" : ""}
                </button>
              ) : (
                <span
                  style={{
                    minWidth: 36,
                    height: 36,
                    borderRadius: 12,
                    background: isNew ? "#DCFCE7" : item.ownedItem ? "#DCFCE7" : isDark ? "rgba(124,58,237,0.18)" : "#EDE9FE",
                    color: isNew ? "#15803D" : item.ownedItem ? "#15803D" : accentSolid,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {item.quantity}×
                </span>
              )}
              {onTogglePacked && (
                <span
                  style={{
                    minWidth: 32,
                    fontSize: 12,
                    fontWeight: 800,
                    color: accentSolid,
                    flexShrink: 0,
                  }}
                >
                  {item.quantity}×
                </span>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: isDark ? "#F4F4F5" : "#111827",
                      margin: 0,
                      textDecoration: packed ? "line-through" : undefined,
                    }}
                  >
                    {item.name}
                  </p>
                  {isNew && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#15803D",
                        background: "#DCFCE7",
                        borderRadius: 4,
                        padding: "1px 5px",
                      }}
                    >
                      NEW
                    </span>
                  )}
                </div>
                {item.ownedItem && (
                  <p style={{ fontSize: 12, color: "#15803D", margin: 0, fontWeight: 600 }}>
                    ✓ You have: {item.ownedItem.name}
                  </p>
                )}
                {item.reason && !item.ownedItem && (
                  <p style={{ fontSize: 12, color: isDark ? "#9BA4B4" : "#9CA3AF", margin: 0 }}>{item.reason}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
