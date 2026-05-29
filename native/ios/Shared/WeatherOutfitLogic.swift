import Foundation

// MARK: - Snapshot freshness

/// Self-refresh cadence for the widget, watch, and complication (45 minutes).
/// Shared by every staleness check so all surfaces agree on "fresh".
let weatherFreshnessInterval: TimeInterval = 45 * 60

/// Returns true when cached snapshot data should be refreshed (older than the
/// shared freshness window).
func isOlderThanOneHour(updatedAt: String?) -> Bool {
    guard let updatedAt else { return true }
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    var date = formatter.date(from: updatedAt)
    if date == nil { date = ISO8601DateFormatter().date(from: updatedAt) }
    guard let updated = date else { return true }
    return Date().timeIntervalSince(updated) > weatherFreshnessInterval
}

// MARK: - WMO / outfit helpers (matches `src/lib/widget.ts`)

func wmoCondition(code: Int) -> String {
    switch code {
    case 0, 1: return "clear"
    case 2: return "partly_cloudy"
    case 3: return "cloudy"
    case 45, 48: return "foggy"
    case 51, 53, 55: return "drizzle"
    case 61, 63: return "rain"
    case 65, 66, 67, 80, 81, 82: return "heavy_rain"
    case 71, 73, 75, 77, 85, 86: return "snow"
    case 95, 96, 99: return "thunderstorm"
    default: return "clear"
    }
}

/// Matches `warmthTierFromFeelsLike` in `src/lib/widget.ts`.
func warmthTier(feelsLike: Double, precipProb: Double, weatherCode: Int) -> String {
    if weatherCode >= 71 && weatherCode <= 77 { return "warmth_6_snow" }
    let isRain = precipProb >= 40 || (weatherCode >= 51 && weatherCode <= 82)
    if isRain {
        if feelsLike >= 65 { return "warmth_1_rain" }
        if feelsLike >= 50 { return "warmth_2_rain" }
        return "warmth_3_rain"
    }
    if feelsLike >= 85 { return "warmth_1" }
    if feelsLike >= 75 { return "warmth_2" }
    if feelsLike >= 65 { return "warmth_3" }
    if feelsLike >= 55 { return "warmth_4" }
    if feelsLike >= 40 { return "warmth_5" }
    return "warmth_6"
}

func outfitLabel(feelsLike: Double, precipProb: Double) -> String {
    if feelsLike >= 85 { return precipProb > 50 ? "Rain Tee" : "Tank Top" }
    if feelsLike >= 75 { return precipProb > 50 ? "Light Rainwear" : "T-Shirt" }
    if feelsLike >= 65 { return precipProb > 50 ? "Rain Jacket" : "Light Jacket" }
    if feelsLike >= 55 { return "Jacket" }
    if feelsLike >= 40 { return "Heavy Jacket" }
    return "Winter Coat"
}

func garmentTop(feelsLike: Double) -> String {
    if feelsLike >= 85 { return "Tank Top" }
    if feelsLike >= 75 { return "T-Shirt" }
    if feelsLike >= 65 { return "Light Jacket" }
    if feelsLike >= 55 { return "Jacket" }
    if feelsLike >= 40 { return "Heavy Jacket" }
    return "Winter Coat"
}

func footwear(feelsLike: Double, condition: String) -> String {
    let isWet = ["rain", "heavy_rain", "drizzle", "snow"].contains(condition)
    if feelsLike < 32 { return isWet ? "Winter Boots" : "Insulated Boots" }
    if feelsLike < 50 { return isWet ? "Waterproof Boots" : "Boots" }
    if isWet { return "Waterproof Sneakers" }
    if feelsLike >= 80 { return "Sandals" }
    return "Sneakers"
}
