// app/api/reviews/route.js
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Batch-fetch Clerk users and return a map of userId -> {username, avatar_url}
async function getUserMap(userIds) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const map = {};
  if (uniqueIds.length === 0) return map;

  try {
    // Clerk's getUserList supports filtering by userId array
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

  // fallback for any ids Clerk didn't return
  for (const id of uniqueIds) {
    if (!map[id]) map[id] = { username: 'user', avatar_url: null };
  }
  return map;
}

// GET /api/reviews?movieId=123 -> top-level reviews + nested replies, enriched with user info
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const movieId = searchParams.get('movieId');
  const { userId: viewerId } = auth();

  if (!movieId) {
    return Response.json({ error: 'Missing movieId' }, { status: 400 });
  }

  try {
    // Fetch all reviews + replies for this movie in one query
    const { data: allRows, error } = await supabase
      .from('reviews')
      .select('id,user_id,movie_id,movie_title,text,rating,time,created_at,parent_id')
      .eq('movie_id', movieId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rows = allRows || [];
    const userIds = rows.map(r => r.user_id);
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

    const topLevel = rows.filter(r => !r.parent_id).map(enrich);
    const repliesByParent = {};
    for (const r of rows.filter(r => r.parent_id)) {
      const enriched = enrich(r);
      if (!repliesByParent[r.parent_id]) repliesByParent[r.parent_id] = [];
      repliesByParent[r.parent_id].push(enriched);
    }

    // ascending order for replies (oldest first reads more naturally in a thread)
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
export async function POST(req) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { movieId, movieTitle, text, rating, parentId, time } = body;

    if (!movieId || !text || !text.trim()) {
      return Response.json({ error: 'movieId and text are required' }, { status: 400 });
    }

    const insertRow = {
      user_id: userId,
      movie_id: movieId,
      movie_title: movieTitle || null,
      text: text.trim(),
      rating: rating || 0,
      time: time || null,
      parent_id: parentId || null,
    };

    const { data, error } = await supabase
      .from('reviews')
      .insert(insertRow)
      .select('id,user_id,movie_id,movie_title,text,rating,time,created_at,parent_id')
      .single();

    if (error) throw error;

    // Enrich with the posting user's info for immediate UI use
    const userMap = await getUserMap([userId]);

    return Response.json({
      comment: {
        ...data,
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
