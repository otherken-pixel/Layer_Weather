import SwiftUI
import WidgetKit

// MARK: - WMO Code to SF Symbol

func sfSymbol(for weatherCode: Int, isDay: Bool) -> String {
    switch weatherCode {
    case 0:
        return isDay ? "sun.max.fill" : "moon.stars.fill"
    case 1:
        return isDay ? "sun.max.fill" : "moon.fill"
    case 2:
        return isDay ? "cloud.sun.fill" : "cloud.moon.fill"
    case 3:
        return "cloud.fill"
    case 45, 48:
        return "cloud.fog.fill"
    case 51, 53, 55:
        return "cloud.drizzle.fill"
    case 56, 57:
        return "cloud.sleet.fill"
    case 61, 63:
        return "cloud.rain.fill"
    case 65:
        return "cloud.heavyrain.fill"
    case 66, 67:
        return "cloud.sleet.fill"
    case 71, 73, 75:
        return "cloud.snow.fill"
    case 77:
        return "snowflake"
    case 80, 81, 82:
        return "cloud.rain.fill"
    case 85, 86:
        return "cloud.snow.fill"
    case 95:
        return "cloud.bolt.fill"
    case 96, 99:
        return "cloud.bolt.rain.fill"
    default:
        return isDay ? "sun.max.fill" : "moon.stars.fill"
    }
}

// MARK: - Condition String to SF Symbol

func conditionSFSymbol(condition: String, isDay: Bool) -> String {
    switch condition {
    case "clear":
        return isDay ? "sun.max.fill" : "moon.stars.fill"
    case "partly_cloudy":
        return isDay ? "cloud.sun.fill" : "cloud.moon.fill"
    case "cloudy":
        return "cloud.fill"
    case "foggy":
        return "cloud.fog.fill"
    case "drizzle":
        return "cloud.drizzle.fill"
    case "rain":
        return "cloud.rain.fill"
    case "heavy_rain":
        return "cloud.heavyrain.fill"
    case "snow":
        return "cloud.snow.fill"
    case "thunderstorm":
        return "cloud.bolt.rain.fill"
    default:
        return isDay ? "sun.max.fill" : "moon.stars.fill"
    }
}

// MARK: - SunBar

struct SunBar: View {
    let sunrise: Date?
    let sunset: Date?
    var now: Date = Date()

    private var progress: Double {
        guard let rise = sunrise, let set = sunset else { return 0.5 }
        let span = set.timeIntervalSince(rise)
        guard span > 0 else { return 0.5 }
        return max(0, min(1, now.timeIntervalSince(rise) / span))
    }

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(.white.opacity(0.18))
                    .frame(height: 4)
                Capsule()
                    .fill(LinearGradient(
                        colors: [Color(hex: "#FFB300"), Color(hex: "#FF6B00")],
                        startPoint: .leading,
                        endPoint: .trailing
                    ))
                    .frame(width: max(6, geo.size.width * progress), height: 4)
            }
        }
        .frame(height: 4)
    }
}

// MARK: - ConditionIcon

struct ConditionIcon: View {
    let condition: String
    let isDay: Bool
    let size: CGFloat

    private var symbolName: String {
        conditionSFSymbol(condition: condition, isDay: isDay)
    }

    var body: some View {
        Image(systemName: symbolName)
            .symbolRenderingMode(.multicolor)
            .font(.system(size: size, weight: .medium))
    }
}

// MARK: - HourlyStrip

struct HourlyStrip: View {
    let entries: [HourlyWidgetEntry]
    let accentColor: Color

    private var displayEntries: [HourlyWidgetEntry] {
        Array(entries.prefix(5))
    }

    var body: some View {
        HStack(spacing: 0) {
            ForEach(displayEntries) { entry in
                VStack(spacing: 2) {
                    Text(entry.formattedHour)
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(.white.opacity(0.7))

                    Image(systemName: conditionSFSymbol(condition: entry.condition, isDay: entry.isDay))
                        .symbolRenderingMode(.multicolor)
                        .font(.system(size: 12))

                    Text("\(Int(entry.temp.rounded()))°")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.white)

                    if entry.precipProb > 10 {
                        Text("\(Int(entry.precipProb))%")
                            .font(.system(size: 8, weight: .regular))
                            .foregroundStyle(accentColor.opacity(0.9))
                    } else {
                        Text(" ")
                            .font(.system(size: 8))
                    }
                }
                .frame(maxWidth: .infinity)
            }
        }
    }
}

// MARK: - AccessoryDots

struct AccessoryDots: View {
    let snapshot: WidgetSnapshot
    let color: Color

    var body: some View {
        HStack(spacing: 6) {
            accessoryDot(symbol: "umbrella.fill", active: snapshot.umbrella)
            accessoryDot(symbol: "sunglasses.fill", active: snapshot.sunglasses)
            accessoryDot(symbol: "wind.snow", active: snapshot.scarf)
            accessoryDot(symbol: "hand.raised.fill", active: snapshot.gloves)
            accessoryDot(symbol: "person.bust.fill", active: snapshot.beanie)
        }
    }

    @ViewBuilder
    private func accessoryDot(symbol: String, active: Bool) -> some View {
        Image(systemName: symbol)
            .font(.system(size: 11, weight: .medium))
            .foregroundStyle(active ? color : Color.white.opacity(0.25))
    }
}

// MARK: - StaleIndicator

struct StaleIndicator: View {
    var body: some View {
        Text("↻")
            .font(.system(size: 10, weight: .medium))
            .foregroundStyle(.white.opacity(0.5))
    }
}

// MARK: - Color Tier Extension

extension Color {
    static func tierColor(from tier: String) -> Color {
        SkyGradient.tierColor(warmthTier: tier)
    }
}

// MARK: - Preview

#Preview("HourlyStrip", as: .systemMedium) {
    LayerWeatherMediumWidget()
} timeline: {
    WeatherEntry.placeholder
}
