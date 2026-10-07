// Supabase Edge Function: send-email-notification
// Runtime: Deno (TypeScript)
// Dispatches automated transactional emails via Resend / SendGrid

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY") || "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "support@i4youmatrimony.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { type, to, name, registerId, title, message, senderName, profileLink } = payload;

    if (!to || !to.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid recipient email ('to')" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let subject = "";
    let htmlContent = "";

    // 1. Registration Confirmation Email Template
    if (type === "registration_confirmation") {
      subject = `Welcome to I 4 You Matrimony - Your Register ID: ${registerId}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #F8FAFC; margin: 0; padding: 20px; color: #1E293B; }
            .container { max-width: 580px; margin: 0 auto; background: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #E2E8F0; }
            .header { background: linear-gradient(135deg, #0B192C 0%, #152E52 100%); padding: 36px 24px; text-align: center; }
            .brand { font-size: 26px; font-weight: 800; color: #DFB76C; letter-spacing: 1.5px; margin: 0; }
            .tagline { color: #94A3B8; font-size: 11px; margin-top: 6px; text-transform: uppercase; letter-spacing: 2px; }
            .content { padding: 32px 28px; }
            .greeting { font-size: 20px; font-weight: 700; color: #0B192C; margin-bottom: 12px; }
            .card { background: #FFFDF7; border: 2px dashed #D4AF37; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0; }
            .card-label { font-size: 11px; text-transform: uppercase; color: #8C6D1F; font-weight: 700; letter-spacing: 1px; }
            .reg-id { font-size: 34px; font-weight: 800; color: #0B192C; letter-spacing: 2px; margin: 8px 0; }
            .card-subtext { font-size: 12px; color: #64748B; margin: 0; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #DFB76C 100%); color: #0B192C; text-decoration: none; font-weight: 800; font-size: 14px; padding: 14px 34px; border-radius: 12px; margin: 12px 0; }
            .footer { background: #F1F5F9; padding: 20px; text-align: center; font-size: 11px; color: #64748B; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="brand">I 4 YOU</h1>
              <p class="tagline">Pan India Matrimony &bull; Trusted Matchmaking</p>
            </div>
            <div class="content">
              <h2 class="greeting">Namaste, ${name || "Member"}!</h2>
              <p>Your matrimonial profile has been created successfully on <strong>I 4 You</strong>.</p>
              
              <div class="card">
                <div class="card-label">Your Unique Matrimony Register ID</div>
                <div class="reg-id">${registerId}</div>
                <p class="card-subtext">Always keep this <strong>Register ID</strong> safe. Use it with your password to log in.</p>
              </div>

              <div style="text-align: center;">
                <a href="${profileLink || "https://i4youmatrimony.com"}" class="cta-button">Log In to Your Profile</a>
              </div>

              <p style="margin-top: 24px; font-size: 12px; color: #64748B;">
                <strong>Next Step:</strong> Complete your Aadhaar verification to earn the <em>100% Aadhaar Verified Badge</em> and receive 5x more matching interests!
              </p>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} I 4 You Matrimonial Technologies Pvt. Ltd.<br>
              Toll Free Support: 8968926566 &bull; Email: i4youmatrimony@gmail.com
            </div>
          </div>
        </body>
        </html>
      `;
    } 
    // 2. In-App Notification Email Alert Template
    else {
      subject = `🔔 ${title || "New Notification on I 4 You Matrimony"}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #F8FAFC; margin: 0; padding: 20px; color: #1E293B; }
            .container { max-width: 580px; margin: 0 auto; background: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #E2E8F0; }
            .header { background: #0B192C; padding: 28px 24px; text-align: center; }
            .brand { font-size: 22px; font-weight: 800; color: #DFB76C; margin: 0; }
            .content { padding: 32px 28px; text-align: center; }
            .alert-title { font-size: 19px; font-weight: 700; color: #0B192C; margin-bottom: 8px; }
            .message-box { background: #F8FAFC; border-left: 4px solid #D4AF37; padding: 16px 20px; border-radius: 8px; text-align: left; margin: 20px 0; font-size: 14px; color: #334155; line-height: 1.5; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #DFB76C 100%); color: #0B192C; text-decoration: none; font-weight: 800; font-size: 13px; padding: 12px 28px; border-radius: 10px; margin-top: 10px; }
            .footer { background: #F1F5F9; padding: 16px; text-align: center; font-size: 11px; color: #64748B; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="brand">I 4 YOU</h1>
            </div>
            <div class="content">
              <div style="font-size: 38px; margin-bottom: 8px;">💖</div>
              <h2 class="alert-title">${title || "Activity Alert"}</h2>
              <div class="message-box">
                ${message || "You have a new update waiting on your matrimony account."}
              </div>
              <a href="${profileLink || "https://i4youmatrimony.com/app"}" class="cta-button">View in App & Respond</a>
            </div>
            <div class="footer">
              You received this alert because you have email notifications enabled on I 4 You.<br>
              Support: 8968926566 &bull; i4youmatrimony@gmail.com
            </div>
          </div>
        </body>
        </html>
      `;
    }

    // Dispatch via Resend API
    if (RESEND_API_KEY) {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [to],
          subject,
          html: htmlContent,
        }),
      });

      const resendData = await resendRes.json();
      return new Response(
        JSON.stringify({ success: resendRes.ok, provider: "resend", data: resendData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dispatch via SendGrid API
    if (SENDGRID_API_KEY) {
      const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: FROM_EMAIL, name: "I 4 You Matrimony" },
          subject,
          content: [{ type: "text/html", value: htmlContent }],
        }),
      });

      return new Response(
        JSON.stringify({ success: sgRes.ok, provider: "sendgrid" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback simulation if no API key is yet configured
    console.log(`[Edge Function Email Sim] Dispatched to ${to}: ${subject}`);
    return new Response(
      JSON.stringify({ success: true, provider: "simulated_dev", message: "Email simulated successfully." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to process email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
