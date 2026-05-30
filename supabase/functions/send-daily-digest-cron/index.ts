import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@6.12.4";
import { render } from "npm:@react-email/render@2.0.6";
import * as React from "npm:react@18";
import DailyDigestEmail from "../_shared/emails/DailyDigestEmail.tsx";
import type { ForecastPeriod } from "../_shared/emails/DailyDigestEmail.tsx";

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

interface WmoEntry {
  condition: string;
  icon: string;
}

const WMO_MAP: Record<number, WmoEntry> = {
  0: { condition: "Clear skies", icon: "☀️" },
  1: { condition: "Partly cloudy", icon: "⛅" },
  2: { condition: "Partly cloudy", icon: "⛅" },
  3: { condition: "Partly cloudy", icon: "⛅" },
  45: { condition: "Foggy", icon: "🌫️" },
  48: { condition: "Foggy", icon: "🌫️" },
  51: { condition: "Drizzle", icon: "🌦️" },
  53: { condition: "Drizzle", icon: "🌦️" },
  55: { condition: "Drizzle", icon: "🌦️" },
  56: { condition: "Drizzle", icon: "🌦️" },
  57: { condition: "Drizzle", icon: "🌦️" },
  61: { condition: "Rain", icon: "🌧️" },
  63: { condition: "Rain", icon: "🌧️" },
  65: { condition: "Rain", icon: "🌧️" },
  66: { condition: "Rain", icon: "🌧️" },
  67: { condition: "Rain", icon: "🌧️" },
  71: { condition: "Snow", icon: "❄️" },
  73: { condition: "Snow", icon: "❄️" },
  75: { condition: "Snow", icon: "❄️" },
  77: { condition: "Snow", icon: "❄️" },
  80: { condition: "Showers", icon: "🌦️" },
  81: { condition: "Showers", icon: "🌦️" },
  82: { condition: "Showers", icon: "🌦️" },
  95: { condition: "Thunderstorm", icon: "⛈️" },
  96: { condition: "Thunderstorm", icon: "⛈️" },
  99: { condition: "Thunderstorm", icon: "⛈️" },
};

function wmo(code: number): WmoEntry {
  return WMO_MAP[code] ?? { condition: "Unknown", icon: "🌡️" };
}

function periodForecast(
  label: string,
  hours: number[],
  temps: number[],
  precipProbs: number[],
  weatherCodes: number[],
): ForecastPeriod {
  const periodTemps = hours.map((h) => temps[h]);
  const periodPrecip = hours.map((h) => precipProbs[h]);
  const periodCodes = hours.map((h) => weatherCodes[h]);
  const high = Math.round(Math.max(...periodTemps));
  const low = Math.round(Math.min(...periodTemps));
  const precipChance = Math.round(Math.max(...periodPrecip));
  const dominantCode = periodCodes[Math.floor(periodCodes.length / 2)];
  const { condition, icon } = wmo(dominantCode);
  return { label, icon, condition, high, low, precipChance };
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

  const currentHour = new Date().getUTCHours();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: profiles, error: dbError } = await supabase
    .from("profiles")
    .select(
      "id, email, display_name, last_city, last_latitude, last_longitude, temp_unit, email_unsubscribe_token",
    )
    .eq("email_daily_digest", true)
    .eq("digest_send_hour", currentHour)
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
      const weatherUrl =
        `https://api.open-meteo.com/v1/forecast?latitude=${profile.last_latitude}&longitude=${profile.last_longitude}` +
        `&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m,uv_index` +
        `&hourly=temperature_2m,precipitation_probability,weather_code` +
        `&forecast_days=1&wind_speed_unit=mph&temperature_unit=${tempUnit}`;

      const weatherRes = await fetch(weatherUrl);
      if (!weatherRes.ok) {
        console.error(`Weather fetch failed for user ${profile.id}: ${weatherRes.status}`);
        failed++;
        continue;
      }

      const weather = await weatherRes.json();
      const current = weather.current;
      const hourly = weather.hourly;
      const temps: number[] = hourly.temperature_2m;
      const precipProbs: number[] = hourly.precipitation_probability;
      const weatherCodes: number[] = hourly.weather_code;

      const forecast: ForecastPeriod[] = [
        periodForecast("Morning", [6, 7, 8, 9, 10], temps, precipProbs, weatherCodes),
        periodForecast("Afternoon", [11, 12, 13, 14, 15], temps, precipProbs, weatherCodes),
        periodForecast("Evening", [17, 18, 19, 20, 21], temps, precipProbs, weatherCodes),
      ];

      const currentTemp = Math.round(current.temperature_2m);
      const unit = isCelsius ? "C" : "F";
      const city = profile.last_city ?? "Your Location";
      const userName = profile.display_name ?? profile.email;
      const unsubscribeUrl =
        `https://layerweather.com/unsubscribe?token=${profile.email_unsubscribe_token}&list=daily_digest`;

      const html = await render(
        React.createElement(DailyDigestEmail, {
          userName,
          location: city,
          currentTemp,
          feelsLike: Math.round(current.apparent_temperature),
          unit,
          condition: wmo(current.weather_code).condition,
          conditionIcon: wmo(current.weather_code).icon,
          humidity: current.relative_humidity_2m,
          windSpeed: Math.round(current.wind_speed_10m),
          uvIndex: current.uv_index,
          forecast,
          appUrl: "https://layerweather.com",
          unsubscribeUrl,
        }),
      );

      const { error: sendError } = await resend.emails.send({
        from: "Layer Weather <digest@mail.layerweather.com>",
        to: profile.email,
        subject: `${city} · ${currentTemp}°${unit} — Your Morning Digest`,
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
