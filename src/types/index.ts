// ── Auth ─────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_style: string;
  temp_unit: "F" | "C";
  commute_start: string | null; // "07:30"
  commute_end: string | null;   // "18:00"
  fcm_token: string | null;
  updated_at: string;
}

// ── Calibration ───────────────────────────────────────────────────────────────

export interface UserCalibration {
  user_id: string;
  thermal_sensitivity: -2 | -1 | 0 | 1 | 2; // -2 = always cold, 2 = always hot
  shorts_min_temp: number;     // default 72°F
  pants_max_temp: number;      // default 75°F
  light_jacket_max_temp: number; // default 65°F
  heavy_coat_max_temp: number;   // default 45°F
  rain_tolerance: "low" | "moderate" | "high";
  humidity_sensitivity: boolean;
  updated_at: string;
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
  condition: WeatherCondition;
  weatherCode: number;    // WMO code
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

export interface WeatherData {
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
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
  avatarCondition: AvatarCondition;
  commuteAlert: CommuteAlert | null;
}

export interface CommuteAlert {
  type: "morning" | "evening";
  message: string;          // "Bring a jacket — it drops 18° by your 6 PM return"
  urgency: "info" | "warning" | "critical";
}

// ── Location ──────────────────────────────────────────────────────────────────

export interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  region: string;
  country: string;
}

// ── Onboarding ────────────────────────────────────────────────────────────────

export interface CalibrationScenario {
  id: string;
  temp: number;         // °F shown to user
  outfit: OutfitType;
  description: string;  // "65°F – T-shirt and shorts"
}

export type SwipeDirection = "left" | "right"; // left = too cold, right = too warm/fine

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
