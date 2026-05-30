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
            let refreshDate = now.addingTimeInterval(weatherFreshnessInterval)

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
        guard isOlderThanOneHour(updatedAt: existing.snapshot?.updatedAt) else { return existing }
        do {
            let fresh = try await WidgetWeatherFetcher.fetch()
            fresh.saveToAppGroup()
            return fresh
        } catch {
            return existing
        }
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
    let sunrise: [String]
    let sunset: [String]

    enum CodingKeys: String, CodingKey {
        case time
        case temperature2mMin = "temperature_2m_min"
        case temperature2mMax = "temperature_2m_max"
        case precipitationProbabilityMax = "precipitation_probability_max"
        case weatherCode = "weather_code"
        case sunrise
        case sunset
    }
}

// MARK: - WidgetWeatherFetcher

private struct WidgetWeatherFetcher {

    /// Primary: Apple WeatherKit via the Supabase edge function (matches the app).
    /// Fallback: Open-Meteo if the edge function is unavailable.
    static func fetch() async throws -> WidgetData {
        let coords = try loadCoords()
        let existing = WidgetData.load()
        if let resp = try? await EdgeWeatherClient.fetch(coords: coords) {
            return resp.toWidgetData(coords: coords, existing: existing)
        }
        return try await fetchOpenMeteo(coords: coords)
    }

    private static func fetchOpenMeteo(coords: LastCoordinates) async throws -> WidgetData {
        let url = buildURL(lat: coords.lat, lon: coords.lon)
        let (data, response) = try await URLSession.shared.data(from: url)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        let openMeteo = try JSONDecoder().decode(WidgetOpenMeteoResponse.self, from: data)
        return parse(openMeteo, coords: coords)
    }

    // MARK: Private helpers

    private static func loadCoords() throws -> LastCoordinates {
        do {
            return try LastCoordinates.loadFromAppGroup()
        } catch LastCoordinatesError.missing {
            throw URLError(.cannotFindHost)
        }
    }

    private static func buildURL(lat: Double, lon: Double) -> URL {
        var c = URLComponents(string: "https://api.open-meteo.com/v1/forecast")!
        c.queryItems = [
            URLQueryItem(name: "latitude",   value: String(format: "%.6f", lat)),
            URLQueryItem(name: "longitude",  value: String(format: "%.6f", lon)),
            URLQueryItem(name: "current",    value: "temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,relative_humidity_2m"),
            URLQueryItem(name: "hourly",     value: "temperature_2m,apparent_temperature,precipitation_probability,weather_code,is_day"),
            URLQueryItem(name: "daily",      value: "temperature_2m_min,temperature_2m_max,precipitation_probability_max,weather_code,sunrise,sunset"),
            URLQueryItem(name: "temperature_unit", value: "fahrenheit"),
            URLQueryItem(name: "wind_speed_unit",  value: "mph"),
            URLQueryItem(name: "forecast_days",    value: "7"),
        ]
        return c.url!
    }

    private static func parse(_ resp: WidgetOpenMeteoResponse, coords: LastCoordinates) -> WidgetData {
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
            let rise = i < resp.daily.sunrise.count ? resp.daily.sunrise[i] : nil
            let set  = i < resp.daily.sunset.count  ? resp.daily.sunset[i]  : nil
            return DailyWidgetEntry(
                date: dateStr,
                tempMin: resp.daily.temperature2mMin[i],
                tempMax: resp.daily.temperature2mMax[i],
                precipProb: precip,
                condition: wmoCondition(code: resp.daily.weatherCode[i]),
                weatherCode: resp.daily.weatherCode[i],
                sunrise: rise,
                sunset: set
            )
        }

        let existing = WidgetData.load()
        return WidgetData(
            snapshot: snapshot,
            hourly: Array(hourly.prefix(24)),
            daily: daily,
            timeline: existing.timeline,
            commuteAlert: existing.commuteAlert,
            activeAlerts: existing.activeAlerts,
            accentColor: existing.accentColor,
            thermalSensitivity: existing.thermalSensitivity
        )
    }
}
