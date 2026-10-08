import { auth } from '@clerk/nextjs/server';

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dmZpaG96eHlib2lya2FpeHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjYxMDEsImV4cCI6MjA5NTY0MjEwMX0.y6zfENBPd6iJvFEf5-nRFeiWvVTzlDMAkNLr4CGfsGc';

const db = (path) => `${SUPABASE_URL}/rest/v1/${path}`;
const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

// GET /api/reminders -> my active reminders
export async function GET() {
  const { userId } = auth();
  if (!userId) return Response.json({ items: [] });
  try {
    const res = await fetch(
      `${db('reminders')}?user_id=eq.${userId}&order=release_date.asc&select=id,movie_id,media_type,title,poster,release_date,notified,created_at`,
      { headers }
    );
    const rows = await res.json();
    return Response.json({ items: Array.isArray(rows) ? rows : [] });
  } catch (err) {
    console.error('GET /api/reminders error:', err);
    return Response.json({ items: [] });
  }
}

// POST /api/reminders { movieId, mediaType, title, poster, releaseDate }
export async function POST(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { movieId, mediaType = 'movie', title, poster, releaseDate } = await request.json();
    if (!movieId || !releaseDate) {
      return Response.json({ error: 'movieId and releaseDate are required' }, { status: 400 });
    }
    const today = new Date().toISOString().slice(0, 10);
    if (releaseDate <= today) {
      return Response.json({ error: 'This title is already out' }, { status: 400 });
    }
    const res = await fetch(`${db('reminders')}?on_conflict=user_id,movie_id,media_type`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        user_id: userId,
        movie_id: movieId,
        media_type: mediaType,
        title: title || null,
        poster: poster || null,
        release_date: releaseDate,
        notified: false,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error('POST /api/reminders db error:', res.status, t);
      return Response.json({ error: `Could not save reminder: ${t.slice(0, 160)}` }, { status: 500 });
    }
    return Response.json({ success: true });
  } catch (err) {
    console.error('POST /api/reminders error:', err);
    return Response.json({ error: 'Failed to save reminder' }, { status: 500 });
  }
}

// DELETE /api/reminders { movieId, mediaType }
export async function DELETE(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { movieId, mediaType = 'movie' } = await request.json();
    if (!movieId) return Response.json({ error: 'movieId is required' }, { status: 400 });
    const res = await fetch(
      `${db('reminders')}?user_id=eq.${userId}&movie_id=eq.${movieId}&media_type=eq.${mediaType}`,
      { method: 'DELETE', headers: { ...headers, Prefer: 'return=minimal' } }
    );
    if (!res.ok) {
      const t = await res.text();
      return Response.json({ error: t.slice(0, 160) }, { status: 500 });
    }
    return Response.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/reminders error:', err);
    return Response.json({ error: 'Failed to remove reminder' }, { status: 500 });
  }
}
