import type {
  UserCalibration,
  OutfitRecommendation,
  OutfitType,
  AvatarCondition,
  HourlyForecast,
  CommuteAlert,
} from "@/types";

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
  weatherCode: number;
  windSpeed: number;
  precipProb: number;
  humidity: number;
  calibration: UserCalibration;
  hourly: HourlyForecast[];
  commuteStart?: string | null; // "07:30"
  commuteEnd?: string | null;   // "18:00"
}): OutfitRecommendation {
  const {
    feelsLike,
    weatherCode,
    windSpeed,
    precipProb,
    humidity,
    calibration,
    hourly,
    commuteStart,
    commuteEnd,
  } = opts;

  // Thermal sensitivity shifts perceived temp (-2..+2 maps to ±6°F)
  const sensitivityShift = calibration.thermal_sensitivity * 3;
  // Cold people feel colder, hot people feel warmer → we shift their thresholds
  const adjustedThresholds = {
    shorts: calibration.shorts_min_temp + sensitivityShift,
    pants: calibration.pants_max_temp + sensitivityShift,
    lightJacket: calibration.light_jacket_max_temp + sensitivityShift,
    heavyCoat: calibration.heavy_coat_max_temp + sensitivityShift,
  };

  // Humidity makes warm air feel worse (muggy), cold air feel worse (damp)
  let effectiveFeelsLike = feelsLike;
  if (calibration.humidity_sensitivity) {
    if (humidity > 70 && feelsLike > 75) effectiveFeelsLike += 3;
    if (humidity > 60 && feelsLike < 50) effectiveFeelsLike -= 2;
  }

  const isRainy =
    precipProb > 40 ||
    (weatherCode >= 51 && weatherCode <= 82) ||
    weatherCode >= 95;
  const isHeavyRain =
    precipProb > 70 || (weatherCode >= 61 && weatherCode <= 67);
  const isWindy = windSpeed > 15;
  const isSnowy = weatherCode >= 71 && weatherCode <= 77;

  // Base outfit from temperature
  let outfit: OutfitType;
  if (effectiveFeelsLike >= adjustedThresholds.shorts) {
    outfit = "shorts_tshirt";
  } else if (effectiveFeelsLike >= adjustedThresholds.pants) {
    outfit = "pants_tshirt";
  } else if (effectiveFeelsLike >= adjustedThresholds.lightJacket) {
    outfit = "light_jacket";
  } else if (effectiveFeelsLike >= adjustedThresholds.heavyCoat) {
    outfit = "heavy_jacket";
  } else {
    outfit = "heavy_coat";
  }

  // Rain override — only escalate to full rain gear when it's also cold
  if (isRainy && calibration.rain_tolerance !== "high") {
    if (isHeavyRain && effectiveFeelsLike < 75) {
      outfit = "rain_heavy";
    } else if (outfit === "shorts_tshirt" || outfit === "pants_tshirt") {
      outfit = "rain_light";
    }
  }

  const umbrella =
    outfit === "rain_light" ||
    outfit === "rain_heavy" ||
    (precipProb > 60 && calibration.rain_tolerance !== "high");
  const sunglasses = weatherCode === 0 && effectiveFeelsLike > 68;
  const scarf = effectiveFeelsLike < 35 || (isWindy && effectiveFeelsLike < 50);
  const beanie = effectiveFeelsLike < 30 || isSnowy;

  const avatarCondition = getAvatarCondition(
    weatherCode,
    isWindy,
    isRainy,
    isSnowy
  );

  const commuteAlert = buildCommuteAlert(
    hourly,
    effectiveFeelsLike,
    outfit,
    commuteStart,
    commuteEnd
  );

  return {
    outfit,
    label: getOutfitLabel(outfit),
    description: buildDescription(effectiveFeelsLike, outfit, isWindy, precipProb, isSnowy),
    rainGear: isRainy,
    umbrella,
    sunglasses,
    scarf,
    beanie,
    avatarCondition,
    commuteAlert,
  };
}

function getOutfitLabel(outfit: OutfitType): string {
  const labels: Record<OutfitType, string> = {
    shorts_tshirt: "Short Sleeves & Shorts",
    pants_tshirt: "Long Sleeves & Pants",
    light_jacket: "Light Jacket",
    heavy_jacket: "Heavy Jacket",
    heavy_coat: "Winter Coat",
    rain_light: "Rain Jacket",
    rain_heavy: "Full Rain Gear",
  };
  return labels[outfit];
}

function buildDescription(
  feelsLike: number,
  outfit: OutfitType,
  windy: boolean,
  precipProb: number,
  snowy: boolean
): string {
  const windNote = windy ? " Expect a gusty breeze." : "";
  const rainNote = precipProb > 60 ? " High chance of rain — bring that umbrella." : "";
  const snowNote = snowy ? " Snowfall possible — layer up." : "";

  switch (outfit) {
    case "shorts_tshirt":
      return `Short sleeves and shorts are the move at ${feelsLike}°F. Light, breathable fabrics will keep you comfortable.${windNote}`;
    case "pants_tshirt":
      return `At ${feelsLike}°F, a long-sleeve shirt and pants is the right call. Light layers you can adjust as needed.${windNote}`;
    case "light_jacket":
      return `${feelsLike}°F calls for a long-sleeve shirt under a light jacket. You'll appreciate that layer once the sun dips.${windNote}`;
    case "heavy_jacket":
      return `Bundle up at ${feelsLike}°F — long sleeves under a warm jacket will keep the chill off.${windNote}`;
    case "heavy_coat":
      return `${feelsLike}°F is full winter coat territory. Layer your long sleeves underneath for extra warmth.${windNote}${snowNote}`;
    case "rain_light":
      return `${feelsLike}°F with rain on the way — a rain jacket is your best move.${rainNote}`;
    case "rain_heavy":
      return `Heavy rain at ${feelsLike}°F — full rain gear is a must today. Stay dry out there.${rainNote}`;
  }
}

function getAvatarCondition(
  weatherCode: number,
  isWindy: boolean,
  isRainy: boolean,
  isSnowy: boolean
): AvatarCondition {
  if (weatherCode >= 95) return "stormy";
  if (isSnowy) return "snowy";
  if (isRainy) return "rainy";
  if (isWindy) return "windy";
  if (weatherCode === 0) return "sunny";
  if (weatherCode <= 2) return "sunny";
  return "cloudy";
}

function buildCommuteAlert(
  hourly: HourlyForecast[],
  currentFeelsLike: number,
  currentOutfit: OutfitType,
  commuteStart?: string | null,
  commuteEnd?: string | null
): CommuteAlert | null {
  if (!commuteStart && !commuteEnd) return null;

  const now = new Date();

  const checkTime = (timeStr: string): { feelsLike: number; outfit: OutfitType } | null => {
    const [h, m] = timeStr.split(":").map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if (target < now) return null;

    const closest = hourly.find((h) => Math.abs(h.time.getTime() - target.getTime()) < 30 * 60 * 1000);
    if (!closest) return null;
    return { feelsLike: closest.feelsLike, outfit: currentOutfit };
  };

  if (commuteStart) {
    const morningData = checkTime(commuteStart);
    if (morningData) {
      const delta = morningData.feelsLike - currentFeelsLike;
      if (Math.abs(delta) >= 10) {
        return {
          type: "morning",
          message: `Departure at ${formatTime(commuteStart)}: ${morningData.feelsLike}°F feels-like. ${delta < 0 ? "Dress warmer for your commute." : "It'll feel warmer when you leave."}`,
          urgency: Math.abs(delta) >= 18 ? "warning" : "info",
        };
      }
    }
  }

  if (commuteEnd) {
    const eveningData = checkTime(commuteEnd);
    if (eveningData) {
      const delta = eveningData.feelsLike - currentFeelsLike;
      if (delta <= -12) {
        return {
          type: "evening",
          message: `It drops ${Math.abs(Math.round(delta))}° by your ${formatTime(commuteEnd)} return. Toss a jacket in your bag.`,
          urgency: Math.abs(delta) >= 18 ? "warning" : "info",
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

// ── Calibration wizard logic ──────────────────────────────────────────────────
export interface CalibrationSwipe {
  temp: number;
  direction: "left" | "right" | "center"; // left = too cold, right = too warm, center = just right
}

export function computeCalibrationFromSwipes(
  swipes: CalibrationSwipe[]
): Partial<UserCalibration> {
  // Left=too cold, Right=too warm, Center=just right (neutral — confirms current threshold).
  // Only left/right responses shift thresholds; center leaves them unchanged.
  const sorted = [...swipes].sort((a, b) => a.temp - b.temp);

  let shortsMin = 72;
  let lightJacketMax = 65;
  let heavyCoatMax = 45;

  for (const s of sorted) {
    if (s.direction === "center") continue;
    if (s.direction === "right" && s.temp < shortsMin) {
      shortsMin = s.temp;
    }
    if (s.direction === "left" && s.temp > lightJacketMax) {
      lightJacketMax = s.temp;
    }
    if (s.direction === "left" && s.temp < 50) {
      heavyCoatMax = s.temp - 5;
    }
  }

  return {
    shorts_min_temp: shortsMin,
    pants_max_temp: shortsMin + 3,
    light_jacket_max_temp: Math.min(lightJacketMax, shortsMin - 5),
    heavy_coat_max_temp: Math.max(heavyCoatMax, 30),
  };
}

// ── Travel packing logic ──────────────────────────────────────────────────────
export function generatePackingList(
  dailyForecasts: { feelsLikeMin: number; feelsLikeMax: number; precipProb: number; condition: string }[],
  calibration: UserCalibration
): Array<{ category: string; name: string; quantity: number; reason?: string }> {
  const items: Array<{ category: string; name: string; quantity: number; reason?: string }> = [];
  const days = dailyForecasts.length;

  const coldDays = dailyForecasts.filter((d) => d.feelsLikeMin < calibration.light_jacket_max_temp).length;
  const hotDays = dailyForecasts.filter((d) => d.feelsLikeMax >= calibration.shorts_min_temp).length;
  const rainDays = dailyForecasts.filter((d) => d.precipProb > 50).length;

  if (hotDays > 0) {
    items.push({ category: "tops", name: "T-shirts", quantity: hotDays + 1, reason: `${hotDays} warm days expected` });
    items.push({ category: "bottoms", name: "Shorts", quantity: Math.ceil(hotDays / 2) });
  }

  if (coldDays > 0) {
    items.push({ category: "outerwear", name: "Warm jacket", quantity: 1, reason: `Lows around ${Math.min(...dailyForecasts.map((d) => d.feelsLikeMin))}°F` });
  }

  if (rainDays > 0) {
    items.push({ category: "outerwear", name: "Rain jacket", quantity: 1, reason: `${rainDays} rainy day${rainDays > 1 ? "s" : ""}` });
    if (calibration.rain_tolerance === "low") {
      items.push({ category: "accessories", name: "Compact umbrella", quantity: 1 });
    }
  }

  items.push({ category: "bottoms", name: "Pants / Jeans", quantity: Math.min(days, 3) });
  items.push({ category: "footwear", name: "Comfortable walking shoes", quantity: 1 });
  if (rainDays > 0) items.push({ category: "footwear", name: "Waterproof shoes", quantity: 1 });

  return items;
}
