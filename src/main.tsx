import React from "react";
import ReactDOM from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import App from "./App";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NativeConfigMissing } from "@/components/NativeConfigMissing";
import { isSupabaseConfigured } from "@/lib/supabase";
import "./index.css";

async function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch (err) {
    console.warn("StatusBar init skipped:", err);
  }
}

initNativeShell().catch(console.warn);

function Root() {
  if (Capacitor.isNativePlatform() && !isSupabaseConfigured) {
    return <NativeConfigMissing />;
  }
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
