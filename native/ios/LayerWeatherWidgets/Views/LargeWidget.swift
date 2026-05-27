import SwiftUI
import WidgetKit

// MARK: - LargeWidgetView

struct LargeWidgetView: View {
    let entry: WeatherEntry

    private var snapshot: WidgetSnapshot {
        entry.widgetData.snapshot ?? .placeholder
    }

    private var timeline: [TimelineWidgetEntry] {
        entry.widgetData.timeline
    }

    private var daily: [DailyWidgetEntry] {
        Array(entry.widgetData.daily.prefix(7))
    }

    private var commuteAlert: CommuteWidgetAlert? {
        entry.widgetData.commuteAlert
    }

    private var tierColor: Color {
        SkyGradient.tierColor(warmthTier: snapshot.warmthTier)
    }

    var body: some View {
        ZStack {
            VStack(alignment: .leading, spacing: 0) {
                // HEADER ROW
                headerRow
                    .padding(.horizontal, 14)
                    .padding(.top, 14)

                Divider()
                    .background(.white.opacity(0.25))
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)

                // TIMELINE ROWS
                VStack(spacing: 6) {
                    ForEach(timelineDisplayEntries) { period in
                        timelineRow(period)
                    }
                }
                .padding(.horizontal, 14)

                // COMMUTE ALERT
                if let alert = commuteAlert {
                    commuteAlertBanner(alert)
                        .padding(.horizontal, 14)
                        .padding(.top, 8)
                }

                Divider()
                    .background(.white.opacity(0.25))
                    .padding(.horizontal, 14)
                    .padding(.top, 8)
                    .padding(.bottom, 4)

                // 7-DAY FORECAST
                if !daily.isEmpty {
                    dailyForecastGrid
                        .padding(.horizontal, 14)
                        .padding(.bottom, 14)
                }

                Spacer(minLength: 0)
            }
        }
    }

    // MARK: - Header Row

    private var headerRow: some View {
        HStack(alignment: .center, spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                // Location
                HStack(spacing: 4) {
                    Image(systemName: "location.fill")
                        .font(.system(size: 9))
                        .foregroundStyle(.white.opacity(0.7))
                    Text(snapshot.location)
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.85))
                        .lineLimit(1)
                    if snapshot.isStale {
                        StaleIndicator()
                    }
                }

                // Temperature + condition
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text("\(Int(snapshot.temp.rounded()))°")
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)

                    ConditionIcon(
                        condition: snapshot.condition,
                        isDay: snapshot.isDay,
                        size: 20
                    )
                }

                Text("Feels \(Int(snapshot.feelsLike.rounded()))° · \(snapshot.outfitLabel)")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.white.opacity(0.8))
                    .lineLimit(1)
            }

            Spacer()

            // AQI Badge
            if let aqi = snapshot.aqiIndex {
                aqiBadge(aqi)
            }
        }
    }

    // MARK: - AQI Badge

    private func aqiBadge(_ aqi: Int) -> some View {
        VStack(spacing: 2) {
            Circle()
                .fill(aqiColor(aqi))
                .frame(width: 10, height: 10)

            Text("\(aqi)")
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundStyle(.white)

            Text("AQI")
                .font(.system(size: 8, weight: .medium))
                .foregroundStyle(.white.opacity(0.6))
        }
        .padding(8)
        .background(.ultraThinMaterial)
        .cornerRadius(10)
    }

    private func aqiColor(_ aqi: Int) -> Color {
        switch aqi {
        case 0..<50: return .green
        case 50..<100: return .yellow
        case 100..<150: return .orange
        case 150..<200: return .red
        case 200..<300: return Color(red: 0.6, green: 0.0, blue: 0.4)
        default: return Color(red: 0.5, green: 0.0, blue: 0.2)
        }
    }

    // MARK: - Timeline Rows

    private var timelineDisplayEntries: [TimelineWidgetEntry] {
        if !timeline.isEmpty { return Array(timeline.prefix(3)) }
        return TimelineWidgetEntry.placeholders
    }

    private func timelineRow(_ entry: TimelineWidgetEntry) -> some View {
        HStack(spacing: 10) {
            // Tier color dot
            Circle()
                .fill(SkyGradient.tierColor(warmthTier: entry.warmthTier))
                .frame(width: 10, height: 10)

            // Period name
            Text(entry.period)
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
                .frame(width: 72, alignment: .leading)

            // Temp range
            Text("\(Int(entry.minFeelsLike.rounded()))–\(Int(entry.maxFeelsLike.rounded()))°")
                .font(.system(size: 12, weight: .medium, design: .rounded))
                .foregroundStyle(.white.opacity(0.8))
                .frame(width: 60, alignment: .leading)

            Spacer()

            // Outfit label
            Text(entry.outfitLabel)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.white.opacity(0.85))
                .lineLimit(1)
                .minimumScaleFactor(0.8)

            // Precip
            if entry.precipProb > 15 {
                HStack(spacing: 2) {
                    Image(systemName: "drop.fill")
                        .font(.system(size: 8))
                        .foregroundStyle(Color(red: 0.55, green: 0.75, blue: 0.98))
                    Text("\(Int(entry.precipProb))%")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.7))
                }
            }
        }
        .padding(.vertical, 5)
        .padding(.horizontal, 10)
        .background(.white.opacity(0.08))
        .cornerRadius(10)
    }

    // MARK: - Commute Alert Banner

    private func commuteAlertBanner(_ alert: CommuteWidgetAlert) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "bolt.fill")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(alert.urgencyColor)

            Text(alert.message)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.white)
                .lineLimit(2)
                .minimumScaleFactor(0.8)

            Spacer()
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(alert.urgencyColor.opacity(0.25))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .strokeBorder(alert.urgencyColor.opacity(0.5), lineWidth: 1)
        )
        .cornerRadius(10)
    }

    // MARK: - 7-Day Forecast Grid

    private var dailyForecastGrid: some View {
        HStack(spacing: 0) {
            ForEach(daily) { day in
                VStack(spacing: 3) {
                    Text(day.dayAbbreviation.uppercased())
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.65))

                    // Condition dot
                    Circle()
                        .fill(conditionDotColor(day.condition, precipProb: day.precipProb))
                        .frame(width: 8, height: 8)

                    Text("\(Int(day.tempMax.rounded()))°")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(.white)

                    Text("\(Int(day.tempMin.rounded()))°")
                        .font(.system(size: 10, weight: .regular))
                        .foregroundStyle(.white.opacity(0.55))
                }
                .frame(maxWidth: .infinity)
            }
        }
    }

    private func conditionDotColor(_ condition: String, precipProb: Double) -> Color {
        if precipProb > 60 { return Color(red: 0.38, green: 0.62, blue: 0.95) }
        switch condition {
        case "clear": return Color(red: 0.98, green: 0.82, blue: 0.22)
        case "partly_cloudy": return Color(red: 0.80, green: 0.80, blue: 0.82)
        case "cloudy": return Color(red: 0.60, green: 0.60, blue: 0.65)
        case "rain", "drizzle": return Color(red: 0.38, green: 0.62, blue: 0.95)
        case "heavy_rain", "thunderstorm": return Color(red: 0.25, green: 0.40, blue: 0.75)
        case "snow": return Color(red: 0.78, green: 0.90, blue: 0.98)
        case "foggy": return Color(red: 0.68, green: 0.68, blue: 0.70)
        default: return .white.opacity(0.5)
        }
    }
}

// MARK: - Preview

#Preview("Large Widget", as: .systemLarge) {
    LayerWeatherLargeWidget()
} timeline: {
    WeatherEntry.placeholder
}
