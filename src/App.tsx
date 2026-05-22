import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store";

import Welcome from "@/pages/auth/Welcome";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import Onboarding from "@/pages/onboarding/Onboarding";
import AppLayout from "@/components/layout/AppLayout";
import Home from "@/pages/app/Home";
import Radar from "@/pages/app/Radar";
import Packing from "@/pages/app/Packing";
import Settings from "@/pages/app/Settings";

function useHashError() {
  const [hashError, setHashError] = useState<{ code: string; description: string } | null>(null);
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const error = hash.get("error");
    if (error) {
      setHashError({ code: hash.get("error_code") ?? error, description: hash.get("error_description") ?? "An error occurred." });
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);
  return hashError;
}

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isOnboarded } = useAppStore();
  const hashError = useHashError();

  if (hashError) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-5 px-8 text-center" style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)" }}>
        <div className="text-5xl">✉️</div>
        <h1 className="text-2xl font-black text-white">Link Expired</h1>
        <p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
          {hashError.code === "otp_expired"
            ? "This email verification link has expired. Please sign in and request a new one."
            : hashError.description.replace(/\+/g, " ")}
        </p>
        <a href="/login" className="px-6 py-3 rounded-2xl text-base font-semibold text-white" style={{ background: "rgba(108,99,255,0.9)" }}>
          Go to Sign In
        </a>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-6 px-8"
        style={{ background: "#1a1a2e" }}
      >
        <div className="w-16 h-16 rounded-2xl skeleton" />
        <div className="flex flex-col items-center gap-2 w-full max-w-[200px]">
          <div className="h-4 w-full rounded skeleton" />
          <div className="h-3 w-2/3 rounded skeleton" />
        </div>
        <p className="text-sm text-white/70">Loading your account…</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {!isAuthenticated ? (
          <>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/welcome" replace />} />
          </>
        ) : !isOnboarded ? (
          <>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          </>
        ) : (
          <>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Navigate to="home" replace />} />
              <Route path="home" element={<Home />} />
              <Route path="radar" element={<Radar />} />
              <Route path="packing" element={<Packing />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/app/home" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}
