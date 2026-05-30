import Foundation

// MARK: - Supabase weather edge-function client (WeatherKit-backed)
//
// The main app fetches weather from Apple WeatherKit via the Supabase `weather`
// edge function. The widget, watch app, and complication previously hit
// Open-Meteo directly, which returns a *different* model than the app — so the
// numbers never matched. To keep every surface identical, the extensions now
// call the same edge function (single source of truth, same condition mapping)
// and fall back to Open-Meteo only when the edge function is unavailable.

enum WeatherSourceError: Error {
    case missingConfig
    case badResponse
    case decodeFailed
}

/// Supabase URL + anon key the main app mirrors into the App Group so the
/// extensions can reach the `weather` edge function without the JS bundle.
struct SupabaseConfig {
    let url: String
    let anonKey: String

    static func load() throws -> SupabaseConfig {
        let defaults = UserDefaults(suiteName: AppGroupKeys.suiteName)
        guard let url = defaults?.string(forKey: AppGroupKeys.supabaseURL),
              let key = defaults?.string(forKey: AppGroupKeys.supabaseAnonKey),
              !url.isEmpty, !key.isEmpty else {
            throw WeatherSourceError.missingConfig
        }
        return SupabaseConfig(url: url, anonKey: key)
    }
}

// MARK: - Edge function response (mirrors supabase/functions/weather/index.ts)

struct EdgeWeatherResponse: Decodable {
    let current: EdgeCurrent
    let hourly: [EdgeHourly]
    let daily: [EdgeDaily]
}

struct EdgeCurrent: Decodable {
    let temp: Double
    let feelsLike: Double
    let humidity: Double
    let windSpeed: Double
    let precipProb: Double
    let condition: String
    let weatherCode: Int
    let isDay: Bool
}

struct EdgeHourly: Decodable {
    let time: String
    let temp: Double
    let feelsLike: Double
    let precipProb: Double
    let condition: String
    let weatherCode: Int
    let isDay: Bool
}

struct EdgeDaily: Decodable {
    let date: String
    let tempMin: Double
    let tempMax: Double
    let precipProb: Double
    let condition: String
    let weatherCode: Int
    let sunrise: String?
    let sunset: String?
}

// MARK: - Client

enum EdgeWeatherClient {

    /// POSTs the saved coordinates to the Supabase `weather` edge function
    /// (verify_jwt = false, so the anon key is sufficient).
    static func fetch(coords: LastCoordinates) async throws -> EdgeWeatherResponse {
        let config = try SupabaseConfig.load()
        let base = config.url.hasSuffix("/") ? String(config.url.dropLast()) : config.url
        guard let url = URL(string: "\(base)/functions/v1/weather") else {
            throw WeatherSourceError.missingConfig
        }

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.timeoutInterval = 12
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(config.anonKey)", forHTTPHeaderField: "Authorization")

        let body: [String: Any] = [
            "lat": coords.lat,
            "lon": coords.lon,
            "timezone": TimeZone.current.identifier,
            "countryCode": Locale.current.region?.identifier ?? "US",
        ]
        req.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw WeatherSourceError.badResponse
        }
        do {
            return try JSONDecoder().decode(EdgeWeatherResponse.self, from: data)
        } catch {
            throw WeatherSourceError.decodeFailed
        }
    }
}

// MARK: - ISO8601 parsing (WeatherKit timestamps, e.g. "2025-05-29T14:00:00Z")

func parseEdgeDate(_ str: String) -> Date? {
    let iso = ISO8601DateFormatter()
    iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let d = iso.date(from: str) { return d }
    return ISO8601DateFormatter().date(from: str)
}

// MARK: - Mapping into the shared WidgetData model

extension EdgeWeatherResponse {

    /// Builds a `WidgetData` from the edge response, reusing the same outfit
    /// helpers as the Open-Meteo path and preserving app-computed
    /// timeline/commute/accent/thermal values from the existing cache.
    func toWidgetData(coords: LastCoordinates, existing: WidgetData) -> WidgetData {
        let cur = current
        let tier = warmthTier(
            feelsLike: cur.feelsLike,
            precipProb: cur.precipProb,
            weatherCode: cur.weatherCode
        )

        let fallbackLocation = "\(String(format: "%.2f", coords.lat))°, \(String(format: "%.2f", coords.lon))°"
        let snapshot = WidgetSnapshot(
            temp: cur.temp,
            feelsLike: cur.feelsLike,
            humidity: cur.humidity,
            windSpeed: cur.windSpeed,
            precipProb: cur.precipProb,
            aqiIndex: existing.snapshot?.aqiIndex,
            condition: cur.condition,
            weatherCode: cur.weatherCode,
            isDay: cur.isDay,
            location: existing.snapshot?.location ?? fallbackLocation,
            outfitLabel: outfitLabel(feelsLike: cur.feelsLike, precipProb: cur.precipProb),
            outfitDescription: "Based on current conditions.",
            warmthTier: tier,
            garmentTop: garmentTop(feelsLike: cur.feelsLike),
            garmentBottom: nil,
            umbrella: cur.precipProb > 50,
            sunglasses: cur.isDay && cur.condition == "clear",
            scarf: cur.feelsLike < 45,
            gloves: cur.feelsLike < 35,
            beanie: cur.feelsLike < 32,
            rainShell: cur.precipProb > 60,
            footwear: footwear(feelsLike: cur.feelsLike, condition: cur.condition),
            avatarCondition: cur.condition,
            updatedAt: ISO8601DateFormatter().string(from: Date())
        )

        let now = Date()
        let hourlyEntries: [HourlyWidgetEntry] = hourly.compactMap { h in
            guard let date = parseEdgeDate(h.time),
                  date >= now.addingTimeInterval(-3600),
                  date <= now.addingTimeInterval(86400) else { return nil }
            return HourlyWidgetEntry(
                hour: h.time,
                temp: h.temp,
                feelsLike: h.feelsLike,
                precipProb: h.precipProb,
                condition: h.condition,
                weatherCode: h.weatherCode,
                isDay: h.isDay,
                warmthTier: warmthTier(feelsLike: h.feelsLike, precipProb: h.precipProb, weatherCode: h.weatherCode)
            )
        }

        let dailyEntries: [DailyWidgetEntry] = daily.map { d in
            DailyWidgetEntry(
                date: d.date,
                tempMin: d.tempMin,
                tempMax: d.tempMax,
                precipProb: d.precipProb,
                condition: d.condition,
                weatherCode: d.weatherCode,
                sunrise: d.sunrise,
                sunset: d.sunset
            )
        }

        return WidgetData(
            snapshot: snapshot,
            hourly: Array(hourlyEntries.prefix(24)),
            daily: Array(dailyEntries.prefix(7)),
            timeline: existing.timeline,
            commuteAlert: existing.commuteAlert,
            activeAlerts: existing.activeAlerts,
            accentColor: existing.accentColor,
            thermalSensitivity: existing.thermalSensitivity
        )
    }
}
