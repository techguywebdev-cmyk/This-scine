import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
const db = (p) => `${SUPABASE_URL}/rest/v1/${p}`;

// Called every 5 minutes by the database scheduler (pg_cron → pg_net) with a secret header.
// Sends "starts in 15 minutes" and "it's time" pushes for scheduled watch parties.
export async function GET(req) {
  const key = req.headers.get('x-cron-key') || '';
  const sec = await fetch(`${db('app_secrets')}?name=eq.party_cron&select=value`, { headers, cache: 'no-store' }).then((r) => r.json()).catch(() => []);
  if (!key || !Array.isArray(sec) || !sec[0] || sec[0].value !== key) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const now = Date.now();
  const iso = (ms) => new Date(ms).toISOString();
  const notify = await import('@/lib/notify');
  const sel = 'id,host_id,guest_id,movie,status,scheduled_for,reminded_soon,reminded_start';
  const live = 'status=in.(invited,accepted,lobby)';
  const [soon, start] = await Promise.all([
    fetch(`${db('watch_parties')}?${live}&reminded_soon=eq.false&scheduled_for=gt.${iso(now + 2 * 60000)}&scheduled_for=lte.${iso(now + 18 * 60000)}&select=${sel}`, { headers, cache: 'no-store' }).then((r) => r.json()).catch(() => []),
    fetch(`${db('watch_parties')}?${live}&reminded_start=eq.false&scheduled_for=lte.${iso(now + 2 * 60000)}&scheduled_for=gt.${iso(now - 30 * 60000)}&select=${sel}`, { headers, cache: 'no-store' }).then((r) => r.json()).catch(() => []),
  ]);
  const push = (uid, title, body, p) => notify.pushUser({ userId: uid, category: 'messages', title, body, url: `/?party=${p.id}`, tag: `party-${p.id}` }).catch(() => {});
  let sent = 0;
  for (const p of Array.isArray(soon) ? soon : []) {
    const t = p.movie?.title || 'your film';
    await Promise.all([push(p.host_id, 'Watch party in 15 minutes 🍿', `${t} — get your snacks ready`, p), push(p.guest_id, 'Watch party in 15 minutes 🍿', `${t} — get your snacks ready`, p)]);
    await fetch(`${db('watch_parties')}?id=eq.${p.id}`, { method: 'PATCH', headers, body: JSON.stringify({ reminded_soon: true }) });
    sent += 2;
  }
  for (const p of Array.isArray(start) ? start : []) {
    const t = p.movie?.title || 'your film';
    await Promise.all([push(p.host_id, 'It’s time! 🍿', `${t} — tap to open the room`, p), push(p.guest_id, 'It’s time! 🍿', `${t} — tap to open the room`, p)]);
    await fetch(`${db('watch_parties')}?id=eq.${p.id}`, { method: 'PATCH', headers, body: JSON.stringify({ reminded_start: true, reminded_soon: true }) });
    sent += 2;
  }
  return Response.json({ ok: true, sent });
}
