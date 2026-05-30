import React, { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/store";
import { useAccentColor } from "@/hooks/useAccentColor";
import { useIsDark } from "@/hooks/useDarkMode";
import { fetchWeatherForDateRange } from "@/lib/weather";
import { DEFAULT_CALIBRATION } from "@/lib/outfit-logic";
import { annotatePackingListWithWardrobe, type AnnotatedPackingItem } from "@/lib/wardrobe-matching";
import {
  getPackingTrips,
  savePackingTrip,
  updatePackingTrip,
  deletePackingTrip,
  getWardrobeItems,
} from "@/lib/supabase";
import {
  fetchPackingInsights,
  forecastsForPackingRules,
  packingInsightsErrorMessage,
  wardrobeForInsights,
} from "@/lib/packing-insights";
import {
  generateTripPackingList,
  serializeTripDayOutfits,
  deserializeTripDayOutfits,
  type TripDayOutfit,
  type PackingScore,
} from "@/lib/trip-packing";
import {
  todayStr,
  tripCountdown,
  isPastTrip,
  tripLengthDays,
  formatDateRange,
  forecastStatus,
  forecastAvailableOn,
  forecastUnavailableMsg,
  formatLastUpdated,
  TRIP_TYPES,
  ACTIVITY_TAGS,
} from "@/lib/packing-utils";
import { PackingListView } from "@/components/packing/PackingListView";
import { PackingAiInsightsCard } from "@/components/packing/PackingAiInsightsCard";
import type {
  SavedPackingTrip,
  PackingItem,
  SerializedDailyForecast,
  DailyForecast,
  PackingAiInsights,
  PackingChecklistState,
  TripType,
} from "@/types";

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
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

function tripPackingOptions(profile: { style_preference?: import("@/types").StylePreference[]; formality_preference?: import("@/types").FormalityPreference | null } | null) {
  return {
    stylePreference: profile?.style_preference,
    formality: profile?.formality_preference ?? ("casual" as const),
    laundryAccess: false as boolean,
    activities: [] as string[],
  };
}

export default function Packing() {
  const { calibration, wardrobeItems, userId, profile, setWardrobeItems } = useAppStore();
  const { accentSolid } = useAccentColor();
  const isDark = useIsDark();
  const pageBg = isDark ? "#1C1C1E" : "#F2F2F7";
  const cardBg = isDark ? "#2C2C2E" : "#FFFFFF";
  const inputBg = isDark ? "#3A3A3C" : "#F3F4F6";
  const inputBorder = isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB";
  const inputText = isDark ? "#F4F4F5" : "#111827";
  const textPrimary = isDark ? "#F4F4F5" : "#111827";
  const hintColor = isDark ? "#9BA4B4" : "#9CA3AF";
  const dividerColor = isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6";
  const cardShadow = isDark ? "0 2px 12px rgba(0,0,0,0.25)" : "0 2px 12px rgba(0,0,0,0.06)";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : undefined;
  const cal = calibration ?? DEFAULT_CALIBRATION;

  const [tripName, setTripName] = useState("");
  const [tripType, setTripType] = useState<TripType>("leisure");
  const [activities, setActivities] = useState<string[]>([]);
  const [laundryAccess, setLaundryAccess] = useState(false);

  const [destination, setDestination] = useState("");
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [noResults, setNoResults] = useState(false);
  const [selected, setSelected] = useState<GeoResult | null>(null);
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [currentItems, setCurrentItems] = useState<AnnotatedPackingItem[]>([]);
  const [currentDailyOutfits, setCurrentDailyOutfits] = useState<TripDayOutfit[]>([]);
  const [currentScore, setCurrentScore] = useState<PackingScore | null>(null);
  const [currentForecasts, setCurrentForecasts] = useState<DailyForecast[]>([]);
  const [currentChecklist, setCurrentChecklist] = useState<PackingChecklistState>({});
  const [viewMode, setViewMode] = useState<"list" | "days">("list");
  const [saving, setSaving] = useState(false);
  const [savedConfirm, setSavedConfirm] = useState(false);
  const [forecastIncomplete, setForecastIncomplete] = useState(false);

  const [savedTrips, setSavedTrips] = useState<SavedPackingTrip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [tripItems, setTripItems] = useState<Record<string, AnnotatedPackingItem[]>>({});
  const [tripDailyOutfits, setTripDailyOutfits] = useState<Record<string, TripDayOutfit[]>>({});
  const [tripScores, setTripScores] = useState<Record<string, PackingScore>>({});
  const [tripChecklists, setTripChecklists] = useState<Record<string, PackingChecklistState>>({});
  const [tripViewModes, setTripViewModes] = useState<Record<string, "list" | "days">>({});
  const [refreshingTripId, setRefreshingTripId] = useState<string | null>(null);
  const [tripDiffs, setTripDiffs] = useState<Record<string, { added: string[]; removed: string[] }>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [currentAiInsights, setCurrentAiInsights] = useState<PackingAiInsights | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoadingTrips(true);
    getPackingTrips(userId)
      .then((trips) => {
        setSavedTrips(trips);
        const checklists: Record<string, PackingChecklistState> = {};
        for (const t of trips) {
          if (t.checklist_state) checklists[t.id] = t.checklist_state;
        }
        setTripChecklists(checklists);
      })
      .catch(() => {})
      .finally(() => setLoadingTrips(false));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void getWardrobeItems(userId)
      .then((data) => {
        if (!cancelled) setWardrobeItems(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, setWardrobeItems]);

  function packingOpts() {
    return {
      ...tripPackingOptions(profile),
      laundryAccess,
      activities,
    };
  }

  async function search() {
    const query = destination.trim().split(",")[0].trim();
    if (!query) return;
    setSearching(true);
    setNoResults(false);
    setGeoResults([]);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`,
      );
      const json = await res.json();
      const results: GeoResult[] = json.results ?? [];
      setGeoResults(results);
      setNoResults(results.length === 0);
    } catch {
      setError("Could not search for destination.");
    } finally {
      setSearching(false);
    }
  }

  function applyGeneration(
    rawList: PackingItem[],
    dailyOutfits: TripDayOutfit[],
    score: PackingScore,
    forecasts: DailyForecast[],
  ) {
    setCurrentItems(annotatePackingListWithWardrobe(rawList, wardrobeItems));
    setCurrentDailyOutfits(dailyOutfits);
    setCurrentScore(score);
    setCurrentForecasts(forecasts);
    setCurrentChecklist({});
  }

  async function generate() {
    if (!selected || !departureDate || !returnDate) return;
    setLoading(true);
    setError("");
    setCurrentItems([]);
    setCurrentForecasts([]);
    setForecastIncomplete(false);
    setCurrentAiInsights(null);
    try {
      const dep = new Date(departureDate + "T00:00:00");
      const ret = new Date(returnDate + "T00:00:00");
      const countryCode = selected.country?.slice(0, 2).toUpperCase();
      const result = await fetchWeatherForDateRange(selected.latitude, selected.longitude, dep, ret, {
        countryCode,
      });
      if (!result || result.forecasts.length === 0) {
        setError(forecastUnavailableMsg(departureDate));
        return;
      }
      if (!result.isForecastComplete) setForecastIncomplete(true);
      const { items, dailyOutfits, score } = generateTripPackingList(result.forecasts, cal, packingOpts());
      applyGeneration(items, dailyOutfits, score, result.forecasts);
    } catch {
      setError("Could not fetch weather for this destination.");
    } finally {
      setLoading(false);
    }
  }

  function toggleActivity(tag: string) {
    setActivities((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function toggleCurrentChecklist(key: string) {
    setCurrentChecklist((prev) => ({
      ...prev,
      [key]: { packed: !prev[key]?.packed },
    }));
  }

  function toggleTripChecklist(tripId: string, key: string) {
    setTripChecklists((prev) => {
      const next = {
        ...prev,
        [tripId]: {
          ...(prev[tripId] ?? {}),
          [key]: { packed: !(prev[tripId]?.[key]?.packed ?? false) },
        },
      };
      if (userId) {
        void updatePackingTrip(tripId, { checklist_state: next[tripId] }).catch(() => {});
      }
      return next;
    });
  }

  async function saveTrip() {
    if (!selected || !userId) return;
    setSaving(true);
    setError("");
    try {
      const rawList: PackingItem[] = currentItems.map(({ ownedItem: _o, ...rest }) => rest);
      const snapshot = currentForecasts.length ? serializeForecasts(currentForecasts) : null;
      const displayName = tripName.trim() || selected.name;
      const trip = await savePackingTrip({
        user_id: userId,
        destination: displayName,
        latitude: selected.latitude,
        longitude: selected.longitude,
        country_code: selected.country?.slice(0, 2).toUpperCase() ?? null,
        departure_date: departureDate,
        return_date: returnDate,
        trip_name: tripName.trim() || null,
        trip_type: tripType,
        activities,
        laundry_access: laundryAccess,
        packing_list: rawList.length ? rawList : null,
        daily_outfits: currentDailyOutfits.length ? serializeTripDayOutfits(currentDailyOutfits) : null,
        checklist_state: Object.keys(currentChecklist).length ? currentChecklist : null,
        weather_snapshot: snapshot,
        last_generated_at: rawList.length ? new Date().toISOString() : null,
        ai_insights: currentAiInsights,
        ai_generated_at: currentAiInsights ? new Date().toISOString() : null,
      });
      setSavedTrips((prev) => [...prev, trip].sort((a, b) => a.departure_date.localeCompare(b.departure_date)));
      setSavedConfirm(true);
      setTimeout(() => setSavedConfirm(false), 3000);
      resetForm();
    } catch {
      setError("Could not save trip.");
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setCurrentItems([]);
    setCurrentForecasts([]);
    setCurrentDailyOutfits([]);
    setCurrentScore(null);
    setCurrentChecklist({});
    setCurrentAiInsights(null);
    setSelected(null);
    setDestination("");
    setDepartureDate("");
    setReturnDate("");
    setTripName("");
    setActivities([]);
    setLaundryAccess(false);
  }

  async function saveTripWithoutForecast() {
    if (!selected || !userId) return;
    setSaving(true);
    setError("");
    try {
      const displayName = tripName.trim() || selected.name;
      const trip = await savePackingTrip({
        user_id: userId,
        destination: displayName,
        latitude: selected.latitude,
        longitude: selected.longitude,
        country_code: selected.country?.slice(0, 2).toUpperCase() ?? null,
        departure_date: departureDate,
        return_date: returnDate,
        trip_name: tripName.trim() || null,
        trip_type: tripType,
        activities,
        laundry_access: laundryAccess,
        packing_list: null,
        daily_outfits: null,
        checklist_state: null,
        weather_snapshot: null,
        last_generated_at: null,
        ai_insights: null,
        ai_generated_at: null,
      });
      setSavedTrips((prev) => [...prev, trip].sort((a, b) => a.departure_date.localeCompare(b.departure_date)));
      setSavedConfirm(true);
      setTimeout(() => setSavedConfirm(false), 3000);
      resetForm();
      setError("");
    } catch {
      setError("Could not save trip.");
    } finally {
      setSaving(false);
    }
  }

  const openTrip = useCallback(
    (trip: SavedPackingTrip) => {
      if (expandedTripId === trip.id) {
        setExpandedTripId(null);
        return;
      }
      if (!tripItems[trip.id] && trip.packing_list) {
        setTripItems((prev) => ({
          ...prev,
          [trip.id]: annotatePackingListWithWardrobe(trip.packing_list!, wardrobeItems),
        }));
      }
      if (!tripDailyOutfits[trip.id] && trip.daily_outfits?.length) {
        setTripDailyOutfits((prev) => ({
          ...prev,
          [trip.id]: deserializeTripDayOutfits(trip.daily_outfits!),
        }));
      }
      setExpandedTripId(trip.id);
    },
    [expandedTripId, tripItems, tripDailyOutfits, wardrobeItems],
  );

  async function refreshTrip(trip: SavedPackingTrip) {
    setRefreshingTripId(trip.id);
    setError("");
    try {
      const dep = new Date(trip.departure_date + "T00:00:00");
      const ret = new Date(trip.return_date + "T00:00:00");
      const result = await fetchWeatherForDateRange(trip.latitude, trip.longitude, dep, ret, {
        countryCode: trip.country_code ?? undefined,
      });
      if (!result || result.forecasts.length === 0) {
        setError(forecastUnavailableMsg(trip.departure_date));
        return;
      }
      const opts = {
        stylePreference: profile?.style_preference,
        formality: profile?.formality_preference ?? "casual",
        laundryAccess: trip.laundry_access ?? false,
        activities: trip.activities ?? [],
      };
      const { items, dailyOutfits, score } = generateTripPackingList(result.forecasts, cal, opts);
      const annotated = annotatePackingListWithWardrobe(items, wardrobeItems);

      const oldNames = new Set((trip.packing_list ?? []).map((i) => i.name));
      const newNames = new Set(annotated.map((i) => i.name));
      const added = [...newNames].filter((n) => !oldNames.has(n));
      const removed = [...oldNames].filter((n) => !newNames.has(n));
      if (added.length || removed.length) {
        setTripDiffs((prev) => ({ ...prev, [trip.id]: { added, removed } }));
      } else {
        setTripDiffs((prev) => {
          const p = { ...prev };
          delete p[trip.id];
          return p;
        });
      }

      const newRawList: PackingItem[] = annotated.map(({ ownedItem: _o, ...rest }) => rest);
      const snapshot = serializeForecasts(result.forecasts);
      const lastGenAt = new Date().toISOString();
      const serializedDays = serializeTripDayOutfits(dailyOutfits);
      await updatePackingTrip(trip.id, {
        packing_list: newRawList,
        weather_snapshot: snapshot,
        daily_outfits: serializedDays,
        last_generated_at: lastGenAt,
      });
      setSavedTrips((prev) =>
        prev.map((t) =>
          t.id === trip.id
            ? {
                ...t,
                packing_list: newRawList,
                weather_snapshot: snapshot,
                daily_outfits: serializedDays,
                last_generated_at: lastGenAt,
              }
            : t,
        ),
      );
      setTripItems((prev) => ({ ...prev, [trip.id]: annotated }));
      setTripDailyOutfits((prev) => ({ ...prev, [trip.id]: dailyOutfits }));
      setTripScores((prev) => ({ ...prev, [trip.id]: score }));
    } catch {
      setError("Could not refresh weather.");
    } finally {
      setRefreshingTripId(null);
    }
  }

  async function requestAiInsightsForCurrent() {
    if (!selected || !currentForecasts.length) return;
    setAiLoadingId("current");
    setError("");
    try {
      const snapshot = serializeForecasts(currentForecasts);
      const baseline = generateTripPackingList(currentForecasts, cal, packingOpts()).items;
      const insights = await fetchPackingInsights({
        destination: tripName.trim() || selected.name,
        departure_date: departureDate,
        return_date: returnDate,
        daily_forecasts: snapshot,
        calibration: cal,
        temp_unit: profile?.temp_unit ?? "F",
        baseline_packing_list: baseline,
        wardrobe_items: wardrobeForInsights(wardrobeItems),
      });
      setCurrentAiInsights(insights);
    } catch (err) {
      setError(await packingInsightsErrorMessage(err));
    } finally {
      setAiLoadingId(null);
    }
  }

  async function requestAiInsightsForTrip(trip: SavedPackingTrip) {
    setAiLoadingId(trip.id);
    setError("");
    try {
      let snapshot = trip.weather_snapshot;
      if (!snapshot?.length) {
        const dep = new Date(trip.departure_date + "T00:00:00");
        const ret = new Date(trip.return_date + "T00:00:00");
        const result = await fetchWeatherForDateRange(trip.latitude, trip.longitude, dep, ret, {
          countryCode: trip.country_code ?? undefined,
        });
        if (!result?.forecasts.length) {
          setError(forecastUnavailableMsg(trip.departure_date));
          return;
        }
        snapshot = serializeForecasts(result.forecasts);
        await updatePackingTrip(trip.id, {
          weather_snapshot: snapshot,
          last_generated_at: new Date().toISOString(),
        });
      }
      const baseline = generateTripPackingList(
        forecastsForPackingRules(snapshot).map((d, i) => ({
          date: new Date(snapshot![i].date),
          tempMin: d.feelsLikeMin,
          tempMax: d.feelsLikeMax,
          feelsLikeMin: d.feelsLikeMin,
          feelsLikeMax: d.feelsLikeMax,
          precipProb: d.precipProb,
          condition: d.condition as DailyForecast["condition"],
          weatherCode: snapshot![i].weatherCode,
          sunrise: new Date(snapshot![i].sunrise),
          sunset: new Date(snapshot![i].sunset),
        })),
        cal,
        {
          laundryAccess: trip.laundry_access,
          activities: trip.activities ?? [],
        },
      ).items;
      const insights = await fetchPackingInsights({
        destination: trip.destination,
        departure_date: trip.departure_date,
        return_date: trip.return_date,
        daily_forecasts: snapshot,
        calibration: cal,
        temp_unit: profile?.temp_unit ?? "F",
        baseline_packing_list: baseline,
        wardrobe_items: wardrobeForInsights(wardrobeItems),
      });
      const aiGenAt = new Date().toISOString();
      await updatePackingTrip(trip.id, {
        ai_insights: insights,
        ai_generated_at: aiGenAt,
      });
      setSavedTrips((prev) =>
        prev.map((t) => (t.id === trip.id ? { ...t, ai_insights: insights, ai_generated_at: aiGenAt } : t)),
      );
    } catch (err) {
      setError(await packingInsightsErrorMessage(err));
    } finally {
      setAiLoadingId(null);
    }
  }

  async function confirmDelete(tripId: string) {
    try {
      await deletePackingTrip(tripId);
      setSavedTrips((prev) => prev.filter((t) => t.id !== tripId));
      setTripItems((prev) => {
        const p = { ...prev };
        delete p[tripId];
        return p;
      });
      setTripDiffs((prev) => {
        const p = { ...prev };
        delete p[tripId];
        return p;
      });
      if (expandedTripId === tripId) setExpandedTripId(null);
    } catch {
      setError("Could not delete trip.");
    } finally {
      setConfirmDeleteId(null);
    }
  }

  const canGenerate = !!selected && !!departureDate && !!returnDate && returnDate >= departureDate;
  const today = todayStr();
  const displayDestination = tripName.trim() || selected?.name;

  return (
    <div style={{ minHeight: "100%", background: pageBg, display: "flex", flexDirection: "column" }}>
      <div style={{ background: pageBg, paddingTop: 36, paddingBottom: 16, paddingLeft: 20, paddingRight: 20 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: textPrimary, letterSpacing: "-0.03em", margin: 0 }}>
          Travel Packing
        </h1>
        <p style={{ fontSize: 14, color: hintColor, marginTop: 4 }}>
          Daily outfits and smart packing lists for your trip
        </p>
      </div>

      <div style={{ flex: 1, padding: "0 14px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: cardBg, borderRadius: 24, padding: 16, boxShadow: cardShadow, border: cardBorder }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: hintColor, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
            New trip
          </p>
          <input
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            placeholder="Trip name (optional)"
            style={{
              width: "100%",
              background: inputBg,
              border: `1.5px solid ${inputBorder}`,
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 14,
              color: inputText,
              outline: "none",
              marginBottom: 10,
              boxSizing: "border-box",
            }}
          />
          <p style={{ fontSize: 11, fontWeight: 700, color: hintColor, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
            Destination
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setSelected(null);
                setGeoResults([]);
                setNoResults(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Paris, Tokyo, New York…"
              style={{
                flex: 1,
                background: inputBg,
                border: `1.5px solid ${inputBorder}`,
                borderRadius: 14,
                padding: "12px 14px",
                fontSize: 15,
                color: inputText,
                outline: "none",
                colorScheme: isDark ? "dark" : "light",
              }}
            />
            <button
              onClick={search}
              disabled={searching}
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: accentSolid,
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                cursor: searching ? "not-allowed" : "pointer",
                flexShrink: 0,
                opacity: searching ? 0.7 : 1,
              }}
            >
              {searching ? "⏳" : "🔍"}
            </button>
          </div>

          {geoResults.length > 0 && !selected && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column" }}>
              {geoResults.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSelected(r);
                    setDestination(`${r.name}${r.admin1 ? `, ${r.admin1}` : ""}, ${r.country}`);
                    setGeoResults([]);
                    setNoResults(false);
                  }}
                  className="flex items-center gap-2 min-h-[44px] py-2.5 px-1 w-full bg-transparent border-0 cursor-pointer text-left text-sm"
                  style={{
                    borderBottom: i < geoResults.length - 1 ? `1px solid ${dividerColor}` : "none",
                    color: textPrimary,
                  }}
                >
                  <span>📍</span>
                  <span>
                    {r.name}
                    {r.admin1 ? `, ${r.admin1}` : ""}, {r.country}
                  </span>
                </button>
              ))}
            </div>
          )}

          {noResults && !selected && (
            <p style={{ fontSize: 13, color: hintColor, textAlign: "center", marginTop: 8 }}>No destinations found.</p>
          )}

          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {TRIP_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTripType(t.value)}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "6px 12px",
                  borderRadius: 20,
                  border: "none",
                  cursor: "pointer",
                  background: tripType === t.value ? accentSolid : inputBg,
                  color: tripType === t.value ? "white" : hintColor,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: hintColor, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 6px" }}>
              Activities
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ACTIVITY_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleActivity(tag)}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "5px 10px",
                    borderRadius: 16,
                    border: `1px solid ${activities.includes(tag) ? accentSolid : inputBorder}`,
                    background: activities.includes(tag) ? (isDark ? "rgba(124,58,237,0.2)" : "#EDE9FE") : "transparent",
                    color: activities.includes(tag) ? accentSolid : hintColor,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 12,
              fontSize: 13,
              color: textPrimary,
              cursor: "pointer",
            }}
          >
            <input type="checkbox" checked={laundryAccess} onChange={(e) => setLaundryAccess(e.target.checked)} />
            Laundry access (fewer tops — re-wear)
          </label>

          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: hintColor, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
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
                style={{
                  width: "100%",
                  background: inputBg,
                  border: `1.5px solid ${inputBorder}`,
                  borderRadius: 12,
                  padding: "0 12px",
                  height: 36,
                  fontSize: 14,
                  color: departureDate ? inputText : hintColor,
                  outline: "none",
                  boxSizing: "border-box",
                  colorScheme: isDark ? "dark" : "light",
                }}
              />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: hintColor, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                Return
              </p>
              <input
                type="date"
                min={departureDate || today}
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                style={{
                  width: "100%",
                  background: inputBg,
                  border: `1.5px solid ${inputBorder}`,
                  borderRadius: 12,
                  padding: "0 12px",
                  height: 36,
                  fontSize: 14,
                  color: returnDate ? inputText : hintColor,
                  outline: "none",
                  boxSizing: "border-box",
                  colorScheme: isDark ? "dark" : "light",
                }}
              />
            </div>
          </div>

          {departureDate && returnDate && (
            <p style={{ fontSize: 12, color: hintColor, marginTop: 8 }}>
              {tripLengthDays(departureDate, returnDate)} day{tripLengthDays(departureDate, returnDate) !== 1 ? "s" : ""}
              {" · "}
              {forecastStatus(departureDate, returnDate) === "full" && (
                <span style={{ color: "#22C55E" }}>Full forecast available</span>
              )}
              {forecastStatus(departureDate, returnDate) === "extended" && (
                <span style={{ color: "#F59E0B" }}>Extended forecast (Open-Meteo)</span>
              )}
              {forecastStatus(departureDate, returnDate) === "unavailable" && (
                <span style={{ color: hintColor }}>Forecast unlocks {forecastAvailableOn(departureDate)}</span>
              )}
            </p>
          )}
        </div>

        {error && (
          <div
            style={{
              background: isDark ? "rgba(239,68,68,0.12)" : "#FEF2F2",
              borderRadius: 14,
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <p style={{ fontSize: 13, color: isDark ? "#F87171" : "#EF4444", margin: 0, flex: 1 }}>{error}</p>
            {selected && departureDate && returnDate && forecastStatus(departureDate, returnDate) === "unavailable" && (
              <button
                onClick={saveTripWithoutForecast}
                disabled={saving || !userId}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: accentSolid,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {saving ? "Saving…" : "Save for Later"}
              </button>
            )}
          </div>
        )}

        <button
          onClick={generate}
          disabled={!canGenerate || loading}
          style={{
            background: canGenerate ? accentSolid : isDark ? "#3A3A3C" : "#E5E7EB",
            color: canGenerate ? "white" : hintColor,
            border: "none",
            borderRadius: 16,
            padding: "16px 0",
            fontSize: 16,
            fontWeight: 700,
            width: "100%",
            cursor: canGenerate && !loading ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "⟳ Fetching weather…" : selected ? `Pack for ${selected.name}` : "Select destination & dates"}
        </button>

        {currentItems.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", paddingLeft: 4, marginTop: 4 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: textPrimary, margin: 0 }}>{displayDestination}</h2>
                <span style={{ fontSize: 14, color: hintColor }}>{formatDateRange(departureDate, returnDate)}</span>
              </div>
              {userId && (
                <button
                  onClick={saveTrip}
                  disabled={saving}
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: savedConfirm ? "#22C55E" : "white",
                    background: savedConfirm ? "#DCFCE7" : accentSolid,
                    border: "none",
                    borderRadius: 10,
                    padding: "6px 14px",
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {savedConfirm ? "✓ Saved!" : saving ? "Saving…" : "Save Trip"}
                </button>
              )}
            </div>

            {forecastIncomplete && (
              <div style={{ background: isDark ? "rgba(251,191,36,0.12)" : "#FFFBEB", borderRadius: 12, padding: "10px 14px" }}>
                <p style={{ fontSize: 12, color: isDark ? "#FCD34D" : "#92400E", margin: 0 }}>
                  Partial forecast — refresh closer to departure for the full trip.
                </p>
              </div>
            )}

            {currentAiInsights && <PackingAiInsightsCard insights={currentAiInsights} accentSolid={accentSolid} />}

            <button
              type="button"
              onClick={requestAiInsightsForCurrent}
              disabled={aiLoadingId === "current"}
              style={{
                background: cardBg,
                color: accentSolid,
                border: `2px solid ${accentSolid}`,
                borderRadius: 14,
                padding: "12px 0",
                fontSize: 14,
                fontWeight: 700,
                width: "100%",
                cursor: aiLoadingId === "current" ? "not-allowed" : "pointer",
              }}
            >
              {aiLoadingId === "current"
                ? "✨ Generating smart advice…"
                : currentAiInsights
                  ? "✨ Regenerate smart packing advice"
                  : "✨ Get smart packing advice (insights only)"}
            </button>

            <PackingListView
              items={currentItems}
              dailyOutfits={currentDailyOutfits}
              score={currentScore}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              accentSolid={accentSolid}
              isDark={isDark}
              checklistState={currentChecklist}
              onTogglePacked={toggleCurrentChecklist}
            />
          </>
        )}

        {(savedTrips.length > 0 || loadingTrips) && (
          <div style={{ marginTop: 8 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: hintColor,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                paddingLeft: 4,
                marginBottom: 10,
              }}
            >
              My Trips
            </p>
            {loadingTrips && <p style={{ fontSize: 14, color: hintColor, textAlign: "center" }}>Loading trips…</p>}
            {savedTrips.map((trip) => {
              const isExpanded = expandedTripId === trip.id;
              const isPast = isPastTrip(trip.return_date);
              const countdown = tripCountdown(trip.departure_date);
              const fStatus = forecastStatus(trip.departure_date, trip.return_date);
              const isRefreshing = refreshingTripId === trip.id;
              const isAiLoading = aiLoadingId === trip.id;
              const diff = tripDiffs[trip.id];
              const items = tripItems[trip.id] ?? [];
              const dailyOutfits =
                tripDailyOutfits[trip.id] ??
                (trip.daily_outfits?.length ? deserializeTripDayOutfits(trip.daily_outfits) : []);
              const tripView = tripViewModes[trip.id] ?? "list";
              const hasItems = items.length > 0 || (trip.packing_list?.length ?? 0) > 0;

              return (
                <div
                  key={trip.id}
                  style={{
                    background: cardBg,
                    borderRadius: 20,
                    boxShadow: cardShadow,
                    border: cardBorder,
                    marginBottom: 10,
                    overflow: "hidden",
                    opacity: isPast ? 0.75 : 1,
                  }}
                >
                  <div
                    style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                    onClick={() => openTrip(trip)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>
                          {trip.trip_name || trip.destination}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 6,
                            padding: "2px 7px",
                            background:
                              countdown === "Tomorrow" || countdown === "Today"
                                ? isDark
                                  ? "rgba(251,191,36,0.18)"
                                  : "#FEF3C7"
                                : isDark
                                  ? "rgba(124,58,237,0.18)"
                                  : "#EDE9FE",
                            color: countdown === "Tomorrow" || countdown === "Today" ? (isDark ? "#FCD34D" : "#92400E") : accentSolid,
                          }}
                        >
                          {countdown}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: hintColor, margin: "2px 0 0" }}>
                        {formatDateRange(trip.departure_date, trip.return_date)} · {tripLengthDays(trip.departure_date, trip.return_date)} days
                        {trip.laundry_access ? " · laundry" : ""}
                      </p>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      {confirmDeleteId === trip.id ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => confirmDelete(trip.id)}
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: "white",
                              background: "#EF4444",
                              border: "none",
                              borderRadius: 8,
                              padding: "5px 10px",
                              cursor: "pointer",
                            }}
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            style={{
                              fontSize: 12,
                              color: hintColor,
                              background: inputBg,
                              border: "none",
                              borderRadius: 8,
                              padding: "5px 10px",
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(trip.id)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            background: inputBg,
                            border: "none",
                            cursor: "pointer",
                          }}
                          aria-label="Delete trip"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: 18, color: hintColor, transform: isExpanded ? "rotate(90deg)" : "none" }}>›</span>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${dividerColor}`, padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, gap: 8 }}>
                        <p style={{ fontSize: 12, color: hintColor, margin: 0 }}>
                          {trip.last_generated_at ? `Updated ${formatLastUpdated(trip.last_generated_at)}` : "Not generated yet"}
                        </p>
                        {!isPast && (
                          <button
                            onClick={() => refreshTrip(trip)}
                            disabled={isRefreshing || fStatus === "unavailable"}
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "white",
                              background: fStatus === "unavailable" ? inputBg : accentSolid,
                              border: "none",
                              borderRadius: 10,
                              padding: "7px 14px",
                              cursor: isRefreshing ? "not-allowed" : "pointer",
                            }}
                          >
                            {isRefreshing ? "⟳…" : "↻ Refresh"}
                          </button>
                        )}
                      </div>

                      {trip.ai_insights && <PackingAiInsightsCard insights={trip.ai_insights} accentSolid={accentSolid} />}

                      {!isPast && fStatus !== "unavailable" && (
                        <button
                          type="button"
                          onClick={() => requestAiInsightsForTrip(trip)}
                          disabled={isAiLoading}
                          style={{
                            width: "100%",
                            marginBottom: 12,
                            background: cardBg,
                            color: accentSolid,
                            border: `2px solid ${accentSolid}`,
                            borderRadius: 12,
                            padding: "10px 0",
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: isAiLoading ? "not-allowed" : "pointer",
                          }}
                        >
                          {isAiLoading ? "✨…" : trip.ai_insights ? "✨ Regenerate advice" : "✨ Smart advice"}
                        </button>
                      )}

                      {diff && (diff.added.length > 0 || diff.removed.length > 0) && (
                        <div
                          style={{
                            background: isDark ? "rgba(251,191,36,0.12)" : "#FFFBEB",
                            borderRadius: 12,
                            padding: "10px 14px",
                            marginBottom: 12,
                          }}
                        >
                          <p style={{ fontSize: 12, fontWeight: 700, color: isDark ? "#FCD34D" : "#92400E", margin: 0 }}>
                            Weather changed — list updated
                          </p>
                          {diff.added.length > 0 && (
                            <p style={{ fontSize: 12, color: "#15803D", margin: "4px 0 0" }}>+ {diff.added.join(", ")}</p>
                          )}
                        </div>
                      )}

                      {hasItems ? (
                        <PackingListView
                          items={items}
                          dailyOutfits={dailyOutfits}
                          score={tripScores[trip.id] ?? null}
                          viewMode={tripView}
                          onViewModeChange={(m) => setTripViewModes((prev) => ({ ...prev, [trip.id]: m }))}
                          accentSolid={accentSolid}
                          isDark={isDark}
                          diffAdded={new Set(diff?.added ?? [])}
                          diffRemoved={diff?.removed ?? []}
                          checklistState={tripChecklists[trip.id]}
                          onTogglePacked={(key) => toggleTripChecklist(trip.id, key)}
                        />
                      ) : (
                        <p style={{ fontSize: 14, color: hintColor, textAlign: "center", padding: 16 }}>
                          {fStatus === "unavailable" ? "Forecast not available yet." : "Tap Refresh to generate."}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loadingTrips && savedTrips.length === 0 && !currentItems.length && userId && (
          <div style={{ background: cardBg, borderRadius: 20, padding: 20, textAlign: "center", boxShadow: cardShadow, border: cardBorder }}>
            <p style={{ fontSize: 28, margin: "0 0 8px" }}>✈️</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: textPrimary, margin: "0 0 4px" }}>No trips saved yet</p>
            <p style={{ fontSize: 13, color: hintColor, margin: 0 }}>
              Plan a trip to see daily outfits and a consolidated packing list.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
