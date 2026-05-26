import SwiftUI

struct SkyGradient {

    // MARK: - Main Gradient

    static func gradient(condition: String, isDay: Bool, hour: Int) -> LinearGradient {
        let colors = gradientColors(condition: condition, isDay: isDay, hour: hour)
        return LinearGradient(
            colors: colors,
            startPoint: .top,
            endPoint: .bottom
        )
    }

    // MARK: - Gradient Color Resolution

    static func gradientColors(condition: String, isDay: Bool, hour: Int) -> [Color] {
        // Rain and storm conditions override day/night logic
        switch condition {
        case "heavy_rain", "thunderstorm":
            return [
                Color(red: 0.10, green: 0.10, blue: 0.14),
                Color(red: 0.18, green: 0.18, blue: 0.22)
            ]
        case "rain":
            return [
                Color(red: 0.29, green: 0.35, blue: 0.45),
                Color(red: 0.22, green: 0.27, blue: 0.36)
            ]
        case "drizzle":
            return [
                Color(red: 0.38, green: 0.44, blue: 0.54),
                Color(red: 0.28, green: 0.34, blue: 0.44)
            ]
        case "snow":
            return [
                Color(red: 0.72, green: 0.80, blue: 0.92),
                Color(red: 0.88, green: 0.93, blue: 0.98)
            ]
        case "foggy":
            return [
                Color(red: 0.68, green: 0.65, blue: 0.62),
                Color(red: 0.84, green: 0.83, blue: 0.82)
            ]
        case "cloudy":
            if isDay {
                return [
                    Color(red: 0.48, green: 0.54, blue: 0.64),
                    Color(red: 0.62, green: 0.66, blue: 0.72)
                ]
            } else {
                return [
                    Color(red: 0.14, green: 0.15, blue: 0.18),
                    Color(red: 0.22, green: 0.23, blue: 0.26)
                ]
            }
        case "partly_cloudy":
            return partlyCloudyColors(isDay: isDay, hour: hour)
        default:
            // "clear" and fallback
            return clearSkyColors(isDay: isDay, hour: hour)
        }
    }

    private static func clearSkyColors(isDay: Bool, hour: Int) -> [Color] {
        if !isDay {
            // Night
            return [
                Color(red: 0.04, green: 0.06, blue: 0.18),
                Color(red: 0.10, green: 0.12, blue: 0.26)
            ]
        }

        switch hour {
        case 5..<7:
            // Dawn: coral to peach
            return [
                Color(red: 0.95, green: 0.45, blue: 0.35),
                Color(red: 0.99, green: 0.74, blue: 0.60)
            ]
        case 7..<11:
            // Morning: sky blue to pale blue
            return [
                Color(red: 0.34, green: 0.65, blue: 0.90),
                Color(red: 0.65, green: 0.84, blue: 0.97)
            ]
        case 11..<14:
            // Midday: rich blue to bright sky
            return [
                Color(red: 0.12, green: 0.42, blue: 0.85),
                Color(red: 0.35, green: 0.65, blue: 0.95)
            ]
        case 14..<17:
            // Afternoon: deep blue to vivid sky
            return [
                Color(red: 0.10, green: 0.38, blue: 0.80),
                Color(red: 0.28, green: 0.60, blue: 0.92)
            ]
        case 17..<19:
            // Golden hour: amber to orange
            return [
                Color(red: 0.98, green: 0.68, blue: 0.18),
                Color(red: 0.99, green: 0.48, blue: 0.18)
            ]
        case 19..<21:
            // Dusk: purple to magenta-pink
            return [
                Color(red: 0.40, green: 0.18, blue: 0.62),
                Color(red: 0.88, green: 0.28, blue: 0.58)
            ]
        default:
            // Late night (21+, <5)
            return [
                Color(red: 0.04, green: 0.06, blue: 0.18),
                Color(red: 0.10, green: 0.12, blue: 0.26)
            ]
        }
    }

    private static func partlyCloudyColors(isDay: Bool, hour: Int) -> [Color] {
        // Slightly desaturated versions of clear sky
        let clear = clearSkyColors(isDay: isDay, hour: hour)
        // Blend toward grey
        return clear.map { blend($0, with: Color(red: 0.65, green: 0.68, blue: 0.72), factor: 0.25) }
    }

    private static func blend(_ c1: Color, with c2: Color, factor: Double) -> Color {
        // Simple linear blend in sRGB
        let uiC1 = resolve(c1)
        let uiC2 = resolve(c2)
        return Color(
            red: uiC1.r + (uiC2.r - uiC1.r) * factor,
            green: uiC1.g + (uiC2.g - uiC1.g) * factor,
            blue: uiC1.b + (uiC2.b - uiC1.b) * factor
        )
    }

    private static func resolve(_ color: Color) -> (r: Double, g: Double, b: Double) {
        // Extract approximate RGB from SwiftUI Color using UIColor bridge
        #if canImport(UIKit)
        let ui = UIColor(color)
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        ui.getRed(&r, green: &g, blue: &b, alpha: &a)
        return (Double(r), Double(g), Double(b))
        #else
        return (0.5, 0.5, 0.5)
        #endif
    }

    // MARK: - Tier Color

    static func tierColor(warmthTier: String) -> Color {
        switch warmthTier {
        case "warmth_1":
            return Color(red: 0.95, green: 0.28, blue: 0.12) // orange-red
        case "warmth_2":
            return Color(red: 0.98, green: 0.50, blue: 0.12) // deep orange
        case "warmth_3":
            return Color(red: 0.98, green: 0.78, blue: 0.18) // amber-yellow
        case "warmth_4":
            return Color(red: 0.22, green: 0.78, blue: 0.38) // green
        case "warmth_5":
            return Color(red: 0.28, green: 0.58, blue: 0.95) // blue
        case "warmth_6":
            return Color(red: 0.12, green: 0.28, blue: 0.78) // deep blue
        case "warmth_1_rain", "warmth_2_rain", "warmth_3_rain":
            return Color(red: 0.38, green: 0.55, blue: 0.78) // steel blue
        case "warmth_6_snow":
            return Color(red: 0.72, green: 0.86, blue: 0.98) // icy pale blue
        default:
            return Color(red: 0.50, green: 0.65, blue: 0.85) // default steel
        }
    }
}

// MARK: - Convenience Hour Helper

extension SkyGradient {
    static func currentHour() -> Int {
        Calendar.current.component(.hour, from: Date())
    }

    static func gradientForSnapshot(_ snapshot: WidgetSnapshot) -> LinearGradient {
        let hour = snapshot.hourly_hour ?? currentHour()
        return gradient(condition: snapshot.condition, isDay: snapshot.isDay, hour: hour)
    }
}

private extension WidgetSnapshot {
    var hourly_hour: Int? {
        // Extract the current hour from the updatedAt timestamp
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: updatedAt)
        if date == nil {
            let fallback = ISO8601DateFormatter()
            date = fallback.date(from: updatedAt)
        }
        guard let d = date else { return nil }
        return Calendar.current.component(.hour, from: d)
    }
}
