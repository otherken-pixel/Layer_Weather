import WidgetKit
import SwiftUI

// MARK: - Watch Timeline Provider

struct WatchTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> WeatherEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (WeatherEntry) -> Void) {
        if context.isPreview {
            completion(.placeholder)
            return
        }
        let data = WidgetData.load()
        completion(WeatherEntry(date: Date(), widgetData: data, accentColor: Color(hex: data.accentColor)))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WeatherEntry>) -> Void) {
        Task {
            let data = await loadFreshData()
            let entry = WeatherEntry(date: Date(), widgetData: data, accentColor: Color(hex: data.accentColor))
            let refresh = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
            completion(Timeline(entries: [entry], policy: .after(refresh)))
        }
    }

    private func loadFreshData() async -> WidgetData {
        let existing = WidgetData.load()
        guard isOlderThanOneHour(existing.snapshot) else { return existing }
        do {
            let fresh = try await ComplicationWeatherFetcher.fetch()
            fresh.persistToAppGroup()
            return fresh
        } catch {
            return existing
        }
    }

}

// MARK: - Complication Weather Fetcher

private struct ComplicationOMResponse: Decodable {
    let current: ComplicationOMCurrent
}

private struct ComplicationOMCurrent: Decodable {
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

private struct ComplicationWeatherFetcher {

    static func fetch() async throws -> WidgetData {
        let coords = try loadCoords()
        let url = buildURL(lat: coords.lat, lon: coords.lon)
        let (data, response) = try await URLSession.shared.data(from: url)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        let resp = try JSONDecoder().decode(ComplicationOMResponse.self, from: data)
        return buildWidgetData(from: resp.current, coords: coords)
    }

    private static func loadCoords() throws -> LastCoordinates {
        let defaults = UserDefaults(suiteName: AppGroupKeys.suiteName)
        guard let json = defaults?.string(forKey: AppGroupKeys.lastCoordinates),
              let data = json.data(using: .utf8) else {
            throw URLError(.cannotFindHost)
        }
        return try JSONDecoder().decode(LastCoordinates.self, from: data)
    }

    private static func buildURL(lat: Double, lon: Double) -> URL {
        var c = URLComponents(string: "https://api.open-meteo.com/v1/forecast")!
        c.queryItems = [
            URLQueryItem(name: "latitude",   value: String(format: "%.6f", lat)),
            URLQueryItem(name: "longitude",  value: String(format: "%.6f", lon)),
            URLQueryItem(name: "current",    value: "temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,relative_humidity_2m"),
            URLQueryItem(name: "temperature_unit", value: "fahrenheit"),
            URLQueryItem(name: "wind_speed_unit",  value: "mph"),
        ]
        return c.url!
    }

    private static func buildWidgetData(from cur: ComplicationOMCurrent, coords: LastCoordinates) -> WidgetData {
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

        let existing = WidgetData.load()
        return WidgetData(
            snapshot: snapshot,
            hourly: existing.hourly,
            daily: existing.daily,
            timeline: existing.timeline,
            commuteAlert: existing.commuteAlert,
            accentColor: existing.accentColor,
            thermalSensitivity: existing.thermalSensitivity
        )
    }
}

// MARK: - WeatherEntry

struct WeatherEntry: TimelineEntry {
    let date: Date
    let widgetData: WidgetData
    let accentColor: Color

    static var placeholder: WeatherEntry {
        WeatherEntry(date: Date(), widgetData: .placeholder, accentColor: Color(hex: "#4F8EF7"))
    }
}

// MARK: - Shared SF Symbol helper

private func wSymbol(_ condition: String, isDay: Bool) -> String {
    switch condition {
    case "clear":         return isDay ? "sun.max.fill" : "moon.stars.fill"
    case "partly_cloudy": return isDay ? "cloud.sun.fill" : "cloud.moon.fill"
    case "cloudy":        return "cloud.fill"
    case "foggy":         return "cloud.fog.fill"
    case "drizzle":       return "cloud.drizzle.fill"
    case "rain":          return "cloud.rain.fill"
    case "heavy_rain":    return "cloud.heavyrain.fill"
    case "snow":          return "cloud.snow.fill"
    case "thunderstorm":  return "cloud.bolt.rain.fill"
    default:              return isDay ? "sun.max.fill" : "moon.stars.fill"
    }
}

private func wTierColor(_ tier: String) -> Color {
    switch tier {
    case "warmth_1": return Color(red: 0.95, green: 0.28, blue: 0.12)
    case "warmth_2": return Color(red: 0.98, green: 0.50, blue: 0.12)
    case "warmth_3": return Color(red: 0.98, green: 0.78, blue: 0.18)
    case "warmth_4": return Color(red: 0.22, green: 0.78, blue: 0.38)
    case "warmth_5": return Color(red: 0.28, green: 0.58, blue: 0.95)
    case "warmth_6": return Color(red: 0.12, green: 0.28, blue: 0.78)
    case "warmth_1_rain", "warmth_2_rain", "warmth_3_rain": return Color(red: 0.38, green: 0.55, blue: 0.78)
    case "warmth_6_snow": return Color(red: 0.72, green: 0.86, blue: 0.98)
    default: return Color(red: 0.50, green: 0.65, blue: 0.85)
    }
}

// MARK: - Graphic Circular

struct GraphicCircularComplication: Widget {
    let kind = "LayerWeatherGraphicCircular"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WatchTimelineProvider()) { entry in
            GraphicCircularView(entry: entry)
                .containerBackground(.clear, for: .widget)
        }
        .configurationDisplayName("Layer Weather")
        .description("Temperature with weather ring.")
        .supportedFamilies([.accessoryCircular])
    }
}

struct GraphicCircularView: View {
    let entry: WeatherEntry
    private var snapshot: WidgetSnapshot { entry.widgetData.snapshot ?? .placeholder }
    private var tempNorm: Double { max(0, min(1, (snapshot.temp - 0) / 110)) }

    var body: some View {
        Gauge(
            value: tempNorm,
            in: 0...1,
            label: { Text("") },
            currentValueLabel: {
                Text("\(Int(snapshot.temp.rounded()))°")
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .widgetAccentable()
            },
            minimumValueLabel: {
                Text(Image(systemName: wSymbol(snapshot.condition, isDay: snapshot.isDay)))
                    .font(.system(size: 9))
            },
            maximumValueLabel: {
                Text("")
                    .font(.system(size: 9))
            }
        )
        .gaugeStyle(.accessoryCircular)
        .tint(wTierColor(snapshot.warmthTier))
    }
}

// MARK: - Graphic Rectangular

struct GraphicRectangularComplication: Widget {
    let kind = "LayerWeatherGraphicRectangular"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WatchTimelineProvider()) { entry in
            GraphicRectangularView(entry: entry)
                .containerBackground(.clear, for: .widget)
        }
        .configurationDisplayName("Layer Weather Outfit")
        .description("Location, outfit, and temperature.")
        .supportedFamilies([.accessoryRectangular])
    }
}

struct GraphicRectangularView: View {
    let entry: WeatherEntry
    private var snapshot: WidgetSnapshot { entry.widgetData.snapshot ?? .placeholder }

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(spacing: 3) {
                Image(systemName: "location.fill")
                    .font(.system(size: 8))
                    .foregroundStyle(.secondary)
                Text(snapshot.location)
                    .font(.system(size: 10, weight: .medium, design: .rounded))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Text(snapshot.outfitLabel)
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
                .widgetAccentable()

            HStack(spacing: 4) {
                Text("\(Int(snapshot.temp.rounded()))°")
                    .font(.system(size: 12, weight: .semibold, design: .rounded))

                Image(systemName: wSymbol(snapshot.condition, isDay: snapshot.isDay))
                    .symbolRenderingMode(.multicolor)
                    .font(.system(size: 11))

                if snapshot.precipProb > 15 {
                    Text("· \(Int(snapshot.precipProb))%")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
}

// MARK: - Graphic Corner

struct GraphicCornerComplication: Widget {
    let kind = "LayerWeatherGraphicCorner"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WatchTimelineProvider()) { entry in
            GraphicCornerView(entry: entry)
                .containerBackground(.clear, for: .widget)
        }
        .configurationDisplayName("Layer Weather")
        .description("Temperature arc in tier color.")
        .supportedFamilies([.accessoryCorner])
    }
}

struct GraphicCornerView: View {
    let entry: WeatherEntry
    private var snapshot: WidgetSnapshot { entry.widgetData.snapshot ?? .placeholder }
    private var tempNorm: Double { max(0, min(1, (snapshot.temp - 0) / 110)) }

    var body: some View {
        Gauge(
            value: tempNorm,
            in: 0...1,
            label: { Text("") },
            currentValueLabel: {
                Image(systemName: wSymbol(snapshot.condition, isDay: snapshot.isDay))
                    .symbolRenderingMode(.hierarchical)
                    .widgetAccentable()
            }
        )
        .gaugeStyle(.accessoryCircularCapacity)
        .tint(wTierColor(snapshot.warmthTier))
        .widgetLabel {
            Text("\(Int(snapshot.temp.rounded()))° · \(snapshot.outfitLabel)")
                .widgetAccentable()
        }
    }
}

// MARK: - Inline Complication

struct InlineComplication: Widget {
    let kind = "LayerWeatherInline"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WatchTimelineProvider()) { entry in
            InlineComplicationView(entry: entry)
                .containerBackground(.clear, for: .widget)
        }
        .configurationDisplayName("Layer Weather")
        .description("Temperature and outfit on one line.")
        .supportedFamilies([.accessoryInline])
    }
}

struct InlineComplicationView: View {
    let entry: WeatherEntry
    private var snapshot: WidgetSnapshot { entry.widgetData.snapshot ?? .placeholder }

    var body: some View {
        ViewThatFits {
            Label(
                "\(Int(snapshot.temp.rounded()))° · \(snapshot.outfitLabel) · \(Int(snapshot.precipProb))%",
                systemImage: wSymbol(snapshot.condition, isDay: snapshot.isDay)
            )
            Label(
                "\(Int(snapshot.temp.rounded()))° · \(snapshot.outfitLabel)",
                systemImage: wSymbol(snapshot.condition, isDay: snapshot.isDay)
            )
            Text("\(Int(snapshot.temp.rounded()))°")
        }
        .widgetAccentable()
    }
}

// MARK: - Widget Bundle

@main
struct LayerWeatherWatchComplications: WidgetBundle {
    var body: some Widget {
        GraphicCircularComplication()
        GraphicRectangularComplication()
        GraphicCornerComplication()
        InlineComplication()
    }
}
