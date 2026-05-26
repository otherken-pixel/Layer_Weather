import SwiftUI

// MARK: - HairForecastView

struct HairForecastView: View {
    let data: WidgetData

    private var snapshot: WidgetSnapshot {
        data.snapshot ?? .placeholder
    }

    // MARK: - Computed values

    /// Composite 0–100 score for how hair-friendly the conditions are.
    /// Penalizes humidity, precipitation, wind, UV, and poor air quality.
    private var hairScore: Int {
        var score = 100

        // Humidity (frizz)
        if snapshot.humidity > 70 { score -= 20 }
        else if snapshot.humidity > 50 { score -= 10 }

        // Precipitation (gets hair wet)
        if snapshot.precipProb > 40 { score -= 25 }
        else if snapshot.precipProb > 20 { score -= 10 }

        // Wind (disrupts styling)
        if snapshot.windSpeed > 15 { score -= 15 }
        else if snapshot.windSpeed > 8 { score -= 5 }

        // UV (damages hair)
        if estimatedUVIndex > 7 { score -= 10 }

        // Air quality (dulls hair)
        if let aqi = snapshot.aqiIndex, aqi > 100 { score -= 5 }

        return max(0, score)
    }

    private var hairScoreLabel: String {
        switch hairScore {
        case 80...: return "Great Hair Day"
        case 60..<80: return "Good"
        case 40..<60: return "Fair"
        default: return "Tough Day"
        }
    }

    private var hairScoreColor: Color {
        switch hairScore {
        case 80...: return Color(red: 0.22, green: 0.78, blue: 0.38)   // green
        case 60..<80: return Color(red: 0.98, green: 0.78, blue: 0.18) // yellow
        case 40..<60: return Color(red: 0.98, green: 0.50, blue: 0.12) // orange
        default: return Color(red: 0.95, green: 0.28, blue: 0.12)      // red
        }
    }

    private var frizzRiskLabel: String {
        switch snapshot.humidity {
        case ..<40: return "Low"
        case 40..<60: return "Medium"
        case 60..<80: return "High"
        default: return "Very High"
        }
    }

    private var frizzRiskColor: Color {
        switch snapshot.humidity {
        case ..<40: return Color(red: 0.22, green: 0.78, blue: 0.38)
        case 40..<60: return Color(red: 0.98, green: 0.78, blue: 0.18)
        case 60..<80: return Color(red: 0.98, green: 0.50, blue: 0.12)
        default: return Color(red: 0.95, green: 0.28, blue: 0.12)
        }
    }

    private var windStyleLabel: String {
        switch snapshot.windSpeed {
        case ..<5: return "Calm"
        case 5..<15: return "Breezy"
        case 15..<25: return "Windy"
        default: return "Very Windy"
        }
    }

    private var windStyleColor: Color {
        switch snapshot.windSpeed {
        case ..<5: return Color(red: 0.22, green: 0.78, blue: 0.38)
        case 5..<15: return Color(red: 0.98, green: 0.78, blue: 0.18)
        case 15..<25: return Color(red: 0.98, green: 0.50, blue: 0.12)
        default: return Color(red: 0.95, green: 0.28, blue: 0.12)
        }
    }

    private var rainLabel: String {
        switch snapshot.precipProb {
        case ..<20: return "Dry"
        case 20..<40: return "Possible"
        default: return "Bring umbrella"
        }
    }

    private var estimatedUVIndex: Int {
        guard snapshot.isDay else { return 0 }
        switch snapshot.condition {
        case "clear": return snapshot.temp > 80 ? 8 : 5
        case "partly_cloudy": return 4
        case "cloudy": return 2
        default: return 1
        }
    }

    private var uvLabel: String {
        switch estimatedUVIndex {
        case 0..<3: return "Low"
        case 3..<6: return "Moderate"
        case 6..<8: return "High"
        case 8..<11: return "Very High"
        default: return "Extreme"
        }
    }

    private var uvColor: Color {
        switch estimatedUVIndex {
        case 0..<3: return Color(red: 0.22, green: 0.78, blue: 0.38)
        case 3..<6: return Color(red: 0.98, green: 0.78, blue: 0.18)
        case 6..<8: return Color(red: 0.98, green: 0.50, blue: 0.12)
        case 8..<11: return Color(red: 0.95, green: 0.28, blue: 0.12)
        default: return Color(red: 0.6, green: 0.0, blue: 0.4)
        }
    }

    /// One actionable line driven by the dominant negative factor.
    private var stylingTip: String {
        if snapshot.humidity > 60 { return "Anti-frizz serum recommended" }
        if snapshot.windSpeed > 15 { return "Try a braid or ponytail" }
        if snapshot.precipProb > 40 { return "Hat or umbrella suggested" }
        if estimatedUVIndex > 7 { return "UV-protective hair spray" }
        return "Great conditions for any style"
    }

    private var stylingTipIcon: String {
        if snapshot.humidity > 60 { return "drop.fill" }
        if snapshot.windSpeed > 15 { return "wind" }
        if snapshot.precipProb > 40 { return "umbrella.fill" }
        if estimatedUVIndex > 7 { return "sun.max.fill" }
        return "sparkles"
    }

    // MARK: - Body

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                // Header
                HStack {
                    Text("Hair Forecast")
                        .font(.headline.weight(.bold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    Spacer(minLength: 0)
                }
                .padding(.top, 2)

                // Hero: hair-friendly score
                hairScoreCard

                // Frizz risk
                frizzRiskCard

                // Wind style risk
                windStyleCard

                // Rain
                rainCard

                // UV
                uvCard

                // Styling tip
                stylingTipCard
            }
            .padding(.horizontal, 8)
            .padding(.bottom, 12)
        }
        .background(
            WatchSkyGradient.gradient(
                condition: snapshot.condition,
                isDay: snapshot.isDay,
                hour: Calendar.current.component(.hour, from: Date())
            )
            .ignoresSafeArea()
        )
    }

    // MARK: - Cards

    private var hairScoreCard: some View {
        VStack(spacing: 6) {
            HStack(spacing: 6) {
                Image(systemName: "wand.and.stars")
                    .font(.subheadline)
                    .foregroundStyle(hairScoreColor)
                Text(hairScoreLabel)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                Spacer(minLength: 4)
                Text("\(hairScore)")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(hairScoreColor)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
            }

            Gauge(value: Double(hairScore) / 100, label: { Text("") })
                .gaugeStyle(.accessoryLinearCapacity)
                .tint(hairScoreColor)
        }
        .padding(10)
        .frame(maxWidth: .infinity)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var frizzRiskCard: some View {
        HStack(spacing: 8) {
            Image(systemName: "humidity.fill")
                .font(.title3)
                .foregroundStyle(frizzRiskColor)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text("Frizz Risk")
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(.white.opacity(0.6))
                Text(frizzRiskLabel)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
            }

            Spacer(minLength: 4)

            Text("\(Int(snapshot.humidity.rounded()))%")
                .font(.subheadline.weight(.bold))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
        .padding(10)
        .frame(maxWidth: .infinity)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var windStyleCard: some View {
        HStack(spacing: 8) {
            Image(systemName: "wind")
                .font(.title3)
                .foregroundStyle(windStyleColor)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text("Style Risk")
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(.white.opacity(0.6))
                Text(windStyleLabel)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
            }

            Spacer(minLength: 4)

            Text("\(Int(snapshot.windSpeed.rounded())) mph")
                .font(.subheadline.weight(.bold))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
        .padding(10)
        .frame(maxWidth: .infinity)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var rainCard: some View {
        HStack(spacing: 8) {
            Image(systemName: snapshot.precipProb > 40 ? "umbrella.fill" : "drop.fill")
                .font(.title3)
                .foregroundStyle(Color(red: 0.38, green: 0.62, blue: 0.98))
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text("Rain")
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(.white.opacity(0.6))
                Text(rainLabel)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
            }

            Spacer(minLength: 4)

            Text("\(Int(snapshot.precipProb))%")
                .font(.subheadline.weight(.bold))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
        .padding(10)
        .frame(maxWidth: .infinity)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var uvCard: some View {
        HStack(spacing: 8) {
            Image(systemName: "sun.max.fill")
                .font(.title3)
                .foregroundStyle(uvColor)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text("UV Index")
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(.white.opacity(0.6))
                Text(uvLabel)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
            }

            Spacer(minLength: 4)

            Text("\(estimatedUVIndex)")
                .font(.subheadline.weight(.bold))
                .foregroundStyle(uvColor)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
        .padding(10)
        .frame(maxWidth: .infinity)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var stylingTipCard: some View {
        HStack(spacing: 8) {
            Image(systemName: stylingTipIcon)
                .font(.title3)
                .foregroundStyle(.white)
                .frame(width: 24)

            Text(stylingTip)
                .font(.caption.weight(.medium))
                .foregroundStyle(.white)
                .lineLimit(2)
                .minimumScaleFactor(0.7)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(10)
        .frame(maxWidth: .infinity)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

// MARK: - Preview

#Preview {
    HairForecastView(data: .placeholder)
}
