import { auth } from '@clerk/nextjs/server';

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dmZpaG96eHlib2lya2FpeHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjYxMDEsImV4cCI6MjA5NTY0MjEwMX0.y6zfENBPd6iJvFEf5-nRFeiWvVTzlDMAkNLr4CGfsGc';
const db = (path) => `\( {SUPABASE_URL}/rest/v1/ \){path}`;
const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

export async function POST(req, { params }) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = params;
  try {
    const listRes = await fetch(`\( {db('community_lists')}?id=eq. \){id}&user_id=eq.${userId}&select=id`, {
      headers: { ...headers, Prefer: 'return=representation' },
    });
    const listRows = await listRes.json();
    if (!Array.isArray(listRows) || !listRows.length)
      return Response.json({ error: 'List not found or not yours' }, { status: 403 });

    const { movie } = await req.json();
    if (!movie?.id) return Response.json({ error: 'Missing movie' }, { status: 400 });

    const res = await fetch(db('community_list_movies'), {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify({
        list_id: id,
        movie_id: movie.id,
        movie_title: movie.title,
        movie_poster: movie.poster,
        movie_year: movie.year,
        movie_rating: movie.rating,
        movie_accent: movie.accent,
        is_tv: movie.isTV || false,
      }),
    });
    if (!res.ok && res.status !== 204) {
      const errText = await res.text();
      return Response.json({ error: `DB error: ${errText.slice(0, 200)}` }, { status: 500 });
    }

    await fetch(`\( {db('community_lists')}?id=eq. \){id}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ updated_at: new Date().toISOString() }),
    });
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message || 'Failed to add movie' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = params;
  try {
    const listRes = await fetch(`\( {db('community_lists')}?id=eq. \){id}&user_id=eq.${userId}&select=id`, {
      headers: { ...headers, Prefer: 'return=representation' },
    });
    const listRows = await listRes.json();
    if (!Array.isArray(listRows) || !listRows.length)
      return Response.json({ error: 'Not yours' }, { status: 403 });

    const { movieId } = await req.json();
    await fetch(`\( {db('community_list_movies')}?list_id=eq. \){id}&movie_id=eq.${movieId}`, {
      method: 'DELETE',
      headers,
    });
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: 'Failed to remove movie' }, { status: 500 });
  }
      }
