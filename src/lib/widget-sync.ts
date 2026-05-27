import { Capacitor } from "@capacitor/core";
import { syncWidgetFromAppState } from "@/lib/widget-location";

export type WidgetBridgeHealth = {
  ok: boolean;
  hasSnapshot: boolean;
  detail: string;
};

const PROBE_KEY = "widget_bridge_probe";

/**
 * Verifies WidgetBridge can read/write the App Group (native iOS only).
 */
export async function checkWidgetBridgeHealth(): Promise<WidgetBridgeHealth> {
  if (!Capacitor.isNativePlatform()) {
    return {
      ok: false,
      hasSnapshot: false,
      detail: "Widget bridge is only available in the native iOS app.",
    };
  }

  try {
    const { WidgetBridge } = await import("@/lib/widget-bridge");
    const token = `probe-${Date.now()}`;
    await WidgetBridge.saveWidgetData({ key: PROBE_KEY, value: token });
    const probe = await WidgetBridge.readWidgetData({ key: PROBE_KEY });
    if (probe.value !== token) {
      return {
        ok: false,
        hasSnapshot: false,
        detail:
          "App Group read/write failed. Confirm App Groups capability " +
          "group.com.layerweather.shared is enabled on the App target.",
      };
    }

    const snap = await WidgetBridge.readWidgetData({ key: "widget_snapshot" });
    const hasSnapshot = Boolean(snap.value && snap.value.length > 2);
    return {
      ok: true,
      hasSnapshot,
      detail: hasSnapshot
        ? "App Group bridge is working and weather snapshot is present."
        : "Bridge works, but no weather snapshot yet. Open the Today tab to load weather.",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/UNIMPLEMENTED|not implemented/i.test(msg)) {
      return {
        ok: false,
        hasSnapshot: false,
        detail:
          "WidgetBridge is not registered. Run npm run ios:prepare and rebuild " +
          "(LayerWeatherBridgeViewController must be set in Main.storyboard).",
      };
    }
    return { ok: false, hasSnapshot: false, detail: msg };
  }
}

/** Forces a widget/watch sync from current app state and widget location preference. */
export async function forceSyncWidgetAndWatch(): Promise<WidgetBridgeHealth> {
  if (!Capacitor.isNativePlatform()) {
    return {
      ok: false,
      hasSnapshot: false,
      detail: "Sync is only available in the native iOS app.",
    };
  }

  try {
    await syncWidgetFromAppState({ forceFetch: true });
    return checkWidgetBridgeHealth();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, hasSnapshot: false, detail: msg };
  }
}
