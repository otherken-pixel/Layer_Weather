import Foundation
import SwiftUI

// MARK: - Coordinate Storage

struct LastCoordinates: Codable {
    let lat: Double
    let lon: Double
}

// MARK: - Open-Meteo Response Models

private struct OpenMeteoResponse: Decodable {
    let current: CurrentWeather
    let hourly: HourlyWeather
}

private struct CurrentWeather: Decodable {
    let time: String
    let temperature2m: Double
    let apparentTemperature: Double
    let precipitationProbability: Double
    let weatherCode: Int
    let windSpeed10m: Double
    let relativeHumidity2m: Double

    enum CodingKeys: String, CodingKey {
        case time
        case temperature2m = "temperature_2m"
        case apparentTemperature = "apparent_temperature"
        case precipitationProbability = "precipitation_probability"
        case weatherCode = "weather_code"
        case windSpeed10m = "wind_speed_10m"
        case relativeHumidity2m = "relative_humidity_2m"
    }
}

private struct HourlyWeather: Decodable {
    let time: [String]
    let temperature2m: [Double]
    let apparentTemperature: [Double]
    let precipitationProbability: [Double]
    let weatherCode: [Int]

    enum CodingKeys: String, CodingKey {
        case time
        case temperature2m = "temperature_2m"
        case apparentTemperature = "apparent_temperature"
        case precipitationProbability = "precipitation_probability"
        case weatherCode = "weather_code"
    }
}

// MARK: - WatchWeatherService

final class WatchWeatherService {

    // MARK: Singleton

    static let shared = WatchWeatherService()
    private init() {}

    // MARK: - Fetch Weather

    /// Fetches current + hourly weather from Open-Meteo using saved coordinates.
    /// Returns an updated WidgetData on success.
    func fetchWeather() async throws -> WidgetData {
        let coords = try loadCoordinates()
        let url = buildURL(lat: coords.lat, lon: coords.lon)

        let (data, response) = try await URLSession.shared.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              (200..<300).contains(httpResponse.statusCode) else {
            throw WeatherServiceError.invalidResponse
        }

        let openMeteo = try JSONDecoder().decode(OpenMeteoResponse.self, from: data)
        return parseResponse(openMeteo, coordinates: coords)
    }

    // MARK: - Coordinate Loading

    private func loadCoordinates() throws -> LastCoordinates {
        let defaults = UserDefaults(suiteName: AppGroupKeys.suiteName)
        guard let data = defaults?.data(forKey: AppGroupKeys.lastCoordinates) else {
            throw WeatherServiceError.noCoordinates
        }
        return try JSONDecoder().decode(LastCoordinates.self, from: data)
    }

    // MARK: - URL Builder

    private func buildURL(lat: Double, lon: Double) -> URL {
        var components = URLComponents(string: "https://api.open-meteo.com/v1/forecast")!
        components.queryItems = [
            URLQueryItem(name: "latitude", value: String(format: "%.6f", lat)),
            URLQueryItem(name: "longitude", value: String(format: "%.6f", lon)),
            URLQueryItem(name: "current", value: [
                "temperature_2m",
                "apparent_temperature",
                "precipitation_probability",
                "weather_code",
                "wind_speed_10m",
                "relative_humidity_2m"
            ].joined(separator: ",")),
            URLQueryItem(name: "hourly", value: [
                "temperature_2m",
                "apparent_temperature",
                "precipitation_probability",
                "weather_code"
            ].joined(separator: ",")),
            URLQueryItem(name: "temperature_unit", value: "fahrenheit"),
            URLQueryItem(name: "wind_speed_unit", value: "mph"),
            URLQueryItem(name: "forecast_days", value: "1")
        ]
        return components.url!
    }

    // MARK: - Response Parsing

    private func parseResponse(_ response: OpenMeteoResponse, coordinates: LastCoordinates) -> WidgetData {
        let current = response.current
        let hourly = response.hourly

        let condition = wmoCondition(code: current.weatherCode)
        let currentHour = Calendar.current.component(.hour, from: Date())
        let isDay = currentHour >= 6 && currentHour < 20

        // Build a partial snapshot using current conditions
        let snapshot = WidgetSnapshot(
            temp: current.temperature2m,
            feelsLike: current.apparentTemperature,
            humidity: current.relativeHumidity2m,
            windSpeed: current.windSpeed10m,
            precipProb: current.precipitationProbability,
            aqiIndex: nil,
            condition: condition,
            weatherCode: current.weatherCode,
            isDay: isDay,
            location: "\(String(format: "%.2f", coordinates.lat))°, \(String(format: "%.2f", coordinates.lon))°",
            outfitLabel: outfitLabel(feelsLike: current.apparentTemperature, precipProb: current.precipitationProbability),
            outfitDescription: "Based on current conditions.",
            warmthTier: warmthTier(
                feelsLike: current.apparentTemperature,
                precipProb: current.precipitationProbability,
                weatherCode: current.weatherCode
            ),
            garmentTop: garmentTop(feelsLike: current.apparentTemperature),
            garmentBottom: nil,
            umbrella: current.precipitationProbability > 50,
            sunglasses: isDay && condition == "clear",
            scarf: current.apparentTemperature < 45,
            gloves: current.apparentTemperature < 35,
            beanie: current.apparentTemperature < 32,
            rainShell: current.precipitationProbability > 60,
            footwear: footwear(feelsLike: current.apparentTemperature, condition: condition),
            avatarCondition: condition,
            updatedAt: ISO8601DateFormatter().string(from: Date())
        )

        // Build hourly entries (next 24 hours)
        let now = Date()
        let hourlyEntries: [HourlyWidgetEntry] = zip(hourly.time.indices, hourly.time).compactMap { (index, timeStr) in
            let parseFormatter = DateFormatter()
            parseFormatter.locale = Locale(identifier: "en_US_POSIX")
            parseFormatter.timeZone = TimeZone(secondsFromGMT: 0)
            parseFormatter.dateFormat = timeStr.count == 16 ? "yyyy-MM-dd'T'HH:mm" : "yyyy-MM-dd'T'HH:mm:ss"
            guard let date = parseFormatter.date(from: timeStr),
                  date >= now,
                  date <= now.addingTimeInterval(86400) else { return nil }

            let h = Calendar.current.component(.hour, from: date)
            let tempVal = index < hourly.temperature2m.count ? hourly.temperature2m[index] : current.temperature2m
            let feelsVal = index < hourly.apparentTemperature.count ? hourly.apparentTemperature[index] : current.apparentTemperature
            let precipVal = index < hourly.precipitationProbability.count ? hourly.precipitationProbability[index] : 0
            let codeVal = index < hourly.weatherCode.count ? hourly.weatherCode[index] : current.weatherCode
            let cond = wmoCondition(code: codeVal)

            let isoFormatter = ISO8601DateFormatter()
            isoFormatter.formatOptions = [.withInternetDateTime]
            return HourlyWidgetEntry(
                hour: isoFormatter.string(from: date),
                temp: tempVal,
                feelsLike: feelsVal,
                precipProb: precipVal,
                condition: cond,
                weatherCode: codeVal,
                isDay: h >= 6 && h < 20,
                warmthTier: warmthTier(feelsLike: feelsVal, precipProb: precipVal, weatherCode: codeVal)
            )
        }

        // Load existing daily/timeline/commute from App Group (not fetched here)
        let existingData = WidgetData.load()

        return WidgetData(
            snapshot: snapshot,
            hourly: Array(hourlyEntries.prefix(24)),
            daily: existingData.daily,
            timeline: existingData.timeline,
            commuteAlert: existingData.commuteAlert,
            accentColor: existingData.accentColor,
            thermalSensitivity: existingData.thermalSensitivity
        )
    }

    // MARK: - WMO Code to Condition String

    private func wmoCondition(code: Int) -> String {
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

    // MARK: - Simple Outfit Logic (Watch fallback)

    /// Matches `warmthTierFromFeelsLike` in `src/lib/widget.ts`.
    private func warmthTier(feelsLike: Double, precipProb: Double, weatherCode: Int) -> String {
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

    private func outfitLabel(feelsLike: Double, precipProb: Double) -> String {
        if feelsLike >= 85 { return precipProb > 50 ? "Rain Tee" : "Tank Top" }
        if feelsLike >= 75 { return precipProb > 50 ? "Light Rainwear" : "T-Shirt" }
        if feelsLike >= 65 { return precipProb > 50 ? "Rain Jacket" : "Light Jacket" }
        if feelsLike >= 55 { return "Jacket" }
        if feelsLike >= 40 { return "Heavy Jacket" }
        return "Winter Coat"
    }

    private func garmentTop(feelsLike: Double) -> String {
        if feelsLike >= 85 { return "Tank Top" }
        if feelsLike >= 75 { return "T-Shirt" }
        if feelsLike >= 65 { return "Light Jacket" }
        if feelsLike >= 55 { return "Jacket" }
        if feelsLike >= 40 { return "Heavy Jacket" }
        return "Winter Coat"
    }

    private func footwear(feelsLike: Double, condition: String) -> String {
        let isWet = ["rain", "heavy_rain", "drizzle", "snow"].contains(condition)
        if feelsLike < 32 { return isWet ? "Winter Boots" : "Insulated Boots" }
        if feelsLike < 50 { return isWet ? "Waterproof Boots" : "Boots" }
        if isWet { return "Waterproof Sneakers" }
        if feelsLike >= 80 { return "Sandals" }
        return "Sneakers"
    }
}

// MARK: - Errors

enum WeatherServiceError: LocalizedError {
    case noCoordinates
    case invalidResponse
    case decodingFailed(Error)

    var errorDescription: String? {
        switch self {
        case .noCoordinates: return "No saved location. Open Layer Weather on your phone first."
        case .invalidResponse: return "Weather service returned an unexpected response."
        case .decodingFailed(let error): return "Failed to parse weather data: \(error.localizedDescription)"
        }
    }
}
