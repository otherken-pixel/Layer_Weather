import { useEffect, useState } from "react";
import { supabase, getProfile, getCalibration, upsertCalibration } from "@/lib/supabase";
import { useAppStore } from "@/store";

const CALIBRATION_PENDING_KEY = "wt_calibration_pending";

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const { userId, profile, setUserId, setProfile, setCalibration, setIsOnboarded, reset } =
    useAppStore();

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
      } else if (event === "SIGNED_OUT") {
        reset();
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadUser(id: string) {
    setUserId(id);
    const [prof, cal] = await Promise.all([getProfile(id), getCalibration(id)]);
    setProfile(prof);

    if (cal) {
      setCalibration(cal);
      setIsOnboarded(true);
      localStorage.removeItem(CALIBRATION_PENDING_KEY);
    } else {
      // Retry a calibration save that timed out during onboarding
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
          // Still failing — keep pending flag, don't mark as onboarded
          setIsOnboarded(false);
        }
      } else {
        setIsOnboarded(false);
      }
    }

    // Restore last known location into store
    if (prof?.last_latitude && prof?.last_longitude) {
      useAppStore.getState().setLocation({
        latitude: prof.last_latitude,
        longitude: prof.last_longitude,
        city: "", region: "", country: "",
      });
    }
  }

  return { userId, profile, isAuthenticated: !!userId, isLoading };
}
