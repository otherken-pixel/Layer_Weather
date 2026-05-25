import React from "react";
import { Outlet } from "react-router-dom";
import { TabBar } from "./TabBar";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAccentTheme } from "@/hooks/useAccentTheme";
import { useAppStore } from "@/store";

const TAB_BAR_HEIGHT = 56;

export default function AppLayout() {
  usePushNotifications();
  const accentColor = useAppStore((s) => s.profile?.accent_color);
  useAccentTheme(accentColor);

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
