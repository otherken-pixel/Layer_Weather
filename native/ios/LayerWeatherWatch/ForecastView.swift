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
        VStack(spacing: 0) {
            // Header
            headerView
                .padding(.horizontal, 8)
                .padding(.top, 2)
                .padding(.bottom, 4)

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
                .padding(.horizontal, 8)
                .padding(.bottom, 12)
            }
            .focusable(true)
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
        .background(
            WatchSkyGradient.gradient(
                condition: snapshot.condition,
                isDay: snapshot.isDay,
                hour: Calendar.current.component(.hour, from: Date())
            )
            .ignoresSafeArea()
        )
        .sheet(item: $selectedEntry) { entry in
            HourlyDetailSheet(entry: entry)
        }
    }

    // MARK: - Header

    private var headerView: some View {
        HStack(spacing: 6) {
            VStack(alignment: .leading, spacing: 1) {
                Text("Next 24 Hours")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)

                Text(Date(), format: .dateTime.weekday(.wide).month().day())
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.6))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }

            Spacer(minLength: 4)

            Image(systemName: "clock.fill")
                .font(.caption)
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
        HStack(spacing: 6) {
            // Hour label
            Text(entry.formattedHour)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .frame(width: 40, alignment: .leading)

            // Condition icon
            Image(systemName: watchConditionSymbol(entry.condition, isDay: entry.isDay))
                .symbolRenderingMode(.multicolor)
                .font(.footnote)
                .frame(width: 18)

            // Temperature
            Text("\(Int(entry.temp.rounded()))°")
                .font(.caption.weight(.bold))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .frame(width: 30, alignment: .leading)

            // Precipitation probability bar
            precipBar(entry.precipProb)

            // Tier color dot
            Circle()
                .fill(tierColor)
                .frame(width: 7, height: 7)
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 8)
        .frame(maxWidth: .infinity)
        .background(.white.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
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
        VStack(spacing: 6) {
            // Time
            Text(entry.formattedHour)
                .font(.headline.weight(.semibold))
                .foregroundStyle(.white.opacity(0.85))
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            // Condition icon + temp
            HStack(spacing: 6) {
                Image(systemName: watchConditionSymbol(entry.condition, isDay: entry.isDay))
                    .symbolRenderingMode(.multicolor)
                    .font(.title2)

                Text("\(Int(entry.temp.rounded()))°")
                    .font(.system(.largeTitle, design: .rounded).weight(.bold))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
            }

            // Feels like
            Text("Feels \(Int(entry.feelsLike.rounded()))°")
                .font(.caption)
                .foregroundStyle(.white.opacity(0.7))
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            // Stats row
            HStack(spacing: 12) {
                VStack(spacing: 2) {
                    Image(systemName: "drop.fill")
                        .font(.caption)
                        .foregroundStyle(Color(red: 0.38, green: 0.62, blue: 0.98))
                    Text("\(Int(entry.precipProb))%")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                }

                VStack(spacing: 2) {
                    Circle()
                        .fill(tierColor)
                        .frame(width: 12, height: 12)
                    Text(entry.warmthTier.replacingOccurrences(of: "warmth_", with: "T"))
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.7))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
            }
            .padding(10)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

            Button("Dismiss") { dismiss() }
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.6))
        }
        .padding(8)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(
            WatchSkyGradient.gradient(
                condition: entry.condition,
                isDay: entry.isDay,
                hour: Calendar.current.component(.hour, from: entry.hourDate ?? Date())
            )
            .ignoresSafeArea()
        )
    }
}

// MARK: - Preview

#Preview {
    ForecastView(data: .placeholder)
}
