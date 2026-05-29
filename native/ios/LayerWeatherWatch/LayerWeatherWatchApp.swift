import SwiftUI
import WatchKit

@main
struct LayerWeatherWatchApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onAppear { scheduleHourlyRefresh() }
        }
        .backgroundTask(.appRefresh("com.layerweather.hourly")) {
            await performBackgroundRefresh()
        }
    }

    private func performBackgroundRefresh() async {
        do {
            let data = try await WatchWeatherService.shared.fetchWeather()
            data.persistToAppGroup()
        } catch {
            // Coordinates not yet synced or network unavailable — skip silently.
        }
        scheduleHourlyRefresh()
    }

    private func scheduleHourlyRefresh() {
        WKApplication.shared().scheduleBackgroundRefresh(
            withPreferredDate: Date().addingTimeInterval(weatherFreshnessInterval),
            userInfo: nil
        ) { _ in }
    }
}
