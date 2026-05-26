import Foundation
import Capacitor
import WidgetKit

/// Capacitor plugin that writes data to the shared App Group UserDefaults so
/// WidgetKit extensions and the Apple Watch app can read it without launching
/// the main app. Also triggers WidgetKit timeline reloads.
///
/// Registered automatically by Capacitor via the @objc annotation.
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
        sharedDefaults?.set(value, forKey: key)
        call.resolve()
    }

    @objc func readWidgetData(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("Missing required parameter: key")
            return
        }
        let value = sharedDefaults?.string(forKey: key)
        call.resolve(["value": value as Any])
    }

    @objc func reloadTimelines(_ call: CAPPluginCall) {
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}
