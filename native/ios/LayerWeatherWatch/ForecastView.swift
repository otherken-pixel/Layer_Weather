import SwiftUI

// MARK: - ForecastView

struct ForecastView: View {
    let data: WidgetData

    @State private var selectedEntry: HourlyWidgetEntry?
    @State private var crownOffset: Double = 0
    @State private var scrollOffset: Double = 0

    private var snapshot: WidgetSnapshot {
        data.snapshot ?? .placeholder
    }

    private var hourlyEntries: [HourlyWidgetEntry] {
        data.hourly.isEmpty ? HourlyWidgetEntry.placeholders : data.hourly
    }

    var body: some View {
        ZStack {
            // Background gradient
            WatchSkyGradient.gradient(
                condition: snapshot.condition,
                isDay: snapshot.isDay,
                hour: Calendar.current.component(.hour, from: Date())
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                headerView
                    .padding(.horizontal, 8)
                    .padding(.top, 4)
                    .padding(.bottom, 6)

                // Hourly list
                ScrollView {
                    LazyVStack(spacing: 4) {
                        ForEach(hourlyEntries) { entry in
                            HourlyRowView(entry: entry)
                                .onTapGesture {
                                    selectedEntry = entry
                                    HapticManager.shared.playClick()
                                }
                        }
                    }
                    .padding(.horizontal, 6)
                    .padding(.bottom, 12)
                }
                .digitalCrownRotation(
                    $crownOffset,
                    from: 0,
                    through: Double(hourlyEntries.count) * 50,
                    by: 50,
                    sensitivity: .medium,
                    isContinuous: false,
                    isHapticFeedbackEnabled: true
                )
            }
        }
        .sheet(item: $selectedEntry) { entry in
            HourlyDetailSheet(entry: entry)
        }
    }

    // MARK: - Header

    private var headerView: some View {
        HStack {
            VStack(alignment: .leading, spacing: 1) {
                Text("Next 24 Hours")
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)

                Text(Date(), format: .dateTime.weekday(.wide).month().day())
                    .font(.system(size: 10))
                    .foregroundStyle(.white.opacity(0.6))
            }

            Spacer()

            Image(systemName: "clock.fill")
                .font(.system(size: 12))
                .foregroundStyle(.white.opacity(0.5))
        }
    }
}

// MARK: - HourlyRowView

struct HourlyRowView: View {
    let entry: HourlyWidgetEntry

    private var tierColor: Color {
        WatchSkyGradient.tierColor(warmthTier: entry.warmthTier)
    }

    private var precipColor: Color {
        Color(red: 0.38, green: 0.62, blue: 0.98)
    }

    var body: some View {
        HStack(spacing: 8) {
            // Hour label
            Text(entry.formattedHour)
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
                .frame(width: 42, alignment: .leading)

            // Condition icon
            Image(systemName: watchConditionSymbol(entry.condition, isDay: entry.isDay))
                .symbolRenderingMode(.multicolor)
                .font(.system(size: 14))
                .frame(width: 20)

            // Temperature
            Text("\(Int(entry.temp.rounded()))°")
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .frame(width: 32, alignment: .leading)

            // Precipitation probability bar
            precipBar(entry.precipProb)

            // Tier color dot
            Circle()
                .fill(tierColor)
                .frame(width: 7, height: 7)
        }
        .padding(.vertical, 7)
        .padding(.horizontal, 10)
        .background(.white.opacity(0.08))
        .cornerRadius(10)
    }

    private func precipBar(_ prob: Double) -> some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(.white.opacity(0.15))
                    .frame(height: 5)

                Capsule()
                    .fill(prob > 50 ? precipColor : precipColor.opacity(0.5))
                    .frame(width: geo.size.width * max(0, min(1, prob / 100)), height: 5)
            }
        }
        .frame(height: 5)
    }
}

// MARK: - HourlyDetailSheet

struct HourlyDetailSheet: View {
    let entry: HourlyWidgetEntry

    @Environment(\.dismiss) private var dismiss

    private var tierColor: Color {
        WatchSkyGradient.tierColor(warmthTier: entry.warmthTier)
    }

    var body: some View {
        ZStack {
            WatchSkyGradient.gradient(
                condition: entry.condition,
                isDay: entry.isDay,
                hour: Calendar.current.component(.hour, from: entry.hourDate ?? Date())
            )
            .ignoresSafeArea()

            VStack(spacing: 8) {
                // Time
                Text(entry.formattedHour)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.8))

                // Condition icon + temp
                HStack(spacing: 8) {
                    Image(systemName: watchConditionSymbol(entry.condition, isDay: entry.isDay))
                        .symbolRenderingMode(.multicolor)
                        .font(.system(size: 28))

                    Text("\(Int(entry.temp.rounded()))°")
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                }

                // Feels like
                Text("Feels \(Int(entry.feelsLike.rounded()))°")
                    .font(.system(size: 12))
                    .foregroundStyle(.white.opacity(0.7))

                // Stats row
                HStack(spacing: 16) {
                    VStack(spacing: 2) {
                        Image(systemName: "drop.fill")
                            .font(.system(size: 12))
                            .foregroundStyle(Color(red: 0.38, green: 0.62, blue: 0.98))
                        Text("\(Int(entry.precipProb))%")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(.white)
                    }

                    VStack(spacing: 2) {
                        Circle()
                            .fill(tierColor)
                            .frame(width: 12, height: 12)
                        Text(entry.warmthTier.replacingOccurrences(of: "warmth_", with: "T"))
                            .font(.system(size: 11))
                            .foregroundStyle(.white.opacity(0.7))
                    }
                }
                .padding(10)
                .background(.ultraThinMaterial)
                .cornerRadius(12)

                Button("Dismiss") { dismiss() }
                    .font(.system(size: 11))
                    .foregroundStyle(.white.opacity(0.6))
            }
            .padding()
        }
    }
}

// MARK: - Preview

#Preview {
    ForecastView(data: .placeholder)
}
