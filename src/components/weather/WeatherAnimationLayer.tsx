import React, { useMemo, useEffect, useState, useRef } from "react";

type WeatherCondition =
  | "clear" | "partly_cloudy" | "cloudy" | "foggy"
  | "drizzle" | "rain" | "heavy_rain" | "snow" | "thunderstorm";

interface Props {
  condition: WeatherCondition;
  isDay: boolean;
}

export function WeatherAnimationLayer({ condition, isDay }: Props) {
  const [lightningOn, setLightningOn] = useState(false);
  const outerFlashTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const innerFlashTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (condition !== "thunderstorm") return;
    let cancelled = false;
    function scheduleNextFlash() {
      if (cancelled) return;
      const delay = 4000 + Math.random() * 7000;
      outerFlashTimerRef.current = setTimeout(() => {
        if (cancelled) return;
        setLightningOn(true);
        innerFlashTimerRef.current = setTimeout(() => {
          if (cancelled) return;
          setLightningOn(false);
          scheduleNextFlash();
        }, 180);
      }, delay);
    }
    scheduleNextFlash();
    return () => {
      cancelled = true;
      if (outerFlashTimerRef.current !== undefined) clearTimeout(outerFlashTimerRef.current);
      if (innerFlashTimerRef.current !== undefined) clearTimeout(innerFlashTimerRef.current);
    };
  }, [condition]);

  const rainDrops = useMemo(() => {
    const isHeavy = condition === "heavy_rain" || condition === "thunderstorm";
    const count = isHeavy ? 80 : condition === "rain" ? 50 : 20;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 105,
      delay: Math.random() * 1.8,
      duration: isHeavy ? 0.55 + Math.random() * 0.25 : 1.0 + Math.random() * 0.6,
      opacity: condition === "drizzle" ? 0.28 + Math.random() * 0.2 : 0.45 + Math.random() * 0.35,
      height: condition === "drizzle" ? 7 + Math.random() * 5 : 14 + Math.random() * 10,
    }));
  }, [condition]);

  const snowFlakes = useMemo(() =>
    Array.from({ length: 38 }, (_, i) => ({
      id: i,
      left: Math.random() * 105,
      delay: Math.random() * 3.5,
      duration: 4 + Math.random() * 3,
      size: 4 + Math.random() * 8,
      opacity: 0.5 + Math.random() * 0.45,
    })),
  []);

  const stars = useMemo(() =>
    Array.from({ length: 48 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 80,
      size: 1 + Math.random() * 2.5,
      delay: Math.random() * 5,
      duration: 2 + Math.random() * 3,
    })),
  []);

  const clouds = useMemo(() => {
    const count = condition === "cloudy" ? 5 : 2;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      topPct: 4 + Math.random() * 38,
      width: 150 + Math.random() * 140,
      delay: -(i * 8 + Math.random() * 7),
      duration: 30 + Math.random() * 22,
      opacity: condition === "cloudy" ? 0.48 + Math.random() * 0.38 : 0.28 + Math.random() * 0.28,
    }));
  }, [condition]);

  const fogBands = useMemo(() =>
    Array.from({ length: 3 }, (_, i) => ({
      id: i,
      topPct: 10 + i * 24,
      delay: i * 4.5,
      duration: 14 + i * 6,
    })),
  []);

  const wrap: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: 0,
  };

  if (condition === "clear" && isDay) {
    return (
      <div style={wrap}>
        <SunAnimation size={140} discInset={22} />
      </div>
    );
  }

  if (condition === "clear" && !isDay) {
    return (
      <div style={wrap}>
        <Moon />
        {stars.map(s => (
          <div
            key={s.id}
            className="wx-star-twinkle"
            style={{
              position: "absolute",
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              borderRadius: "50%",
              background: "white",
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          />
        ))}
      </div>
    );
  }

  if (condition === "partly_cloudy") {
    return (
      <div style={wrap}>
        {isDay && <SunAnimation size={96} discInset={15} top="7%" right="9%" />}
        {clouds.map(c => <CloudShape key={c.id} {...c} />)}
      </div>
    );
  }

  if (condition === "cloudy") {
    return (
      <div style={wrap}>
        {clouds.map(c => <CloudShape key={c.id} {...c} />)}
      </div>
    );
  }

  if (condition === "foggy") {
    return (
      <div style={wrap}>
        {fogBands.map(b => (
          <div
            key={b.id}
            className="wx-fog-drift"
            style={{
              position: "absolute",
              top: `${b.topPct}%`,
              left: "-100%",
              width: "300%",
              height: 64,
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), rgba(255,255,255,0.22), rgba(255,255,255,0.12), transparent)",
              filter: "blur(10px)",
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.duration}s`,
            }}
          />
        ))}
      </div>
    );
  }

  if (condition === "drizzle" || condition === "rain" || condition === "heavy_rain") {
    const tilt =
      condition === "heavy_rain" ? "rotate(-15deg)"
      : condition === "rain" ? "rotate(-9deg)"
      : "rotate(-4deg)";
    return (
      <div style={wrap}>
        {rainDrops.map(d => (
          <div
            key={d.id}
            className="wx-rain-drop"
            style={{
              left: `${d.left}%`,
              top: -24,
              animationDelay: `${d.delay}s`,
              animationDuration: `${d.duration}s`,
            }}
          >
            <div
              style={{
                width: 2,
                height: d.height,
                borderRadius: 1,
                background: "#90CAF9",
                opacity: d.opacity,
                transform: tilt,
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (condition === "snow") {
    return (
      <div style={wrap}>
        {snowFlakes.map(s => (
          <div
            key={s.id}
            className="wx-snowflake"
            style={{
              left: `${s.left}%`,
              top: -20,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          />
        ))}
      </div>
    );
  }

  if (condition === "thunderstorm") {
    return (
      <div style={wrap}>
        {rainDrops.map(d => (
          <div
            key={d.id}
            className="wx-rain-drop"
            style={{
              left: `${d.left}%`,
              top: -24,
              animationDelay: `${d.delay}s`,
              animationDuration: `${d.duration}s`,
            }}
          >
            <div
              style={{
                width: 2,
                height: d.height,
                borderRadius: 1,
                background: "#A8C8E8",
                opacity: d.opacity,
                transform: "rotate(-15deg)",
              }}
            />
          </div>
        ))}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "rgba(255, 255, 210, 0.88)",
          opacity: lightningOn ? 1 : 0,
          transition: lightningOn ? "none" : "opacity 0.22s ease-out",
          pointerEvents: "none",
        }} />
      </div>
    );
  }

  return null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SunAnimation({
  size,
  discInset,
  top = "7%",
  right = "8%",
}: {
  size: number;
  discInset: number;
  top?: string;
  right?: string;
}) {
  return (
    <div style={{
      position: "absolute",
      top,
      right,
      width: size,
      height: size,
    }}>
      {/* atmospheric glow */}
      <div style={{
        position: "absolute",
        inset: -28,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,240,100,0.22) 35%, transparent 68%)",
      }} />
      {/* rotating rays */}
      <div
        className="wx-sun-rays-rotate"
        style={{ position: "absolute", inset: 0, transformOrigin: "center center" }}
      >
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              transform: `rotate(${i * 45}deg)`,
            }}
          >
            <div style={{
              position: "absolute",
              top: 5,
              left: "50%",
              transform: "translateX(-50%)",
              width: 4,
              height: Math.round(size * 0.14),
              borderRadius: 2,
              background: "rgba(255, 238, 70, 0.9)",
            }} />
          </div>
        ))}
      </div>
      {/* pulsing sun disc */}
      <div
        className="wx-sun-pulse"
        style={{
          position: "absolute",
          inset: discInset,
          borderRadius: "50%",
          background: "radial-gradient(circle at 38% 35%, #FFFDE7, #FFE000 55%, #FF9500 100%)",
        }}
      />
    </div>
  );
}

function Moon() {
  return (
    <div
      className="wx-moon-glow"
      style={{
        position: "absolute",
        top: "7%",
        right: "10%",
        width: 60,
        height: 60,
        borderRadius: "50%",
        background: "radial-gradient(circle at 38% 35%, #FFFDE7, #F5E062 55%, #D4A020)",
        boxShadow: "0 0 24px rgba(255,230,100,0.4), inset -6px -3px 0 rgba(0,0,0,0.12)",
      }}
    />
  );
}

function CloudShape({
  topPct,
  width,
  delay,
  duration,
  opacity,
}: {
  topPct: number;
  width: number;
  delay: number;
  duration: number;
  opacity: number;
}) {
  const height = Math.round(width * 0.44);
  return (
    <div
      className="wx-cloud-drift"
      style={{
        position: "absolute",
        top: `${topPct}%`,
        left: 0,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        opacity,
        willChange: "transform",
      }}
    >
      <svg width={width} height={height} viewBox="0 0 220 96" fill="none">
        <ellipse cx="110" cy="68" rx="102" ry="28" fill="white" />
        <ellipse cx="76" cy="56" rx="54" ry="36" fill="white" />
        <ellipse cx="148" cy="60" rx="46" ry="32" fill="white" />
        <ellipse cx="108" cy="42" rx="36" ry="28" fill="white" />
      </svg>
    </div>
  );
}
