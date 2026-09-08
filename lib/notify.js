/**
 * Shared multi-channel notify helper for CineScroll / This-scine.
 * Channels: in-app (always), email (Resend), web push (VAPID), app (FCM later).
 *
 * Copy to: lib/notify.js
 * Import from API routes: import { notifyUser } from '@/lib/notify';
 */

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dmZpaG96eHlib2lya2FpeHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjYxMDEsImV4cCI6MjA5NTY0MjEwMX0.y6zfENBPd6iJvFEf5-nRFeiWvVTzlDMAkNLr4CGfsGc';

const db = (path) => `${SUPABASE_URL}/rest/v1/${path}`;
const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

const DEFAULT_PREFS = {
  email: true,
  web: true,
  app: true,
  messages: true,
  follows: true,
  activity: true,
};

function parsePrefs(raw) {
  if (!raw) return { ...DEFAULT_PREFS };
  if (typeof raw === 'string') {
    try {
      return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_PREFS };
    }
  }
  return { ...DEFAULT_PREFS, ...raw };
}

async function getSettings(userId) {
  const res = await fetch(
    `${db('user_settings')}?user_id=eq.${userId}&select=notify_prefs,push_subscription`,
    { headers }
  );
  const rows = await res.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  return {
    prefs: parsePrefs(row?.notify_prefs),
    pushSubscription: row?.push_subscription || null,
  };
}

/**
 * category: 'messages' | 'follows' | 'activity'
 */
function categoryAllowed(prefs, category) {
  if (category === 'messages') return prefs.messages !== false;
  if (category === 'follows') return prefs.follows !== false;
  return prefs.activity !== false;
}

async function sendEmail({ to, subject, html, text }) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return { ok: false, reason: 'no_resend_or_email' };

  const from = process.env.NOTIFY_FROM_EMAIL || 'CineScroll <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error('Resend error', res.status, t);
    return { ok: false, reason: t.slice(0, 120) };
  }
  return { ok: true };
}

/**
 * Web Push without the `web-push` package: only works if you add the package.
 * When WEB_PUSH is configured, this attempts dynamic import.
 */
async function sendWebPush(subscription, payload) {
  if (!subscription) return { ok: false, reason: 'no_subscription' };
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return { ok: false, reason: 'no_vapid' };

  try {
    // Optional dependency — install: npm i web-push
    const webpush = await import('web-push');
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:support@this-scine.vercel.app',
      publicKey,
      privateKey
    );
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (err) {
    console.error('web push error', err?.message || err);
    return { ok: false, reason: String(err?.message || err).slice(0, 120) };
  }
}

/** Placeholder for native app (FCM / APNs) when you ship the app */
async function sendAppPush(_token, _payload) {
  // Future: Firebase Admin SDK
  return { ok: false, reason: 'app_channel_coming_soon' };
}

/**
 * notifyUser({
 *   userId,
 *   email?,
 *   category: 'messages'|'follows'|'activity',
 *   title,
 *   body,
 *   url?,
 * })
 */
export async function notifyUser({ userId, email, category = 'activity', title, body, url = '/' }) {
  if (!userId) return { channels: {} };

  const { prefs, pushSubscription } = await getSettings(userId);
  if (!categoryAllowed(prefs, category)) {
    return { channels: { skipped: 'category_off' } };
  }

  const results = {};

  // Email
  if (prefs.email && email) {
    const site = process.env.NEXT_PUBLIC_APP_URL || 'https://this-scine.vercel.app';
    const link = url.startsWith('http') ? url : `${site}${url}`;
    results.email = await sendEmail({
      to: email,
      subject: title,
      text: `${body}\n\nOpen: ${link}`,
      html: `<div style="font-family:system-ui,sans-serif;background:#0a0a12;color:#eee;padding:24px;border-radius:12px">
        <h2 style="margin:0 0 8px;font-style:italic">${title}</h2>
        <p style="color:#aaa;line-height:1.5">${body}</p>
        <p style="margin-top:20px"><a href="${link}" style="background:#f5a623;color:#07070f;padding:10px 16px;border-radius:20px;text-decoration:none;font-weight:700">Open CineScroll</a></p>
      </div>`,
    });
  }

  // Web push
  if (prefs.web && pushSubscription) {
    results.web = await sendWebPush(pushSubscription, {
      title,
      body,
      url,
      icon: '/icon-192.png',
    });
  }

  // App (later)
  if (prefs.app) {
    results.app = await sendAppPush(null, { title, body, url });
  }

  return { channels: results };
}
