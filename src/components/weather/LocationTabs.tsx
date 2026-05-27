import React, { useState, useEffect } from "react";
import { MapPin, Pencil, Plus, X } from "lucide-react";
import { locationTabKey } from "@/lib/location-cache-key";
import type { LocationData } from "@/types";

interface Props {
  locations: LocationData[];
  /** Composite cache key for the active saved city, or null when on device GPS. */
  activeLocationKey: string | null;
  activeIsDevice: boolean;
  onSelect: (loc: LocationData) => void;
  onSelectDevice: () => void;
  onAdd: () => void;
  onDelete: (loc: LocationData) => void;
}

export function LocationTabs({
  locations,
  activeLocationKey,
  activeIsDevice,
  onSelect,
  onSelectDevice,
  onAdd,
  onDelete,
}: Props) {
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (locations.length === 0) setEditMode(false);
  }, [locations.length]);

  const pillBase: React.CSSProperties = {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    minHeight: 34,
    transition: "all 0.15s",
    whiteSpace: "nowrap",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  };

  const activePill: React.CSSProperties = {
    ...pillBase,
    padding: "6px 14px",
    background: "rgba(255,255,255,0.95)",
    border: "1.5px solid rgba(255,255,255,0.9)",
    color: "#111827",
    fontWeight: 700,
    boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
  };

  const inactivePill: React.CSSProperties = {
    ...pillBase,
    padding: "6px 14px",
    background: "transparent",
    border: "1.5px solid transparent",
    color: "rgba(255,255,255,0.75)",
  };

  return (
    <div style={{ position: "relative", zIndex: 5 }}>
      <div
        className="no-scrollbar"
        style={{
          display: "flex",
          overflowX: "auto",
          gap: 8,
          paddingLeft: 16,
          paddingRight: 48,
          paddingBottom: 14,
          paddingTop: 10,
        }}
      >
        <button
          type="button"
          onClick={onSelectDevice}
          aria-pressed={activeIsDevice}
          aria-label="Use my current location"
          style={activeIsDevice ? activePill : inactivePill}
        >
          <MapPin size={13} strokeWidth={2.5} />
          My Location
        </button>

        {locations.map((loc) => {
          const isActive =
            !activeIsDevice &&
            activeLocationKey != null &&
            locationTabKey(loc) === activeLocationKey;
          return (
            <div key={locationTabKey(loc)} style={{ position: "relative", flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => { if (!editMode) onSelect(loc); }}
                aria-pressed={isActive}
                aria-label={`Switch to ${loc.city}`}
                style={{
                  ...(isActive ? activePill : inactivePill),
                  paddingRight: editMode ? 34 : 14,
                  cursor: editMode ? "default" : "pointer",
                }}
              >
                {loc.city}
              </button>

              {editMode && (
                <button
                  type="button"
                  onClick={() => onDelete(loc)}
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
                    background: "rgba(0,0,0,0.5)",
                    color: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  <X size={10} strokeWidth={3} />
                </button>
              )}
            </div>
          );
        })}

        {locations.length > 0 && (
          <button
            type="button"
            onClick={() => setEditMode((v) => !v)}
            aria-label={editMode ? "Done editing" : "Edit saved locations"}
            style={{
              ...inactivePill,
              padding: "6px 12px",
              background: editMode ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.14)",
              color: editMode ? "#111827" : "rgba(255,255,255,0.75)",
              fontWeight: editMode ? 700 : 500,
            }}
          >
            {editMode ? "Done" : <Pencil size={14} strokeWidth={2} />}
          </button>
        )}

        {!editMode && locations.length < 5 && (
          <button
            type="button"
            onClick={onAdd}
            aria-label="Add a location"
            style={{
              ...inactivePill,
              width: 34,
              minHeight: 34,
              padding: 0,
              justifyContent: "center",
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>

      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: 40,
          pointerEvents: "none",
          background: "linear-gradient(to right, transparent, rgba(0,0,0,0.18))",
        }}
      />
    </div>
  );
}
