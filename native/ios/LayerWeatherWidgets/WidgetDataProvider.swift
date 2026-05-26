import WidgetKit
import SwiftUI

// MARK: - WeatherTimelineProvider

struct WeatherTimelineProvider: TimelineProvider {
    typealias Entry = WeatherEntry

    // MARK: Placeholder

    func placeholder(in context: Context) -> WeatherEntry {
        .placeholder
    }

    // MARK: Snapshot

    func getSnapshot(in context: Context, completion: @escaping (WeatherEntry) -> Void) {
        if context.isPreview {
            completion(.placeholder)
            return
        }
        let data = WidgetData.load()
        let entry = WeatherEntry(
            date: Date(),
            widgetData: data,
            accentColor: Color(hex: data.accentColor)
        )
        completion(entry)
    }

    // MARK: Timeline

    func getTimeline(in context: Context, completion: @escaping (Timeline<WeatherEntry>) -> Void) {
        let data = WidgetData.load()
        let accentColor = Color(hex: data.accentColor)
        let now = Date()

        let entry = WeatherEntry(
            date: now,
            widgetData: data,
            accentColor: accentColor
        )

        // Refresh every 30 minutes
        let refreshDate = Calendar.current.date(byAdding: .minute, value: 30, to: now) ?? now

        // Check commute relevance
        let relevance = commuteRelevance(for: data, at: now)

        var entries: [WeatherEntry] = [entry]

        // Also schedule a mid-point entry if within an active commute window
        if isWithinCommuteWindow(data: data, date: now) {
            let midPoint = Calendar.current.date(byAdding: .minute, value: 15, to: now) ?? now
            let midEntry = WeatherEntry(
                date: midPoint,
                widgetData: data,
                accentColor: accentColor
            )
            entries.append(midEntry)
        }

        _ = relevance // used for potential future relevance API
        let timeline = Timeline(entries: entries, policy: .after(refreshDate))
        completion(timeline)
    }

    // MARK: - Commute Relevance

    private func commuteRelevance(for data: WidgetData, at date: Date) -> TimelineEntryRelevance? {
        guard let alert = data.commuteAlert else { return nil }
        let isWithin30Min = isWithinCommuteWindow(data: data, date: date)
        if isWithin30Min {
            let score: Float = alert.urgency == "critical" ? 1.0 : (alert.urgency == "warning" ? 0.7 : 0.4)
            return TimelineEntryRelevance(score: score, duration: 1800)
        }
        return nil
    }

    private func isWithinCommuteWindow(data: WidgetData, date: Date) -> Bool {
        guard data.commuteAlert != nil else { return false }
        let hour = Calendar.current.component(.hour, from: date)
        let minute = Calendar.current.component(.minute, from: date)
        let totalMinutes = hour * 60 + minute

        // Morning commute window: 6:30 AM – 9:30 AM (390 – 570 min)
        let morningStart = 390
        let morningEnd = 570

        // Evening commute window: 4:30 PM – 7:30 PM (990 – 1170 min)
        let eveningStart = 990
        let eveningEnd = 1170

        let inMorning = totalMinutes >= morningStart && totalMinutes <= morningEnd
        let inEvening = totalMinutes >= eveningStart && totalMinutes <= eveningEnd

        return inMorning || inEvening
    }
}
