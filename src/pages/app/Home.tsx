import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { CARD_LABELS, type CardId, type CardConfig } from "@/lib/card-layout";
import { useDarkMode } from "@/hooks/useDarkMode";
import { OutfitRecommendationCard } from "@/components/weather/OutfitRecommendation";
import { WeatherWidget } from "@/components/weather/WeatherWidget";
import { SkyHeader } from "@/components/weather/SkyHeader";
import { VectorLandscape } from "@/components/weather/VectorLandscape";
import { WeatherAnimationLayer } from "@/components/weather/WeatherAnimationLayer";
import { SevenDayCard } from "@/components/weather/SevenDayCard";
import { NowcastCard } from "@/components/weather/NowcastCard";
import { AQICard } from "@/components/weather/AQICard";
import { LocationTabs } from "@/components/weather/LocationTabs";
import { AlertBanner, type WeatherAlert } from "@/components/weather/AlertBanner";
import { useWeather } from "@/hooks/useWeather";
import { useAppStore } from "@/store";
import { getSkyColor, Colors } from "@/constants/colors";
import { useCalendarContext } from "@/hooks/useCalendarContext";
import { EVENT_TYPE_LABELS } from "@/lib/calendar";
import { upsertProfile, saveOutfitFeedback, getRecentFeedback, upsertCalibration, getWeatherWardrobes, getWardrobeItems, getRainHistory } from "@/lib/supabase";
import { computeCalibrationFromFeedback } from "@/lib/outfit-feedback";
import { groupHourlyByDay, detectSignificantChanges } from "@/lib/weather";
import { getOutfitReason, getFeelsLikeExplanation, getLayeringTip } from "@/lib/outfit-logic";
import { buildDisplayCopyFromOverride } from "@/lib/outfitDisplayCopy";
import { sanitizeWardrobeOverrideForRain } from "@/lib/outfitRainDisplay";
import { getWeatherScenario } from "@/lib/wardrobeScenario";
import { addSavedLocation, getSavedLocations, removeSavedLocation } from "@/lib/saved-locations";
import { buildLocationCacheKey } from "@/lib/location-cache-key";
import { removeCityWeatherCache } from "@/lib/cache";
import { matchWardrobeToOutfit } from "@/lib/wardrobe-matching";
import { DEVICE_LOCATION_KEY } from "@/store";
import { LocationPickerSheet } from "@/components/location/LocationPickerSheet";
import { startGeofence, stopGeofence } from "@/lib/geofence";
import { useNavigate } from "react-router-dom";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import type { LocationData, OutfitFeedbackValue, NerdModeCardId, RainHistoryData } from "@/types";
import { RainAccumulationCard } from "@/components/weather/RainAccumulationCard";
import { MoonPhasesCard } from "@/components/weather/MoonPhasesCard";
import { SeasonalProduceCard } from "@/components/weather/SeasonalProduceCard";

function toUnit(f: number, unit: "F" | "C") {
  return unit === "C" ? Math.round(((f - 32) * 5) / 9) : Math.round(f);
}

function formatTimeAgo(date: Date): string {
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return hrs === 1 ? "1 hr ago" : `${hrs} hrs ago`;
}

export default function Home() {
  const { weather, outfit, isLoadingWeather, weatherError, refresh } = useWeather();
  const {
    profile, userId, calibration, outfitTimeline, location,
    savedLocations, setSavedLocations,
    activeLocationIsDevice, setActiveLocationIsDevice,
    removeCityWeatherCache: evictCityCache,
    setProfile, setCalibration, setLocation, weatherLastFetched,
    weatherWardrobes, setWeatherWardrobes,
    wardrobeItems, setWardrobeItems,
    svgCatalogById,
    forecastConfidence,
    cardLayout, setCardLayout, toggleCardMinimized,
  } = useAppStore();
  const [isEditMode, setIsEditMode] = useState(false);
  const { eventType, styleHint } = useCalendarContext();
  const tempUnit = profile?.temp_unit ?? "F";
  const isDark = useDarkMode(profile?.theme_preference ?? null);
  const navigate = useNavigate();
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationPickerMode, setLocationPickerMode] = useState<"add" | "update">("update");

  // Nerd mode
  const [nerdCardOrder, setNerdCardOrder] = useState<NerdModeCardId[]>(profile?.nerd_mode_cards ?? []);
  const [nerdEditMode, setNerdEditMode] = useState(false);
  const [rainHistory, setRainHistory] = useState<RainHistoryData | null>(null);
  const [rainHistoryLoading, setRainHistoryLoading] = useState(false);
  const nerdSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cardsBg = isDark ? Colors.dark.pageBg : "#F2F2F7";
  const cardSurface = isDark ? Colors.dark.cardBg : "#FFFFFF";

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void getWeatherWardrobes(userId)
      .then((data) => { if (!cancelled) setWeatherWardrobes(data); })
      .catch(() => {});
    void getWardrobeItems(userId)
      .then((data) => { if (!cancelled) setWardrobeItems(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Keep card order in sync when profile loads/changes
  useEffect(() => {
    if (profile?.nerd_mode_cards) setNerdCardOrder(profile.nerd_mode_cards);
  }, [profile?.nerd_mode_cards]);

  // Fetch rain history whenever nerd mode + rain card enabled and location is known
  useEffect(() => {
    const lat = location?.latitude ?? profile?.last_latitude;
    const lng = location?.longitude ?? profile?.last_longitude;
    if (!profile?.nerd_mode_enabled) return;
    if (!profile.nerd_mode_cards.includes("rain_accumulation")) return;
    if (lat == null || lng == null) return;
    let cancelled = false;
    setRainHistoryLoading(true);
    getRainHistory(lat, lng)
      .then((data) => { if (!cancelled) { setRainHistory(data); setRainHistoryLoading(false); } })
      .catch(() => { if (!cancelled) setRainHistoryLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.nerd_mode_enabled, profile?.nerd_mode_cards?.join(","), location?.latitude, location?.longitude]);

  function handleNerdReorder(newOrder: NerdModeCardId[]) {
    setNerdCardOrder(newOrder);
    if (!userId) return;
    if (nerdSaveTimerRef.current) clearTimeout(nerdSaveTimerRef.current);
    nerdSaveTimerRef.current = setTimeout(() => {
      upsertProfile(userId, { nerd_mode_cards: newOrder })
        .then((updated) => { if (updated) setProfile(updated); })
        .catch(() => {});
    }, 500);
  }

  const activePreset = useMemo(() => {
    if (!weather || weatherWardrobes.length === 0) return null;
    const scenario = getWeatherScenario(weather);
    return weatherWardrobes.find((p) => p.scenario === scenario) ?? null;
  }, [weather, weatherWardrobes]);

  // Load saved locations on mount
  useEffect(() => {
    getSavedLocations().then(setSavedLocations).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tab switches update location in handleTabSelect (with refresh). This effect catches
  // programmatic location changes (e.g. profile hydrate) using the composite cache key.
  const prevLocationKeyRef = useRef<string | null>(
    location ? buildLocationCacheKey(location) : null,
  );
  const skipNextLocationRefreshRef = useRef(false);
  useEffect(() => {
    const loc = useAppStore.getState().location;
    if (!loc?.city) return;
    const key = buildLocationCacheKey(loc);
    if (key === prevLocationKeyRef.current) return;
    prevLocationKeyRef.current = key;
    if (skipNextLocationRefreshRef.current) {
      skipNextLocationRefreshRef.current = false;
      return;
    }
    if (!activeLocationIsDevice) {
      refresh(false, { cacheKey: key });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.city, location?.latitude, location?.longitude, activeLocationIsDevice]);

  // Initial load (refresh may call setLocation — skip duplicate city-change fetch).
  // Always clear the skip flag when refresh finishes: returning users already have
  // location.city from the profile, so the city-change effect often never runs.
  useEffect(() => {
    skipNextLocationRefreshRef.current = true;
    void (async () => {
      try {
        await refresh();
      } finally {
        skipNextLocationRefreshRef.current = false;
        const loc = useAppStore.getState().location;
        prevLocationKeyRef.current = loc ? buildLocationCacheKey(loc) : null;
        // Auto-seed the resolved location into saved list so tab bar appears immediately.
        if (loc?.city) {
          const current = await getSavedLocations().catch(() => [] as typeof savedLocations);
          const locKey = buildLocationCacheKey(loc);
          const alreadySaved = current.some(
            (l) => buildLocationCacheKey(l) === locKey,
          );
          if (!alreadySaved) {
            const updated = await addSavedLocation(loc, userId ?? undefined).catch(() => null);
            if (updated) setSavedLocations(updated);
          }
        }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Geofence: only when viewing device GPS — avoid overriding a saved city tab
  useEffect(() => {
    if (!location || !activeLocationIsDevice) {
      void stopGeofence().catch(() => {});
      return;
    }
    let cancelled = false;
    void (async () => {
      await stopGeofence();
      if (cancelled) return;
      await startGeofence({
        currentLocation: location,
        onSignificantMove: () => {
          refresh(true, { useDeviceLocation: true, cacheKey: DEVICE_LOCATION_KEY });
        },
      });
    })().catch(() => {});
    return () => {
      cancelled = true;
      void stopGeofence().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, activeLocationIsDevice]);

  async function handleLocationSaved(ctx?: { fromCitySave?: boolean }) {
    setActiveLocationIsDevice(false);
    const loc = useAppStore.getState().location;
    await refresh(
      true,
      loc?.city ? { cacheKey: buildLocationCacheKey(loc) } : {},
    );
    // City path: sheet already called addSavedLocation with forward-geocoded name; refresh may
    // rename via reverse geocode — skip addSavedLocation so dedup by city string is not bypassed.
    if (ctx?.fromCitySave) return;
    // GPS save leaves city empty until refresh geocodes; persist in sheet only runs with a city.
    const savedLoc = useAppStore.getState().location;
    if (savedLoc?.city) {
      const updated = await addSavedLocation(savedLoc, userId ?? undefined).catch(() => null);
      if (updated) setSavedLocations(updated);
    }
  }

  function handleTabSelect(loc: LocationData) {
    setActiveLocationIsDevice(false);
    setLocation(loc);
    prevLocationKeyRef.current = buildLocationCacheKey(loc);
    refresh(false, { cacheKey: buildLocationCacheKey(loc) });
  }

  const handleRefresh = useCallback(function handleRefresh() {
    if (activeLocationIsDevice) {
      return refresh(true, { useDeviceLocation: true, cacheKey: DEVICE_LOCATION_KEY });
    }
    const loc = useAppStore.getState().location;
    if (loc) {
      return refresh(true, { cacheKey: buildLocationCacheKey(loc) });
    }
    return refresh(true);
  }, [activeLocationIsDevice, refresh]);

  const { pullDistance, isRefreshing: isPullRefreshing, triggered } = usePullToRefresh(handleRefresh);

  async function handleDeviceTabSelect() {
    setActiveLocationIsDevice(true);
    refresh(true, { useDeviceLocation: true, cacheKey: DEVICE_LOCATION_KEY });
  }

  async function handleDeleteCity(loc: LocationData) {
    const cacheKey = buildLocationCacheKey(loc);
    await removeCityWeatherCache(cacheKey).catch(() => {});
    evictCityCache(cacheKey);
    const updated = await removeSavedLocation(loc, userId ?? undefined).catch(() => null);
    if (updated) {
      setSavedLocations(updated);
      const activeKey =
        location && !activeLocationIsDevice ? buildLocationCacheKey(location) : null;
      if (activeKey && activeKey === buildLocationCacheKey(loc)) {
        handleDeviceTabSelect();
      }
    }
  }

  function handleOpenAddCity() {
    setLocationPickerMode("add");
    setLocationPickerOpen(true);
  }

  function handleOpenUpdateLocation() {
    setLocationPickerMode("update");
    setLocationPickerOpen(true);
  }

  async function handleOutfitFeedback(value: OutfitFeedbackValue) {
    if (!userId || !outfit || !weather || !calibration) return;
    await saveOutfitFeedback({
      user_id: userId,
      outfit_type: outfit.outfit,
      feels_like_temp: weather.current.feelsLike,
      weather_code: weather.current.weatherCode,
      wind_speed: weather.current.windSpeed,
      feedback: value,
    });
    if (value === "thumbs_down") {
      const recent = await getRecentFeedback(userId, 30).catch(() => []);
      const updates = computeCalibrationFromFeedback(recent, calibration);
      if (Object.keys(updates).length > 0) {
        const updated = await upsertCalibration(userId, updates).catch(() => null);
        if (updated) setCalibration(updated);
      }
    }
  }

  const skyColor = weather
    ? getSkyColor(weather.current.condition, weather.current.isDay)
    : "#1a1a2e";

  async function handleUnitChange(unit: "F" | "C") {
    if (!userId) return;
    const p = useAppStore.getState().profile;
    if (!p) return;
    setProfile({ ...p, temp_unit: unit });
    upsertProfile(userId, { temp_unit: unit }).catch(console.error);
  }

  const outfitReason = useMemo(() => {
    if (!weather || !outfit) return null;
    const feelsLikeRounded = Math.round(weather.current.feelsLike);
    const reasonBase = {
      feelsLike: feelsLikeRounded,
      windSpeed: weather.current.windSpeed,
      precipProb: outfit.effectivePrecipProb ?? weather.current.precipProb,
      humidity: weather.current.humidity,
      weatherCode: weather.current.weatherCode,
      outfit: outfit.outfit,
    };

    if (activePreset) {
      const override = sanitizeWardrobeOverrideForRain(
        {
          top: activePreset.top_svg,
          bottom: activePreset.bottom_svg,
          outerwear: activePreset.outerwear_svg,
          footwear: activePreset.footwear_svg,
          accessories: activePreset.accessory_svgs,
        },
        outfit.rainGear
      );
      const copy = buildDisplayCopyFromOverride(override, svgCatalogById, {
        displayFeelsLike: weather.current.feelsLike,
        rainGear: outfit.rainGear,
        outfitType: outfit.outfit,
      });
      return getOutfitReason({
        ...reasonBase,
        garmentTop: copy.garmentTop,
        garmentBottom: copy.garmentBottom,
      });
    }

    return getOutfitReason({
      ...reasonBase,
      garmentTop: outfit.garmentTop,
      garmentBottom: outfit.garmentBottom,
    });
  }, [weather, outfit, activePreset, svgCatalogById]);

  const feelsLikeExplanation = useMemo(() => {
    if (!weather) return null;
    return getFeelsLikeExplanation({
      temp: weather.current.temp,
      feelsLike: weather.current.feelsLike,
      windSpeed: weather.current.windSpeed,
      humidity: weather.current.humidity,
    });
  }, [weather]);

  const weatherAlerts = useMemo((): WeatherAlert[] => {
    if (!weather) return [];
    return detectSignificantChanges(weather.hourly, weather.current.feelsLike);
  }, [weather]);

  const layeringTip = useMemo(() => getLayeringTip(outfitTimeline), [outfitTimeline]);

  const wardrobeMatch = useMemo(() => {
    if (!outfit || wardrobeItems.length === 0) return null;
    return matchWardrobeToOutfit(wardrobeItems, outfit);
  }, [outfit, wardrobeItems]);

  const visibleCards = useMemo(() => {
    if (!weather) return [] as CardConfig[];
    return cardLayout.filter((c) => {
      if (c.id === "aqi") return weather.current.aqiIndex != null;
      if (c.id === "nowcast") return !!weather.nextHourPrecip;
      if (c.id === "seven_day") return weather.daily.length > 0;
      return true;
    });
  }, [cardLayout, weather]);

  const handleMoveCard = useCallback((id: CardId, direction: "up" | "down") => {
    const visibleIds = visibleCards.map((c) => c.id);
    const visIdx = visibleIds.indexOf(id);
    if (visIdx === -1) return;
    const targetVisIdx = direction === "up" ? visIdx - 1 : visIdx + 1;
    if (targetVisIdx < 0 || targetVisIdx >= visibleIds.length) return;
    const targetId = visibleIds[targetVisIdx];
    const idxA = cardLayout.findIndex((c) => c.id === id);
    const idxB = cardLayout.findIndex((c) => c.id === targetId);
    if (idxA === -1 || idxB === -1) return;
    const next = [...cardLayout];
    [next[idxA], next[idxB]] = [next[idxB], next[idxA]];
    setCardLayout(next);
  }, [visibleCards, cardLayout, setCardLayout]);

  return (
    <div style={{ minHeight: "100%", background: skyColor, display: "flex", flexDirection: "column" }}>

      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isPullRefreshing) && (
        <div
          style={{
            position: "fixed",
            top: `calc(env(safe-area-inset-top, 0px) + ${isPullRefreshing ? 12 : Math.max(pullDistance - 48, 0)}px)`,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 70,
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "var(--accent-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
            transition: isPullRefreshing ? "top 0.2s ease" : undefined,
            opacity: isPullRefreshing ? 1 : Math.min(pullDistance / 48, 1),
          }}
        >
          {isPullRefreshing ? (
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: "ptr-spin 0.75s linear infinite" }}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{
                transform: triggered ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoadingWeather && !weather && (
        <div className="flex flex-col flex-1" style={{ background: "#1a1a2e" }}>
          <div className="pt-safe px-6 pb-4 flex flex-col items-center gap-3">
            <div className="h-4 w-32 rounded skeleton mt-16" />
            <div className="h-20 w-40 rounded skeleton" />
            <div className="h-5 w-24 rounded skeleton" />
          </div>
          <div
            className="flex-1 rounded-t-[32px] -mt-8 px-4 pt-6 pb-4 flex flex-col gap-3"
            style={{ background: cardsBg }}
          >
            <div className="h-64 rounded-3xl skeleton" />
            <div className="h-40 rounded-3xl skeleton" />
            <div className="h-48 rounded-3xl skeleton" />
            {/* Light: mutedLabel on cardsBg (#F2F2F7); dark: textMuted on dark card — AA contrast ✓ */}
            <p className="text-center text-sm pt-2" style={{ color: isDark ? Colors.dark.textMuted : Colors.text.mutedLabel }}>
              Fetching your weather…
            </p>
          </div>
        </div>
      )}

      {/* Full error (no cached data) */}
      {weatherError && !weather && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "120px 24px 24px" }}>
          <span style={{ fontSize: 48 }}>⚠️</span>
          <p style={{ color: "rgba(255,255,255,0.9)", textAlign: "center", lineHeight: 1.5, maxWidth: 300 }}>
            {weatherError.includes("Unable to fetch weather data")
              ? "Unable to fetch weather data. Check your connection and try again."
              : weatherError}
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            className="min-h-[44px] px-6 rounded-full bg-white/20 border-0 text-white font-semibold cursor-pointer"
          >
            Try again
          </button>
        </div>
      )}

      {/* Stale/error banner when cached data is shown */}
      {weatherError && weather && (
        <div
          style={{
            margin: "8px 14px 0",
            padding: "10px 14px",
            borderRadius: 14,
            background: "#FEF3C7",
            border: "1px solid #F59E0B",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 13, color: "#92400E", flex: 1 }}>
            {weatherLastFetched
              ? `Showing data from ${formatTimeAgo(weatherLastFetched)} — ${weatherError}`
              : weatherError}
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            style={{ fontSize: 12, fontWeight: 700, color: "#92400E", background: "none", border: "none", cursor: "pointer" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Main content */}
      {weather && outfit && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {isLoadingWeather && (
            <div
              className="fixed top-0 left-0 right-0 z-[60] flex justify-center pt-safe pointer-events-none"
              aria-live="polite"
            >
              <span className="mt-2 px-4 py-2 rounded-full text-xs font-semibold text-white bg-black/40 backdrop-blur-sm">
                Updating…
              </span>
            </div>
          )}

          {/* Sky section */}
          <div style={{ position: "relative", overflow: "hidden" }}>
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "65%",
                background: "linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, transparent 100%)",
                pointerEvents: "none",
                zIndex: 1,
              }}
            />
            <SkyHeader
              weather={weather.current}
              today={weather.daily[0] ?? null}
              tempUnit={tempUnit}
              isRefreshing={isLoadingWeather}
              onRefresh={handleRefresh}
              onLocationPress={handleOpenUpdateLocation}
            />
            <LocationPickerSheet
              open={locationPickerOpen}
              onClose={() => setLocationPickerOpen(false)}
              onSaved={handleLocationSaved}
              variant="sky"
              mode={locationPickerMode}
            />
            <LocationTabs
              locations={savedLocations}
              activeLocationKey={
                activeLocationIsDevice || !location
                  ? null
                  : buildLocationCacheKey(location)
              }
              activeIsDevice={activeLocationIsDevice}
              onSelect={handleTabSelect}
              onSelectDevice={handleDeviceTabSelect}
              onAdd={handleOpenAddCity}
              onDelete={handleDeleteCity}
            />
            <VectorLandscape skyColor={skyColor} isDay={weather.current.isDay} />
            <WeatherAnimationLayer
              condition={weather.current.condition}
              isDay={weather.current.isDay}
            />
          </div>

          {/* Cards area */}
          <div style={{
            flex: 1,
            background: cardsBg,
            borderRadius: "32px 32px 0 0",
            marginTop: -32,
            padding: "16px 14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            position: "relative",
            zIndex: 2,
          }}>

            {/* Edit / Done row */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setIsEditMode((e) => !e)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "2px 2px",
                  color: "var(--accent-primary)",
                  fontSize: 14, fontWeight: 600,
                  minHeight: 32,
                }}
              >
                {isEditMode ? "Done" : (
                  <>
                    <PencilSVG />
                    <span>Edit</span>
                  </>
                )}
              </button>
            </div>

            {/* Weather change alerts — only show rain warnings, not feels-like info */}
            {weatherAlerts.some((a) => a.type === "warning") && (
              <AlertBanner alerts={weatherAlerts.filter((a) => a.type === "warning")} />
            )}

            {/* Smart layering tip */}
            {layeringTip && (
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "12px 16px", borderRadius: 20,
                background: isDark ? "rgba(59,130,246,0.18)" : "#EFF6FF",
                border: "1px solid #BFDBFE",
              }}>
                <span style={{ fontSize: 17, flexShrink: 0, marginTop: 1 }}>🧥</span>
                <p style={{ fontSize: 13, color: isDark ? "#93C5FD" : "#1D4ED8", flex: 1, lineHeight: 1.45 }}>
                  {layeringTip}
                </p>
              </div>
            )}

            {/* Dynamic cards */}
            {visibleCards.map((card, idx) => {
              const content = (() => {
                switch (card.id) {
                  case "outfit":
                    return (
                      <OutfitRecommendationCard
                        recommendation={outfit}
                        tempUnit={tempUnit}
                        feelsLike={weather.current.feelsLike}
                        outfitReason={outfitReason}
                        feelsLikeExplanation={feelsLikeExplanation}
                        timeline={outfitTimeline}
                        onFeedback={handleOutfitFeedback}
                        isDark={isDark}
                        wardrobeMatch={wardrobeMatch}
                        wardrobePreset={activePreset}
                        onViewWardrobe={() => navigate("/app/wardrobe")}
                      />
                    );
                  case "conditions":
                    return (
                      <WeatherWidget
                        weather={weather.current}
                        tempUnit={tempUnit}
                        onUnitChange={handleUnitChange}
                        isDark={isDark}
                      />
                    );
                  case "aqi":
                    return weather.current.aqiIndex != null ? (
                      <AQICard aqiIndex={weather.current.aqiIndex} isDark={isDark} />
                    ) : null;
                  case "nowcast":
                    return weather.nextHourPrecip ? (
                      <NowcastCard data={weather.nextHourPrecip} isDark={isDark} />
                    ) : null;
                  case "hourly":
                    return (
                      <HourlyStrip
                        hourly={weather.hourly.slice(0, 12)}
                        tempUnit={tempUnit}
                        isDark={isDark}
                        cardSurface={cardSurface}
                        onFullForecast={() => navigate("/app/forecast")}
                      />
                    );
                  case "seven_day":
                    return weather.daily.length > 0 ? (
                      <SevenDayCard
                        daily={weather.daily}
                        tempUnit={tempUnit}
                        hourlyByDay={groupHourlyByDay(weather.hourly, weather.daily)}
                        isDark={isDark}
                      />
                    ) : null;
                  default:
                    return null;
                }
              })();

              if (!content) return null;

              return (
                <React.Fragment key={card.id}>
                  <CardShell
                    title={CARD_LABELS[card.id]}
                    isEditMode={isEditMode}
                    minimized={card.minimized}
                    isFirst={idx === 0}
                    isLast={idx === visibleCards.length - 1}
                    onMoveUp={() => handleMoveCard(card.id, "up")}
                    onMoveDown={() => handleMoveCard(card.id, "down")}
                    onToggleMinimize={() => toggleCardMinimized(card.id)}
                    isDark={isDark}
                  >
                    {content}
                  </CardShell>

                  {/* NOAA confidence badge + calendar hint always follow the outfit card */}
                  {card.id === "outfit" && (
                    <>
                      {forecastConfidence === "low" && (
                        <div style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 16px", borderRadius: 16,
                          background: isDark ? "rgba(251,146,60,0.15)" : "#FFF7ED",
                          border: "1px solid #FED7AA",
                        }}>
                          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
                          <p style={{ fontSize: 13, color: isDark ? "#FDBA74" : "#C2410C", flex: 1, margin: 0 }}>
                            Uncertain forecast — models disagree. Pack layers and consider an umbrella.
                          </p>
                        </div>
                      )}
                      {forecastConfidence === "medium" && (
                        <div style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 16px", borderRadius: 16,
                          background: isDark ? "rgba(251,191,36,0.12)" : "#FFFBEB",
                          border: "1px solid #FDE68A",
                        }}>
                          <span style={{ fontSize: 16, flexShrink: 0 }}>🌤️</span>
                          <p style={{ fontSize: 13, color: isDark ? "#FCD34D" : "#92400E", flex: 1, margin: 0 }}>
                            Forecast may vary — check again closer to the time.
                          </p>
                        </div>
                      )}
                      {styleHint && eventType !== "default" && (
                        <div style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "12px 16px", borderRadius: 20,
                          background: isDark ? "var(--accent-surface)" : "var(--accent-tab-bg)",
                          border: "1px solid var(--accent-light)",
                        }}>
                          <span style={{ fontSize: 18 }}>{EVENT_TYPE_LABELS[eventType].emoji}</span>
                          <p style={{ fontSize: 13, color: isDark ? "var(--accent-light)" : "var(--accent-text)", flex: 1 }}>{styleHint}</p>
                        </div>
                      )}
                    </>
                  )}
                </React.Fragment>
              );
            })}

            {/* Nerd Mode Cards */}
            {profile?.nerd_mode_enabled && nerdCardOrder.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <p style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                    color: isDark ? "#9BA4B4" : "#6B7280", margin: 0,
                  }}>
                    Nerd Mode
                  </p>
                  {nerdCardOrder.length >= 2 && (
                    <button
                      type="button"
                      onClick={() => setNerdEditMode((v) => !v)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 13, fontWeight: 600, color: "var(--accent-primary)", padding: 0,
                      }}
                    >
                      {nerdEditMode ? "Done" : "Edit Order"}
                    </button>
                  )}
                </div>

                {nerdEditMode ? (
                  <Reorder.Group
                    axis="y"
                    values={nerdCardOrder}
                    onReorder={handleNerdReorder}
                    style={{ display: "flex", flexDirection: "column", gap: 12, listStyle: "none", padding: 0, margin: 0 }}
                  >
                    {nerdCardOrder.map((cardId) => (
                      <Reorder.Item
                        key={cardId}
                        value={cardId}
                        style={{ cursor: "grab" }}
                      >
                        <NerdCardEditRow cardId={cardId} isDark={isDark} />
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {nerdCardOrder.map((cardId) => (
                      <NerdCardRenderer
                        key={cardId}
                        cardId={cardId}
                        rainHistory={rainHistory}
                        rainHistoryLoading={rainHistoryLoading}
                        tempUnit={tempUnit}
                        latitude={location?.latitude ?? profile?.last_latitude ?? 40}
                        isDark={isDark}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <p style={{ textAlign: "center", fontSize: 11, color: isDark ? "rgba(255,255,255,0.25)" : "#9CA3AF", paddingBottom: 4 }}>
              {weather._source === "weatherkit"
                ? "Weather data provided by Apple Weather™"
                : "Weather data provided by Open-Meteo.com"}
            </p>

          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Nerd Card Renderer ────────────────────────────────────────────────────────

function NerdCardRenderer({
  cardId, rainHistory, rainHistoryLoading, tempUnit, latitude, isDark,
}: {
  cardId: NerdModeCardId;
  rainHistory: RainHistoryData | null;
  rainHistoryLoading: boolean;
  tempUnit: "F" | "C";
  latitude: number;
  isDark: boolean;
}) {
  if (cardId === "rain_accumulation") {
    return (
      <RainAccumulationCard
        data={rainHistory}
        loading={rainHistoryLoading}
        tempUnit={tempUnit}
        isDark={isDark}
      />
    );
  }
  if (cardId === "moon_phases") {
    return <MoonPhasesCard isDark={isDark} />;
  }
  if (cardId === "seasonal_produce") {
    return <SeasonalProduceCard latitude={latitude} isDark={isDark} />;
  }
  return null;
}

const NERD_CARD_LABELS: Record<NerdModeCardId, { emoji: string; label: string }> = {
  rain_accumulation: { emoji: "🌧️", label: "Rain Accumulation" },
  moon_phases: { emoji: "🌕", label: "Moon Phases" },
  seasonal_produce: { emoji: "🥦", label: "In Season" },
};

function NerdCardEditRow({ cardId, isDark }: { cardId: NerdModeCardId; isDark: boolean }) {
  const meta = NERD_CARD_LABELS[cardId];
  const bg = isDark ? "#2C2C2E" : "#FFFFFF";
  const border = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #E5E7EB";
  const textColor = isDark ? "#F4F4F5" : "#111827";
  const handleColor = isDark ? "#9BA4B4" : "#9CA3AF";
  return (
    <div style={{
      background: bg, border, borderRadius: 20, padding: "14px 16px",
      display: "flex", alignItems: "center", gap: 12,
      boxShadow: isDark ? "0 2px 12px rgba(0,0,0,0.25)" : "0 2px 12px rgba(0,0,0,0.06)",
    }}>
      <span style={{ fontSize: 20, color: handleColor, userSelect: "none", flexShrink: 0 }}>≡</span>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{meta.emoji}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: textColor, flex: 1 }}>{meta.label}</span>
    </div>
  );
}

// ── Hourly Strip ──────────────────────────────────────────────────────────────

function HourlyStrip({
  hourly,
  tempUnit,
  isDark,
  cardSurface,
  onFullForecast,
}: {
  hourly: { time: Date; feelsLike: number; weatherCode: number; precipProb: number }[];
  tempUnit: "F" | "C";
  isDark: boolean;
  cardSurface: string;
  onFullForecast?: () => void;
}) {
  // Opacity-based text replaced with explicit hex for reliable contrast (AA ✓)
  const labelColor = isDark ? Colors.dark.textMuted : "#4B5563";

  return (
    <div style={{
      background: cardSurface,
      borderRadius: 24,
      padding: "20px",
      boxShadow: isDark ? "0 2px 20px rgba(0,0,0,0.25)" : "0 2px 20px rgba(0,0,0,0.07)",
      border: isDark ? `1px solid ${Colors.dark.border}` : undefined,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{
          fontSize: 14, fontWeight: 700,
          color: labelColor,
          letterSpacing: "0.08em", textTransform: "uppercase", margin: 0,
        }}>
          Hourly Forecast
        </p>
        {onFullForecast && (
          <button
            type="button"
            onClick={onFullForecast}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--accent-primary)", padding: 0 }}
          >
            48h →
          </button>
        )}
      </div>
      <div className="no-scrollbar" style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
        {hourly.map((h, i) => {
          const isNow = i === 0;
          const condKey = wmoToCondition(h.weatherCode);
          // Precip %: #1D4ED8 on light cell #F3F4F6 (6.1:1 ✓); #60A5FA on dark cell #3A3A3C (4.5:1 ✓)
          const precipColor = isNow ? "rgba(255,255,255,0.9)" : isDark ? "#60A5FA" : "#1D4ED8";
          return (
            <div
              key={i}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                minWidth: 52, padding: "12px 8px", borderRadius: 16, flexShrink: 0,
                background: isNow ? "var(--accent-primary)" : isDark ? Colors.dark.cellBg : "#F3F4F6",
              }}
            >
              <span style={{
                fontSize: 12, fontWeight: 600, textTransform: "uppercase",
                color: isNow ? "rgba(255,255,255,0.9)" : isDark ? Colors.dark.textMuted : "#4B5563",
              }}>
                {isNow ? "Now" : h.time.toLocaleTimeString("en", { hour: "numeric" })}
              </span>
              <WeatherIcon condition={condKey} size="md" color={isNow ? "white" : undefined} />
              <span style={{ fontSize: 17, fontWeight: 700, color: isNow ? "white" : isDark ? Colors.dark.textPrimary : "#111827" }}>
                {toUnit(h.feelsLike, tempUnit)}°
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: precipColor }}>
                {h.precipProb}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function wmoToCondition(code: number): string {
  if (code === 0) return "clear";
  if (code <= 2) return "partly_cloudy";
  if (code <= 3) return "cloudy";
  if (code <= 48) return "foggy";
  if (code <= 57) return "drizzle";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "rain";
  return "thunderstorm";
}

// ── Card Shell (reorder + minimize wrapper) ───────────────────────────────────

interface CardShellProps {
  title: string;
  isEditMode: boolean;
  minimized: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleMinimize: () => void;
  isDark: boolean;
  children: React.ReactNode;
}

function CardShell({
  title, isEditMode, minimized, isFirst, isLast,
  onMoveUp, onMoveDown, onToggleMinimize, isDark, children,
}: CardShellProps) {
  const surface = isDark ? Colors.dark.cardBg : "#FFFFFF";
  const labelColor = isDark ? Colors.dark.textMuted : "#4B5563";
  const dimColor = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)";

  return (
    <motion.div layout transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}>

      {/* Edit controls — slide in when edit mode is active */}
      <AnimatePresence>
        {isEditMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              display: "flex", alignItems: "center", gap: 2,
              paddingBottom: 5, paddingLeft: 4,
            }}>
              <span style={{
                flex: 1, fontSize: 11, fontWeight: 700,
                color: isDark ? Colors.dark.textMuted : "#9CA3AF",
                letterSpacing: "0.07em", textTransform: "uppercase",
              }}>
                {title}
              </span>
              <CardEditBtn
                onClick={onMoveUp} disabled={isFirst}
                aria-label="Move card up" dimColor={dimColor}
              >
                <ChevronUpSVG />
              </CardEditBtn>
              <CardEditBtn
                onClick={onMoveDown} disabled={isLast}
                aria-label="Move card down" dimColor={dimColor}
              >
                <ChevronDownSVG />
              </CardEditBtn>
              <CardEditBtn onClick={onToggleMinimize} aria-label={minimized ? "Expand card" : "Minimize card"}>
                {minimized ? <PlusSVG /> : <MinusSVG />}
              </CardEditBtn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card body — expanded or collapsed */}
      <AnimatePresence mode="wait" initial={false}>
        {minimized ? (
          <motion.button
            key="min"
            type="button"
            onClick={onToggleMinimize}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            style={{
              width: "100%", textAlign: "left", cursor: "pointer",
              background: surface, borderRadius: 20,
              padding: "14px 20px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              border: isDark ? `1px solid ${Colors.dark.border}` : "none",
              boxShadow: isDark ? "0 2px 20px rgba(0,0,0,0.25)" : "0 2px 20px rgba(0,0,0,0.07)",
            }}
          >
            <span style={{
              fontSize: 14, fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase", color: labelColor,
            }}>
              {title}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={labelColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </motion.button>
        ) : (
          <motion.div
            key="exp"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CardEditBtn({
  children, onClick, disabled = false, dimColor, "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  dimColor?: string;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-label={ariaLabel}
      style={{
        background: "none", border: "none",
        cursor: disabled ? "default" : "pointer",
        padding: "4px 8px",
        color: disabled ? (dimColor ?? "rgba(0,0,0,0.2)") : "var(--accent-primary)",
        display: "flex", alignItems: "center", justifyContent: "center",
        minWidth: 36, minHeight: 36,
        opacity: disabled ? 0.3 : 1,
      }}
    >
      {children}
    </button>
  );
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function PencilSVG() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function ChevronUpSVG() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 15l-6-6-6 6" />
    </svg>
  );
}

function ChevronDownSVG() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function MinusSVG() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
    </svg>
  );
}

function PlusSVG() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
