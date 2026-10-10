import { auth, clerkClient } from '@clerk/nextjs/server';
import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/db';

export const dynamic = 'force-dynamic';

const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

// Admin ids live in the private app_secrets table (name: admin_user_ids), never in the public repo
async function isAdmin(userId) {
  if (!userId) return false;
  const env = (process.env.ADMIN_USER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (env.includes(userId)) return true;
  const rows = await fetch(`${SUPABASE_URL}/rest/v1/app_secrets?name=eq.admin_user_ids&select=value`, { headers, cache: 'no-store' }).then((r) => r.json()).catch(() => []);
  const ids = String(rows?.[0]?.value || '').split(',').map((s) => s.trim());
  return ids.includes(userId);
}

export async function GET(req) {
  const { userId } = auth();
  if (!(await isAdmin(userId))) return Response.json({ error: 'Not found' }, { status: 404 });
  const days = Math.max(1, Math.min(120, parseInt(new URL(req.url).searchParams.get('days') || '14', 10) || 14));

  const [stats, clerk] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_stats`, { method: 'POST', headers, body: JSON.stringify({ days }), cache: 'no-store' }).then((r) => r.json()),
    (async () => {
      try {
        const total = await clerkClient.users.getCount();
        const since = Date.now() - days * 864e5;
        const res = await clerkClient.users.getUserList({ orderBy: '-created_at', limit: 500 });
        const list = res?.data || res || [];
        const recent = list.filter((u) => u.createdAt >= since);
        const byDay = {};
        recent.forEach((u) => { const d = new Date(u.createdAt).toISOString().slice(0, 10); byDay[d] = (byDay[d] || 0) + 1; });
        return { total, signups: recent.length, byDay, latest: recent.slice(0, 8).map((u) => ({ name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || 'New member', avatar: u.imageUrl || null, at: u.createdAt })) };
      } catch { return null; }
    })(),
  ]);
  return Response.json({ ...stats, clerk }, { headers: { 'Cache-Control': 'no-store' } });
}

// POST { reportId, status: 'resolved' | 'dismissed' }
export async function POST(req) {
  const { userId } = auth();
  if (!(await isAdmin(userId))) return Response.json({ error: 'Not found' }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const id = parseInt(b.reportId, 10);
  if (!id || !['resolved', 'dismissed'].includes(b.status)) return Response.json({ error: 'Bad request' }, { status: 400 });
  const r = await fetch(`${SUPABASE_URL}/rest/v1/reports?id=eq.${id}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify({ status: b.status }) });
  return Response.json({ ok: r.ok });
}
