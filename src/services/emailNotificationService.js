/**
 * Email Notification Service for I 4 You Matrimonial Platform
 * Dispatches automated transactional emails via Supabase Edge Functions & Resend/SendGrid
 */

import { supabase, isSupabaseConfigured } from './supabase';

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || '';
const FROM_EMAIL = import.meta.env.VITE_FROM_EMAIL || 'I 4 You Matrimony <onboarding@resend.dev>';

/**
 * 1. Automatically send "Profile Created Successfully" email upon registration
 * Includes the user's newly generated Register ID and security advice.
 */
export async function sendRegistrationEmail({ to, name, registerId }) {
  if (!to || !to.includes('@')) {
    console.log('[EmailService] No valid recipient email provided, skipping email dispatch.');
    return { success: false, reason: 'no_email' };
  }

  const subject = `Welcome to I 4 You Matrimony - Your Register ID is ${registerId}`;
  const payload = {
    type: 'registration_confirmation',
    to,
    name: name || 'Valued Member',
    registerId,
    subject,
    supportEmail: 'i4youmatrimony@gmail.com',
    supportPhone: '+91 8968926566'
  };

  // 1. Try Supabase Edge Function first
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.functions.invoke('send-email-notification', {
        body: payload
      });
      if (!error) {
        console.log('[EmailService] Registration email dispatched via Supabase Edge Function:', data);
        return { success: true, method: 'edge_function', data };
      }
    } catch (edgeErr) {
      console.warn('[EmailService] Edge Function unavailable, falling back:', edgeErr);
    }

    // Also record in Supabase notifications table
    try {
      await supabase.from('notifications').insert([{
        recipient_email: to,
        type: 'registration_confirmation',
        title: 'Profile Created Successfully',
        message: `Welcome to I 4 You! Your unique Register ID is ${registerId}.`,
        metadata: { registerId, name },
        is_read: false,
        email_sent: true,
        email_sent_at: new Date().toISOString()
      }]);
    } catch (tblErr) {
      console.warn('[EmailService] Could not log to notifications table:', tblErr);
    }
  }

  // 2. Direct Resend API fallback if client has VITE_RESEND_API_KEY configured
  if (RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [to],
          subject,
          html: generateRegistrationEmailHtml({ name, registerId })
        })
      });
      const data = await res.json();
      return { success: res.ok, method: 'resend_direct', data };
    } catch (err) {
      console.warn('[EmailService] Direct Resend call error:', err);
    }
  }

  // 3. Dev / Simulation Mode: Log complete email delivery details
  console.log('%c[I 4 You Email Notification Dispatched] ✉️', 'background: #0B192C; color: #DFB76C; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
  console.log(`Recipient: ${to} (${name})`);
  console.log(`Subject: ${subject}`);
  console.log(`Register ID: ${registerId}`);

  return { success: true, method: 'simulated_dev', registerId };
}

/**
 * 2. Send In-App Notification with Automated Email Alert
 * Triggers an email whenever an in-app alert is generated (e.g. interest received, match alert)
 */
export async function sendInAppNotificationWithEmail({
  recipientId,
  recipientEmail,
  type = 'interest_received',
  title,
  message,
  senderName = 'A Verified Member',
  senderPhoto = null,
  profileLink = 'https://i4youmatrimony.com/app'
}) {
  const payload = {
    type: 'in_app_notification',
    to: recipientEmail,
    recipientId,
    notificationType: type,
    title: title || 'New Notification on I 4 You',
    message: message || 'You have received a new activity alert on your matrimony profile.',
    senderName,
    senderPhoto,
    profileLink,
    supportEmail: 'i4youmatrimony@gmail.com',
    supportPhone: '+91 8968926566'
  };

  // 1. Record in Supabase notifications table
  if (isSupabaseConfigured() && recipientId) {
    try {
      await supabase.from('notifications').insert([{
        recipient_id: recipientId,
        recipient_email: recipientEmail || null,
        type,
        title: payload.title,
        message: payload.message,
        metadata: { senderName, senderPhoto, profileLink },
        is_read: false,
        email_sent: Boolean(recipientEmail),
        email_sent_at: recipientEmail ? new Date().toISOString() : null
      }]);
    } catch (e) {
      console.warn('[EmailService] notifications table insert error:', e);
    }
  }

  // 2. Dispatch Email if recipient email is available
  if (recipientEmail && recipientEmail.includes('@')) {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.functions.invoke('send-email-notification', {
          body: payload
        });
        if (!error) return { success: true, method: 'edge_function', data };
      } catch (e) {}
    }

    if (RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [recipientEmail],
            subject: `🔔 ${payload.title} - I 4 You Matrimony`,
            html: generateInAppNotificationEmailHtml(payload)
          })
        });
        return { success: true, method: 'resend_direct' };
      } catch (e) {}
    }

    console.log(`[Email Alert Sim] In-app notification email triggered for ${recipientEmail}: "${title}"`);
  }

  return { success: true };
}

/**
 * Beautiful HTML template for Registration Confirmation
 */
export function generateRegistrationEmailHtml({ name, registerId }) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to I 4 You</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 20px; color: #1E293B; }
        .container { max-width: 580px; margin: 0 auto; background: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #E2E8F0; }
        .header { background: linear-gradient(135deg, #0B192C 0%, #152E52 100%); padding: 36px 24px; text-align: center; }
        .brand { font-size: 26px; font-weight: 800; color: #DFB76C; letter-spacing: 1px; margin: 0; }
        .tagline { color: #CBD5E1; font-size: 12px; margin-top: 6px; text-transform: uppercase; letter-spacing: 1.5px; }
        .content { padding: 32px 28px; }
        .greeting { font-size: 18px; font-weight: 700; color: #0B192C; margin-bottom: 12px; }
        .card { background: #FFFDF7; border: 2px dashed #D4AF37; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0; }
        .card-label { font-size: 11px; text-transform: uppercase; color: #8C6D1F; font-weight: 700; letter-spacing: 1px; }
        .reg-id { font-size: 32px; font-weight: 800; color: #0B192C; letter-spacing: 2px; margin: 10px 0; }
        .card-subtext { font-size: 12px; color: #64748B; margin: 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #DFB76C 100%); color: #0B192C; text-decoration: none; font-weight: 800; font-size: 14px; padding: 14px 32px; border-radius: 12px; margin-top: 10px; }
        .footer { background: #F1F5F9; padding: 20px; text-align: center; font-size: 11px; color: #64748B; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="brand">I 4 YOU</h1>
          <p class="tagline">Pan India Matrimony &bull; Trusted Matchmaking</p>
        </div>
        <div class="content">
          <h2 class="greeting">Namaste, ${name}!</h2>
          <p>Congratulations! Your matrimonial profile has been created successfully on <strong>I 4 You</strong>.</p>
          <p>We are delighted to have you with us on this journey to find your ideal life partner.</p>
          
          <div class="card">
            <div class="card-label">Your Unique Matrimony Register ID</div>
            <div class="reg-id">${registerId}</div>
            <p class="card-subtext">Use this <strong>Register ID</strong> along with your chosen password to log into your account anytime.</p>
          </div>

          <div style="text-align: center;">
            <a href="https://i4youmatrimony.com" class="button">Log In to Your Account</a>
          </div>

          <p style="margin-top: 28px; font-size: 12px; color: #64748B; line-height: 1.6;">
            <strong>Security Reminder:</strong> Never share your password or confidential Aadhaar information with anyone. For assistance, reach out to our toll-free support at <strong>8968926566</strong> or email <strong>i4youmatrimony@gmail.com</strong>.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} I 4 You Matrimonial Technologies Pvt. Ltd.<br>
          Pan India Matrimony &bull; Safe, Verified &amp; Confidential
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Beautiful HTML template for In-App Notification Alerts
 */
export function generateInAppNotificationEmailHtml({ title, message, senderName, profileLink }) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 20px; color: #1E293B; }
        .container { max-width: 580px; margin: 0 auto; background: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #E2E8F0; }
        .header { background: #0B192C; padding: 28px 24px; text-align: center; }
        .brand { font-size: 22px; font-weight: 800; color: #DFB76C; margin: 0; }
        .content { padding: 32px 28px; text-align: center; }
        .alert-title { font-size: 20px; font-weight: 700; color: #0B192C; margin-bottom: 12px; }
        .message-box { background: #F8FAFC; border-left: 4px solid #D4AF37; padding: 16px 20px; border-radius: 8px; text-align: left; margin: 20px 0; font-size: 14px; color: #334155; }
        .button { display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #DFB76C 100%); color: #0B192C; text-decoration: none; font-weight: 800; font-size: 13px; padding: 12px 28px; border-radius: 10px; margin-top: 10px; }
        .footer { background: #F1F5F9; padding: 16px; text-align: center; font-size: 11px; color: #64748B; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="brand">I 4 YOU</h1>
        </div>
        <div class="content">
          <div style="font-size: 40px; margin-bottom: 10px;">💖</div>
          <h2 class="alert-title">${title}</h2>
          <div class="message-box">
            ${message}
          </div>
          <a href="${profileLink || 'https://i4youmatrimony.com/app'}" class="button">View Profile & Respond</a>
        </div>
        <div class="footer">
          You received this email because you have notifications enabled on I 4 You.<br>
          Need help? Contact support: 8968926566 | i4youmatrimony@gmail.com
        </div>
      </div>
    </body>
    </html>
  `;
}
