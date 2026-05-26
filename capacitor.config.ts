import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.layerweather.app",
  appName: "Layer Weather",
  webDir: "dist",
  server: { androidScheme: "https" },
  ios: {
    minVersion: "13.0",
  },
  plugins: {
    Geolocation: {
      androidPermissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
    },
  },
};

export default config;
