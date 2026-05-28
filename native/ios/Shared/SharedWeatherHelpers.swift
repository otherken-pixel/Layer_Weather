import Foundation

// MARK: - Coordinate Storage

struct LastCoordinates: Codable {
    let lat: Double
    let lon: Double

    enum CodingKeys: String, CodingKey {
        case lat, lon
        case latitude, longitude
    }

    init(lat: Double, lon: Double) {
        self.lat = lat
        self.lon = lon
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        if let lat = try c.decodeIfPresent(Double.self, forKey: .lat),
           let lon = try c.decodeIfPresent(Double.self, forKey: .lon) {
            self.lat = lat
            self.lon = lon
        } else {
            self.lat = try c.decode(Double.self, forKey: .latitude)
            self.lon = try c.decode(Double.self, forKey: .longitude)
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(lat, forKey: .lat)
        try c.encode(lon, forKey: .lon)
    }
}

// MARK: - Snapshot Freshness

func isOlderThanOneHour(_ snapshot: WidgetSnapshot?) -> Bool {
    guard let snapshot else { return true }
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    var date = formatter.date(from: snapshot.updatedAt)
    if date == nil { date = ISO8601DateFormatter().date(from: snapshot.updatedAt) }
    guard let updated = date else { return true }
    return Date().timeIntervalSince(updated) > 3300 // 55 minutes
}

// MARK: - WMO Code to Condition String

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

// MARK: - Outfit Logic

/// Matches `warmthTierFromFeelsLike` in `src/lib/widget.ts`.
func warmthTier(feelsLike: Double, precipProb: Double, weatherCode: Int) -> String {
    let isSnow = weatherCode >= 71 && weatherCode <= 77
    if isSnow { return "warmth_6_snow" }
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
