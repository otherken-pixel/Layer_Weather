import { createClient } from "@supabase/supabase-js";
import type { Profile, UserCalibration, OutfitFeedbackRecord, WardrobeItem, WardrobeCategory } from "@/types";
import { DEFAULT_CALIBRATION } from "@/lib/outfit-logic";

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
  const { user_id, ...defaults } = DEFAULT_CALIBRATION;
  void user_id;
  return upsertCalibration(userId, defaults);
}

// ── Outfit Feedback ───────────────────────────────────────────────────────────

export async function saveOutfitFeedback(
  record: Omit<OutfitFeedbackRecord, "id" | "created_at">
): Promise<void> {
  const { error } = await supabase.from("outfit_feedback").insert(record);
  if (error) throw error;
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

// ── Wardrobe ──────────────────────────────────────────────────────────────────

export async function getWardrobeItems(
  userId: string,
  category?: WardrobeCategory
): Promise<WardrobeItem[]> {
  let query = supabase
    .from("user_wardrobe")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (category) query = query.eq("category", category);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as WardrobeItem[];
}

export async function addWardrobeItem(
  item: Omit<WardrobeItem, "id" | "created_at" | "updated_at">
): Promise<WardrobeItem | null> {
  const { data, error } = await supabase
    .from("user_wardrobe")
    .insert({ ...item, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data as WardrobeItem;
}

export async function updateWardrobeItem(
  id: string,
  updates: Partial<Omit<WardrobeItem, "id" | "user_id" | "created_at">>
): Promise<void> {
  await supabase
    .from("user_wardrobe")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function deleteWardrobeItem(id: string): Promise<void> {
  const { error } = await supabase.from("user_wardrobe").delete().eq("id", id);
  if (error) throw error;
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
