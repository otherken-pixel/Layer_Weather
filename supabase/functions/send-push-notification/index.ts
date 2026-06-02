/**
 * send-push-notification
 *
 * Sends a push notification to a device via Firebase Cloud Messaging (FCM v1 API).
 * Called by other edge functions (cron, trip reminders, severe weather alerts).
 *
 * Required env vars:
 *   FIREBASE_SERVICE_ACCOUNT  — JSON string of the Firebase service account key
 *                               (downloaded from Firebase Console → Project Settings → Service accounts)
 *   CRON_SECRET               — Shared secret; callers must send Authorization: Bearer <secret>
 *
 * FCM channel IDs (Android):
 *   weather-critical   — Severe weather alerts (importance 5)
 *   weather-nowcast    — Precipitation nowcast (importance 4)
 *   weather-daily      — Daily outfit briefing (importance 4)
 *   weather-commute    — Commute alerts (importance 4)
 *   weather-health     — AQI / pollen (importance 3)
 *   weather-trips      — Trip reminders (importance 3)
 *   weather-feedback   — Outfit feedback (importance 2)
 *   weather-weekly     — Weekly preview (importance 3)
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

interface PushPayload {
  /** FCM registration token (from profiles.fcm_token) */
  token: string;
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
  /** Android notification channel id. Defaults to "weather-daily". */
  channelId?: string;
  /** iOS APNs interruption level: "passive" | "active" | "time-sensitive" | "critical" */
  interruptionLevel?: "passive" | "active" | "time-sensitive" | "critical";
  /** iOS badge count. */
  badge?: number;
  /** Android notification priority: "NORMAL" | "HIGH" */
  priority?: "NORMAL" | "HIGH";
}

// ── JWT / OAuth2 helpers ──────────────────────────────────────────────────────

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function base64url(data: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(data)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function signRs256(header: object, payload: object, privateKeyPem: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const encodedHeader = base64url(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64url(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64url(signature)}`;
}

async function getFcmAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const jwt = await signRs256(
    { alg: "RS256", typ: "JWT" },
    {
      iss: sa.client_email,
      sub: sa.client_email,
      aud: sa.token_uri,
      iat: now,
      exp: now + 3600,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
    },
    sa.private_key,
  );

  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get FCM access token: ${res.status} ${text}`);
  }

  const json = await res.json() as { access_token: string };
  return json.access_token;
}

// ── FCM send ──────────────────────────────────────────────────────────────────

async function sendFcmMessage(
  payload: PushPayload,
  projectId: string,
  accessToken: string,
): Promise<void> {
  const channelId = payload.channelId ?? "weather-daily";
  const priority = payload.priority ?? "HIGH";
  const interruptionLevel = payload.interruptionLevel ?? "active";

  const message = {
    token: payload.token,
    notification: payload.notification,
    data: payload.data,
    android: {
      priority,
      notification: {
        channel_id: channelId,
        notification_priority: priority === "HIGH" ? "PRIORITY_HIGH" : "PRIORITY_DEFAULT",
        // Keep severe weather on the lock screen until dismissed
        sticky: channelId === "weather-critical",
        visibility: channelId === "weather-critical" ? "PUBLIC" : "PRIVATE",
        sound: "default",
      },
    },
    apns: {
      payload: {
        aps: {
          alert: payload.notification,
          badge: payload.badge,
          sound: "default",
          "interruption-level": interruptionLevel,
          "content-available": 1,
        },
      },
    },
  };

  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const res = await fetch(fcmUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FCM send failed: ${res.status} ${text}`);
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

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

  const saRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!saRaw) {
    return json({ success: false, error: "FIREBASE_SERVICE_ACCOUNT not configured" }, 500);
  }

  let sa: ServiceAccount;
  try {
    sa = JSON.parse(saRaw) as ServiceAccount;
  } catch {
    return json({ success: false, error: "Invalid FIREBASE_SERVICE_ACCOUNT JSON" }, 500);
  }

  let payload: PushPayload;
  try {
    payload = await req.json() as PushPayload;
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }

  if (!payload.token || !payload.notification?.title || !payload.notification?.body) {
    return json({ success: false, error: "Missing required fields: token, notification.title, notification.body" }, 400);
  }

  try {
    const accessToken = await getFcmAccessToken(sa);
    await sendFcmMessage(payload, sa.project_id, accessToken);
    return json({ success: true }, 200);
  } catch (err) {
    console.error("send-push-notification error:", err);
    return json({ success: false, error: String(err) }, 500);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
