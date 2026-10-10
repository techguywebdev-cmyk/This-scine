import { auth, clerkClient } from '@clerk/nextjs/server';
import { createHmac } from 'crypto';
import { SUPABASE_URL, SUPABASE_KEY, clean } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

const TMDB_KEY = process.env.TMDB_API_KEY;
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
const db = (p) => `${SUPABASE_URL}/rest/v1/${p}`;
const COUNTDOWN_MS = 3600; // both screens count 3-2-1 before the clock (re)starts
const REASONS = { water: '💧 getting water', snacks: '🍿 grabbing snacks', bathroom: '🚻 bathroom break', call: '📞 taking a call', other: '⚡ something came up' };

const channelFor = (id) => `cs-party-${createHmac('sha256', process.env.CALL_CHANNEL_SECRET || SUPABASE_KEY).update(`party:${id}`).digest('base64url').slice(0, 32)}`;
const clockNow = (p, now = Date.now()) => {
  const base = Number(p.clock_offset_ms) || 0;
  if (p.status !== 'playing' || !p.clock_started_at) return base;
  return base + Math.max(0, now - Date.parse(p.clock_started_at));
};

async function load(id) {
  const r = await fetch(`${db('watch_parties')}?id=eq.${id}&select=*`, { headers, cache: 'no-store' });
  const rows = await r.json().catch(() => []);
  return Array.isArray(rows) ? rows[0] || null : null;
}
async function save(id, patch) {
  const r = await fetch(`${db('watch_parties')}?id=eq.${id}`, { method: 'PATCH', headers, body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }) });
  const rows = await r.json().catch(() => []);
  return Array.isArray(rows) ? rows[0] : null;
}
async function people(ids) {
  const out = {};
  try {
    const { data } = await clerkClient.users.getUserList({ userId: ids, limit: ids.length });
    (data || []).forEach((u) => { out[u.id] = { user_id: u.id, username: u.username || u.firstName || 'user', display_name: u.firstName ? `${u.firstName}${u.lastName ? ' ' + u.lastName : ''}` : (u.username || 'Friend'), avatar_url: u.imageUrl || null }; });
  } catch {}
  try {
    const r = await fetch(`${db('user_settings')}?user_id=in.(${ids.join(',')})&select=user_id,nickname`, { headers });
    (await r.json()).forEach?.((row) => { if (row.nickname && out[row.user_id]) out[row.user_id].display_name = row.nickname; });
  } catch {}
  return out;
}
const view = (p, me, folks) => ({
  party: p, me, peer: folks[p.host_id === me ? p.guest_id : p.host_id] || null, self: folks[me] || null,
  serverNow: Date.now(), clockMs: clockNow(p), channel: channelFor(p.id),
});

async function runtimeMin(movie) {
  if (!TMDB_KEY || !movie?.id) return null;
  try {
    const r = await fetch(`https://api.themoviedb.org/3/${movie.is_tv ? 'tv' : 'movie'}/${movie.id}?api_key=${TMDB_KEY}`);
    const d = await r.json();
    return movie.is_tv ? (d.episode_run_time?.[0] || d.last_episode_to_air?.runtime || 45) : (d.runtime || null);
  } catch { return null; }
}

// GET /api/party?id=…  → the room state for one of its two members
export async function GET(req) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const id = clean(new URL(req.url).searchParams.get('id'));
  const p = id && (await load(id));
  if (!p || (p.host_id !== userId && p.guest_id !== userId)) return Response.json({ error: 'Party not found' }, { status: 404 });
  const folks = await people([p.host_id, p.guest_id]);
  return Response.json(view(p, userId, folks), { headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/party { action, ... }
export async function POST(req) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  let body = {};
  try { body = await req.json(); } catch {}
  const action = String(body.action || '');

  if (action === 'create') {
    const guest = clean(body.with);
    const m = body.movie || {};
    if (!guest || guest === userId || !m.id) return Response.json({ error: 'Pick a friend and a film' }, { status: 400 });
    const movie = {
      id: Number(m.id) || m.id, title: String(m.title || '').slice(0, 200), poster: m.poster || null, backdrop: m.backdrop || null,
      year: m.year ? String(m.year).slice(0, 4) : null, rating: m.rating || null, is_tv: !!m.is_tv, accent: m.accent || null,
    };
    movie.runtime_min = await runtimeMin(movie);
    const r = await fetch(db('watch_parties'), { method: 'POST', headers, body: JSON.stringify({ host_id: userId, guest_id: guest, movie, status: 'invited', ready: {} }) });
    const rows = await r.json().catch(() => []);
    const p = Array.isArray(rows) ? rows[0] : null;
    if (!p) return Response.json({ error: 'Could not start the party' }, { status: 500 });
    // invite lands in their chat as a card, plus a push
    const folks = await people([userId, guest]);
    const hostName = (folks[userId]?.display_name || 'A friend').split(' ')[0];
    await fetch(db('messages'), { method: 'POST', headers, body: JSON.stringify({
      from_user_id: userId, to_user_id: guest, text: `🍿 Watch party: ${movie.title}`, read: false, delivered: true, msg_type: 'party',
      meta: { party_id: p.id, id: movie.id, title: movie.title, poster: movie.poster, backdrop: movie.backdrop, year: movie.year, type: movie.is_tv ? 'tv' : 'movie' },
    }) }).catch(() => {});
    try {
      const notify = await import('@/lib/notify');
      await notify.pushUser({ userId: guest, category: 'messages', title: `${hostName} wants to watch with you 🍿`, body: `${movie.title} — tap to join the watch party`, url: `/?party=${p.id}`, tag: `party-${p.id}` });
    } catch {}
    return Response.json(view(p, userId, folks));
  }

  const id = clean(body.id);
  const p = id && (await load(id));
  if (!p || (p.host_id !== userId && p.guest_id !== userId)) return Response.json({ error: 'Party not found' }, { status: 404 });
  if (p.status === 'ended' && action !== 'get') return Response.json({ error: 'This watch party has ended' }, { status: 409 });
  const now = Date.now();
  let patch = null;

  if (action === 'join') {
    if (p.status === 'invited' || p.status === 'declined') patch = { status: 'lobby' };
  } else if (action === 'decline') {
    if (p.guest_id === userId && p.status === 'invited') patch = { status: 'declined' };
  } else if (action === 'ready') {
    const ready = { ...(p.ready || {}), [userId]: body.ready !== false };
    patch = { ready };
    const bothReady = ready[p.host_id] && ready[p.guest_id];
    if (bothReady && (p.status === 'lobby' || p.status === 'invited')) {
      patch.status = 'playing';
      patch.clock_offset_ms = 0;
      patch.clock_started_at = new Date(now + COUNTDOWN_MS).toISOString();
    }
  } else if (action === 'pause') {
    if (p.status === 'playing') patch = { status: 'paused', clock_offset_ms: Math.round(clockNow(p, now)), clock_started_at: null, paused_by: userId, pause_reason: REASONS[body.reason] ? body.reason : 'other' };
  } else if (action === 'resume') {
    if (p.status === 'paused') patch = { status: 'playing', clock_started_at: new Date(now + COUNTDOWN_MS).toISOString(), paused_by: null, pause_reason: null };
  } else if (action === 'seek') {
    const delta = Math.max(-600000, Math.min(600000, Number(body.deltaMs) || 0));
    const at = Math.max(0, Math.round(clockNow(p, now) + delta));
    patch = p.status === 'playing'
      ? { clock_offset_ms: at, clock_started_at: new Date(now).toISOString() }
      : { clock_offset_ms: at };
  } else if (action === 'end') {
    patch = { status: 'ended', ended_at: new Date(now).toISOString(), clock_offset_ms: Math.round(clockNow(p, now)), clock_started_at: null };
    // finishing together marks the title watched for both
    const m = p.movie || {};
    const row = (uid) => ({ user_id: uid, movie_id: m.id, title: m.title, year: m.year || '', rating: m.rating || 'N/A', poster: m.poster, backdrop: m.backdrop, genre: [], overview: '', accent: m.accent || '#F5A623', gradient: '', is_tv: !!m.is_tv, watched: true, saved_at: now });
    await fetch(`${db('watchlist')}?on_conflict=user_id,movie_id`, { method: 'POST', headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([row(p.host_id), row(p.guest_id)]) }).catch(() => {});
  } else {
    return Response.json({ error: 'Unknown action' }, { status: 400 });
  }

  const next = patch ? (await save(p.id, patch)) || { ...p, ...patch } : p;
  const folks = await people([p.host_id, p.guest_id]);
  return Response.json(view(next, userId, folks));
}
