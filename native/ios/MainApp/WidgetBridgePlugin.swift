import Foundation
import Capacitor
import WidgetKit

/// Capacitor plugin that writes data to the shared App Group UserDefaults so
/// WidgetKit extensions and the Apple Watch app can read it without launching
/// the main app. Also triggers WidgetKit timeline reloads.
///
/// Register in `LayerWeatherBridgeViewController.capacitorDidLoad()` (Capacitor 6).
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "saveWidgetData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readWidgetData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reloadTimelines", returnType: CAPPluginReturnPromise),
    ]

    private let suiteName = "group.com.layerweather.shared"

    private var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: suiteName)
    }

    @objc func saveWidgetData(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), let value = call.getString("value") else {
            call.reject("Missing required parameters: key, value")
            return
        }
        guard let defaults = sharedDefaults else {
            call.reject(
                "App Group UserDefaults unavailable. Enable App Groups capability " +
                "group.com.layerweather.shared on the App target."
            )
            return
        }
        defaults.set(value, forKey: key)
        defaults.synchronize()
        call.resolve()
    }

    @objc func readWidgetData(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("Missing required parameter: key")
            return
        }
        guard let defaults = sharedDefaults else {
            call.reject(
                "App Group UserDefaults unavailable. Enable App Groups capability " +
                "group.com.layerweather.shared on the App target."
            )
            return
        }
        let value = defaults.string(forKey: key)
        call.resolve(["value": value as Any])
    }

    @objc func reloadTimelines(_ call: CAPPluginCall) {
        WidgetCenter.shared.reloadAllTimelines()
        WatchConnectivityHandler.shared.syncWidgetPayloadToWatch()
        call.resolve()
    }
}
