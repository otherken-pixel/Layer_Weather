import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAppStore } from "@/store";

// ── RainViewer types ──────────────────────────────────────────────────────────

interface RVFrame { time: number; path: string; }
interface RVManifest {
  host: string;
  radar: { past: RVFrame[]; nowcast: RVFrame[] };
}

// ── Dark mode hook ────────────────────────────────────────────────────────────

function useDarkMode(themePreference: string | null): boolean {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const [isDark, setIsDark] = useState(
    themePreference === "light" ? false : themePreference === "dark" ? true : systemDark
  );

  useEffect(() => {
    if (themePreference === "light") { setIsDark(false); return; }
    if (themePreference === "dark") { setIsDark(true); return; }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [themePreference]);

  return isDark;
}

// ── Radar overlay (imperative Leaflet inside react-leaflet) ───────────────────

function RadarOverlay({ url }: { url: string }) {
  const map = useMap();
  const layerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    // errorTileUrl: transparent 1×1 PNG — silently hides tiles the server can't serve
    // maxNativeZoom: caps tile requests at zoom 8 and scales up beyond that
    layerRef.current = L.tileLayer(url, {
      opacity: 0.65,
      zIndex: 200,
      tileSize: 256,
      minZoom: 1,
      maxZoom: 10,
      maxNativeZoom: 8,
      crossOrigin: "",
      errorTileUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    }).addTo(map);
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [url, map]);

  return null;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Radar() {
  const { location, profile } = useAppStore();
  const isDark = useDarkMode(profile?.theme_preference ?? null);

  const [manifest, setManifest] = useState<RVManifest | null>(null);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then((r) => r.json())
      .then((data: RVManifest) => {
        setManifest(data);
        setFrameIdx(Math.max(0, (data.radar.past.length ?? 1) - 1));
        setLoading(false);
      })
      .catch(() => {
        setFetchError(true);
        setLoading(false);
      });
  }, []);

  const allFrames: RVFrame[] = manifest
    ? [...manifest.radar.past, ...manifest.radar.nowcast]
    : [];

  // Animate
  useEffect(() => {
    if (!playing || allFrames.length === 0) return;
    const id = setInterval(
      () => setFrameIdx((prev) => (prev + 1) % allFrames.length),
      500,
    );
    return () => clearInterval(id);
  }, [playing, allFrames.length]);

  const currentFrame = allFrames[frameIdx];
  const tileUrl =
    manifest && currentFrame
      ? `${manifest.host}${currentFrame.path}/256/{z}/{x}/{y}/2/1_1.png`
      : null;

  const nowEpoch = Math.floor(Date.now() / 1000);
  const isPast = currentFrame ? currentFrame.time <= nowEpoch : true;
  const pastCount = manifest?.radar.past.length ?? 0;

  const timeLabel = currentFrame
    ? new Date(currentFrame.time * 1000).toLocaleTimeString("en", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "Now";

  const center: [number, number] = location
    ? [location.latitude, location.longitude]
    : [37.7749, -122.4194];

  const baseTileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  // Theme-aware UI tokens
  const overlayGradient = isDark
    ? "linear-gradient(to top, rgba(0,0,0,0.85) 60%, transparent)"
    : "linear-gradient(to top, rgba(255,255,255,0.92) 60%, transparent)";
  const badgeBg = isDark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.8)";
  const badgeBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
  const badgeText = isDark ? "white" : "#1a1a1a";
  const btnPrimaryBg = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)";
  const btnPrimaryBorder = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)";
  const btnPrimaryColor = isDark ? "white" : "#1a1a1a";
  const btnSecondaryBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
  const btnSecondaryBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
  const btnSecondaryColor = isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)";
  const attributionColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";
  const loadingBg = isDark ? "rgba(13,17,23,0.7)" : "rgba(240,242,245,0.85)";
  const loadingText = isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)";

  if (!location) {
    return (
      <div
        style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: 16, padding: "120px 24px",
          background: isDark ? "#0d1117" : "#f5f5f7", height: "100%",
        }}
      >
        <span style={{ fontSize: 48 }}>📍</span>
        <p style={{ color: isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.6)", textAlign: "center", lineHeight: 1.5 }}>
          Location required for radar.
          {"\n"}Complete onboarding to allow location access.
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height: "calc(100vh - 64px)", overflow: "hidden" }}>
      <MapContainer
        center={center}
        zoom={8}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url={baseTileUrl} />
        {tileUrl && <RadarOverlay url={tileUrl} />}
        <Circle
          center={center}
          radius={1500}
          pathOptions={{ color: "#6C63FF", fillColor: "#6C63FF", fillOpacity: 0.7, weight: 2 }}
        />
      </MapContainer>

      {/* Controls gradient overlay */}
      <div
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 1000,
          padding: "20px 20px 16px",
          background: overlayGradient,
          pointerEvents: "none",
        }}
      >
        {/* Time badge */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, pointerEvents: "auto" }}>
          <div
            style={{
              background: isPast ? badgeBg : "rgba(108,99,255,0.85)",
              borderRadius: 999, padding: "4px 14px",
              border: `1px solid ${isPast ? badgeBorder : "rgba(255,255,255,0.12)"}`,
            }}
          >
            <span style={{ color: isPast ? badgeText : "white", fontSize: 13, fontWeight: 600 }}>
              {isPast ? "⏪" : "🔮"} {timeLabel}
            </span>
          </div>
        </div>

        {/* Frame scrubber */}
        <div
          style={{
            display: "flex", gap: 3, alignItems: "flex-end", height: 28,
            marginBottom: 12, pointerEvents: "auto",
          }}
        >
          {allFrames.map((frame, i) => {
            const isFramePast = frame.time <= nowEpoch;
            const isActive = i === frameIdx;
            return (
              <button
                key={frame.time}
                onClick={() => { setFrameIdx(i); setPlaying(false); }}
                style={{
                  flex: 1,
                  height: isActive ? 22 : 6,
                  borderRadius: 3,
                  background: isActive
                    ? isDark ? "white" : "#1a1a1a"
                    : isFramePast
                    ? isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.3)"
                    : "rgba(108,99,255,0.55)",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  transition: "height 0.15s ease",
                }}
              />
            );
          })}
        </div>

        {/* Play/Pause + Latest */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, pointerEvents: "auto" }}>
          <button
            onClick={() => setPlaying((p) => !p)}
            style={{
              background: btnPrimaryBg, border: `1px solid ${btnPrimaryBorder}`,
              borderRadius: 999, padding: "8px 22px",
              color: btnPrimaryColor, fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}
          >
            {playing ? "⏸ Pause" : "▶ Play"}
          </button>
          <button
            onClick={() => { setFrameIdx(Math.max(0, pastCount - 1)); setPlaying(false); }}
            style={{
              background: btnSecondaryBg, border: `1px solid ${btnSecondaryBorder}`,
              borderRadius: 999, padding: "8px 18px",
              color: btnSecondaryColor, fontSize: 13, cursor: "pointer",
            }}
          >
            Latest
          </button>
        </div>
      </div>

      {/* Loading / error overlay */}
      {(loading || fetchError) && (
        <div
          style={{
            position: "absolute", inset: 0, zIndex: 2000,
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 12,
            background: loadingBg, backdropFilter: "blur(4px)",
          }}
        >
          {loading ? (
            <>
              <div style={{ fontSize: 32 }} className="animate-pulse">🛰️</div>
              <p style={{ color: loadingText, fontSize: 14 }}>Loading radar…</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 32 }}>⚡</div>
              <p style={{ color: loadingText, fontSize: 14, textAlign: "center", maxWidth: 220 }}>
                Radar data unavailable. Check your connection.
              </p>
            </>
          )}
        </div>
      )}

      {/* Map attribution (required by CartoDB) */}
      <div
        style={{
          position: "absolute", bottom: 100, right: 8, zIndex: 1000,
          fontSize: 9, color: attributionColor,
        }}
      >
        © <a
          href="https://carto.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: attributionColor }}
        >CARTO</a> · RainViewer
      </div>
    </div>
  );
}
