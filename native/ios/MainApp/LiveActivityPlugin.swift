import Foundation
import Capacitor
import ActivityKit

/// Capacitor plugin that starts, updates, and ends the Layer Weather Live Activity.
///
/// Register in `LayerWeatherBridgeViewController.capacitorDidLoad()` alongside WidgetBridgePlugin.
///
/// Exposed JS methods:
///   startWeatherActivity(params)   — start or replace the current activity
///   updateWeatherActivity(params)  — update the live state of an existing activity
///   endWeatherActivity()           — end the activity with a short dismissal delay
///
/// Params shape (all methods share the same state fields):
/// {
///   cityName: string           — displayed city label (start only)
///   accentColorHex: string     — "#RRGGBB" (start only, defaults "#4F46E5")
///   temp: number
///   feelsLike: number
///   condition: string
///   weatherCode: number
///   isDay: boolean
///   precipProb: number
///   outfitLabel: string
///   garmentTop: string
///   umbrella: boolean
///   warmthTier: string
///   nowcastValues: number[]    — precipitation probability 0–100 for next 60 min
///   commuteType: string?       — "morning" | "evening"
///   commuteMinutesAway: number?
///   commuteNote: string?
///   alertHeadline: string?
/// }

@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "LiveActivityPlugin"
    public let jsName = "LiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startWeatherActivity",  returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateWeatherActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endWeatherActivity",    returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isSupported",           returnType: CAPPluginReturnPromise),
    ]

    // ── isSupported ───────────────────────────────────────────────────────────

    @objc func isSupported(_ call: CAPPluginCall) {
        if #available(iOS 16.2, *) {
            call.resolve(["supported": ActivityAuthorizationInfo().areActivitiesEnabled])
        } else {
            call.resolve(["supported": false])
        }
    }

    // ── startWeatherActivity ─────────────────────────────────────────────────

    @objc func startWeatherActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve(["started": false, "reason": "iOS 16.2+ required"])
            return
        }

        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.resolve(["started": false, "reason": "Live Activities disabled by user"])
            return
        }

        let attrs = LayerWeatherActivityAttributes(
            cityName: call.getString("cityName") ?? "—",
            accentColorHex: call.getString("accentColorHex") ?? "#4F46E5"
        )
        let state = buildState(from: call)

        // End any existing activity first
        Task {
            await endAllActivities()

            do {
                let activity = try Activity<LayerWeatherActivityAttributes>.request(
                    attributes: attrs,
                    contentState: state,
                    pushType: nil
                )
                // Persist the activity ID to App Group so it survives restarts
                UserDefaults(suiteName: AppGroupKeys.suiteName)?
                    .set(activity.id, forKey: AppGroupKeys.liveActivityId)
                call.resolve(["started": true, "activityId": activity.id])
            } catch {
                call.resolve(["started": false, "reason": error.localizedDescription])
            }
        }
    }

    // ── updateWeatherActivity ────────────────────────────────────────────────

    @objc func updateWeatherActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve(["updated": false])
            return
        }

        let newState = buildState(from: call)
        let activities = Activity<LayerWeatherActivityAttributes>.activities

        guard !activities.isEmpty else {
            call.resolve(["updated": false, "reason": "No active Live Activity"])
            return
        }

        Task {
            for activity in activities {
                await activity.update(using: newState)
            }
            call.resolve(["updated": true])
        }
    }

    // ── endWeatherActivity ───────────────────────────────────────────────────

    @objc func endWeatherActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }

        let finalState = Activity<LayerWeatherActivityAttributes>.activities.first.map { _ in
            buildState(from: call)
        }

        Task {
            for activity in Activity<LayerWeatherActivityAttributes>.activities {
                if let s = finalState {
                    await activity.end(using: s, dismissalPolicy: .after(.now + 4))
                } else {
                    await activity.end(dismissalPolicy: .immediate)
                }
            }
            UserDefaults(suiteName: AppGroupKeys.suiteName)?
                .removeObject(forKey: AppGroupKeys.liveActivityId)
            call.resolve()
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    @available(iOS 16.2, *)
    private func buildState(from call: CAPPluginCall) -> LayerWeatherActivityAttributes.ContentState {
        let rawNowcast = (call.getArray("nowcastValues") as? [NSNumber]) ?? []
        let nowcast = rawNowcast.map { $0.doubleValue }

        return LayerWeatherActivityAttributes.ContentState(
            temp:               call.getDouble("temp")        ?? 0,
            feelsLike:          call.getDouble("feelsLike")   ?? 0,
            condition:          call.getString("condition")   ?? "clear",
            weatherCode:        call.getInt("weatherCode")    ?? 0,
            isDay:              call.getBool("isDay")         ?? true,
            precipProb:         call.getDouble("precipProb")  ?? 0,
            outfitLabel:        call.getString("outfitLabel") ?? "",
            garmentTop:         call.getString("garmentTop")  ?? "",
            umbrella:           call.getBool("umbrella")      ?? false,
            warmthTier:         call.getString("warmthTier")  ?? "warmth_3",
            nowcastValues:      nowcast,
            updatedAt:          Date(),
            commuteType:        call.getString("commuteType"),
            commuteMinutesAway: call.getInt("commuteMinutesAway"),
            commuteNote:        call.getString("commuteNote"),
            alertHeadline:      call.getString("alertHeadline")
        )
    }

    @available(iOS 16.2, *)
    private func endAllActivities() async {
        for activity in Activity<LayerWeatherActivityAttributes>.activities {
            await activity.end(dismissalPolicy: .immediate)
        }
    }
}
