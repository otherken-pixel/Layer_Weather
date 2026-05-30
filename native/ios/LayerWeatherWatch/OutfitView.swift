import SwiftUI

// MARK: - WatchSkyGradient

struct WatchSkyGradient {

    static func gradient(condition: String, isDay: Bool, hour: Int) -> LinearGradient {
        let colors = gradientColors(condition: condition, isDay: isDay, hour: hour)
        return LinearGradient(colors: colors, startPoint: .top, endPoint: .bottom)
    }

    static func gradientColors(condition: String, isDay: Bool, hour: Int) -> [Color] {
        switch condition {
        case "heavy_rain", "thunderstorm":
            return [Color(red: 0.10, green: 0.10, blue: 0.14), Color(red: 0.18, green: 0.18, blue: 0.22)]
        case "rain":
            return [Color(red: 0.29, green: 0.35, blue: 0.45), Color(red: 0.22, green: 0.27, blue: 0.36)]
        case "drizzle":
            return [Color(red: 0.38, green: 0.44, blue: 0.54), Color(red: 0.28, green: 0.34, blue: 0.44)]
        case "snow":
            return [Color(red: 0.72, green: 0.80, blue: 0.92), Color(red: 0.88, green: 0.93, blue: 0.98)]
        case "foggy":
            return [Color(red: 0.68, green: 0.65, blue: 0.62), Color(red: 0.84, green: 0.83, blue: 0.82)]
        case "cloudy":
            return isDay
                ? [Color(red: 0.48, green: 0.54, blue: 0.64), Color(red: 0.62, green: 0.66, blue: 0.72)]
                : [Color(red: 0.14, green: 0.15, blue: 0.18), Color(red: 0.22, green: 0.23, blue: 0.26)]
        case "partly_cloudy":
            // Slightly desaturated clear
            let base = clearSkyColors(isDay: isDay, hour: hour)
            return base // On watchOS keep the full vibrancy
        default:
            return clearSkyColors(isDay: isDay, hour: hour)
        }
    }

    static func clearSkyColors(isDay: Bool, hour: Int) -> [Color] {
        if !isDay {
            return [Color(red: 0.04, green: 0.06, blue: 0.18), Color(red: 0.10, green: 0.12, blue: 0.26)]
        }
        switch hour {
        case 5..<7:
            return [Color(red: 0.95, green: 0.45, blue: 0.35), Color(red: 0.99, green: 0.74, blue: 0.60)]
        case 7..<11:
            return [Color(red: 0.34, green: 0.65, blue: 0.90), Color(red: 0.65, green: 0.84, blue: 0.97)]
        case 11..<14:
            return [Color(red: 0.12, green: 0.42, blue: 0.85), Color(red: 0.35, green: 0.65, blue: 0.95)]
        case 14..<17:
            return [Color(red: 0.10, green: 0.38, blue: 0.80), Color(red: 0.28, green: 0.60, blue: 0.92)]
        case 17..<19:
            return [Color(red: 0.98, green: 0.68, blue: 0.18), Color(red: 0.99, green: 0.48, blue: 0.18)]
        case 19..<21:
            return [Color(red: 0.40, green: 0.18, blue: 0.62), Color(red: 0.88, green: 0.28, blue: 0.58)]
        default:
            return [Color(red: 0.04, green: 0.06, blue: 0.18), Color(red: 0.10, green: 0.12, blue: 0.26)]
        }
    }

    static func tierColor(warmthTier: String) -> Color {
        switch warmthTier {
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
}

// MARK: - Condition SF Symbol Helper (Watch)

func watchConditionSymbol(_ condition: String, isDay: Bool) -> String {
    switch condition {
    case "clear": return isDay ? "sun.max.fill" : "moon.stars.fill"
    case "partly_cloudy": return isDay ? "cloud.sun.fill" : "cloud.moon.fill"
    case "cloudy": return "cloud.fill"
    case "foggy": return "cloud.fog.fill"
    case "drizzle": return "cloud.drizzle.fill"
    case "rain": return "cloud.rain.fill"
    case "heavy_rain": return "cloud.heavyrain.fill"
    case "snow": return "cloud.snow.fill"
    case "thunderstorm": return "cloud.bolt.rain.fill"
    default: return isDay ? "sun.max.fill" : "moon.stars.fill"
    }
}

// MARK: - OutfitView

struct OutfitView: View {
    let data: WidgetData

    @GestureState private var isDragging = false
    @State private var justRightFlash = false

    private var snapshot: WidgetSnapshot {
        data.snapshot ?? .placeholder
    }

    private var currentHour: Int {
        Calendar.current.component(.hour, from: Date())
    }

    private var gradient: LinearGradient {
        WatchSkyGradient.gradient(
            condition: snapshot.condition,
            isDay: snapshot.isDay,
            hour: currentHour
        )
    }

    private var tierColor: Color {
        WatchSkyGradient.tierColor(warmthTier: snapshot.warmthTier)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 6) {
                // Top: location + time
                topBar

                // Center: temperature block
                temperatureBlock

                // Outfit card
                outfitCard

                // Accessory row
                accessoryRow
                    .padding(.top, 4)

                // AQI gauge + pollen pill
                environmentRow
                    .padding(.top, 2)

                // Active weather alerts (SEVERE/EXTREME only)
                let severeAlerts = data.activeAlerts.filter { !$0.isExpired && ($0.severity == "EXTREME" || $0.severity == "SEVERE") }
                if !severeAlerts.isEmpty {
                    alertIndicator(severeAlerts[0])
                        .padding(.top, 4)
                }

                // Commute alert
                if let alert = data.commuteAlert {
                    commuteAlertBanner(alert)
                        .padding(.top, 4)
                }

                // Crown hint
                Text("↓ Scroll for forecast")
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.35))
                    .padding(.top, 6)
                    .padding(.bottom, 4)
            }
            .padding(.horizontal, 8)
        }
        .background(gradient.ignoresSafeArea())
        .gesture(
            TapGesture(count: 2)
                .onEnded { _ in
                    handleJustRight()
                }
        )
    }

    // MARK: - Top Bar

    private var topBar: some View {
        HStack(spacing: 4) {
            Text(snapshot.location)
                .font(.caption.weight(.medium))
                .foregroundStyle(.white.opacity(0.8))
                .lineLimit(1)
                .minimumScaleFactor(0.6)

            Spacer(minLength: 4)

            Text(snapshot.timeSinceUpdate)
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.5))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .padding(.top, 2)
    }

    // MARK: - Temperature Block

    private var temperatureBlock: some View {
        VStack(spacing: 0) {
            // Temperature + condition icon — auto-scales to fit the watch width.
            ViewThatFits(in: .horizontal) {
                temperatureRow(tempFont: .system(size: 44, weight: .bold, design: .rounded),
                               iconFont: .system(size: 22),
                               iconTopPadding: 8)
                temperatureRow(tempFont: .system(size: 36, weight: .bold, design: .rounded),
                               iconFont: .system(size: 18),
                               iconTopPadding: 6)
                temperatureRow(tempFont: .system(size: 28, weight: .bold, design: .rounded),
                               iconFont: .system(size: 14),
                               iconTopPadding: 4)
            }

            Text("Feels \(Int(snapshot.feelsLike.rounded()))°")
                .font(.caption.weight(.medium))
                .foregroundStyle(.white.opacity(0.75))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .padding(.vertical, 4)
    }

    private func temperatureRow(tempFont: Font, iconFont: Font, iconTopPadding: CGFloat) -> some View {
        HStack(alignment: .top, spacing: 4) {
            Text("\(Int(snapshot.temp.rounded()))°")
                .font(tempFont)
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
                .fixedSize(horizontal: true, vertical: false)

            Image(systemName: watchConditionSymbol(snapshot.condition, isDay: snapshot.isDay))
                .symbolRenderingMode(.multicolor)
                .font(iconFont)
                .padding(.top, iconTopPadding)
        }
    }

    // MARK: - Outfit Card

    private var outfitCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Tier bar
            HStack {
                Capsule()
                    .fill(tierColor)
                    .frame(width: 24, height: 4)
                Spacer(minLength: 0)
            }

            // Outfit label
            Text(snapshot.outfitLabel)
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)
                .lineLimit(2)
                .minimumScaleFactor(0.7)

            // Garments
            VStack(alignment: .leading, spacing: 2) {
                Label(snapshot.garmentTop, systemImage: "tshirt.fill")
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.85))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)

                if let bottom = snapshot.garmentBottom {
                    Label(bottom, systemImage: "figure.stand")
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.85))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }

                Label(snapshot.footwear, systemImage: "shoe.fill")
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.85))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            justRightFlash
            ? RoundedRectangle(cornerRadius: 14, style: .continuous)
                .strokeBorder(Color.green.opacity(0.8), lineWidth: 2)
                .animation(.easeInOut(duration: 0.3), value: justRightFlash)
            : nil
        )
    }

    // MARK: - Accessory Row

    private var accessoryRow: some View {
        HStack(spacing: 8) {
            Spacer(minLength: 0)
            accessoryIcon("umbrella.fill", active: snapshot.umbrella)
            accessoryIcon("sunglasses.fill", active: snapshot.sunglasses)
            accessoryIcon("wind.snow", active: snapshot.scarf)
            accessoryIcon("hand.raised.fill", active: snapshot.gloves)
            accessoryIcon("person.bust.fill", active: snapshot.beanie)
            Spacer(minLength: 0)
        }
    }

    private func accessoryIcon(_ symbol: String, active: Bool) -> some View {
        Image(systemName: symbol)
            .font(.footnote)
            .foregroundStyle(active ? .white : .white.opacity(0.2))
    }

    // MARK: - Environment Row (AQI + Pollen)

    private var environmentRow: some View {
        HStack(spacing: 6) {
            if let aqi = snapshot.aqiIndex {
                aqiPill(aqi: aqi)
            }
            if let pollenLevel = snapshot.pollenLevel, pollenLevel != "None" {
                pollenPill(level: pollenLevel, dominant: snapshot.pollenDominant)
            }
            Spacer(minLength: 0)
        }
    }

    private func aqiPill(aqi: Int) -> some View {
        let color = aqiColor(aqi)
        return HStack(spacing: 3) {
            Image(systemName: "aqi.medium")
                .font(.system(size: 9))
            Text("\(aqi)")
                .font(.system(size: 10, weight: .bold, design: .rounded))
        }
        .foregroundStyle(color)
        .padding(.horizontal, 7)
        .padding(.vertical, 3)
        .background(color.opacity(0.18))
        .clipShape(Capsule())
        .overlay(Capsule().strokeBorder(color.opacity(0.3), lineWidth: 0.5))
    }

    private func pollenPill(level: String, dominant: String?) -> some View {
        let color = pollenColor(level)
        let label = dominant.map { "\($0) \(level)" } ?? level
        return HStack(spacing: 3) {
            Image(systemName: "leaf.fill")
                .font(.system(size: 9))
            Text(label)
                .font(.system(size: 10, weight: .semibold))
                .lineLimit(1)
        }
        .foregroundStyle(color)
        .padding(.horizontal, 7)
        .padding(.vertical, 3)
        .background(color.opacity(0.18))
        .clipShape(Capsule())
        .overlay(Capsule().strokeBorder(color.opacity(0.3), lineWidth: 0.5))
    }

    private func aqiColor(_ aqi: Int) -> Color {
        switch aqi {
        case 0..<51:   return Color(red: 0, green: 0.9, blue: 0)
        case 51..<101: return .yellow
        case 101..<151: return Color(red: 1, green: 0.49, blue: 0)
        case 151..<201: return .red
        case 201..<301: return Color(red: 0.56, green: 0.25, blue: 0.59)
        default:        return Color(red: 0.49, green: 0, blue: 0.14)
        }
    }

    private func pollenColor(_ level: String) -> Color {
        switch level {
        case "very_high", "Very High": return Color(red: 0.55, green: 0.16, blue: 0.16)
        case "high", "High":          return Color(red: 0.88, green: 0.35, blue: 0.23)
        case "moderate", "Moderate":  return Color(red: 0.96, green: 0.64, blue: 0.26)
        case "low", "Low":            return Color(red: 0.96, green: 0.90, blue: 0.26)
        default:                      return Color(red: 0.62, green: 0.87, blue: 0.50)
        }
    }

    // MARK: - Alert Indicator

    private func alertIndicator(_ alert: WidgetAlert) -> some View {
        HStack(spacing: 6) {
            Image(systemName: alert.severity == "EXTREME" ? "exclamationmark.triangle.fill" : "exclamationmark.circle.fill")
                .font(.caption2)
                .foregroundStyle(alert.severityColor)

            Text(alert.headline)
                .font(.caption2)
                .foregroundStyle(.white)
                .lineLimit(2)
                .minimumScaleFactor(0.7)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(10)
        .frame(maxWidth: .infinity)
        .background(alert.severityColor.opacity(0.18))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    // MARK: - Commute Alert Banner

    private func commuteAlertBanner(_ alert: CommuteWidgetAlert) -> some View {
        HStack(spacing: 6) {
            Image(systemName: "bolt.fill")
                .font(.caption2)
                .foregroundStyle(alert.urgencyColor)

            Text(alert.message)
                .font(.caption2)
                .foregroundStyle(.white)
                .lineLimit(3)
                .minimumScaleFactor(0.7)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(10)
        .frame(maxWidth: .infinity)
        .background(alert.urgencyColor.opacity(0.2))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .onAppear {
            if alert.urgency == "critical" || alert.urgency == "warning" {
                HapticManager.shared.playCommuteAlert()
            }
        }
    }

    // MARK: - Just Right Gesture

    private func handleJustRight() {
        HapticManager.shared.playSuccess()
        UserDefaults(suiteName: AppGroupKeys.suiteName)?.set("just_right", forKey: AppGroupKeys.feedbackAction)
        UserDefaults(suiteName: AppGroupKeys.suiteName)?.set(Date().timeIntervalSince1970, forKey: AppGroupKeys.feedbackTimestamp)
        UserDefaults(suiteName: AppGroupKeys.suiteName)?.synchronize()

        withAnimation(.easeInOut(duration: 0.2)) {
            justRightFlash = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            withAnimation { justRightFlash = false }
        }
    }
}

// MARK: - Preview

#Preview {
    OutfitView(data: .placeholder)
}
