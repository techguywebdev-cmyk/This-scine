import { auth } from '@clerk/nextjs/server';

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dmZpaG96eHlib2lya2FpeHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjYxMDEsImV4cCI6MjA5NTY0MjEwMX0.y6zfENBPd6iJvFEf5-nRFeiWvVTzlDMAkNLr4CGfsGc';

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
  const { movieId } = await request.json();
  await fetch(`${db('watchlist')}?user_id=eq.${userId}&movie_id=eq.${movieId}`, {
    method: 'DELETE', headers,
  });
  return Response.json({ success: true });
}

export async function PATCH(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { movieId, watched } = await request.json();
  await fetch(`${db('watchlist')}?user_id=eq.${userId}&movie_id=eq.${movieId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ watched }),
  });
  return Response.json({ success: true });
}
