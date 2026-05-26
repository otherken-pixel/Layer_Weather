import { registerPlugin } from "@capacitor/core";

export interface WidgetBridgePlugin {
  saveWidgetData(options: { key: string; value: string }): Promise<void>;
  readWidgetData(options: { key: string }): Promise<{ value: string | null }>;
  reloadTimelines(): Promise<void>;
}

// Web stub: silently no-ops so the rest of the app works in browser dev mode.
const webStub: WidgetBridgePlugin = {
  saveWidgetData: async () => {},
  readWidgetData: async () => ({ value: null }),
  reloadTimelines: async () => {},
};

export const WidgetBridge = registerPlugin<WidgetBridgePlugin>("WidgetBridge", {
  web: webStub,
});
