import type {
  UserCalibration,
  OutfitRecommendation,
  OutfitType,
  OutfitMapping,
  WarmthTier,
  FootwearKind,
  AvatarCondition,
  HourlyForecast,
  CommuteAlert,
  WeatherCondition,
  DayPeriodLabel,
  DayPeriod,
  DayOutfitTimeline,
  StylePreference,
  FormalityPreference,
  PackingItem,
} from "@/types";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Flip-flops at or above this feels-like (°F); sneakers below when dry */
export const FLIP_FLOPS_MIN_TEMP_F = 85;

/** Below this feels-like → snow boots (when not rainy) */
export const SNOW_BOOTS_BELOW_TEMP_F = 50;

/** Wind chill is never applied at or above this feels-like (°F). */
export const WIND_CHILL_IGNORE_ABOVE_FEELS_F = 50;

/** Precip hysteresis: enter rainy above enter %, exit below exit % (when prior state known). */
export const PRECIP_RAIN_ENTER_PCT = 42;
export const PRECIP_RAIN_EXIT_PCT = 38;
export const PRECIP_RAIN_DEFAULT_PCT = 40;

/** Hardcoded outfit type per warmth tier — ultimate flat-lay failsafe. */
export const TIER_DEFAULT_OUTFIT: Record<WarmthTier, OutfitType> = {
  warmth_1: "shorts_tshirt",
  warmth_2: "pants_shortsleeve",
  warmth_3: "pants_longsleeve",
  warmth_4: "light_jacket",
  warmth_5: "heavy_jacket",
  warmth_6: "heavy_coat",
  warmth_6_snow: "heavy_coat",
  warmth_1_rain: "rain_light_shorts",
  warmth_2_rain: "rain_light",
  warmth_3_rain: "rain_heavy",
};

/**
 * Default floor (°F) for short sleeves + pants. The live boundary also rises with
 * `light_jacket_max_temp` so calibrated bands stay ordered and feedback can move it.
 */
export const PANTS_SHORTSLEEVE_MIN_TEMP_F = 68;

/** Relative warmth / layering (higher = more layers). Rain variants match their base layer. */
const OUTFIT_WARMTH: Record<OutfitType, number> = {
  shorts_tshirt: 1,
  dress: 1,
  pants_shortsleeve: 2,
  pants_longsleeve: 2,
  light_jacket: 3,
  rain_light: 3,
  rain_light_shorts: 2,
  heavy_jacket: 4,
  rain_heavy: 4,
  heavy_coat: 6,
};

// ── Multi-dimensional outfit mapping ──────────────────────────────────────────
//
// Lookup path: OUTFIT_MAPPING[warmthTier][stylePreference][formality]
// "all" is normalized to "neutral" before lookup.

type NormalizedStyle = "feminine" | "masculine" | "neutral";
type MappingTable = Record<WarmthTier, Record<NormalizedStyle, Record<FormalityPreference, OutfitMapping>>>;

const OUTFIT_MAPPING: MappingTable = {
  // ── Very warm / hot (≥ shorts threshold, dry) ──────────────────────────────
  warmth_1: {
    feminine: {
      activewear: { outfitType: "shorts_tshirt", label: "Sport & Sun", garmentTop: "Tank top", garmentBottom: "Athletic shorts", descriptionTemplate: "{garmentTop} and {garmentBottom} are perfect at {temp}°F." },
      casual:     { outfitType: "dress",          label: "Dress Weather", garmentTop: "Sundress", garmentBottom: null, descriptionTemplate: "{garmentTop} — beautiful {temp}°F weather was made for it." },
      business:   { outfitType: "pants_shortsleeve", label: "Business Smart", garmentTop: "Blouse", garmentBottom: "Dress trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} look sharp at {temp}°F." },
    },
    masculine: {
      activewear: { outfitType: "shorts_tshirt", label: "Sport & Sun", garmentTop: "Tank top", garmentBottom: "Athletic shorts", descriptionTemplate: "{garmentTop} and {garmentBottom} are perfect at {temp}°F." },
      casual:     { outfitType: "shorts_tshirt", label: "Short Sleeves & Shorts", garmentTop: "T-shirt", garmentBottom: "Shorts", descriptionTemplate: "{garmentTop} and {garmentBottom} are the move at {temp}°F." },
      business:   { outfitType: "pants_shortsleeve", label: "Business Casual", garmentTop: "Polo shirt", garmentBottom: "Chinos", descriptionTemplate: "{garmentTop} and {garmentBottom} keep it sharp at {temp}°F." },
    },
    neutral: {
      activewear: { outfitType: "shorts_tshirt", label: "Sport & Sun", garmentTop: "Tank top", garmentBottom: "Athletic shorts", descriptionTemplate: "{garmentTop} and {garmentBottom} are perfect at {temp}°F." },
      casual:     { outfitType: "shorts_tshirt", label: "Short Sleeves & Shorts", garmentTop: "T-shirt", garmentBottom: "Shorts", descriptionTemplate: "{garmentTop} and {garmentBottom} are the move at {temp}°F." },
      business:   { outfitType: "pants_shortsleeve", label: "Business Casual", garmentTop: "Short-sleeve dress shirt", garmentBottom: "Dress pants", descriptionTemplate: "{garmentTop} and {garmentBottom} keep it professional at {temp}°F." },
    },
  },

  // ── Warm (short-sleeve + pants range, dry) ────────────────────────────────
  warmth_2: {
    feminine: {
      activewear: { outfitType: "pants_shortsleeve", label: "Active Layers", garmentTop: "Fitted tee", garmentBottom: "Joggers", descriptionTemplate: "{garmentTop} and {garmentBottom} are the sweet spot at {temp}°F." },
      casual:     { outfitType: "dress",             label: "Light Dress Day", garmentTop: "Light sundress", garmentBottom: null, descriptionTemplate: "{garmentTop} is a great call at {temp}°F." },
      business:   { outfitType: "pants_longsleeve",  label: "Office Ready", garmentTop: "Blouse", garmentBottom: "Dress trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} — polished and comfortable at {temp}°F." },
    },
    masculine: {
      activewear: { outfitType: "pants_shortsleeve", label: "Active Layers", garmentTop: "Moisture-wicking tee", garmentBottom: "Track pants", descriptionTemplate: "{garmentTop} and {garmentBottom} keep you moving at {temp}°F." },
      casual:     { outfitType: "pants_shortsleeve", label: "Short Sleeves & Pants", garmentTop: "T-shirt", garmentBottom: "Pants", descriptionTemplate: "{garmentTop} and {garmentBottom} hit the sweet spot at {temp}°F." },
      business:   { outfitType: "pants_longsleeve",  label: "Business Casual", garmentTop: "Dress shirt", garmentBottom: "Trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} — clean and professional at {temp}°F." },
    },
    neutral: {
      activewear: { outfitType: "pants_shortsleeve", label: "Active Layers", garmentTop: "Fitted tee", garmentBottom: "Track pants", descriptionTemplate: "{garmentTop} and {garmentBottom} keep you moving at {temp}°F." },
      casual:     { outfitType: "pants_shortsleeve", label: "Short Sleeves & Pants", garmentTop: "T-shirt", garmentBottom: "Pants", descriptionTemplate: "{garmentTop} and {garmentBottom} hit the sweet spot at {temp}°F." },
      business:   { outfitType: "pants_longsleeve",  label: "Business Casual", garmentTop: "Dress shirt", garmentBottom: "Dress pants", descriptionTemplate: "{garmentTop} and {garmentBottom} — professional at {temp}°F." },
    },
  },

  // ── Mild (long-sleeve + pants range, dry) ─────────────────────────────────
  warmth_3: {
    feminine: {
      activewear: { outfitType: "pants_longsleeve", label: "Active Mid-Layer", garmentTop: "Long-sleeve athletic top", garmentBottom: "Joggers", descriptionTemplate: "{garmentTop} and {garmentBottom} nail it at {temp}°F." },
      casual:     { outfitType: "pants_longsleeve", label: "Long Sleeves & Pants", garmentTop: "Long-sleeve top", garmentBottom: "Pants", descriptionTemplate: "{garmentTop} and {garmentBottom} are the right call at {temp}°F." },
      business:   { outfitType: "light_jacket",     label: "Smart Office Look", garmentTop: "Blazer", garmentBottom: "Dress trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} are spot-on at {temp}°F." },
    },
    masculine: {
      activewear: { outfitType: "pants_longsleeve", label: "Active Mid-Layer", garmentTop: "Long-sleeve athletic top", garmentBottom: "Track pants", descriptionTemplate: "{garmentTop} and {garmentBottom} nail it at {temp}°F." },
      casual:     { outfitType: "pants_longsleeve", label: "Long Sleeves & Pants", garmentTop: "Long-sleeve shirt", garmentBottom: "Pants", descriptionTemplate: "{garmentTop} and {garmentBottom} are the right call at {temp}°F." },
      business:   { outfitType: "light_jacket",     label: "Business Layers", garmentTop: "Blazer over dress shirt", garmentBottom: "Trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} look sharp at {temp}°F." },
    },
    neutral: {
      activewear: { outfitType: "pants_longsleeve", label: "Active Mid-Layer", garmentTop: "Long-sleeve athletic top", garmentBottom: "Track pants", descriptionTemplate: "{garmentTop} and {garmentBottom} nail it at {temp}°F." },
      casual:     { outfitType: "pants_longsleeve", label: "Long Sleeves & Pants", garmentTop: "Long-sleeve shirt", garmentBottom: "Pants", descriptionTemplate: "{garmentTop} and {garmentBottom} are the right call at {temp}°F." },
      business:   { outfitType: "light_jacket",     label: "Business Layers", garmentTop: "Blazer over dress shirt", garmentBottom: "Trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} are spot-on at {temp}°F." },
    },
  },

  // ── Light jacket range (dry) ──────────────────────────────────────────────
  warmth_4: {
    feminine: {
      activewear: { outfitType: "light_jacket", label: "Running Jacket Weather", garmentTop: "Zip-up running jacket", garmentBottom: "Joggers", descriptionTemplate: "{garmentTop} and {garmentBottom} at {temp}°F — perfect running kit." },
      casual:     { outfitType: "light_jacket", label: "Light Jacket Day", garmentTop: "Light jacket", garmentBottom: "Pants", descriptionTemplate: "{garmentTop} and {garmentBottom} — you'll appreciate the layer at {temp}°F." },
      business:   { outfitType: "light_jacket", label: "Polished Layer", garmentTop: "Structured blazer", garmentBottom: "Dress trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} look polished at {temp}°F." },
    },
    masculine: {
      activewear: { outfitType: "light_jacket", label: "Running Jacket Weather", garmentTop: "Running jacket", garmentBottom: "Track pants", descriptionTemplate: "{garmentTop} and {garmentBottom} at {temp}°F — solid kit." },
      casual:     { outfitType: "light_jacket", label: "Light Jacket Day", garmentTop: "Light jacket", garmentBottom: "Pants", descriptionTemplate: "{garmentTop} and {garmentBottom} — smart call at {temp}°F." },
      business:   { outfitType: "light_jacket", label: "Business Layer", garmentTop: "Blazer over dress shirt", garmentBottom: "Trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} — sharp at {temp}°F." },
    },
    neutral: {
      activewear: { outfitType: "light_jacket", label: "Running Jacket Weather", garmentTop: "Running jacket", garmentBottom: "Track pants", descriptionTemplate: "{garmentTop} and {garmentBottom} at {temp}°F — solid kit." },
      casual:     { outfitType: "light_jacket", label: "Light Jacket Day", garmentTop: "Light jacket", garmentBottom: "Pants", descriptionTemplate: "{garmentTop} and {garmentBottom} — smart call at {temp}°F." },
      business:   { outfitType: "light_jacket", label: "Business Layer", garmentTop: "Blazer over dress shirt", garmentBottom: "Trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} — sharp at {temp}°F." },
    },
  },

  // ── Heavy jacket range (dry) ──────────────────────────────────────────────
  warmth_5: {
    feminine: {
      activewear: { outfitType: "heavy_jacket", label: "Warm Active Layer", garmentTop: "Insulated athletic jacket", garmentBottom: "Joggers", descriptionTemplate: "{garmentTop} and {garmentBottom} keep you warm at {temp}°F." },
      casual:     { outfitType: "heavy_jacket", label: "Heavy Jacket Day", garmentTop: "Heavy jacket", garmentBottom: "Pants", descriptionTemplate: "{garmentTop} and {garmentBottom} — bundle up at {temp}°F." },
      business:   { outfitType: "heavy_jacket", label: "Bundled Professional", garmentTop: "Overcoat", garmentBottom: "Dress trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} — brisk but put-together at {temp}°F." },
    },
    masculine: {
      activewear: { outfitType: "heavy_jacket", label: "Warm Active Layer", garmentTop: "Insulated running jacket", garmentBottom: "Track pants", descriptionTemplate: "{garmentTop} and {garmentBottom} keep you warm at {temp}°F." },
      casual:     { outfitType: "heavy_jacket", label: "Heavy Jacket Day", garmentTop: "Heavy jacket", garmentBottom: "Pants", descriptionTemplate: "{garmentTop} and {garmentBottom} — bundle up at {temp}°F." },
      business:   { outfitType: "heavy_jacket", label: "Bundled Professional", garmentTop: "Overcoat", garmentBottom: "Trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} — brisk but sharp at {temp}°F." },
    },
    neutral: {
      activewear: { outfitType: "heavy_jacket", label: "Warm Active Layer", garmentTop: "Insulated running jacket", garmentBottom: "Track pants", descriptionTemplate: "{garmentTop} and {garmentBottom} keep you warm at {temp}°F." },
      casual:     { outfitType: "heavy_jacket", label: "Heavy Jacket Day", garmentTop: "Heavy jacket", garmentBottom: "Pants", descriptionTemplate: "{garmentTop} and {garmentBottom} — bundle up at {temp}°F." },
      business:   { outfitType: "heavy_jacket", label: "Bundled Professional", garmentTop: "Overcoat", garmentBottom: "Trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} — brisk but sharp at {temp}°F." },
    },
  },

  // ── Heavy coat range (dry, <heavyCoat threshold) ──────────────────────────
  warmth_6: {
    feminine: {
      activewear: { outfitType: "heavy_coat", label: "Cold-Weather Training", garmentTop: "Insulated coat", garmentBottom: "Warm pants", descriptionTemplate: "{garmentTop} and {garmentBottom} at {temp}°F — dress for the cold." },
      casual:     { outfitType: "heavy_coat", label: "Winter Coat Weather", garmentTop: "Heavy coat", garmentBottom: "Warm pants", descriptionTemplate: "{garmentTop} and {garmentBottom} — it's full winter coat territory at {temp}°F." },
      business:   { outfitType: "heavy_coat", label: "Winter Professional", garmentTop: "Full-length overcoat", garmentBottom: "Dress trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} — commanding at {temp}°F." },
    },
    masculine: {
      activewear: { outfitType: "heavy_coat", label: "Cold-Weather Training", garmentTop: "Insulated coat", garmentBottom: "Warm pants", descriptionTemplate: "{garmentTop} and {garmentBottom} at {temp}°F — dress for the cold." },
      casual:     { outfitType: "heavy_coat", label: "Winter Coat Weather", garmentTop: "Heavy coat", garmentBottom: "Warm pants", descriptionTemplate: "{garmentTop} and {garmentBottom} — it's full winter coat territory at {temp}°F." },
      business:   { outfitType: "heavy_coat", label: "Winter Professional", garmentTop: "Full-length overcoat", garmentBottom: "Trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} — commanding at {temp}°F." },
    },
    neutral: {
      activewear: { outfitType: "heavy_coat", label: "Cold-Weather Training", garmentTop: "Insulated coat", garmentBottom: "Warm pants", descriptionTemplate: "{garmentTop} and {garmentBottom} at {temp}°F — dress for the cold." },
      casual:     { outfitType: "heavy_coat", label: "Winter Coat Weather", garmentTop: "Heavy coat", garmentBottom: "Warm pants", descriptionTemplate: "{garmentTop} and {garmentBottom} — it's full winter coat territory at {temp}°F." },
      business:   { outfitType: "heavy_coat", label: "Winter Professional", garmentTop: "Full-length overcoat", garmentBottom: "Trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} — commanding at {temp}°F." },
    },
  },

  // ── Snow ──────────────────────────────────────────────────────────────────
  warmth_6_snow: {
    feminine: {
      activewear: { outfitType: "heavy_coat", label: "Snow Day Layers", garmentTop: "Insulated winter coat", garmentBottom: "Warm pants", descriptionTemplate: "{garmentTop} and {garmentBottom} — snowfall possible at {temp}°F." },
      casual:     { outfitType: "heavy_coat", label: "Snow Day Layers", garmentTop: "Heavy coat", garmentBottom: "Warm pants", descriptionTemplate: "{garmentTop} and {garmentBottom} — snowfall possible at {temp}°F." },
      business:   { outfitType: "heavy_coat", label: "Snow Day Layers", garmentTop: "Full-length overcoat", garmentBottom: "Dress trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} — snowfall possible at {temp}°F." },
    },
    masculine: {
      activewear: { outfitType: "heavy_coat", label: "Snow Day Layers", garmentTop: "Insulated winter coat", garmentBottom: "Warm pants", descriptionTemplate: "{garmentTop} and {garmentBottom} — snowfall possible at {temp}°F." },
      casual:     { outfitType: "heavy_coat", label: "Snow Day Layers", garmentTop: "Heavy coat", garmentBottom: "Warm pants", descriptionTemplate: "{garmentTop} and {garmentBottom} — snowfall possible at {temp}°F." },
      business:   { outfitType: "heavy_coat", label: "Snow Day Layers", garmentTop: "Full-length overcoat", garmentBottom: "Trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} — snowfall possible at {temp}°F." },
    },
    neutral: {
      activewear: { outfitType: "heavy_coat", label: "Snow Day Layers", garmentTop: "Insulated winter coat", garmentBottom: "Warm pants", descriptionTemplate: "{garmentTop} and {garmentBottom} — snowfall possible at {temp}°F." },
      casual:     { outfitType: "heavy_coat", label: "Snow Day Layers", garmentTop: "Heavy coat", garmentBottom: "Warm pants", descriptionTemplate: "{garmentTop} and {garmentBottom} — snowfall possible at {temp}°F." },
      business:   { outfitType: "heavy_coat", label: "Snow Day Layers", garmentTop: "Full-length overcoat", garmentBottom: "Trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} — snowfall possible at {temp}°F." },
    },
  },

  // ── Warm rain (≥ shorts threshold + rain) ─────────────────────────────────
  warmth_1_rain: {
    feminine: {
      activewear: { outfitType: "rain_light_shorts", label: "Waterproof Active Warm", garmentTop: "Waterproof running shell", garmentBottom: "Athletic shorts", descriptionTemplate: "{garmentTop} and {garmentBottom} — warm and rainy at {temp}°F." },
      casual:     { outfitType: "rain_light_shorts", label: "Rain Jacket & Shorts", garmentTop: "Rain jacket", garmentBottom: "Shorts", descriptionTemplate: "{garmentTop} and {garmentBottom} — warm rain at {temp}°F." },
      business:   { outfitType: "rain_light",        label: "Rain-Ready Workwear", garmentTop: "Rain jacket", garmentBottom: "Dress trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} — stay professional in the rain at {temp}°F." },
    },
    masculine: {
      activewear: { outfitType: "rain_light_shorts", label: "Waterproof Active Warm", garmentTop: "Waterproof running shell", garmentBottom: "Athletic shorts", descriptionTemplate: "{garmentTop} and {garmentBottom} — warm and rainy at {temp}°F." },
      casual:     { outfitType: "rain_light_shorts", label: "Rain Jacket & Shorts", garmentTop: "Rain jacket", garmentBottom: "Shorts", descriptionTemplate: "{garmentTop} and {garmentBottom} — warm rain at {temp}°F." },
      business:   { outfitType: "rain_light",        label: "Professional Rain Gear", garmentTop: "Rain jacket", garmentBottom: "Dress trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} — sharp even in the rain at {temp}°F." },
    },
    neutral: {
      activewear: { outfitType: "rain_light_shorts", label: "Waterproof Active Warm", garmentTop: "Waterproof running shell", garmentBottom: "Athletic shorts", descriptionTemplate: "{garmentTop} and {garmentBottom} — warm and rainy at {temp}°F." },
      casual:     { outfitType: "rain_light_shorts", label: "Rain Jacket & Shorts", garmentTop: "Rain jacket", garmentBottom: "Shorts", descriptionTemplate: "{garmentTop} and {garmentBottom} — warm rain at {temp}°F." },
      business:   { outfitType: "rain_light",        label: "Professional Rain Gear", garmentTop: "Rain jacket", garmentBottom: "Dress trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} — sharp even in the rain at {temp}°F." },
    },
  },

  // ── Cool / mild rain (< shorts threshold + light-to-moderate rain) ─────────
  warmth_2_rain: {
    feminine: {
      activewear: { outfitType: "rain_light", label: "Waterproof Active Layer", garmentTop: "Waterproof running shell", garmentBottom: "Joggers", descriptionTemplate: "{garmentTop} and {garmentBottom} — rainy at {temp}°F." },
      casual:     { outfitType: "rain_light", label: "Rain Jacket", garmentTop: "Rain jacket", garmentBottom: "Pants", descriptionTemplate: "{garmentTop} and {garmentBottom} are the move in the rain at {temp}°F." },
      business:   { outfitType: "rain_light", label: "Rain-Ready Workwear", garmentTop: "Rain jacket", garmentBottom: "Dress trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} — professional rain gear at {temp}°F." },
    },
    masculine: {
      activewear: { outfitType: "rain_light", label: "Waterproof Active Layer", garmentTop: "Waterproof running shell", garmentBottom: "Track pants", descriptionTemplate: "{garmentTop} and {garmentBottom} — rainy at {temp}°F." },
      casual:     { outfitType: "rain_light", label: "Rain Jacket", garmentTop: "Rain jacket", garmentBottom: "Pants", descriptionTemplate: "{garmentTop} and {garmentBottom} are the move in the rain at {temp}°F." },
      business:   { outfitType: "rain_light", label: "Professional Rain Gear", garmentTop: "Rain jacket", garmentBottom: "Trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} — professional rain gear at {temp}°F." },
    },
    neutral: {
      activewear: { outfitType: "rain_light", label: "Waterproof Active Layer", garmentTop: "Waterproof running shell", garmentBottom: "Track pants", descriptionTemplate: "{garmentTop} and {garmentBottom} — rainy at {temp}°F." },
      casual:     { outfitType: "rain_light", label: "Rain Jacket", garmentTop: "Rain jacket", garmentBottom: "Pants", descriptionTemplate: "{garmentTop} and {garmentBottom} are the move in the rain at {temp}°F." },
      business:   { outfitType: "rain_light", label: "Professional Rain Gear", garmentTop: "Rain jacket", garmentBottom: "Trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} — professional rain gear at {temp}°F." },
    },
  },

  // ── Heavy rain (any temperature) ──────────────────────────────────────────
  warmth_3_rain: {
    feminine: {
      activewear: { outfitType: "rain_heavy", label: "Full Waterproof Kit", garmentTop: "Heavy rain jacket", garmentBottom: "Waterproof pants", descriptionTemplate: "{garmentTop} and {garmentBottom} — heavy rain at {temp}°F. Stay dry." },
      casual:     { outfitType: "rain_heavy", label: "Full Rain Gear", garmentTop: "Heavy rain jacket", garmentBottom: "Pants", descriptionTemplate: "{garmentTop} and {garmentBottom} — heavy rain at {temp}°F. Umbrella recommended too." },
      business:   { outfitType: "rain_heavy", label: "Stay Dry, Stay Sharp", garmentTop: "Heavy rain jacket", garmentBottom: "Dress trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} at {temp}°F — protect what's underneath." },
    },
    masculine: {
      activewear: { outfitType: "rain_heavy", label: "Full Waterproof Kit", garmentTop: "Heavy rain jacket", garmentBottom: "Waterproof pants", descriptionTemplate: "{garmentTop} and {garmentBottom} — heavy rain at {temp}°F. Stay dry." },
      casual:     { outfitType: "rain_heavy", label: "Full Rain Gear", garmentTop: "Heavy rain jacket", garmentBottom: "Pants", descriptionTemplate: "{garmentTop} and {garmentBottom} — heavy rain at {temp}°F. Umbrella recommended too." },
      business:   { outfitType: "rain_heavy", label: "Stay Dry, Stay Sharp", garmentTop: "Heavy rain jacket", garmentBottom: "Trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} at {temp}°F — protect what's underneath." },
    },
    neutral: {
      activewear: { outfitType: "rain_heavy", label: "Full Waterproof Kit", garmentTop: "Heavy rain jacket", garmentBottom: "Waterproof pants", descriptionTemplate: "{garmentTop} and {garmentBottom} — heavy rain at {temp}°F. Stay dry." },
      casual:     { outfitType: "rain_heavy", label: "Full Rain Gear", garmentTop: "Heavy rain jacket", garmentBottom: "Pants", descriptionTemplate: "{garmentTop} and {garmentBottom} — heavy rain at {temp}°F. Umbrella recommended too." },
      business:   { outfitType: "rain_heavy", label: "Stay Dry, Stay Sharp", garmentTop: "Heavy rain jacket", garmentBottom: "Trousers", descriptionTemplate: "{garmentTop} and {garmentBottom} at {temp}°F — protect what's underneath." },
    },
  },
};

// ── Helper: normalize style preference ────────────────────────────────────────

function normalizeStyle(style: StylePreference | undefined): NormalizedStyle {
  if (style === "feminine") return "feminine";
  if (style === "masculine") return "masculine";
  return "neutral"; // "neutral" and legacy "all" both map to neutral
}

export interface AdjustedThresholds {
  shorts: number;
  lightJacket: number;
  heavyCoat: number;
  lightJacketFloor: number;
  pantsShortsleeveMin: number;
  sensitivityShift: number;
}

/** Calibrated temperature band edges (°F), ordered for tier resolution. */
export function computeAdjustedThresholds(calibration: UserCalibration): AdjustedThresholds {
  const sensitivityShift = calibration.thermal_sensitivity * 3;
  const shorts = calibration.shorts_min_temp + sensitivityShift;
  const lightJacket = calibration.light_jacket_max_temp + sensitivityShift;
  const heavyCoat = calibration.heavy_coat_max_temp + sensitivityShift;
  const lightJacketFloor = heavyCoat + 15;

  const pantsShortsleeveMin = Math.min(
    shorts - 1,
    Math.max(
      PANTS_SHORTSLEEVE_MIN_TEMP_F + sensitivityShift,
      lightJacket + 3,
    ),
  );

  return {
    shorts,
    lightJacket,
    heavyCoat,
    lightJacketFloor,
    pantsShortsleeveMin,
    sensitivityShift,
  };
}

function isWeatherCodeRainy(weatherCode: number): boolean {
  return (weatherCode >= 51 && weatherCode <= 82) || weatherCode >= 95;
}

/** Schmitt-style rain flag from precip %; WMO rain/snow codes override hysteresis. */
export function resolveRainFromPrecip(
  effectivePrecipProb: number,
  weatherCode: number,
  previousRainy?: boolean | null,
): { isRainy: boolean; isHeavyRain: boolean } {
  if (isWeatherCodeRainy(weatherCode)) {
    return {
      isRainy: true,
      isHeavyRain:
        effectivePrecipProb > 70 || (weatherCode >= 61 && weatherCode <= 67),
    };
  }

  let isRainy: boolean;
  if (previousRainy === true) {
    isRainy = effectivePrecipProb >= PRECIP_RAIN_EXIT_PCT;
  } else if (previousRainy === false) {
    isRainy = effectivePrecipProb > PRECIP_RAIN_ENTER_PCT;
  } else {
    isRainy = effectivePrecipProb > PRECIP_RAIN_DEFAULT_PCT;
  }

  const isHeavyRain =
    effectivePrecipProb > 70 || (weatherCode >= 61 && weatherCode <= 67);
  return { isRainy, isHeavyRain };
}

function syntheticMappingForTier(tier: WarmthTier, outfitType: OutfitType): OutfitMapping {
  const neutralCasual = OUTFIT_MAPPING[tier]?.neutral?.casual;
  if (neutralCasual) return { ...neutralCasual, outfitType };
  return {
    outfitType,
    label: "Weather-appropriate outfit",
    garmentTop: "Top",
    garmentBottom: outfitType === "dress" ? null : "Bottom",
    descriptionTemplate: "Dress for {temp}°F conditions.",
  };
}

/**
 * Lookup OUTFIT_MAPPING[tier][style][formality] with formality → casual,
 * style → neutral, then tier default outfit type.
 */
export function lookupOutfitMapping(
  tier: WarmthTier,
  style: NormalizedStyle,
  formality: FormalityPreference,
): OutfitMapping {
  const tierTable = OUTFIT_MAPPING[tier];
  if (!tierTable) {
    const outfitType = TIER_DEFAULT_OUTFIT[tier] ?? "pants_longsleeve";
    console.warn(`WARN: Missing outfit tier ${tier}. Using default ${outfitType}.`);
    return syntheticMappingForTier(tier, outfitType);
  }

  const styleRow = tierTable[style];
  if (!styleRow) {
    if (style === "neutral") {
      const defaultType = TIER_DEFAULT_OUTFIT[tier];
      console.warn(
        `WARN: Missing outfit for ${tier} | neutral | ${formality}. Using tier default ${defaultType}.`,
      );
      return syntheticMappingForTier(tier, defaultType);
    }
    console.warn(
      `WARN: Missing outfit for ${tier} | ${style} | ${formality}. Falling back to neutral.`,
    );
    return lookupOutfitMapping(tier, "neutral", formality);
  }

  const mapping = styleRow[formality];
  if (mapping) return mapping;

  if (formality !== "casual") {
    console.warn(
      `WARN: Missing outfit for ${tier} | ${style} | ${formality}. Falling back to casual.`,
    );
    const casual = styleRow.casual;
    if (casual) return casual;
  }

  const defaultType = TIER_DEFAULT_OUTFIT[tier];
  console.warn(
    `WARN: Missing outfit for ${tier} | ${style} | ${formality}. Using tier default ${defaultType}.`,
  );
  return syntheticMappingForTier(tier, defaultType);
}

/** Returns true when weather is present; packing/commute helpers should bail when false. */
export function assertWeatherForOutfit(
  weather: { current: { feelsLike: number } } | null | undefined,
): weather is { current: { feelsLike: number } } {
  return weather != null && Number.isFinite(weather.current?.feelsLike);
}

// ── Helper: string template interpolation ─────────────────────────────────────

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? key);
}

// ── Heat Index (NWS Rothfusz regression) ──────────────────────────────────────
// Applies when feelsLike > 75°F and humidity > 40%.

function computeHeatIndex(t: number, rh: number): number {
  // Steadman simple approximation — use when result < 80
  const simple = 0.5 * (t + 61.0 + (t - 68.0) * 1.2 + rh * 0.094);
  if (simple < 80) return simple;
  // Full Rothfusz regression
  return (
    -42.379
    + 2.04901523 * t
    + 10.14333127 * rh
    - 0.22475541 * t * rh
    - 6.83783e-3 * t * t
    - 5.481717e-2 * rh * rh
    + 1.22874e-3 * t * t * rh
    + 8.5282e-4 * t * rh * rh
    - 1.99e-6 * t * t * rh * rh
  );
}

// ── Wind Chill (NWS formula) ──────────────────────────────────────────────────
// Applies when feelsLike < 50°F and windSpeed > 3 mph.

function computeWindChill(t: number, v: number): number {
  return 35.74 + 0.6215 * t - 35.75 * Math.pow(v, 0.16) + 0.4275 * t * Math.pow(v, 0.16);
}

// ── Warmth tier resolver ──────────────────────────────────────────────────────

function resolveWarmthTier(
  effectiveFeelsLike: number,
  thresholds: { shorts: number; lightJacket: number; heavyCoat: number },
  pantsShortsleeveMin: number,
  isRainy: boolean,
  isHeavyRain: boolean,
  isSnowy: boolean,
  rainTolerance: UserCalibration["rain_tolerance"],
): WarmthTier {
  if (isSnowy) return "warmth_6_snow";

  if (isRainy && rainTolerance !== "high") {
    if (isHeavyRain) return "warmth_3_rain";
    if (effectiveFeelsLike >= thresholds.shorts) return "warmth_1_rain";
    return "warmth_2_rain";
  }

  // High rain tolerance: dry layers in light rain, but still use rain tiers when heavy
  if (isRainy && rainTolerance === "high" && isHeavyRain) {
    return "warmth_3_rain";
  }

  const lightJacketFloor = thresholds.heavyCoat + 15;
  if (effectiveFeelsLike >= thresholds.shorts)        return "warmth_1";
  if (effectiveFeelsLike >= pantsShortsleeveMin)      return "warmth_2";
  if (effectiveFeelsLike >= thresholds.lightJacket)   return "warmth_3";
  if (effectiveFeelsLike >= lightJacketFloor)         return "warmth_4";
  if (effectiveFeelsLike >= thresholds.heavyCoat)     return "warmth_5";
  return "warmth_6";
}

// ── Footwear resolver ─────────────────────────────────────────────────────────

export function resolveFootwear(opts: {
  effectiveFeelsLike: number;
  isRainy: boolean;
  isHeavyRain: boolean;
  isSnowy: boolean;
  outfit: OutfitType;
  rainTolerance?: UserCalibration["rain_tolerance"];
  formality?: FormalityPreference;
  style?: NormalizedStyle;
}): FootwearKind {
  const { effectiveFeelsLike, isRainy, isHeavyRain, isSnowy, outfit, formality = "casual", style = "neutral" } = opts;
  const tol = opts.rainTolerance ?? "moderate";
  const isRainOutfit = outfit === "rain_heavy" || outfit === "rain_light" || outfit === "rain_light_shorts";

  // Rain boots: restricted to heavy rain or cold rain (not warm light drizzle)
  const insistRainBoots = isRainOutfit && (isHeavyRain || effectiveFeelsLike < 70);

  if (insistRainBoots && tol !== "high") {
    // Business formality skips rain boots in favour of dress shoes except in heavy/cold rain
    if (formality === "business" && !isHeavyRain && effectiveFeelsLike >= 55) {
      return style === "feminine" ? "dress_flats" : "loafers";
    }
    return "rain_boots";
  }

  if (isSnowy || effectiveFeelsLike < SNOW_BOOTS_BELOW_TEMP_F || outfit === "heavy_coat" || outfit === "heavy_jacket") {
    return "snow_boots";
  }

  // Business formality: no flip-flops ever; promote to dress shoes
  if (formality === "business") {
    if (effectiveFeelsLike >= SNOW_BOOTS_BELOW_TEMP_F) {
      return style === "feminine" ? "dress_flats" : "loafers";
    }
    return "snow_boots"; // cold business → still snow boots
  }

  // Rain: never open footwear; warm rain → sneakers (rain boots handled above when appropriate)
  if (isRainy) {
    if (formality === "activewear") return "athletic_sneakers";
    return "sneakers";
  }

  if (effectiveFeelsLike >= FLIP_FLOPS_MIN_TEMP_F) {
    return "flip_flops";
  }

  // Activewear prioritises athletic sneakers over standard sneakers
  if (formality === "activewear") return "athletic_sneakers";
  return "sneakers";
}

/** One-line reasoning shown beneath the outfit label. Garment names are personalised from the mapping. */
export function getOutfitReason(opts: {
  feelsLike: number;
  windSpeed: number;
  precipProb: number;
  humidity: number;
  weatherCode: number;
  outfit: OutfitType;
  garmentTop?: string;
  garmentBottom?: string | null;
}): string {
  const { feelsLike, windSpeed, precipProb, humidity, weatherCode, outfit } = opts;
  const top = opts.garmentTop;
  const bottom = opts.garmentBottom;
  const isWindy = windSpeed > 15;
  const isSnowy = weatherCode >= 71 && weatherCode <= 77;
  const isHeavyRain = precipProb > 70 || (weatherCode >= 61 && weatherCode <= 67);
  const isHumid = humidity > 70 && feelsLike > 70;

  if (outfit === "dress") {
    return isHumid
      ? `${feelsLike}°F · ${humidity}% humidity → ${top ?? "light & breathable dress"}`
      : `${feelsLike}°F → perfect ${top ?? "dress"} weather`;
  }
  if (outfit === "rain_heavy") return `${feelsLike}°F · heavy rain ${Math.round(precipProb)}% → ${top ?? "full rain gear"}`;
  if (outfit === "rain_light") return `${feelsLike}°F · rain ${Math.round(precipProb)}% → ${top ?? "rain jacket"}`;
  if (outfit === "rain_light_shorts") return `${feelsLike}°F · rain ${Math.round(precipProb)}% · warm → ${top ?? "rain jacket"} + ${bottom ?? "shorts"}`;
  if (isSnowy) return `${feelsLike}°F · snow → ${top ?? "winter coat"}`;
  if (isHeavyRain) return `${feelsLike}°F · heavy rain → gear up`;
  if (outfit === "heavy_coat") return isWindy ? `${feelsLike}°F + ${Math.round(windSpeed)} mph wind → ${top ?? "bundle up"}` : `${feelsLike}°F → ${top ?? "winter coat"} territory`;
  if (outfit === "heavy_jacket") return isWindy ? `${feelsLike}°F + ${Math.round(windSpeed)} mph gusts → ${top ?? "warm jacket"}` : `${feelsLike}°F → ${top ?? "heavy jacket"} needed`;
  if (outfit === "light_jacket") return isWindy ? `${feelsLike}°F + breezy → ${top ?? "light layer up"}` : `${feelsLike}°F → ${top ?? "light jacket"} recommended`;
  if (outfit === "pants_shortsleeve") return isHumid ? `${feelsLike}°F · ${humidity}% humidity → ${top ?? "short sleeves"}` : `${feelsLike}°F → ${top ?? "short sleeves"} & ${bottom ?? "pants"}`;
  if (outfit === "pants_longsleeve") return isHumid ? `${feelsLike}°F · ${humidity}% humidity → ${top ?? "light long sleeves"}` : `${feelsLike}°F → ${top ?? "long sleeves"} & ${bottom ?? "pants"}`;
  return isHumid
    ? `${feelsLike}°F · ${humidity}% humidity → light & breathable`
    : `${feelsLike}°F → ${top ?? "short sleeves"} & ${bottom ?? "shorts"}`;
}

/** Short explanation of why feels-like differs from actual temp. */
export function getFeelsLikeExplanation(opts: {
  temp: number;
  feelsLike: number;
  windSpeed: number;
  humidity: number;
}): string | null {
  const { temp, feelsLike, windSpeed, humidity } = opts;
  const delta = Math.round(feelsLike - temp);
  if (Math.abs(delta) < 2) return null;

  if (delta <= -2 && windSpeed > 10) {
    return `Wind chill (${Math.round(windSpeed)} mph) makes it feel ${Math.abs(delta)}° colder`;
  }
  if (delta >= 2 && humidity > 65 && temp > 70) {
    return `High humidity (${Math.round(humidity)}%) makes it feel ${delta}° warmer`;
  }
  if (delta <= -2) return `Conditions make it feel ${Math.abs(delta)}° colder than the thermometer`;
  if (delta >= 2)  return `Conditions make it feel ${delta}° warmer than the thermometer`;
  return null;
}

/** Returns layer direction when moving between outfits, or null if warmth is unchanged. */
export function getLayerChangeDirection(
  from: OutfitType,
  to: OutfitType
): "layer up" | "layer down" | null {
  if (from === to) return null;
  const delta = OUTFIT_WARMTH[to] - OUTFIT_WARMTH[from];
  if (delta > 0) return "layer up";
  if (delta < 0) return "layer down";
  return null;
}

/**
 * Returns a smart layering tip when morning and afternoon outfits diverge.
 * Returns null when no meaningful change occurs across the day.
 */
export function getLayeringTip(timeline: DayOutfitTimeline | null): string | null {
  if (!timeline || timeline.length < 2) return null;

  const morning   = timeline.find((e) => e.period.label === "Morning");
  const afternoon = timeline.find((e) => e.period.label === "Afternoon");
  const evening   = timeline.find((e) => e.period.label === "Evening");

  if (!morning || !afternoon) return null;

  const morningOutfit   = morning.recommendation.outfit;
  const afternoonOutfit = afternoon.recommendation.outfit;
  const morningWarmth   = OUTFIT_WARMTH[morningOutfit] ?? 3;
  const afternoonWarmth = OUTFIT_WARMTH[afternoonOutfit] ?? 3;
  const delta = morningWarmth - afternoonWarmth;

  const isRainOutfit = (o: OutfitType) => o === "rain_light" || o === "rain_light_shorts" || o === "rain_heavy";

  if (isRainOutfit(morningOutfit) && !isRainOutfit(afternoonOutfit)) {
    const afternoonTemp = Math.round(afternoon.period.avgFeelsLike);
    return `Grab an umbrella for the morning — rain clears and warms to ${afternoonTemp}° by afternoon.`;
  }

  if (isRainOutfit(afternoonOutfit) && !isRainOutfit(morningOutfit)) {
    return `Nice morning, but rain moves in this afternoon — pack a rain jacket before heading out.`;
  }

  if (delta >= 2) {
    const morningTemp   = Math.round(morning.period.avgFeelsLike);
    const afternoonTemp = Math.round(afternoon.period.avgFeelsLike);
    const rise = afternoonTemp - morningTemp;
    return `Chilly ${morningTemp}° morning → warms ${rise > 0 ? `+${rise}°` : `${rise}°`} to ${afternoonTemp}° by afternoon. Start layered — you'll shed up top later.`;
  }

  if (evening) {
    const eveningOutfit = evening.recommendation.outfit;
    const eveningWarmth = OUTFIT_WARMTH[eveningOutfit] ?? 3;
    if (eveningWarmth - afternoonWarmth >= 2) {
      const eveningTemp = Math.round(evening.period.avgFeelsLike);
      return `Warm afternoon, but evening drops to ${eveningTemp}°. Bring a jacket if you're out late.`;
    }
  }

  return null;
}

/** Onboarding / swipe cards — infer rain & snow from outfit + temp */
export function resolveFootwearForScenario(temp: number, outfit: OutfitType): FootwearKind {
  const isRainOutfit = outfit === "rain_light" || outfit === "rain_light_shorts" || outfit === "rain_heavy";
  const isSnowy = outfit === "heavy_coat" || (outfit === "heavy_jacket" && temp < SNOW_BOOTS_BELOW_TEMP_F);
  return resolveFootwear({
    effectiveFeelsLike: temp,
    isRainy: isRainOutfit,
    isHeavyRain: false,
    isSnowy,
    outfit,
    rainTolerance: "moderate",
  });
}

// ── Default calibration (used before onboarding) ──────────────────────────────
export const DEFAULT_CALIBRATION: UserCalibration = {
  user_id: "",
  thermal_sensitivity: 0,
  shorts_min_temp: 72,
  pants_max_temp: 75,
  light_jacket_max_temp: 65,
  heavy_coat_max_temp: 45,
  rain_tolerance: "moderate",
  humidity_sensitivity: true,
};

// ── Core recommendation engine ────────────────────────────────────────────────

export function getOutfitRecommendation(opts: {
  feelsLike: number;
  /** Dry-bulb air temperature (°F). Used for heat-index / wind-chill formulas; defaults to feelsLike if omitted. */
  temp?: number;
  weatherCode: number;
  windSpeed: number;
  precipProb: number;
  humidity: number;
  calibration: UserCalibration;
  hourly: HourlyForecast[];
  stylePreference?: StylePreference;
  formality?: FormalityPreference;
  isDay?: boolean;
  commuteStart?: string | null;
  commuteEnd?: string | null;
  /** Prior recommendation rain state — debounces precip threshold flicker. */
  previousRainy?: boolean | null;
}): OutfitRecommendation {
  const {
    feelsLike, weatherCode, windSpeed, precipProb, humidity,
    calibration, hourly,
    stylePreference, formality = "casual",
    isDay = true,
    commuteStart, commuteEnd,
  } = opts;
  const airTemp = opts.temp ?? feelsLike;

  const style = normalizeStyle(stylePreference);

  const {
    shorts: shortsThreshold,
    lightJacket: lightJacketThreshold,
    heavyCoat: heavyCoatThreshold,
    pantsShortsleeveMin,
  } = computeAdjustedThresholds(calibration);
  const adjustedThresholds = {
    shorts: shortsThreshold,
    lightJacket: lightJacketThreshold,
    heavyCoat: heavyCoatThreshold,
  };

  // Apparent temperature: heat index takes priority over wind chill (mutually exclusive branches).
  // Wind chill is never applied when feels-like is at or above 50°F.
  let effectiveFeelsLike = feelsLike;
  if (calibration.humidity_sensitivity) {
    if (feelsLike > 75 && humidity > 40) {
      effectiveFeelsLike = computeHeatIndex(airTemp, humidity);
    } else if (
      feelsLike < WIND_CHILL_IGNORE_ABOVE_FEELS_F &&
      windSpeed > 3
    ) {
      effectiveFeelsLike = computeWindChill(airTemp, windSpeed);
    }
  }

  // Near-term precip: use next-2-hour max to prevent future rain from driving current outfit
  const now = new Date();
  const nearTermHours = hourly.filter((h) => {
    const diff = (h.time.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diff > -1 && diff <= 2;
  });
  const effectivePrecipProb = nearTermHours.length > 0
    ? Math.max(...nearTermHours.map((h) => h.precipProb))
    : precipProb;

  const { isRainy, isHeavyRain } = resolveRainFromPrecip(
    effectivePrecipProb,
    weatherCode,
    opts.previousRainy,
  );
  const isWindy    = windSpeed > 15;
  const isSnowy    = weatherCode >= 71 && weatherCode <= 77;

  // Resolve intermediate warmth tier
  const warmthTier = resolveWarmthTier(
    effectiveFeelsLike,
    adjustedThresholds,
    pantsShortsleeveMin,
    isRainy,
    isHeavyRain,
    isSnowy,
    calibration.rain_tolerance,
  );

  const mapping = lookupOutfitMapping(warmthTier, style, formality);
  const { outfitType: outfit, label, garmentTop, garmentBottom, descriptionTemplate } = mapping;

  // Resolve description from template
  // User-facing copy uses raw feels-like (matches header); tier selection uses effectiveFeelsLike.
  const description = buildDescription(
    descriptionTemplate, garmentTop, garmentBottom, feelsLike,
    isWindy, effectivePrecipProb, isSnowy,
  );

  // Accessories
  // Sunglasses: clear / mainly clear only (WMO 0–1), dry, warm, daytime — never when raining
  const sunglasses =
    !isRainy && weatherCode <= 1 && isDay && effectiveFeelsLike > 68;
  const scarf      = effectiveFeelsLike < 35 || (isWindy && effectiveFeelsLike < 50);
  const beanie     = effectiveFeelsLike < 30 || isSnowy;
  const gloves     = effectiveFeelsLike < 40 || isSnowy;

  // Umbrella and rain shell vary by formality
  let umbrella  = false;
  let rainShell = false;
  if (isRainy) {
    if (formality === "business") {
      // Business always reaches for a classic umbrella
      umbrella = true;
    } else if (formality === "activewear") {
      // Activewear opts for a waterproof shell instead of an umbrella
      rainShell = true;
      umbrella  = false;
    } else {
      // Casual: umbrella when gear is on or precip is high
      umbrella =
        outfit === "rain_light" || outfit === "rain_light_shorts" || outfit === "rain_heavy" ||
        (effectivePrecipProb > 60 && calibration.rain_tolerance !== "high") ||
        (calibration.rain_tolerance === "high" && effectivePrecipProb > 50);
    }
  }

  const footwear = resolveFootwear({
    effectiveFeelsLike,
    isRainy,
    isHeavyRain,
    isSnowy,
    outfit,
    rainTolerance: calibration.rain_tolerance,
    formality,
    style,
  });

  const avatarCondition = getAvatarCondition(weatherCode, isWindy, isRainy, isSnowy);

  const commuteAlert =
    hourly.length > 0
      ? buildCommuteAlert(
          hourly,
          effectiveFeelsLike,
          outfit,
          commuteStart,
          commuteEnd,
          {
            weatherCode,
            windSpeed,
            precipProb,
            humidity,
            calibration,
            stylePreference,
            formality,
            previousRainy: isRainy,
          },
        )
      : null;

  return {
    outfit,
    warmthTier,
    garmentTop,
    garmentBottom,
    effectivePrecipProb,
    label,
    description,
    rainGear: isRainy,
    umbrella,
    rainShell,
    sunglasses,
    scarf,
    beanie,
    gloves,
    footwear,
    avatarCondition,
    commuteAlert,
  };
}

// ── Description builder ───────────────────────────────────────────────────────

function buildDescription(
  template: string,
  garmentTop: string,
  garmentBottom: string | null,
  temp: number,
  windy: boolean,
  precipProb: number,
  snowy: boolean,
): string {
  const base = interpolate(template, {
    garmentTop,
    garmentBottom: garmentBottom ?? "",
    temp: String(Math.round(temp)),
  });

  const windNote  = windy         ? " Expect a gusty breeze."                           : "";
  const rainNote  = precipProb > 60 ? " High chance of rain — bring that umbrella."    : "";
  const snowNote  = snowy           ? " Snowfall possible — layer up underneath."       : "";

  return `${base}${windNote}${rainNote}${snowNote}`.trim();
}

// ── Avatar condition ──────────────────────────────────────────────────────────

function getAvatarCondition(
  weatherCode: number,
  isWindy: boolean,
  isRainy: boolean,
  isSnowy: boolean,
): AvatarCondition {
  if (weatherCode >= 95) return "stormy";
  if (isSnowy)  return "snowy";
  if (isRainy)  return "rainy";
  if (isWindy)  return "windy";
  if (weatherCode <= 2) return "sunny";
  return "cloudy";
}

// ── Commute alert ─────────────────────────────────────────────────────────────

interface CommuteRecalcOpts {
  weatherCode: number;
  windSpeed: number;
  precipProb: number;
  humidity: number;
  calibration: UserCalibration;
  stylePreference?: StylePreference;
  formality?: FormalityPreference;
  previousRainy?: boolean | null;
}

function buildCommuteAlert(
  hourly: HourlyForecast[],
  currentFeelsLike: number,
  currentOutfit: OutfitType,
  commuteStart?: string | null,
  commuteEnd?: string | null,
  recalc?: CommuteRecalcOpts,
): CommuteAlert | null {
  if ((!commuteStart && !commuteEnd) || hourly.length === 0) return null;

  const now = new Date();

  const checkTime = (timeStr: string): { feelsLike: number; outfit: OutfitType } | null => {
    const [h, m] = timeStr.split(":").map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if (target < now) return null;

    const closest = hourly.find(
      (hr) => Math.abs(hr.time.getTime() - target.getTime()) < 30 * 60 * 1000
    );
    if (!closest) return null;

    const outfitAtCommute = recalc
      ? getOutfitRecommendation({
          feelsLike: closest.feelsLike,
          temp: closest.temp,
          weatherCode: closest.weatherCode,
          windSpeed: closest.windSpeed,
          precipProb: closest.precipProb,
          humidity: recalc.humidity,
          calibration: recalc.calibration,
          stylePreference: recalc.stylePreference,
          formality: recalc.formality,
          hourly,
          previousRainy: recalc.previousRainy,
        }).outfit
      : currentOutfit;

    return { feelsLike: closest.feelsLike, outfit: outfitAtCommute };
  };

  if (commuteStart) {
    const morningData = checkTime(commuteStart);
    if (morningData) {
      const delta = morningData.feelsLike - currentFeelsLike;
      const layerChange = getLayerChangeDirection(currentOutfit, morningData.outfit);
      const outfitChanged = layerChange !== null && morningData.outfit !== currentOutfit;
      if (Math.abs(delta) >= 10 || outfitChanged) {
        const layerNote =
          outfitChanged && layerChange === "layer up"
            ? " You'll want more layers for your commute."
            : outfitChanged && layerChange === "layer down"
              ? " You can dress lighter when you leave."
              : "";
        const tempPart =
          Math.abs(delta) >= 2
            ? `${morningData.feelsLike}°F feels-like. ${delta < 0 ? "Dress warmer for your commute." : "It'll feel warmer when you leave."}`
            : `Around ${morningData.feelsLike}°F at departure.`;
        return {
          type: "morning",
          message: `Departure at ${formatTime(commuteStart)}: ${tempPart}${layerNote}`,
          urgency: Math.abs(delta) >= 18 || (outfitChanged && layerChange === "layer up") ? "warning" : "info",
        };
      }
    }
  }

  if (commuteEnd) {
    const eveningData = checkTime(commuteEnd);
    if (eveningData) {
      const delta = eveningData.feelsLike - currentFeelsLike;
      const layerChange = getLayerChangeDirection(currentOutfit, eveningData.outfit);
      const outfitChanged = layerChange !== null && eveningData.outfit !== currentOutfit;
      if (delta <= -12 || (outfitChanged && layerChange === "layer up")) {
        return {
          type: "evening",
          message: outfitChanged && layerChange === "layer up" && delta > -12
            ? `Your ${formatTime(commuteEnd)} return needs warmer layers — pack a jacket.`
            : `It drops ${Math.abs(Math.round(delta))}° by your ${formatTime(commuteEnd)} return. Toss a jacket in your bag.`,
          urgency: Math.abs(delta) >= 18 || outfitChanged ? "warning" : "info",
        };
      }
    }
  }

  return null;
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
}

// ── Day outfit timeline ───────────────────────────────────────────────────────

const PERIOD_RANGES: { label: DayPeriodLabel; startHour: number; endHour: number }[] = [
  { label: "Morning",   startHour: 6,  endHour: 12 },
  { label: "Afternoon", startHour: 12, endHour: 18 },
  { label: "Evening",   startHour: 18, endHour: 24 },
];

export function getDayOutfitTimeline(
  todayHourly: HourlyForecast[],
  calibration: UserCalibration,
  stylePreference?: StylePreference,
  formality?: FormalityPreference,
  /** Current humidity (%) — hourly rows lack humidity; use live reading for heat-index alignment. */
  humidityForPeriods = 50,
): DayOutfitTimeline {
  const result: DayOutfitTimeline = [];
  let previousRainy: boolean | null = null;

  for (const range of PERIOD_RANGES) {
    const block = todayHourly.filter((h) => {
      const hour = h.time.getHours();
      return hour >= range.startHour && hour < range.endHour;
    });

    if (block.length === 0) continue;

    const feelsLikes   = block.map((h) => h.feelsLike);
    const minFeelsLike = Math.min(...feelsLikes);
    const maxFeelsLike = Math.max(...feelsLikes);
    const avgFeelsLike = Math.round(feelsLikes.reduce((s, v) => s + v, 0) / feelsLikes.length);
    const avgTemp = Math.round(block.reduce((s, h) => s + h.temp, 0) / block.length);

    const conditionCounts = block.reduce<Record<string, number>>((acc, h) => {
      acc[h.condition] = (acc[h.condition] ?? 0) + 1;
      return acc;
    }, {});
    const condition = Object.entries(conditionCounts).sort(([, a], [, b]) => b - a)[0][0] as WeatherCondition;

    const dominantHour = block.find((h) => h.condition === condition) ?? block[0];
    const weatherCode  = dominantHour.weatherCode;
    const maxPrecipProb = Math.max(...block.map((h) => h.precipProb));
    const avgWindSpeed  = Math.round(block.reduce((s, h) => s + h.windSpeed, 0) / block.length);
    const blockIsDay    = block.some((h) => h.isDay);

    const period: DayPeriod = {
      label: range.label,
      startHour: range.startHour,
      endHour: range.endHour,
      minFeelsLike,
      maxFeelsLike,
      avgFeelsLike,
      condition,
      precipProb: maxPrecipProb,
      windSpeed: avgWindSpeed,
      weatherCode,
    };

    const recommendation = getOutfitRecommendation({
      feelsLike: avgFeelsLike,
      temp: avgTemp,
      weatherCode,
      windSpeed: avgWindSpeed,
      precipProb: maxPrecipProb,
      humidity: humidityForPeriods,
      calibration,
      stylePreference,
      formality,
      isDay: blockIsDay,
      hourly: block,
      previousRainy,
    });

    previousRainy = recommendation.rainGear;
    result.push({ period, recommendation });
  }

  return result;
}

// ── Calibration wizard logic ──────────────────────────────────────────────────

export interface CalibrationSwipe {
  temp: number;
  direction: "left" | "right" | "center";
}

export function computeCalibrationFromSwipes(swipes: CalibrationSwipe[]): Partial<UserCalibration> {
  const sorted = [...swipes].sort((a, b) => a.temp - b.temp);

  let shortsMin      = 72;
  let lightJacketMax = 65;
  let heavyCoatMax   = 45;

  for (const s of sorted) {
    if (s.direction === "center") continue;
    if (s.direction === "right" && s.temp < shortsMin)         shortsMin      = s.temp;
    if (s.direction === "left"  && s.temp > lightJacketMax)    lightJacketMax = s.temp;
    if (s.direction === "left"  && s.temp < 50)                heavyCoatMax   = s.temp - 5;
  }

  lightJacketMax = Math.min(lightJacketMax, shortsMin - 3);
  heavyCoatMax   = Math.min(heavyCoatMax, lightJacketMax - 10);

  return {
    shorts_min_temp:       shortsMin,
    pants_max_temp:        shortsMin - 1,
    light_jacket_max_temp: Math.max(lightJacketMax, 40),
    heavy_coat_max_temp:   Math.max(heavyCoatMax, 20),
  };
}

// ── Travel packing logic ──────────────────────────────────────────────────────

export function generatePackingList(
  dailyForecasts: { feelsLikeMin: number; feelsLikeMax: number; precipProb: number; condition: string }[],
  calibration: UserCalibration,
): PackingItem[] {
  if (dailyForecasts.length === 0) return [];

  const items: PackingItem[] = [];
  const thresholds = computeAdjustedThresholds(calibration);

  const coldDays     = dailyForecasts.filter((d) => d.feelsLikeMin < thresholds.lightJacket).length;
  const hotDays      = dailyForecasts.filter((d) => d.feelsLikeMax >= thresholds.shorts).length;
  const rainDays     = dailyForecasts.filter((d) => d.precipProb > 50).length;
  const flipFlopDays = dailyForecasts.filter((d) => d.feelsLikeMax >= FLIP_FLOPS_MIN_TEMP_F && d.precipProb <= 50 && d.condition !== "snow").length;
  const sneakerDays  = dailyForecasts.filter((d) => d.feelsLikeMax < FLIP_FLOPS_MIN_TEMP_F && d.feelsLikeMin >= SNOW_BOOTS_BELOW_TEMP_F && d.precipProb <= 50 && d.condition !== "snow").length;
  const snowBootDays = dailyForecasts.filter((d) => d.condition === "snow" || d.feelsLikeMin < SNOW_BOOTS_BELOW_TEMP_F).length;

  if (hotDays > 0) {
    items.push({ category: "tops",    name: "T-shirts", quantity: hotDays + 1, reason: `${hotDays} warm days expected` });
    items.push({ category: "bottoms", name: "Shorts",   quantity: Math.ceil(hotDays / 2) });
  }
  if (flipFlopDays > 0) {
    items.push({ category: "footwear", name: "Flip flops", quantity: 1, reason: `${flipFlopDays} day${flipFlopDays > 1 ? "s" : ""} at ${FLIP_FLOPS_MIN_TEMP_F}°F or warmer` });
  }
  if (sneakerDays > 0) {
    items.push({ category: "footwear", name: "Sneakers", quantity: 1, reason: `${sneakerDays} mild day${sneakerDays > 1 ? "s" : ""} (${SNOW_BOOTS_BELOW_TEMP_F}–${FLIP_FLOPS_MIN_TEMP_F - 1}°F, dry)` });
  }
  if (snowBootDays > 0) {
    items.push({ category: "footwear", name: "Snow boots", quantity: 1, reason: `${snowBootDays} cold or snowy day${snowBootDays > 1 ? "s" : ""}` });
  }
  if (coldDays > 0) {
    items.push({ category: "outerwear",   name: "Warm jacket",   quantity: 1, reason: `Lows around ${Math.min(...dailyForecasts.map((d) => d.feelsLikeMin))}°F` });
    if (dailyForecasts.some((d) => d.feelsLikeMin < 40)) {
      items.push({ category: "accessories", name: "Gloves", quantity: 1, reason: "Cold mornings expected" });
    }
  }
  if (rainDays > 0) {
    items.push({ category: "outerwear",   name: "Rain jacket",    quantity: 1, reason: `${rainDays} rainy day${rainDays > 1 ? "s" : ""}` });
    items.push({ category: "footwear",    name: "Rain boots",     quantity: 1, reason: `${rainDays} wet day${rainDays > 1 ? "s" : ""}` });
    if (calibration.rain_tolerance === "low") {
      items.push({ category: "accessories", name: "Compact umbrella", quantity: 1 });
    }
  }

  items.push({
    category: "bottoms",
    name: "Pants / Jeans",
    quantity: Math.min(dailyForecasts.length, 3),
  });

  return items;
}
