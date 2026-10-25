// Supabase Edge Function: call-handler
// Runtime: Deno (TypeScript)
// Purpose: Dispatches high-priority FCM data messages (Android) and APNs VoIP pushes (iOS)
//          to wake up background/killed devices for incoming WebRTC audio/video calls.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import * as jose from "npm:jose@5.2.3";

// Standard CORS headers for Supabase Functions
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Interface for Call Payload
interface CallPayload {
  callId: string;
  callerId: string;
  calleeId: string;
  callerName: string;
  callerPhoto?: string;
  callType: "audio" | "video";
  channelName: string;
  extraData?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// 1. Google FCM HTTP v1 OAuth2 Access Token Generator (RS256 JWT)
// ---------------------------------------------------------------------------
let cachedGoogleToken: { token: string; expiresAt: number } | null = null;

async function getGoogleAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Return cached token if valid for at least 5 more minutes
  if (cachedGoogleToken && cachedGoogleToken.expiresAt > now + 300) {
    return cachedGoogleToken.token;
  }

  // Format private key (replace escaped newlines if stored in single-line env)
  const formattedKey = privateKeyPem.replace(/\\n/g, "\n");
  const privateKey = await jose.importPKCS8(formattedKey, "RS256");

  // Sign Google OAuth2 Assertion JWT
  const jwt = await new jose.SignJWT({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  // Exchange JWT assertion for OAuth2 access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    throw new Error(`Failed to obtain Google access token: ${JSON.stringify(tokenData)}`);
  }

  cachedGoogleToken = {
    token: tokenData.access_token,
    expiresAt: now + (tokenData.expires_in || 3600),
  };

  return tokenData.access_token;
}

// ---------------------------------------------------------------------------
// 2. Apple APNs Authentication Token Generator (ES256 JWT)
// ---------------------------------------------------------------------------
let cachedApnsToken: { token: string; expiresAt: number } | null = null;

async function getApnsJwt(teamId: string, keyId: string, privateKeyP8: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Apple APNs tokens are valid for up to 60 minutes; refresh every 45 minutes
  if (cachedApnsToken && cachedApnsToken.expiresAt > now + 300) {
    return cachedApnsToken.token;
  }

  const formattedKey = privateKeyP8.replace(/\\n/g, "\n");
  const privateKey = await jose.importPKCS8(formattedKey, "ES256");

  const jwt = await new jose.SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .sign(privateKey);

  cachedApnsToken = {
    token: jwt,
    expiresAt: now + 2700, // 45 minutes
  };

  return jwt;
}

// ---------------------------------------------------------------------------
// 3. Dispatch FCM v1 High-Priority Data Push (Android)
// ---------------------------------------------------------------------------
async function sendFcmCallNotification(
  projectId: string,
  accessToken: string,
  deviceToken: string,
  call: CallPayload
): Promise<{ success: boolean; status?: number; error?: string }> {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  // CRITICAL FOR CALLS:
  // We send a DATA-ONLY message (without a top-level "notification" key)
  // with priority="high" and ttl="0s".
  // This bypasses the notification tray and directly awakens FirebaseMessagingService
  // so the Android app can display a full-screen incoming call UI (via Telecom/CallKeep).
  const fcmMessage = {
    message: {
      token: deviceToken,
      data: {
        type: "INCOMING_CALL",
        callId: String(call.callId),
        callerId: String(call.callerId),
        callerName: String(call.callerName || "Unknown Caller"),
        callerPhoto: String(call.callerPhoto || ""),
        callType: String(call.callType || "audio"),
        channelName: String(call.channelName || `call-${call.callId}`),
        timestamp: String(Date.now()),
      },
      android: {
        priority: "high",
        ttl: "0s", // 0s ensures missed calls aren't queued and rung hours later
      },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fcmMessage),
  });

  if (!res.ok) {
    const errorData = await res.text();
    return { success: false, status: res.status, error: errorData };
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// 4. Dispatch APNs VoIP Push (iOS PushKit / CallKit)
// ---------------------------------------------------------------------------
async function sendApnsVoipPush(
  apnsJwt: string,
  bundleId: string,
  voipToken: string,
  call: CallPayload,
  isProduction: boolean
): Promise<{ success: boolean; status?: number; error?: string }> {
  const host = isProduction ? "api.push.apple.com" : "api.sandbox.push.apple.com";
  const url = `https://${host}/3/device/${voipToken}`;

  // APNs VoIP pushes MUST include:
  // - apns-push-type: voip
  // - apns-topic: <bundle_id>.voip
  // - apns-priority: 10 (immediate delivery)
  // - apns-expiration: 0 (do not deliver stale calls)
  const apnsPayload = {
    aps: {}, // Empty aps for VoIP background payload
    callId: call.callId,
    callerId: call.callerId,
    callerName: call.callerName,
    callerPhoto: call.callerPhoto || "",
    callType: call.callType,
    hasVideo: call.callType === "video",
    channelName: call.channelName,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `bearer ${apnsJwt}`,
      "apns-push-type": "voip",
      "apns-topic": `${bundleId}.voip`,
      "apns-priority": "10",
      "apns-expiration": "0",
      "content-type": "application/json",
    },
    body: JSON.stringify(apnsPayload),
  });

  if (!res.ok) {
    const errorData = await res.text();
    return { success: false, status: res.status, error: errorData };
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// 5. Main Request Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();

    // Support BOTH Database Webhooks (wrapped in `record`) and Direct Invocations
    const record = rawBody.record || rawBody;

    // Normalize call parameters
    const callId = String(record.id || record.callId || record.call_id || `call_${Date.now()}`);
    const callerId = String(record.caller_id || record.callerId || "");
    const calleeId = String(record.callee_id || record.calleeId || "");
    const callerName = String(record.caller_name || record.callerName || "Matrimonial Match");
    const callerPhoto = String(record.caller_photo || record.callerPhoto || "");
    const callType = (record.call_type || record.callType || "audio") === "video" ? "video" : "audio";
    const channelName = String(record.channel_name || record.channelName || `call-session-${callId}`);

    if (!calleeId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required parameter: 'calleeId' or 'callee_id'",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callPayload: CallPayload = {
      callId,
      callerId,
      calleeId,
      callerName,
      callerPhoto,
      callType,
      channelName,
    };

    console.log(`[Call-Handler] Initiating call notification:`, {
      callId,
      callerName,
      calleeId,
      callType,
    });

    // Initialize Supabase Client with Service Role Key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Retrieve recipient device tokens from user_device_tokens table
    const { data: tokenRecords, error: dbError } = await supabase
      .from("user_device_tokens")
      .select("platform, token, voip_token")
      .or(`user_id.eq.${calleeId},register_id.eq.${calleeId}`);

    if (dbError) {
      console.warn(`[Call-Handler] Error querying user_device_tokens:`, dbError.message);
    }

    const fcmTokens: string[] = [];
    const apnsVoipTokens: string[] = [];

    if (tokenRecords && tokenRecords.length > 0) {
      for (const rec of tokenRecords) {
        if (rec.token && !fcmTokens.includes(rec.token)) {
          fcmTokens.push(rec.token);
        }
        if (rec.voip_token && !apnsVoipTokens.includes(rec.voip_token)) {
          apnsVoipTokens.push(rec.voip_token);
        }
      }
    } else {
      // Fallback: Check profiles table if tokens are saved directly on user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("fcm_token, device_token, apns_voip_token")
        .or(`id.eq.${calleeId},register_id.eq.${calleeId}`)
        .maybeSingle();

      if (profile) {
        if (profile.fcm_token) fcmTokens.push(profile.fcm_token);
        if (profile.device_token && !fcmTokens.includes(profile.device_token)) {
          fcmTokens.push(profile.device_token);
        }
        if (profile.apns_voip_token) apnsVoipTokens.push(profile.apns_voip_token);
      }
    }

    console.log(`[Call-Handler] Found ${fcmTokens.length} FCM tokens and ${apnsVoipTokens.length} APNs VoIP tokens.`);

    const results = {
      fcm: { attempted: fcmTokens.length, succeeded: 0, failed: 0, errors: [] as string[] },
      apns: { attempted: apnsVoipTokens.length, succeeded: 0, failed: 0, errors: [] as string[] },
    };

    // -----------------------------------------------------------------------
    // A. Send FCM High-Priority Data Pushes (Android)
    // -----------------------------------------------------------------------
    const fcmProjectId = Deno.env.get("FCM_PROJECT_ID");
    const fcmClientEmail = Deno.env.get("FCM_CLIENT_EMAIL");
    const fcmPrivateKey = Deno.env.get("FCM_PRIVATE_KEY");

    if (fcmTokens.length > 0) {
      if (!fcmProjectId || !fcmClientEmail || !fcmPrivateKey) {
        console.warn("[Call-Handler] FCM secrets missing (FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY)");
        results.fcm.errors.push("FCM credentials not configured in Supabase secrets");
      } else {
        try {
          const accessToken = await getGoogleAccessToken(fcmClientEmail, fcmPrivateKey);

          for (const token of fcmTokens) {
            const sendRes = await sendFcmCallNotification(fcmProjectId, accessToken, token, callPayload);
            if (sendRes.success) {
              results.fcm.succeeded++;
            } else {
              results.fcm.failed++;
              results.fcm.errors.push(`Token: ${token.slice(0, 10)}... Error: ${sendRes.error}`);
            }
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[Call-Handler] FCM OAuth or dispatch error:", message);
          results.fcm.errors.push(message);
        }
      }
    }

    // -----------------------------------------------------------------------
    // B. Send APNs VoIP Pushes (iOS PushKit)
    // -----------------------------------------------------------------------
    const apnsKeyId = Deno.env.get("APNS_KEY_ID");
    const apnsTeamId = Deno.env.get("APNS_TEAM_ID");
    const apnsBundleId = Deno.env.get("APNS_BUNDLE_ID");
    const apnsPrivateKey = Deno.env.get("APNS_PRIVATE_KEY");
    const isApnsProduction = Deno.env.get("APNS_PRODUCTION") === "true";

    if (apnsVoipTokens.length > 0) {
      if (!apnsKeyId || !apnsTeamId || !apnsBundleId || !apnsPrivateKey) {
        console.warn("[Call-Handler] APNs secrets missing (APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID, APNS_PRIVATE_KEY)");
        results.apns.errors.push("APNs credentials not configured in Supabase secrets");
      } else {
        try {
          const apnsJwt = await getApnsJwt(apnsTeamId, apnsKeyId, apnsPrivateKey);

          for (const voipToken of apnsVoipTokens) {
            const sendRes = await sendApnsVoipPush(
              apnsJwt,
              apnsBundleId,
              voipToken,
              callPayload,
              isApnsProduction
            );
            if (sendRes.success) {
              results.apns.succeeded++;
            } else {
              results.apns.failed++;
              results.apns.errors.push(`VoIP Token: ${voipToken.slice(0, 10)}... Error: ${sendRes.error}`);
            }
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[Call-Handler] APNs dispatch error:", message);
          results.apns.errors.push(message);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        callId,
        recipient: calleeId,
        callType,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Call-Handler] Unhandled error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
