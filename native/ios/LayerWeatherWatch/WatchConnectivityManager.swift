import Foundation
import WatchConnectivity
import SwiftUI
import Combine

// MARK: - WatchConnectivityManager

final class WatchConnectivityManager: NSObject, ObservableObject {

    // MARK: Published State

    @Published var widgetData: WidgetData?
    @Published var isReachable: Bool = false
    @Published var lastError: String?

    // MARK: Private

    private var session: WCSession?

    // MARK: Init

    override init() {
        super.init()
        activateSession()
    }

    // MARK: - Session Activation

    private func activateSession() {
        guard WCSession.isSupported() else {
            // WCSession not supported on this device
            loadFromAppGroup()
            return
        }
        let session = WCSession.default
        session.delegate = self
        session.activate()
        self.session = session
    }

    // MARK: - Request Update from Phone

    func requestUpdate() {
        guard let session = session, session.isReachable else {
            // Fallback: load from App Group UserDefaults
            loadFromAppGroup()
            return
        }

        session.sendMessage(["request": "weatherUpdate"], replyHandler: { [weak self] reply in
            DispatchQueue.main.async {
                self?.handleMessageReply(reply)
            }
        }, errorHandler: { [weak self] error in
            DispatchQueue.main.async {
                self?.lastError = error.localizedDescription
                // Fallback to App Group data
                self?.loadFromAppGroup()
            }
        })
    }

    // MARK: - App Group Fallback

    func loadFromAppGroup() {
        let data = WidgetData.load()
        DispatchQueue.main.async { [weak self] in
            self?.widgetData = data
        }
    }

    // MARK: - Message Handling

    private func handleMessageReply(_ reply: [String: Any]) {
        // If reply contains embedded JSON data, decode it
        if let snapshotData = reply["snapshot"] as? Data {
            let decoder = JSONDecoder()
            if let snapshot = try? decoder.decode(WidgetSnapshot.self, from: snapshotData) {
                DispatchQueue.main.async { [weak self] in
                    let current = self?.widgetData ?? .placeholder
                    self?.widgetData = WidgetData(
                        snapshot: snapshot,
                        hourly: current.hourly,
                        daily: current.daily,
                        timeline: current.timeline,
                        commuteAlert: current.commuteAlert,
                        accentColor: current.accentColor,
                        thermalSensitivity: current.thermalSensitivity
                    )
                }
            }
        } else {
            // Reload from App Group (phone should have written to shared UserDefaults)
            loadFromAppGroup()
        }
    }

    // MARK: - Send Feedback to Phone

    func sendFeedback(_ action: String) {
        // Write to App Group
        let defaults = UserDefaults(suiteName: AppGroupKeys.suiteName)
        defaults?.set(action, forKey: AppGroupKeys.feedbackAction)
        defaults?.set(Date().timeIntervalSince1970, forKey: AppGroupKeys.feedbackTimestamp)
        defaults?.synchronize()

        // Also send via WCSession if reachable
        guard let session = session, session.isReachable else { return }
        session.sendMessage(
            ["feedbackAction": action, "timestamp": Date().timeIntervalSince1970],
            replyHandler: nil,
            errorHandler: nil
        )
    }

    // MARK: - Send Thermal Sensitivity Update

    func sendThermalSensitivity(_ value: Int) {
        let defaults = UserDefaults(suiteName: AppGroupKeys.suiteName)
        defaults?.set(value, forKey: AppGroupKeys.thermalSensitivity)
        defaults?.synchronize()

        guard let session = session, session.isReachable else { return }
        session.sendMessage(
            ["thermalSensitivity": value],
            replyHandler: nil,
            errorHandler: nil
        )
    }
}

// MARK: - WCSessionDelegate

extension WatchConnectivityManager: WCSessionDelegate {

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async { [weak self] in
            self?.isReachable = session.isReachable
            if activationState == .activated {
                // Load from App Group on activation
                self?.loadFromAppGroup()
            }
            if let error = error {
                self?.lastError = error.localizedDescription
            }
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async { [weak self] in
            self?.isReachable = session.isReachable
        }
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        // Decode full WidgetData from userInfo
        let decoder = JSONDecoder()

        var snapshot: WidgetSnapshot? = widgetData?.snapshot
        var hourly: [HourlyWidgetEntry] = widgetData?.hourly ?? []
        var daily: [DailyWidgetEntry] = widgetData?.daily ?? []
        var timeline: [TimelineWidgetEntry] = widgetData?.timeline ?? []
        var commuteAlert: CommuteWidgetAlert? = widgetData?.commuteAlert
        var accentColor = widgetData?.accentColor ?? "#4F8EF7"
        var thermalSensitivity = widgetData?.thermalSensitivity ?? 0

        if let data = userInfo["snapshot"] as? Data {
            snapshot = try? decoder.decode(WidgetSnapshot.self, from: data)
        }
        if let data = userInfo["hourly"] as? Data {
            hourly = (try? decoder.decode([HourlyWidgetEntry].self, from: data)) ?? hourly
        }
        if let data = userInfo["daily"] as? Data {
            daily = (try? decoder.decode([DailyWidgetEntry].self, from: data)) ?? daily
        }
        if let data = userInfo["timeline"] as? Data {
            timeline = (try? decoder.decode([TimelineWidgetEntry].self, from: data)) ?? timeline
        }
        if let data = userInfo["commuteAlert"] as? Data {
            commuteAlert = try? decoder.decode(CommuteWidgetAlert.self, from: data)
        }
        if let color = userInfo["accentColor"] as? String {
            accentColor = color
        }
        if let sensitivity = userInfo["thermalSensitivity"] as? Int {
            thermalSensitivity = sensitivity
        }

        let newData = WidgetData(
            snapshot: snapshot,
            hourly: hourly,
            daily: daily,
            timeline: timeline,
            commuteAlert: commuteAlert,
            accentColor: accentColor,
            thermalSensitivity: thermalSensitivity
        )

        DispatchQueue.main.async { [weak self] in
            self?.widgetData = newData
            HapticManager.shared.playSuccess()
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        // Handle direct messages from phone
        if message["type"] as? String == "weatherUpdate" {
            loadFromAppGroup()
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        if message["type"] as? String == "weatherUpdate" {
            loadFromAppGroup()
        }
        replyHandler([:])
    }
}
