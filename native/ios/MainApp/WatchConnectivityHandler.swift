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

    private var didActivate = false
    private var pendingWatchSync = false
    private let suiteName = "group.com.layerweather.shared"

    private var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: suiteName)
    }

    private override init() {
        super.init()
    }

    func activate() {
        guard WCSession.isSupported() else { return }
        guard !didActivate else { return }
        didActivate = true
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    /// Pushes the latest widget snapshot from the iPhone App Group to the paired watch.
    /// Watch and iPhone App Group containers are separate — weather must travel over WCSession.
    func syncWidgetPayloadToWatch() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        guard session.activationState == .activated else {
            pendingWatchSync = true
            if !didActivate {
                activate()
            }
            return
        }
        pendingWatchSync = false
        guard session.isWatchAppInstalled else { return }
        pushPayloadToWatch(session: session)
    }

    // MARK: - WCSessionDelegate

    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        guard activationState == .activated else { return }
        if pendingWatchSync {
            syncWidgetPayloadToWatch()
        }
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) {
        WCSession.default.activate()
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        if message["request"] as? String == "weatherUpdate" {
            pushDataToWatch(session: session)
            return
        }
        persistWatchPayload(message)
    }

    func session(
        _ session: WCSession,
        didReceiveMessage message: [String: Any],
        replyHandler: @escaping ([String: Any]) -> Void
    ) {
        if message["request"] as? String == "weatherUpdate" {
            let payload = buildPayload()
            replyHandler(payload)
            return
        }
        persistWatchPayload(message)
        replyHandler([:])
    }

    /// Writes Watch feedback / calibration into App Group for the Capacitor app to consume.
    private func persistWatchPayload(_ message: [String: Any]) {
        let defaults = sharedDefaults
        if let feedback = message["feedbackAction"] as? String, !feedback.isEmpty {
            defaults?.set(feedback, forKey: "widget_feedback_action")
            defaults?.set(Date().timeIntervalSince1970, forKey: "widget_feedback_timestamp")
        }
        if let thermal = message["thermalSensitivity"] as? Int {
            defaults?.set(String(thermal), forKey: "widget_thermal_sensitivity")
        } else if let thermal = message["thermalSensitivity"] as? String {
            defaults?.set(thermal, forKey: "widget_thermal_sensitivity")
        }
    }

    // MARK: - Private

    private func pushDataToWatch(session: WCSession) {
        pushPayloadToWatch(session: session)
    }

    private func pushPayloadToWatch(session: WCSession) {
        guard session.activationState == .activated, session.isWatchAppInstalled else { return }
        let payload = buildPayload()
        guard !payload.isEmpty else { return }

        do {
            try session.updateApplicationContext(payload)
        } catch {
            // Context has size limits; queued transfer still delivers the payload.
            session.transferUserInfo(payload)
        }
        session.transferUserInfo(payload)
    }

    private func buildPayload() -> [String: Any] {
        let defaults = sharedDefaults
        /// Keys must match what `WatchConnectivityManager.didReceiveUserInfo` expects (short names + `Data` for JSON blobs).
        let jsonFieldMappings: [(defaultsKey: String, payloadKey: String)] = [
            ("widget_snapshot", "snapshot"),
            ("widget_hourly", "hourly"),
            ("widget_daily", "daily"),
            ("widget_timeline", "timeline"),
            ("widget_commute_alert", "commuteAlert"),
        ]
        var payload: [String: Any] = [:]
        for mapping in jsonFieldMappings {
            guard let str = defaults?.string(forKey: mapping.defaultsKey),
                  let data = str.data(using: .utf8) else { continue }
            payload[mapping.payloadKey] = data
        }
        if let color = defaults?.string(forKey: "widget_accent_color") {
            payload["accentColor"] = color
        }
        if let thermalStr = defaults?.string(forKey: "widget_thermal_sensitivity"),
           let thermal = Int(thermalStr) {
            payload["thermalSensitivity"] = thermal
        }
        if let coordStr = defaults?.string(forKey: AppGroupKeys.lastCoordinates),
           let coordData = coordStr.data(using: .utf8) {
            payload["lastCoordinates"] = coordData
        }
        return payload
    }
}
