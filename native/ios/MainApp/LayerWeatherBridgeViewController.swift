import UIKit
import Capacitor

/// Capacitor 6 requires manual registration of in-app plugins (see capacitorjs.com/docs/ios/custom-code).
@objc(LayerWeatherBridgeViewController)
class LayerWeatherBridgeViewController: CAPBridgeViewController {

    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(WidgetBridgePlugin())
        bridge?.registerPluginInstance(StoreKitPlugin())
        bridge?.registerPluginInstance(LiveActivityPlugin())
        WatchConnectivityHandler.shared.activate()
    }
}
