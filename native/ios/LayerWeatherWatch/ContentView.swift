import SwiftUI

// MARK: - ContentView

struct ContentView: View {
    @StateObject var connectivity = WatchConnectivityManager()
    @State private var selectedTab = 0
    @State private var isRefreshing = false
    @State private var refreshError: String?

    private var widgetData: WidgetData {
        connectivity.widgetData ?? .load()
    }

    var body: some View {
        Group {
            if connectivity.widgetData == nil && !hasLocalData {
                noDataView
            } else {
                mainTabView
            }
        }
        .onAppear {
            connectivity.requestUpdate()
        }
    }

    // MARK: - Main Tab View

    private var mainTabView: some View {
        TabView(selection: $selectedTab) {
            // Tab 1: Outfit (Primary)
            OutfitView(data: widgetData)
                .tag(0)

            // Tab 2: Forecast
            ForecastView(data: widgetData)
                .tag(1)

            // Tab 3: Hair Forecast
            HairForecastView(data: widgetData)
                .tag(2)

            // Tab 4: Calibrate
            QuickCalibrateView(data: widgetData)
                .tag(3)
        }
        .tabViewStyle(.page)
        .toolbar {
            ToolbarItemGroup(placement: .bottomBar) {
                // Page indicator dots are rendered automatically by .page style
            }
        }
        .onChange(of: selectedTab) { _, _ in
            HapticManager.shared.playClick()
        }
    }

    // MARK: - No Data View

    private var noDataView: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.10, green: 0.14, blue: 0.28),
                    Color(red: 0.06, green: 0.08, blue: 0.18)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 12) {
                if isRefreshing {
                    loadingView
                } else {
                    promptView
                }
            }
            .padding()
        }
    }

    private var loadingView: some View {
        VStack(spacing: 10) {
            ProgressView()
                .progressViewStyle(.circular)
                .tint(.white)
                .scaleEffect(1.4)

            Text("Loading...")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(.white.opacity(0.7))
        }
    }

    private var promptView: some View {
        VStack(spacing: 10) {
            Image(systemName: "cloud.sun.fill")
                .symbolRenderingMode(.multicolor)
                .font(.system(size: 36))

            Text("No Weather Data")
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundStyle(.white)

            Text("Open Layer Weather on your iPhone to sync data")
                .font(.system(size: 11))
                .foregroundStyle(.white.opacity(0.65))
                .multilineTextAlignment(.center)

            if let error = refreshError {
                Text(error)
                    .font(.system(size: 10))
                    .foregroundStyle(.red.opacity(0.8))
                    .multilineTextAlignment(.center)
                    .padding(.top, 4)
            }

            Button {
                refreshFromWatch()
            } label: {
                Label("Refresh", systemImage: "arrow.clockwise")
                    .font(.system(size: 12, weight: .semibold))
            }
            .buttonStyle(.borderedProminent)
            .tint(Color(red: 0.31, green: 0.56, blue: 0.96))
            .padding(.top, 4)
        }
    }

    // MARK: - Helpers

    private var hasLocalData: Bool {
        let defaults = UserDefaults(suiteName: AppGroupKeys.suiteName)
        // Values are stored as strings by WidgetBridgePlugin
        return defaults?.string(forKey: AppGroupKeys.snapshot) != nil
    }

    private func refreshFromWatch() {
        isRefreshing = true
        refreshError = nil
        HapticManager.shared.playClick()

        // Try WCSession first
        connectivity.requestUpdate()

        // Fallback to direct weather fetch after a short delay
        Task {
            do {
                let data = try await WatchWeatherService.shared.fetchWeather()
                await MainActor.run {
                    connectivity.widgetData = data
                    isRefreshing = false
                    HapticManager.shared.playSuccess()
                }
            } catch {
                await MainActor.run {
                    refreshError = error.localizedDescription
                    isRefreshing = false
                    HapticManager.shared.playWarning()
                }
            }
        }
    }
}

// MARK: - Preview

#Preview {
    ContentView()
}
