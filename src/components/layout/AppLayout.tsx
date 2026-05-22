import React from "react";
import { Outlet } from "react-router-dom";
import { TabBar } from "./TabBar";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const TAB_BAR_HEIGHT = 56;

export default function AppLayout() {
  usePushNotifications();

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
