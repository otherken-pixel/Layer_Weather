import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ENTITLEMENT_ID = Deno.env.get("REVENUECAT_ENTITLEMENT_ID") ?? "pro";

interface RevenueCatEvent {
  id: string;
  type: string;
  app_user_id: string;
  product_id?: string;
  entitlement_ids?: string[];
  expiration_at_ms?: number | null;
  period_type?: string;
}

interface WebhookBody {
  event: RevenueCatEvent;
}

function verifyAuthorization(req: Request): boolean {
  const secret = Deno.env.get("REVENUECAT_WEBHOOK_AUTHORIZATION");
  if (!secret) {
    console.error("REVENUECAT_WEBHOOK_AUTHORIZATION is not set");
    return false;
  }
  const auth = req.headers.get("Authorization") ?? "";
  return auth === secret || auth === `Bearer ${secret}`;
}

function tierFromProduct(productId: string | undefined): "monthly" | "annual" | null {
  if (!productId) return null;
  const id = productId.toLowerCase();
  if (id.includes("annual") || id.includes("yearly") || id.includes("year")) return "annual";
  if (id.includes("monthly") || id.includes("month")) return "monthly";
  return null;
}

function hasProEntitlement(event: RevenueCatEvent): boolean {
  const ids = event.entitlement_ids ?? [];
  return ids.length === 0 || ids.includes(ENTITLEMENT_ID);
}

function statusFromEvent(
  type: string,
  expirationAtMs: number | null | undefined,
  periodType: string | undefined,
): "none" | "trialing" | "active" | "expired" | "cancelled" {
  const now = Date.now();
  const stillValid = expirationAtMs == null || expirationAtMs > now;

  switch (type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "SUBSCRIPTION_EXTENDED":
    case "PRODUCT_CHANGE":
      if (!stillValid && expirationAtMs != null) return "expired";
      if (periodType === "TRIAL" || periodType === "INTRO") return "trialing";
      return "active";
    case "CANCELLATION":
      // User cancelled renewal but retains access until period end.
      if (stillValid) {
        return periodType === "TRIAL" || periodType === "INTRO" ? "trialing" : "active";
      }
      return "cancelled";
    case "EXPIRATION":
      return "expired";
    case "BILLING_ISSUE":
      if (stillValid) return "active";
      return "expired";
    default:
      return stillValid ? "active" : "expired";
  }
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!verifyAuthorization(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = (await req.json()) as WebhookBody;
    const event = body?.event;
    if (!event?.id || !event?.type || !event?.app_user_id) {
      return new Response("Invalid payload", { status: 400 });
    }

    if (!hasProEntitlement(event)) {
      return new Response("OK", { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: existing } = await supabase
      .from("revenuecat_webhook_events")
      .select("event_id")
      .eq("event_id", event.id)
      .maybeSingle();

    if (existing) {
      return new Response("OK", { status: 200 });
    }

    const userId = event.app_user_id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) {
      console.warn("revenuecat-webhook: unknown app_user_id", userId);
      return new Response("User not found", { status: 404 });
    }

    const status = statusFromEvent(event.type, event.expiration_at_ms, event.period_type);
    const tier = tierFromProduct(event.product_id);
    const expiresAt =
      event.expiration_at_ms != null
        ? new Date(event.expiration_at_ms).toISOString()
        : null;

    const update: Record<string, unknown> = {
      web_subscription_status: status,
      web_subscription_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };
    if (tier) update.web_subscription_tier = tier;

    const { error: profileError } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", userId);

    if (profileError) {
      console.error("revenuecat-webhook: profile update failed", profileError);
      return new Response("Profile update failed", { status: 500 });
    }

    const { error: eventError } = await supabase.from("revenuecat_webhook_events").insert({
      event_id: event.id,
      event_type: event.type,
      app_user_id: userId,
    });

    if (eventError) {
      console.error("revenuecat-webhook: event insert failed", eventError);
      return new Response("Event recording failed", { status: 500 });
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("revenuecat-webhook error:", err);
    return new Response("Internal error", { status: 500 });
  }
});
