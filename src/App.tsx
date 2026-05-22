import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store";

import Welcome from "@/pages/auth/Welcome";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import Onboarding from "@/pages/onboarding/Onboarding";
import AppLayout from "@/components/layout/AppLayout";
import Home from "@/pages/app/Home";
import Forecast from "@/pages/app/Forecast";
import Packing from "@/pages/app/Packing";
import Settings from "@/pages/app/Settings";

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isOnboarded } = useAppStore();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: "#1a1a2e" }}>
        <div className="text-4xl animate-pulse">☀️</div>
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
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Navigate to="home" replace />} />
              <Route path="home" element={<Home />} />
              <Route path="forecast" element={<Forecast />} />
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
