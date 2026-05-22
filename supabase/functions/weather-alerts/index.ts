/**
 * Weather Alerts Edge Function
 *
 * Triggered on a schedule (e.g. every hour via Supabase cron jobs or a
 * GitHub Actions workflow_dispatch / schedule event).
 *
 * For each user with a stored FCM token and last-known coordinates, it:
 * 1. Fetches the current weather + hourly forecast from Open-Meteo.
 * 2. Checks for significant feels-like temperature changes in the next 12h.
 * 3. Sends a push notification via Firebase Cloud Messaging (FCM) if an
 *    alert is warranted.
 *
 * Required environment variables (set in Supabase Dashboard → Settings → Edge Functions):
 *   SUPABASE_URL              — project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (bypasses RLS)
 *   FCM_SERVER_KEY            — Firebase Server Key or OAuth2 token
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const fcmKey = Deno.env.get("FCM_SERVER_KEY")!;

interface HourlyData {
  time: string[];
  apparent_temperature: number[];
  precipitation_probability: number[];
  weather_code: number[];
}

interface UserRow {
  id: string;
  fcm_token: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  temp_unit: "F" | "C";
  commute_end: string | null;
}

async function fetchHourly(lat: number, lon: number): Promise<HourlyData> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: "apparent_temperature,precipitation_probability,weather_code",
    temperature_unit: "fahrenheit",
    timezone: "auto",
    forecast_days: "2",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
  const json = await res.json();
  return json.hourly as HourlyData;
}

function detectAlert(
  hourly: HourlyData,
  commuteEnd: string | null
): { title: string; body: string } | null {
  const now = new Date();
  const times = hourly.time.map((t) => new Date(t));
  const currentIdx = times.findIndex((t) => t >= now);
  if (currentIdx < 0) return null;

  const currentFeels = hourly.apparent_temperature[currentIdx];

  // Check for large temperature drops in the next 12 hours
  for (let i = currentIdx + 1; i < Math.min(currentIdx + 12, times.length); i++) {
    const delta = hourly.apparent_temperature[i] - currentFeels;
    if (delta <= -15) {
      const hour = times[i].toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
      const drop = Math.abs(Math.round(delta));
      return {
        title: "Temperature Drop Alert",
        body: `Feels-like dropping ${drop}° by ${hour}. Grab a jacket before you head out.`,
      };
    }
    // Rain starting
    const prevPrecip = hourly.precipitation_probability[i - 1];
    const curPrecip = hourly.precipitation_probability[i];
    if (prevPrecip < 40 && curPrecip >= 60) {
      const hour = times[i].toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
      return {
        title: "Rain Starting Soon",
        body: `Rain expected around ${hour}. Don't forget your umbrella.`,
      };
    }
  }

  // Commute end alert: warn if temperature at commute time is significantly colder
  if (commuteEnd) {
    const [h, m] = commuteEnd.split(":").map(Number);
    const commuteTime = new Date();
    commuteTime.setHours(h, m, 0, 0);
    if (commuteTime > now) {
      const commuteIdx = times.findIndex(
        (t) => Math.abs(t.getTime() - commuteTime.getTime()) < 30 * 60 * 1000
      );
      if (commuteIdx >= 0) {
        const commuteDelta = hourly.apparent_temperature[commuteIdx] - currentFeels;
        if (commuteDelta <= -12) {
          const drop = Math.abs(Math.round(commuteDelta));
          return {
            title: "Commute Heads-Up",
            body: `It'll be ${drop}° colder by your ${commuteEnd} return. Pack a layer.`,
          };
        }
      }
    }
  }

  return null;
}

async function sendFcmNotification(
  token: string,
  title: string,
  body: string
): Promise<void> {
  const payload = {
    to: token,
    notification: { title, body, sound: "default" },
    priority: "high",
  };

  const res = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `key=${fcmKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FCM error ${res.status}: ${text}`);
  }
}

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch all users who have FCM tokens and known coordinates
    const { data: users, error } = await supabase
      .from("profiles")
      .select("id, fcm_token, last_latitude, last_longitude, temp_unit, commute_end")
      .not("fcm_token", "is", null)
      .not("last_latitude", "is", null)
      .not("last_longitude", "is", null);

    if (error) throw error;
    if (!users?.length) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    let sent = 0;
    const errors: string[] = [];

    await Promise.allSettled(
      (users as UserRow[]).map(async (user) => {
        if (!user.fcm_token || !user.last_latitude || !user.last_longitude) return;
        try {
          const hourly = await fetchHourly(user.last_latitude, user.last_longitude);
          const alert = detectAlert(hourly, user.commute_end);
          if (!alert) return;
          await sendFcmNotification(user.fcm_token, alert.title, alert.body);
          sent++;
        } catch (err) {
          errors.push(`user ${user.id}: ${err}`);
        }
      })
    );

    return new Response(
      JSON.stringify({ sent, errors: errors.length ? errors : undefined }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
