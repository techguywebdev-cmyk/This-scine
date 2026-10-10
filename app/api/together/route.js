import { auth, clerkClient } from '@clerk/nextjs/server';
import { SUPABASE_URL, SUPABASE_KEY, clean } from '@/lib/db';
import { blockState, blockedIds, blockedResponse } from '@/lib/blocks';

export const dynamic = 'force-dynamic';
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
const db = (p) => `${SUPABASE_URL}/rest/v1/${p}`;
const COLS = 'movie_id,title,year,rating,poster,backdrop,genre,overview,accent,is_tv,watched,saved_at';

// GET /api/together?with=<userId>
// → { both: titles you both want to watch, theySaw: on your list & they've watched it, youSaw: the reverse }
// A private watchlist is only used when you follow each other.
export async function GET(req) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  // GET /api/together?movie=<id> → people you follow, best match first ("also saved it" respects private watchlists)
  const movieId = clean(sp.get('movie'));
  if (movieId) {
    const [fol, back] = await Promise.all([
      fetch(`${db('follows')}?follower_id=eq.${userId}&select=following_id`, { headers }).then((r) => r.json()).catch(() => []),
      fetch(`${db('follows')}?following_id=eq.${userId}&select=follower_id`, { headers }).then((r) => r.json()).catch(() => []),
    ]);
    const ids = [...new Set((Array.isArray(fol) ? fol : []).map((f) => f.following_id).filter(Boolean))].slice(0, 200);
    if (!ids.length) return Response.json({ friends: [] });
    const mutual = new Set((Array.isArray(back) ? back : []).map((f) => f.follower_id));
    const [saved, settings] = await Promise.all([
      fetch(`${db('watchlist')}?movie_id=eq.${movieId}&user_id=in.(${ids.join(',')})&select=user_id,watched`, { headers }).then((r) => r.json()).catch(() => []),
      fetch(`${db('user_settings')}?user_id=in.(${ids.join(',')})&select=user_id,watchlist_public,nickname`, { headers }).then((r) => r.json()).catch(() => []),
    ]);
    const priv = new Set(); const nick = {};
    (Array.isArray(settings) ? settings : []).forEach((r) => { if (r.watchlist_public === false) priv.add(r.user_id); if (r.nickname) nick[r.user_id] = r.nickname; });
    const savedMap = {};
    (Array.isArray(saved) ? saved : []).forEach((r) => { if (!priv.has(r.user_id) || mutual.has(r.user_id)) savedMap[r.user_id] = r.watched ? 'watched' : 'saved'; });
    let users = [];
    try {
      const { data } = await clerkClient.users.getUserList({ userId: ids, limit: ids.length });
      users = (data || []).map((u) => ({ user_id: u.id, username: u.username || u.firstName || 'user', display_name: nick[u.id] || (u.firstName ? `${u.firstName}${u.lastName ? ' ' + u.lastName : ''}` : (u.username || 'Friend')), avatar_url: u.imageUrl || null, alsoSaved: savedMap[u.id] === 'saved', alsoWatched: savedMap[u.id] === 'watched', mutual: mutual.has(u.id) }));
    } catch {}
    users.sort((a, b) => (b.alsoSaved - a.alsoSaved) || (b.mutual - a.mutual) || a.display_name.localeCompare(b.display_name));
    return Response.json({ friends: users }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const peer = clean(sp.get('with'));
  if (!peer || peer === userId) return Response.json({ error: 'Pick a friend' }, { status: 400 });
  if (await blockState(userId, peer)) return blockedResponse();

  const [settings, mine, theirs, a, b] = await Promise.all([
    fetch(`${db('user_settings')}?user_id=eq.${peer}&select=watchlist_public`, { headers }).then((r) => r.json()).catch(() => []),
    fetch(`${db('watchlist')}?user_id=eq.${userId}&select=${COLS}`, { headers }).then((r) => r.json()).catch(() => []),
    fetch(`${db('watchlist')}?user_id=eq.${peer}&select=${COLS}`, { headers }).then((r) => r.json()).catch(() => []),
    fetch(`${db('follows')}?follower_id=eq.${userId}&following_id=eq.${peer}&select=follower_id`, { headers }).then((r) => r.json()).catch(() => []),
    fetch(`${db('follows')}?follower_id=eq.${peer}&following_id=eq.${userId}&select=follower_id`, { headers }).then((r) => r.json()).catch(() => []),
  ]);
  const isPublic = Array.isArray(settings) && settings[0] ? settings[0].watchlist_public !== false : true;
  const mutual = Array.isArray(a) && a.length > 0 && Array.isArray(b) && b.length > 0;
  if (!isPublic && !mutual) return Response.json({ private: true, both: [], theySaw: [], youSaw: [] });

  const mineMap = new Map((Array.isArray(mine) ? mine : []).map((m) => [String(m.movie_id), m]));
  const both = [], theySaw = [], youSaw = [];
  for (const t of Array.isArray(theirs) ? theirs : []) {
    const m = mineMap.get(String(t.movie_id));
    if (!m) continue;
    if (!m.watched && !t.watched) both.push({ ...m, theirSavedAt: t.saved_at });
    else if (!m.watched && t.watched) theySaw.push(m);
    else if (m.watched && !t.watched) youSaw.push(m);
  }
  const score = (x) => (parseFloat(x.rating) || 0) + Math.min(1, ((Date.now() - Math.min(x.saved_at || 0, x.theirSavedAt || x.saved_at || 0)) / 864e5) / 90) * 0.5;
  both.sort((x, y) => score(y) - score(x));
  return Response.json({ both, theySaw: theySaw.slice(0, 24), youSaw: youSaw.slice(0, 24), mutual }, { headers: { 'Cache-Control': 'no-store' } });
}
