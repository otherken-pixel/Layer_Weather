import React, { useState } from "react";
import { useAppStore } from "@/store";
import { useAccentColor } from "@/hooks/useAccentColor";
import { fetchWeatherData } from "@/lib/weather";
import { generatePackingList, DEFAULT_CALIBRATION } from "@/lib/outfit-logic";
import { annotatePackingListWithWardrobe, type AnnotatedPackingItem } from "@/lib/wardrobe-matching";

interface GeoResult { name: string; latitude: number; longitude: number; country: string; admin1?: string; }

const CATEGORIES = ["outerwear", "tops", "bottoms", "footwear", "accessories"] as const;
const CATEGORY_EMOJI: Record<string, string> = {
  outerwear: "🧥", tops: "👕", bottoms: "👖", footwear: "👟", accessories: "🧣",
};

export default function Packing() {
  const { calibration, wardrobeItems } = useAppStore();
  const { accent, accentSolid } = useAccentColor();
  const cal = calibration ?? DEFAULT_CALIBRATION;

  const [destination, setDestination] = useState("");
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [noResults, setNoResults] = useState(false);
  const [selected, setSelected] = useState<GeoResult | null>(null);
  const [days, setDays] = useState("5");
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AnnotatedPackingItem[]>([]);
  const [error, setError] = useState("");

  async function search() {
    const query = destination.trim().split(",")[0].trim();
    if (!query) return;
    setSearching(true); setNoResults(false); setGeoResults([]);
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
      const json = await res.json();
      const results: GeoResult[] = json.results ?? [];
      setGeoResults(results);
      setNoResults(results.length === 0);
    } catch { setError("Could not search for destination."); }
    finally { setSearching(false); }
  }

  async function generate() {
    if (!selected) return;
    setLoading(true); setError("");
    try {
      const tripDays = Math.max(1, Math.min(14, parseInt(days) || 5));
      const weather = await fetchWeatherData(selected.latitude, selected.longitude);
      const rawList = generatePackingList(weather.daily.slice(0, tripDays), cal);
      setItems(annotatePackingListWithWardrobe(rawList, wardrobeItems));
    } catch { setError("Could not fetch weather for this destination."); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100%", background: "#F2F2F7", display: "flex", flexDirection: "column" }}>

      {/* ── Header ── */}
      <div style={{
        background: "#F2F2F7",
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 36px)",
        paddingBottom: 16, paddingLeft: 20, paddingRight: 20,
      }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em", margin: 0 }}>
          Travel Packing
        </h1>
        <p style={{ fontSize: 14, color: "#9CA3AF", marginTop: 4 }}>Weather-smart packing lists for any trip</p>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, padding: "0 14px 32px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Search card */}
        <div style={{ background: "#fff", borderRadius: 24, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>

          <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
            Destination
          </p>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={destination}
              onChange={(e) => { setDestination(e.target.value); setSelected(null); setGeoResults([]); setNoResults(false); }}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Paris, Tokyo, New York…"
              style={{
                flex: 1, background: "#F3F4F6", border: "1.5px solid #E5E7EB",
                borderRadius: 14, padding: "12px 14px", fontSize: 15, color: "#111827",
                outline: "none",
              }}
            />
            <button
              onClick={search}
              disabled={searching}
              style={{
                width: 48, height: 48, borderRadius: 14, background: accentSolid,
                border: "none", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, cursor: searching ? "not-allowed" : "pointer", flexShrink: 0,
                opacity: searching ? 0.7 : 1,
              }}
            >
              {searching ? "⏳" : "🔍"}
            </button>
          </div>

          {/* Geo results */}
          {geoResults.length > 0 && !selected && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column" }}>
              {geoResults.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setSelected(r); setDestination(`${r.name}${r.admin1 ? `, ${r.admin1}` : ""}, ${r.country}`); setGeoResults([]); setNoResults(false); }}
                  className="flex items-center gap-2 min-h-[44px] py-2.5 px-1 w-full bg-transparent border-0 cursor-pointer text-left text-sm text-neutral-900"
                  style={{
                    borderBottom: i < geoResults.length - 1 ? "1px solid #F3F4F6" : "none",
                  }}
                >
                  <span>📍</span>
                  <span>{r.name}{r.admin1 ? `, ${r.admin1}` : ""}, {r.country}</span>
                </button>
              ))}
            </div>
          )}

          {noResults && !selected && (
            <p style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", marginTop: 8, paddingBottom: 4 }}>
              No destinations found — try a different spelling.
            </p>
          )}

          {/* Trip length */}
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
              Trip length (days)
            </p>
            <input
              type="number" min={1} max={14}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              style={{
                width: 80, background: "#F3F4F6", border: "1.5px solid #E5E7EB",
                borderRadius: 12, padding: "10px 14px", fontSize: 15, fontWeight: 700,
                color: "#111827", outline: "none", textAlign: "center",
              }}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p style={{ fontSize: 13, color: "#EF4444", paddingLeft: 4 }}>{error}</p>
        )}

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={!selected || loading}
          style={{
            background: selected ? accentSolid : "#E5E7EB",
            color: selected ? "white" : "#9CA3AF",
            border: "none", borderRadius: 16, padding: "16px 0",
            fontSize: 16, fontWeight: 700, width: "100%",
            cursor: selected && !loading ? "pointer" : "not-allowed",
            transition: "background 0.2s",
          }}
        >
          {loading ? "⟳ Fetching weather…" : selected ? `Pack for ${selected.name}` : "Select a destination first"}
        </button>

        {/* Packing list */}
        {items.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, paddingLeft: 4, marginTop: 4 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 }}>{selected?.name}</h2>
              <span style={{ fontSize: 14, color: "#9CA3AF" }}>{days} days</span>
            </div>

            {CATEGORIES.map((cat) => {
              const catItems = items.filter((i) => i.category === cat);
              if (!catItems.length) return null;
              return (
                <div key={cat} style={{ background: "#fff", borderRadius: 24, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                    <span style={{ fontSize: 16 }}>{CATEGORY_EMOJI[cat]}</span>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
                      {cat}
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {catItems.map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{
                          minWidth: 36, height: 36, borderRadius: 12,
                          background: item.ownedItem ? "#DCFCE7" : "#EDE9FE",
                          color: item.ownedItem ? "#15803D" : accent,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 800,
                        }}>
                          {item.quantity}×
                        </span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0 }}>{item.name}</p>
                          {item.ownedItem && (
                            <p style={{ fontSize: 12, color: "#15803D", margin: 0, fontWeight: 600 }}>
                              ✓ You have: {item.ownedItem.name}
                            </p>
                          )}
                          {item.reason && !item.ownedItem && (
                            <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>{item.reason}</p>
                          )}
                        </div>
                        <span style={{ fontSize: 16, color: item.ownedItem ? "#22C55E" : "#D1D5DB" }}>✓</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
