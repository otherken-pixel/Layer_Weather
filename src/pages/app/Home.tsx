import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";
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
import { upsertProfile, saveOutfitFeedback, getRecentFeedback, upsertCalibration, getWeatherWardrobes, getWardrobeItems } from "@/lib/supabase";
import { computeCalibrationFromFeedback } from "@/lib/outfit-feedback";
import { groupHourlyByDay, detectSignificantChanges } from "@/lib/weather";
import { getOutfitReason, getFeelsLikeExplanation, getLayeringTip } from "@/lib/outfit-logic";
import { buildDisplayCopyFromOverride } from "@/lib/outfitDisplayCopy";
import { sanitizeWardrobeOverrideForRain } from "@/lib/outfitRainDisplay";
import { getWeatherScenario } from "@/lib/wardrobeScenario";
import { addSavedLocation, getSavedLocations, removeSavedLocation } from "@/lib/saved-locations";
import { buildLocationCacheKey } from "@/lib/location-cache-key";
import { matchWardrobeToOutfit } from "@/lib/wardrobe-matching";
import { DEVICE_LOCATION_KEY } from "@/store";
import { LocationPickerSheet } from "@/components/location/LocationPickerSheet";
import { startGeofence, stopGeofence } from "@/lib/geofence";
import { useNavigate } from "react-router-dom";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import type { LocationData, OutfitFeedbackValue } from "@/types";

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
    setProfile, setCalibration, setLocation, weatherLastFetched,
    weatherWardrobes, setWeatherWardrobes,
    wardrobeItems, setWardrobeItems,
    svgCatalogById,
    forecastConfidence,
  } = useAppStore();
  const { eventType, styleHint } = useCalendarContext();
  const tempUnit = profile?.temp_unit ?? "F";
  const isDark = useDarkMode(profile?.theme_preference ?? null);
  const navigate = useNavigate();
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [locationPickerMode, setLocationPickerMode] = useState<"add" | "update">("update");

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

  // Trigger weather refresh when location city changes (e.g. tab switch).
  // prevCityRef is seeded from store so a persisted city does not look like a change.
  // skipNextCityRefreshRef ignores the city update from the initial refresh() below.
  const prevCityRef = useRef<string | null>(location?.city ?? null);
  const skipNextCityRefreshRef = useRef(false);
  useEffect(() => {
    const city = location?.city ?? null;
    if (city && city !== prevCityRef.current) {
      prevCityRef.current = city;
      if (skipNextCityRefreshRef.current) {
        skipNextCityRefreshRef.current = false;
        return;
      }
      // Pass city as cache key so switching between saved cities uses per-city cache.
      const loc = useAppStore.getState().location;
      const key = loc ? buildLocationCacheKey(loc) : city;
      refresh(false, { cacheKey: key });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.city, location?.latitude, location?.longitude]);

  // Initial load (refresh may call setLocation — skip duplicate city-change fetch).
  // Always clear the skip flag when refresh finishes: returning users already have
  // location.city from the profile, so the city-change effect often never runs.
  useEffect(() => {
    skipNextCityRefreshRef.current = true;
    void (async () => {
      try {
        await refresh();
      } finally {
        skipNextCityRefreshRef.current = false;
        prevCityRef.current = useAppStore.getState().location?.city ?? null;
        // Auto-seed the resolved location into saved list so tab bar appears immediately.
        const loc = useAppStore.getState().location;
        if (loc?.city) {
          const current = await getSavedLocations().catch(() => [] as typeof savedLocations);
          const alreadySaved = current.some(
            (l) => l.city.toLowerCase() === loc.city.toLowerCase(),
          );
          if (!alreadySaved) {
            const updated = await addSavedLocation(loc).catch(() => null);
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
    await refresh(true);
    // City path: sheet already called addSavedLocation with forward-geocoded name; refresh may
    // rename via reverse geocode — skip addSavedLocation so dedup by city string is not bypassed.
    if (ctx?.fromCitySave) return;
    // GPS save leaves city empty until refresh geocodes; persist in sheet only runs with a city.
    const loc = useAppStore.getState().location;
    if (loc?.city) {
      const updated = await addSavedLocation(loc).catch(() => null);
      if (updated) setSavedLocations(updated);
    }
  }

  function handleTabSelect(loc: LocationData) {
    setActiveLocationIsDevice(false);
    setLocation(loc);
  }

  function handleRefresh() {
    if (activeLocationIsDevice) {
      refresh(true, { useDeviceLocation: true, cacheKey: DEVICE_LOCATION_KEY });
      return;
    }
    const loc = useAppStore.getState().location;
    if (loc) {
      refresh(true, { cacheKey: buildLocationCacheKey(loc) });
    } else {
      refresh(true);
    }
  }

  async function handleDeviceTabSelect() {
    setActiveLocationIsDevice(true);
    refresh(true, { useDeviceLocation: true, cacheKey: DEVICE_LOCATION_KEY });
  }

  async function handleDeleteCity(city: string) {
    const updated = await removeSavedLocation(city).catch(() => null);
    if (updated) {
      setSavedLocations(updated);
      // If the deleted city was active, switch to device GPS
      if (location?.city?.toLowerCase() === city.toLowerCase()) {
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

  return (
    <div style={{ minHeight: "100%", background: skyColor, display: "flex", flexDirection: "column" }}>

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
            onClick={() => refresh(true)}
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
            onClick={() => refresh(true)}
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
              activeCity={location?.city ?? null}
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

            {/* Today's outfit */}
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

            {/* NOAA forecast confidence badge (US only) */}
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

            {/* Calendar style hint */}
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

            {/* Current Conditions */}
            <WeatherWidget
              weather={weather.current}
              tempUnit={tempUnit}
              onUnitChange={handleUnitChange}
              isDark={isDark}
            />

            {/* AQI card */}
            {weather.current.aqiIndex !== null && weather.current.aqiIndex !== undefined && (
              <AQICard aqiIndex={weather.current.aqiIndex} isDark={isDark} />
            )}

            {/* Nowcast */}
            {weather.nextHourPrecip && (
              <NowcastCard data={weather.nextHourPrecip} isDark={isDark} />
            )}

            {/* Hourly strip */}
            <HourlyStrip hourly={weather.hourly.slice(0, 12)} tempUnit={tempUnit} isDark={isDark} cardSurface={cardSurface} onFullForecast={() => navigate("/app/forecast")} />

            {/* 7-Day forecast */}
            {weather.daily.length > 0 && (
              <SevenDayCard
                daily={weather.daily}
                tempUnit={tempUnit}
                hourlyByDay={groupHourlyByDay(weather.hourly, weather.daily)}
                isDark={isDark}
              />
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
