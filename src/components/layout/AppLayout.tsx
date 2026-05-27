import React, { useEffect, useCallback } from "react";
import { Outlet } from "react-router-dom";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { TabBar } from "./TabBar";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAccentTheme } from "@/hooks/useAccentTheme";
import { useWeather } from "@/hooks/useWeather";
import { useAppStore, DEVICE_LOCATION_KEY } from "@/store";
import { applyPendingWidgetFeedback } from "@/lib/widget-feedback";
import { buildLocationCacheKey } from "@/lib/location-cache-key";

const TAB_BAR_HEIGHT = 56;

export default function AppLayout() {
  usePushNotifications();
  const accentColor = useAppStore((s) => s.profile?.accent_color);
  const userId = useAppStore((s) => s.userId);
  const calibration = useAppStore((s) => s.calibration);
  const activeLocationIsDevice = useAppStore((s) => s.activeLocationIsDevice);
  const { refresh } = useWeather();
  useAccentTheme(accentColor);

  const syncWidgetFeedback = useCallback(async () => {
    if (!userId) return;
    const changed = await applyPendingWidgetFeedback(userId);
    if (!changed) return;
    if (activeLocationIsDevice) {
      await refresh(true, { useDeviceLocation: true, cacheKey: DEVICE_LOCATION_KEY });
      return;
    }
    const loc = useAppStore.getState().location;
    if (loc) {
      await refresh(true, { cacheKey: buildLocationCacheKey(loc) });
    } else {
      await refresh(true);
    }
  }, [userId, activeLocationIsDevice, refresh]);

  useEffect(() => {
    if (!userId || !calibration) return;
    void syncWidgetFeedback();
    if (!Capacitor.isNativePlatform()) return;
    const handle = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void syncWidgetFeedback();
    });
    return () => {
      void handle.then((h) => h.remove());
    };
  }, [userId, calibration, syncWidgetFeedback]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <main
        className="flex-1 overflow-y-auto overscroll-none"
        style={{
          paddingBottom: `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
