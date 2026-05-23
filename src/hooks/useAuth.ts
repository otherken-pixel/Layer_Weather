import { useEffect, useRef, useState } from "react";
import { supabase, getProfile, getCalibration, upsertCalibration } from "@/lib/supabase";
import { useAppStore } from "@/store";
import { loadWeatherCache, clearWeatherCache } from "@/lib/cache";

const CALIBRATION_PENDING_KEY = "wt_calibration_pending";
const IS_ONBOARDED_KEY = "wt_is_onboarded";
const LOAD_USER_TIMEOUT_MS = 10_000;
const AUTH_LOADING_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  // Promise dequeue: second caller awaits the same running promise instead of
  // returning early and calling setIsLoading(false) while loadUser is mid-flight.
  const loadUserPromise = useRef<Promise<void> | null>(null);
  const {
    userId,
    profile,
    setUserId,
    setProfile,
    setCalibration,
    setIsOnboarded,
    setWeather,
    setOutfit,
    setWeatherLastFetched,
    setLocation,
    reset,
  } = useAppStore();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const authTimeout = setTimeout(() => setIsLoading(false), AUTH_LOADING_TIMEOUT_MS);

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION") {
        // Fires once on startup with the stored session (or null). Single path
        // for page-reload auth — no race with getSession().
        if (session?.user) {
          await loadUser(session.user.id);
        }
        clearTimeout(authTimeout);
        setIsLoading(false);
      } else if (event === "SIGNED_IN" && session?.user) {
        // Fires only on explicit sign-in (not on page reload).
        setIsLoading(true);
        await loadUser(session.user.id);
        setIsLoading(false);
      } else if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
        reset();
        await clearWeatherCache();
      }
    });

    return () => {
      clearTimeout(authTimeout);
      listener.subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadUser(id: string): Promise<void> {
    // If already running, await the same promise so both callers finish together.
    if (loadUserPromise.current) {
      return loadUserPromise.current;
    }

    const run = async () => {
      setUserId(id);

      if (localStorage.getItem(IS_ONBOARDED_KEY)) {
        setIsOnboarded(true);
      }

      const cached = await loadWeatherCache();
      if (cached) {
        setWeather(cached.weather);
        setOutfit(cached.outfit);
        setWeatherLastFetched(new Date(cached.savedAt));
      }

      const result = await withTimeout(
        Promise.all([getProfile(id), getCalibration(id)]),
        LOAD_USER_TIMEOUT_MS,
      );

      const [prof, cal] = result ?? [null, null];
      setProfile(prof);

      if (cal) {
        setCalibration(cal);
        setIsOnboarded(true);
        localStorage.setItem(IS_ONBOARDED_KEY, "1");
        localStorage.removeItem(CALIBRATION_PENDING_KEY);
      } else {
        const pending = localStorage.getItem(CALIBRATION_PENDING_KEY);
        if (pending) {
          try {
            const { payload } = JSON.parse(pending);
            const saved = await upsertCalibration(id, payload);
            if (saved) {
              setCalibration(saved);
              setIsOnboarded(true);
              localStorage.setItem(IS_ONBOARDED_KEY, "1");
              localStorage.removeItem(CALIBRATION_PENDING_KEY);
            }
          } catch {
            // Pending sync failed; keep isOnboarded from localStorage fast-path.
          }
        } else if (!localStorage.getItem(IS_ONBOARDED_KEY)) {
          setIsOnboarded(false);
        }
        // DB timed out (result === null) and localStorage says onboarded → trust it.
      }

      if (prof?.last_latitude != null && prof?.last_longitude != null) {
        setLocation({
          latitude: prof.last_latitude,
          longitude: prof.last_longitude,
          city: prof.last_city ?? cached?.weather.current.location ?? "",
          region: "",
          country: "",
        });
      }
    };

    loadUserPromise.current = run().finally(() => {
      loadUserPromise.current = null;
    });

    return loadUserPromise.current;
  }

  return { userId, profile, isAuthenticated: !!userId, isLoading };
}
