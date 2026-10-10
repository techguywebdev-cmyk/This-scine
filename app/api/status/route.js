import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { publicHandle } from '@/lib/handle';
import { SUPABASE_KEY } from '@/lib/db';

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';
const db = (p) => `${SUPABASE_URL}/rest/v1/${p}`;
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };

export const dynamic = 'force-dynamic';

async function userMap(ids) {
  const map = {};
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return map;
  try {
    const { data } = await clerkClient.users.getUserList({ userId: unique, limit: unique.length });
    (data || []).forEach((u) => {
      map[u.id] = { username: publicHandle(u), display_name: u.firstName ? `${u.firstName}${u.lastName ? ' ' + u.lastName : ''}` : publicHandle(u), avatar_url: u.imageUrl || null };
    });
  } catch {}
  try {
    const r = await fetch(`${db('user_settings')}?user_id=in.(${unique.join(',')})&select=user_id,nickname`, { headers });
    (await r.json()).forEach?.((row) => { if (row.nickname && map[row.user_id]) map[row.user_id].display_name = row.nickname; });
  } catch {}
  return map;
}

// GET /api/status               → active statuses (24h) from me + people I follow, grouped by person
// GET /api/status?viewers=<id>  → who has seen one of my statuses
export async function GET(req) {
  const { userId } = auth();
  if (!userId) return Response.json({ people: [] });
  const { searchParams } = new URL(req.url);
  const now = new Date().toISOString();

  const viewersOf = searchParams.get('viewers');
  if (viewersOf) {
    const own = await fetch(`${db('statuses')}?id=eq.${viewersOf}&user_id=eq.${userId}&select=id`, { headers }).then((r) => r.json());
    if (!Array.isArray(own) || !own.length) return Response.json({ viewers: [] });
    const rows = await fetch(`${db('status_views')}?status_id=eq.${viewersOf}&order=viewed_at.desc&select=viewer_id,viewed_at`, { headers }).then((r) => r.json());
    const map = await userMap((rows || []).map((r) => r.viewer_id));
    return Response.json({ viewers: (rows || []).map((r) => ({ user_id: r.viewer_id, viewed_at: r.viewed_at, ...(map[r.viewer_id] || { username: 'user' }) })) });
  }

  const follows = await fetch(`${db('follows')}?follower_id=eq.${userId}&select=following_id`, { headers }).then((r) => r.json()).catch(() => []);
  const ids = [userId, ...(Array.isArray(follows) ? follows.map((f) => f.following_id) : [])];
  const [rows, seenRows] = await Promise.all([
    fetch(`${db('statuses')}?user_id=in.(${ids.join(',')})&expires_at=gt.${now}&order=created_at.asc&select=*`, { headers }).then((r) => r.json()).catch(() => []),
    fetch(`${db('status_views')}?viewer_id=eq.${userId}&viewed_at=gt.${new Date(Date.now() - 86400000).toISOString()}&select=status_id`, { headers }).then((r) => r.json()).catch(() => []),
  ]);
  const seen = new Set((Array.isArray(seenRows) ? seenRows : []).map((r) => r.status_id));
  const list = Array.isArray(rows) ? rows : [];

  // view counts for my own statuses
  const mine = list.filter((s) => s.user_id === userId).map((s) => s.id);
  const counts = {};
  if (mine.length) {
    const v = await fetch(`${db('status_views')}?status_id=in.(${mine.join(',')})&select=status_id`, { headers }).then((r) => r.json()).catch(() => []);
    (Array.isArray(v) ? v : []).forEach((r) => { counts[r.status_id] = (counts[r.status_id] || 0) + 1; });
  }

  const map = await userMap([...new Set(list.map((s) => s.user_id))]);
  const byUser = new Map();
  for (const s of list) {
    const g = byUser.get(s.user_id) || { user_id: s.user_id, isSelf: s.user_id === userId, ...(map[s.user_id] || { username: 'user' }), items: [] };
    g.items.push({ id: s.id, kind: s.kind, text: s.text, media_url: s.media_url, bg: s.bg, meta: s.meta, created_at: s.created_at, seen: s.user_id === userId || seen.has(s.id), views: counts[s.id] || 0 });
    byUser.set(s.user_id, g);
  }
  const people = [...byUser.values()].map((g) => ({ ...g, allSeen: g.items.every((i) => i.seen), latest: g.items[g.items.length - 1].created_at }));
  people.sort((a, b) => (a.isSelf ? -1 : b.isSelf ? 1 : a.allSeen - b.allSeen || new Date(b.latest) - new Date(a.latest)));
  return Response.json({ people });
}

// POST /api/status { kind: 'text'|'image'|'video', text, media_url, bg }   → post a status (24h)
// POST /api/status { view: <id> }                                         → mark one as seen
export async function POST(req) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  let body = {};
  try { body = await req.json(); } catch {}

  if (body.view) {
    await fetch(db('status_views'), { method: 'POST', headers: { ...headers, Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ status_id: body.view, viewer_id: userId }) }).catch(() => {});
    return Response.json({ ok: true });
  }

  const kind = ['text', 'image', 'video'].includes(body.kind) ? body.kind : 'text';
  const text = String(body.text || '').trim().slice(0, 700);
  if (kind === 'text' && !text) return Response.json({ error: 'Write something first' }, { status: 400 });
  if (kind !== 'text' && !body.media_url) return Response.json({ error: 'Add a photo or video' }, { status: 400 });
  const row = { user_id: userId, kind, text: text || null, media_url: kind === 'text' ? null : body.media_url, bg: /^#[0-9a-fA-F]{6}$/.test(body.bg || '') ? body.bg : null, meta: body.meta && typeof body.meta === 'object' && !Array.isArray(body.meta) && JSON.stringify(body.meta).length <= 2000 ? body.meta : null };
  const res = await fetch(db('statuses'), { method: 'POST', headers, body: JSON.stringify(row) });
  if (!res.ok) return Response.json({ error: `Could not post (${res.status})` }, { status: 500 });
  const data = await res.json();
  return Response.json({ status: Array.isArray(data) ? data[0] : data });
}

// DELETE /api/status { id }
export async function DELETE(req) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  let id = null;
  try { ({ id } = await req.json()); } catch {}
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
  await fetch(`${db('statuses')}?id=eq.${id}&user_id=eq.${userId}`, { method: 'DELETE', headers });
  return Response.json({ ok: true });
}
