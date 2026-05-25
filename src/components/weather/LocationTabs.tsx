import React, { useState } from "react";
import type { LocationData } from "@/types";

interface Props {
  locations: LocationData[];
  activeCity: string | null;
  activeIsDevice: boolean;
  onSelect: (loc: LocationData) => void;
  onSelectDevice: () => void;
  onAdd: () => void;
  onDelete: (city: string) => void;
}

export function LocationTabs({
  locations,
  activeCity,
  activeIsDevice,
  onSelect,
  onSelectDevice,
  onAdd,
  onDelete,
}: Props) {
  const [editMode, setEditMode] = useState(false);

  return (
    <div
      className="no-scrollbar"
      style={{
        display: "flex",
        overflowX: "auto",
        gap: 8,
        paddingLeft: 16,
        paddingRight: 16,
        paddingBottom: 14,
        paddingTop: 10,
      }}
    >
      {/* Device GPS tab — always first, never deletable */}
      <button
        type="button"
        onClick={onSelectDevice}
        aria-pressed={activeIsDevice}
        aria-label="Use my current location"
        style={{
          flexShrink: 0,
          padding: "7px 16px",
          borderRadius: 999,
          border: activeIsDevice
            ? "1.5px solid rgba(255,255,255,0.8)"
            : "1.5px solid rgba(255,255,255,0.3)",
          background: activeIsDevice
            ? "rgba(255,255,255,0.9)"
            : "rgba(255,255,255,0.18)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          color: activeIsDevice ? "#111827" : "rgba(255,255,255,0.9)",
          fontSize: 13,
          fontWeight: activeIsDevice ? 700 : 500,
          cursor: "pointer",
          minHeight: 36,
          transition: "all 0.15s",
        }}
      >
        📍 My Location
      </button>

      {locations.map((loc) => {
        const isActive = !activeIsDevice && loc.city === activeCity;
        return (
          <div key={loc.city} style={{ position: "relative", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => { if (!editMode) onSelect(loc); }}
              style={{
                padding: editMode ? "7px 36px 7px 16px" : "7px 16px",
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
                cursor: editMode ? "default" : "pointer",
                minHeight: 36,
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
              aria-pressed={isActive}
              aria-label={`Switch to ${loc.city}`}
            >
              {loc.city}
            </button>

            {editMode && (
              <button
                type="button"
                onClick={() => onDelete(loc.city)}
                aria-label={`Remove ${loc.city}`}
                style={{
                  position: "absolute",
                  top: "50%",
                  right: 8,
                  transform: "translateY(-50%)",
                  width: 20,
                  height: 20,
                  borderRadius: 999,
                  border: "none",
                  background: "rgba(0,0,0,0.45)",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ×
              </button>
            )}
          </div>
        );
      })}

      {/* Edit / Done toggle */}
      {locations.length > 0 && (
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          aria-label={editMode ? "Done editing" : "Edit saved locations"}
          style={{
            flexShrink: 0,
            padding: "7px 14px",
            borderRadius: 999,
            border: "1.5px solid rgba(255,255,255,0.35)",
            background: editMode ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.15)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            color: editMode ? "#111827" : "rgba(255,255,255,0.9)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            minHeight: 36,
            transition: "all 0.15s",
          }}
        >
          {editMode ? "Done" : "✏️"}
        </button>
      )}

      {/* Add city — hidden during edit mode */}
      {!editMode && locations.length < 5 && (
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
