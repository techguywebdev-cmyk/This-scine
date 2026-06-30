import { auth, clerkClient } from '@clerk/nextjs/server';

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dmZpaG96eHlib2lya2FpeHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjYxMDEsImV4cCI6MjA5NTY0MjEwMX0.y6zfENBPd6iJvFEf5-nRFeiWvVTzlDMAkNLr4CGfsGc';

const db = (path) => `${SUPABASE_URL}/rest/v1/${path}`;
const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

// Batch-fetch Clerk users and return a map of userId -> {username, avatar_url}
async function getUserMap(userIds) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const map = {};
  if (uniqueIds.length === 0) return map;

  try {
    const { data: users } = await clerkClient.users.getUserList({
      userId: uniqueIds,
      limit: uniqueIds.length,
    });
    for (const u of users) {
      map[u.id] = {
        username: u.username || u.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'user',
        avatar_url: u.imageUrl || null,
      };
    }
  } catch (err) {
    console.error('getUserMap error:', err);
  }

  for (const id of uniqueIds) {
    if (!map[id]) map[id] = { username: 'user', avatar_url: null };
  }
  return map;
}

// GET /api/reviews?movieId=123 -> top-level reviews + nested replies, enriched with user info
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const movieId = searchParams.get('movieId');
  const profileUserId = searchParams.get('userId');
  const { userId: viewerId } = auth();

  // ─── PROFILE REVIEWS: all reviews by a given user, across movies ───
  if (profileUserId) {
    try {
      const res = await fetch(`${db('reviews')}?user_id=eq.${profileUserId}&parent_id=is.null&order=created_at.desc&select=id,user_id,movie_id,movie_title,text,rating,time,created_at,parent_id&limit=50`, { headers });
      const rows = await res.json();
      const allRows = Array.isArray(rows) ? rows : [];

      const comments = allRows.map(row => ({
        id: row.id,
        user_id: row.user_id,
        movie_id: row.movie_id,
        movie_title: row.movie_title,
        text: row.text,
        rating: row.rating || 0,
        time: row.time || null,
        created_at: row.created_at,
        isSelf: viewerId === row.user_id,
      }));

      return Response.json({ comments });
    } catch (err) {
      console.error('GET /api/reviews?userId error:', err);
      return Response.json({ error: 'Failed to load reviews' }, { status: 500 });
    }
  }

  if (!movieId) {
    return Response.json({ error: 'Missing movieId' }, { status: 400 });
  }

  try {
    const res = await fetch(`${db('reviews')}?movie_id=eq.${movieId}&order=created_at.desc&select=id,user_id,movie_id,movie_title,text,rating,time,created_at,parent_id`, { headers });
    const rows = await res.json();
    const allRows = Array.isArray(rows) ? rows : [];

    const userIds = allRows.map(r => r.user_id);
    const userMap = await getUserMap(userIds);

    const enrich = (row) => ({
      id: row.id,
      user_id: row.user_id,
      username: userMap[row.user_id]?.username || 'user',
      avatar_url: userMap[row.user_id]?.avatar_url || null,
      text: row.text,
      rating: row.rating || 0,
      time: row.time || null,
      created_at: row.created_at,
      parent_id: row.parent_id,
      isSelf: viewerId === row.user_id,
    });

    const topLevel = allRows.filter(r => !r.parent_id).map(enrich);
    const repliesByParent = {};
    for (const r of allRows.filter(r => r.parent_id)) {
      const enriched = enrich(r);
      if (!repliesByParent[r.parent_id]) repliesByParent[r.parent_id] = [];
      repliesByParent[r.parent_id].push(enriched);
    }

    for (const k of Object.keys(repliesByParent)) {
      repliesByParent[k].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    const comments = topLevel.map(c => ({ ...c, replies: repliesByParent[c.id] || [] }));

    return Response.json({ comments });
  } catch (err) {
    console.error('GET /api/reviews error:', err);
    return Response.json({ error: 'Failed to load reviews' }, { status: 500 });
  }
}

// POST /api/reviews { movieId, movieTitle, text, rating, parentId? }
export async function POST(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { movieId, movieTitle, text, rating, parentId, time } = body;

    if (!movieId || !text || !text.trim()) {
      return Response.json({ error: 'movieId and text are required' }, { status: 400 });
    }

    const res = await fetch(db('reviews'), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_id: userId,
        movie_id: movieId,
        movie_title: movieTitle || null,
        text: text.trim(),
        rating: rating || 0,
        time: time || 'just now',
        parent_id: parentId || null,
      }),
    });

    const data = await res.json();
    const row = Array.isArray(data) ? data[0] : data;

    const userMap = await getUserMap([userId]);

    return Response.json({
      comment: {
        id: row?.id,
        user_id: userId,
        movie_id: row?.movie_id,
        movie_title: row?.movie_title,
        text: row?.text,
        rating: row?.rating || 0,
        time: row?.time || null,
        created_at: row?.created_at,
        parent_id: row?.parent_id || null,
        username: userMap[userId]?.username || 'user',
        avatar_url: userMap[userId]?.avatar_url || null,
        isSelf: true,
        replies: [],
      },
    });
  } catch (err) {
    console.error('POST /api/reviews error:', err);
    return Response.json({ error: 'Failed to post review' }, { status: 500 });
  }
}

// DELETE /api/reviews { id } -> delete a comment/review owned by the current user
// (replies are removed automatically via the parent_id ON DELETE CASCADE constraint)
export async function DELETE(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await request.json();
    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

    const res = await fetch(`${db('reviews')}?id=eq.${id}&user_id=eq.${userId}`, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Supabase delete error:', res.status, errText);
      return Response.json({ error: 'Failed to delete' }, { status: 500 });
    }

    const data = await res.json();
    const deletedRows = Array.isArray(data) ? data : [];
    if (deletedRows.length === 0) {
      // either it didn't exist or it belonged to someone else
      return Response.json({ error: 'Comment not found or not yours to delete' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/reviews error:', err);
    return Response.json({ error: 'Failed to delete review' }, { status: 500 });
  }
                  }
