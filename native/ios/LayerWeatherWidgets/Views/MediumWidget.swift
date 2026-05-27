import SwiftUI
import WidgetKit

// MARK: - MediumWidgetView

struct MediumWidgetView: View {
    let entry: WeatherEntry

    private var snapshot: WidgetSnapshot {
        entry.widgetData.snapshot ?? .placeholder
    }

    private var hourly: [HourlyWidgetEntry] {
        entry.widgetData.hourly
    }

    private var tierColor: Color {
        SkyGradient.tierColor(warmthTier: snapshot.warmthTier)
    }

    var body: some View {
        ZStack {
            VStack(spacing: 0) {
                // Main content row
                HStack(spacing: 10) {
                    // LEFT COLUMN — weather conditions
                    leftColumn
                        .frame(maxWidth: .infinity, alignment: .leading)

                    // RIGHT COLUMN — outfit info with glassmorphism
                    rightColumn
                        .frame(maxWidth: .infinity)
                }
                .padding(.horizontal, 12)
                .padding(.top, 12)

                Spacer(minLength: 6)

                // BOTTOM STRIP — hourly forecast
                if !hourly.isEmpty {
                    Divider()
                        .background(.white.opacity(0.25))
                        .padding(.horizontal, 12)

                    HourlyStrip(entries: hourly, accentColor: entry.accentColor)
                        .padding(.horizontal, 12)
                        .padding(.bottom, 10)
                        .padding(.top, 6)
                }
            }
        }
    }

    // MARK: Left Column

    private var leftColumn: some View {
        VStack(alignment: .leading, spacing: 4) {
            // Location
            HStack(spacing: 4) {
                Text(snapshot.location)
                    .font(.system(size: 10, weight: .semibold, design: .rounded))
                    .textCase(.uppercase)
                    .foregroundStyle(.white.opacity(0.8))
                    .lineLimit(1)
                if snapshot.isStale {
                    StaleIndicator()
                }
            }

            // Temperature
            Text("\(Int(snapshot.temp.rounded()))°")
                .font(.system(size: 42, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .minimumScaleFactor(0.7)
                .lineLimit(1)

            // Feels like
            Text("Feels \(Int(snapshot.feelsLike.rounded()))°")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.white.opacity(0.75))

            Spacer(minLength: 4)

            // Condition icon + precip
            HStack(spacing: 6) {
                ConditionIcon(condition: snapshot.condition, isDay: snapshot.isDay, size: 20)

                if snapshot.precipProb > 5 {
                    Text("\(Int(snapshot.precipProb))%")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.85))
                }
            }

            // Tier bar
            TierBar(tier: snapshot.warmthTier, color: tierColor)
                .frame(width: 44)
        }
    }

    // MARK: Right Column (Glassmorphism)

    private var rightColumn: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Outfit label
            Text(snapshot.outfitLabel)
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(2)
                .minimumScaleFactor(0.8)

            // Garments
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Image(systemName: "tshirt.fill")
                        .font(.system(size: 9))
                        .foregroundStyle(.white.opacity(0.7))
                    Text(snapshot.garmentTop)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(.white.opacity(0.85))
                        .lineLimit(1)
                }

                if let bottom = snapshot.garmentBottom {
                    HStack(spacing: 4) {
                        Image(systemName: "figure.stand")
                            .font(.system(size: 9))
                            .foregroundStyle(.white.opacity(0.7))
                        Text(bottom)
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(.white.opacity(0.85))
                            .lineLimit(1)
                    }
                }

                HStack(spacing: 4) {
                    Image(systemName: "shoe.fill")
                        .font(.system(size: 9))
                        .foregroundStyle(.white.opacity(0.7))
                    Text(snapshot.footwear)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(.white.opacity(0.85))
                        .lineLimit(1)
                }
            }

            Spacer(minLength: 4)

            // Accessory dots
            AccessoryDots(snapshot: snapshot, color: entry.accentColor)
        }
        .padding(10)
        .background(.ultraThinMaterial)
        .cornerRadius(14)
    }
}

// MARK: - Preview

#Preview("Medium Widget", as: .systemMedium) {
    LayerWeatherMediumWidget()
} timeline: {
    WeatherEntry.placeholder
}
