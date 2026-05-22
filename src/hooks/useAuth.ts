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
  const isLoadingUser = useRef(false);
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

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await loadUser(session.user.id);
      }
      clearTimeout(authTimeout);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await loadUser(session.user.id);
      } else if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
        localStorage.removeItem(IS_ONBOARDED_KEY);
        reset();
        await clearWeatherCache();
      }
    });

    return () => {
      clearTimeout(authTimeout);
      listener.subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadUser(id: string) {
    // Prevent concurrent loadUser calls from racing each other
    if (isLoadingUser.current) return;
    isLoadingUser.current = true;

    try {
      setUserId(id);

      // Apply localStorage fast-path so returning users never see onboarding on reload
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
            // Pending sync failed; keep isOnboarded state from localStorage fast-path
          }
        } else if (!localStorage.getItem(IS_ONBOARDED_KEY)) {
          // No calibration in DB, no pending, never onboarded — send to onboarding
          setIsOnboarded(false);
        }
        // If localStorage says onboarded but DB returned null (network timeout),
        // we trust localStorage and leave isOnboarded as true.
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
    } finally {
      isLoadingUser.current = false;
    }
  }

  return { userId, profile, isAuthenticated: !!userId, isLoading };
}
