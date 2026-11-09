// Supabase Edge Function: send-push
// Runtime: Deno (TypeScript)
// Purpose: Dispatches W3C Web Push notifications to active subscriptions (Web, Android, iOS PWA)
//          for chat messages and incoming audio/video calls even when the browser or app is closed.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import webpush from "npm:web-push@3.6.7";

// Standard CORS headers for Supabase Edge Functions
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  subscription_json?: Record<string, unknown>;
  device_type?: string;
  updated_at?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Retrieve environment variables
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@i4you.in";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("[send-push] Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY.");
      return new Response(
        JSON.stringify({ error: "VAPID keys are not configured in Supabase secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[send-push] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
      return new Response(
        JSON.stringify({ error: "Supabase service credentials not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Configure Web Push VAPID credentials
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Initialize Supabase Admin client with service_role key to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Parse incoming request body
    const body = await req.json().catch(() => ({}));
    const record = body.record || body;

    let receiverId = "";
    let title = "";
    let bodyText = "";
    let type: "message" | "call" = "message";
    let url = "/";
    let callerName = "";
    let roomId = "";
    const extraData: Record<string, unknown> = {};

    // 3. Determine payload origin (Database Webhook vs Direct POST)
    const isCallRequest = body.table === "call_requests" || record.channel_name || record.call_type;
    const isChatMessage = body.table === "messages" || (record.text && record.receiver_id);

    if (isCallRequest) {
      type = "call";
      receiverId = String(record.callee_id || body.receiver_id || "");
      callerName = String(record.caller_name || body.callerName || "A candidate");
      const callType = record.call_type || "audio";
      title = body.title || `Incoming ${callType === "video" ? "Video" : "Voice"} Call`;
      bodyText = body.body || `${callerName} is calling you...`;
      roomId = String(record.channel_name || record.id || body.roomId || "");
      url = body.url || `/?call=incoming&channel=${encodeURIComponent(roomId)}&caller=${encodeURIComponent(callerName)}&type=${encodeURIComponent(callType)}`;
      extraData.callerId = record.caller_id || "";
      extraData.callerPhoto = record.caller_photo || "";
      extraData.callType = callType;
    } else if (isChatMessage) {
      type = "message";
      receiverId = String(record.receiver_id || body.receiver_id || "");
      const senderName = String(record.sender_name || body.callerName || "A match");
      title = body.title || `Message from ${senderName}`;
      bodyText = body.body || String(record.text || "You have a new matrimonial message.");
      url = body.url || `/?view=chat&sender=${encodeURIComponent(record.sender_id || "")}`;
      extraData.senderId = record.sender_id || "";
      extraData.conversationId = record.conversation_id || "";
    } else {
      // Direct POST payload fallback
      receiverId = String(body.receiver_id || body.recipient_id || body.user_id || "");
      type = body.type === "call" ? "call" : "message";
      title = body.title || (type === "call" ? "Incoming Call" : "I 4 You Matrimony");
      bodyText = body.body || body.message || "You have a new update.";
      url = body.url || "/";
      callerName = body.callerName || "";
      roomId = body.roomId || "";
    }

    if (!receiverId) {
      return new Response(
        JSON.stringify({ error: "receiver_id could not be determined from payload." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Query public.push_subscriptions for the receiver
    let { data: subscriptions, error: fetchErr } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", receiverId);

    if (fetchErr) {
      console.error("[send-push] Database query error:", fetchErr);
    }

    // Fallback: If receiverId might be a profile ID or register_id, resolve associated auth user_id
    if ((!subscriptions || subscriptions.length === 0) && receiverId) {
      try {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id, user_id, register_id")
          .or(`id.eq.${receiverId},register_id.eq.${receiverId}`)
          .limit(1)
          .maybeSingle();

        if (profile) {
          const candidateUids = [profile.user_id, profile.id].filter(
            (id) => Boolean(id) && id !== receiverId
          );

          for (const candId of candidateUids) {
            const { data: altSubs } = await supabaseAdmin
              .from("push_subscriptions")
              .select("*")
              .eq("user_id", candId);

            if (altSubs && altSubs.length > 0) {
              subscriptions = altSubs;
              break;
            }
          }
        }
      } catch (profileResolveErr) {
        console.warn("[send-push] Profile resolution notice:", profileResolveErr);
      }
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`[send-push] No active push subscriptions found for receiver: ${receiverId}`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "No push subscriptions registered for receiver.",
          receiver_id: receiverId,
          sent: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Construct Web Push notification payload
    const pushPayloadString = JSON.stringify({
      title,
      body: bodyText,
      type,
      url,
      callerName,
      roomId,
      icon: "/brand-logo.png",
      badge: "/favicon.png",
      tag: type === "call" ? "incoming-call" : "chat-message",
      timestamp: Date.now(),
      ...extraData,
    });

    const sendOptions = {
      TTL: type === "call" ? 60 : 86400, // 60s for calls, 24h for messages
      urgency: type === "call" ? "high" : "normal",
    };

    let sentCount = 0;
    const prunedIds: string[] = [];

    // 6. Iterate through subscriptions and dispatch push notifications
    const results = await Promise.allSettled(
      (subscriptions as PushSubscriptionRow[]).map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };

          await webpush.sendNotification(pushSubscription, pushPayloadString, sendOptions);
          sentCount++;
          return { id: sub.id, status: "sent" };
        } catch (err: unknown) {
          const error = err as { statusCode?: number; status?: number; message?: string };
          const statusCode = error.statusCode || error.status;

          // Automatically delete expired/unregistered subscriptions (HTTP 404 or 410)
          if (statusCode === 404 || statusCode === 410) {
            console.log(`[send-push] Pruning expired subscription ID: ${sub.id} (Status: ${statusCode})`);
            await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
            prunedIds.push(sub.id);
          } else {
            console.warn(`[send-push] Push delivery failed for subscription ${sub.id}:`, error.message);
          }
          throw err;
        }
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        receiver_id: receiverId,
        type,
        total_subscriptions: subscriptions.length,
        sent: sentCount,
        pruned_expired: prunedIds.length,
        results: results.map((r) => (r.status === "fulfilled" ? r.value : { status: "failed" })),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (globalErr: unknown) {
    const error = globalErr as { message?: string; stack?: string };
    console.error("[send-push] Uncaught Edge Function exception:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
