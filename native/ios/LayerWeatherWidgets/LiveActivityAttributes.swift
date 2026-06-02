import ActivityKit
import Foundation
import SwiftUI

// MARK: - LayerWeatherActivityAttributes

@available(iOS 16.2, *)
struct LayerWeatherActivityAttributes: ActivityAttributes {

    // ── Dynamic state (updated throughout the activity's life) ────────────────
    struct ContentState: Codable, Hashable {
        var temp: Double
        var feelsLike: Double
        var condition: String
        var weatherCode: Int
        var isDay: Bool
        var precipProb: Double
        var outfitLabel: String
        var garmentTop: String
        var umbrella: Bool
        var warmthTier: String

        /// Precipitation probability (0–100) for each of the next 60 minutes.
        /// Empty when nowcast data is unavailable.
        var nowcastValues: [Double]

        var updatedAt: Date

        // ── Commute fields (nil when not in an active commute window) ─────────
        /// "morning" or "evening"
        var commuteType: String?
        /// Minutes until the commute start/end time.
        var commuteMinutesAway: Int?
        /// Human-readable note, e.g. "Rain clearing before you leave"
        var commuteNote: String?

        // ── Alerts ────────────────────────────────────────────────────────────
        /// First active NWS/Google alert headline, if any.
        var alertHeadline: String?

        // ── Helpers ───────────────────────────────────────────────────────────

        var rainStartsInMinutes: Int? {
            nowcastValues.enumerated().first(where: { $0.element > 50 })?.offset
        }

        var rainStopsInMinutes: Int? {
            guard precipProb > 50 else { return nil }
            return nowcastValues.enumerated().first(where: {
                $0.offset > 0 && $0.element < 20
            })?.offset
        }

        var nowcastSummary: String {
            if precipProb > 50 {
                if let stop = rainStopsInMinutes, stop <= 20 {
                    return stop <= 2 ? "Clearing now" : "Clearing in \(stop) min"
                }
                return "Raining now"
            }
            if let start = rainStartsInMinutes, start <= 20 {
                return start <= 2 ? "Rain starting now" : "Rain in \(start) min"
            }
            return outfitLabel
        }

        static var placeholder: ContentState {
            ContentState(
                temp: 68,
                feelsLike: 65,
                condition: "partly_cloudy",
                weatherCode: 2,
                isDay: true,
                precipProb: 15,
                outfitLabel: "Light Jacket",
                garmentTop: "Light Jacket",
                umbrella: false,
                warmthTier: "warmth_3",
                nowcastValues: Array(repeating: 0, count: 60),
                updatedAt: Date()
            )
        }
    }

    // ── Static attributes (set once at activity start) ────────────────────────
    var cityName: String
    var accentColorHex: String
}
