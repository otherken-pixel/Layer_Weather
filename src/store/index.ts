import { create } from "zustand";
import type { Profile, UserCalibration, WeatherData, LocationData, OutfitRecommendation, DayOutfitTimeline, WardrobeItem } from "@/types";

interface AppState {
  // Auth
  userId: string | null;
  profile: Profile | null;
  calibration: UserCalibration | null;
  isOnboarded: boolean;

  // Location & Weather
  location: LocationData | null;
  savedLocations: LocationData[];
  weather: WeatherData | null;
  outfit: OutfitRecommendation | null;
  outfitTimeline: DayOutfitTimeline | null;
  weatherLastFetched: Date | null;

  // Wardrobe
  wardrobeItems: WardrobeItem[];
  setWardrobeItems: (items: WardrobeItem[]) => void;

  // UI
  isLoadingWeather: boolean;
  weatherError: string | null;

  // Actions
  setUserId: (id: string | null) => void;
  setProfile: (profile: Profile | null) => void;
  setCalibration: (cal: UserCalibration | null) => void;
  setIsOnboarded: (v: boolean) => void;
  setLocation: (loc: LocationData | null) => void;
  setSavedLocations: (locs: LocationData[]) => void;
  setWeather: (data: WeatherData | null) => void;
  setOutfit: (outfit: OutfitRecommendation | null) => void;
  setOutfitTimeline: (timeline: DayOutfitTimeline | null) => void;
  setWeatherLastFetched: (d: Date | null) => void;
  setIsLoadingWeather: (v: boolean) => void;
  setWeatherError: (e: string | null) => void;
  reset: () => void;
}

const initialState = {
  userId: null,
  profile: null,
  calibration: null,
  isOnboarded: false,
  location: null,
  savedLocations: [] as LocationData[],
  wardrobeItems: [] as WardrobeItem[],
  weather: null,
  outfit: null,
  outfitTimeline: null,
  weatherLastFetched: null,
  isLoadingWeather: false,
  weatherError: null,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setUserId: (id) => set({ userId: id }),
  setProfile: (profile) => set({ profile }),
  setCalibration: (calibration) => set({ calibration }),
  setIsOnboarded: (isOnboarded) => set({ isOnboarded }),
  setLocation: (location) => set({ location }),
  setSavedLocations: (savedLocations) => set({ savedLocations }),
  setWardrobeItems: (wardrobeItems) => set({ wardrobeItems }),
  setWeather: (weather) => set({ weather }),
  setOutfit: (outfit) => set({ outfit }),
  setOutfitTimeline: (outfitTimeline) => set({ outfitTimeline }),
  setWeatherLastFetched: (weatherLastFetched) => set({ weatherLastFetched }),
  setIsLoadingWeather: (isLoadingWeather) => set({ isLoadingWeather }),
  setWeatherError: (weatherError) => set({ weatherError }),
  reset: () => set(initialState),
}));
