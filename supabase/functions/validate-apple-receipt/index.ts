import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAppleJWS } from "../_shared/verifyAppleJWS.ts";

const BUNDLE_ID = "com.layerweather.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JWSTransactionPayload {
  bundleId: string;
  productId: string;
  originalTransactionId: string;
  transactionId: string;
  purchaseDate: number;  // ms timestamp
  expiresDate: number;   // ms timestamp
  type: string;
  offerType?: number;    // 1 = introductory offer (free trial)
  revocationDate?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { jwsTransaction } = await req.json();
    if (!jwsTransaction) {
      return new Response(JSON.stringify({ error: "jwsTransaction is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await verifyAppleJWS<JWSTransactionPayload>(jwsTransaction);
    if (!payload) {
      return new Response(JSON.stringify({ error: "Invalid transaction signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.bundleId !== BUNDLE_ID) {
      return new Response(JSON.stringify({ error: "Bundle ID mismatch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.revocationDate) {
      await supabase
        .from("profiles")
        .update({ subscription_status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", user.id);
      return new Response(
        JSON.stringify({ status: "cancelled", tier: null, expiresAt: null, isTrialing: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const now = Date.now();
    const isExpired = payload.expiresDate < now;
    // offerType 1 = introductory offer (free trial)
    const isTrialing = !isExpired && payload.offerType === 1;
    const status = isExpired ? "expired" : isTrialing ? "trialing" : "active";
    const tier = payload.productId.includes("monthly") ? "monthly" : "annual";
    const expiresAt = new Date(payload.expiresDate).toISOString();

    const updateData: Record<string, unknown> = {
      subscription_status: status,
      subscription_tier: tier,
      subscription_expires_at: expiresAt,
      original_transaction_id: payload.originalTransactionId,
      updated_at: new Date().toISOString(),
    };

    // Only set trial_started_at once — on the first ever trial purchase
    if (isTrialing) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("trial_started_at")
        .eq("id", user.id)
        .single();
      if (!existing?.trial_started_at) {
        updateData.trial_started_at = new Date(payload.purchaseDate).toISOString();
      }
    }

    await supabase.from("profiles").update(updateData).eq("id", user.id);

    return new Response(
      JSON.stringify({ status, tier, expiresAt, isTrialing }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("validate-apple-receipt error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
