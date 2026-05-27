import Foundation
import SwiftUI

// MARK: - WidgetSnapshot

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

    /// Returns true if data is older than 2 hours
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

// MARK: - HourlyWidgetEntry

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
        formatter.dateFormat = "ha"
        return formatter.string(from: date).lowercased()
    }

    static var placeholders: [HourlyWidgetEntry] {
        let now = Date()
        let conditions = ["clear", "partly_cloudy", "partly_cloudy", "cloudy", "drizzle"]
        let tiers = ["warmth_3", "warmth_3", "warmth_3", "warmth_3", "warmth_3_rain"]
        return (0..<5).map { i in
            let date = now.addingTimeInterval(Double(i) * 3600)
            let formatter = ISO8601DateFormatter()
            return HourlyWidgetEntry(
                hour: formatter.string(from: date),
                temp: 68 - Double(i) * 2,
                feelsLike: 65 - Double(i) * 2,
                precipProb: Double(i * 10),
                condition: conditions[i],
                weatherCode: i == 0 ? 0 : 2,
                isDay: i < 4,
                warmthTier: tiers[i]
            )
        }
    }
}

// MARK: - DailyWidgetEntry

struct DailyWidgetEntry: Codable, Identifiable {
    let date: String
    let tempMin: Double
    let tempMax: Double
    let precipProb: Double
    let condition: String
    let weatherCode: Int

    var id: String { date }

    var dayDate: Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: self.date)
        if date == nil {
            let fallback = ISO8601DateFormatter()
            date = fallback.date(from: self.date)
        }
        if date == nil {
            let dayFormatter = DateFormatter()
            dayFormatter.dateFormat = "yyyy-MM-dd"
            date = dayFormatter.date(from: self.date)
        }
        return date
    }

    var dayAbbreviation: String {
        guard let date = dayDate else { return "---" }
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        return formatter.string(from: date)
    }

    static var placeholders: [DailyWidgetEntry] {
        let conditions = ["clear", "partly_cloudy", "cloudy", "rain", "clear", "partly_cloudy", "clear"]
        let codes = [0, 2, 3, 61, 0, 2, 0]
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
                weatherCode: codes[i]
            )
        }
    }
}

// MARK: - TimelineWidgetEntry

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

// MARK: - CommuteWidgetAlert

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

// MARK: - WidgetData

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

        // Values are stored as JSON strings (written by WidgetBridgePlugin via set(_:forKey:)),
        // so we read them back as strings and convert to Data before decoding.
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
        let thermalSensitivity = defaults?.integer(forKey: AppGroupKeys.thermalSensitivity) ?? 0

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
}

// MARK: - Color Extension (SwiftUI)

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
