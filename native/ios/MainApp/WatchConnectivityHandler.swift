import Foundation
import WatchConnectivity
import WidgetKit

/// Handles WatchConnectivity session on the iPhone side.
///
/// The Apple Watch app sends a "request" message when its data is stale.
/// This handler responds by pushing all widget data keys from the shared
/// App Group UserDefaults back to the watch via transferUserInfo.
///
/// Usage: call `WatchConnectivityHandler.shared.activate()` from AppDelegate.
final class WatchConnectivityHandler: NSObject, WCSessionDelegate {
    static let shared = WatchConnectivityHandler()

    private let suiteName = "group.com.layerweather.shared"

    private var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: suiteName)
    }

    private override init() {
        super.init()
    }

    func activate() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    // MARK: - WCSessionDelegate

    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {}

    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) {
        WCSession.default.activate()
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        guard message["request"] as? String == "weatherUpdate" else { return }
        pushDataToWatch(session: session)
    }

    func session(
        _ session: WCSession,
        didReceiveMessage message: [String: Any],
        replyHandler: @escaping ([String: Any]) -> Void
    ) {
        guard message["request"] as? String == "weatherUpdate" else {
            replyHandler([:])
            return
        }
        let payload = buildPayload()
        replyHandler(payload)
    }

    // MARK: - Private

    private func pushDataToWatch(session: WCSession) {
        guard session.activationState == .activated, session.isWatchAppInstalled else { return }
        let payload = buildPayload()
        session.transferUserInfo(payload)
    }

    private func buildPayload() -> [String: Any] {
        let defaults = sharedDefaults
        let keys = [
            "widget_snapshot", "widget_hourly", "widget_daily",
            "widget_timeline", "widget_commute_alert",
            "widget_accent_color", "widget_thermal_sensitivity",
            "widget_last_coordinates",
        ]
        var payload: [String: Any] = [:]
        for key in keys {
            if let value = defaults?.string(forKey: key) {
                payload[key] = value
            }
        }
        return payload
    }
}
