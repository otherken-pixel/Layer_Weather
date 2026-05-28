import Foundation

/// Coordinates stored by the main app in the App Group (`widget_last_coordinates`).
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

    static func loadFromAppGroup() throws -> LastCoordinates {
        let defaults = UserDefaults(suiteName: AppGroupKeys.suiteName)
        guard let json = defaults?.string(forKey: AppGroupKeys.lastCoordinates),
              let data = json.data(using: .utf8) else {
            throw LastCoordinatesError.missing
        }
        return try JSONDecoder().decode(LastCoordinates.self, from: data)
    }
}

enum LastCoordinatesError: Error {
    case missing
}
