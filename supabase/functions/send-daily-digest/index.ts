import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@6.12.4";
import { render } from "npm:@react-email/render@2.0.6";
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

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  // Authenticate the caller — only the user themselves may trigger their digest.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return json({ success: false, error: "Unauthorized" }, 401);
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

  // Ensure the requested recipient matches the authenticated user's email.
  if (to !== user.email) {
    return json({ success: false, error: "Forbidden: recipient must match authenticated user" }, 403);
  }

  // Render the React Email template to an HTML string
  const html = await render(React.createElement(DailyDigestEmail, props));

  const { data, error } = await resend.emails.send({
    from: "Layer Weather <digest@mail.layerweather.com>",
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
