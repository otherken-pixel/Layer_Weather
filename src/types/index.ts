// ── Auth ─────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  theme_preference: string | null;
  temp_unit: "F" | "C";
  commute_start: string | null; // "07:30"
  commute_end: string | null;   // "18:00"
  fcm_token: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  last_city: string | null;
  updated_at: string;
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
  condition: WeatherCondition;
  weatherCode: number;    // WMO code (or approximated from WeatherKit condition)
  isDay: boolean;
  location: string;
  updatedAt: Date;
}

export interface HourlyForecast {
  time: Date;
  temp: number;
  feelsLike: number;
  precipProb: number;
  condition: WeatherCondition;
  weatherCode: number;
  windSpeed: number;
  isDay: boolean;
}

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
  _source?: "weatherkit" | "open-meteo";
}

// ── Outfits ───────────────────────────────────────────────────────────────────

export type OutfitType =
  | "shorts_tshirt"
  | "pants_tshirt"
  | "light_jacket"
  | "heavy_jacket"
  | "heavy_coat"
  | "rain_light"
  | "rain_heavy";

/** Footwear shown in the Flat Lay accessories zone */
export type FootwearKind = "flip_flops" | "sneakers" | "snow_boots" | "rain_boots";

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
  label: string;            // "Light Jacket Weather"
  description: string;      // "Cool and breezy morning. Layer up."
  rainGear: boolean;
  umbrella: boolean;
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
