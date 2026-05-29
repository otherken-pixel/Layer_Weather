import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAppleJWS } from "../_shared/verifyAppleJWS.ts";

// Apple App Store Server Notifications V2
// Configure this URL in App Store Connect → App Information → App Store Server Notifications

interface NotificationPayload {
  notificationType: string;
  subtype?: string;
  data: {
    bundleId: string;
    signedTransactionInfo: string;
  };
}

interface TransactionPayload {
  bundleId: string;
  productId: string;
  originalTransactionId: string;
  expiresDate: number;
  offerType?: number;
  revocationDate?: number;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const notification = await verifyAppleJWS<NotificationPayload>(body.signedPayload);
    if (!notification) return new Response("Invalid payload", { status: 400 });

    const transaction = await verifyAppleJWS<TransactionPayload>(
      notification.data.signedTransactionInfo,
    );
    if (!transaction || transaction.bundleId !== "com.layerweather.app") {
      return new Response("Invalid transaction", { status: 400 });
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id")
      .eq("original_transaction_id", transaction.originalTransactionId)
      .single();

    if (!profileData) return new Response("User not found", { status: 404 });

    const type = notification.notificationType;

    let status: string;
    if (type === "DID_RENEW" || type === "SUBSCRIBED") {
      status = transaction.offerType === 1 ? "trialing" : "active";
    } else if (type === "EXPIRED" || type === "DID_FAIL_TO_RENEW") {
      status = "expired";
    } else if (type === "REVOKE" || type === "REFUND") {
      status = "cancelled";
    } else {
      status = transaction.offerType === 1 ? "trialing" : "active";
    }

    await supabase.from("profiles").update({
      subscription_status: status,
      subscription_expires_at: new Date(transaction.expiresDate).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", profileData.id);

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("apple-notifications error:", err);
    return new Response("Internal error", { status: 500 });
  }
});
