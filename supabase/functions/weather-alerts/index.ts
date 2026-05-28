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
 * Additionally, for each saved packing trip departing tomorrow:
 * 4. Fetches an updated forecast for the trip date range.
 * 5. Compares it against the stored weather snapshot.
 * 6. Sends a push notification if conditions have changed significantly.
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

// ── Types ────────────────────────────────────────────────────────────────────

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

interface TripForecastDay {
  date: string;
  tempMax: number;
  precipProb: number;
  weatherCode: number;
}

interface SnapshotDay {
  date: string;
  tempMax: number;
  precipProb: number;
  weatherCode: number;
}

interface TripRow {
  id: string;
  user_id: string;
  destination: string;
  latitude: number;
  longitude: number;
  departure_date: string;
  return_date: string;
  weather_snapshot: SnapshotDay[] | null;
}

// ── Weather fetchers ──────────────────────────────────────────────────────────

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

async function fetchTripForecast(
  lat: number,
  lon: number,
  departureDate: string,
  returnDate: string,
): Promise<TripForecastDay[] | null> {
  const today = new Date();
  const ret = new Date(returnDate + "T00:00:00Z");
  const daysToReturn = Math.ceil((ret.getTime() - today.getTime()) / 86400000);
  if (daysToReturn > 16) return null;

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    daily: "temperature_2m_max,precipitation_probability_max,weather_code",
    temperature_unit: "fahrenheit",
    timezone: "UTC",
    forecast_days: "16",
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) return null;
  const json = await res.json();

  const times: string[] = json.daily.time;
  const tempMax: number[] = json.daily.temperature_2m_max;
  const precipProb: number[] = json.daily.precipitation_probability_max;
  const weatherCode: number[] = json.daily.weather_code;

  return times
    .map((t, i) => ({ date: t, tempMax: tempMax[i], precipProb: precipProb[i], weatherCode: weatherCode[i] }))
    .filter((d) => d.date >= departureDate && d.date <= returnDate);
}

// ── Alert detection ───────────────────────────────────────────────────────────

function detectAlert(
  hourly: HourlyData,
  commuteEnd: string | null,
): { title: string; body: string } | null {
  const now = new Date();
  const times = hourly.time.map((t) => new Date(t));
  const currentIdx = times.findIndex((t) => t >= now);
  if (currentIdx < 0) return null;

  const currentFeels = hourly.apparent_temperature[currentIdx];

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

  if (commuteEnd) {
    const [h, m] = commuteEnd.split(":").map(Number);
    const commuteTime = new Date();
    commuteTime.setHours(h, m, 0, 0);
    if (commuteTime > now) {
      const commuteIdx = times.findIndex(
        (t) => Math.abs(t.getTime() - commuteTime.getTime()) < 30 * 60 * 1000,
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

function isSnowCode(code: number): boolean {
  return (code >= 71 && code <= 77) || (code >= 85 && code <= 86);
}

function detectPackingChange(
  snapshot: SnapshotDay[],
  fresh: TripForecastDay[],
): { changed: boolean; reason: string } {
  if (!snapshot.length || !fresh.length) return { changed: false, reason: "" };

  const oldAvgMax = snapshot.reduce((s, d) => s + d.tempMax, 0) / snapshot.length;
  const newAvgMax = fresh.reduce((s, d) => s + d.tempMax, 0) / fresh.length;

  const oldRainDays = snapshot.filter((d) => d.precipProb > 50).length;
  const newRainDays = fresh.filter((d) => d.precipProb > 50).length;

  const oldSnowDays = snapshot.filter((d) => isSnowCode(d.weatherCode)).length;
  const newSnowDays = fresh.filter((d) => isSnowCode(d.weatherCode)).length;

  if (Math.abs(oldAvgMax - newAvgMax) >= 10) {
    const dir = newAvgMax > oldAvgMax ? "warmer" : "colder";
    return { changed: true, reason: `significantly ${dir} than expected` };
  }
  if (newRainDays > oldRainDays) return { changed: true, reason: "more rain now expected" };
  if (newRainDays < oldRainDays) return { changed: true, reason: "less rain now expected" };
  if (newSnowDays > oldSnowDays) return { changed: true, reason: "snow now expected" };
  if (newSnowDays < oldSnowDays) return { changed: true, reason: "snow no longer expected" };

  return { changed: false, reason: "" };
}

// ── FCM sender ────────────────────────────────────────────────────────────────

async function sendFcmNotification(
  token: string,
  title: string,
  body: string,
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

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // This function is a scheduled/internal endpoint — not for direct client calls.
  // Callers must supply the WEATHER_ALERTS_SECRET header to authenticate.
  const expectedSecret = Deno.env.get("WEATHER_ALERTS_SECRET");
  if (!expectedSecret || req.headers.get("x-alerts-secret") !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey);
    let sent = 0;
    const errors: string[] = [];

    // ── 1. Daily weather alerts (existing behaviour) ──────────────────────────
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id, fcm_token, last_latitude, last_longitude, temp_unit, commute_end")
      .not("fcm_token", "is", null)
      .not("last_latitude", "is", null)
      .not("last_longitude", "is", null);

    if (!usersError && users?.length) {
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
            errors.push(`weather-alert user ${user.id}: ${err}`);
          }
        }),
      );
    }

    // ── 2. Packing trip 1-day-out notifications ───────────────────────────────
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const { data: trips, error: tripsError } = await supabase
      .from("packing_trips")
      .select("id, user_id, destination, latitude, longitude, departure_date, return_date, weather_snapshot")
      .eq("departure_date", tomorrowStr)
      .not("weather_snapshot", "is", null);

    if (!tripsError && trips?.length) {
      const userIds = [...new Set((trips as TripRow[]).map((t) => t.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, fcm_token")
        .in("id", userIds)
        .not("fcm_token", "is", null);

      const fcmMap = new Map(
        ((profiles ?? []) as { id: string; fcm_token: string }[]).map((p) => [p.id, p.fcm_token]),
      );

      await Promise.allSettled(
        (trips as TripRow[]).map(async (trip) => {
          const fcmToken = fcmMap.get(trip.user_id);
          if (!fcmToken || !trip.weather_snapshot) return;
          try {
            const fresh = await fetchTripForecast(
              trip.latitude,
              trip.longitude,
              trip.departure_date,
              trip.return_date,
            );
            if (!fresh) return;

            const { changed, reason } = detectPackingChange(trip.weather_snapshot, fresh);
            const title = changed
              ? `Pack check: ${trip.destination} weather changed`
              : `Tomorrow: ${trip.destination} — review your packing list`;
            const body = changed
              ? `Forecast is ${reason}. Open Layer Weather to see your updated packing list.`
              : `Your trip to ${trip.destination} starts tomorrow. Your packing list is ready to review.`;

            await sendFcmNotification(fcmToken, title, body);
            sent++;
          } catch (err) {
            errors.push(`packing-alert trip ${trip.id}: ${err}`);
          }
        }),
      );
    }

    return new Response(
      JSON.stringify({ sent, errors: errors.length ? errors : undefined }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
