import { useEffect, useState } from "react";
import { supabase, getProfile, getCalibration } from "@/lib/supabase";
import { useAppStore } from "@/store";

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
    setCalibration(cal);
    setIsOnboarded(cal !== null);
  }

  return { userId, profile, isAuthenticated: !!userId, isLoading };
}
