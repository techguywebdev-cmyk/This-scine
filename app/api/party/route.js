import { auth, clerkClient } from '@clerk/nextjs/server';
import { createHmac } from 'crypto';
import { SUPABASE_URL, SUPABASE_KEY, clean } from '@/lib/db';
import { blockState, blockedIds, blockedResponse } from '@/lib/blocks';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

const TMDB_KEY = process.env.TMDB_API_KEY;
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
const db = (p) => `${SUPABASE_URL}/rest/v1/${p}`;
const COUNTDOWN_MS = 3600; // both screens count 3-2-1 before the clock (re)starts
const REASONS = { water: '💧 getting water', snacks: '🍿 grabbing snacks', bathroom: '🚻 bathroom break', call: '📞 taking a call', other: '⚡ something came up' };
const EMOJI = ['😂', '😱', '😭', '🔥', '❤️', '👀'];

const INVITE_TTL_MS = 3 * 3600 * 1000;   // unanswered invites expire after 3 hours…
const LOBBY_EARLY_MS = 10 * 60 * 1000;   // …scheduled rooms open 10 minutes early
const OPEN = ['invited', 'accepted', 'lobby', 'playing', 'paused'];
// Invites (and accepted scheduled parties) expire 3h after they were sent — or 3h after the scheduled time
const effective = (p) => {
  if (!p || (p.status !== 'invited' && p.status !== 'accepted')) return p;
  const anchor = p.scheduled_for ? Date.parse(p.scheduled_for) : Date.parse(p.updated_at || p.created_at);
  return Date.now() - anchor > INVITE_TTL_MS ? { ...p, status: 'expired' } : p;
};
const tooEarly = (p, now = Date.now()) => !!p.scheduled_for && Date.parse(p.scheduled_for) - now > LOBBY_EARLY_MS;
async function pushTo(userId, title, body, url, tag) {
  try { const notify = await import('@/lib/notify'); await notify.pushUser({ userId, category: 'messages', title, body, url, tag }); } catch {}
}
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
  const uniq = [...new Set(ids.filter(Boolean))];
  if (!uniq.length) return out;
  try {
    const { data } = await clerkClient.users.getUserList({ userId: uniq, limit: uniq.length });
    (data || []).forEach((u) => { out[u.id] = { user_id: u.id, username: u.username || u.firstName || 'user', display_name: u.firstName ? `${u.firstName}${u.lastName ? ' ' + u.lastName : ''}` : (u.username || 'Friend'), avatar_url: u.imageUrl || null }; });
  } catch {}
  try {
    const r = await fetch(`${db('user_settings')}?user_id=in.(${uniq.join(',')})&select=user_id,nickname`, { headers });
    (await r.json()).forEach?.((row) => { if (row.nickname && out[row.user_id]) out[row.user_id].display_name = row.nickname; });
  } catch {}
  return out;
}
const firstName = (u, fallback) => { const n = String(u?.display_name || fallback || 'A friend').trim(); const w = n.split(/\s+/)[0]; return w.length <= 3 && n.length > w.length ? n : w; };
const view = (p0, me, folks) => { const p = effective(p0); return ({
  party: p, me, peer: folks[p.host_id === me ? p.guest_id : p.host_id] || null, self: folks[me] || null,
  serverNow: Date.now(), clockMs: clockNow(p), channel: channelFor(p.id),
}); };

async function runtimeMin(movie) {
  if (!TMDB_KEY || !movie?.id) return null;
  try {
    const r = await fetch(`https://api.themoviedb.org/3/${movie.is_tv ? 'tv' : 'movie'}/${movie.id}?api_key=${TMDB_KEY}`);
    const d = await r.json();
    return movie.is_tv ? (d.episode_run_time?.[0] || d.last_episode_to_air?.runtime || 45) : (d.runtime || null);
  } catch { return null; }
}

export async function GET(req) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const sp = new URL(req.url).searchParams;

  // ?pending=1 → invites waiting for my answer (newest first)
  if (sp.get('pending')) {
    const r = await fetch(`${db('watch_parties')}?guest_id=eq.${userId}&status=eq.invited&order=updated_at.desc&limit=10&select=*`, { headers, cache: 'no-store' });
    const rows = await r.json().catch(() => []);
    const list = (Array.isArray(rows) ? rows : []).map(effective).filter((x) => x.status === 'invited').slice(0, 5);
    const folks = await people(list.map((x) => x.host_id));
    return Response.json({ pending: list.map((x) => ({ id: x.id, movie: x.movie, scheduled_for: x.scheduled_for, host: folks[x.host_id] || { user_id: x.host_id, display_name: 'A friend' }, updated_at: x.updated_at })) }, { headers: { 'Cache-Control': 'no-store' } });
  }
  // ?upcoming=1 → my accepted / invited scheduled parties still ahead
  if (sp.get('upcoming')) {
    const since = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    const r = await fetch(`${db('watch_parties')}?or=(host_id.eq.${userId},guest_id.eq.${userId})&status=in.(invited,accepted)&scheduled_for=gt.${since}&order=scheduled_for.asc&limit=10&select=*`, { headers, cache: 'no-store' });
    const rows = await r.json().catch(() => []);
    const list = (Array.isArray(rows) ? rows : []).map(effective).filter((x) => x.status !== 'expired');
    const folks = await people(list.flatMap((x) => [x.host_id, x.guest_id]));
    return Response.json({ upcoming: list.map((x) => ({ id: x.id, movie: x.movie, status: x.status, scheduled_for: x.scheduled_for, isHost: x.host_id === userId, peer: folks[x.host_id === userId ? x.guest_id : x.host_id] || null })) }, { headers: { 'Cache-Control': 'no-store' } });
  }
  // ?statuses=id1,id2 → live status (+ time) for chat cards
  if (sp.get('statuses')) {
    const ids = sp.get('statuses').split(',').map(clean).filter(Boolean).slice(0, 40);
    if (!ids.length) return Response.json({ statuses: {} });
    const r = await fetch(`${db('watch_parties')}?id=in.(${ids.join(',')})&or=(host_id.eq.${userId},guest_id.eq.${userId})&select=id,status,updated_at,created_at,scheduled_for`, { headers, cache: 'no-store' });
    const rows = await r.json().catch(() => []);
    const out = {};
    (Array.isArray(rows) ? rows : []).forEach((x) => { const e = effective(x); out[x.id] = { status: e.status, at: x.scheduled_for || null }; });
    return Response.json({ statuses: out }, { headers: { 'Cache-Control': 'no-store' } });
  }
  // ?history=<userId|me> → finished parties (with that friend, or all of mine)
  if (sp.get('history')) {
    const target = sp.get('history') === 'me' ? userId : clean(sp.get('history'));
    const who = target === userId ? `or=(host_id.eq.${userId},guest_id.eq.${userId})` : `or=(and(host_id.eq.${userId},guest_id.eq.${target}),and(host_id.eq.${target},guest_id.eq.${userId}))`;
    const r = await fetch(`${db('watch_parties')}?${who}&status=eq.ended&clock_offset_ms=gt.300000&order=ended_at.desc&limit=24&select=id,host_id,guest_id,movie,ended_at,recap`, { headers, cache: 'no-store' });
    const rows = await r.json().catch(() => []);
    const list = Array.isArray(rows) ? rows : [];
    const folks = await people(list.map((x) => (x.host_id === userId ? x.guest_id : x.host_id)));
    return Response.json({ history: list.map((x) => { const other = x.host_id === userId ? x.guest_id : x.host_id; return { id: x.id, movie: x.movie, ended_at: x.ended_at, peer: folks[other] || null, myRating: x.recap?.ratings?.[userId] || null, theirRating: x.recap?.ratings?.[other] || null }; }) }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const id = clean(sp.get('id'));
  const p = id && (await load(id));
  if (!p || (p.host_id !== userId && p.guest_id !== userId)) return Response.json({ error: 'Party not found' }, { status: 404 });
  const folks = await people([p.host_id, p.guest_id]);
  return Response.json(view(p, userId, folks), { headers: { 'Cache-Control': 'no-store' } });
}

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
    if (await blockState(userId, guest)) return blockedResponse();
    let scheduledFor = null;
    if (body.scheduledFor) {
      const t = Date.parse(body.scheduledFor);
      if (!t || t < Date.now() + 5 * 60000 || t > Date.now() + 14 * 864e5) return Response.json({ error: 'Pick a time between 5 minutes and 2 weeks from now' }, { status: 400 });
      scheduledFor = new Date(t).toISOString();
    }
    const whenLabel = scheduledFor ? String(body.whenLabel || '').slice(0, 40) : '';
    const movie = {
      id: Number(m.id) || m.id, title: String(m.title || '').slice(0, 200), poster: m.poster || null, backdrop: m.backdrop || null,
      year: m.year ? String(m.year).slice(0, 4) : null, rating: m.rating || null, is_tv: !!m.is_tv, accent: m.accent || null, when_label: whenLabel || null,
    };
    // One open party per pair: reuse it instead of stacking duplicates
    const pair = `or=(and(host_id.eq.${userId},guest_id.eq.${guest}),and(host_id.eq.${guest},guest_id.eq.${userId}))`;
    const ex = await fetch(`${db('watch_parties')}?${pair}&status=in.(${OPEN.join(',')})&order=updated_at.desc&limit=1&select=*`, { headers, cache: 'no-store' }).then((x) => x.json()).catch(() => []);
    const open = Array.isArray(ex) && ex[0] ? effective(ex[0]) : null;
    if (open && (open.status === 'playing' || open.status === 'paused')) return Response.json(view(open, userId, await people([userId, guest])));
    movie.runtime_min = await runtimeMin(movie);
    const fresh = { movie, host_id: userId, guest_id: guest, status: 'invited', ready: {}, clock_offset_ms: 0, clock_started_at: null, paused_by: null, pause_reason: null, scheduled_for: scheduledFor, reminded_soon: false, reminded_start: false, recap: {} };
    let p = null;
    if (open && open.status !== 'expired') p = await save(open.id, fresh);
    else {
      if (open && open.status === 'expired') await save(open.id, { status: 'expired' });
      const r = await fetch(db('watch_parties'), { method: 'POST', headers, body: JSON.stringify(fresh) });
      const rows = await r.json().catch(() => []);
      p = Array.isArray(rows) ? rows[0] : null;
    }
    if (!p) return Response.json({ error: 'Could not start the party' }, { status: 500 });
    const folks = await people([userId, guest]);
    const hostName = firstName(folks[userId]);
    await fetch(db('messages'), { method: 'POST', headers, body: JSON.stringify({
      from_user_id: userId, to_user_id: guest, text: scheduledFor ? `🍿 Watch party${whenLabel ? ` · ${whenLabel}` : ''}: ${movie.title}` : `🍿 Watch party: ${movie.title}`, read: false, delivered: true, msg_type: 'party',
      meta: { party_id: p.id, id: movie.id, title: movie.title, poster: movie.poster, backdrop: movie.backdrop, year: movie.year, type: movie.is_tv ? 'tv' : 'movie', scheduled_for: scheduledFor, when_label: whenLabel || null },
    }) }).catch(() => {});
    await pushTo(guest, scheduledFor ? `${hostName} invited you to a watch party 🍿` : `${hostName} wants to watch with you 🍿`, scheduledFor ? `${movie.title}${whenLabel ? ` · ${whenLabel}` : ''} — tap to say you’re in` : `${movie.title} — tap to join the watch party`, `/?party=${p.id}`, `party-${p.id}`);
    return Response.json(view(p, userId, folks));
  }

  const id = clean(body.id);
  const p = id && (await load(id));
  if (!p || (p.host_id !== userId && p.guest_id !== userId)) return Response.json({ error: 'Party not found' }, { status: 404 });
  if (p.status === 'ended' && action !== 'rate') return Response.json({ error: 'This watch party has ended' }, { status: 409 });
  const now = Date.now();
  const eff = effective(p);
  if (eff.status === 'expired' && action !== 'cancel') return Response.json({ error: 'This invite has expired — start a new one' }, { status: 409 });
  let patch = null;
  let notifyHost = null;

  if (action === 'join') {
    if (p.status === 'invited' || p.status === 'declined' || p.status === 'accepted') {
      if (tooEarly(p, now)) { if (p.status !== 'accepted') { patch = { status: 'accepted' }; if (userId === p.guest_id) notifyHost = 'accepted'; } }
      else { patch = { status: 'lobby' }; if (userId === p.guest_id && p.status === 'invited') notifyHost = 'joined'; }
    }
  } else if (action === 'decline') {
    if (p.guest_id === userId && (p.status === 'invited' || p.status === 'accepted')) { patch = { status: 'declined' }; notifyHost = 'declined'; }
  } else if (action === 'cancel') {
    if (p.host_id === userId && ['invited', 'accepted', 'lobby'].includes(p.status)) patch = { status: 'ended', ended_at: new Date(now).toISOString() };
  } else if (action === 'ready') {
    if (tooEarly(p, now)) return Response.json({ error: 'The room opens 10 minutes before start' }, { status: 409 });
    const ready = { ...(p.ready || {}), [userId]: body.ready !== false };
    patch = { ready };
    if (p.status === 'invited' || p.status === 'accepted') patch.status = 'lobby';
    if (ready[p.host_id] && ready[p.guest_id] && ['lobby', 'invited', 'accepted'].includes(p.status)) {
      patch.status = 'playing'; patch.clock_offset_ms = 0; patch.clock_started_at = new Date(now + COUNTDOWN_MS).toISOString();
    }
  } else if (action === 'pause') {
    if (p.status === 'playing') patch = { status: 'paused', clock_offset_ms: Math.round(clockNow(p, now)), clock_started_at: null, paused_by: userId, pause_reason: REASONS[body.reason] ? body.reason : 'other' };
  } else if (action === 'resume') {
    if (p.status === 'paused') patch = { status: 'playing', clock_started_at: new Date(now + COUNTDOWN_MS).toISOString(), paused_by: null, pause_reason: null };
  } else if (action === 'seek') {
    const delta = Math.max(-600000, Math.min(600000, Number(body.deltaMs) || 0));
    const at = Math.max(0, Math.round(clockNow(p, now) + delta));
    patch = p.status === 'playing' ? { clock_offset_ms: at, clock_started_at: new Date(now).toISOString() } : { clock_offset_ms: at };
  } else if (action === 'end') {
    patch = { status: 'ended', ended_at: new Date(now).toISOString(), clock_offset_ms: Math.round(clockNow(p, now)), clock_started_at: null };
    const m = p.movie || {};
    const row = (uid) => ({ user_id: uid, movie_id: m.id, title: m.title, year: m.year || '', rating: m.rating || 'N/A', poster: m.poster, backdrop: m.backdrop, genre: [], overview: '', accent: m.accent || '#F5A623', gradient: '', is_tv: !!m.is_tv, watched: true, saved_at: now });
    await fetch(`${db('watchlist')}?on_conflict=user_id,movie_id`, { method: 'POST', headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([row(p.host_id), row(p.guest_id)]) }).catch(() => {});
  } else if (action === 'rate') {
    // after finishing: my rating (1–5) + the reactions I sent, merged into the shared recap
    const rating = Math.max(1, Math.min(5, Math.round(Number(body.rating) || 0)));
    const mine = {};
    Object.entries(body.reactions || {}).forEach(([e, n]) => { if (EMOJI.includes(e)) mine[e] = Math.max(0, Math.min(999, Math.round(Number(n) || 0))); });
    const recap = p.recap && typeof p.recap === 'object' ? p.recap : {};
    patch = { recap: { ...recap, ratings: { ...(recap.ratings || {}), [userId]: rating }, reactions: { ...(recap.reactions || {}), [userId]: mine } } };
  } else {
    return Response.json({ error: 'Unknown action' }, { status: 400 });
  }

  const next = patch ? (await save(p.id, patch)) || { ...p, ...patch } : p;
  const folks = await people([p.host_id, p.guest_id]);
  if (notifyHost) {
    const who = firstName(folks[userId], 'Your friend');
    const t = p.movie?.title || 'the film';
    const when = p.movie?.when_label ? ` · ${p.movie.when_label}` : '';
    if (notifyHost === 'joined') await pushTo(p.host_id, `${who} joined your watch party 🍿`, `${t} — tap to get ready together`, `/?party=${p.id}`, `party-${p.id}`);
    else if (notifyHost === 'accepted') await pushTo(p.host_id, `${who} is in 🍿`, `${t}${when}`, `/?party=${p.id}`, `party-${p.id}`);
    else await pushTo(p.host_id, `${who} can’t make it`, `Your ${t} watch party`, `/?chat=${userId}`, `party-${p.id}`);
  }
  return Response.json(view(next, userId, folks));
}
