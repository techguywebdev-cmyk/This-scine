import { auth, clerkClient } from '@clerk/nextjs/server';
import { SUPABASE_URL, SUPABASE_KEY, clean } from '@/lib/db';
import { sendEmail } from '@/lib/notify';

export const dynamic = 'force-dynamic';

const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
const db = (p) => `${SUPABASE_URL}/rest/v1/${p}`;
const REASONS = ['spam', 'harassment', 'inappropriate', 'impersonation', 'underage', 'other'];
const KINDS = ['user', 'message', 'status', 'review', 'comment', 'list'];

// GET /api/safety → { blocked: [{ user_id, username, display_name, avatar_url, created_at }] }
export async function GET() {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = await fetch(`${db('blocks')}?blocker_id=eq.${clean(userId)}&order=created_at.desc&select=blocked_id,created_at`, { headers, cache: 'no-store' }).then((r) => r.json()).catch(() => []);
  const list = Array.isArray(rows) ? rows : [];
  let users = [];
  if (list.length) {
    try { const res = await clerkClient.users.getUserList({ userId: list.map((r) => r.blocked_id), limit: 100 }); users = res?.data || res || []; } catch {}
  }
  const byId = Object.fromEntries(users.map((u) => [u.id, u]));
  return Response.json({
    blocked: list.map((r) => {
      const u = byId[r.blocked_id];
      return { user_id: r.blocked_id, created_at: r.created_at, username: u?.username || null, display_name: [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.username || 'User', avatar_url: u?.imageUrl || null };
    }),
  }, { headers: { 'Cache-Control': 'no-store' } });
}

// POST { action: 'block' | 'unblock', userId }
// POST { action: 'report', userId, kind, targetId, reason, note, snapshot, alsoBlock }
export async function POST(req) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const me = clean(userId);
  const body = await req.json().catch(() => ({}));
  const target = clean(body.userId);
  const action = body.action;

  const block = async () => {
    await fetch(`${db('blocks')}?on_conflict=blocker_id,blocked_id`, { method: 'POST', headers: { ...headers, Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ blocker_id: me, blocked_id: target }) });
    // Cut existing ties both ways: follows, pending watch parties
    await Promise.all([
      fetch(`${db('follows')}?or=(and(follower_id.eq.${me},following_id.eq.${target}),and(follower_id.eq.${target},following_id.eq.${me}))`, { method: 'DELETE', headers }),
      fetch(`${db('watch_parties')}?or=(and(host_id.eq.${me},guest_id.eq.${target}),and(host_id.eq.${target},guest_id.eq.${me}))&status=in.(invited,accepted,lobby,playing,paused)`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'declined', updated_at: new Date().toISOString() }) }),
    ]).catch(() => {});
  };

  if (action === 'block' || action === 'unblock') {
    if (!target || target === me) return Response.json({ error: 'Invalid user' }, { status: 400 });
    if (action === 'block') await block();
    else await fetch(`${db('blocks')}?blocker_id=eq.${me}&blocked_id=eq.${target}`, { method: 'DELETE', headers });
    return Response.json({ ok: true, blocked: action === 'block' });
  }

  if (action === 'report') {
    const reason = REASONS.includes(body.reason) ? body.reason : null;
    const kind = KINDS.includes(body.kind) ? body.kind : 'user';
    if (!reason) return Response.json({ error: 'Pick a reason' }, { status: 400 });
    if (!target && !body.targetId) return Response.json({ error: 'Nothing to report' }, { status: 400 });
    // Rate limit: 20 reports per day per reporter
    const since = new Date(Date.now() - 86400000).toISOString();
    const recent = await fetch(`${db('reports')}?reporter_id=eq.${me}&created_at=gt.${since}&select=id`, { headers }).then((r) => r.json()).catch(() => []);
    if (Array.isArray(recent) && recent.length >= 20) return Response.json({ error: 'Too many reports today' }, { status: 429 });
    const snapshot = body.snapshot && typeof body.snapshot === 'object' && JSON.stringify(body.snapshot).length <= 4000 ? body.snapshot : null;
    const row = { reporter_id: me, target_user_id: target || null, kind, target_id: body.targetId ? String(body.targetId).slice(0, 120) : null, reason, note: body.note ? String(body.note).slice(0, 1000) : null, snapshot };
    const r = await fetch(db('reports'), { method: 'POST', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(row) });
    if (!r.ok) return Response.json({ error: 'Could not send report' }, { status: 500 });
    const [saved] = await r.json().catch(() => [{}]);
    if (body.alsoBlock && target && target !== me) await block();
    // Let the team know (set REPORTS_EMAIL in Vercel)
    const to = process.env.REPORTS_EMAIL;
    if (to) {
      const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
      sendEmail({
        to, subject: `CineScroll report #${saved?.id || ''}: ${reason} (${kind})`,
        text: `Reporter: ${me}\nReported user: ${target || '-'}\nKind: ${kind} ${row.target_id || ''}\nReason: ${reason}\nNote: ${row.note || '-'}\nSnapshot: ${snapshot ? JSON.stringify(snapshot) : '-'}`,
        html: `<p><b>Reason:</b> ${esc(reason)} · <b>Kind:</b> ${esc(kind)} ${esc(row.target_id || '')}</p><p><b>Reporter:</b> ${esc(me)}<br/><b>Reported user:</b> ${esc(target || '-')}</p><p><b>Note:</b> ${esc(row.note || '-')}</p><pre>${esc(snapshot ? JSON.stringify(snapshot, null, 2) : '')}</pre>`,
      }).catch(() => {});
    }
    return Response.json({ ok: true, id: saved?.id || null, blocked: !!body.alsoBlock });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
}
