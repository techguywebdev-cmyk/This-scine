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

// GET /api/activity?type=feed -> activity from people the current user follows
// GET /api/activity?type=user&userId=X -> activity for a specific user's profile
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'feed';
  const { userId } = auth();

  try {
    // ─── PROFILE ACTIVITY (any user, public) ───────────────────
    if (type === 'user') {
      const targetId = searchParams.get('userId');
      if (!targetId) return Response.json({ error: 'Missing userId' }, { status: 400 });

      const res = await fetch(`${db('activity')}?user_id=eq.${targetId}&order=created_at.desc&limit=30&select=id,user_id,username,avatar_url,type,movie_id,movie_title,movie_poster,movie_year,movie_rating,movie_accent,created_at`, { headers });
      const rows = await res.json();

      return Response.json({ items: Array.isArray(rows) ? rows : [] });
    }

    // ─── FRIENDS FEED (people I follow) ────────────────────────
    if (!userId) return Response.json({ items: [] });

    const followingRes = await fetch(`${db('follows')}?follower_id=eq.${userId}&select=following_id`, { headers });
    const followingRows = await followingRes.json();
    const followingIds = (Array.isArray(followingRows) ? followingRows : []).map(r => r.following_id);

    if (followingIds.length === 0) return Response.json({ items: [] });

    const inList = followingIds.join(',');
    const res = await fetch(`${db('activity')}?user_id=in.(${inList})&order=created_at.desc&limit=50&select=id,user_id,username,avatar_url,type,movie_id,movie_title,movie_poster,movie_year,movie_rating,movie_accent,created_at`, { headers });
    const rows = await res.json();

    return Response.json({ items: Array.isArray(rows) ? rows : [] });
  } catch (err) {
    console.error('GET /api/activity error:', err);
    return Response.json({ error: 'Failed to load activity' }, { status: 500 });
  }
}

// POST /api/activity { type, movieId, movieTitle, moviePoster, movieYear, movieRating, movieAccent }
// Records an activity event for the current user (saved/watched/reviewed)
export async function POST(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { type, movieId, movieTitle, moviePoster, movieYear, movieRating, movieAccent, username, avatarUrl } = body;

    if (!type || !movieId) {
      return Response.json({ error: 'type and movieId are required' }, { status: 400 });
    }

    await fetch(db('activity'), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_id: userId,
        username: username || null,
        avatar_url: avatarUrl || null,
        type,
        movie_id: movieId,
        movie_title: movieTitle || null,
        movie_poster: moviePoster || null,
        movie_year: movieYear || null,
        movie_rating: movieRating || null,
        movie_accent: movieAccent || null,
      }),
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error('POST /api/activity error:', err);
    return Response.json({ error: 'Failed to record activity' }, { status: 500 });
  }
}
