import Foundation
import SwiftUI

// MARK: - WidgetSnapshot (Watch)

struct WidgetSnapshot: Codable {
    let temp: Double
    let feelsLike: Double
    let humidity: Double
    let windSpeed: Double
    let precipProb: Double
    let aqiIndex: Int?
    let condition: String
    let weatherCode: Int
    let isDay: Bool
    let location: String
    let outfitLabel: String
    let outfitDescription: String
    let warmthTier: String
    let garmentTop: String
    let garmentBottom: String?
    let umbrella: Bool
    let sunglasses: Bool
    let scarf: Bool
    let gloves: Bool
    let beanie: Bool
    let rainShell: Bool
    let footwear: String
    let avatarCondition: String
    let updatedAt: String

    var isStale: Bool {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: updatedAt)
        if date == nil {
            let fallback = ISO8601DateFormatter()
            date = fallback.date(from: updatedAt)
        }
        guard let updated = date else { return true }
        return Date().timeIntervalSince(updated) > 7200
    }

    var timeSinceUpdate: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: updatedAt)
        if date == nil {
            let fallback = ISO8601DateFormatter()
            date = fallback.date(from: updatedAt)
        }
        guard let updated = date else { return "Unknown" }
        let interval = Date().timeIntervalSince(updated)
        if interval < 60 { return "Just now" }
        if interval < 3600 { return "\(Int(interval / 60))m ago" }
        return "\(Int(interval / 3600))h ago"
    }

    static var placeholder: WidgetSnapshot {
        WidgetSnapshot(
            temp: 68,
            feelsLike: 65,
            humidity: 55,
            windSpeed: 8,
            precipProb: 10,
            aqiIndex: 42,
            condition: "partly_cloudy",
            weatherCode: 2,
            isDay: true,
            location: "Open app to sync",
            outfitLabel: "Light Jacket",
            outfitDescription: "A light jacket over a t-shirt should keep you comfortable.",
            warmthTier: "warmth_3",
            garmentTop: "Light Jacket",
            garmentBottom: "Jeans",
            umbrella: false,
            sunglasses: true,
            scarf: false,
            gloves: false,
            beanie: false,
            rainShell: false,
            footwear: "Sneakers",
            avatarCondition: "partly_cloudy",
            updatedAt: ISO8601DateFormatter().string(from: Date())
        )
    }
}

// MARK: - HourlyWidgetEntry (Watch)

struct HourlyWidgetEntry: Codable, Identifiable {
    let hour: String
    let temp: Double
    let feelsLike: Double
    let precipProb: Double
    let condition: String
    let weatherCode: Int
    let isDay: Bool
    let warmthTier: String

    var id: String { hour }

    var hourDate: Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: hour)
        if date == nil {
            let fallback = ISO8601DateFormatter()
            date = fallback.date(from: hour)
        }
        return date
    }

    var formattedHour: String {
        guard let date = hourDate else { return hour }
        let formatter = DateFormatter()
        formatter.dateFormat = "h a"
        return formatter.string(from: date)
    }

    static var placeholders: [HourlyWidgetEntry] {
        let now = Date()
        let conditions = ["clear", "partly_cloudy", "partly_cloudy", "cloudy", "drizzle",
                          "rain", "cloudy", "partly_cloudy", "clear", "clear",
                          "clear", "clear", "partly_cloudy", "cloudy", "rain",
                          "rain", "cloudy", "partly_cloudy", "clear", "clear",
                          "clear", "clear", "clear", "clear"]
        return (0..<24).map { i in
            let date = now.addingTimeInterval(Double(i) * 3600)
            let formatter = ISO8601DateFormatter()
            let hour = Calendar.current.component(.hour, from: date)
            return HourlyWidgetEntry(
                hour: formatter.string(from: date),
                temp: 68 - Double(i % 12) * 1.5,
                feelsLike: 65 - Double(i % 12) * 1.5,
                precipProb: Double([10, 10, 20, 30, 50, 60, 40, 20, 10, 10, 5, 5][i % 12]),
                condition: conditions[i % conditions.count],
                weatherCode: 2,
                isDay: hour >= 6 && hour < 20,
                warmthTier: "warmth_3"
            )
        }
    }
}

// MARK: - DailyWidgetEntry (Watch)

struct DailyWidgetEntry: Codable, Identifiable {
    let date: String
    let tempMin: Double
    let tempMax: Double
    let precipProb: Double
    let condition: String
    let weatherCode: Int

    var id: String { date }

    var dayDate: Date? {
        let dayFormatter = DateFormatter()
        dayFormatter.dateFormat = "yyyy-MM-dd"
        if let d = dayFormatter.date(from: date) { return d }
        let formatter = ISO8601DateFormatter()
        return formatter.date(from: date)
    }

    var dayAbbreviation: String {
        guard let date = dayDate else { return "---" }
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        return formatter.string(from: date)
    }

    static var placeholders: [DailyWidgetEntry] {
        let conditions = ["clear", "partly_cloudy", "cloudy", "rain", "clear", "partly_cloudy", "clear"]
        let now = Date()
        let dayFormatter = DateFormatter()
        dayFormatter.dateFormat = "yyyy-MM-dd"
        return (0..<7).map { i in
            let date = Calendar.current.date(byAdding: .day, value: i, to: now) ?? now
            return DailyWidgetEntry(
                date: dayFormatter.string(from: date),
                tempMin: 55 - Double(i),
                tempMax: 72 + Double(i % 3),
                precipProb: Double([10, 20, 40, 80, 15, 25, 5][i]),
                condition: conditions[i],
                weatherCode: 2
            )
        }
    }
}

// MARK: - TimelineWidgetEntry (Watch)

struct TimelineWidgetEntry: Codable, Identifiable {
    let period: String
    let startHour: Int
    let endHour: Int
    let minFeelsLike: Double
    let maxFeelsLike: Double
    let outfitLabel: String
    let outfitType: String
    let precipProb: Double
    let condition: String
    let warmthTier: String

    var id: String { period }

    static var placeholders: [TimelineWidgetEntry] {
        [
            TimelineWidgetEntry(period: "Morning", startHour: 6, endHour: 12,
                                minFeelsLike: 58, maxFeelsLike: 64,
                                outfitLabel: "Light Jacket", outfitType: "jacket",
                                precipProb: 10, condition: "partly_cloudy", warmthTier: "warmth_3"),
            TimelineWidgetEntry(period: "Afternoon", startHour: 12, endHour: 18,
                                minFeelsLike: 65, maxFeelsLike: 72,
                                outfitLabel: "T-Shirt", outfitType: "light",
                                precipProb: 5, condition: "clear", warmthTier: "warmth_3"),
            TimelineWidgetEntry(period: "Evening", startHour: 18, endHour: 22,
                                minFeelsLike: 60, maxFeelsLike: 65,
                                outfitLabel: "Hoodie", outfitType: "hoodie",
                                precipProb: 20, condition: "cloudy", warmthTier: "warmth_4")
        ]
    }
}

// MARK: - CommuteWidgetAlert (Watch)

struct CommuteWidgetAlert: Codable {
    let type: String
    let message: String
    let urgency: String

    var urgencyColor: Color {
        switch urgency {
        case "critical": return .red
        case "warning": return .orange
        default: return .blue
        }
    }
}

// MARK: - WidgetData (Watch)

struct WidgetData {
    let snapshot: WidgetSnapshot?
    let hourly: [HourlyWidgetEntry]
    let daily: [DailyWidgetEntry]
    let timeline: [TimelineWidgetEntry]
    let commuteAlert: CommuteWidgetAlert?
    let accentColor: String
    let thermalSensitivity: Int

    static func load() -> WidgetData {
        let defaults = UserDefaults(suiteName: AppGroupKeys.suiteName)
        let decoder = JSONDecoder()

        // Values stored as JSON strings by WidgetBridgePlugin — read with string(forKey:)
        func jsonData(for key: String) -> Data? {
            defaults?.string(forKey: key)?.data(using: .utf8)
        }

        var snapshot: WidgetSnapshot?
        if let data = jsonData(for: AppGroupKeys.snapshot) {
            snapshot = try? decoder.decode(WidgetSnapshot.self, from: data)
        }

        var hourly: [HourlyWidgetEntry] = []
        if let data = jsonData(for: AppGroupKeys.hourly) {
            hourly = (try? decoder.decode([HourlyWidgetEntry].self, from: data)) ?? []
        }

        var daily: [DailyWidgetEntry] = []
        if let data = jsonData(for: AppGroupKeys.daily) {
            daily = (try? decoder.decode([DailyWidgetEntry].self, from: data)) ?? []
        }

        var timeline: [TimelineWidgetEntry] = []
        if let data = jsonData(for: AppGroupKeys.timeline) {
            timeline = (try? decoder.decode([TimelineWidgetEntry].self, from: data)) ?? []
        }

        var commuteAlert: CommuteWidgetAlert?
        if let data = jsonData(for: AppGroupKeys.commuteAlert) {
            commuteAlert = try? decoder.decode(CommuteWidgetAlert.self, from: data)
        }

        let accentColor = defaults?.string(forKey: AppGroupKeys.accentColor) ?? "#4F8EF7"
        let thermalStr = defaults?.string(forKey: AppGroupKeys.thermalSensitivity)
        let thermalSensitivity = thermalStr.flatMap { Int($0) }
            ?? (defaults?.object(forKey: AppGroupKeys.thermalSensitivity) != nil
                ? defaults?.integer(forKey: AppGroupKeys.thermalSensitivity) : nil)
            ?? 0

        return WidgetData(
            snapshot: snapshot,
            hourly: hourly,
            daily: daily,
            timeline: timeline,
            commuteAlert: commuteAlert,
            accentColor: accentColor,
            thermalSensitivity: thermalSensitivity
        )
    }

    /// Merges a phone `buildPayload()` dictionary into widget data (`transferUserInfo` / message reply).
    /// The phone sends short keys (`snapshot`, `hourly`, …) with JSON blobs as `Data`.
    static func mergingPhonePayload(_ payload: [String: Any], into existing: WidgetData? = nil) -> WidgetData {
        let decoder = JSONDecoder()

        var snapshot: WidgetSnapshot? = existing?.snapshot
        var hourly: [HourlyWidgetEntry] = existing?.hourly ?? []
        var daily: [DailyWidgetEntry] = existing?.daily ?? []
        var timeline: [TimelineWidgetEntry] = existing?.timeline ?? []
        // Phone `buildPayload()` omits this key when no alert exists; treat absence as cleared.
        var commuteAlert: CommuteWidgetAlert?
        var accentColor = existing?.accentColor ?? "#4F8EF7"
        var thermalSensitivity = existing?.thermalSensitivity ?? 0

        if let data = payload["snapshot"] as? Data {
            snapshot = (try? decoder.decode(WidgetSnapshot.self, from: data)) ?? snapshot
        }
        if let data = payload["hourly"] as? Data {
            hourly = (try? decoder.decode([HourlyWidgetEntry].self, from: data)) ?? hourly
        }
        if let data = payload["daily"] as? Data {
            daily = (try? decoder.decode([DailyWidgetEntry].self, from: data)) ?? daily
        }
        if let data = payload["timeline"] as? Data {
            timeline = (try? decoder.decode([TimelineWidgetEntry].self, from: data)) ?? timeline
        }
        if let data = payload["commuteAlert"] as? Data {
            commuteAlert = try? decoder.decode(CommuteWidgetAlert.self, from: data)
        }
        if let color = payload["accentColor"] as? String {
            accentColor = color
        }
        if let sensitivity = payload["thermalSensitivity"] as? Int {
            thermalSensitivity = sensitivity
        }
        if let coordData = payload["lastCoordinates"] as? Data,
           let json = String(data: coordData, encoding: .utf8) {
            UserDefaults(suiteName: AppGroupKeys.suiteName)?
                .set(json, forKey: AppGroupKeys.lastCoordinates)
        }

        return WidgetData(
            snapshot: snapshot,
            hourly: hourly,
            daily: daily,
            timeline: timeline,
            commuteAlert: commuteAlert,
            accentColor: accentColor,
            thermalSensitivity: thermalSensitivity
        )
    }

    static var placeholder: WidgetData {
        WidgetData(
            snapshot: .placeholder,
            hourly: HourlyWidgetEntry.placeholders,
            daily: DailyWidgetEntry.placeholders,
            timeline: TimelineWidgetEntry.placeholders,
            commuteAlert: nil,
            accentColor: "#4F8EF7",
            thermalSensitivity: 0
        )
    }

    var isEmpty: Bool {
        snapshot == nil
    }

    /// True when we have a real synced snapshot (not the placeholder prompt).
    var hasDisplayableWeather: Bool {
        guard let snapshot = snapshot else { return false }
        let loc = snapshot.location.trimmingCharacters(in: .whitespacesAndNewlines)
        if loc.isEmpty { return false }
        if loc == "Open app to sync" { return false }
        return true
    }

    /// Writes this payload into the watch's App Group cache for offline display.
    func persistToAppGroup() {
        guard let defaults = UserDefaults(suiteName: AppGroupKeys.suiteName) else { return }
        let encoder = JSONEncoder()

        func store<T: Encodable>(_ value: T?, forKey key: String) {
            guard let value = value,
                  let data = try? encoder.encode(value),
                  let json = String(data: data, encoding: .utf8) else { return }
            defaults.set(json, forKey: key)
        }

        store(snapshot, forKey: AppGroupKeys.snapshot)
        if !hourly.isEmpty { store(hourly, forKey: AppGroupKeys.hourly) }
        if !daily.isEmpty { store(daily, forKey: AppGroupKeys.daily) }
        if !timeline.isEmpty { store(timeline, forKey: AppGroupKeys.timeline) }
        store(commuteAlert, forKey: AppGroupKeys.commuteAlert)
        defaults.set(accentColor, forKey: AppGroupKeys.accentColor)
        defaults.set(String(thermalSensitivity), forKey: AppGroupKeys.thermalSensitivity)
        defaults.synchronize()
    }
}

// MARK: - AppGroupKeys (Watch)

enum AppGroupKeys {
    static let suiteName = "group.com.layerweather.shared"
    static let snapshot = "widget_snapshot"
    static let hourly = "widget_hourly"
    static let daily = "widget_daily"
    static let timeline = "widget_timeline"
    static let commuteAlert = "widget_commute_alert"
    static let accentColor = "widget_accent_color"
    static let thermalSensitivity = "widget_thermal_sensitivity"
    static let feedbackAction = "widget_feedback_action"
    static let feedbackTimestamp = "widget_feedback_timestamp"
    static let lastCoordinates = "widget_last_coordinates"
}

// MARK: - Color Extension (Watch)

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255,
                            (int >> 8) * 17,
                            (int >> 4 & 0xF) * 17,
                            (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255,
                            int >> 16,
                            int >> 8 & 0xFF,
                            int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24,
                            int >> 16 & 0xFF,
                            int >> 8 & 0xFF,
                            int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
