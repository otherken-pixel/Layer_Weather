import React, { useRef, useEffect, useState, useMemo, useCallback, forwardRef, useImperativeHandle } from "react";
import { motion, useMotionValue, useMotionValueEvent, AnimatePresence, animate } from "framer-motion";
import type { HourlyForecast, DailyForecast } from "@/types";

const SNAP_BACK_DELAY_MS = 4000;
const THUMB_SIZE = 22;

export interface SunMoonScrubberRef {
  snapBackNow: () => void;
}

interface Props {
  hourlyToday: HourlyForecast[];
  today: DailyForecast;
  onScrubChange: (hour: HourlyForecast | null) => void;
}

function formatHour(date: Date): string {
  return date.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
}

export const SunMoonScrubber = forwardRef<SunMoonScrubberRef, Props>(function SunMoonScrubber(
  { hourlyToday, today, onScrubChange }: Props,
  ref,
) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbX = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const [trackWidth, setTrackWidth] = useState(220);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);
  const scrubIndexRef = useRef<number | null>(null);

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setNowMs(Date.now());
  }, [hourlyToday]);

  const currentIndex = useMemo(() => {
    if (hourlyToday.length === 0) return 0;
    return hourlyToday.reduce((best, h, i) => {
      const diff = Math.abs(h.time.getTime() - nowMs);
      const bestDiff = Math.abs(hourlyToday[best].time.getTime() - nowMs);
      return diff < bestDiff ? i : best;
    }, 0);
  }, [hourlyToday, nowMs]);

  const getXForIndex = useCallback((idx: number, w: number) => {
    const maxX = Math.max(0, w - THUMB_SIZE);
    if (hourlyToday.length <= 1) return 0;
    return (idx / (hourlyToday.length - 1)) * maxX;
  }, [hourlyToday.length]);

  const getIndexForX = useCallback((xVal: number, w: number) => {
    const maxX = Math.max(0, w - THUMB_SIZE);
    if (maxX === 0 || hourlyToday.length <= 1) return 0;
    const ratio = Math.max(0, Math.min(1, xVal / maxX));
    return Math.round(ratio * (hourlyToday.length - 1));
  }, [hourlyToday.length]);

  // Interpolate sun X between hourly positions based on actual current time (smooth tracking)
  const continuousX = useMemo(() => {
    if (hourlyToday.length <= 1 || trackWidth === 0) return getXForIndex(currentIndex, trackWidth);
    const now = nowMs;
    let lo = 0;
    for (let i = 0; i < hourlyToday.length; i++) {
      if (hourlyToday[i].time.getTime() <= now) lo = i;
      else break;
    }
    const hi = Math.min(lo + 1, hourlyToday.length - 1);
    const t0 = hourlyToday[lo].time.getTime();
    const t1 = hourlyToday[hi].time.getTime();
    if (t1 === t0) return getXForIndex(lo, trackWidth);
    const frac = Math.max(0, Math.min(1, (now - t0) / (t1 - t0)));
    return getXForIndex(lo, trackWidth) + frac * (getXForIndex(hi, trackWidth) - getXForIndex(lo, trackWidth));
  }, [hourlyToday, nowMs, trackWidth, currentIndex, getXForIndex]);

  // Measure track and set initial thumb position
  useEffect(() => {
    if (!trackRef.current) return;
    const w = trackRef.current.getBoundingClientRect().width;
    setTrackWidth(w);
    thumbX.set(getXForIndex(currentIndex, w));
  // Intentionally runs once on mount; currentIndex is stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  scrubIndexRef.current = scrubIndex;

  // Sync thumb to interpolated position while not scrubbing (smooth real-time tracking)
  useEffect(() => {
    if (!isDraggingRef.current && scrubIndexRef.current === null && trackWidth > 0) {
      thumbX.set(continuousX);
    }
  }, [continuousX, trackWidth, thumbX]);

  // Update scrubIndex reactively while dragging
  useMotionValueEvent(thumbX, "change", (latest) => {
    if (!isDraggingRef.current) return;
    const idx = getIndexForX(latest, trackWidth);
    setScrubIndex((prev) => (idx !== prev ? idx : prev));
  });

  useEffect(() => {
    if (scrubIndex !== null) {
      onScrubChange(hourlyToday[scrubIndex] ?? null);
    }
  }, [scrubIndex, hourlyToday, onScrubChange]);

  const scheduleSnapBack = useCallback(() => {
    if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    snapTimerRef.current = setTimeout(() => {
      void animate(thumbX, continuousX, { type: "spring", stiffness: 180, damping: 22 });
      setScrubIndex(null);
      onScrubChange(null);
    }, SNAP_BACK_DELAY_MS);
  }, [continuousX, thumbX, onScrubChange]);

  useImperativeHandle(ref, () => ({
    snapBackNow: () => {
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
      void animate(thumbX, continuousX, { type: "spring", stiffness: 180, damping: 22 });
      setScrubIndex(null);
      onScrubChange(null);
    },
  }), [continuousX, thumbX, onScrubChange]);

  const handleDragStart = useCallback(() => {
    if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    if (trackRef.current) {
      const w = trackRef.current.getBoundingClientRect().width;
      setTrackWidth(w);
    }
    isDraggingRef.current = true;
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);
    scheduleSnapBack();
  }, [scheduleSnapBack]);

  useEffect(() => () => {
    if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
  }, []);

  const displayIndex = scrubIndex ?? currentIndex;
  const displayHour = hourlyToday[displayIndex];
  const isNight = displayHour
    ? (displayHour.time.getTime() < today.sunrise.getTime() ||
       displayHour.time.getTime() > today.sunset.getTime())
    : false;

  // Day zone position on track (percentage-based, no units dependency)
  const sunriseIdx = useMemo(() =>
    hourlyToday.findIndex(h => h.time.getTime() >= today.sunrise.getTime()),
  [hourlyToday, today.sunrise]);

  const sunsetIdx = useMemo(() => {
    for (let i = hourlyToday.length - 1; i >= 0; i--) {
      if (hourlyToday[i].time.getTime() <= today.sunset.getTime()) return i;
    }
    return -1;
  }, [hourlyToday, today.sunset]);

  const n = hourlyToday.length - 1;
  const sunrisePct = sunriseIdx >= 0 && n > 0 ? (sunriseIdx / n) * 100 : 0;
  const sunsetPct = sunsetIdx >= 0 && n > 0 ? (sunsetIdx / n) * 100 : 100;
  const maxDragX = Math.max(0, trackWidth - THUMB_SIZE);

  if (hourlyToday.length === 0) return null;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 260,
        position: "relative",
        height: 44,
        display: "flex",
        alignItems: "center",
        marginTop: 8,
        // Let vertical scroll pass through
        touchAction: "pan-y",
      }}
      role="slider"
      aria-label="Time of day scrubber"
      aria-valuenow={displayHour?.time.getHours() ?? 0}
      aria-valuemin={hourlyToday[0]?.time.getHours() ?? 0}
      aria-valuemax={hourlyToday[hourlyToday.length - 1]?.time.getHours() ?? 23}
    >
      {/* Track */}
      <div
        ref={trackRef}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: 4,
          background: "rgba(255,255,255,0.18)",
          borderRadius: 2,
          overflow: "visible",
        }}
      >
        {/* Day zone glow */}
        <div
          style={{
            position: "absolute",
            left: `${sunrisePct}%`,
            width: `${Math.max(0, sunsetPct - sunrisePct)}%`,
            height: "100%",
            background: "linear-gradient(90deg, rgba(255,180,0,0.45), rgba(255,215,0,0.65), rgba(255,140,0,0.45))",
            borderRadius: 2,
          }}
        />
        {/* Sunrise tick */}
        {sunriseIdx >= 0 && (
          <div
            style={{
              position: "absolute",
              left: `${sunrisePct}%`,
              top: -4,
              width: 2,
              height: 12,
              background: "rgba(255,210,100,0.6)",
              borderRadius: 1,
              transform: "translateX(-50%)",
            }}
          />
        )}
        {/* Sunset tick */}
        {sunsetIdx >= 0 && (
          <div
            style={{
              position: "absolute",
              left: `${sunsetPct}%`,
              top: -4,
              width: 2,
              height: 12,
              background: "rgba(255,140,60,0.6)",
              borderRadius: 1,
              transform: "translateX(-50%)",
            }}
          />
        )}
      </div>

      {/* Draggable thumb */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: maxDragX }}
        dragElastic={0.06}
        dragMomentum={false}
        style={{
          position: "absolute",
          left: 0,
          x: thumbX,
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          cursor: isDragging ? "grabbing" : "grab",
          touchAction: "pan-y",
          zIndex: 10,
          userSelect: "none",
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        animate={{ scale: isDragging ? 1.25 : 1 }}
        transition={{ scale: { type: "spring", stiffness: 400, damping: 20 } }}
      >
        <AnimatePresence mode="wait">
          {isNight ? (
            <motion.div
              key="moon"
              initial={{ opacity: 0, rotate: -30, scale: 0.6 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 30, scale: 0.6 }}
              transition={{ duration: 0.25 }}
              style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
            >
              <svg
                width={THUMB_SIZE}
                height={THUMB_SIZE}
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="11" fill="#1C1F3A" />
                {/* Crescent: large filled circle offset to create crescent shape */}
                <path
                  d="M16.5 12a5.5 5.5 0 1 1-5.5-5.5 4.2 4.2 0 0 0 5.5 5.5z"
                  fill="#F0DC82"
                  style={{ filter: "drop-shadow(0 0 3px rgba(240,220,130,0.6))" }}
                />
              </svg>
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ opacity: 0, rotate: 30, scale: 0.6 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: -30, scale: 0.6 }}
              transition={{ duration: 0.25 }}
              style={{
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                borderRadius: "50%",
                background: "radial-gradient(circle at 40% 40%, #FFF9C4, #FFD700 50%, #FF9500)",
                boxShadow: isDragging
                  ? "0 0 16px 6px rgba(255,185,0,0.9), 0 2px 8px rgba(0,0,0,0.35)"
                  : "0 0 6px 2px rgba(255,185,0,0.55), 0 1px 3px rgba(0,0,0,0.3)",
                animation: isDragging ? "none" : "wx-sun-pulse 3s ease-in-out infinite",
              }}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>

        {/* Floating time chip — attached to thumb so it moves with it */}
        <AnimatePresence>
          {isDragging && displayHour && (
            <motion.div
              key="time-chip"
              initial={{ opacity: 0, y: 8, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
              style={{
                position: "absolute",
                bottom: "calc(100% + 10px)",
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(0,0,0,0.68)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                borderRadius: 10,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 700,
                color: "white",
                whiteSpace: "nowrap",
                pointerEvents: "none",
                border: "1px solid rgba(255,255,255,0.2)",
                letterSpacing: "0.01em",
              }}
            >
              {formatHour(displayHour.time)}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
});
