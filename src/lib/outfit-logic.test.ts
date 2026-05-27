import { describe, it, expect } from "vitest";
import {
  computeAdjustedThresholds,
  resolveRainFromPrecip,
  getLayerChangeDirection,
  generatePackingList,
  DEFAULT_CALIBRATION,
} from "@/lib/outfit-logic";

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
});

describe("resolveRainFromPrecip", () => {
  it("uses hysteresis when prior state is known", () => {
    expect(resolveRainFromPrecip(39, 0, true).isRainy).toBe(true);
    expect(resolveRainFromPrecip(39, 0, false).isRainy).toBe(false);
  });

  it("forces rain when WMO code is rainy", () => {
    expect(resolveRainFromPrecip(10, 61, false).isRainy).toBe(true);
  });
});

describe("getLayerChangeDirection", () => {
  it("detects layering up", () => {
    expect(getLayerChangeDirection("shorts_tshirt", "light_jacket")).toBe("layer up");
  });
});

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
});
