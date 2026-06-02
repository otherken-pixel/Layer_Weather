/**
 * notify-trip-reminder
 *
 * Cron: runs hourly. Finds packing trips departing tomorrow and sends a push
 * notification reminder to users who have trip reminders enabled.
 *
 * Required env vars: CRON_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional:          FIREBASE_SERVICE_ACCOUNT (for push delivery)
 *
 * Schedule via Supabase cron (pg_cron):
 *   SELECT cron.schedule('trip-reminders', '0 * * * *',
 *     $$SELECT net.http_post(
 *       url := 'https://<project>.supabase.co/functions/v1/notify-trip-reminder',
 *       headers := '{"Authorization":"Bearer <CRON_SECRET>","Content-Type":"application/json"}',
 *       body := '{}'
 *     )$$
 *   );
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

interface Profile {
  id: string;
  fcm_token: string | null;
  display_name: string | null;
  notif_prefs: Record<string, unknown> | null;
}

interface Trip {
  id: string;
  user_id: string;
  destination: string;
  departure_date: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Find trips departing tomorrow (any timezone — hourly cron provides coverage)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const { data: trips, error: tripsError } = await supabase
    .from("packing_trips")
    .select("id, user_id, destination, departure_date")
    .eq("departure_date", tomorrowStr);

  if (tripsError) {
    console.error("DB error:", tripsError);
    return json({ success: false, error: tripsError.message }, 500);
  }

  if (!trips || trips.length === 0) {
    return json({ success: true, sent: 0 }, 200);
  }

  // Fetch profiles for these users
  const userIds = [...new Set((trips as Trip[]).map((t) => t.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, fcm_token, display_name, notif_prefs")
    .in("id", userIds)
    .not("fcm_token", "is", null);

  const profileMap = new Map(
    ((profiles ?? []) as Profile[]).map((p) => [p.id, p])
  );

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const pushFnUrl = `${supabaseUrl}/functions/v1/send-push-notification`;
  let sent = 0;

  for (const trip of trips as Trip[]) {
    const profile = profileMap.get(trip.user_id);
    if (!profile?.fcm_token) continue;

    // Respect the user's notification prefs
    const notifPrefs = profile.notif_prefs as { tripWeatherReminder?: boolean } | null;
    if (notifPrefs && notifPrefs.tripWeatherReminder === false) continue;

    try {
      await fetch(pushFnUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cronSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: profile.fcm_token,
          notification: {
            title: `Your trip to ${trip.destination} is tomorrow`,
            body: "Check your packing list and latest weather forecast before you go.",
          },
          data: {
            route: "/app/packing",
            tripId: trip.id,
          },
          channelId: "weather-trips",
          interruptionLevel: "active",
        }),
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send trip reminder for user ${trip.user_id}:`, err);
    }
  }

  return json({ success: true, sent }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
