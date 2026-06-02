import SwiftUI
import WidgetKit
import ActivityKit

// MARK: - Nowcast Bar

/// Visualizes the next 60-minute precipitation probability as a mini bar chart.
/// Each bar covers a 3-minute window. Height and opacity encode intensity.
@available(iOS 16.2, *)
struct NowcastBar: View {
    let values: [Double]            // 0–100, 60 entries
    let tintColor: Color
    var barCount: Int = 20          // samples shown (3-min buckets)

    private var buckets: [Double] {
        guard !values.isEmpty else { return Array(repeating: 0, count: barCount) }
        return (0..<barCount).map { i in
            let start = i * values.count / barCount
            let end = (i + 1) * values.count / barCount
            guard start < end else { return 0 }
            let slice = values[start..<end]
            return slice.reduce(0, +) / Double(slice.count)
        }
    }

    var body: some View {
        HStack(alignment: .bottom, spacing: 2) {
            ForEach(Array(buckets.enumerated()), id: \.offset) { _, intensity in
                let norm = max(0.08, min(1, intensity / 100))
                RoundedRectangle(cornerRadius: 2)
                    .fill(
                        intensity > 50
                        ? Color(red: 0.28, green: 0.60, blue: 0.95).opacity(0.4 + norm * 0.5)
                        : tintColor.opacity(0.15 + norm * 0.3)
                    )
                    .frame(height: 4 + 14 * norm)
            }
        }
        .frame(height: 18)
    }
}

// MARK: - Commute Countdown Badge

@available(iOS 16.2, *)
struct CommuteBadge: View {
    let commuteType: String
    let minutesAway: Int
    let accentColor: Color

    private var label: String {
        let direction = commuteType == "morning" ? "Commute" : "Home"
        if minutesAway <= 0 { return "\(direction) now" }
        if minutesAway < 60 { return "\(direction) \(minutesAway)m" }
        return direction
    }

    var body: some View {
        HStack(spacing: 3) {
            Image(systemName: commuteType == "morning" ? "arrow.right.circle.fill" : "house.circle.fill")
                .font(.system(size: 9, weight: .semibold))
            Text(label)
                .font(.system(size: 9, weight: .bold, design: .rounded))
        }
        .foregroundStyle(accentColor)
        .padding(.horizontal, 6)
        .padding(.vertical, 3)
        .background(accentColor.opacity(0.15))
        .clipShape(Capsule())
    }
}

// MARK: - Alert Strip

@available(iOS 16.2, *)
struct AlertStrip: View {
    let headline: String

    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.orange)
            Text(headline)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.primary)
                .lineLimit(1)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(.orange.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }
}

// MARK: - Lock Screen / Notification Banner View

@available(iOS 16.2, *)
struct WeatherLiveActivityView: View {
    let context: ActivityViewContext<LayerWeatherActivityAttributes>

    private var state: LayerWeatherActivityAttributes.ContentState { context.state }
    private var accent: Color { Color(hex: context.attributes.accentColorHex) }
    private var tierColor: Color { SkyGradient.tierColor(warmthTier: state.warmthTier) }

    var body: some View {
        let hour = Calendar.current.component(.hour, from: state.updatedAt)

        ZStack(alignment: .topLeading) {
            // Sky gradient background
            SkyGradient.gradient(
                condition: state.condition,
                isDay: state.isDay,
                hour: hour
            )

            VStack(alignment: .leading, spacing: 10) {

                // ── Row 1: City + Updated ──────────────────────────────────────
                HStack {
                    HStack(spacing: 4) {
                        Image(systemName: "location.fill")
                            .font(.system(size: 10))
                            .foregroundStyle(.white.opacity(0.7))
                        Text(context.attributes.cityName)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(.white)
                    }
                    Spacer()
                    Text(updatedLabel)
                        .font(.system(size: 10, weight: .regular))
                        .foregroundStyle(.white.opacity(0.6))
                }

                // ── Row 2: Temp + Condition + Outfit ──────────────────────────
                HStack(alignment: .firstTextBaseline, spacing: 0) {

                    // Temperature
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(alignment: .firstTextBaseline, spacing: 4) {
                            Text("\(Int(state.temp.rounded()))°")
                                .font(.system(size: 42, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)

                            VStack(alignment: .leading, spacing: 1) {
                                Text("Feels \(Int(state.feelsLike.rounded()))°")
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundStyle(.white.opacity(0.75))
                                Text(conditionLabel(state.condition))
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundStyle(.white.opacity(0.75))
                            }
                        }
                    }

                    Spacer()

                    // Condition icon + outfit
                    VStack(alignment: .trailing, spacing: 4) {
                        Image(systemName: conditionSFSymbol(condition: state.condition, isDay: state.isDay))
                            .symbolRenderingMode(.multicolor)
                            .font(.system(size: 32))

                        HStack(spacing: 4) {
                            if state.umbrella {
                                Image(systemName: "umbrella.fill")
                                    .font(.system(size: 10))
                                    .foregroundStyle(.white.opacity(0.8))
                            }
                            Text("Wear \(state.outfitLabel)")
                                .font(.system(size: 12, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(.white.opacity(0.18))
                        .clipShape(Capsule())
                    }
                }

                // ── Row 3: Nowcast bar + summary ──────────────────────────────
                if !state.nowcastValues.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(state.nowcastSummary)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(.white.opacity(0.85))
                            Spacer()
                            Text("Next 60 min")
                                .font(.system(size: 9))
                                .foregroundStyle(.white.opacity(0.5))
                        }
                        NowcastBar(values: state.nowcastValues, tintColor: accent)
                    }
                }

                // ── Row 4: Commute badge + alert ──────────────────────────────
                HStack(spacing: 6) {
                    if let type = state.commuteType, let mins = state.commuteMinutesAway {
                        CommuteBadge(commuteType: type, minutesAway: mins, accentColor: accent)
                    }
                    if let headline = state.alertHeadline {
                        AlertStrip(headline: headline)
                    }
                    Spacer()
                }
            }
            .padding(14)
        }
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var updatedLabel: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: state.updatedAt, relativeTo: Date())
    }

    private func conditionLabel(_ condition: String) -> String {
        condition.replacingOccurrences(of: "_", with: " ").capitalized
    }
}

// MARK: - Dynamic Island

@available(iOS 16.2, *)
struct WeatherDynamicIsland: View {
    let context: ActivityViewContext<LayerWeatherActivityAttributes>

    // Compact leading: condition symbol
    static func compactLeading(context: ActivityViewContext<LayerWeatherActivityAttributes>) -> some View {
        Image(systemName: conditionSFSymbol(
            condition: context.state.condition,
            isDay: context.state.isDay
        ))
        .symbolRenderingMode(.multicolor)
        .font(.system(size: 14, weight: .medium))
    }

    // Compact trailing: temperature
    static func compactTrailing(context: ActivityViewContext<LayerWeatherActivityAttributes>) -> some View {
        Text("\(Int(context.state.temp.rounded()))°")
            .font(.system(size: 14, weight: .bold, design: .rounded))
            .foregroundStyle(.white)
            .monospacedDigit()
    }

    // Minimal: temperature
    static func minimal(context: ActivityViewContext<LayerWeatherActivityAttributes>) -> some View {
        Text("\(Int(context.state.temp.rounded()))°")
            .font(.system(size: 12, weight: .bold, design: .rounded))
            .foregroundStyle(.white)
            .monospacedDigit()
    }
}

// MARK: - Dynamic Island Expanded

@available(iOS 16.2, *)
struct WeatherExpandedIslandView: View {
    let context: ActivityViewContext<LayerWeatherActivityAttributes>

    private var state: LayerWeatherActivityAttributes.ContentState { context.state }
    private var accent: Color { Color(hex: context.attributes.accentColorHex) }

    var body: some View {
        DynamicIsland { regions in

            // ── Leading: Location + temp ────────────────────────────────────
            DynamicIslandExpandedRegion(.leading) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(context.attributes.cityName)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)

                    HStack(alignment: .firstTextBaseline, spacing: 2) {
                        Text("\(Int(state.temp.rounded()))°")
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundStyle(.primary)
                        Text("F")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                }
            }

            // ── Trailing: Precipitation + umbrella ─────────────────────────
            DynamicIslandExpandedRegion(.trailing) {
                VStack(alignment: .trailing, spacing: 4) {
                    Image(systemName: conditionSFSymbol(
                        condition: state.condition, isDay: state.isDay
                    ))
                    .symbolRenderingMode(.multicolor)
                    .font(.system(size: 22))

                    HStack(spacing: 3) {
                        if state.umbrella {
                            Image(systemName: "umbrella.fill")
                                .font(.system(size: 10))
                                .foregroundStyle(accent)
                        }
                        Text("\(Int(state.precipProb))%")
                            .font(.system(size: 12, weight: .semibold, design: .rounded))
                            .foregroundStyle(state.precipProb > 50 ? accent : .secondary)
                            .monospacedDigit()
                    }
                }
            }

            // ── Center: Outfit label / nowcast summary ─────────────────────
            DynamicIslandExpandedRegion(.center) {
                VStack(spacing: 3) {
                    Text(state.nowcastSummary)
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(.primary)
                        .lineLimit(1)

                    if let type = state.commuteType, let mins = state.commuteMinutesAway {
                        CommuteBadge(commuteType: type, minutesAway: mins, accentColor: accent)
                    }
                }
            }

            // ── Bottom: Nowcast bar ─────────────────────────────────────────
            DynamicIslandExpandedRegion(.bottom) {
                VStack(alignment: .leading, spacing: 4) {
                    if !state.nowcastValues.isEmpty {
                        NowcastBar(values: state.nowcastValues, tintColor: accent, barCount: 30)
                            .padding(.horizontal, 2)
                    }

                    if let headline = state.alertHeadline {
                        AlertStrip(headline: headline)
                    }
                }
                .padding(.top, 4)
            }

        } compactLeading: {
            WeatherDynamicIsland.compactLeading(context: context)
        } compactTrailing: {
            WeatherDynamicIsland.compactTrailing(context: context)
        } minimal: {
            WeatherDynamicIsland.minimal(context: context)
        }
        .keylineTint(Color(hex: context.attributes.accentColorHex))
    }
}

// MARK: - Previews

#if DEBUG
@available(iOS 16.2, *)
struct LiveActivity_Previews: PreviewProvider {
    static let attributes = LayerWeatherActivityAttributes(
        cityName: "San Francisco, CA",
        accentColorHex: "#4F46E5"
    )

    static let state = LayerWeatherActivityAttributes.ContentState.placeholder

    static var previews: some View {
        attributes
            .previewContext(state, viewKind: .content)
            .previewDisplayName("Lock Screen")

        attributes
            .previewContext(state, viewKind: .dynamicIsland(.compact))
            .previewDisplayName("Dynamic Island Compact")

        attributes
            .previewContext(state, viewKind: .dynamicIsland(.expanded))
            .previewDisplayName("Dynamic Island Expanded")

        attributes
            .previewContext(state, viewKind: .dynamicIsland(.minimal))
            .previewDisplayName("Dynamic Island Minimal")
    }
}
#endif
