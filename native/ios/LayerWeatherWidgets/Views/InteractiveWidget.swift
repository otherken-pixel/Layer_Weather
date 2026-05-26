import SwiftUI
import WidgetKit

#if canImport(AppIntents)
import AppIntents

// MARK: - Feedback App Intents

@available(iOS 17, *)
struct TooHotIntent: AppIntent {
    static var title: LocalizedStringResource = "Too Warm"
    static var description = IntentDescription("Mark current outfit as too warm")

    func perform() async throws -> some IntentResult {
        UserDefaults.writeFeedback("too_warm")
        return .result()
    }
}

@available(iOS 17, *)
struct JustRightIntent: AppIntent {
    static var title: LocalizedStringResource = "Just Right"
    static var description = IntentDescription("Mark current outfit as just right")

    func perform() async throws -> some IntentResult {
        UserDefaults.writeFeedback("just_right")
        return .result()
    }
}

@available(iOS 17, *)
struct TooColdIntent: AppIntent {
    static var title: LocalizedStringResource = "Too Cold"
    static var description = IntentDescription("Mark current outfit as too cold")

    func perform() async throws -> some IntentResult {
        UserDefaults.writeFeedback("too_cold")
        return .result()
    }
}

// MARK: - Interactive Widget View

@available(iOS 17, *)
struct InteractiveWidgetView: View {
    let entry: WeatherEntry

    private var snapshot: WidgetSnapshot {
        entry.widgetData.snapshot ?? .placeholder
    }

    private var gradient: LinearGradient {
        let hour = Calendar.current.component(.hour, from: entry.date)
        return SkyGradient.gradient(
            condition: snapshot.condition,
            isDay: snapshot.isDay,
            hour: hour
        )
    }

    private var tierColor: Color {
        SkyGradient.tierColor(warmthTier: snapshot.warmthTier)
    }

    var body: some View {
        ZStack {
            gradient.ignoresSafeArea()

            VStack(spacing: 6) {
                // Outfit label + temp
                VStack(spacing: 2) {
                    Text(snapshot.outfitLabel)
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                        .multilineTextAlignment(.center)
                        .minimumScaleFactor(0.8)

                    HStack(spacing: 4) {
                        Text("\(Int(snapshot.temp.rounded()))°")
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)

                        ConditionIcon(
                            condition: snapshot.condition,
                            isDay: snapshot.isDay,
                            size: 16
                        )
                    }
                }

                // Tier bar
                TierBar(tier: snapshot.warmthTier, color: tierColor)
                    .frame(width: 40)

                Spacer(minLength: 2)

                // Feedback buttons
                VStack(spacing: 5) {
                    feedbackLabel

                    HStack(spacing: 6) {
                        // Too Cold
                        Button(intent: TooColdIntent()) {
                            feedbackButton(emoji: "🥶", label: "Cold", color: Color(hex: "#5B8AF5"))
                        }
                        .buttonStyle(.plain)

                        // Just Right
                        Button(intent: JustRightIntent()) {
                            feedbackButton(emoji: "👍", label: "Right", color: Color(hex: "#34C759"))
                        }
                        .buttonStyle(.plain)

                        // Too Warm
                        Button(intent: TooHotIntent()) {
                            feedbackButton(emoji: "🥵", label: "Warm", color: Color(hex: "#FF6B35"))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(12)
        }
    }

    private var feedbackLabel: some View {
        Text("How's it feel?")
            .font(.system(size: 9, weight: .medium))
            .foregroundStyle(.white.opacity(0.65))
    }

    private func feedbackButton(emoji: String, label: String, color: Color) -> some View {
        VStack(spacing: 1) {
            Text(emoji)
                .font(.system(size: 14))
            Text(label)
                .font(.system(size: 8, weight: .semibold))
                .foregroundStyle(.white.opacity(0.85))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 5)
        .background(color.opacity(0.35))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .strokeBorder(color.opacity(0.6), lineWidth: 0.5)
        )
        .cornerRadius(8)
    }
}

// MARK: - Preview

@available(iOS 17, *)
#Preview("Interactive Widget", as: .systemSmall) {
    LayerWeatherInteractiveWidget()
} timeline: {
    WeatherEntry.placeholder
}

#endif // canImport(AppIntents)
