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
        ZStack {
            // Full screen gradient background
            gradient.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 0) {
                    // Top: location + time
                    topBar

                    // Center: temperature block
                    temperatureBlock

                    // Outfit card
                    outfitCard

                    // Accessory row
                    accessoryRow
                        .padding(.top, 8)

                    // Commute alert
                    if let alert = data.commuteAlert {
                        commuteAlertBanner(alert)
                            .padding(.top, 8)
                    }

                    // Crown hint
                    Text("↓ Scroll for forecast")
                        .font(.system(size: 9))
                        .foregroundStyle(.white.opacity(0.35))
                        .padding(.top, 10)
                        .padding(.bottom, 4)
                }
                .padding(.horizontal, 8)
            }
        }
        .gesture(
            TapGesture(count: 2)
                .onEnded { _ in
                    handleJustRight()
                }
        )
    }

    // MARK: - Top Bar

    private var topBar: some View {
        HStack {
            Text(snapshot.location)
                .font(.system(size: 11, weight: .medium, design: .rounded))
                .foregroundStyle(.white.opacity(0.8))
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            Spacer()

            Text(snapshot.timeSinceUpdate)
                .font(.system(size: 10))
                .foregroundStyle(.white.opacity(0.5))
        }
        .padding(.top, 6)
    }

    // MARK: - Temperature Block

    private var temperatureBlock: some View {
        VStack(spacing: 2) {
            HStack(alignment: .top, spacing: 6) {
                Text("\(Int(snapshot.temp.rounded()))°")
                    .font(.system(size: 48, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)

                Image(systemName: watchConditionSymbol(snapshot.condition, isDay: snapshot.isDay))
                    .symbolRenderingMode(.multicolor)
                    .font(.system(size: 20))
                    .padding(.top, 10)
            }

            Text("Feels \(Int(snapshot.feelsLike.rounded()))°")
                .font(.system(size: 13, weight: .medium, design: .rounded))
                .foregroundStyle(.white.opacity(0.75))
        }
        .padding(.vertical, 6)
    }

    // MARK: - Outfit Card

    private var outfitCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Tier bar
            HStack {
                Capsule()
                    .fill(tierColor)
                    .frame(width: 24, height: 4)
                Spacer()
            }

            // Outfit label
            Text(snapshot.outfitLabel)
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(2)
                .minimumScaleFactor(0.8)

            // Garments
            VStack(alignment: .leading, spacing: 2) {
                Label(snapshot.garmentTop, systemImage: "tshirt.fill")
                    .font(.system(size: 11))
                    .foregroundStyle(.white.opacity(0.85))
                    .lineLimit(1)

                if let bottom = snapshot.garmentBottom {
                    Label(bottom, systemImage: "figure.stand")
                        .font(.system(size: 11))
                        .foregroundStyle(.white.opacity(0.85))
                        .lineLimit(1)
                }

                Label(snapshot.footwear, systemImage: "shoe.fill")
                    .font(.system(size: 11))
                    .foregroundStyle(.white.opacity(0.85))
                    .lineLimit(1)
            }
        }
        .padding(12)
        .background(.ultraThinMaterial)
        .cornerRadius(14)
        .overlay(
            justRightFlash
            ? RoundedRectangle(cornerRadius: 14)
                .strokeBorder(Color.green.opacity(0.8), lineWidth: 2)
                .animation(.easeInOut(duration: 0.3), value: justRightFlash)
            : nil
        )
    }

    // MARK: - Accessory Row

    private var accessoryRow: some View {
        HStack(spacing: 10) {
            accessoryIcon("umbrella.fill", active: snapshot.umbrella)
            accessoryIcon("sunglasses.fill", active: snapshot.sunglasses)
            accessoryIcon("scarf.fill", active: snapshot.scarf)
            accessoryIcon("hand.raised.fill", active: snapshot.gloves)
            accessoryIcon("person.bust.fill", active: snapshot.beanie)
        }
    }

    private func accessoryIcon(_ symbol: String, active: Bool) -> some View {
        Image(systemName: symbol)
            .font(.system(size: 14))
            .foregroundStyle(active ? .white : .white.opacity(0.2))
    }

    // MARK: - Commute Alert Banner

    private func commuteAlertBanner(_ alert: CommuteWidgetAlert) -> some View {
        HStack(spacing: 6) {
            Image(systemName: "bolt.fill")
                .font(.system(size: 11))
                .foregroundStyle(alert.urgencyColor)

            Text(alert.message)
                .font(.system(size: 11))
                .foregroundStyle(.white)
                .lineLimit(3)
                .minimumScaleFactor(0.8)
        }
        .padding(10)
        .background(alert.urgencyColor.opacity(0.2))
        .cornerRadius(12)
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
