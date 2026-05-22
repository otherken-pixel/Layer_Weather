import { useEffect, useState } from "react";
import { supabase, getProfile, getCalibration, upsertCalibration } from "@/lib/supabase";
import { useAppStore } from "@/store";
import { loadWeatherCache, clearWeatherCache } from "@/lib/cache";

const CALIBRATION_PENDING_KEY = "wt_calibration_pending";

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await loadUser(session.user.id);
      }
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await loadUser(session.user.id);
      } else if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
        reset();
        await clearWeatherCache();
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadUser(id: string) {
    setUserId(id);

    const cached = await loadWeatherCache();
    if (cached) {
      setWeather(cached.weather);
      setOutfit(cached.outfit);
      setWeatherLastFetched(new Date(cached.savedAt));
    }

    const [prof, cal] = await Promise.all([getProfile(id), getCalibration(id)]);
    setProfile(prof);

    if (cal) {
      setCalibration(cal);
      setIsOnboarded(true);
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
            localStorage.removeItem(CALIBRATION_PENDING_KEY);
          }
        } catch {
          setIsOnboarded(false);
        }
      } else {
        setIsOnboarded(false);
      }
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
  }

  return { userId, profile, isAuthenticated: !!userId, isLoading };
}
