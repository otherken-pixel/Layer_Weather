import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const TABS = [
  { path: "/app/home", emoji: "🌤️", label: "Today" },
  { path: "/app/forecast", emoji: "📅", label: "Forecast" },
  { path: "/app/packing", emoji: "🧳", label: "Packing" },
  { path: "/app/settings", emoji: "⚙️", label: "Settings" },
];

export function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 pb-safe"
      style={{ background: "rgba(20,20,40,0.85)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.12)" }}
    >
      <div className="flex justify-around px-2 py-2">
        {TABS.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center gap-0.5 px-4 py-1 rounded-2xl transition-colors"
              style={{ minWidth: 60 }}
            >
              <motion.span
                animate={{ scale: active ? 1.15 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="text-2xl"
              >
                {tab.emoji}
              </motion.span>
              <span
                className="text-xs font-semibold"
                style={{ color: active ? "white" : "rgba(255,255,255,0.45)" }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
