import { create } from "zustand";
import type { Profile, UserCalibration, WeatherData, LocationData, OutfitRecommendation, DayOutfitTimeline, WardrobeItem, WeatherWardrobePreset, FormalityPreference, ForecastConfidence, NWSAlert, LightningActivity, EPAObservation, PollenData, SolarData } from "@/types";
import type { GoogleWeatherAlert } from "@/lib/googleWeatherAlertsService";
import type { SvgCatalogEntry } from "@/lib/svgCatalog.types";
import { loadCardLayout, saveCardLayout, type CardConfig, type CardId } from "@/lib/card-layout";
import { upsertProfile } from "@/lib/supabase";

const DEVICE_LOCATION_PREF_KEY = "device_location_mode";

function persistDeviceLocationMode(value: boolean): void {
  import("@capacitor/preferences")
    .then(({ Preferences }) => Preferences.set({ key: DEVICE_LOCATION_PREF_KEY, value: String(value) }))
    .catch(() => {});
}

export async function loadDeviceLocationPref(): Promise<boolean> {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: DEVICE_LOCATION_PREF_KEY });
    return value === "true";
  } catch {
    return false;
  }
}

export interface CachedCityWeather {
  weather: WeatherData;
  outfit: OutfitRecommendation;
  outfitTimeline: DayOutfitTimeline | null;
  fetchedAt: Date;
}

/** Key used in cityWeatherCache when viewing device GPS weather. */
export const DEVICE_LOCATION_KEY = "__device__";

interface AppState {
  // Auth
  userId: string | null;
  profile: Profile | null;
  calibration: UserCalibration | null;
  isOnboarded: boolean;

  // Location & Weather
  location: LocationData | null;
  savedLocations: LocationData[];
  /** True when the currently displayed weather is from device GPS (not a saved city). */
  activeLocationIsDevice: boolean;
  weather: WeatherData | null;
  outfit: OutfitRecommendation | null;
  outfitTimeline: DayOutfitTimeline | null;
  weatherLastFetched: Date | null;
  forecastConfidence: ForecastConfidence;
  /** Active NWS severe weather alerts (US only). Empty array outside the US. */
  nwsAlerts: NWSAlert[];
  /** NOAA SWDI lightning strike activity level for the current location (US only). */
  lightningActivity: LightningActivity | null;
  /** EPA AirNow pollutant breakdown for the current location. Null when unavailable or using cached data. */
  aqiBreakdown: EPAObservation[] | null;
  /** EPA AirNow tomorrow's AQI forecast. Null when unavailable or non-US. */
  aqiForecast: { aqi: number; category: string } | null;
  /** Pollen levels for tree, grass, and weed. Null when outside coverage or using cached data. */
  pollenData: PollenData | null;
  /** Google Solar API data for the current location. Null when unavailable. */
  solarData: SolarData | null;
  /** Google Weather API governmental alerts. Empty array when none active or outside coverage. */
  activeAlerts: GoogleWeatherAlert[];
  /** In-memory per-city weather cache keyed by city name (or DEVICE_LOCATION_KEY). */
  cityWeatherCache: Record<string, CachedCityWeather>;

  // Wardrobe
  wardrobeItems: WardrobeItem[];
  weatherWardrobes: WeatherWardrobePreset[];

  // SVG catalog (from svg_clothes table)
  svgCatalog: SvgCatalogEntry[];
  svgCatalogById: Record<string, SvgCatalogEntry>;
  svgCatalogLoading: boolean;
  svgCatalogError: string | null;

  setWardrobeItems: (
    items: WardrobeItem[] | ((prev: WardrobeItem[]) => WardrobeItem[])
  ) => void;
  setWeatherWardrobes: (presets: WeatherWardrobePreset[]) => void;
  setSvgCatalog: (catalog: SvgCatalogEntry[], byId: Record<string, SvgCatalogEntry>) => void;
  setSvgCatalogLoading: (loading: boolean) => void;
  setSvgCatalogError: (error: string | null) => void;

  // Outfit personalization
  formality: FormalityPreference;

  // UI
  isLoadingWeather: boolean;
  weatherError: string | null;

  // Card layout
  cardLayout: CardConfig[];
  setCardLayout: (layout: CardConfig[]) => void;
  toggleCardMinimized: (id: CardId) => void;
  hydrateCardLayout: (layout: CardConfig[]) => void;

  // Actions
  setUserId: (id: string | null) => void;
  setFormality: (f: FormalityPreference) => void;
  setProfile: (profile: Profile | null) => void;
  setCalibration: (cal: UserCalibration | null) => void;
  setIsOnboarded: (v: boolean) => void;
  setLocation: (loc: LocationData | null) => void;
  setSavedLocations: (locs: LocationData[]) => void;
  setActiveLocationIsDevice: (v: boolean) => void;
  setWeather: (data: WeatherData | null) => void;
  setOutfit: (outfit: OutfitRecommendation | null) => void;
  setOutfitTimeline: (timeline: DayOutfitTimeline | null) => void;
  setWeatherLastFetched: (d: Date | null) => void;
  setForecastConfidence: (c: ForecastConfidence) => void;
  setNWSAlerts: (alerts: NWSAlert[]) => void;
  setLightningActivity: (activity: LightningActivity | null) => void;
  setAqiBreakdown: (breakdown: EPAObservation[] | null) => void;
  setAqiForecast: (forecast: { aqi: number; category: string } | null) => void;
  setPollenData: (data: PollenData | null) => void;
  setSolarData: (data: SolarData | null) => void;
  setActiveAlerts: (alerts: GoogleWeatherAlert[]) => void;
  setIsLoadingWeather: (v: boolean) => void;
  setWeatherError: (e: string | null) => void;
  setCityWeatherCache: (key: string, entry: CachedCityWeather) => void;
  removeCityWeatherCache: (key: string) => void;
  reset: () => void;
}

const initialState = {
  userId: null,
  profile: null,
  calibration: null,
  isOnboarded: false,
  formality: "casual" as FormalityPreference,
  location: null,
  savedLocations: [] as LocationData[],
  activeLocationIsDevice: false,
  wardrobeItems: [] as WardrobeItem[],
  weatherWardrobes: [] as WeatherWardrobePreset[],
  svgCatalog: [] as SvgCatalogEntry[],
  svgCatalogById: {} as Record<string, SvgCatalogEntry>,
  svgCatalogLoading: false,
  svgCatalogError: null as string | null,
  weather: null,
  outfit: null,
  outfitTimeline: null,
  weatherLastFetched: null,
  forecastConfidence: null,
  nwsAlerts: [] as NWSAlert[],
  lightningActivity: null as LightningActivity | null,
  aqiBreakdown: null as EPAObservation[] | null,
  aqiForecast: null as { aqi: number; category: string } | null,
  pollenData: null as PollenData | null,
  solarData: null as SolarData | null,
  activeAlerts: [] as GoogleWeatherAlert[],
  isLoadingWeather: false,
  weatherError: null,
  cityWeatherCache: {} as Record<string, CachedCityWeather>,
  cardLayout: loadCardLayout(),
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  setUserId: (id) => set({ userId: id }),
  setFormality: (formality) => set({ formality }),
  setProfile: (profile) => set({ profile }),
  setCalibration: (calibration) => set({ calibration }),
  setIsOnboarded: (isOnboarded) => set({ isOnboarded }),
  setLocation: (location) => set({ location }),
  setSavedLocations: (savedLocations) => set({ savedLocations }),
  setActiveLocationIsDevice: (activeLocationIsDevice) => {
    persistDeviceLocationMode(activeLocationIsDevice);
    set({ activeLocationIsDevice });
  },
  setWardrobeItems: (itemsOrUpdater) =>
    set((state) => ({
      wardrobeItems:
        typeof itemsOrUpdater === "function"
          ? itemsOrUpdater(state.wardrobeItems)
          : itemsOrUpdater,
    })),
  setWeatherWardrobes: (weatherWardrobes) => set({ weatherWardrobes }),
  setSvgCatalog: (svgCatalog, svgCatalogById) => set({ svgCatalog, svgCatalogById }),
  setSvgCatalogLoading: (svgCatalogLoading) => set({ svgCatalogLoading }),
  setSvgCatalogError: (svgCatalogError) => set({ svgCatalogError }),
  setWeather: (weather) => set({ weather }),
  setOutfit: (outfit) => set({ outfit }),
  setOutfitTimeline: (outfitTimeline) => set({ outfitTimeline }),
  setWeatherLastFetched: (weatherLastFetched) => set({ weatherLastFetched }),
  setForecastConfidence: (forecastConfidence) => set({ forecastConfidence }),
  setNWSAlerts: (nwsAlerts) => set({ nwsAlerts }),
  setLightningActivity: (lightningActivity) => set({ lightningActivity }),
  setAqiBreakdown: (aqiBreakdown) => set({ aqiBreakdown }),
  setAqiForecast: (aqiForecast) => set({ aqiForecast }),
  setPollenData: (pollenData) => set({ pollenData }),
  setSolarData: (solarData) => set({ solarData }),
  setActiveAlerts: (activeAlerts) => set({ activeAlerts }),
  setIsLoadingWeather: (isLoadingWeather) => set({ isLoadingWeather }),
  setWeatherError: (weatherError) => set({ weatherError }),
  setCityWeatherCache: (key, entry) =>
    set((state) => {
      const updated = { ...state.cityWeatherCache, [key]: entry };
      // Evict entries beyond the limit, dropping the oldest by fetchedAt first.
      const MAX_CACHED_CITIES = 12;
      const keys = Object.keys(updated);
      if (keys.length <= MAX_CACHED_CITIES) return { cityWeatherCache: updated };
      const sorted = keys.sort(
        (a, b) => updated[b].fetchedAt.getTime() - updated[a].fetchedAt.getTime(),
      );
      const pruned = Object.fromEntries(
        sorted.slice(0, MAX_CACHED_CITIES).map((k) => [k, updated[k]]),
      );
      return { cityWeatherCache: pruned };
    }),
  removeCityWeatherCache: (key) =>
    set((state) => {
      const { [key]: _removed, ...cityWeatherCache } = state.cityWeatherCache;
      return { cityWeatherCache };
    }),
  setCardLayout: (layout) => {
    saveCardLayout(layout);
    set({ cardLayout: layout });
    const { userId } = get();
    if (userId) upsertProfile(userId, { card_layout: layout }).catch(() => {});
  },
  toggleCardMinimized: (id) => {
    const state = get();
    const next = state.cardLayout.map((c) =>
      c.id === id ? { ...c, minimized: !c.minimized } : c,
    );
    saveCardLayout(next);
    set({ cardLayout: next });
    if (state.userId) upsertProfile(state.userId, { card_layout: next }).catch(() => {});
  },
  hydrateCardLayout: (layout) => {
    saveCardLayout(layout);
    set({ cardLayout: layout });
  },
  reset: () => set({ ...initialState, cardLayout: loadCardLayout() }),
}));
