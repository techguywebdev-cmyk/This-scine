import { auth } from '@clerk/nextjs/server';
import { SUPABASE_URL, SUPABASE_KEY, clean } from '@/lib/db';

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
  const peer = clean(new URL(req.url).searchParams.get('with'));
  if (!peer || peer === userId) return Response.json({ error: 'Pick a friend' }, { status: 400 });

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
