import React, { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/store";
import { useAccentColor } from "@/hooks/useAccentColor";
import { fetchWeatherForDateRange } from "@/lib/weather";
import { generatePackingList, DEFAULT_CALIBRATION } from "@/lib/outfit-logic";
import { annotatePackingListWithWardrobe, type AnnotatedPackingItem } from "@/lib/wardrobe-matching";
import {
  getPackingTrips,
  savePackingTrip,
  updatePackingTrip,
  deletePackingTrip,
} from "@/lib/supabase";
import type { SavedPackingTrip, PackingItem, SerializedDailyForecast, DailyForecast } from "@/types";

interface GeoResult { name: string; latitude: number; longitude: number; country: string; admin1?: string; }

const CATEGORIES = ["outerwear", "tops", "bottoms", "footwear", "accessories"] as const;
const CATEGORY_EMOJI: Record<string, string> = {
  outerwear: "🧥", tops: "👕", bottoms: "👖", footwear: "👟", accessories: "🧣",
};

function toLocalDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayStr(): string {
  return toLocalDayKey(new Date());
}

function tripCountdown(departureDateStr: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dep = new Date(departureDateStr + "T00:00:00");
  const days = Math.round((dep.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "Past trip";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

function isPastTrip(returnDateStr: string): boolean {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const ret = new Date(returnDateStr + "T00:00:00");
  return ret < today;
}

function tripLengthDays(dep: string, ret: string): number {
  const d1 = new Date(dep + "T00:00:00");
  const d2 = new Date(ret + "T00:00:00");
  return Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
}

function formatDateRange(dep: string, ret: string): string {
  const d = new Date(dep + "T00:00:00");
  const r = new Date(ret + "T00:00:00");
  const sameYear = d.getFullYear() === r.getFullYear();
  const sameMonth = sameYear && d.getMonth() === r.getMonth();
  if (sameMonth) {
    return `${d.toLocaleDateString("en", { month: "short" })} ${d.getDate()}–${r.getDate()}${sameYear ? "" : `, ${r.getFullYear()}`}`;
  }
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${d.toLocaleDateString("en", opts)} – ${r.toLocaleDateString("en", opts)}${sameYear ? "" : `, ${r.getFullYear()}`}`;
}

function daysToReturn(returnDateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const ret = new Date(returnDateStr + "T00:00:00");
  return Math.ceil((ret.getTime() - today.getTime()) / 86400000);
}

function forecastStatus(returnDateStr: string): "full" | "extended" | "unavailable" {
  const d = daysToReturn(returnDateStr);
  if (d <= 10) return "full";
  if (d <= 16) return "extended";
  return "unavailable";
}

function forecastAvailableOn(departureDateStr: string): string {
  const dep = new Date(departureDateStr + "T00:00:00");
  const avail = new Date(dep.getTime() - 16 * 86400000);
  return avail.toLocaleDateString("en", { month: "short", day: "numeric" });
}

function serializeForecasts(forecasts: DailyForecast[]): SerializedDailyForecast[] {
  return forecasts.map((d) => ({
    date: d.date.toISOString(),
    tempMin: d.tempMin,
    tempMax: d.tempMax,
    feelsLikeMin: d.feelsLikeMin,
    feelsLikeMax: d.feelsLikeMax,
    precipProb: d.precipProb,
    condition: d.condition,
    weatherCode: d.weatherCode,
    sunrise: d.sunrise.toISOString(),
    sunset: d.sunset.toISOString(),
  }));
}

function formatLastUpdated(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

export default function Packing() {
  const { calibration, wardrobeItems, userId } = useAppStore();
  const { accentSolid } = useAccentColor();
  const cal = calibration ?? DEFAULT_CALIBRATION;

  // ── New-trip form ──
  const [destination, setDestination] = useState("");
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [noResults, setNoResults] = useState(false);
  const [selected, setSelected] = useState<GeoResult | null>(null);
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Current generated list (before saving) ──
  const [currentItems, setCurrentItems] = useState<AnnotatedPackingItem[]>([]);
  const [currentForecasts, setCurrentForecasts] = useState<DailyForecast[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedConfirm, setSavedConfirm] = useState(false);
  const [forecastIncomplete, setForecastIncomplete] = useState(false);

  // ── Saved trips ──
  const [savedTrips, setSavedTrips] = useState<SavedPackingTrip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [tripItems, setTripItems] = useState<Record<string, AnnotatedPackingItem[]>>({});
  const [refreshingTripId, setRefreshingTripId] = useState<string | null>(null);
  const [tripDiffs, setTripDiffs] = useState<Record<string, { added: string[]; removed: string[] }>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoadingTrips(true);
    getPackingTrips(userId)
      .then((trips) => setSavedTrips(trips))
      .catch(() => {})
      .finally(() => setLoadingTrips(false));
  }, [userId]);

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
    if (!selected || !departureDate || !returnDate) return;
    setLoading(true); setError(""); setCurrentItems([]); setCurrentForecasts([]); setForecastIncomplete(false);
    try {
      const dep = new Date(departureDate + "T00:00:00");
      const ret = new Date(returnDate + "T00:00:00");
      const countryCode = selected.country?.slice(0, 2).toUpperCase();
      const result = await fetchWeatherForDateRange(
        selected.latitude, selected.longitude, dep, ret,
        { countryCode },
      );
      if (!result || result.forecasts.length === 0) {
        setError(`Forecast not available yet — save this trip and check back closer to departure (forecast unlocks ${forecastAvailableOn(departureDate)}).`);
        return;
      }
      if (!result.isForecastComplete) setForecastIncomplete(true);
      const rawList = generatePackingList(result.forecasts, cal);
      setCurrentItems(annotatePackingListWithWardrobe(rawList, wardrobeItems));
      setCurrentForecasts(result.forecasts);
    } catch { setError("Could not fetch weather for this destination."); }
    finally { setLoading(false); }
  }

  async function saveTrip() {
    if (!selected || !userId) return;
    setSaving(true); setError("");
    try {
      const rawList: PackingItem[] = currentItems.map(({ ownedItem: _o, ...rest }) => rest);
      const snapshot = currentForecasts.length ? serializeForecasts(currentForecasts) : null;
      const trip = await savePackingTrip({
        user_id: userId,
        destination: selected.name,
        latitude: selected.latitude,
        longitude: selected.longitude,
        country_code: selected.country?.slice(0, 2).toUpperCase() ?? null,
        departure_date: departureDate,
        return_date: returnDate,
        packing_list: rawList.length ? rawList : null,
        weather_snapshot: snapshot,
        last_generated_at: rawList.length ? new Date().toISOString() : null,
      });
      setSavedTrips((prev) =>
        [...prev, trip].sort((a, b) => a.departure_date.localeCompare(b.departure_date))
      );
      setSavedConfirm(true);
      setTimeout(() => setSavedConfirm(false), 3000);
      setCurrentItems([]); setCurrentForecasts([]); setSelected(null); setDestination(""); setDepartureDate(""); setReturnDate("");
    } catch { setError("Could not save trip."); }
    finally { setSaving(false); }
  }

  async function saveTripWithoutForecast() {
    if (!selected || !userId) return;
    setSaving(true); setError("");
    try {
      const trip = await savePackingTrip({
        user_id: userId,
        destination: selected.name,
        latitude: selected.latitude,
        longitude: selected.longitude,
        country_code: selected.country?.slice(0, 2).toUpperCase() ?? null,
        departure_date: departureDate,
        return_date: returnDate,
        packing_list: null,
        weather_snapshot: null,
        last_generated_at: null,
      });
      setSavedTrips((prev) =>
        [...prev, trip].sort((a, b) => a.departure_date.localeCompare(b.departure_date))
      );
      setSavedConfirm(true);
      setTimeout(() => setSavedConfirm(false), 3000);
      setSelected(null); setDestination(""); setDepartureDate(""); setReturnDate(""); setError("");
    } catch { setError("Could not save trip."); }
    finally { setSaving(false); }
  }

  const openTrip = useCallback(
    (trip: SavedPackingTrip) => {
      if (expandedTripId === trip.id) { setExpandedTripId(null); return; }
      if (!tripItems[trip.id] && trip.packing_list) {
        setTripItems((prev) => ({
          ...prev,
          [trip.id]: annotatePackingListWithWardrobe(trip.packing_list!, wardrobeItems),
        }));
      }
      setExpandedTripId(trip.id);
    },
    [expandedTripId, tripItems, wardrobeItems],
  );

  async function refreshTrip(trip: SavedPackingTrip) {
    setRefreshingTripId(trip.id); setError("");
    try {
      const dep = new Date(trip.departure_date + "T00:00:00");
      const ret = new Date(trip.return_date + "T00:00:00");
      const result = await fetchWeatherForDateRange(
        trip.latitude, trip.longitude, dep, ret,
        { countryCode: trip.country_code ?? undefined },
      );
      if (!result || result.forecasts.length === 0) {
        setError(`Forecast not available yet — check back ${forecastAvailableOn(trip.departure_date)}.`);
        return;
      }
      const rawList = generatePackingList(result.forecasts, cal);
      const annotated = annotatePackingListWithWardrobe(rawList, wardrobeItems);

      // Compute diff vs stored list
      const oldNames = new Set((trip.packing_list ?? []).map((i) => i.name));
      const newNames = new Set(annotated.map((i) => i.name));
      const added = [...newNames].filter((n) => !oldNames.has(n));
      const removed = [...oldNames].filter((n) => !newNames.has(n));
      if (added.length || removed.length) {
        setTripDiffs((prev) => ({ ...prev, [trip.id]: { added, removed } }));
      } else {
        setTripDiffs((prev) => { const p = { ...prev }; delete p[trip.id]; return p; });
      }

      const newRawList: PackingItem[] = annotated.map(({ ownedItem: _o, ...rest }) => rest);
      const snapshot = serializeForecasts(result.forecasts);
      const lastGenAt = new Date().toISOString();
      await updatePackingTrip(trip.id, { packing_list: newRawList, weather_snapshot: snapshot, last_generated_at: lastGenAt });
      setSavedTrips((prev) =>
        prev.map((t) => t.id === trip.id ? { ...t, packing_list: newRawList, weather_snapshot: snapshot, last_generated_at: lastGenAt } : t)
      );
      setTripItems((prev) => ({ ...prev, [trip.id]: annotated }));
    } catch { setError("Could not refresh weather."); }
    finally { setRefreshingTripId(null); }
  }

  async function confirmDelete(tripId: string) {
    try {
      await deletePackingTrip(tripId);
      setSavedTrips((prev) => prev.filter((t) => t.id !== tripId));
      setTripItems((prev) => { const p = { ...prev }; delete p[tripId]; return p; });
      setTripDiffs((prev) => { const p = { ...prev }; delete p[tripId]; return p; });
      if (expandedTripId === tripId) setExpandedTripId(null);
    } catch { setError("Could not delete trip."); }
    finally { setConfirmDeleteId(null); }
  }

  const canGenerate = !!selected && !!departureDate && !!returnDate && returnDate >= departureDate;
  const today = todayStr();

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

      <div style={{ flex: 1, padding: "0 14px 32px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* ── New trip form ── */}
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
              style={{ flex: 1, background: "#F3F4F6", border: "1.5px solid #E5E7EB", borderRadius: 14, padding: "12px 14px", fontSize: 15, color: "#111827", outline: "none" }}
            />
            <button
              onClick={search}
              disabled={searching}
              style={{ width: 48, height: 48, borderRadius: 14, background: accentSolid, border: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: searching ? "not-allowed" : "pointer", flexShrink: 0, opacity: searching ? 0.7 : 1 }}
            >
              {searching ? "⏳" : "🔍"}
            </button>
          </div>

          {geoResults.length > 0 && !selected && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column" }}>
              {geoResults.map((r, i) => (
                <button
                  key={i} type="button"
                  onClick={() => { setSelected(r); setDestination(`${r.name}${r.admin1 ? `, ${r.admin1}` : ""}, ${r.country}`); setGeoResults([]); setNoResults(false); }}
                  className="flex items-center gap-2 min-h-[44px] py-2.5 px-1 w-full bg-transparent border-0 cursor-pointer text-left text-sm text-neutral-900"
                  style={{ borderBottom: i < geoResults.length - 1 ? "1px solid #F3F4F6" : "none" }}
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

          {/* Date pickers */}
          <div style={{ marginTop: 14, display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                Departure
              </p>
              <input
                type="date"
                min={today}
                value={departureDate}
                onChange={(e) => {
                  setDepartureDate(e.target.value);
                  if (returnDate && e.target.value > returnDate) setReturnDate(e.target.value);
                }}
                style={{ width: "100%", background: "#F3F4F6", border: "1.5px solid #E5E7EB", borderRadius: 12, padding: "10px 12px", fontSize: 14, color: departureDate ? "#111827" : "#9CA3AF", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                Return
              </p>
              <input
                type="date"
                min={departureDate || today}
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                style={{ width: "100%", background: "#F3F4F6", border: "1.5px solid #E5E7EB", borderRadius: 12, padding: "10px 12px", fontSize: 14, color: returnDate ? "#111827" : "#9CA3AF", outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>

          {departureDate && returnDate && (
            <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 8 }}>
              {tripLengthDays(departureDate, returnDate)} day{tripLengthDays(departureDate, returnDate) !== 1 ? "s" : ""}
              {" · "}
              {forecastStatus(returnDate) === "full" && <span style={{ color: "#22C55E" }}>Full forecast available</span>}
              {forecastStatus(returnDate) === "extended" && <span style={{ color: "#F59E0B" }}>Extended forecast (Open-Meteo)</span>}
              {forecastStatus(returnDate) === "unavailable" && <span style={{ color: "#9CA3AF" }}>Forecast unlocks {forecastAvailableOn(departureDate)}</span>}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#FEF2F2", borderRadius: 14, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <p style={{ fontSize: 13, color: "#EF4444", margin: 0, flex: 1 }}>{error}</p>
            {selected && departureDate && returnDate && forecastStatus(returnDate) === "unavailable" && (
              <button
                onClick={saveTripWithoutForecast}
                disabled={saving || !userId}
                style={{ fontSize: 12, fontWeight: 700, color: accentSolid, background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
              >
                {saving ? "Saving…" : "Save for Later"}
              </button>
            )}
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={!canGenerate || loading}
          style={{
            background: canGenerate ? accentSolid : "#E5E7EB",
            color: canGenerate ? "white" : "#9CA3AF",
            border: "none", borderRadius: 16, padding: "16px 0",
            fontSize: 16, fontWeight: 700, width: "100%",
            cursor: canGenerate && !loading ? "pointer" : "not-allowed",
            transition: "background 0.2s",
          }}
        >
          {loading ? "⟳ Fetching weather…" : selected ? `Pack for ${selected.name}` : "Select a destination & dates"}
        </button>

        {/* Packing list (unsaved) */}
        {currentItems.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", paddingLeft: 4, marginTop: 4 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 }}>{selected?.name}</h2>
                <span style={{ fontSize: 14, color: "#9CA3AF" }}>{formatDateRange(departureDate, returnDate)}</span>
              </div>
              {userId && (
                <button
                  onClick={saveTrip}
                  disabled={saving}
                  style={{
                    fontSize: 13, fontWeight: 700,
                    color: savedConfirm ? "#22C55E" : "white",
                    background: savedConfirm ? "#DCFCE7" : accentSolid,
                    border: "none", borderRadius: 10, padding: "6px 14px",
                    cursor: saving ? "not-allowed" : "pointer", flexShrink: 0,
                  }}
                >
                  {savedConfirm ? "✓ Saved!" : saving ? "Saving…" : "Save Trip"}
                </button>
              )}
            </div>

            {forecastIncomplete && (
              <div style={{ background: "#FFFBEB", borderRadius: 12, padding: "10px 14px" }}>
                <p style={{ fontSize: 12, color: "#92400E", margin: 0 }}>⚠️ Partial forecast — recommendations cover the days available. Refresh closer to departure for the full picture.</p>
              </div>
            )}

            {CATEGORIES.map((cat) => {
              const catItems = currentItems.filter((i) => i.category === cat);
              if (!catItems.length) return null;
              return (
                <PackingCategoryCard
                  key={cat}
                  cat={cat}
                  items={catItems}
                  accentSolid={accentSolid}
                  diffAdded={new Set()}
                  diffRemoved={[]}
                />
              );
            })}
          </>
        )}

        {/* ── Saved trips ── */}
        {(savedTrips.length > 0 || loadingTrips) && (
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", paddingLeft: 4, marginBottom: 10 }}>
              My Trips
            </p>

            {loadingTrips && (
              <p style={{ fontSize: 14, color: "#9CA3AF", textAlign: "center", padding: "16px 0" }}>Loading trips…</p>
            )}

            {savedTrips.map((trip) => {
              const isExpanded = expandedTripId === trip.id;
              const isPast = isPastTrip(trip.return_date);
              const countdown = tripCountdown(trip.departure_date);
              const fStatus = forecastStatus(trip.return_date);
              const isRefreshing = refreshingTripId === trip.id;
              const diff = tripDiffs[trip.id];
              const items = tripItems[trip.id] ?? [];
              const hasItems = items.length > 0 || (trip.packing_list?.length ?? 0) > 0;

              return (
                <div
                  key={trip.id}
                  style={{
                    background: "#fff",
                    borderRadius: 20,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                    marginBottom: 10,
                    overflow: "hidden",
                    opacity: isPast ? 0.75 : 1,
                  }}
                >
                  {/* Trip card header */}
                  <div
                    style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                    onClick={() => openTrip(trip)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{trip.destination}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "2px 7px",
                          background: isPast ? "#F3F4F6" : countdown === "Tomorrow" || countdown === "Today" ? "#FEF3C7" : "#EDE9FE",
                          color: isPast ? "#9CA3AF" : countdown === "Tomorrow" || countdown === "Today" ? "#92400E" : accentSolid,
                        }}>
                          {countdown}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: "#9CA3AF", margin: "2px 0 0" }}>
                        {formatDateRange(trip.departure_date, trip.return_date)} · {tripLengthDays(trip.departure_date, trip.return_date)} days
                      </p>
                    </div>

                    {/* Delete button */}
                    <div onClick={(e) => e.stopPropagation()}>
                      {confirmDeleteId === trip.id ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => confirmDelete(trip.id)}
                            style={{ fontSize: 12, fontWeight: 700, color: "white", background: "#EF4444", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            style={{ fontSize: 12, color: "#6B7280", background: "#F3F4F6", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(trip.id)}
                          style={{ width: 32, height: 32, borderRadius: 10, background: "#F3F4F6", border: "none", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                          aria-label="Delete trip"
                        >
                          🗑️
                        </button>
                      )}
                    </div>

                    <span style={{ fontSize: 18, color: "#D1D5DB", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>›</span>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div style={{ borderTop: "1px solid #F3F4F6", padding: "14px 16px" }}>
                      {/* Refresh row */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8 }}>
                        <div>
                          {trip.last_generated_at && (
                            <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Updated {formatLastUpdated(trip.last_generated_at)}</p>
                          )}
                          {fStatus === "unavailable" && !isPast && (
                            <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Forecast available {forecastAvailableOn(trip.departure_date)}</p>
                          )}
                          {fStatus !== "unavailable" && !trip.last_generated_at && (
                            <p style={{ fontSize: 12, color: accentSolid, margin: 0 }}>Forecast is ready — tap Refresh</p>
                          )}
                        </div>
                        {!isPast && (
                          <button
                            onClick={() => refreshTrip(trip)}
                            disabled={isRefreshing || fStatus === "unavailable"}
                            style={{
                              fontSize: 13, fontWeight: 700,
                              color: fStatus === "unavailable" ? "#9CA3AF" : "white",
                              background: fStatus === "unavailable" ? "#F3F4F6" : accentSolid,
                              border: "none", borderRadius: 10, padding: "7px 14px",
                              cursor: isRefreshing || fStatus === "unavailable" ? "not-allowed" : "pointer",
                              flexShrink: 0,
                            }}
                          >
                            {isRefreshing ? "⟳ Refreshing…" : "↻ Refresh Weather"}
                          </button>
                        )}
                      </div>

                      {/* Diff banner */}
                      {diff && (diff.added.length > 0 || diff.removed.length > 0) && (
                        <div style={{ background: "#FFFBEB", borderRadius: 12, padding: "10px 14px", marginBottom: 12 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: "#92400E", margin: "0 0 4px" }}>Weather changed — packing list updated</p>
                          {diff.added.length > 0 && <p style={{ fontSize: 12, color: "#15803D", margin: 0 }}>+ Now needed: {diff.added.join(", ")}</p>}
                          {diff.removed.length > 0 && <p style={{ fontSize: 12, color: "#6B7280", margin: "2px 0 0", textDecoration: "line-through" }}>No longer needed: {diff.removed.join(", ")}</p>}
                        </div>
                      )}

                      {/* Packing list */}
                      {hasItems ? (
                        CATEGORIES.map((cat) => {
                          const catItems = items.filter((i) => i.category === cat);
                          if (!catItems.length) return null;
                          return (
                            <PackingCategoryCard
                              key={cat}
                              cat={cat}
                              items={catItems}
                              accentSolid={accentSolid}
                              diffAdded={new Set(diff?.added ?? [])}
                              diffRemoved={diff?.removed ?? []}
                            />
                          );
                        })
                      ) : (
                        <p style={{ fontSize: 14, color: "#9CA3AF", textAlign: "center", padding: "16px 0" }}>
                          {fStatus === "unavailable" ? "Forecast not yet available — check back closer to departure." : "Tap Refresh to generate your packing list."}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty saved trips prompt */}
        {!loadingTrips && savedTrips.length === 0 && !currentItems.length && userId && (
          <div style={{ background: "#fff", borderRadius: 20, padding: "20px 16px", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginTop: 4 }}>
            <p style={{ fontSize: 28, margin: "0 0 8px" }}>✈️</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>No trips saved yet</p>
            <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>Search a destination, pick your dates, and save trips here to get updated packing lists as your trip approaches.</p>
          </div>
        )}

        {!userId && savedTrips.length === 0 && (
          <div style={{ background: "#fff", borderRadius: 20, padding: "16px", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginTop: 4 }}>
            <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>Sign in to save trips and get weather-updated packing lists.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared packing category card ──────────────────────────────────────────────

function PackingCategoryCard({
  cat,
  items,
  accentSolid,
  diffAdded,
  diffRemoved,
}: {
  cat: string;
  items: AnnotatedPackingItem[];
  accentSolid: string;
  diffAdded: Set<string>;
  diffRemoved: string[];
}) {
  const removedSet = new Set(diffRemoved);
  return (
    <div style={{ background: "#F9FAFB", borderRadius: 18, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>{CATEGORY_EMOJI[cat]}</span>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
          {cat}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item, i) => {
          const isNew = diffAdded.has(item.name);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, opacity: removedSet.has(item.name) ? 0.4 : 1 }}>
              <span style={{
                minWidth: 36, height: 36, borderRadius: 12,
                background: isNew ? "#DCFCE7" : item.ownedItem ? "#DCFCE7" : "#EDE9FE",
                color: isNew ? "#15803D" : item.ownedItem ? "#15803D" : accentSolid,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800,
              }}>
                {item.quantity}×
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#111827", margin: 0 }}>{item.name}</p>
                  {isNew && <span style={{ fontSize: 10, fontWeight: 700, color: "#15803D", background: "#DCFCE7", borderRadius: 4, padding: "1px 5px" }}>NEW</span>}
                </div>
                {item.ownedItem && (
                  <p style={{ fontSize: 12, color: "#15803D", margin: 0, fontWeight: 600 }}>✓ You have: {item.ownedItem.name}</p>
                )}
                {item.reason && !item.ownedItem && (
                  <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>{item.reason}</p>
                )}
              </div>
              <span style={{ fontSize: 16, color: item.ownedItem ? "#22C55E" : "#D1D5DB" }}>✓</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
