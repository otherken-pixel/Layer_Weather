import { describe, it, expect } from "vitest";
import {
  computeAdjustedThresholds,
  resolveRainFromPrecip,
  getLayerChangeDirection,
  generatePackingList,
  getOutfitRecommendation,
  resolveFootwear,
  DEFAULT_CALIBRATION,
} from "@/lib/outfit-logic";

// ── computeAdjustedThresholds ─────────────────────────────────────────────────

describe("computeAdjustedThresholds", () => {
  it("shifts bands with thermal sensitivity", () => {
    const cold = computeAdjustedThresholds({
      ...DEFAULT_CALIBRATION,
      user_id: "x",
      thermal_sensitivity: -2,
    });
    const hot = computeAdjustedThresholds({
      ...DEFAULT_CALIBRATION,
      user_id: "x",
      thermal_sensitivity: 2,
    });
    expect(cold.shorts).not.toBe(hot.shorts);
    expect(cold.sensitivityShift).toBe(-6);
    expect(hot.sensitivityShift).toBe(6);
  });

  it("lightJacketFloor equals heavyCoat + 15", () => {
    const t = computeAdjustedThresholds(DEFAULT_CALIBRATION);
    expect(t.lightJacketFloor).toBe(t.heavyCoat + 15);
  });

  it("pantsShortsleeveMin is below shorts threshold", () => {
    const t = computeAdjustedThresholds(DEFAULT_CALIBRATION);
    expect(t.pantsShortsleeveMin).toBeLessThan(t.shorts);
  });
});

// ── resolveRainFromPrecip ─────────────────────────────────────────────────────

describe("resolveRainFromPrecip", () => {
  it("uses hysteresis when prior state is known", () => {
    expect(resolveRainFromPrecip(39, 0, true).isRainy).toBe(true);
    expect(resolveRainFromPrecip(39, 0, false).isRainy).toBe(false);
  });

  it("forces rain when WMO code is rainy", () => {
    expect(resolveRainFromPrecip(10, 61, false).isRainy).toBe(true);
  });

  it("treats code 51 (drizzle) as rainy", () => {
    expect(resolveRainFromPrecip(5, 51, null).isRainy).toBe(true);
  });

  it("treats code 95 (thunderstorm) as rainy", () => {
    expect(resolveRainFromPrecip(5, 95, null).isRainy).toBe(true);
  });

  it("marks heavy rain when precipProb > 70", () => {
    expect(resolveRainFromPrecip(80, 0, null).isHeavyRain).toBe(true);
  });

  it("marks heavy rain for WMO 61-67 regardless of precipProb", () => {
    expect(resolveRainFromPrecip(10, 65, null).isHeavyRain).toBe(true);
  });
});

// ── getLayerChangeDirection ───────────────────────────────────────────────────

describe("getLayerChangeDirection", () => {
  it("detects layering up", () => {
    expect(getLayerChangeDirection("shorts_tshirt", "light_jacket")).toBe("layer up");
  });

  it("detects layering down", () => {
    expect(getLayerChangeDirection("heavy_coat", "pants_longsleeve")).toBe("layer down");
  });

  it("returns null when warmth is equal", () => {
    expect(getLayerChangeDirection("shorts_tshirt", "shorts_tshirt")).toBeNull();
    // rain_light and light_jacket have same warmth value
    expect(getLayerChangeDirection("rain_light", "light_jacket")).toBeNull();
  });
});

// ── getOutfitRecommendation — warmth tiers ────────────────────────────────────

const BASE_HOURLY = [] as import("@/types").HourlyForecast[];

describe("getOutfitRecommendation — warmth tiers", () => {
  it("returns warmth_1 (shorts) for very hot weather", () => {
    const rec = getOutfitRecommendation({
      feelsLike: 90, weatherCode: 0, windSpeed: 5, precipProb: 0,
      humidity: 50, calibration: DEFAULT_CALIBRATION, hourly: BASE_HOURLY,
    });
    expect(rec.warmthTier).toBe("warmth_1");
  });

  it("returns warmth_2 (short-sleeve + pants) for warm weather", () => {
    const rec = getOutfitRecommendation({
      feelsLike: 70, weatherCode: 0, windSpeed: 5, precipProb: 0,
      humidity: 50, calibration: DEFAULT_CALIBRATION, hourly: BASE_HOURLY,
    });
    expect(rec.warmthTier).toBe("warmth_2");
  });

  it("returns warmth_3 (long-sleeve) for mild weather", () => {
    const rec = getOutfitRecommendation({
      feelsLike: 65, weatherCode: 0, windSpeed: 5, precipProb: 0,
      humidity: 50, calibration: DEFAULT_CALIBRATION, hourly: BASE_HOURLY,
    });
    expect(rec.warmthTier).toBe("warmth_3");
  });

  it("returns warmth_4 (light jacket) for cool weather", () => {
    const rec = getOutfitRecommendation({
      feelsLike: 62, weatherCode: 0, windSpeed: 5, precipProb: 0,
      humidity: 50, calibration: DEFAULT_CALIBRATION, hourly: BASE_HOURLY,
    });
    expect(rec.warmthTier).toBe("warmth_4");
  });

  it("returns warmth_5 (heavy jacket) for cold weather", () => {
    const rec = getOutfitRecommendation({
      feelsLike: 50, weatherCode: 0, windSpeed: 5, precipProb: 0,
      humidity: 50, calibration: DEFAULT_CALIBRATION, hourly: BASE_HOURLY,
    });
    expect(rec.warmthTier).toBe("warmth_5");
  });

  it("returns warmth_6 (heavy coat) for very cold weather", () => {
    const rec = getOutfitRecommendation({
      feelsLike: 30, weatherCode: 0, windSpeed: 5, precipProb: 0,
      humidity: 50, calibration: DEFAULT_CALIBRATION, hourly: BASE_HOURLY,
    });
    expect(rec.warmthTier).toBe("warmth_6");
  });

  it("returns warmth_6_snow for WMO snow codes 71-77", () => {
    for (const code of [71, 73, 75, 77]) {
      const rec = getOutfitRecommendation({
        feelsLike: 32, weatherCode: code, windSpeed: 5, precipProb: 80,
        humidity: 90, calibration: DEFAULT_CALIBRATION, hourly: BASE_HOURLY,
      });
      expect(rec.warmthTier).toBe("warmth_6_snow");
    }
  });

  it("returns warmth_6_snow for WMO snow shower codes 85 and 86", () => {
    for (const code of [85, 86]) {
      const rec = getOutfitRecommendation({
        feelsLike: 30, weatherCode: code, windSpeed: 5, precipProb: 70,
        humidity: 90, calibration: DEFAULT_CALIBRATION, hourly: BASE_HOURLY,
      });
      expect(rec.warmthTier).toBe("warmth_6_snow");
    }
  });

  it("returns warmth_1_rain for warm drizzle (light rain, high temp)", () => {
    // WMO 51 = drizzle (rainy code), precipProb 45% = light (not heavy), feelsLike 75 >= shorts threshold 72
    const rec = getOutfitRecommendation({
      feelsLike: 75, weatherCode: 51, windSpeed: 5, precipProb: 45,
      humidity: 85, calibration: DEFAULT_CALIBRATION, hourly: BASE_HOURLY,
    });
    expect(rec.warmthTier).toBe("warmth_1_rain");
  });

  it("returns warmth_2_rain for cool light rain", () => {
    const rec = getOutfitRecommendation({
      feelsLike: 58, weatherCode: 51, windSpeed: 5, precipProb: 60,
      humidity: 85, calibration: DEFAULT_CALIBRATION, hourly: BASE_HOURLY,
    });
    expect(rec.warmthTier).toBe("warmth_2_rain");
  });

  it("returns warmth_3_rain for heavy rain regardless of temperature", () => {
    const rec = getOutfitRecommendation({
      feelsLike: 40, weatherCode: 65, windSpeed: 5, precipProb: 90,
      humidity: 95, calibration: DEFAULT_CALIBRATION, hourly: BASE_HOURLY,
    });
    expect(rec.warmthTier).toBe("warmth_3_rain");
  });

  it("high rain tolerance uses dry tiers for light rain", () => {
    const cal = { ...DEFAULT_CALIBRATION, rain_tolerance: "high" as const };
    const rec = getOutfitRecommendation({
      feelsLike: 60, weatherCode: 51, windSpeed: 5, precipProb: 45,
      humidity: 70, calibration: cal, hourly: BASE_HOURLY,
    });
    // Should not be a rain tier for light rain with high tolerance
    expect(rec.warmthTier).not.toContain("rain");
  });

  it("high rain tolerance still uses warmth_3_rain for heavy rain", () => {
    const cal = { ...DEFAULT_CALIBRATION, rain_tolerance: "high" as const };
    const rec = getOutfitRecommendation({
      feelsLike: 60, weatherCode: 65, windSpeed: 5, precipProb: 90,
      humidity: 95, calibration: cal, hourly: BASE_HOURLY,
    });
    expect(rec.warmthTier).toBe("warmth_3_rain");
  });
});

// ── getOutfitRecommendation — accessories ─────────────────────────────────────

describe("getOutfitRecommendation — accessories", () => {
  it("never suggests sunglasses when raining", () => {
    const rec = getOutfitRecommendation({
      feelsLike: 75, weatherCode: 61, windSpeed: 5, precipProb: 80,
      humidity: 85, calibration: DEFAULT_CALIBRATION, hourly: BASE_HOURLY, isDay: true,
    });
    expect(rec.sunglasses).toBe(false);
  });

  it("suggests sunglasses on clear warm day", () => {
    const rec = getOutfitRecommendation({
      feelsLike: 80, weatherCode: 0, windSpeed: 5, precipProb: 0,
      humidity: 40, calibration: DEFAULT_CALIBRATION, hourly: BASE_HOURLY, isDay: true,
    });
    expect(rec.sunglasses).toBe(true);
  });

  it("suggests scarf when feels-like is below 35°F", () => {
    const rec = getOutfitRecommendation({
      feelsLike: 30, weatherCode: 0, windSpeed: 5, precipProb: 0,
      humidity: 50, calibration: DEFAULT_CALIBRATION, hourly: BASE_HOURLY,
    });
    expect(rec.scarf).toBe(true);
  });

  it("suggests beanie and gloves in snow", () => {
    const rec = getOutfitRecommendation({
      feelsLike: 25, weatherCode: 71, windSpeed: 5, precipProb: 80,
      humidity: 90, calibration: DEFAULT_CALIBRATION, hourly: BASE_HOURLY,
    });
    expect(rec.beanie).toBe(true);
    expect(rec.gloves).toBe(true);
  });
});

// ── resolveFootwear ───────────────────────────────────────────────────────────

describe("resolveFootwear", () => {
  it("returns flip_flops in very hot dry weather", () => {
    expect(resolveFootwear({
      effectiveFeelsLike: 88, isRainy: false, isHeavyRain: false,
      isSnowy: false, outfit: "shorts_tshirt",
    })).toBe("flip_flops");
  });

  it("returns rain_boots in heavy cold rain for non-business", () => {
    expect(resolveFootwear({
      effectiveFeelsLike: 45, isRainy: true, isHeavyRain: true,
      isSnowy: false, outfit: "rain_heavy", rainTolerance: "moderate",
    })).toBe("rain_boots");
  });

  it("returns snow_boots below 50°F when not raining", () => {
    expect(resolveFootwear({
      effectiveFeelsLike: 35, isRainy: false, isHeavyRain: false,
      isSnowy: false, outfit: "heavy_coat",
    })).toBe("snow_boots");
  });

  it("returns sneakers in warm light rain", () => {
    expect(resolveFootwear({
      effectiveFeelsLike: 72, isRainy: true, isHeavyRain: false,
      isSnowy: false, outfit: "rain_light_shorts", rainTolerance: "high",
    })).toBe("sneakers");
  });

  it("returns loafers for business formality in warm weather", () => {
    expect(resolveFootwear({
      effectiveFeelsLike: 70, isRainy: false, isHeavyRain: false,
      isSnowy: false, outfit: "light_jacket", formality: "business", style: "masculine",
    })).toBe("loafers");
  });

  it("returns dress_flats for business feminine formality in warm weather", () => {
    expect(resolveFootwear({
      effectiveFeelsLike: 70, isRainy: false, isHeavyRain: false,
      isSnowy: false, outfit: "light_jacket", formality: "business", style: "feminine",
    })).toBe("dress_flats");
  });
});

// ── generatePackingList ───────────────────────────────────────────────────────

describe("generatePackingList", () => {
  it("uses adjusted thresholds for hot days", () => {
    const cal = {
      ...DEFAULT_CALIBRATION,
      user_id: "u",
      thermal_sensitivity: -2 as const,
      shorts_min_temp: 72,
    };
    const items = generatePackingList(
      [{ feelsLikeMin: 80, feelsLikeMax: 90, precipProb: 0, condition: "clear" }],
      cal,
    );
    expect(items.some((i) => i.name === "T-shirts")).toBe(true);
  });

  it("includes rain jacket and rain boots for rainy trip", () => {
    const items = generatePackingList(
      [{ feelsLikeMin: 55, feelsLikeMax: 65, precipProb: 80, condition: "rain" }],
      DEFAULT_CALIBRATION,
    );
    expect(items.some((i) => i.name === "Rain jacket")).toBe(true);
    expect(items.some((i) => i.name === "Rain boots")).toBe(true);
  });

  it("includes snow boots for cold/snowy days", () => {
    const items = generatePackingList(
      [{ feelsLikeMin: 20, feelsLikeMax: 35, precipProb: 10, condition: "snow" }],
      DEFAULT_CALIBRATION,
    );
    expect(items.some((i) => i.name === "Snow boots")).toBe(true);
  });

  it("returns empty list for empty forecast", () => {
    expect(generatePackingList([], DEFAULT_CALIBRATION)).toHaveLength(0);
  });
});
