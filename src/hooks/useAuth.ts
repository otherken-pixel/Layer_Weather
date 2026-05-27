import { useEffect, useRef, useState } from "react";
import { supabase, getProfile, getCalibration, upsertCalibration, createDefaultCalibration, upsertProfile } from "@/lib/supabase";
import { useAppStore } from "@/store";
import { loadWeatherCache, clearWeatherCache, type WeatherCachePayload } from "@/lib/cache";
import { resetPushNotificationSession } from "@/lib/notifications";
import { mergeFromCloud } from "@/lib/saved-locations";
import type { Profile, UserCalibration } from "@/types";

const CALIBRATION_PENDING_KEY = "wt_calibration_pending";
const IS_ONBOARDED_KEY = "wt_is_onboarded";
const PROFILE_CACHE_KEY = "wt_profile_cache";
const CALIBRATION_CACHE_KEY = "wt_calibration_cache";
const LOAD_USER_TIMEOUT_MS = 10_000;
const AUTH_LOADING_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

function loadProfileCache(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch { return null; }
}

function saveProfileCache(profile: Profile): void {
  try { localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile)); } catch { /* quota exceeded — skip */ }
}

function loadCalibrationCache(): UserCalibration | null {
  try {
    const raw = localStorage.getItem(CALIBRATION_CACHE_KEY);
    return raw ? (JSON.parse(raw) as UserCalibration) : null;
  } catch { return null; }
}

function saveCalibrationCache(calibration: UserCalibration): void {
  try { localStorage.setItem(CALIBRATION_CACHE_KEY, JSON.stringify(calibration)); } catch { /* quota exceeded — skip */ }
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  // Promise dequeue: second caller awaits the same running promise instead of
  // returning early and calling setIsLoading(false) while loadUser is mid-flight.
  const loadUserPromise = useRef<Promise<void> | null>(null);
  // When a second loadUser runs the same in-flight promise, callers after the fast
  // phase still need their onFastPhaseComplete (e.g. SIGNED_IN clearing loading).
  const fastPhaseDoneRef = useRef(false);
  const postFastPhaseCallbacksRef = useRef<(() => void)[]>([]);
  // Started at mount so loadUser's fast phase awaits an in-flight read rather
  // than starting a fresh one.
  const weatherCacheRef = useRef<Promise<WeatherCachePayload | null> | null>(null);
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
    setSavedLocations,
    reset,
  } = useAppStore();

  useEffect(() => {
    // Kick off weather cache read immediately so it runs in parallel with the
    // session check rather than sequentially inside loadUser.
    weatherCacheRef.current = loadWeatherCache();

    const authTimeout = setTimeout(() => setIsLoading(false), AUTH_LOADING_TIMEOUT_MS);

    // Optimistic auth: if the user was previously onboarded, clear the loading
    // screen immediately from localStorage — no Supabase round-trip needed.
    // Auth validates in the background; the router redirects to /login if the
    // session turns out to be gone (SIGNED_OUT handler calls reset()).
    if (localStorage.getItem(IS_ONBOARDED_KEY)) {
      clearTimeout(authTimeout);
      setIsLoading(false);
    }

    // Still eagerly read the session so loadUser() hydrates state before any
    // screen interaction, but no longer gate the loading screen on this result.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        clearTimeout(authTimeout);
        loadUser(session.user.id).catch(console.error);
        if (!localStorage.getItem(IS_ONBOARDED_KEY)) setIsLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION") {
        // Fires once on startup with the stored session (or null). Single path
        // for page-reload auth — no race with getSession().
        if (session?.user) {
          // loadUser's run() calls setUserId synchronously before any await, so
          // by the time we check localStorage below, isAuthenticated is already true.
          // If getSession() already started loadUser, the dequeue ref ensures we
          // await the same promise and onFastPhaseComplete is a no-op here.
          loadUser(session.user.id, () => {
            clearTimeout(authTimeout);
            setIsLoading(false);
          }).catch(console.error);

          // Returning users: skip the loading screen entirely.
          if (localStorage.getItem(IS_ONBOARDED_KEY)) {
            clearTimeout(authTimeout);
            setIsLoading(false);
          }
        } else {
          clearTimeout(authTimeout);
          setIsLoading(false);
        }
      } else if (event === "SIGNED_IN" && session?.user) {
        // Fires only on explicit sign-in (not on page reload).
        // Pass onFastPhaseComplete so loading clears after cache reads only;
        // DB fetches (getProfile, getCalibration) continue in the background.
        setIsLoading(true);
        loadUser(session.user.id, () => setIsLoading(false)).catch(console.error);
      } else if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
        localStorage.removeItem(CALIBRATION_PENDING_KEY);
        localStorage.removeItem(IS_ONBOARDED_KEY);
        localStorage.removeItem(PROFILE_CACHE_KEY);
        localStorage.removeItem(CALIBRATION_CACHE_KEY);
        localStorage.removeItem("wt_last_outfit_alert");
        localStorage.removeItem("wt_today_event_type");
        localStorage.removeItem("wt_today_event_date");
        await resetPushNotificationSession();
        reset();
        await clearWeatherCache();
      }
    });

    return () => {
      clearTimeout(authTimeout);
      listener.subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadUser(id: string, onFastPhaseComplete?: () => void): Promise<void> {
    // If already running, await the same promise so both callers finish together.
    if (loadUserPromise.current) {
      if (onFastPhaseComplete) {
        if (fastPhaseDoneRef.current) {
          onFastPhaseComplete();
        } else {
          postFastPhaseCallbacksRef.current.push(onFastPhaseComplete);
        }
      }
      return loadUserPromise.current;
    }

    const run = async () => {
      fastPhaseDoneRef.current = false;
      setUserId(id);

      if (localStorage.getItem(IS_ONBOARDED_KEY)) {
        setIsOnboarded(true);
      }

      // Restore cached profile and calibration so the home screen has real data
      // the moment the loading screen clears, with no skeleton states.
      const cachedProfile = loadProfileCache();
      if (cachedProfile) setProfile(cachedProfile);

      const cachedCalibration = loadCalibrationCache();
      if (cachedCalibration) setCalibration(cachedCalibration);

      // Await the weather cache promise started at mount rather than a new read.
      const cached = await (weatherCacheRef.current ?? loadWeatherCache());
      if (cached) {
        setWeather(cached.weather);
        setOutfit(cached.outfit);
        setWeatherLastFetched(new Date(cached.savedAt));
      }

      // Fast phase complete — notify INITIAL_SESSION handler so the loading
      // screen clears while the Supabase fetch continues in the background.
      onFastPhaseComplete?.();
      fastPhaseDoneRef.current = true;
      for (const cb of postFastPhaseCallbacksRef.current) cb();
      postFastPhaseCallbacksRef.current = [];

      const result = await withTimeout(
        Promise.all([getProfile(id), getCalibration(id)]),
        LOAD_USER_TIMEOUT_MS,
      );

      const [prof, cal] = result ?? [null, null];
      // Only overwrite the cached profile if we got a fresh one; on timeout the
      // cached version remains rather than blanking the store.
      if (prof) {
        setProfile(prof);
        saveProfileCache(prof);
      }

      if (cal) {
        setCalibration(cal);
        saveCalibrationCache(cal);
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
              saveCalibrationCache(saved);
              setIsOnboarded(true);
              localStorage.setItem(IS_ONBOARDED_KEY, "1");
              localStorage.removeItem(CALIBRATION_PENDING_KEY);
            }
          } catch {
            // Pending sync failed; keep isOnboarded from localStorage fast-path.
          }
        } else if (!localStorage.getItem(IS_ONBOARDED_KEY)) {
          // No calibration and no pending data — create defaults and go straight to app.
          const defaultCal = await createDefaultCalibration(id).catch(() => null);
          if (defaultCal) {
            setCalibration(defaultCal);
            saveCalibrationCache(defaultCal);
          }
          setIsOnboarded(true);
          localStorage.setItem(IS_ONBOARDED_KEY, "1");
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

      if (prof) {
        const cloud = prof.saved_locations ?? [];
        const merged = await mergeFromCloud(cloud);
        setSavedLocations(merged);
        // Sync back if local had additions the cloud didn't know about
        if (merged.length > cloud.length) {
          upsertProfile(id, { saved_locations: merged }).catch(() => {});
        }
      }
    };

    loadUserPromise.current = run().finally(() => {
      loadUserPromise.current = null;
    });

    return loadUserPromise.current;
  }

  return { userId, profile, isAuthenticated: !!userId, isLoading };
}
