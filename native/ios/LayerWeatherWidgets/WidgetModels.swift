import WidgetKit
import SwiftUI

// MARK: - WeatherEntry

struct WeatherEntry: TimelineEntry {
    let date: Date
    let widgetData: WidgetData
    let accentColor: Color

    static var placeholder: WeatherEntry {
        WeatherEntry(
            date: Date(),
            widgetData: .placeholder,
            accentColor: Color(hex: "#4F8EF7")
        )
    }
}

// MARK: - UserDefaults Extension

extension UserDefaults {
    static func loadWidgetData() -> WidgetData {
        return WidgetData.load()
    }

    static func accentSwiftUIColor() -> Color {
        let defaults = UserDefaults(suiteName: AppGroupKeys.suiteName)
        let hex = defaults?.string(forKey: AppGroupKeys.accentColor) ?? "#4F8EF7"
        return Color(hex: hex)
    }

    static func writeFeedback(_ action: String) {
        let defaults = UserDefaults(suiteName: AppGroupKeys.suiteName)
        defaults?.set(action, forKey: AppGroupKeys.feedbackAction)
        defaults?.set(Date().timeIntervalSince1970, forKey: AppGroupKeys.feedbackTimestamp)
        defaults?.synchronize()
    }
}
