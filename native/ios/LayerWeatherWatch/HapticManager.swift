import WatchKit
import Foundation

// MARK: - HapticManager

final class HapticManager {

    // MARK: Singleton

    static let shared = HapticManager()
    private init() {}

    // MARK: - Haptic Feedback

    /// Play success haptic (e.g., successful data refresh)
    func playSuccess() {
        WKInterfaceDevice.current().play(.success)
    }

    /// Play warning/failure haptic (e.g., commute alert, no connectivity)
    func playWarning() {
        WKInterfaceDevice.current().play(.failure)
    }

    /// Play click haptic (e.g., UI interactions, button taps)
    func playClick() {
        WKInterfaceDevice.current().play(.click)
    }

    /// Play notification haptic (e.g., incoming data update)
    func playNotification() {
        WKInterfaceDevice.current().play(.notification)
    }

    /// Play directed up haptic (e.g., calibration upward)
    func playDirectionUp() {
        WKInterfaceDevice.current().play(.directionUp)
    }

    /// Play directed down haptic (e.g., calibration downward)
    func playDirectionDown() {
        WKInterfaceDevice.current().play(.directionDown)
    }

    /// Play a commute alert sequence: click → 0.2s → click
    func playCommuteAlert() {
        WKInterfaceDevice.current().play(.click)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { [weak self] in
            self?.playWarning()
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.playClick()
        }
    }

    /// Play outfit calibration confirmation
    func playCalibrationConfirm(tooWarm: Bool? = nil) {
        if let tooWarm = tooWarm {
            WKInterfaceDevice.current().play(tooWarm ? .directionUp : .directionDown)
        } else {
            WKInterfaceDevice.current().play(.success)
        }
    }
}
