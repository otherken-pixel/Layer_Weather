import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Profile, UserCalibration } from "@/types";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
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

export async function getCalibration(
  userId: string
): Promise<UserCalibration | null> {
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
    .upsert({
      user_id: userId,
      ...calibration,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data as UserCalibration;
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) throw error;

  if (data.user) {
    await upsertProfile(data.user.id, {
      email,
      display_name: displayName,
      temp_unit: "F",
    });
  }
  return data;
}

export async function signOut() {
  return supabase.auth.signOut();
}

export function onAuthStateChange(
  callback: (event: string, session: unknown) => void
) {
  return supabase.auth.onAuthStateChange(callback);
}
