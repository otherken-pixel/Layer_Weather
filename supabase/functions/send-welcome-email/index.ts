import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Resend } from "npm:resend@6.12.4";
import { render } from "npm:@react-email/render@2.0.6";
import * as React from "npm:react@18";
import WelcomeEmail from "../../emails_compiled/WelcomeEmail.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-webhook-secret",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
  const incomingSecret = req.headers.get("x-webhook-secret");
  if (!webhookSecret || incomingSecret !== webhookSecret) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  let body: { record: { email: string; raw_user_meta_data?: { display_name?: string } } };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const record = body?.record;
  if (!record?.email) {
    return json({ success: false, error: "Missing record.email" }, 400);
  }

  const userName = record.raw_user_meta_data?.display_name ?? record.email;

  const html = await render(
    React.createElement(WelcomeEmail, {
      userName,
      appUrl: "https://layerweather.com",
    }),
  );

  const { data, error } = await resend.emails.send({
    from: "Layer Weather <hello@mail.layerweather.com>",
    to: record.email,
    subject: "Welcome to Layer Weather",
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
