# WearToday Outfit Logic

This document describes how `src/lib/outfit-logic.ts` turns weather and user calibration into outfit recommendations, flat-lay assets, and related features.

## Pipeline overview

1. **Weather input** — Current feels-like, air temperature, humidity, wind, precip probability, WMO weather code, and optional hourly series.
2. **Adjusted thresholds** — User calibration plus thermal sensitivity shift (±3°F per step).
3. **Apparent temperature** — Optional heat index or wind chill (see below).
4. **Effective precip** — Max precip % in the next 2 hours when hourly data exists.
5. **Rain state** — Hysteresis on precip % plus WMO rain/storm codes.
6. **Warmth tier** — `resolveWarmthTier` picks a band (dry, rain, or snow).
7. **Outfit mapping** — `lookupOutfitMapping(tier, style, formality)` with fallbacks.
8. **Accessories & footwear** — Umbrella, rain shell, sunglasses, etc.
9. **Commute alert** — Optional; only when hourly data is present.

If weather cannot be loaded and no cache ≤12h is available, the app **does not** run this engine (see [Weather failure](#weather-failure)).

## Temperature bands and ordering

Constants (defaults before calibration):

| Symbol | Default | Role |
|--------|---------|------|
| `shorts_min_temp` | 72°F | Shorts / t-shirt tier (`warmth_1`) |
| `light_jacket_max_temp` | 65°F | Long sleeves & pants (`warmth_3`) |
| `heavy_coat_max_temp` | 45°F | Heavy coat tier (`warmth_6`) |
| `PANTS_SHORTSLEEVE_MIN_TEMP_F` | 68°F | Floor for short sleeves + pants (`warmth_2`) |

`computeAdjustedThresholds(calibration)` returns:

- `shorts` = `shorts_min_temp + sensitivityShift`
- `lightJacket` = `light_jacket_max_temp + sensitivityShift`
- `heavyCoat` = `heavy_coat_max_temp + sensitivityShift`
- `lightJacketFloor` = `heavyCoat + 15` (start of `warmth_4` light jacket band)
- `pantsShortsleeveMin` = min(`shorts - 1`, max(`68°F + shift`, `lightJacket + 3`))

**Ordering invariant:**  
`heavyCoat < lightJacket < pantsShortsleeveMin ≤ shorts - 1 < shorts`

Tier resolution (dry path, simplified):

- `effectiveFeelsLike ≥ shorts` → `warmth_1`
- `≥ pantsShortsleeveMin` → `warmth_2`
- `≥ lightJacket` → `warmth_3`
- `≥ lightJacketFloor` → `warmth_4`
- `≥ heavyCoat` → `warmth_5`
- else → `warmth_6`

Rain and snow branches override dry tiers when applicable.

## Apparent temperature (heat vs wind)

When `humidity_sensitivity` is enabled:

1. **Heat index** (NWS Rothfusz) if `feelsLike > 75°F` and `humidity > 40%` — uses **air temperature** and humidity.
2. **Wind chill** (NWS) only if `feelsLike < 50°F` and `windSpeed > 3 mph` — never applied at or above **50°F** feels-like (`WIND_CHILL_IGNORE_ABOVE_FEELS_F`).
3. Otherwise raw feels-like.

Heat and wind are **mutually exclusive** branches; heat is evaluated first.

User-facing copy uses raw feels-like; tier selection uses `effectiveFeelsLike`.

## Precipitation

- **Near-term:** `effectivePrecipProb` = max precip in hourly slots from 1 hour ago through 2 hours ahead; falls back to snapshot `precipProb`.
- **Default threshold:** rainy when `effectivePrecipProb > 40%` if no prior recommendation.
- **Hysteresis** (uses prior recommendation `rainGear` as `previousRainy`):
  - Was rainy → stay rainy until precip **&lt; 38%** (`PRECIP_RAIN_EXIT_PCT`)
  - Was dry → become rainy when precip **&gt; 42%** (`PRECIP_RAIN_ENTER_PCT`)
- **WMO codes** 51–82 and ≥95 force rainy regardless of hysteresis.

Heavy rain: precip &gt; 70% or weather codes 61–67.

## `OUTFIT_MAPPING` lookup

Path: `OUTFIT_MAPPING[warmthTier][style][formality]` (`all` → `neutral`).

Fallback order in `lookupOutfitMapping`:

1. Requested style + formality
2. Same style + **casual**
3. **Neutral** style + formality (then casual)
4. **Tier default** `TIER_DEFAULT_OUTFIT[tier]` with synthetic copy

Each fallback logs `console.warn` with tier, style, and formality.

### Tier default outfit types

| Tier | Default `OutfitType` |
|------|----------------------|
| warmth_1 | shorts_tshirt |
| warmth_2 | pants_shortsleeve |
| warmth_3 | pants_longsleeve |
| warmth_4 | light_jacket |
| warmth_5 | heavy_jacket |
| warmth_6 / warmth_6_snow | heavy_coat |
| warmth_1_rain | rain_light_shorts |
| warmth_2_rain | rain_light |
| warmth_3_rain | rain_heavy |

## Calibration from feedback

`computeCalibrationFromFeedback` in `src/lib/outfit-feedback.ts` adjusts thresholds from thumbs-down patterns.

**Bounds (hard limits):**

| Field | Min | Max |
|-------|-----|-----|
| shorts_min_temp | 60°F | 85°F |
| light_jacket_max_temp | 45°F | 75°F |
| heavy_coat_max_temp | 20°F | 55°F |

After each adjustment, invariants enforce `light_jacket_max < shorts - 3` and `heavy_coat_max < light_jacket - 10`.

## Weather failure

- **Cache TTL:** 12 hours (`WEATHER_CACHE_MAX_AGE_MS`) for global and per-city persisted cache.
- **Freshness for network skip:** 15 minutes in-memory per city (`useWeather`).
- **On API failure:** Try in-memory city cache → persisted city cache → global `loadWeatherCache()`. If all miss or expired:
  - Clear weather, outfit, and timeline
  - Set error: **"Unable to fetch weather data"** (when network/offline)
  - Do **not** call `getOutfitRecommendation`
- **Offline hit:** Show cached data with banner `Offline — showing weather from …`

`generatePackingList` returns `[]` when given no forecasts. `buildCommuteAlert` returns `null` when hourly series is empty.

## UI fallbacks

- **Text mode:** User preference `outfit_display_mode === "text"`, or SVG catalog error.
- **OutfitFlatLay:** Falls back to `OutfitTextView` when catalog entries for mapped SVG ids are missing.
- **StorageSvg:** Missing catalog entry or image load failure shows a generic placeholder (👕), not a blank slot.

## Related files

| File | Role |
|------|------|
| `src/lib/outfit-logic.ts` | Engine |
| `src/lib/outfit-feedback.ts` | Thumbs-down calibration |
| `src/lib/cache.ts` | 12h weather / per-city cache |
| `src/hooks/useWeather.ts` | Fetch, fallback, `previousRainy` |
| `src/components/outfit/OutfitFlatLay.tsx` | Flat lay + text fallback |
| `src/components/outfit/StorageSvg.tsx` | SVG load + placeholder |
