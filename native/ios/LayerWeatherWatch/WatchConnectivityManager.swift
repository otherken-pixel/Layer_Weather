import Foundation
import WatchConnectivity
import SwiftUI
import Combine

// MARK: - WatchConnectivityManager

final class WatchConnectivityManager: NSObject, ObservableObject {

    // MARK: Published State

    @Published var widgetData: WidgetData?
    @Published var isReachable: Bool = false
    @Published var isSessionActivated: Bool = false
    @Published var lastError: String?

    // MARK: Private

    private var session: WCSession?
    private var pendingPhoneRequest = false

    // MARK: Init

    override init() {
        super.init()
        activateSession()
    }

    // MARK: - Session Activation

    private func activateSession() {
        guard WCSession.isSupported() else {
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
        loadFromAppGroup()

        guard let session = session else { return }

        guard session.activationState == .activated else {
            pendingPhoneRequest = true
            lastError = nil
            return
        }

        pendingPhoneRequest = false
        applyApplicationContextIfNeeded(from: session)

        guard session.isReachable else {
            lastError = nil
            fetchDirectlyIfStale()
            return
        }

        session.sendMessage(
            ["request": "weatherUpdate"],
            replyHandler: { [weak self] reply in
                DispatchQueue.main.async {
                    self?.handleMessageReply(reply)
                }
            },
            errorHandler: { [weak self] error in
                DispatchQueue.main.async {
                    self?.lastError = error.localizedDescription
                    self?.loadFromAppGroup()
                }
            }
        )
    }

    // MARK: - Direct Fetch Fallback

    /// Fetches weather directly (WeatherKit edge → Open-Meteo) when the paired
    /// iPhone is not reachable.
    private func fetchDirectlyIfStale() {
        guard widgetData?.snapshot?.isStale != false else { return }
        fetchLive()
    }

    /// Fetches live weather on its own (independent of the phone) whenever the
    /// cached snapshot is older than the shared freshness window. Called on
    /// foreground so the watch shows current conditions even when the phone is
    /// reachable but holding a stale snapshot.
    func refreshLiveIfStale() {
        guard isOlderThanOneHour(updatedAt: widgetData?.snapshot?.updatedAt) else { return }
        fetchLive()
    }

    private func fetchLive() {
        Task {
            do {
                let fresh = try await WatchWeatherService.shared.fetchWeather()
                guard fresh.hasDisplayableWeather else { return }
                await MainActor.run {
                    fresh.persistToAppGroup()
                    self.widgetData = fresh
                    self.lastError = nil
                }
            } catch {
                // Network unavailable or no saved coordinates — keep existing data.
            }
        }
    }

    // MARK: - App Group (watch-local cache after WCSession delivery)

    func loadFromAppGroup() {
        let data = WidgetData.load()
        DispatchQueue.main.async { [weak self] in
            self?.widgetData = data
        }
    }

    // MARK: - Message Handling

    private func handleMessageReply(_ reply: [String: Any]) {
        guard !reply.isEmpty else {
            loadFromAppGroup()
            return
        }
        applyConnectivityPayload(reply)
    }

    private func applyApplicationContextIfNeeded(from session: WCSession) {
        let context = session.receivedApplicationContext
        guard !context.isEmpty else { return }
        applyConnectivityPayload(context)
    }

    // MARK: - Send Feedback to Phone

    func sendFeedback(_ action: String) {
        let defaults = UserDefaults(suiteName: AppGroupKeys.suiteName)
        defaults?.set(action, forKey: AppGroupKeys.feedbackAction)
        defaults?.set(Date().timeIntervalSince1970, forKey: AppGroupKeys.feedbackTimestamp)
        defaults?.synchronize()

        guard let session = session,
              session.activationState == .activated,
              session.isReachable else { return }
        session.sendMessage(
            ["feedbackAction": action, "timestamp": Date().timeIntervalSince1970],
            replyHandler: nil,
            errorHandler: nil
        )
    }

    // MARK: - Send Thermal Sensitivity Update

    func sendThermalSensitivity(_ value: Int) {
        let defaults = UserDefaults(suiteName: AppGroupKeys.suiteName)
        defaults?.set(String(value), forKey: AppGroupKeys.thermalSensitivity)
        defaults?.synchronize()

        guard let session = session,
              session.activationState == .activated,
              session.isReachable else { return }
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
            guard let self else { return }
            self.isSessionActivated = activationState == .activated
            self.isReachable = session.isReachable

            if activationState == .activated {
                self.applyApplicationContextIfNeeded(from: session)
                self.loadFromAppGroup()
                if self.pendingPhoneRequest {
                    self.requestUpdate()
                }
            }

            if let error = error {
                self.lastError = error.localizedDescription
            }
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async { [weak self] in
            self?.isReachable = session.isReachable
            if session.isReachable, self?.pendingPhoneRequest == true {
                self?.requestUpdate()
            }
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        applyConnectivityPayload(applicationContext, playSuccessHaptic: true)
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        applyConnectivityPayload(userInfo, playSuccessHaptic: true)
    }

    private func applyConnectivityPayload(_ payload: [String: Any], playSuccessHaptic: Bool = false) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            let newData = WidgetData.mergingPhonePayload(payload, into: self.widgetData)
            if newData.hasDisplayableWeather {
                newData.persistToAppGroup()
            }
            self.widgetData = newData
            self.lastError = nil
            if playSuccessHaptic {
                HapticManager.shared.playSuccess()
            }
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
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
