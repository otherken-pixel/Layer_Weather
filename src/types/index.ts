// ── Auth ─────────────────────────────────────────────────────────────────────

export type StylePreference = "feminine" | "masculine" | "neutral";
export type FormalityPreference = "activewear" | "casual" | "business";
export type WeatherScenario = "hot" | "warm" | "mild" | "cool" | "cold" | "rainy" | "snowy";

export type SubscriptionStatus = "none" | "trialing" | "active" | "expired" | "cancelled";
export type SubscriptionTier = "monthly" | "annual";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  theme_preference: string | null;
  accent_color: string | null;
  temp_unit: "F" | "C";
  outfit_display_mode: "visual" | "text";
  style_preference: StylePreference[];
  formality_preference: FormalityPreference | null;
  commute_start: string | null; // "07:30"
  commute_end: string | null;   // "18:00"
  fcm_token: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  last_city: string | null;
  saved_locations: LocationData[] | null;
  /** Widget & Watch location: today (default), home (profile last city), or a saved city key. */
  widget_location_preference?: WidgetLocationPreference | null;
  nerd_mode_enabled: boolean;
  nerd_mode_cards: NerdModeCardId[];
  card_layout: Array<{ id: string; minimized: boolean }> | null;
  subscription_status: SubscriptionStatus;
  subscription_tier: SubscriptionTier | null;
  subscription_expires_at: string | null;
  trial_started_at: string | null;
  original_transaction_id: string | null;
  /** Server-granted complimentary Pro. Set by admins (never the client). */
  comp_access?: boolean;
  /** When complimentary access ends. null = lifetime (when comp_access is true). */
  comp_access_until?: string | null;
  updated_at: string;
}

// ── Pollen ────────────────────────────────────────────────────────────────────

export type PollenLevel = "low" | "moderate" | "high" | "very_high";

export interface PollenData {
  tree: number | null;    // max of alder, birch, olive pollen (grains/m³), or UPI-equivalent when source is google
  grass: number | null;
  weed: number | null;    // max of mugwort, ragweed pollen
  dominant: "tree" | "grass" | "weed" | null;
  level: PollenLevel | null;  // overall worst level
  source?: "open-meteo" | "google";
}

// ── Solar ─────────────────────────────────────────────────────────────────────

export interface SolarData {
  maxSunshineHoursPerYear: number;
  avgDailyPeakSunHours: number | null;
  carbonOffsetFactorKgPerMwh: number | null;
  maxArrayAreaMeters2: number | null;
  imageryDate: { year: number; month: number; day: number } | null;
  imageryQuality: string | null;
}

// ── Nerd Mode ─────────────────────────────────────────────────────────────────

export type NerdModeCardId = "rain_accumulation" | "moon_phases" | "seasonal_produce" | "pollen" | "solar";

export interface NerdModeCardMeta {
  id: NerdModeCardId;
  label: string;
  emoji: string;
  description: string;
}

export const NERD_MODE_CARDS: NerdModeCardMeta[] = [
  {
    id: "rain_accumulation",
    label: "Rain Accumulation",
    emoji: "🌧️",
    description: "Total rainfall over the last 24 h, 3 days, 7 days, and 30 days.",
  },
  {
    id: "moon_phases",
    label: "Moon Phases",
    emoji: "🌕",
    description: "Current moon phase, illumination, and upcoming phase dates.",
  },
  {
    id: "seasonal_produce",
    label: "Seasonal Produce",
    emoji: "🥦",
    description: "Fruits and vegetables in season for your region this month.",
  },
  {
    id: "pollen",
    label: "Pollen",
    emoji: "🌿",
    description: "Tree, grass, and weed pollen levels for your area.",
  },
  {
    id: "solar",
    label: "Solar Potential",
    emoji: "☀️",
    description: "Annual sunshine hours and peak sun data for your location.",
  },
];

export interface RainHistoryData {
  last24h: number;  // mm
  last3d: number;
  last7d: number;
  last30d: number;
}

export type RainTolerance = "low" | "moderate" | "high";

// ── Calibration ───────────────────────────────────────────────────────────────

export interface UserCalibration {
  user_id: string;
  thermal_sensitivity: -2 | -1 | 0 | 1 | 2; // -2 = always cold, 2 = always hot
  shorts_min_temp: number;     // default 72°F
  pants_max_temp: number;      // default 75°F
  light_jacket_max_temp: number; // default 65°F
  heavy_coat_max_temp: number;   // default 45°F
  rain_tolerance: RainTolerance;
  humidity_sensitivity: boolean;
  updated_at?: string;
}

export type ThermalSensitivity = -2 | -1 | 0 | 1 | 2;

// ── Air Quality ───────────────────────────────────────────────────────────────

export interface EPAObservation {
  parameter: string;
  aqi: number;
  category: string;
  reportingArea: string;
}

// ── Weather ───────────────────────────────────────────────────────────────────

export type WeatherCondition =
  | "clear"
  | "partly_cloudy"
  | "cloudy"
  | "foggy"
  | "drizzle"
  | "rain"
  | "heavy_rain"
  | "snow"
  | "thunderstorm";

export interface CurrentWeather {
  temp: number;           // actual temp in °F
  feelsLike: number;      // apparent temperature in °F
  humidity: number;       // percentage
  windSpeed: number;      // mph
  windDirection: number;  // degrees
  precipProb: number;     // percentage 0-100
  uvIndex: number;
  /** US EPA AQI (0–500+). Null when unavailable (e.g. WeatherKit source). */
  aqiIndex: number | null;
  condition: WeatherCondition;
  weatherCode: number;    // WMO code (or approximated from WeatherKit condition)
  isDay: boolean;
  location: string;
  updatedAt: Date;
  /** Wind gust speed in mph. Null when not provided by the source. */
  windGust: number | null;
  /** Barometric pressure (mean sea level) in hPa. */
  pressure: number | null;
  /** Visibility in miles. */
  visibility: number | null;
  /** Dew point temperature in °F. */
  dewPoint: number | null;
  /** Pressure trend computed from 3-hour change. Null when data is unavailable. */
  pressureTrend?: "rising" | "falling" | "steady" | null;
}

export interface HourlyForecast {
  time: Date;
  temp: number;
  feelsLike: number;
  precipProb: number;
  condition: WeatherCondition;
  weatherCode: number;
  windSpeed: number;
  windDirection?: number;
  isDay: boolean;
  /** Thunderstorm probability 0–100. Only available from Open-Meteo ICON model and WeatherKit derived codes. */
  thunderstormProb?: number;
}

export type ForecastConfidence = "high" | "medium" | "low" | null;

export interface NWSAlert {
  id: string;
  event: string;
  headline: string;
  severity: "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
  urgency: "Immediate" | "Expected" | "Future" | "Past" | "Unknown";
  effective: Date;
  expires: Date;
}

export type LightningActivity = "none" | "low" | "moderate" | "high";

export interface DailyForecast {
  date: Date;
  tempMin: number;
  tempMax: number;
  feelsLikeMin: number;
  feelsLikeMax: number;
  precipProb: number;
  condition: WeatherCondition;
  weatherCode: number;
  sunrise: Date;
  sunset: Date;
}

export interface NextHourPrecip {
  startTime: Date;
  minutes: { precipIntensity: number; precipProbability: number }[];
}

export interface WeatherData {
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  nextHourPrecip: NextHourPrecip | null;
  _source?: "weatherkit" | "open-meteo" | "nws";
}

// ── Outfits ───────────────────────────────────────────────────────────────────

/**
 * Intermediate thermal tier output of the temperature-band logic.
 * The multi-dimensional mapping resolves this into a concrete OutfitType
 * based on stylePreference and formality.
 */
export type WarmthTier =
  | "warmth_1"       // ≥ shorts threshold — very warm / hot
  | "warmth_2"       // short-sleeve + pants range
  | "warmth_3"       // long-sleeve + pants range
  | "warmth_4"       // light jacket range
  | "warmth_5"       // heavy jacket range
  | "warmth_6"       // heavy coat range
  | "warmth_1_rain"  // warm + rain (≥ shorts threshold)
  | "warmth_2_rain"  // cool/mild + light-to-moderate rain
  | "warmth_3_rain"  // heavy rain (any temperature)
  | "warmth_6_snow"; // snow active — forces winter coat

export type OutfitType =
  | "shorts_tshirt"
  | "pants_shortsleeve"
  | "pants_longsleeve"     // renamed from pants_tshirt for clarity
  | "light_jacket"
  | "heavy_jacket"
  | "heavy_coat"
  | "rain_light"
  | "rain_light_shorts"
  | "rain_heavy"
  | "dress";

/** Garment names and display strings resolved from the OutfitMapping table. */
export interface OutfitMapping {
  outfitType: OutfitType;
  label: string;
  descriptionTemplate: string; // placeholders: {garmentTop}, {garmentBottom}, {temp}
  garmentTop: string;
  garmentBottom: string | null; // null for full-length dresses
}

/** Footwear shown in the Flat Lay accessories zone */
export type FootwearKind =
  | "flip_flops"
  | "sneakers"
  | "athletic_sneakers" // activewear formality priority
  | "loafers"           // business formality (warm/mild)
  | "dress_flats"       // business formality feminine
  | "snow_boots"
  | "rain_boots";

export type AvatarCondition =
  | "sunny"
  | "cloudy"
  | "rainy"
  | "windy"
  | "snowy"
  | "stormy"
  | "foggy"
  | "clear_night";

export interface OutfitRecommendation {
  outfit: OutfitType;
  warmthTier: WarmthTier;
  garmentTop: string;
  garmentBottom: string | null;
  /** Max precip % in the next 2 hours when hourly data exists; else snapshot `precipProb` passed in. */
  effectivePrecipProb: number;
  label: string;            // "Light Jacket Weather"
  description: string;      // "Cool and breezy morning. Layer up."
  rainGear: boolean;
  umbrella: boolean;
  rainShell: boolean;       // activewear formality rain indicator (waterproof running shell)
  sunglasses: boolean;
  scarf: boolean;
  beanie: boolean;
  gloves: boolean;
  /** Weather-appropriate footwear for the Flat Lay */
  footwear: FootwearKind;
  avatarCondition: AvatarCondition;
  commuteAlert: CommuteAlert | null;
}

export interface CommuteAlert {
  type: "morning" | "evening";
  message: string;          // "Bring a jacket — it drops 18° by your 6 PM return"
  urgency: "info" | "warning" | "critical";
}

// ── Outfit Timeline ───────────────────────────────────────────────────────────

export type DayPeriodLabel = "Morning" | "Afternoon" | "Evening";

export interface DayPeriod {
  label: DayPeriodLabel;
  startHour: number;
  endHour: number;
  minFeelsLike: number;
  maxFeelsLike: number;
  avgFeelsLike: number;
  condition: WeatherCondition;
  precipProb: number;
  windSpeed: number;
  weatherCode: number;
}

export interface OutfitTimelineEntry {
  period: DayPeriod;
  recommendation: OutfitRecommendation;
}

export type DayOutfitTimeline = OutfitTimelineEntry[];

// ── Widget / Watch location ───────────────────────────────────────────────────

export type WidgetLocationMode = "today" | "home" | "saved";

export interface WidgetLocationPreference {
  mode: WidgetLocationMode;
  /** `buildLocationCacheKey` for a saved city when mode is `saved`. */
  savedKey?: string;
}

// ── Location ──────────────────────────────────────────────────────────────────

export interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  region: string;
  country: string;
}

// ── Outfit Feedback ───────────────────────────────────────────────────────────

export type OutfitFeedbackValue = "thumbs_up" | "thumbs_down";

export interface OutfitFeedbackRecord {
  id?: string;
  user_id: string;
  outfit_type: OutfitType;
  feels_like_temp: number;
  weather_code: number;
  wind_speed: number;
  feedback: OutfitFeedbackValue;
  created_at?: string;
}

// ── Onboarding ────────────────────────────────────────────────────────────────

export interface CalibrationScenario {
  id: string;
  temp: number;         // °F shown to user
  outfit: OutfitType;
  description: string;  // "65°F – T-shirt and shorts"
}

export type SwipeDirection = "left" | "right" | "center"; // left = too cold, right = too warm, center = just right

// ── Navigation ────────────────────────────────────────────────────────────────

export type RootStackParamList = {
  "(auth)/welcome": undefined;
  "(auth)/login": undefined;
  "(auth)/register": undefined;
  "(onboarding)/index": undefined;
  "(tabs)/index": undefined;
  "(tabs)/forecast": undefined;
  "(tabs)/packing": undefined;
  "(tabs)/settings": undefined;
};

// ── Wardrobe ──────────────────────────────────────────────────────────────────

export type WardrobeCategory = "tops" | "bottoms" | "outerwear" | "footwear" | "accessories";

export type StyleTag = "casual" | "formal" | "activewear" | "outdoor" | "work" | "smart-casual";

export interface WardrobeItem {
  id: string;
  user_id: string;
  category: WardrobeCategory;
  name: string;
  warmth_rating: 1 | 2 | 3 | 4 | 5;
  is_waterproof: boolean;
  style_tags: StyleTag[];
  color: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeatherWardrobePreset {
  id: string;
  user_id: string;
  scenario: WeatherScenario;
  top_svg: string | null;
  bottom_svg: string | null;
  outerwear_svg: string | null;
  footwear_svg: string | null;
  accessory_svgs: string[];
  created_at: string;
  updated_at: string;
}

// ── Packing ───────────────────────────────────────────────────────────────────

export interface PackingTrip {
  destination: string;
  latitude: number;
  longitude: number;
  departureDate: Date;
  returnDate: Date;
}

export interface PackingItem {
  category: "tops" | "bottoms" | "outerwear" | "footwear" | "accessories";
  name: string;
  quantity: number;
  reason?: string;
}

export interface SerializedDailyForecast {
  date: string;
  tempMin: number;
  tempMax: number;
  feelsLikeMin: number;
  feelsLikeMax: number;
  precipProb: number;
  condition: WeatherCondition;
  weatherCode: number;
  sunrise: string;
  sunset: string;
}

export interface PackingAiInsights {
  weather_summary: string;
  daily_highlights: { date: string; summary: string }[];
  packing_recommendations: PackingItem[];
  packing_notes: string;
}

export interface SavedPackingTrip {
  id: string;
  user_id: string;
  destination: string;
  latitude: number;
  longitude: number;
  country_code: string | null;
  departure_date: string;
  return_date: string;
  packing_list: PackingItem[] | null;
  weather_snapshot: SerializedDailyForecast[] | null;
  last_generated_at: string | null;
  ai_insights: PackingAiInsights | null;
  ai_generated_at: string | null;
  created_at: string;
}
