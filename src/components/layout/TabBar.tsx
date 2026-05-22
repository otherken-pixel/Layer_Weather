import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

function IconToday({ stroke }: { stroke: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="4.93" x2="7.05" y2="7.05" />
      <line x1="16.95" y1="16.95" x2="19.07" y2="19.07" />
      <line x1="19.07" y1="4.93" x2="16.95" y2="7.05" />
      <line x1="7.05" y1="16.95" x2="4.93" y2="19.07" />
    </svg>
  );
}


function IconPacking({ stroke }: { stroke: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="8" width="20" height="13" rx="2" />
      <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="2" y1="14.5" x2="22" y2="14.5" />
      <line x1="12" y1="14.5" x2="12" y2="21" />
    </svg>
  );
}

function IconSettings({ stroke }: { stroke: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      <circle cx="12" cy="12" r="7" />
    </svg>
  );
}

const TABS = [
  { path: "/app/home", Icon: IconToday, label: "Today" },
  { path: "/app/packing", Icon: IconPacking, label: "Packing" },
  { path: "/app/settings", Icon: IconSettings, label: "Settings" },
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
        {TABS.map(({ path, Icon, label }) => {
          const active = location.pathname === path;
          const stroke = active ? "#fff" : "rgba(255,255,255,0.42)";
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-0.5 px-4 py-1 rounded-2xl transition-colors"
              style={{ minWidth: 60 }}
            >
              <motion.div
                animate={{ scale: active ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <Icon stroke={stroke} />
              </motion.div>
              <span
                className="text-xs font-semibold"
                style={{ color: active ? "white" : "rgba(255,255,255,0.45)" }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
