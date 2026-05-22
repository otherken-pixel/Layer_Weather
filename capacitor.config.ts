import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.weartoday.app",
  appName: "WearToday",
  webDir: "dist",
  server: { androidScheme: "https" },
  plugins: {
    Geolocation: {
      androidPermissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
    },
  },
};

export default config;
