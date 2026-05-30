import { describe, it, expect } from "vitest";
import { DEFAULT_CALIBRATION } from "@/lib/outfit-logic";
import {
  buildTripDailyOutfits,
  consolidatePackingFromDailyOutfits,
  computePackingScore,
  generateTripPackingList,
  packingItemKey,
} from "@/lib/trip-packing";
import type { DailyForecast } from "@/types";

function day(
  offset: number,
  feelsLikeMin: number,
  feelsLikeMax: number,
  precipProb: number,
  condition: DailyForecast["condition"] = "clear",
): DailyForecast {
  const date = new Date("2026-06-01T12:00:00");
  date.setDate(date.getDate() + offset);
  return {
    date,
    tempMin: feelsLikeMin,
    tempMax: feelsLikeMax,
    feelsLikeMin,
    feelsLikeMax,
    precipProb,
    condition,
    weatherCode: condition === "rain" ? 61 : condition === "snow" ? 71 : 0,
    sunrise: date,
    sunset: date,
  };
}

describe("trip-packing", () => {
  it("builds one outfit per forecast day", () => {
    const forecasts = [day(0, 70, 85, 0), day(1, 68, 82, 0)];
    const daily = buildTripDailyOutfits(forecasts, DEFAULT_CALIBRATION);
    expect(daily).toHaveLength(2);
    expect(daily[0].outfit.garmentTop).toBeTruthy();
  });

  it("consolidates rain gear to one jacket", () => {
    const forecasts = [
      day(0, 55, 65, 80, "rain"),
      day(1, 54, 64, 75, "rain"),
    ];
    const { dailyOutfits } = generateTripPackingList(forecasts, DEFAULT_CALIBRATION);
    const items = consolidatePackingFromDailyOutfits(dailyOutfits);
    const rainOuter = items.filter(
      (i) => i.category === "outerwear" && i.name.toLowerCase().includes("rain"),
    );
    expect(rainOuter.length).toBeLessThanOrEqual(1);
  });

  it("reduces top count with laundry access", () => {
    const forecasts = Array.from({ length: 5 }, (_, i) => day(i, 72, 88, 0));
    const without = generateTripPackingList(forecasts, DEFAULT_CALIBRATION, { laundryAccess: false });
    const withLaundry = generateTripPackingList(forecasts, DEFAULT_CALIBRATION, { laundryAccess: true });
    const topsWithout = without.items.filter((i) => i.category === "tops").reduce((s, i) => s + i.quantity, 0);
    const topsWith = withLaundry.items.filter((i) => i.category === "tops").reduce((s, i) => s + i.quantity, 0);
    expect(topsWith).toBeLessThanOrEqual(topsWithout);
  });

  it("includes hiking boots for hiking activity", () => {
    const forecasts = [day(0, 60, 70, 10)];
    const { items } = generateTripPackingList(forecasts, DEFAULT_CALIBRATION, {
      activities: ["hiking"],
    });
    expect(items.some((i) => i.name === "Hiking boots")).toBe(true);
  });

  it("computes packing score in valid range", () => {
    const forecasts = [day(0, 65, 75, 20)];
    const { items, score } = generateTripPackingList(forecasts, DEFAULT_CALIBRATION);
    expect(score.score).toBeGreaterThanOrEqual(20);
    expect(score.score).toBeLessThanOrEqual(100);
    expect(items.length).toBeGreaterThan(0);
  });

  it("packingItemKey is stable", () => {
    expect(packingItemKey("tops", "T-shirt")).toBe("tops:T-shirt");
  });
});
