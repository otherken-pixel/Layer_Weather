import WidgetKit
import SwiftUI

// MARK: - Watch Timeline Provider

struct WatchTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> WeatherEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (WeatherEntry) -> Void) {
        if context.isPreview {
            completion(.placeholder)
            return
        }
        let data = WidgetData.load()
        completion(WeatherEntry(date: Date(), widgetData: data, accentColor: Color(hex: data.accentColor)))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WeatherEntry>) -> Void) {
        let data = WidgetData.load()
        let entry = WeatherEntry(date: Date(), widgetData: data, accentColor: Color(hex: data.accentColor))
        let refresh = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(refresh)))
    }
}

// MARK: - WeatherEntry (reused from WatchSharedModels context)

struct WeatherEntry: TimelineEntry {
    let date: Date
    let widgetData: WidgetData
    let accentColor: Color

    static var placeholder: WeatherEntry {
        WeatherEntry(date: Date(), widgetData: .placeholder, accentColor: Color(hex: "#4F8EF7"))
    }
}

// MARK: - Shared SF Symbol helper

private func wSymbol(_ condition: String, isDay: Bool) -> String {
    switch condition {
    case "clear":        return isDay ? "sun.max.fill" : "moon.stars.fill"
    case "partly_cloudy": return isDay ? "cloud.sun.fill" : "cloud.moon.fill"
    case "cloudy":       return "cloud.fill"
    case "foggy":        return "cloud.fog.fill"
    case "drizzle":      return "cloud.drizzle.fill"
    case "rain":         return "cloud.rain.fill"
    case "heavy_rain":   return "cloud.heavyrain.fill"
    case "snow":         return "cloud.snow.fill"
    case "thunderstorm": return "cloud.bolt.rain.fill"
    default:             return isDay ? "sun.max.fill" : "moon.stars.fill"
    }
}

private func wTierColor(_ tier: String) -> Color {
    switch tier {
    case "warmth_1": return Color(red: 0.95, green: 0.28, blue: 0.12)
    case "warmth_2": return Color(red: 0.98, green: 0.50, blue: 0.12)
    case "warmth_3": return Color(red: 0.98, green: 0.78, blue: 0.18)
    case "warmth_4": return Color(red: 0.22, green: 0.78, blue: 0.38)
    case "warmth_5": return Color(red: 0.28, green: 0.58, blue: 0.95)
    case "warmth_6": return Color(red: 0.12, green: 0.28, blue: 0.78)
    case "warmth_1_rain", "warmth_2_rain", "warmth_3_rain": return Color(red: 0.38, green: 0.55, blue: 0.78)
    case "warmth_6_snow": return Color(red: 0.72, green: 0.86, blue: 0.98)
    default: return Color(red: 0.50, green: 0.65, blue: 0.85)
    }
}

// MARK: - Graphic Circular

struct GraphicCircularComplication: Widget {
    let kind = "LayerWeatherGraphicCircular"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WatchTimelineProvider()) { entry in
            GraphicCircularView(entry: entry)
                .containerBackground(.clear, for: .widget)
        }
        .configurationDisplayName("Layer Weather")
        .description("Temperature with weather ring.")
        .supportedFamilies([.accessoryCircular])
    }
}

struct GraphicCircularView: View {
    let entry: WeatherEntry
    private var snapshot: WidgetSnapshot { entry.widgetData.snapshot ?? .placeholder }
    private var tempNorm: Double { max(0, min(1, (snapshot.temp - 0) / 110)) }

    var body: some View {
        Gauge(value: tempNorm) {
            EmptyView()
        } currentValueLabel: {
            Text("\(Int(snapshot.temp.rounded()))°")
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .widgetAccentable()
        } minimumValueLabel: {
            Image(systemName: wSymbol(snapshot.condition, isDay: snapshot.isDay))
                .font(.system(size: 9))
        } maximumValueLabel: {
            EmptyView()
        }
        .gaugeStyle(.accessoryCircular)
        .tint(wTierColor(snapshot.warmthTier))
    }
}

// MARK: - Graphic Rectangular

struct GraphicRectangularComplication: Widget {
    let kind = "LayerWeatherGraphicRectangular"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WatchTimelineProvider()) { entry in
            GraphicRectangularView(entry: entry)
                .containerBackground(.clear, for: .widget)
        }
        .configurationDisplayName("Layer Weather Outfit")
        .description("Location, outfit, and temperature.")
        .supportedFamilies([.accessoryRectangular])
    }
}

struct GraphicRectangularView: View {
    let entry: WeatherEntry
    private var snapshot: WidgetSnapshot { entry.widgetData.snapshot ?? .placeholder }

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            // Line 1: Location
            HStack(spacing: 3) {
                Image(systemName: "location.fill")
                    .font(.system(size: 8))
                    .foregroundStyle(.secondary)
                Text(snapshot.location)
                    .font(.system(size: 10, weight: .medium, design: .rounded))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            // Line 2: Outfit label
            Text(snapshot.outfitLabel)
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
                .widgetAccentable()

            // Line 3: Temp + condition
            HStack(spacing: 4) {
                Text("\(Int(snapshot.temp.rounded()))°")
                    .font(.system(size: 12, weight: .semibold, design: .rounded))

                Image(systemName: wSymbol(snapshot.condition, isDay: snapshot.isDay))
                    .symbolRenderingMode(.multicolor)
                    .font(.system(size: 11))

                if snapshot.precipProb > 15 {
                    Text("· \(Int(snapshot.precipProb))%")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
}

// MARK: - Graphic Corner

struct GraphicCornerComplication: Widget {
    let kind = "LayerWeatherGraphicCorner"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WatchTimelineProvider()) { entry in
            GraphicCornerView(entry: entry)
                .containerBackground(.clear, for: .widget)
        }
        .configurationDisplayName("Layer Weather")
        .description("Temperature arc in tier color.")
        .supportedFamilies([.accessoryCorner])
    }
}

struct GraphicCornerView: View {
    let entry: WeatherEntry
    private var snapshot: WidgetSnapshot { entry.widgetData.snapshot ?? .placeholder }
    private var tempNorm: Double { max(0, min(1, (snapshot.temp - 0) / 110)) }

    var body: some View {
        Gauge(value: tempNorm) {
            EmptyView()
        } currentValueLabel: {
            Image(systemName: wSymbol(snapshot.condition, isDay: snapshot.isDay))
                .symbolRenderingMode(.hierarchical)
                .widgetAccentable()
        }
        .gaugeStyle(.accessoryCircularCapacity)
        .tint(wTierColor(snapshot.warmthTier))
        .widgetLabel {
            Text("\(Int(snapshot.temp.rounded()))° · \(snapshot.outfitLabel)")
                .widgetAccentable()
        }
    }
}

// MARK: - Inline Complication

struct InlineComplication: Widget {
    let kind = "LayerWeatherInline"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WatchTimelineProvider()) { entry in
            InlineComplicationView(entry: entry)
                .containerBackground(.clear, for: .widget)
        }
        .configurationDisplayName("Layer Weather")
        .description("Temperature and outfit on one line.")
        .supportedFamilies([.accessoryInline])
    }
}

struct InlineComplicationView: View {
    let entry: WeatherEntry
    private var snapshot: WidgetSnapshot { entry.widgetData.snapshot ?? .placeholder }

    var body: some View {
        ViewThatFits {
            Label(
                "\(Int(snapshot.temp.rounded()))° · \(snapshot.outfitLabel) · \(Int(snapshot.precipProb))%",
                systemImage: wSymbol(snapshot.condition, isDay: snapshot.isDay)
            )
            Label(
                "\(Int(snapshot.temp.rounded()))° · \(snapshot.outfitLabel)",
                systemImage: wSymbol(snapshot.condition, isDay: snapshot.isDay)
            )
            Text("\(Int(snapshot.temp.rounded()))°")
        }
        .widgetAccentable()
    }
}

// MARK: - Widget Bundle

@main
struct LayerWeatherWatchComplications: WidgetBundle {
    var body: some Widget {
        GraphicCircularComplication()
        GraphicRectangularComplication()
        GraphicCornerComplication()
        InlineComplication()
    }
}
