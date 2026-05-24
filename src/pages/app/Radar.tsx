import React, { useState, useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAppStore } from "@/store";
import { useDarkMode } from "@/hooks/useDarkMode";

const RADAR_MAX_ZOOM = 12;
/** RainViewer tiles are only served through zoom 7 (see rainviewer.com/api/weather-maps-api.html). */
const RAINVIEWER_NATIVE_MAX_ZOOM = 7;
const RADAR_DEFAULT_ZOOM = 8;

interface RVFrame { time: number; path: string; }
interface RVManifest {
  host: string;
  radar: { past: RVFrame[]; nowcast: RVFrame[] };
}

function ZoomControls({ isDark }: { isDark: boolean }) {
  const map = useMap();
  const badgeBg = isDark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.8)";
  const badgeBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
  const badgeText = isDark ? "white" : "#1a1a1a";
  return (
    <div
      style={{
        position: "absolute",
        top: 56,
        right: 10,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <button
        type="button"
        aria-label="Zoom in"
        onClick={() => map.zoomIn()}
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          border: `1px solid ${badgeBorder}`,
          background: badgeBg,
          color: badgeText,
          fontSize: 20,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        +
      </button>
      <button
        type="button"
        aria-label="Zoom out"
        onClick={() => map.zoomOut()}
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          border: `1px solid ${badgeBorder}`,
          background: badgeBg,
          color: badgeText,
          fontSize: 20,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        −
      </button>
    </div>
  );
}

const RADAR_TILE_OPTS: L.TileLayerOptions = {
  opacity: 0,
  zIndex: 200,
  tileSize: 256,
  minZoom: 1,
  maxZoom: RADAR_MAX_ZOOM,
  maxNativeZoom: RAINVIEWER_NATIVE_MAX_ZOOM,
  crossOrigin: "anonymous",
  errorTileUrl:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
};

const FRAME_MS = 1000;
const FADE_MS = 220;

function waitForLayerTiles(layer: L.TileLayer, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    let pending = 0;
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      layer.off("tileload", onLoad);
      layer.off("tileloadstart", onStart);
      layer.off("load", onLayerLoad);
      layer.off("tileerror", onLoad);
      clearTimeout(timer);
      resolve();
    };
    const onStart = () => { pending += 1; };
    const onLoad = () => {
      pending = Math.max(0, pending - 1);
      if (pending === 0) done();
    };
    const onLayerLoad = () => done();
    const timer = setTimeout(done, timeoutMs);
    layer.on("tileloadstart", onStart);
    layer.on("tileload", onLoad);
    layer.on("tileerror", onLoad);
    layer.on("load", onLayerLoad);
    if ((layer as L.TileLayer & { _loading?: boolean })._loading === false) {
      done();
    }
  });
}

/** Dual-buffer radar overlay with crossfade and tile-ready gating. */
function RadarOverlay({ url }: { url: string }) {
  const map = useMap();
  const layersRef = useRef<[L.TileLayer | null, L.TileLayer | null]>([null, null]);
  const activeRef = useRef(0);
  const urlRef = useRef(url);
  const activeLayerUrlRef = useRef<string | null>(null);
  const animRef = useRef(0);

  useEffect(() => {
    urlRef.current = url;
    const animId = ++animRef.current;

    async function transitionTo(nextUrl: string) {
      const inactive = 1 - activeRef.current;
      let layer = layersRef.current[inactive];
      if (!layer) {
        layer = L.tileLayer(nextUrl, { ...RADAR_TILE_OPTS }).addTo(map);
        layersRef.current[inactive] = layer;
      } else {
        layer.setOpacity(0);
        layer.setUrl(nextUrl);
      }

      await waitForLayerTiles(layer, 900);
      if (animId !== animRef.current || urlRef.current !== nextUrl) return;

      const prev = layersRef.current[activeRef.current];
      layer.setOpacity(0.65);
      if (prev && prev !== layer) {
        const start = performance.now();
        const tick = (now: number) => {
          if (animId !== animRef.current) return;
          const t = Math.min(1, (now - start) / FADE_MS);
          layer!.setOpacity(0.65 * t);
          prev.setOpacity(0.65 * (1 - t));
          if (t < 1) {
            requestAnimationFrame(tick);
          } else {
            prev.setOpacity(0);
          }
        };
        requestAnimationFrame(tick);
      } else {
        layer.setOpacity(0.65);
      }
      activeRef.current = inactive;
      activeLayerUrlRef.current = nextUrl;
    }

    const current = layersRef.current[activeRef.current];
    if (!current) {
      const layer = L.tileLayer(url, { ...RADAR_TILE_OPTS, opacity: 0.65 }).addTo(map);
      layersRef.current[0] = layer;
      activeRef.current = 0;
      activeLayerUrlRef.current = url;
    } else if (activeLayerUrlRef.current !== url) {
      void transitionTo(url);
    }

    return () => {
      animRef.current += 1;
    };
  }, [url, map]);

  useEffect(() => {
    return () => {
      layersRef.current.forEach((layer) => {
        if (layer) map.removeLayer(layer);
      });
      layersRef.current = [null, null];
      activeLayerUrlRef.current = null;
    };
  }, [map]);

  return null;
}

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
      .then((r) => {
        if (!r.ok) throw new Error(`RainViewer manifest ${r.status}`);
        return r.json();
      })
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

  useEffect(() => {
    if (!playing || allFrames.length === 0) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      if (cancelled) return;
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        setFrameIdx((prev) => (prev + 1) % allFrames.length);
        scheduleNext();
      }, FRAME_MS);
    };

    scheduleNext();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
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

  const lat = location?.latitude;
  const lng = location?.longitude;
  const center = useMemo<[number, number]>(
    () =>
      typeof lat === "number" && typeof lng === "number"
        ? [lat, lng]
        : [37.7749, -122.4194],
    [lat, lng],
  );

  const mapKey = `${center[0].toFixed(4)}-${center[1].toFixed(4)}`;

  const baseTileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

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
          {"\n"}Tap your city on Today or set it in Settings.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        height: "calc(100dvh - 56px - env(safe-area-inset-bottom, 0px))",
        overflow: "hidden",
      }}
    >
      <MapContainer
        key={mapKey}
        center={center}
        zoom={RADAR_DEFAULT_ZOOM}
        minZoom={3}
        maxZoom={RADAR_MAX_ZOOM}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url={baseTileUrl} maxZoom={19} />
        <ZoomControls isDark={isDark} />
        {tileUrl && <RadarOverlay url={tileUrl} />}
        <Circle
          center={center}
          radius={1500}
          pathOptions={{ color: "#6C63FF", fillColor: "#6C63FF", fillOpacity: 0.7, weight: 2 }}
        />
      </MapContainer>

      <div
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 1000,
          padding: "20px 20px calc(16px + env(safe-area-inset-bottom, 0px))",
          background: overlayGradient,
          pointerEvents: "none",
        }}
      >
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
                type="button"
                onClick={() => { setFrameIdx(i); setPlaying(false); }}
                aria-label={`Radar frame ${new Date(frame.time * 1000).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}`}
                className="flex-1 min-h-[44px] flex items-end p-0 border-0 cursor-pointer bg-transparent"
              >
                <span
                  style={{
                    display: "block",
                    width: "100%",
                    height: isActive ? 22 : 6,
                    borderRadius: 3,
                    background: isActive
                      ? isDark ? "white" : "#1a1a1a"
                      : isFramePast
                      ? isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.3)"
                      : "rgba(108,99,255,0.55)",
                    transition: "height 0.15s ease",
                  }}
                />
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 10, pointerEvents: "auto" }}>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="min-h-[44px]"
            style={{
              background: btnPrimaryBg, border: `1px solid ${btnPrimaryBorder}`,
              borderRadius: 999, padding: "8px 22px",
              color: btnPrimaryColor, fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}
          >
            {playing ? "⏸ Pause" : "▶ Play"}
          </button>
          <button
            type="button"
            onClick={() => { setFrameIdx(Math.max(0, pastCount - 1)); setPlaying(false); }}
            className="min-h-[44px]"
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
              <button
                type="button"
                onClick={() => {
                  setFetchError(false);
                  setLoading(true);
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
                }}
                style={{
                  padding: "8px 20px", borderRadius: 999, border: "none",
                  background: "#7C3AED", color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer",
                }}
              >
                Retry
              </button>
            </>
          )}
        </div>
      )}

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
