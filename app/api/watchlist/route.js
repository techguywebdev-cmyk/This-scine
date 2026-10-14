import { auth } from '@clerk/nextjs/server';
import { SUPABASE_KEY, clean } from '@/lib/db';
import { pushUser } from '@/lib/notify';
import { blockState } from '@/lib/blocks';
import { clerkClient } from '@clerk/nextjs/server';

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';

const db = (path) => `${SUPABASE_URL}/rest/v1/${path}`;
const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

export async function GET() {
  const { userId } = auth();
  if (!userId) return Response.json({ items: [] });
  const res = await fetch(`${db('watchlist')}?user_id=eq.${userId}&order=saved_at.desc`, { headers });
  const data = await res.json();
  return Response.json({ items: Array.isArray(data) ? data : [] });
}

export async function POST(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const movie = await request.json();
  // Bulk: { items: [movie…], watched: true } — used by onboarding picks
  if (Array.isArray(movie?.items)) {
    const now = Date.now();
    const rows = movie.items.slice(0, 40).filter((m) => m && Number.isFinite(Number(m.id))).map((m, i) => ({
      user_id: userId, movie_id: Number(m.id), title: String(m.title || '').slice(0, 300), year: String(m.year || '').slice(0, 8),
      rating: m.rating ?? null, poster: m.poster || null, backdrop: m.backdrop || null,
      genre: Array.isArray(m.genre) ? m.genre.slice(0, 4) : [], overview: String(m.overview || '').slice(0, 600),
      accent: /^#[0-9a-fA-F]{6}$/.test(m.accent || '') ? m.accent : '#F5A623', gradient: String(m.gradient || '').slice(0, 300),
      is_tv: !!(m.isTV || m.is_tv), watched: !!movie.watched, saved_at: now - i,
    }));
    if (!rows.length) return Response.json({ success: true, count: 0 });
    const r = await fetch(`${db('watchlist')}?on_conflict=user_id,movie_id`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows),
    });
    if (!r.ok) return Response.json({ error: 'Could not save' }, { status: 500 });
    return Response.json({ success: true, count: rows.length });
  }
  const res = await fetch(db('watchlist'), {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      user_id: userId,
      movie_id: movie.id,
      title: movie.title,
      year: movie.year,
      rating: movie.rating,
      poster: movie.poster || null,
      backdrop: movie.backdrop || null,
      genre: movie.genre || [],
      overview: movie.overview || '',
      accent: movie.accent || '#F5A623',
      gradient: movie.gradient || '',
      is_tv: movie.isTV || false,
      watched: false,
      saved_at: Date.now(),
    }),
  });
  const data = await res.json();
  return Response.json({ success: true, data });
}

export async function DELETE(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const movieId = clean((await request.json()).movieId);
  await fetch(`${db('watchlist')}?user_id=eq.${userId}&movie_id=eq.${movieId}`, {
    method: 'DELETE', headers,
  });
  return Response.json({ success: true });
}

export async function PATCH(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json(); const movieId = clean(body.movieId);
  const patch = {};
  if (typeof body.watched === 'boolean') { patch.watched = body.watched; if (body.watched) patch.remind_at = null; }
  // "Remind me to watch": remindAt = ISO time (next 5 min … 1 year) or null to cancel
  if ('remindAt' in body) {
    if (body.remindAt === null) patch.remind_at = null;
    else {
      const t = Date.parse(body.remindAt);
      if (!Number.isFinite(t) || t < Date.now() - 60000 || t > Date.now() + 366 * 86400000) return Response.json({ error: 'Pick a time in the future' }, { status: 400 });
      patch.remind_at = new Date(t).toISOString(); patch.reminded_at = null;
    }
  }
  // Watch it with a friend: someone you follow, who gets a heads-up now and the reminder too
  let friend = null;
  if ('remindWith' in body) {
    const fid = body.remindWith ? clean(body.remindWith) : null;
    if (fid) {
      if (fid === userId) return Response.json({ error: 'Pick a friend' }, { status: 400 });
      const f = await fetch(`${db('follows')}?follower_id=eq.${userId}&following_id=eq.${fid}&select=following_id`, { headers }).then((x) => x.json()).catch(() => []);
      if (!Array.isArray(f) || !f.length) return Response.json({ error: 'You can only invite people you follow' }, { status: 403 });
      const b = await blockState(userId, fid).catch(() => null);
      if (b) return Response.json({ error: 'You can’t invite this person' }, { status: 403 });
      friend = fid;
    }
    patch.remind_with = fid;
  }
  if ('note' in body) patch.remind_note = body.note ? String(body.note).slice(0, 80) : null;
  if (patch.remind_at === null && !('remindWith' in body)) patch.remind_with = null;
  if (!movieId || !Object.keys(patch).length) return Response.json({ error: 'Nothing to update' }, { status: 400 });
  const r = await fetch(`${db('watchlist')}?user_id=eq.${userId}&movie_id=eq.${movieId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(patch),
  });
  const rows = await r.json().catch(() => []);
  if (!r.ok) return Response.json({ error: 'Could not update' }, { status: 500 });
  // Nothing matched: the title isn't in their list yet (e.g. save still in flight)
  let row = Array.isArray(rows) ? rows[0] || null : null;
  if (Array.isArray(rows) && !rows.length) {
    // Setting a reminder on something not saved yet (or whose save is still in flight): save it now with the reminder
    const m = body.movie && typeof body.movie === 'object' ? body.movie : null;
    if (!m || !patch.remind_at) return Response.json({ error: 'Save this title first', code: 'not_saved' }, { status: 404 });
    const ins = await fetch(`${db('watchlist')}?on_conflict=user_id,movie_id`, {
      method: 'POST', headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        user_id: userId, movie_id: Number(movieId), title: String(m.title || '').slice(0, 300), year: String(m.year || '').slice(0, 8),
        rating: m.rating ?? null, poster: m.poster || null, backdrop: m.backdrop || null, genre: Array.isArray(m.genre) ? m.genre.slice(0, 4) : [],
        overview: String(m.overview || '').slice(0, 600), accent: /^#[0-9a-fA-F]{6}$/.test(m.accent || '') ? m.accent : '#F5A623', gradient: '',
        is_tv: !!(m.isTV || m.is_tv), watched: false, saved_at: Date.now(), ...patch,
      }),
    });
    const got = await ins.json().catch(() => []);
    if (!ins.ok) return Response.json({ error: 'Could not set the reminder' }, { status: 500 });
    row = Array.isArray(got) ? got[0] || null : null;
  }
  if (friend && row?.remind_at) {
    let name = 'A friend';
    try { const u = await clerkClient.users.getUser(userId); name = u.firstName || u.username || name; } catch {}
    const when = typeof body.whenLabel === 'string' ? body.whenLabel.slice(0, 40) : '';
    await pushUser({
      userId: friend, category: 'activity',
      title: `${name} wants to watch ${row.title} with you`,
      body: `${when ? `${when} · ` : ''}Tap to see it — we’ll remind you both.`,
      url: `/?m=${row.is_tv ? 'tv' : 'movie'}-${row.movie_id}`, tag: `with-${userId}-${row.movie_id}`,
    }).catch(() => {});
  }
  return Response.json({ success: true, item: row });
}
