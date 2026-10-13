// "Remind me to watch" + opt-in nudges for saved titles that have sat unwatched.
// Called from the 5-minute scheduler (app/api/cron/party-reminders).
import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/db';
import { getSettings, sendWebPush, sendExpoPush, sendEmail } from '@/lib/notify';
import { SITE_URL } from '@/lib/brand';
import { clerkClient } from '@clerk/nextjs/server';

const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
const db = (p) => `${SUPABASE_URL}/rest/v1/${p}`;
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DAY = 86400000;

const linkFor = (row) => `/?m=${row.is_tv ? 'tv' : 'movie'}-${row.movie_id}`;

async function emailFor(userId) {
  try {
    const u = await clerkClient.users.getUser(userId);
    const e = u.emailAddresses?.find((x) => x.id === u.primaryEmailAddressId) || u.emailAddresses?.[0];
    return e?.emailAddress || null;
  } catch { return null; }
}

function emailHtml({ row, headline, line, link, partyLink }) {
  const a = /^#[0-9a-fA-F]{6}$/.test(row.accent || '') ? row.accent : '#FFFFFF';
  const img = row.backdrop || row.poster;
  return `<div style="background:#06060B;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <div style="max-width:440px;margin:0 auto;background:#0F0F18;border:1px solid rgba(255,255,255,0.06);border-radius:20px;overflow:hidden">
    ${img ? `<img src="${esc(img)}" alt="" width="440" style="display:block;width:100%;max-height:260px;object-fit:cover"/>` : ''}
    <div style="padding:24px">
      <div style="font-size:10px;letter-spacing:3px;color:${a};font-weight:700;text-transform:uppercase">${esc(headline)}</div>
      <h1 style="margin:8px 0 10px;font-weight:800;letter-spacing:-0.02em;font-size:28px;color:#fff;line-height:1.1">${esc(row.title)}</h1>
      <p style="margin:0 0 22px;color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6">${esc(line)}</p>
      <a href="${link}" style="display:inline-block;background:#fff;color:#06060B;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:800;font-size:14px">Open it</a>
      <a href="${partyLink}" style="display:inline-block;margin-left:8px;color:#fff;padding:12px 16px;border-radius:999px;border:1px solid rgba(255,255,255,0.2);text-decoration:none;font-weight:700;font-size:14px">Watch with someone</a>
    </div>
  </div>
  <p style="text-align:center;color:rgba(255,255,255,0.3);font-size:11px;margin-top:16px">thiscene · you can change reminders on any saved title</p>
</div>`;
}

// Push first (browser + phone). Email only if push didn't reach them and email is allowed.
async function deliver(userId, row, { title, body, headline, line, tag, emailOk }) {
  const { prefs, pushSubscription, expoToken } = await getSettings(userId);
  const url = linkFor(row);
  const partyUrl = `${url}&act=party`;
  const payload = { title, body, url, tag, icon: '/icon-192.png', image: row.backdrop || undefined, actions: [{ action: 'party', title: 'Watch with someone', url: partyUrl }, { action: 'open', title: 'Open', url }] };
  let ok = false;
  if (prefs.web !== false) {
    const [w, x] = await Promise.all([
      pushSubscription ? sendWebPush(pushSubscription, payload, userId) : Promise.resolve({ ok: false }),
      expoToken ? sendExpoPush(expoToken, { title, body, url, tag }) : Promise.resolve({ ok: false }),
    ]);
    ok = w.ok || x.ok;
  }
  if (!ok && emailOk && prefs.email !== false) {
    const to = await emailFor(userId);
    if (to) {
      const site = process.env.NEXT_PUBLIC_APP_URL || SITE_URL;
      const r = await sendEmail({ to, subject: title, text: `${body}\n\n${site}${url}`, html: emailHtml({ row, headline, line, link: `${site}${url}`, partyLink: `${site}${partyUrl}` }) });
      ok = !!(r && r.ok !== false);
    }
  }
  return ok;
}

export async function runWatchReminders() {
  const now = Date.now();
  let sent = 0, nudged = 0;

  // 1) Reminders people asked for
  const due = await fetch(
    `${db('watchlist')}?remind_at=lte.${new Date(now).toISOString()}&reminded_at=is.null&watched=eq.false&select=user_id,movie_id,title,poster,backdrop,accent,is_tv&order=remind_at.asc&limit=200`,
    { headers, cache: 'no-store' }
  ).then((r) => r.json()).catch(() => []);
  for (const row of Array.isArray(due) ? due : []) {
    // Mark first so a slow send can never double-fire on the next tick
    await fetch(`${db('watchlist')}?user_id=eq.${encodeURIComponent(row.user_id)}&movie_id=eq.${row.movie_id}`, { method: 'PATCH', headers, body: JSON.stringify({ reminded_at: new Date().toISOString(), remind_at: null }) });
    const ok = await deliver(row.user_id, row, {
      title: `Time to watch ${row.title} 🍿`,
      body: 'You asked us to remind you. Tap to open it, or watch it with a friend.',
      headline: 'Your reminder', line: 'You asked us to remind you to watch this one. Press play, or bring a friend into a watch party.',
      tag: `watch-${row.movie_id}`, emailOk: true,
    }).catch(() => false);
    if (ok) sent++;
  }

  // 2) Opt-in nudges: once a week, around 7pm their time, for something saved 2+ weeks ago
  const users = await fetch(
    `${db('user_settings')}?notify_prefs->>nudge=eq.true&or=(last_nudge_at.is.null,last_nudge_at.lt.${new Date(now - 7 * DAY).toISOString()})&select=user_id,notify_prefs&limit=500`,
    { headers, cache: 'no-store' }
  ).then((r) => r.json()).catch(() => []);
  for (const u of Array.isArray(users) ? users : []) {
    const tz = u.notify_prefs?.tz || 'UTC';
    let hour = 19;
    try { hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: tz }).format(new Date(now))); } catch {}
    if (hour !== 19) continue;
    const pick = await fetch(
      `${db('watchlist')}?user_id=eq.${encodeURIComponent(u.user_id)}&watched=eq.false&remind_at=is.null&saved_at=lt.${now - 14 * DAY}&or=(nudged_at.is.null,nudged_at.lt.${new Date(now - 60 * DAY).toISOString()})&select=user_id,movie_id,title,poster,backdrop,accent,is_tv&order=saved_at.asc&limit=1`,
      { headers, cache: 'no-store' }
    ).then((r) => r.json()).catch(() => []);
    const row = Array.isArray(pick) ? pick[0] : null;
    await fetch(`${db('user_settings')}?user_id=eq.${encodeURIComponent(u.user_id)}`, { method: 'PATCH', headers, body: JSON.stringify({ last_nudge_at: new Date().toISOString() }) });
    if (!row) continue;
    await fetch(`${db('watchlist')}?user_id=eq.${encodeURIComponent(u.user_id)}&movie_id=eq.${row.movie_id}`, { method: 'PATCH', headers, body: JSON.stringify({ nudged_at: new Date().toISOString() }) });
    const ok = await deliver(u.user_id, row, {
      title: `Still want to watch ${row.title}?`,
      body: 'It’s been on your list a while. Tonight could be the night 🍿',
      headline: 'From your watchlist', line: 'It’s been sitting on your list for a while. Tonight could be the night.',
      tag: `nudge-${row.movie_id}`, emailOk: false,
    }).catch(() => false);
    if (ok) nudged++;
  }
  return { sent, nudged };
}
