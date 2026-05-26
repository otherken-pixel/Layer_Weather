import SwiftUI
import WidgetKit

// MARK: - SmallWidgetView

struct SmallWidgetView: View {
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
            // Background gradient
            gradient
                .ignoresSafeArea()

            VStack(alignment: .leading, spacing: 0) {
                // Location name
                HStack {
                    Text(snapshot.location)
                        .font(.system(size: 10, weight: .semibold, design: .rounded))
                        .textCase(.uppercase)
                        .foregroundStyle(.white.opacity(0.8))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)

                    Spacer()

                    if snapshot.isStale {
                        StaleIndicator()
                    }
                }

                Spacer()

                // Temperature — giant
                HStack(alignment: .top, spacing: 0) {
                    Text("\(Int(snapshot.temp.rounded()))°")
                        .font(.system(size: 52, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .minimumScaleFactor(0.6)
                        .lineLimit(1)

                    Spacer()

                    // Condition icon top-right
                    ConditionIcon(
                        condition: snapshot.condition,
                        isDay: snapshot.isDay,
                        size: 22
                    )
                    .padding(.top, 6)
                }

                // Feels like
                Text("Feels \(Int(snapshot.feelsLike.rounded()))°")
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundStyle(.white.opacity(0.75))

                Spacer(minLength: 6)

                // Tier color bar at bottom
                TierBar(tier: snapshot.warmthTier, color: tierColor)
            }
            .padding(12)
        }
    }
}

// MARK: - Preview

#Preview("Small Widget", as: .systemSmall) {
    LayerWeatherSmallWidget()
} timeline: {
    WeatherEntry.placeholder
}
