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

export async function getSettings(userId) {
  const res = await fetch(
    `${db('user_settings')}?user_id=eq.${encodeURIComponent(userId)}&select=notify_prefs,push_subscription,expo_push_token`,
    { headers, cache: 'no-store' }
  );
  const rows = await res.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  return {
    prefs: parsePrefs(row?.notify_prefs),
    pushSubscription: row?.push_subscription || null,
    expoToken: row?.expo_push_token || null,
  };
}

/**
 * category: 'messages' | 'follows' | 'activity'
 */
export function categoryAllowed(prefs, category) {
  if (category === 'messages') return prefs.messages !== false;
  if (category === 'follows') return prefs.follows !== false;
  return prefs.activity !== false;
}

export async function sendEmail({ to, subject, html, text }) {
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

// Public half of the VAPID pair (safe to ship). The private half lives only in the
// VAPID_PRIVATE_KEY environment variable on Vercel.
export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  process.env.VAPID_PUBLIC_KEY ||
  'BJ3uhAlh8YuAw4lyRaaQVnzK7QtJQkuAR2WzrdPqfi2Xs2W69y_XZlpcblPCKVCDn9U2XwTueQ3QmwdEGKhNlSg';

let _webpush = null;
async function getWebPush() {
  if (_webpush) return _webpush;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!privateKey) return null;
  const mod = await import('web-push');
  const wp = mod.default || mod;
  wp.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:techguywebdev@gmail.com', VAPID_PUBLIC_KEY, privateKey);
  _webpush = wp;
  return wp;
}

async function clearSubscription(userId) {
  try {
    await fetch(`${db('user_settings')}?user_id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ push_subscription: null }),
    });
  } catch {}
}

export async function sendWebPush(subscription, payload, userId) {
  if (!subscription || !subscription.endpoint) return { ok: false, reason: 'no_subscription' };
  const wp = await getWebPush().catch((e) => { console.error('web-push load', e); return null; });
  if (!wp) return { ok: false, reason: 'no_vapid_private_key' };
  try {
    await wp.sendNotification(subscription, JSON.stringify(payload), { TTL: 60 * 60 * 24, urgency: 'high' });
    return { ok: true };
  } catch (e) {
    // 404/410 = the browser dropped this subscription; forget it
    if ((e.statusCode === 404 || e.statusCode === 410) && userId) await clearSubscription(userId);
    console.error('web push error', e.statusCode, e.body);
    return { ok: false, reason: `push_${e.statusCode || 'error'}` };
  }
}

// Mobile app push via Expo's push service (no keys needed server-side)
export async function sendExpoPush(token, { title, body, url, tag }) {
  if (!token) return { ok: false, reason: 'no_token' };
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: token, title, body, sound: 'default', priority: 'high', channelId: 'default', data: { url, tag } }),
    });
    return { ok: res.ok };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

/** Push-only notification (no email), respecting the user's preferences. Goes to the browser and the phone app. */
export async function pushUser({ userId, category = 'activity', title, body, url = '/', tag }) {
  if (!userId) return { ok: false };
  const { prefs, pushSubscription, expoToken } = await getSettings(userId);
  if (!categoryAllowed(prefs, category) || prefs.web === false) return { ok: false, reason: 'off' };
  const [web, app] = await Promise.all([
    pushSubscription ? sendWebPush(pushSubscription, { title, body, url, tag, icon: '/icon-192.png' }, userId) : Promise.resolve({ ok: false }),
    expoToken ? sendExpoPush(expoToken, { title, body, url, tag }) : Promise.resolve({ ok: false }),
  ]);
  return { ok: web.ok || app.ok };
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
export async function notifyUser({ userId, email, category = 'activity', title, body, url = '/', tag }) {
  if (!userId) return { channels: {} };

  const { prefs, pushSubscription, expoToken } = await getSettings(userId);
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
        <h2 style="margin:0 0 8px;font-weight:800;letter-spacing:-0.02em">${title}</h2>
        <p style="color:#aaa;line-height:1.5">${body}</p>
        <p style="margin-top:20px"><a href="${link}" style="background:#f5a623;color:#07070f;padding:10px 16px;border-radius:20px;text-decoration:none;font-weight:700">Open CineScroll</a></p>
      </div>`,
    });
  }

  // Web push
  if (prefs.web && pushSubscription) {
    results.web = await sendWebPush(pushSubscription, { title, body, url, tag, icon: '/icon-192.png' }, userId);
  }
  if (prefs.web !== false && expoToken) {
    results.app = await sendExpoPush(expoToken, { title, body, url, tag });
  }


  return { channels: results };
}
