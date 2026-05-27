import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Resend } from "npm:resend@4";
import { renderAsync } from "npm:@react-email/render@1";
import * as React from "npm:react@18";

// Import the template. In a Deno edge function, reference the compiled
// HTML directly. For monorepo setups, point this at the built output or
// use a shared CDN-hosted bundle. The simplest approach for Supabase
// Functions is to inline the render call with npm: imports as shown.
//
// If you prefer to keep templates in the function bundle, copy the
// DailyDigestEmail TSX file into this directory and import it relatively.
import DailyDigestEmail from "../../emails_compiled/DailyDigestEmail.js";

import type {
  DailyDigestEmailProps,
  ForecastPeriod,
  WeatherAlert,
} from "../../emails_compiled/DailyDigestEmail.js";

// ─── Re-export types for documentation ────────────────────────────────────────

/** Expected JSON body for POST /send-daily-digest */
interface SendDailyDigestRequest {
  to: string;
  props: DailyDigestEmailProps;
}

interface SendDailyDigestResponse {
  success: boolean;
  id?: string;
  error?: string;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  let body: SendDailyDigestRequest;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const { to, props } = body;

  if (!to || !props) {
    return json({ success: false, error: "Missing required fields: to, props" }, 400);
  }

  // Render the React Email template to an HTML string
  const html = await renderAsync(
    React.createElement(DailyDigestEmail, props)
  );

  const { data, error } = await resend.emails.send({
    from: "Layer Weather <digest@mail.layerweather.app>",
    to,
    subject: `${props.location} · ${props.currentTemp}°${props.unit} — Your Daily Digest`,
    html,
  });

  if (error) {
    console.error("Resend error:", error);
    return json({ success: false, error: error.message }, 500);
  }

  return json({ success: true, id: data?.id }, 200);
});

function json(body: SendDailyDigestResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Example invocation (for documentation) ───────────────────────────────────
//
// POST https://<project>.supabase.co/functions/v1/send-daily-digest
// Authorization: Bearer <SUPABASE_ANON_KEY>
// Content-Type: application/json
//
// {
//   "to": "user@example.com",
//   "props": {
//     "userName": "Alex",
//     "location": "San Francisco, CA",
//     "currentTemp": 62,
//     "unit": "F",
//     "appUrl": "https://layerweather.app",
//     "forecast": [
//       { "label": "Morning",   "icon": "🌤️", "condition": "Partly cloudy", "high": 60, "low": 54, "precipChance": 10 },
//       { "label": "Afternoon", "icon": "☀️", "condition": "Sunny",         "high": 68, "low": 58, "precipChance": 5  },
//       { "label": "Evening",   "icon": "🌫️", "condition": "Foggy",         "high": 57, "low": 52, "precipChance": 20 }
//     ],
//     "alerts": [
//       {
//         "severity": "advisory",
//         "headline": "Dense Fog Advisory in effect until 10 AM",
//         "message": "Visibility may drop below 1/4 mile in low-lying areas. Allow extra travel time."
//       }
//     ]
//   }
// }
