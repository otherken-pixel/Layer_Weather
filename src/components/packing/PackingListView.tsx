import type { PackingScore, TripDayOutfit } from "@/lib/trip-packing";
import type { AnnotatedPackingItem } from "@/lib/wardrobe-matching";
import type { PackingChecklistState } from "@/types";
import { PACKING_CATEGORIES } from "@/lib/packing-utils";
import { PackingCategoryCard } from "./PackingCategoryCard";
import { PackingScoreBadge } from "./PackingScoreBadge";
import { DayOutfitTimeline } from "./DayOutfitTimeline";

export function PackingListView({
  items,
  dailyOutfits,
  score,
  viewMode,
  onViewModeChange,
  accentSolid,
  isDark,
  diffAdded,
  diffRemoved,
  checklistState,
  onTogglePacked,
}: {
  items: AnnotatedPackingItem[];
  dailyOutfits: TripDayOutfit[];
  score: PackingScore | null;
  viewMode: "list" | "days";
  onViewModeChange: (mode: "list" | "days") => void;
  accentSolid: string;
  isDark: boolean;
  diffAdded?: Set<string>;
  diffRemoved?: string[];
  checklistState?: PackingChecklistState;
  onTogglePacked?: (key: string) => void;
}) {
  const hintColor = isDark ? "#9BA4B4" : "#9CA3AF";

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {(["list", "days"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onViewModeChange(mode)}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 10,
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              background: viewMode === mode ? accentSolid : isDark ? "#3A3A3C" : "#E5E7EB",
              color: viewMode === mode ? "white" : hintColor,
            }}
          >
            {mode === "list" ? "Packing list" : "Daily outfits"}
          </button>
        ))}
      </div>

      {score && viewMode === "list" && <PackingScoreBadge score={score} isDark={isDark} />}

      {viewMode === "days" && dailyOutfits.length > 0 && (
        <DayOutfitTimeline days={dailyOutfits} isDark={isDark} accentSolid={accentSolid} />
      )}

      {viewMode === "list" &&
        PACKING_CATEGORIES.map((cat) => {
          const catItems = items.filter((i) => i.category === cat);
          if (!catItems.length) return null;
          return (
            <PackingCategoryCard
              key={cat}
              cat={cat}
              items={catItems}
              accentSolid={accentSolid}
              diffAdded={diffAdded ?? new Set()}
              diffRemoved={diffRemoved ?? []}
              checklistState={checklistState}
              onTogglePacked={onTogglePacked}
            />
          );
        })}
    </>
  );
}
