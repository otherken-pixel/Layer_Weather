import SwiftUI
import WidgetKit

// MARK: - Lock Circular View

struct LockCircularView: View {
    let entry: WeatherEntry

    private var snapshot: WidgetSnapshot {
        entry.widgetData.snapshot ?? .placeholder
    }

    private var tierColor: Color {
        SkyGradient.tierColor(warmthTier: snapshot.warmthTier)
    }

    /// Normalize temp to a 0–1 gauge value (0°F = 0, 110°F = 1)
    private var tempNormalized: Double {
        max(0, min(1, (snapshot.temp - 0) / 110))
    }

    var body: some View {
        ZStack {
            Gauge(value: tempNormalized) {
                EmptyView()
            } currentValueLabel: {
                Text("\(Int(snapshot.temp.rounded()))°")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .minimumScaleFactor(0.7)
                    .widgetAccentable()
            }
            .gaugeStyle(.accessoryCircular)
            .tint(tierColor)
        }
    }
}

// MARK: - Lock Rectangular View

struct LockRectangularView: View {
    let entry: WeatherEntry

    private var snapshot: WidgetSnapshot {
        entry.widgetData.snapshot ?? .placeholder
    }

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: conditionSFSymbol(condition: snapshot.condition, isDay: snapshot.isDay))
                .symbolRenderingMode(.hierarchical)
                .font(.system(size: 22, weight: .medium))
                .widgetAccentable()
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 1) {
                Text("Wear \(snapshot.outfitLabel)")
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                    .widgetAccentable()

                Text("\(Int(snapshot.temp.rounded()))° · Feels \(Int(snapshot.feelsLike.rounded()))°")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer(minLength: 0)
        }
    }
}

// MARK: - Lock Inline View

struct LockInlineView: View {
    let entry: WeatherEntry

    private var snapshot: WidgetSnapshot {
        entry.widgetData.snapshot ?? .placeholder
    }

    var body: some View {
        // Inline text format: temp · outfit label · precip%
        ViewThatFits {
            Label(
                "\(Int(snapshot.temp.rounded()))° · \(snapshot.outfitLabel) · \(Int(snapshot.precipProb))%",
                systemImage: conditionSFSymbol(condition: snapshot.condition, isDay: snapshot.isDay)
            )

            Label(
                "\(Int(snapshot.temp.rounded()))° · \(snapshot.outfitLabel)",
                systemImage: conditionSFSymbol(condition: snapshot.condition, isDay: snapshot.isDay)
            )

            Text("\(Int(snapshot.temp.rounded()))° · \(snapshot.outfitLabel)")
        }
        .widgetAccentable()
    }
}

// MARK: - Lock Corner View

struct LockCornerView: View {
    let entry: WeatherEntry

    private var snapshot: WidgetSnapshot {
        entry.widgetData.snapshot ?? .placeholder
    }

    private var tierColor: Color {
        SkyGradient.tierColor(warmthTier: snapshot.warmthTier)
    }

    private var precipNormalized: Double {
        max(0, min(1, snapshot.precipProb / 100))
    }

    var body: some View {
        Gauge(value: precipNormalized) {
            EmptyView()
        } currentValueLabel: {
            Image(systemName: conditionSFSymbol(condition: snapshot.condition, isDay: snapshot.isDay))
                .symbolRenderingMode(.hierarchical)
                .widgetAccentable()
        } minimumValueLabel: {
            Text("\(Int(snapshot.temp.rounded()))°")
                .font(.system(size: 11, weight: .semibold))
        } maximumValueLabel: {
            Text("\(Int(snapshot.precipProb))%")
                .font(.system(size: 11, weight: .semibold))
        }
        .gaugeStyle(.accessoryCircularCapacity)
        .tint(
            snapshot.precipProb > 50
            ? Color(red: 0.38, green: 0.62, blue: 0.95)
            : tierColor
        )
        .widgetLabel {
            Text("\(Int(snapshot.temp.rounded()))°F · \(snapshot.outfitLabel)")
                .widgetAccentable()
        }
    }
}

// MARK: - Preview

#Preview("Lock Circular", as: .accessoryCircular) {
    LayerWeatherLockScreenWidget()
} timeline: {
    WeatherEntry.placeholder
}

#Preview("Lock Rectangular", as: .accessoryRectangular) {
    LayerWeatherLockScreenWidget()
} timeline: {
    WeatherEntry.placeholder
}

#Preview("Lock Inline", as: .accessoryInline) {
    LayerWeatherLockScreenWidget()
} timeline: {
    WeatherEntry.placeholder
}
