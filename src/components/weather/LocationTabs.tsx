import React from "react";
import type { LocationData } from "@/types";

interface Props {
  locations: LocationData[];
  activeCity: string | null;
  onSelect: (loc: LocationData) => void;
  onAdd: () => void;
}

export function LocationTabs({ locations, activeCity, onSelect, onAdd }: Props) {
  if (locations.length === 0) return null;

  return (
    <div
      className="no-scrollbar"
      style={{
        display: "flex",
        overflowX: "auto",
        gap: 8,
        paddingLeft: 16,
        paddingRight: 16,
        paddingBottom: 10,
        paddingTop: 2,
      }}
    >
      {locations.map((loc) => {
        const isActive = loc.city === activeCity;
        return (
          <button
            key={loc.city}
            type="button"
            onClick={() => onSelect(loc)}
            style={{
              flexShrink: 0,
              padding: "7px 16px",
              borderRadius: 999,
              border: isActive
                ? "1.5px solid rgba(255,255,255,0.8)"
                : "1.5px solid rgba(255,255,255,0.3)",
              background: isActive
                ? "rgba(255,255,255,0.9)"
                : "rgba(255,255,255,0.18)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              color: isActive ? "#111827" : "rgba(255,255,255,0.9)",
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              cursor: "pointer",
              minHeight: 36,
              transition: "all 0.15s",
            }}
            aria-pressed={isActive}
            aria-label={`Switch to ${loc.city}`}
          >
            {isActive ? "📍 " : ""}{loc.city}
          </button>
        );
      })}

      {locations.length < 5 && (
        <button
          type="button"
          onClick={onAdd}
          aria-label="Add a location"
          style={{
            flexShrink: 0,
            width: 36,
            height: 36,
            borderRadius: 999,
            border: "1.5px solid rgba(255,255,255,0.35)",
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            color: "rgba(255,255,255,0.9)",
            fontSize: 20,
            fontWeight: 400,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          +
        </button>
      )}
    </div>
  );
}
