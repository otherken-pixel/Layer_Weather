import { useEffect, useRef, useState } from "react";

const TRIGGER_DISTANCE = 72; // px of pull needed to trigger
const MAX_PULL = 96;         // px cap for visual rubber-band

export function usePullToRefresh(onRefresh: () => void) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const pulling = useRef(false);
  const pullDistanceRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  useEffect(() => {
    const scrollEl = document.querySelector<HTMLElement>("[data-scroll-container]");
    if (!scrollEl) return;

    function onTouchStart(e: TouchEvent) {
      if (scrollEl!.scrollTop > 0) return;
      touchStartY.current = e.touches[0].clientY;
      pulling.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!pulling.current) return;
      if (scrollEl!.scrollTop > 0) {
        pulling.current = false;
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta <= 0) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }
      e.preventDefault();
      const capped = delta < TRIGGER_DISTANCE
        ? delta
        : TRIGGER_DISTANCE + (delta - TRIGGER_DISTANCE) * 0.25;
      const d = Math.min(capped, MAX_PULL);
      pullDistanceRef.current = d;
      setPullDistance(d);
    }

    function onTouchEnd() {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullDistanceRef.current >= TRIGGER_DISTANCE) {
        setIsRefreshing(true);
        setPullDistance(0);
        pullDistanceRef.current = 0;
        Promise.resolve(onRefreshRef.current()).finally(() => {
          setIsRefreshing(false);
        });
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    }

    scrollEl.addEventListener("touchstart", onTouchStart, { passive: true });
    scrollEl.addEventListener("touchmove", onTouchMove, { passive: false });
    scrollEl.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      scrollEl.removeEventListener("touchstart", onTouchStart);
      scrollEl.removeEventListener("touchmove", onTouchMove);
      scrollEl.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const triggered = pullDistance >= TRIGGER_DISTANCE;
  return { pullDistance, isRefreshing, triggered };
}
