import WidgetKit
import SwiftUI

// MARK: - Small Widget

struct LayerWeatherSmallWidget: Widget {
    let kind: String = "LayerWeatherSmallWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WeatherTimelineProvider()) { entry in
            SmallWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    let hour = Calendar.current.component(.hour, from: entry.date)
                    let snapshot = entry.widgetData.snapshot ?? .placeholder
                    SkyGradient.gradient(
                        condition: snapshot.condition,
                        isDay: snapshot.isDay,
                        hour: hour
                    )
                }
        }
        .configurationDisplayName("Layer Weather")
        .description("Current temperature and your recommended outfit at a glance.")
        .supportedFamilies([.systemSmall])
    }
}

// MARK: - Medium Widget

struct LayerWeatherMediumWidget: Widget {
    let kind: String = "LayerWeatherMediumWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WeatherTimelineProvider()) { entry in
            MediumWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    let hour = Calendar.current.component(.hour, from: entry.date)
                    let snapshot = entry.widgetData.snapshot ?? .placeholder
                    SkyGradient.gradient(
                        condition: snapshot.condition,
                        isDay: snapshot.isDay,
                        hour: hour
                    )
                }
        }
        .configurationDisplayName("Layer Weather Outfit")
        .description("Current conditions plus your full outfit recommendation and hourly forecast.")
        .supportedFamilies([.systemMedium])
    }
}

// MARK: - Large Widget

struct LayerWeatherLargeWidget: Widget {
    let kind: String = "LayerWeatherLargeWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WeatherTimelineProvider()) { entry in
            LargeWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    let hour = Calendar.current.component(.hour, from: entry.date)
                    let snapshot = entry.widgetData.snapshot ?? .placeholder
                    SkyGradient.gradient(
                        condition: snapshot.condition,
                        isDay: snapshot.isDay,
                        hour: hour
                    )
                }
        }
        .configurationDisplayName("Layer Weather Day Planner")
        .description("Full day outfit planner with morning, afternoon, and evening recommendations plus 7-day forecast.")
        .supportedFamilies([.systemLarge])
    }
}

// MARK: - Lock Screen Widget

struct LayerWeatherLockScreenWidget: Widget {
    let kind: String = "LayerWeatherLockScreenWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WeatherTimelineProvider()) { entry in
            LockScreenWidgetSwitchView(entry: entry)
                .containerBackground(.clear, for: .widget)
        }
        .configurationDisplayName("Layer Weather Lock")
        .description("Temperature and outfit recommendation for your lock screen.")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline
        ])
    }
}

// MARK: - Lock Screen Switch View

struct LockScreenWidgetSwitchView: View {
    @Environment(\.widgetFamily) var family
    let entry: WeatherEntry

    var body: some View {
        switch family {
        case .accessoryCircular:
            LockCircularView(entry: entry)
        case .accessoryRectangular:
            LockRectangularView(entry: entry)
        case .accessoryInline:
            LockInlineView(entry: entry)
        default:
            LockCircularView(entry: entry)
        }
    }
}

// MARK: - Interactive Widget (iOS 17+)

#if canImport(AppIntents)
@available(iOS 17, *)
struct LayerWeatherInteractiveWidget: Widget {
    let kind: String = "LayerWeatherInteractiveWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WeatherTimelineProvider()) { entry in
            InteractiveWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    let hour = Calendar.current.component(.hour, from: entry.date)
                    let snapshot = entry.widgetData.snapshot ?? .placeholder
                    SkyGradient.gradient(
                        condition: snapshot.condition,
                        isDay: snapshot.isDay,
                        hour: hour
                    )
                }
        }
        .configurationDisplayName("Layer Weather Calibrate")
        .description("See your outfit and quickly tell us how it feels to improve future recommendations.")
        .supportedFamilies([.systemSmall])
    }
}
#endif

// MARK: - Widget Bundle

@main
struct LayerWeatherWidgetBundle: WidgetBundle {
    var body: some Widget {
        LayerWeatherSmallWidget()
        LayerWeatherMediumWidget()
        LayerWeatherLargeWidget()
        LayerWeatherLockScreenWidget()
        interactiveWidget
    }

    @WidgetBundleBuilder
    var interactiveWidget: some Widget {
        if #available(iOS 17, *) {
            #if canImport(AppIntents)
            LayerWeatherInteractiveWidget()
            #endif
        }
    }
}
