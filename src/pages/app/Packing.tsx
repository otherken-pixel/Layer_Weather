import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/store";
import { fetchWeatherData } from "@/lib/weather";
import { generatePackingList, DEFAULT_CALIBRATION } from "@/lib/outfit-logic";

interface GeoResult { name: string; latitude: number; longitude: number; country: string; admin1?: string; }

const CATEGORIES = ["outerwear", "tops", "bottoms", "footwear", "accessories"] as const;

export default function Packing() {
  const { calibration } = useAppStore();
  const cal = calibration ?? DEFAULT_CALIBRATION;

  const [destination, setDestination] = useState("");
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [selected, setSelected] = useState<GeoResult | null>(null);
  const [days, setDays] = useState("5");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<{ category: string; name: string; quantity: number; reason?: string }[]>([]);
  const [error, setError] = useState("");

  async function search() {
    if (!destination.trim()) return;
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=5&language=en&format=json`);
      const json = await res.json();
      setGeoResults(json.results ?? []);
    } catch { setError("Could not search for destination."); }
  }

  async function generate() {
    if (!selected) return;
    setLoading(true); setError("");
    try {
      const tripDays = Math.max(1, Math.min(14, parseInt(days) || 5));
      const weather = await fetchWeatherData(selected.latitude, selected.longitude);
      setItems(generatePackingList(weather.daily.slice(0, tripDays), cal));
    } catch { setError("Could not fetch weather for this destination."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-full px-5 py-6 pt-safe flex flex-col gap-4" style={{ background: "linear-gradient(to bottom,#1a1a2e,#203A43)" }}>
      <div>
        <h1 className="text-3xl font-black text-white" style={{ letterSpacing: "-0.5px" }}>Travel Packing</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>Weather-smart packing lists for any trip</p>
      </div>

      <Card>
        <div className="flex flex-col gap-3">
          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.6)" }}>Destination</label>
          <div className="flex gap-2">
            <input
              value={destination}
              onChange={e => { setDestination(e.target.value); setSelected(null); }}
              onKeyDown={e => e.key === "Enter" && search()}
              placeholder="Paris, Tokyo, New York…"
              className="flex-1 rounded-xl px-4 py-3 text-base text-white outline-none border"
              style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)" }}
            />
            <button onClick={search} className="w-12 h-12 rounded-xl flex items-center justify-center bg-brand text-white text-lg flex-shrink-0">🔍</button>
          </div>

          {geoResults.length > 0 && !selected && (
            <div className="flex flex-col divide-y" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              {geoResults.map((r, i) => (
                <button key={i} onClick={() => { setSelected(r); setDestination(`${r.name}, ${r.country}`); setGeoResults([]); }}
                  className="flex items-center gap-2 py-2.5 text-sm text-white text-left">
                  <span>📍</span> {r.name}{r.admin1 ? `, ${r.admin1}` : ""}, {r.country}
                </button>
              ))}
            </div>
          )}

          <label className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>Trip length (days)</label>
          <input type="number" min={1} max={14} value={days} onChange={e => setDays(e.target.value)}
            className="w-24 rounded-xl px-4 py-3 text-base text-white outline-none border"
            style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.15)" }}
          />
        </div>
      </Card>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <Button
        label={selected ? `Generate list for ${selected.name}` : "Select a destination first"}
        onPress={generate}
        disabled={!selected}
        loading={loading}
        variant="primary"
        size="lg"
        fullWidth
      />

      {items.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-white">{selected?.name} · {days} days</h2>
          {CATEGORIES.map((cat) => {
            const catItems = items.filter(i => i.category === cat);
            if (!catItems.length) return null;
            return (
              <Card key={cat}>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.55)" }}>{cat}</p>
                <div className="flex flex-col gap-2.5">
                  {catItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-brand-light flex-shrink-0" style={{ background: "rgba(108,99,255,0.15)" }}>{item.quantity}×</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{item.name}</p>
                        {item.reason && <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{item.reason}</p>}
                      </div>
                      <span style={{ color: "rgba(255,255,255,0.3)" }}>✓</span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
