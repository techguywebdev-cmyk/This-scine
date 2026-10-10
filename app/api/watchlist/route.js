import { auth } from '@clerk/nextjs/server';
import { SUPABASE_KEY, clean } from '@/lib/db';

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
  const { movieId: rawMovieId, watched } = await request.json(); const movieId = clean(rawMovieId);
  await fetch(`${db('watchlist')}?user_id=eq.${userId}&movie_id=eq.${movieId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ watched }),
  });
  return Response.json({ success: true });
}
