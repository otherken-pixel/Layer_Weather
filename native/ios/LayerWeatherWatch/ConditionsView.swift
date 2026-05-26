import SwiftUI

// MARK: - ConditionsView

struct ConditionsView: View {
    let data: WidgetData

    private var snapshot: WidgetSnapshot {
        data.snapshot ?? .placeholder
    }

    private var hourly: [HourlyWidgetEntry] {
        data.hourly
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

            ScrollView {
                VStack(spacing: 10) {
                    // Header
                    Text("Conditions")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.top, 4)

                    // Wind
                    windCard

                    // Humidity
                    humidityCard

                    // AQI
                    if let aqi = snapshot.aqiIndex {
                        aqiCard(aqi)
                    }

                    // Next-hour precipitation bars
                    precipitationCard

                    // UV placeholder (not in model; shown as derived)
                    uvCard
                }
                .padding(.horizontal, 8)
                .padding(.bottom, 16)
            }
        }
    }

    // MARK: - Wind Card

    private var windCard: some View {
        HStack(spacing: 10) {
            Image(systemName: "wind")
                .font(.system(size: 18))
                .foregroundStyle(Color(red: 0.55, green: 0.82, blue: 0.98))
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 2) {
                Text("Wind")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(.white.opacity(0.6))
                HStack(spacing: 4) {
                    Text("\(Int(snapshot.windSpeed.rounded())) mph")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                }
            }

            Spacer()

            // Wind direction arrow (generic N since model doesn't carry degrees)
            Image(systemName: "arrow.up.circle.fill")
                .font(.system(size: 20))
                .foregroundStyle(.white.opacity(0.5))
                .rotationEffect(.degrees(windDirectionDegrees))
        }
        .padding(10)
        .background(.ultraThinMaterial)
        .cornerRadius(12)
    }

    private var windDirectionDegrees: Double {
        // Approximate from wind speed for demo; real value would come from model
        return Double(Int(snapshot.windSpeed) % 360)
    }

    // MARK: - Humidity Card

    private var humidityCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "humidity.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(Color(red: 0.38, green: 0.62, blue: 0.98))
                Text("Humidity")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.white.opacity(0.8))
                Spacer()
                Text("\(Int(snapshot.humidity.rounded()))%")
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
            }

            Gauge(value: snapshot.humidity / 100) {
                EmptyView()
            }
            .gaugeStyle(.accessoryLinearCapacity)
            .tint(humidityColor(snapshot.humidity))
        }
        .padding(10)
        .background(.ultraThinMaterial)
        .cornerRadius(12)
    }

    private func humidityColor(_ humidity: Double) -> Color {
        switch humidity {
        case 0..<30: return Color(red: 0.98, green: 0.78, blue: 0.18)
        case 30..<60: return Color(red: 0.22, green: 0.78, blue: 0.38)
        case 60..<80: return Color(red: 0.28, green: 0.58, blue: 0.95)
        default: return Color(red: 0.38, green: 0.42, blue: 0.90)
        }
    }

    // MARK: - AQI Card

    private func aqiCard(_ aqi: Int) -> some View {
        HStack(spacing: 10) {
            Circle()
                .fill(aqiColor(aqi))
                .frame(width: 14, height: 14)

            VStack(alignment: .leading, spacing: 2) {
                Text("Air Quality")
                    .font(.system(size: 10))
                    .foregroundStyle(.white.opacity(0.6))
                Text(aqiLabel(aqi))
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white)
            }

            Spacer()

            Text("\(aqi)")
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundStyle(aqiColor(aqi))
        }
        .padding(10)
        .background(.ultraThinMaterial)
        .cornerRadius(12)
    }

    private func aqiColor(_ aqi: Int) -> Color {
        switch aqi {
        case 0..<50: return .green
        case 50..<100: return .yellow
        case 100..<150: return .orange
        case 150..<200: return .red
        case 200..<300: return Color(red: 0.6, green: 0.0, blue: 0.4)
        default: return Color(red: 0.5, green: 0.0, blue: 0.2)
        }
    }

    private func aqiLabel(_ aqi: Int) -> String {
        switch aqi {
        case 0..<50: return "Good"
        case 50..<100: return "Moderate"
        case 100..<150: return "Unhealthy for Some"
        case 150..<200: return "Unhealthy"
        case 200..<300: return "Very Unhealthy"
        default: return "Hazardous"
        }
    }

    // MARK: - Precipitation Card

    private var precipitationCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "drop.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(Color(red: 0.38, green: 0.62, blue: 0.98))
                Text("Next Hour Rain")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.white.opacity(0.8))
                Spacer()
                Text("\(Int(snapshot.precipProb))%")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(.white)
            }

            if snapshot.precipProb < 5 {
                Text("No precipitation expected")
                    .font(.system(size: 11))
                    .foregroundStyle(.white.opacity(0.5))
            } else {
                // 60 tiny bars representing minute-level precip (approximated from hourly)
                minuteBars
            }
        }
        .padding(10)
        .background(.ultraThinMaterial)
        .cornerRadius(12)
    }

    private var minuteBars: some View {
        HStack(spacing: 1.5) {
            ForEach(0..<60, id: \.self) { minute in
                Capsule()
                    .fill(barColor(minute: minute))
                    .frame(width: 2, height: barHeight(minute: minute))
            }
        }
        .frame(height: 20)
        .animation(.easeInOut, value: snapshot.precipProb)
    }

    private func barHeight(minute: Int) -> CGFloat {
        // Simulate a rising then falling probability curve over the hour
        let base = snapshot.precipProb / 100.0
        let wave = sin(Double(minute) / 60.0 * .pi)
        let height = max(4, CGFloat(base * wave * 18 + 4))
        return height
    }

    private func barColor(minute: Int) -> Color {
        let prob = snapshot.precipProb / 100.0
        return Color(
            red: 0.28,
            green: 0.50 + 0.20 * prob,
            blue: 0.90 + 0.08 * prob
        ).opacity(0.6 + 0.4 * prob)
    }

    // MARK: - UV Card

    private var uvCard: some View {
        let uvIndex = estimatedUVIndex
        return HStack(spacing: 10) {
            Image(systemName: "sun.max.fill")
                .font(.system(size: 16))
                .foregroundStyle(Color(red: 0.99, green: 0.82, blue: 0.22))

            VStack(alignment: .leading, spacing: 2) {
                Text("UV Index")
                    .font(.system(size: 10))
                    .foregroundStyle(.white.opacity(0.6))
                Text(uvLabel(uvIndex))
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white)
            }

            Spacer()

            Text("\(uvIndex)")
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundStyle(uvColor(uvIndex))
        }
        .padding(10)
        .background(.ultraThinMaterial)
        .cornerRadius(12)
    }

    private var estimatedUVIndex: Int {
        // Estimated from isDay and conditions (model doesn't carry UV directly)
        guard snapshot.isDay else { return 0 }
        switch snapshot.condition {
        case "clear": return snapshot.temp > 80 ? 8 : 5
        case "partly_cloudy": return 4
        case "cloudy": return 2
        default: return 1
        }
    }

    private func uvColor(_ uv: Int) -> Color {
        switch uv {
        case 0..<3: return .green
        case 3..<6: return .yellow
        case 6..<8: return .orange
        case 8..<11: return .red
        default: return Color(red: 0.6, green: 0, blue: 0.4)
        }
    }

    private func uvLabel(_ uv: Int) -> String {
        switch uv {
        case 0..<3: return "Low"
        case 3..<6: return "Moderate"
        case 6..<8: return "High"
        case 8..<11: return "Very High"
        default: return "Extreme"
        }
    }
}

// MARK: - Preview

#Preview {
    ConditionsView(data: .placeholder)
}
