import { clerkClient } from '@clerk/nextjs/server';
import { getSettings, sendEmail } from '@/lib/notify';

// Runs daily via Vercel Cron (see vercel.json). Finds reminders for titles releasing
// today or tomorrow, drops an in-app notification and (if the user allows email) sends
// one email, then marks the reminder as notified so nobody gets it twice.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dmZpaG96eHlib2lya2FpeHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjYxMDEsImV4cCI6MjA5NTY0MjEwMX0.y6zfENBPd6iJvFEf5-nRFeiWvVTzlDMAkNLr4CGfsGc';

const db = (path) => `${SUPABASE_URL}/rest/v1/${path}`;
const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

const iso = (d) => d.toISOString().slice(0, 10);
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function emailHtml({ title, poster, when, link }) {
  const headline = when === 'tomorrow' ? 'Out tomorrow' : 'Out today';
  return `<div style="background:#06060B;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <div style="max-width:440px;margin:0 auto;background:#0F0F18;border:1px solid rgba(255,255,255,0.06);border-radius:20px;overflow:hidden">
    ${poster ? `<img src="${esc(poster)}" alt="" width="440" style="display:block;width:100%;max-height:300px;object-fit:cover"/>` : ''}
    <div style="padding:24px">
      <div style="font-size:10px;letter-spacing:3px;color:#FFD166;font-weight:700;text-transform:uppercase">${headline}</div>
      <h1 style="margin:8px 0 10px;font-family:Georgia,'Playfair Display',serif;font-style:italic;font-size:28px;color:#fff;line-height:1.1">${esc(title)}</h1>
      <p style="margin:0 0 22px;color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6">You asked us to remind you. ${when === 'tomorrow' ? 'It lands tomorrow — plan your night.' : 'It’s out now — time to watch.'}</p>
      <a href="${link}" style="display:inline-block;background:#FFD166;color:#06060B;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:800;font-size:14px">Open CineScroll</a>
    </div>
  </div>
  <p style="text-align:center;color:rgba(255,255,255,0.3);font-size:11px;margin-top:16px">You can turn off email notifications in CineScroll settings.</p>
</div>`;
}

async function getEmails(userIds) {
  const map = {};
  if (!userIds.length) return map;
  try {
    const { data } = await clerkClient.users.getUserList({ userId: userIds, limit: userIds.length });
    for (const u of data || []) {
      const primary = u.emailAddresses?.find((e) => e.id === u.primaryEmailAddressId) || u.emailAddresses?.[0];
      map[u.id] = primary?.emailAddress || null;
    }
  } catch (err) {
    console.error('cron getEmails error:', err);
  }
  return map;
}

export async function GET(request) {
  // Vercel Cron sends "Authorization: Bearer <CRON_SECRET>" automatically when CRON_SECRET is set
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const today = iso(now);
  const tomorrow = iso(new Date(now.getTime() + 86400000));

  try {
    const res = await fetch(
      `${db('reminders')}?notified=eq.false&release_date=lte.${tomorrow}&select=id,user_id,movie_id,media_type,title,poster,release_date&limit=500`,
      { headers }
    );
    const rows = await res.json();
    const due = Array.isArray(rows) ? rows : [];
    if (!due.length) return Response.json({ ok: true, processed: 0 });

    const userIds = [...new Set(due.map((r) => r.user_id))];
    const emails = await getEmails(userIds);
    const site = process.env.NEXT_PUBLIC_APP_URL || 'https://this-scine.vercel.app';

    let inApp = 0;
    let emailed = 0;
    for (const r of due) {
      // Release date already passed by more than a day (e.g. cron was down) -> just close it out quietly
      const stale = r.release_date < today;
      const when = r.release_date === tomorrow ? 'tomorrow' : 'today';

      if (!stale) {
        const nRes = await fetch(db('notifications'), {
          method: 'POST',
          headers: { ...headers, Prefer: 'return=minimal' },
          body: JSON.stringify({
            user_id: r.user_id,
            from_user_id: null,
            type: 'release_reminder',
            read: false,
            data: { movie_id: r.movie_id, media_type: r.media_type, title: r.title, poster: r.poster, when },
          }),
        });
        if (nRes.ok) inApp++;
        else console.error('cron notification insert failed', nRes.status, await nRes.text());

        const { prefs } = await getSettings(r.user_id);
        if (prefs.email !== false && prefs.activity !== false && emails[r.user_id]) {
          const subject = when === 'tomorrow' ? `${r.title} releases tomorrow` : `${r.title} is out today`;
          const out = await sendEmail({
            to: emails[r.user_id],
            subject,
            text: `${subject}. You asked us to remind you.\n\n${site}`,
            html: emailHtml({ title: r.title, poster: r.poster, when, link: site }),
          });
          if (out.ok) emailed++;
        }
      }

      await fetch(`${db('reminders')}?id=eq.${r.id}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({ notified: true }),
      });
    }

    return Response.json({ ok: true, processed: due.length, inApp, emailed });
  } catch (err) {
    console.error('cron release-reminders error:', err);
    return Response.json({ error: 'Cron failed' }, { status: 500 });
  }
}
