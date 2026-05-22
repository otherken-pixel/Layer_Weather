import React from "react";
import { Outlet } from "react-router-dom";
import { TabBar } from "./TabBar";

export default function AppLayout() {
  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: "80px" }}>
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
