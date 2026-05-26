import SwiftUI

// MARK: - QuickCalibrateView

struct QuickCalibrateView: View {
    let data: WidgetData

    @State private var feedbackGiven: FeedbackType?
    @State private var thermalSensitivity: Double
    @State private var showConfirmation = false
    @State private var confirmationLabel = ""
    @State private var dragOffset: CGSize = .zero
    @State private var isDragging = false

    private var snapshot: WidgetSnapshot {
        data.snapshot ?? .placeholder
    }

    init(data: WidgetData) {
        self.data = data
        let saved = UserDefaults(suiteName: AppGroupKeys.suiteName)?.integer(forKey: AppGroupKeys.thermalSensitivity) ?? 0
        _thermalSensitivity = State(initialValue: Double(saved))
    }

    enum FeedbackType: String {
        case tooCold = "too_cold"
        case justRight = "just_right"
        case tooWarm = "too_warm"

        var label: String {
            switch self {
            case .tooCold: return "Too Cold"
            case .justRight: return "Just Right"
            case .tooWarm: return "Too Warm"
            }
        }

        var emoji: String {
            switch self {
            case .tooCold: return "🥶"
            case .justRight: return "👍"
            case .tooWarm: return "🥵"
            }
        }

        var color: Color {
            switch self {
            case .tooCold: return Color(red: 0.28, green: 0.58, blue: 0.95)
            case .justRight: return Color(red: 0.22, green: 0.78, blue: 0.38)
            case .tooWarm: return Color(red: 0.95, green: 0.38, blue: 0.18)
            }
        }
    }

    private var tierColor: Color {
        WatchSkyGradient.tierColor(warmthTier: snapshot.warmthTier)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 4) {
                // Header
                HStack {
                    Text("How does it feel?")
                        .font(.headline.weight(.bold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    Spacer(minLength: 0)
                }
                .padding(.top, 2)

                // Outfit + temp
                VStack(spacing: 2) {
                    Text(snapshot.outfitLabel)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    Text("\(Int(snapshot.temp.rounded()))°")
                        .font(.system(.title, design: .rounded).weight(.bold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)
                }
                .padding(.vertical, 4)

                // Large gesture area
                gestureArea
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)

                // Sensitivity control
                sensitivityControl
                    .padding(.top, 6)
            }
            .padding(.horizontal, 8)
            .padding(.bottom, 8)
        }
        .background(
            WatchSkyGradient.gradient(
                condition: snapshot.condition,
                isDay: snapshot.isDay,
                hour: Calendar.current.component(.hour, from: Date())
            )
            .ignoresSafeArea()
        )
        .overlay {
            if isDragging {
                dragDirectionOverlay
            }
        }
        .overlay {
            if showConfirmation {
                confirmationOverlay
            }
        }
    }

    // MARK: - Gesture Area

    private var gestureArea: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 16)
                .fill(.ultraThinMaterial)
                .overlay(
                    feedbackGiven.map { fb in
                        RoundedRectangle(cornerRadius: 16)
                            .strokeBorder(fb.color, lineWidth: 2)
                    }
                )

            if let fb = feedbackGiven {
                HStack(spacing: 6) {
                    Text(fb.emoji)
                        .font(.title2)
                    Text(fb.label)
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(fb.color)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
            } else {
                VStack(spacing: 4) {
                    Text("← Too Cold   Too Warm →")
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.6))
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                    Text("Tap for Just Right")
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(.white.opacity(0.5))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
                .padding(.horizontal, 6)
            }
        }
        .gesture(
            DragGesture(minimumDistance: 20)
                .onChanged { value in
                    isDragging = true
                    dragOffset = value.translation
                }
                .onEnded { value in
                    isDragging = false
                    dragOffset = .zero
                    let horizontal = value.translation.width
                    let threshold: CGFloat = 30
                    if horizontal < -threshold {
                        submitFeedback(.tooCold)
                    } else if horizontal > threshold {
                        submitFeedback(.tooWarm)
                    }
                }
        )
        .simultaneousGesture(
            TapGesture()
                .onEnded { _ in
                    submitFeedback(.justRight)
                }
        )
    }

    // MARK: - Drag Direction Overlay

    private var dragDirectionOverlay: some View {
        HStack {
            Image(systemName: "chevron.left.circle.fill")
                .font(.title3)
                .foregroundStyle(FeedbackType.tooCold.color.opacity(0.8))
            Spacer()
            Image(systemName: "chevron.right.circle.fill")
                .font(.title3)
                .foregroundStyle(FeedbackType.tooWarm.color.opacity(0.8))
        }
        .padding(.horizontal, 10)
    }

    // MARK: - Sensitivity Control

    private var sensitivityControl: some View {
        VStack(spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: "thermometer.low")
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.5))
                Text("Thermal Sensitivity")
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(.white.opacity(0.7))
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                Spacer(minLength: 4)
                Image(systemName: "thermometer.high")
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.5))
            }

            // Dot row: -2 to +2
            HStack(spacing: 8) {
                ForEach(-2...2, id: \.self) { level in
                    sensitivityDot(level: level)
                        .onTapGesture {
                            updateSensitivity(to: Double(level))
                        }
                }
            }

            // Digital Crown binding
            Text("Use Crown to adjust")
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.4))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .padding(10)
        .frame(maxWidth: .infinity)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .focusable(true)
        .digitalCrownRotation(
            $thermalSensitivity,
            from: -2,
            through: 2,
            by: 1,
            sensitivity: .low,
            isContinuous: false,
            isHapticFeedbackEnabled: true
        )
        .onChange(of: thermalSensitivity) { _, newValue in
            let clamped = Int(newValue.rounded())
            saveSensitivity(clamped)
        }
    }

    private func sensitivityDot(level: Int) -> some View {
        let currentLevel = Int(thermalSensitivity.rounded())
        let isActive = level == currentLevel
        return Circle()
            .fill(isActive ? sensitivityColor(level) : Color.white.opacity(0.2))
            .frame(width: isActive ? 14 : 10, height: isActive ? 14 : 10)
            .animation(.spring(response: 0.3), value: currentLevel)
    }

    private func sensitivityColor(_ level: Int) -> Color {
        switch level {
        case -2: return Color(red: 0.12, green: 0.28, blue: 0.78)
        case -1: return Color(red: 0.28, green: 0.58, blue: 0.95)
        case 0: return Color(red: 0.22, green: 0.78, blue: 0.38)
        case 1: return Color(red: 0.98, green: 0.60, blue: 0.18)
        case 2: return Color(red: 0.95, green: 0.28, blue: 0.12)
        default: return .white
        }
    }

    // MARK: - Confirmation Overlay

    private var confirmationOverlay: some View {
        ZStack {
            Color.black.opacity(0.5).ignoresSafeArea()

            VStack(spacing: 8) {
                Text(confirmationLabel)
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .minimumScaleFactor(0.7)

                if let fb = feedbackGiven {
                    Text(fb.emoji)
                        .font(.largeTitle)
                }
            }
            .padding(16)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .padding(.horizontal, 10)
        }
        .transition(.opacity.combined(with: .scale))
    }

    // MARK: - Actions

    private func submitFeedback(_ type: FeedbackType) {
        feedbackGiven = type

        // Write to App Group
        let defaults = UserDefaults(suiteName: AppGroupKeys.suiteName)
        defaults?.set(type.rawValue, forKey: AppGroupKeys.feedbackAction)
        defaults?.set(Date().timeIntervalSince1970, forKey: AppGroupKeys.feedbackTimestamp)
        defaults?.synchronize()

        // Haptic feedback
        switch type {
        case .tooCold: HapticManager.shared.playDirectionDown()
        case .justRight: HapticManager.shared.playSuccess()
        case .tooWarm: HapticManager.shared.playDirectionUp()
        }

        // Show confirmation
        confirmationLabel = "\(type.label) saved!"
        withAnimation(.spring()) {
            showConfirmation = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            withAnimation { showConfirmation = false }
        }
    }

    private func updateSensitivity(to value: Double) {
        thermalSensitivity = max(-2, min(2, value))
        saveSensitivity(Int(value))
        HapticManager.shared.playClick()
    }

    private func saveSensitivity(_ value: Int) {
        let clamped = max(-2, min(2, value))
        let defaults = UserDefaults(suiteName: AppGroupKeys.suiteName)
        defaults?.set(clamped, forKey: AppGroupKeys.thermalSensitivity)
        defaults?.synchronize()
    }
}

// MARK: - Preview

#Preview {
    QuickCalibrateView(data: .placeholder)
}
