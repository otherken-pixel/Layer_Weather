import { createClient } from "@supabase/supabase-js";
import type { Profile, UserCalibration, OutfitFeedbackRecord } from "@/types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data as Profile;
}

export async function upsertProfile(
  userId: string,
  updates: Partial<Omit<Profile, "id">>
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

// ── Calibration ───────────────────────────────────────────────────────────────

export async function getCalibration(userId: string): Promise<UserCalibration | null> {
  const { data, error } = await supabase
    .from("user_calibration")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error) return null;
  return data as UserCalibration;
}

export async function upsertCalibration(
  userId: string,
  calibration: Partial<Omit<UserCalibration, "user_id">>
): Promise<UserCalibration | null> {
  const { data, error } = await supabase
    .from("user_calibration")
    .upsert({ user_id: userId, ...calibration, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data as UserCalibration;
}

export async function createDefaultCalibration(userId: string): Promise<UserCalibration | null> {
  return upsertCalibration(userId, {
    thermal_sensitivity: 0,
    shorts_min_temp: 72,
    pants_max_temp: 75,
    light_jacket_max_temp: 65,
    heavy_coat_max_temp: 45,
    rain_tolerance: "moderate",
    humidity_sensitivity: true,
  });
}

// ── Outfit Feedback ───────────────────────────────────────────────────────────

export async function saveOutfitFeedback(
  record: Omit<OutfitFeedbackRecord, "id" | "created_at">
): Promise<void> {
  await supabase.from("outfit_feedback").insert(record);
}

export async function getRecentFeedback(
  userId: string,
  limit = 30
): Promise<OutfitFeedbackRecord[]> {
  const { data } = await supabase
    .from("outfit_feedback")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as OutfitFeedbackRecord[];
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) throw error;
  if (data.user) {
    await upsertProfile(data.user.id, { email, display_name: displayName, temp_unit: "F" });
  }
  return data;
}

export async function signOut() {
  return supabase.auth.signOut();
}

export function onAuthStateChange(callback: (event: string, session: unknown) => void) {
  return supabase.auth.onAuthStateChange(callback);
}
