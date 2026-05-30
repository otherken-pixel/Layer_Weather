import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@6.12.4";
import { render } from "npm:@react-email/render@2.0.6";
import * as React from "npm:react@18";
import WeeklyRecapEmail from "../_shared/emails/WeeklyRecapEmail.tsx";
import type { WeeklyRecapEmailProps } from "../_shared/emails/WeeklyRecapEmail.tsx";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  last_city: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  temp_unit: string | null;
  email_unsubscribe_token: string;
}

const WMO_CONDITION: Record<number, string> = {
  0: "clear skies",
  1: "mostly clear", 2: "partly cloudy", 3: "overcast",
  45: "fog", 48: "fog",
  51: "drizzle", 53: "drizzle", 55: "drizzle", 56: "drizzle", 57: "drizzle",
  61: "rain", 63: "rain", 65: "heavy rain", 66: "rain", 67: "heavy rain",
  71: "snow", 73: "snow", 75: "heavy snow", 77: "snow grains",
  80: "showers", 81: "showers", 82: "heavy showers",
  95: "thunderstorms", 96: "thunderstorms", 99: "thunderstorms",
};

function describeCode(code: number): string {
  return WMO_CONDITION[code] ?? "mixed conditions";
}

function buildWeekSummary(
  pastCodes: number[],
  pastMaxTemps: number[],
  pastPrecip: number[],
  unit: string,
): string {
  const dominantCode = pastCodes.sort(
    (a, b) =>
      pastCodes.filter((c) => c === b).length -
      pastCodes.filter((c) => c === a).length,
  )[0];
  const totalRain = pastPrecip.reduce((s, v) => s + v, 0);
  const avgHigh = Math.round(pastMaxTemps.reduce((s, v) => s + v, 0) / pastMaxTemps.length);
  const rainNote = totalRain > 10
    ? ` with ${Math.round(totalRain)}mm of precipitation`
    : totalRain > 0
    ? " with some light rain"
    : " and dry conditions";
  return `The past week brought mostly ${describeCode(dominantCode)}${rainNote}. Average highs were around ${avgHigh}°${unit}.`;
}

function buildOutlook(futureCodes: number[], futureMaxTemps: number[], unit: string): string {
  const dominantCode = futureCodes.sort(
    (a, b) =>
      futureCodes.filter((c) => c === b).length -
      futureCodes.filter((c) => c === a).length,
  )[0];
  const avgHigh = Math.round(futureMaxTemps.reduce((s, v) => s + v, 0) / futureMaxTemps.length);
  return `Expect ${describeCode(dominantCode)} for much of the coming week with highs around ${avgHigh}°${unit}.`;
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

  const { data: profiles, error: dbError } = await supabase
    .from("profiles")
    .select(
      "id, email, display_name, last_city, last_latitude, last_longitude, temp_unit, email_unsubscribe_token",
    )
    .eq("email_weekly_recap", true)
    .not("email", "is", null)
    .not("last_latitude", "is", null)
    .not("last_longitude", "is", null);

  if (dbError) {
    console.error("DB error:", dbError);
    return json({ success: false, error: dbError.message }, 500);
  }

  let sent = 0;
  let failed = 0;

  for (const profile of (profiles ?? []) as Profile[]) {
    try {
      const isCelsius = profile.temp_unit === "C";
      const tempUnit = isCelsius ? "celsius" : "fahrenheit";
      const unit = isCelsius ? "C" : "F";

      const weatherUrl =
        `https://api.open-meteo.com/v1/forecast?latitude=${profile.last_latitude}&longitude=${profile.last_longitude}` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code` +
        `&past_days=7&forecast_days=7&temperature_unit=${tempUnit}&wind_speed_unit=mph`;

      const weatherRes = await fetch(weatherUrl);
      if (!weatherRes.ok) {
        console.error(`Weather fetch failed for user ${profile.id}: ${weatherRes.status}`);
        failed++;
        continue;
      }

      const weather = await weatherRes.json();
      const daily = weather.daily;
      const allMaxTemps: number[] = daily.temperature_2m_max;
      const allMinTemps: number[] = daily.temperature_2m_min;
      const allPrecip: number[] = daily.precipitation_sum;
      const allCodes: number[] = daily.weather_code;
      const allDates: string[] = daily.time;

      const pastMaxTemps = allMaxTemps.slice(0, 7);
      const pastMinTemps = allMinTemps.slice(0, 7);
      const pastPrecip = allPrecip.slice(0, 7);
      const pastCodes = allCodes.slice(0, 7);

      const futureMaxTemps = allMaxTemps.slice(7);
      const futureCodes = allCodes.slice(7);

      const avgHigh = Math.round(pastMaxTemps.reduce((s, v) => s + v, 0) / pastMaxTemps.length);
      const avgLow = Math.round(pastMinTemps.reduce((s, v) => s + v, 0) / pastMinTemps.length);

      const rainiestIdx = pastPrecip.indexOf(Math.max(...pastPrecip));
      const rainiestDay = allDates[rainiestIdx];

      const hottestIdx = pastMaxTemps.indexOf(Math.max(...pastMaxTemps));
      const hottestDay = allDates[hottestIdx];
      const hottestTemp = Math.round(pastMaxTemps[hottestIdx]);

      const coldestIdx = pastMinTemps.indexOf(Math.min(...pastMinTemps));
      const coldestDay = allDates[coldestIdx];
      const coldestTemp = Math.round(pastMinTemps[coldestIdx]);

      const weekSummary = buildWeekSummary([...pastCodes], pastMaxTemps, pastPrecip, unit);
      const nextWeekOutlook = buildOutlook(futureCodes, futureMaxTemps, unit);

      const city = profile.last_city ?? "Your Location";
      const userName = profile.display_name ?? profile.email;
      const unsubscribeUrl =
        `https://layerweather.com/unsubscribe?token=${profile.email_unsubscribe_token}&list=weekly_recap`;

      const props: WeeklyRecapEmailProps = {
        userName,
        location: city,
        unit,
        avgHighTemp: avgHigh,
        avgLowTemp: avgLow,
        rainiestDay,
        hottestDay,
        hottestTemp,
        coldestDay,
        coldestTemp,
        weekSummary,
        nextWeekOutlook,
        appUrl: "https://layerweather.com",
        unsubscribeUrl,
      };

      const html = await render(React.createElement(WeeklyRecapEmail, props));

      const { error: sendError } = await resend.emails.send({
        from: "Layer Weather <digest@mail.layerweather.com>",
        to: profile.email,
        subject: `Your Week in Weather — ${city}`,
        html,
      });

      if (sendError) {
        console.error(`Send failed for user ${profile.id}:`, sendError);
        failed++;
      } else {
        sent++;
      }
    } catch (err) {
      console.error(`Error processing user ${profile.id}:`, err);
      failed++;
    }
  }

  return json({ success: true, sent, failed }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
