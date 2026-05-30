import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Resend } from "npm:resend@6.12.4";
import { render } from "npm:@react-email/render@2.0.6";
import * as React from "npm:react@18";
import SubscriptionConfirmedEmail from "../../emails_compiled/SubscriptionConfirmedEmail.js";
import SubscriptionExpiredEmail from "../../emails_compiled/SubscriptionExpiredEmail.js";
import TrialEndingEmail from "../../emails_compiled/TrialEndingEmail.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-webhook-secret",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

interface SendSubscriptionEmailRequest {
  type: "confirmed" | "expired" | "trial_ending";
  to: string;
  userName: string;
  planName?: string;
  nextBillingDate?: string;
  expiredDate?: string;
  daysRemaining?: number;
  trialEndDate?: string;
}

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

  let body: SendSubscriptionEmailRequest;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const { type, to, userName } = body;
  if (!type || !to || !userName) {
    return json({ success: false, error: "Missing required fields: type, to, userName" }, 400);
  }

  let html: string;
  let subject: string;

  if (type === "confirmed") {
    html = await render(
      React.createElement(SubscriptionConfirmedEmail, {
        userName,
        planName: body.planName,
        nextBillingDate: body.nextBillingDate,
        appUrl: "https://layerweather.com",
      }),
    );
    subject = "You're on Layer Weather Premium 🎉";
  } else if (type === "expired") {
    html = await render(
      React.createElement(SubscriptionExpiredEmail, {
        userName,
        expiredDate: body.expiredDate,
        appUrl: "https://layerweather.com",
      }),
    );
    subject = "Your Layer Weather subscription has ended";
  } else if (type === "trial_ending") {
    html = await render(
      React.createElement(TrialEndingEmail, {
        userName,
        daysRemaining: body.daysRemaining,
        trialEndDate: body.trialEndDate,
        appUrl: "https://layerweather.com",
      }),
    );
    subject = `Your free trial ends in ${body.daysRemaining} day(s)`;
  } else {
    return json({ success: false, error: `Unknown email type: ${type}` }, 400);
  }

  const { data, error } = await resend.emails.send({
    from: "Layer Weather <hello@mail.layerweather.com>",
    to,
    subject,
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
