import WidgetKit
import SwiftUI

// MARK: - WeatherTimelineProvider

struct WeatherTimelineProvider: TimelineProvider {
    typealias Entry = WeatherEntry

    func placeholder(in context: Context) -> WeatherEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (WeatherEntry) -> Void) {
        if context.isPreview {
            completion(.placeholder)
            return
        }
        let data = WidgetData.load()
        completion(WeatherEntry(
            date: Date(),
            widgetData: data,
            accentColor: Color(hex: data.accentColor)
        ))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WeatherEntry>) -> Void) {
        Task {
            let data = await loadFreshWidgetData()
            let accentColor = Color(hex: data.accentColor)
            let now = Date()

            let entry = WeatherEntry(date: now, widgetData: data, accentColor: accentColor)
            let refreshDate = Calendar.current.date(byAdding: .hour, value: 1, to: now) ?? now

            var entries: [WeatherEntry] = [entry]
            if isWithinCommuteWindow(data: data, date: now) {
                let midPoint = Calendar.current.date(byAdding: .minute, value: 15, to: now) ?? now
                entries.append(WeatherEntry(date: midPoint, widgetData: data, accentColor: accentColor))
            }

            completion(Timeline(entries: entries, policy: .after(refreshDate)))
        }
    }

    // MARK: - Fresh Data Loading

    private func loadFreshWidgetData() async -> WidgetData {
        let existing = WidgetData.load()
        guard isOlderThanOneHour(existing.snapshot) else { return existing }
        do {
            let fresh = try await WidgetWeatherFetcher.fetch()
            fresh.saveToAppGroup()
            return fresh
        } catch {
            return existing
        }
    }

    private func isOlderThanOneHour(_ snapshot: WidgetSnapshot?) -> Bool {
        guard let snapshot else { return true }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: snapshot.updatedAt)
        if date == nil { date = ISO8601DateFormatter().date(from: snapshot.updatedAt) }
        guard let updated = date else { return true }
        return Date().timeIntervalSince(updated) > 3300 // 55 minutes
    }

    // MARK: - Commute Window

    private func isWithinCommuteWindow(data: WidgetData, date: Date) -> Bool {
        guard data.commuteAlert != nil else { return false }
        let hour = Calendar.current.component(.hour, from: date)
        let minute = Calendar.current.component(.minute, from: date)
        let total = hour * 60 + minute
        return (total >= 390 && total <= 570) || (total >= 990 && total <= 1170)
    }
}

// MARK: - Open-Meteo Response Models (Widget)

private struct WidgetOpenMeteoResponse: Decodable {
    let current: WidgetOMCurrent
    let hourly: WidgetOMHourly
    let daily: WidgetOMDaily
}

private struct WidgetOMCurrent: Decodable {
    let temperature2m: Double
    let apparentTemperature: Double
    let precipitationProbability: Double
    let weatherCode: Int
    let windSpeed10m: Double
    let relativeHumidity2m: Double

    enum CodingKeys: String, CodingKey {
        case temperature2m = "temperature_2m"
        case apparentTemperature = "apparent_temperature"
        case precipitationProbability = "precipitation_probability"
        case weatherCode = "weather_code"
        case windSpeed10m = "wind_speed_10m"
        case relativeHumidity2m = "relative_humidity_2m"
    }
}

private struct WidgetOMHourly: Decodable {
    let time: [String]
    let temperature2m: [Double]
    let apparentTemperature: [Double]
    let precipitationProbability: [Double]
    let weatherCode: [Int]
    let isDay: [Int]

    enum CodingKeys: String, CodingKey {
        case time
        case temperature2m = "temperature_2m"
        case apparentTemperature = "apparent_temperature"
        case precipitationProbability = "precipitation_probability"
        case weatherCode = "weather_code"
        case isDay = "is_day"
    }
}

private struct WidgetOMDaily: Decodable {
    let time: [String]
    let temperature2mMin: [Double]
    let temperature2mMax: [Double]
    let precipitationProbabilityMax: [Double]
    let weatherCode: [Int]

    enum CodingKeys: String, CodingKey {
        case time
        case temperature2mMin = "temperature_2m_min"
        case temperature2mMax = "temperature_2m_max"
        case precipitationProbabilityMax = "precipitation_probability_max"
        case weatherCode = "weather_code"
    }
}

// Coordinates stored by the main app in App Group.
private struct WidgetLastCoordinates: Codable {
    let lat: Double
    let lon: Double

    enum CodingKeys: String, CodingKey {
        case lat, lon
        case latitude, longitude
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

// MARK: - WidgetWeatherFetcher

private struct WidgetWeatherFetcher {

    static func fetch() async throws -> WidgetData {
        let coords = try loadCoords()
        let url = buildURL(lat: coords.lat, lon: coords.lon)
        let (data, response) = try await URLSession.shared.data(from: url)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        let openMeteo = try JSONDecoder().decode(WidgetOpenMeteoResponse.self, from: data)
        return parse(openMeteo, coords: coords)
    }

    // MARK: Private helpers

    private static func loadCoords() throws -> WidgetLastCoordinates {
        let defaults = UserDefaults(suiteName: AppGroupKeys.suiteName)
        guard let json = defaults?.string(forKey: AppGroupKeys.lastCoordinates),
              let data = json.data(using: .utf8) else {
            throw URLError(.cannotFindHost)
        }
        return try JSONDecoder().decode(WidgetLastCoordinates.self, from: data)
    }

    private static func buildURL(lat: Double, lon: Double) -> URL {
        var c = URLComponents(string: "https://api.open-meteo.com/v1/forecast")!
        c.queryItems = [
            URLQueryItem(name: "latitude",   value: String(format: "%.6f", lat)),
            URLQueryItem(name: "longitude",  value: String(format: "%.6f", lon)),
            URLQueryItem(name: "current",    value: "temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,relative_humidity_2m"),
            URLQueryItem(name: "hourly",     value: "temperature_2m,apparent_temperature,precipitation_probability,weather_code,is_day"),
            URLQueryItem(name: "daily",      value: "temperature_2m_min,temperature_2m_max,precipitation_probability_max,weather_code"),
            URLQueryItem(name: "temperature_unit", value: "fahrenheit"),
            URLQueryItem(name: "wind_speed_unit",  value: "mph"),
            URLQueryItem(name: "forecast_days",    value: "7"),
        ]
        return c.url!
    }

    private static func parse(_ resp: WidgetOpenMeteoResponse, coords: WidgetLastCoordinates) -> WidgetData {
        let cur = resp.current
        let condition = wmoCondition(code: cur.weatherCode)
        let hour = Calendar.current.component(.hour, from: Date())
        let isDay = hour >= 6 && hour < 20
        let tier = warmthTier(feelsLike: cur.apparentTemperature, precipProb: cur.precipitationProbability, weatherCode: cur.weatherCode)

        let snapshot = WidgetSnapshot(
            temp: cur.temperature2m,
            feelsLike: cur.apparentTemperature,
            humidity: cur.relativeHumidity2m,
            windSpeed: cur.windSpeed10m,
            precipProb: cur.precipitationProbability,
            aqiIndex: nil,
            condition: condition,
            weatherCode: cur.weatherCode,
            isDay: isDay,
            location: "\(String(format: "%.2f", coords.lat))°, \(String(format: "%.2f", coords.lon))°",
            outfitLabel: outfitLabel(feelsLike: cur.apparentTemperature, precipProb: cur.precipitationProbability),
            outfitDescription: "Based on current conditions.",
            warmthTier: tier,
            garmentTop: garmentTop(feelsLike: cur.apparentTemperature),
            garmentBottom: nil,
            umbrella: cur.precipitationProbability > 50,
            sunglasses: isDay && condition == "clear",
            scarf: cur.apparentTemperature < 45,
            gloves: cur.apparentTemperature < 35,
            beanie: cur.apparentTemperature < 32,
            rainShell: cur.precipitationProbability > 60,
            footwear: footwear(feelsLike: cur.apparentTemperature, condition: condition),
            avatarCondition: condition,
            updatedAt: ISO8601DateFormatter().string(from: Date())
        )

        let now = Date()
        let parseFormatter = DateFormatter()
        parseFormatter.locale = Locale(identifier: "en_US_POSIX")
        parseFormatter.timeZone = TimeZone(secondsFromGMT: 0)
        let isoFmt = ISO8601DateFormatter()
        isoFmt.formatOptions = [.withInternetDateTime]

        let hourly: [HourlyWidgetEntry] = zip(resp.hourly.time.indices, resp.hourly.time).compactMap { (i, timeStr) in
            parseFormatter.dateFormat = timeStr.count == 16 ? "yyyy-MM-dd'T'HH:mm" : "yyyy-MM-dd'T'HH:mm:ss"
            guard let date = parseFormatter.date(from: timeStr),
                  date >= now,
                  date <= now.addingTimeInterval(86400) else { return nil }
            let h      = Calendar.current.component(.hour, from: date)
            let temp   = i < resp.hourly.temperature2m.count ? resp.hourly.temperature2m[i] : cur.temperature2m
            let feels  = i < resp.hourly.apparentTemperature.count ? resp.hourly.apparentTemperature[i] : cur.apparentTemperature
            let precip = i < resp.hourly.precipitationProbability.count ? resp.hourly.precipitationProbability[i] : 0
            let code   = i < resp.hourly.weatherCode.count ? resp.hourly.weatherCode[i] : cur.weatherCode
            let isDayH = i < resp.hourly.isDay.count ? resp.hourly.isDay[i] != 0 : (h >= 6 && h < 20)
            return HourlyWidgetEntry(
                hour: isoFmt.string(from: date),
                temp: temp, feelsLike: feels, precipProb: precip,
                condition: wmoCondition(code: code),
                weatherCode: code, isDay: isDayH,
                warmthTier: warmthTier(feelsLike: feels, precipProb: precip, weatherCode: code)
            )
        }

        let daily: [DailyWidgetEntry] = zip(resp.daily.time.indices, resp.daily.time).compactMap { (i, dateStr) in
            guard i < resp.daily.temperature2mMin.count,
                  i < resp.daily.temperature2mMax.count,
                  i < resp.daily.weatherCode.count else { return nil }
            let precip = i < resp.daily.precipitationProbabilityMax.count ? resp.daily.precipitationProbabilityMax[i] : 0
            return DailyWidgetEntry(
                date: dateStr,
                tempMin: resp.daily.temperature2mMin[i],
                tempMax: resp.daily.temperature2mMax[i],
                precipProb: precip,
                condition: wmoCondition(code: resp.daily.weatherCode[i]),
                weatherCode: resp.daily.weatherCode[i]
            )
        }

        let existing = WidgetData.load()
        return WidgetData(
            snapshot: snapshot,
            hourly: Array(hourly.prefix(24)),
            daily: daily,
            timeline: existing.timeline,
            commuteAlert: existing.commuteAlert,
            accentColor: existing.accentColor,
            thermalSensitivity: existing.thermalSensitivity
        )
    }

    // MARK: - Outfit / condition helpers (mirrors WatchWeatherService)

    private static func wmoCondition(code: Int) -> String {
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

    private static func warmthTier(feelsLike: Double, precipProb: Double, weatherCode: Int) -> String {
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

    private static func outfitLabel(feelsLike: Double, precipProb: Double) -> String {
        if feelsLike >= 85 { return precipProb > 50 ? "Rain Tee" : "Tank Top" }
        if feelsLike >= 75 { return precipProb > 50 ? "Light Rainwear" : "T-Shirt" }
        if feelsLike >= 65 { return precipProb > 50 ? "Rain Jacket" : "Light Jacket" }
        if feelsLike >= 55 { return "Jacket" }
        if feelsLike >= 40 { return "Heavy Jacket" }
        return "Winter Coat"
    }

    private static func garmentTop(feelsLike: Double) -> String {
        if feelsLike >= 85 { return "Tank Top" }
        if feelsLike >= 75 { return "T-Shirt" }
        if feelsLike >= 65 { return "Light Jacket" }
        if feelsLike >= 55 { return "Jacket" }
        if feelsLike >= 40 { return "Heavy Jacket" }
        return "Winter Coat"
    }

    private static func footwear(feelsLike: Double, condition: String) -> String {
        let isWet = ["rain", "heavy_rain", "drizzle", "snow"].contains(condition)
        if feelsLike < 32 { return isWet ? "Winter Boots" : "Insulated Boots" }
        if feelsLike < 50 { return isWet ? "Waterproof Boots" : "Boots" }
        if isWet { return "Waterproof Sneakers" }
        if feelsLike >= 80 { return "Sandals" }
        return "Sneakers"
    }
}
