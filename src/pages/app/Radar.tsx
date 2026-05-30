import React, { useState, useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Circle, useMap, WMSTileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAppStore } from "@/store";
import { useDarkMode } from "@/hooks/useDarkMode";
import { deriveAccentPalette, loadAccentLocal } from "@/hooks/useAccentTheme";

function WindMarker({ lat, lng, windDir, windSpeed, isDark }: {
  lat: number; lng: number; windDir: number; windSpeed: number; isDark: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    const bg = isDark ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.88)";
    const border = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
    const arrowColor = isDark ? "rgba(255,255,255,0.85)" : "rgba(30,30,30,0.75)";
    const textColor = isDark ? "rgba(255,255,255,0.9)" : "#111827";

    const icon = L.divIcon({
      className: "",
      iconSize: [56, 68],
      iconAnchor: [28, 34],
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;pointer-events:none;">
          <div style="
            width:44px;height:44px;border-radius:50%;
            background:${bg};border:1px solid ${border};
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 2px 8px rgba(0,0,0,0.25);
          ">
            <svg width="22" height="22" viewBox="0 0 22 22" style="transform:rotate(${(windDir + 180) % 360}deg);transition:transform 0.6s ease;">
              <polygon points="11,3 14,16 11,13 8,16" fill="${arrowColor}" />
              <circle cx="11" cy="11" r="2" fill="${arrowColor}" opacity="0.5" />
            </svg>
          </div>
          <div style="
            background:${bg};border:1px solid ${border};border-radius:8px;
            padding:2px 7px;font-size:11px;font-weight:700;color:${textColor};
            box-shadow:0 1px 4px rgba(0,0,0,0.2);white-space:nowrap;
          ">${windSpeed} mph</div>
        </div>
      `,
    });

    const marker = L.marker([lat, lng], { icon, interactive: false, zIndexOffset: 500 }).addTo(map);
    return () => { map.removeLayer(marker); };
  }, [lat, lng, windDir, windSpeed, isDark, map]);

  return null;
}

const RADAR_MAX_ZOOM = 12;
/** RainViewer tiles are only served through zoom 7 (see rainviewer.com/api/weather-maps-api.html). */
const RAINVIEWER_NATIVE_MAX_ZOOM = 7;
const RADAR_DEFAULT_ZOOM = 7;

interface RVFrame { time: number; path: string; }
interface RVManifest {
  host: string;
  radar: { past: RVFrame[]; nowcast: RVFrame[] };
}

const RADAR_LEGEND = [
  { color: "#90d0f0", label: "Drizzle" },
  { color: "#40b840", label: "Light" },
  { color: "#f0f040", label: "Moderate" },
  { color: "#e08820", label: "Heavy" },
  { color: "#d82020", label: "Intense" },
  { color: "#a000b0", label: "Extreme" },
] as const;

const RADAR_LEGEND_GRADIENT = `linear-gradient(to right, ${RADAR_LEGEND.map((e) => e.color).join(", ")})`;

type RadarLayer = "rain" | "aq" | "pollen";
type PollenSubType = "pollen_tree" | "pollen_grass" | "pollen_weed";

const AQI_LEGEND = [
  { color: "#00e400", label: "Good" },
  { color: "#ffff00", label: "Moderate" },
  { color: "#ff7e00", label: "Sensitive" },
  { color: "#ff0000", label: "Unhealthy" },
  { color: "#8f3f97", label: "Very Unhl" },
  { color: "#7e0023", label: "Hazardous" },
] as const;
const AQI_LEGEND_GRADIENT = `linear-gradient(to right, ${AQI_LEGEND.map((e) => e.color).join(", ")})`;

const POLLEN_LEGEND = [
  { color: "#9ed97f", label: "None" },
  { color: "#f5e642", label: "Low" },
  { color: "#f5a442", label: "Moderate" },
  { color: "#e05a3a", label: "High" },
  { color: "#8b2a2a", label: "Very High" },
] as const;
const POLLEN_LEGEND_GRADIENT = `linear-gradient(to right, ${POLLEN_LEGEND.map((e) => e.color).join(", ")})`;

const _SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? "";
const SUPABASE_FN_BASE = _SUPABASE_URL ? `${_SUPABASE_URL}/functions/v1` : "";

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
    let started = false;
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
    const onStart = () => { pending += 1; started = true; };
    const onLoad = () => {
      pending = Math.max(0, pending - 1);
      if (started && pending === 0) done();
    };
    const onLayerLoad = () => done();
    const timer = setTimeout(done, timeoutMs);
    layer.on("tileloadstart", onStart);
    layer.on("tileload", onLoad);
    layer.on("tileerror", onLoad);
    layer.on("load", onLayerLoad);
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
  const location = useAppStore((s) => s.location);
  const profile = useAppStore((s) => s.profile);
  const weather = useAppStore((s) => s.weather);
  const activeAlerts = useAppStore((s) => s.activeAlerts);
  const isDark = useDarkMode(profile?.theme_preference ?? null);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());

  const [manifest, setManifest] = useState<RVManifest | null>(null);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [radarSource, setRadarSource] = useState<"rainviewer" | "ncep">("rainviewer");
  const [activeLayer, setActiveLayer] = useState<RadarLayer>("rain");
  const [pollenSubType, setPollenSubType] = useState<PollenSubType>("pollen_tree");

  // Scrubber
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(300);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const isScrubbingRef = useRef(false);

  useEffect(() => {
    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then((r) => {
        if (!r.ok) throw new Error(`RainViewer manifest ${r.status}`);
        return r.json();
      })
      .then((data: RVManifest) => {
        setManifest(data);
        setFrameIdx(Math.max(0, data.radar.past.length - 1));
        setLoading(false);
      })
      .catch(() => {
        setFetchError(true);
        setLoading(false);
      });
  }, []);

  const allFrames = useMemo<RVFrame[]>(
    () => (manifest ? [...manifest.radar.past, ...manifest.radar.nowcast] : []),
    [manifest],
  );

  useEffect(() => {
    if (!playing || allFrames.length === 0 || radarSource !== "rainviewer" || activeLayer !== "rain") return;
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

  // Measure track width for thumb positioning
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setTrackWidth(el.getBoundingClientRect().width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const seekFromPointer = (el: HTMLDivElement, clientX: number) => {
    if (allFrames.length === 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setFrameIdx(Math.round(ratio * (allFrames.length - 1)));
  };

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isScrubbingRef.current = true;
    setIsScrubbing(true);
    setPlaying(false);
    seekFromPointer(e.currentTarget, e.clientX);
  };

  const handleTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return;
    seekFromPointer(e.currentTarget, e.clientX);
  };

  const handleTrackPointerUp = () => {
    isScrubbingRef.current = false;
    setIsScrubbing(false);
  };

  const currentFrame = allFrames[frameIdx];
  const tileUrl =
    manifest && currentFrame
      ? `${manifest.host.replace(/^http:\/\//, "https://")}${currentFrame.path}/256/{z}/{x}/{y}/2/1_1.png`
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

  // Playhead position
  const thumbPct = allFrames.length <= 1 ? 0 : frameIdx / (allFrames.length - 1);
  const THUMB_W = 4;
  const thumbLeft = trackWidth > THUMB_W ? thumbPct * (trackWidth - THUMB_W) : 0;

  const lat = location?.latitude;
  const lng = location?.longitude;

  // Show NCEP toggle only when location is within CONUS bounds
  const isConus =
    typeof lat === "number" && typeof lng === "number" &&
    lat >= 24 && lat <= 50 && lng >= -125 && lng <= -66;

  const center = useMemo<[number, number]>(
    () =>
      typeof lat === "number" && typeof lng === "number"
        ? [lat, lng]
        : [37.7749, -122.4194],
    [lat, lng],
  );

  const mapKey = `${center[0].toFixed(4)}-${center[1].toFixed(4)}`;

  const aqTileUrl = SUPABASE_FN_BASE
    ? `${SUPABASE_FN_BASE}/google-map-tiles?type=aq_us&z={z}&x={x}&y={y}`
    : null;
  const pollenTileUrl = SUPABASE_FN_BASE
    ? `${SUPABASE_FN_BASE}/google-map-tiles?type=${pollenSubType}&z={z}&x={x}&y={y}`
    : null;

  const activeLegendGradient =
    activeLayer === "aq" ? AQI_LEGEND_GRADIENT :
    activeLayer === "pollen" ? POLLEN_LEGEND_GRADIENT :
    RADAR_LEGEND_GRADIENT;
  const activeLegend =
    activeLayer === "aq" ? AQI_LEGEND :
    activeLayer === "pollen" ? POLLEN_LEGEND :
    RADAR_LEGEND;
  const activeLegendLabel =
    activeLayer === "aq" ? "Air Quality Index" :
    activeLayer === "pollen" ? "Pollen Index" :
    "Precipitation";

  const localAccent = loadAccentLocal();
  const radarCircleColor = useMemo(
    () => deriveAccentPalette(profile?.accent_color ?? localAccent).primary,
    [profile?.accent_color, localAccent],
  );

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
  const legendBg = isDark ? "rgba(0,0,0,0.62)" : "rgba(255,255,255,0.88)";
  const legendBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const legendLabel = isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.65)";
  const legendHeader = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.38)";

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
        {activeLayer === "rain" && radarSource === "rainviewer" && tileUrl && <RadarOverlay url={tileUrl} />}
        {activeLayer === "rain" && radarSource === "ncep" && (
          <WMSTileLayer
            url="https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows"
            layers="conus_bref_qcd"
            format="image/png"
            transparent={true}
            opacity={0.7}
            version="1.3.0"
            attribution="NOAA/NCEP"
          />
        )}
        {activeLayer === "aq" && aqTileUrl && (
          <TileLayer url={aqTileUrl} opacity={0.65} zIndex={200} maxNativeZoom={16} crossOrigin="anonymous" />
        )}
        {activeLayer === "pollen" && pollenTileUrl && (
          <TileLayer key={pollenSubType} url={pollenTileUrl} opacity={0.65} zIndex={200} maxNativeZoom={16} crossOrigin="anonymous" />
        )}
        <Circle
          center={center}
          radius={1500}
          pathOptions={{ color: radarCircleColor, fillColor: radarCircleColor, fillOpacity: 0.7, weight: 2 }}
        />
        {weather?.current.windSpeed != null && weather.current.windDirection != null && (
          <WindMarker
            lat={center[0]}
            lng={center[1]}
            windDir={weather.current.windDirection}
            windSpeed={Math.round(weather.current.windSpeed)}
            isDark={isDark}
          />
        )}
      </MapContainer>

      {/* Severe weather alert banners */}
      {activeAlerts
        .filter((a) => !dismissedAlertIds.has(a.id) && (a.severity === "EXTREME" || a.severity === "SEVERE") && new Date(a.expires) > new Date())
        .map((alert) => {
          const isExtreme = alert.severity === "EXTREME";
          const bg = isExtreme
            ? isDark ? "rgba(239,68,68,0.85)" : "rgba(220,38,38,0.92)"
            : isDark ? "rgba(249,115,22,0.82)" : "rgba(234,88,12,0.90)";
          return (
            <div
              key={alert.id}
              style={{
                position: "absolute", top: 8, left: 12, right: 52, zIndex: 1100,
                background: bg, borderRadius: 12,
                padding: "8px 36px 8px 12px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
                backdropFilter: "blur(6px)",
              }}
            >
              <p style={{ margin: 0, color: "white", fontSize: 12, fontWeight: 700, lineHeight: 1.35 }}>
                {isExtreme ? "🚨 " : "⚠️ "}{alert.headline}
              </p>
              <button
                type="button"
                aria-label="Dismiss alert"
                onClick={() => setDismissedAlertIds((prev) => new Set([...prev, alert.id]))}
                style={{
                  position: "absolute", top: 6, right: 8,
                  width: 24, height: 24, borderRadius: "50%",
                  border: "none", background: "rgba(255,255,255,0.25)",
                  color: "white", fontSize: 14, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>
          );
        })}

      {/* Bottom controls overlay */}
      <div
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 1000,
          padding: "20px 20px calc(16px + env(safe-area-inset-bottom, 0px))",
          background: overlayGradient,
          pointerEvents: "none",
        }}
      >
        {/* Layer switcher */}
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 12, pointerEvents: "auto" }}>
          {(["rain", "aq", "pollen"] as RadarLayer[]).map((layer) => {
            const isActive = activeLayer === layer;
            return (
              <button
                key={layer}
                type="button"
                onClick={() => setActiveLayer(layer)}
                className="min-h-[36px]"
                style={{
                  background: isActive ? btnPrimaryBg : btnSecondaryBg,
                  border: `1px solid ${isActive ? btnPrimaryBorder : btnSecondaryBorder}`,
                  borderRadius: 999, padding: "6px 14px",
                  color: isActive ? btnPrimaryColor : btnSecondaryColor,
                  fontWeight: isActive ? 700 : 400, fontSize: 12, cursor: "pointer",
                }}
              >
                {layer === "rain" ? "🌧 Rain" : layer === "aq" ? "💨 Air" : "🌿 Pollen"}
              </button>
            );
          })}
        </div>

        {/* Legend (dynamic per layer) */}
        <div style={{ marginBottom: 14, pointerEvents: "none" }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: legendHeader, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.6, textAlign: "center" }}>
            {activeLegendLabel}
          </div>
          <div style={{ height: 6, borderRadius: 999, background: activeLegendGradient }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
            {activeLegend.map(({ label }) => (
              <span key={label} style={{ fontSize: 9, color: legendLabel, fontWeight: 500 }}>{label}</span>
            ))}
          </div>
        </div>

        {/* Pollen sub-type selector */}
        {activeLayer === "pollen" && (
          <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 10, pointerEvents: "auto" }}>
            {(["pollen_tree", "pollen_grass", "pollen_weed"] as PollenSubType[]).map((sub) => {
              const isActive = pollenSubType === sub;
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setPollenSubType(sub)}
                  className="min-h-[34px]"
                  style={{
                    background: isActive ? btnPrimaryBg : btnSecondaryBg,
                    border: `1px solid ${isActive ? btnPrimaryBorder : btnSecondaryBorder}`,
                    borderRadius: 999, padding: "5px 12px",
                    color: isActive ? btnPrimaryColor : btnSecondaryColor,
                    fontWeight: isActive ? 700 : 400, fontSize: 11, cursor: "pointer",
                  }}
                >
                  {sub === "pollen_tree" ? "🌳 Tree" : sub === "pollen_grass" ? "🌾 Grass" : "🌿 Weed"}
                </button>
              );
            })}
          </div>
        )}

        {/* Time badge (rain only) */}
        {activeLayer === "rain" && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, pointerEvents: "auto" }}>
            <div
              style={{
                background: isPast ? badgeBg : "rgba(var(--accent-rgb),0.85)",
                borderRadius: 999, padding: "4px 14px",
                border: `1px solid ${isPast ? badgeBorder : "rgba(255,255,255,0.12)"}`,
              }}
            >
              <span style={{ color: isPast ? badgeText : "white", fontSize: 13, fontWeight: 600 }}>
                {isPast ? timeLabel : `Forecast · ${timeLabel}`}
              </span>
            </div>
          </div>
        )}

        {/* Timeline scrubber (rain only) */}
        {activeLayer === "rain" && (
          <div
            ref={trackRef}
            aria-label="Radar timeline"
            role="slider"
            aria-valuenow={frameIdx}
            aria-valuemin={0}
            aria-valuemax={Math.max(0, allFrames.length - 1)}
            style={{
              position: "relative",
              height: 44,
              marginBottom: 8,
              touchAction: "none",
              cursor: "ew-resize",
              pointerEvents: "auto",
              userSelect: "none",
            }}
            onPointerDown={handleTrackPointerDown}
            onPointerMove={handleTrackPointerMove}
            onPointerUp={handleTrackPointerUp}
            onPointerCancel={handleTrackPointerUp}
          >
            {/* Frame bars */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", gap: 3, alignItems: "flex-end", height: 22 }}>
              {allFrames.map((frame, i) => {
                const isFramePast = frame.time <= nowEpoch;
                const isActive = i === frameIdx;
                return (
                  <div
                    key={frame.time}
                    style={{
                      flex: 1,
                      height: isActive ? 22 : 6,
                      borderRadius: 3,
                      background: isActive
                        ? isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.7)"
                        : isFramePast
                        ? isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)"
                        : "rgba(108,99,255,0.45)",
                      transition: "height 0.15s ease",
                    }}
                  />
                );
              })}
            </div>

            {/* Playhead */}
            {allFrames.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  bottom: -3,
                  left: thumbLeft,
                  width: THUMB_W,
                  height: 28,
                  borderRadius: 2,
                  background: isDark ? "white" : "#1a1a1a",
                  pointerEvents: "none",
                  transition: isScrubbing ? "none" : "left 0.15s ease",
                  boxShadow: "0 1px 6px rgba(0,0,0,0.35)",
                }}
              />
            )}
          </div>
        )}

        {/* Controls row (rain only) */}
        {activeLayer === "rain" && (
          <div style={{ display: "flex", justifyContent: "center", gap: 10, pointerEvents: "auto" }}>
            {radarSource === "rainviewer" && (
              <>
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
              </>
            )}
            {isConus && (
              <button
                type="button"
                onClick={() => setRadarSource((s) => s === "rainviewer" ? "ncep" : "rainviewer")}
                className="min-h-[44px]"
                style={{
                  background: radarSource === "ncep" ? btnPrimaryBg : btnSecondaryBg,
                  border: `1px solid ${radarSource === "ncep" ? btnPrimaryBorder : btnSecondaryBorder}`,
                  borderRadius: 999, padding: "8px 16px",
                  color: radarSource === "ncep" ? btnPrimaryColor : btnSecondaryColor,
                  fontSize: 12, cursor: "pointer",
                }}
              >
                🛰 NOAA
              </button>
            )}
          </div>
        )}
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
                    .then((r) => {
                      if (!r.ok) throw new Error(`RainViewer manifest ${r.status}`);
                      return r.json();
                    })
                    .then((data: RVManifest) => {
                      setManifest(data);
                      setFrameIdx(Math.max(0, data.radar.past.length - 1));
                      setLoading(false);
                    })
                    .catch(() => {
                      setFetchError(true);
                      setLoading(false);
                    });
                }}
                style={{
                  padding: "8px 20px", borderRadius: 999, border: "none",
                  background: "var(--accent-primary)", color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer",
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
          fontSize: 9, color: attributionColor, textAlign: "right", lineHeight: 1.6,
        }}
      >
        ©{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: attributionColor }}>OpenStreetMap</a>
        {" "}contributors ·{" "}
        <a href="https://carto.com" target="_blank" rel="noopener noreferrer" style={{ color: attributionColor }}>CARTO</a>
        {activeLayer === "rain"
          ? (radarSource === "rainviewer" ? " · RainViewer" : " · NOAA/NCEP")
          : activeLayer === "aq"
          ? " · Google Air Quality"
          : " · Google Pollen"}
      </div>
    </div>
  );
}
