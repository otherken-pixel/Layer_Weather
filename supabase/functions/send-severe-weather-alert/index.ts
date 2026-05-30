import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Resend } from "npm:resend@6.12.4";
import { render } from "npm:@react-email/render@2.0.6";
import * as React from "npm:react@18";
import SevereWeatherAlertEmail from "../../emails_compiled/SevereWeatherAlertEmail.js";
import type { SevereWeatherAlertEmailProps } from "../../emails_compiled/SevereWeatherAlertEmail.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

interface SendAlertRequest {
  userId: string;
  to: string;
  props: SevereWeatherAlertEmailProps;
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

  let body: SendAlertRequest;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const { to, props } = body;
  if (!to || !props) {
    return json({ success: false, error: "Missing required fields: to, props" }, 400);
  }

  const html = await render(React.createElement(SevereWeatherAlertEmail, props));

  const { data, error } = await resend.emails.send({
    from: "Layer Weather Alerts <alerts@mail.layerweather.com>",
    to,
    subject: `⚠️ ${props.alertSeverity.toUpperCase()}: ${props.alertHeadline}`,
    html,
  });

  if (error) {
    console.error("Resend error:", error);
    return json({ success: false, error: error.message }, 500);
  }

  return json({ success: true, id: data?.id }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
