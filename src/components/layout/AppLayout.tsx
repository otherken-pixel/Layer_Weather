import React, { useEffect, useCallback, useRef } from "react";
import { Outlet } from "react-router-dom";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { TabBar } from "./TabBar";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAccentTheme } from "@/hooks/useAccentTheme";
import { useAppStore, DEVICE_LOCATION_KEY } from "@/store";
import { applyPendingWidgetFeedback } from "@/lib/widget-feedback";
import { recomputeOutfitFromCurrentWeather } from "@/lib/recompute-outfit";
import { useWeather } from "@/hooks/useWeather";
import { syncWidgetFromAppState } from "@/lib/widget-location";

const TAB_BAR_HEIGHT = 56;

export default function AppLayout() {
  usePushNotifications();
  const accentColor = useAppStore((s) => s.profile?.accent_color);
  const userId = useAppStore((s) => s.userId);
  const calibration = useAppStore((s) => s.calibration);
  const activeLocationIsDevice = useAppStore((s) => s.activeLocationIsDevice);
  useAccentTheme(accentColor);

  const { refresh } = useWeather();
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const activeLocationIsDeviceRef = useRef(activeLocationIsDevice);
  activeLocationIsDeviceRef.current = activeLocationIsDevice;

  const syncWidgetFeedback = useCallback(async () => {
    if (!userId) return;
    const changed = await applyPendingWidgetFeedback(userId);
    if (!changed) return;
    recomputeOutfitFromCurrentWeather();
  }, [userId]);

  useEffect(() => {
    if (!userId || !calibration) return;
    void syncWidgetFeedback();
    if (!Capacitor.isNativePlatform()) return;
    const handle = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        void syncWidgetFeedback();
        void syncWidgetFromAppState();
        if (activeLocationIsDeviceRef.current) {
          void refreshRef.current(true, { useDeviceLocation: true, cacheKey: DEVICE_LOCATION_KEY });
        }
      } else {
        void syncWidgetFromAppState();
      }
    });
    return () => {
      void handle.then((h) => h.remove());
    };
  }, [userId, calibration, syncWidgetFeedback]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <main
        data-scroll-container
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
