import { createClient } from "@supabase/supabase-js";
import type { Profile, StylePreference, UserCalibration, OutfitFeedbackRecord, WardrobeItem, WardrobeCategory, WeatherWardrobePreset, WeatherScenario, SavedPackingTrip, PackingItem, SerializedDailyForecast, PackingAiInsights } from "@/types";
import type { SvgCatalogEntry } from "@/lib/svgCatalog.types";
import { DEFAULT_CALIBRATION } from "@/lib/outfit-logic";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? "";
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? "";

export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : "https://placeholder.supabase.co",
  isSupabaseConfigured
    ? supabaseAnonKey
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder",
  {
    auth: {
      autoRefreshToken: isSupabaseConfigured,
      persistSession: isSupabaseConfigured,
      detectSessionInUrl: isSupabaseConfigured,
    },
  }
);

// ── Profile ───────────────────────────────────────────────────────────────────

function coerceStylePreference(raw: unknown): StylePreference[] {
  let arr: StylePreference[];
  if (Array.isArray(raw)) {
    arr = raw as StylePreference[];
  } else if (typeof raw === "string") {
    if (raw.startsWith("[")) {
      try { arr = JSON.parse(raw) as StylePreference[]; } catch { arr = ["neutral"]; }
    } else {
      arr = [raw as StylePreference];
    }
  } else {
    arr = ["neutral"];
  }
  // Expand legacy "all" to the three specific styles
  if (arr.includes("all")) return ["feminine", "masculine", "neutral"];
  return arr.length > 0 ? arr : ["neutral"];
}

function profileFromDb(data: Record<string, unknown>): Profile {
  return { ...data, style_preference: coerceStylePreference(data.style_preference) } as Profile;
}

function profileUpdatesToDb(updates: Partial<Omit<Profile, "id">>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...updates };
  if (updates.style_preference !== undefined) {
    result.style_preference = JSON.stringify(updates.style_preference);
  }
  return result;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) return null;
  return profileFromDb(data as Record<string, unknown>);
}

export async function upsertProfile(
  userId: string,
  updates: Partial<Omit<Profile, "id">>
): Promise<Profile | null> {
  const dbUpdates = profileUpdatesToDb(updates);
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...dbUpdates, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return profileFromDb(data as Record<string, unknown>);
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
  const { error } = await supabase
    .from("user_wardrobe")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteWardrobeItem(id: string): Promise<void> {
  const { error } = await supabase.from("user_wardrobe").delete().eq("id", id);
  if (error) throw error;
}

// ── Weather Wardrobes ─────────────────────────────────────────────────────────

export async function getWeatherWardrobes(userId: string): Promise<WeatherWardrobePreset[]> {
  const { data, error } = await supabase
    .from("user_weather_wardrobes")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as WeatherWardrobePreset[];
}

export async function upsertWeatherWardrobe(
  preset: Omit<WeatherWardrobePreset, "id" | "created_at" | "updated_at">
): Promise<WeatherWardrobePreset> {
  const { data, error } = await supabase
    .from("user_weather_wardrobes")
    .upsert(
      { ...preset, updated_at: new Date().toISOString() },
      { onConflict: "user_id,scenario" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as WeatherWardrobePreset;
}

export async function deleteWeatherWardrobe(userId: string, scenario: WeatherScenario): Promise<void> {
  const { error } = await supabase
    .from("user_weather_wardrobes")
    .delete()
    .eq("user_id", userId)
    .eq("scenario", scenario);
  if (error) throw error;
}

// ── Packing Trips ─────────────────────────────────────────────────────────────

export async function getPackingTrips(userId: string): Promise<SavedPackingTrip[]> {
  const { data, error } = await supabase
    .from("packing_trips")
    .select("*")
    .eq("user_id", userId)
    .order("departure_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SavedPackingTrip[];
}

export async function savePackingTrip(
  trip: Omit<SavedPackingTrip, "id" | "created_at">
): Promise<SavedPackingTrip> {
  const { data, error } = await supabase
    .from("packing_trips")
    .insert(trip)
    .select()
    .single();
  if (error) throw error;
  return data as SavedPackingTrip;
}

export async function updatePackingTrip(
  id: string,
  updates: {
    packing_list?: PackingItem[];
    weather_snapshot?: SerializedDailyForecast[];
    last_generated_at?: string;
    ai_insights?: PackingAiInsights | null;
    ai_generated_at?: string | null;
  }
): Promise<void> {
  const { error } = await supabase
    .from("packing_trips")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

export async function deletePackingTrip(id: string): Promise<void> {
  const { error } = await supabase.from("packing_trips").delete().eq("id", id);
  if (error) throw error;
}

// ── SVG clothes catalog (public metadata for svg_clothes_files bucket) ─────

export async function getSvgCatalog(): Promise<SvgCatalogEntry[]> {
  const { data, error } = await supabase
    .from("svg_clothes")
    .select("id, label, style, category, storage_path, sort_order, active")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SvgCatalogEntry[];
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

/**
 * Permanently deletes the current user's account and all associated data.
 * Calls the delete-account edge function (which uses the service role to remove
 * the auth record), then signs out locally.
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  const tables = [
    "outfit_feedback",
    "user_calibration",
    "user_wardrobe",
    "user_weather_wardrobes",
    "packing_trips",
    "profiles",
  ] as const;

  for (const table of tables) {
    const col = table === "profiles" ? "id" : "user_id";
    const { error } = await supabase.from(table).delete().eq(col, userId);
    if (error) throw error;
  }

  try {
    await supabase.functions.invoke("delete-account", { body: { userId } });
  } catch {
    // Non-fatal — auth record cleanup handled server-side; data is already purged.
  }

  await supabase.auth.signOut();
}

export function onAuthStateChange(callback: (event: string, session: unknown) => void) {
  return supabase.auth.onAuthStateChange(callback);
}
