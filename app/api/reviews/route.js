import { auth, clerkClient } from '@clerk/nextjs/server';
import { publicHandle } from '@/lib/handle';
import { SUPABASE_KEY } from '@/lib/db';

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';

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
        username: publicHandle(u) || 'user',
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

function enrichRow(row, userMap, viewerId) {
  return {
    id: row.id,
    user_id: row.user_id,
    username: userMap[row.user_id]?.username || 'user',
    avatar_url: userMap[row.user_id]?.avatar_url || null,
    text: row.text,
    rating: row.rating || 0,
    time: row.time || null,
    created_at: row.created_at,
    parent_id: row.parent_id || null,
    list_id: row.list_id || null,
    movie_id: row.movie_id || null,
    movie_title: row.movie_title || null,
    isSelf: viewerId === row.user_id,
  };
}

function nestComments(allRows, userMap, viewerId) {
  const enrich = (row) => enrichRow(row, userMap, viewerId);
  const topLevel = allRows.filter((r) => !r.parent_id).map(enrich);
  const repliesByParent = {};
  for (const r of allRows.filter((r) => r.parent_id)) {
    const enriched = enrich(r);
    if (!repliesByParent[r.parent_id]) repliesByParent[r.parent_id] = [];
    repliesByParent[r.parent_id].push(enriched);
  }
  for (const k of Object.keys(repliesByParent)) {
    repliesByParent[k].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }
  return topLevel.map((c) => ({ ...c, replies: repliesByParent[c.id] || [] }));
}

// GET /api/reviews?movieId=123 -> top-level reviews + nested replies
// GET /api/reviews?listId=abc  -> list discussion + nested replies
// GET /api/reviews?userId=abc  -> all reviews by a given user
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const movieId = searchParams.get('movieId');
  const listId = searchParams.get('listId');
  const profileUserId = searchParams.get('userId');
  const { userId: viewerId } = auth();

  // ─── LIST DISCUSSION (with threading) ───
  if (listId) {
    try {
      const res = await fetch(
        `${db('reviews')}?list_id=eq.${listId}&order=created_at.desc&select=id,user_id,list_id,text,created_at,parent_id`,
        { headers }
      );
      const rows = await res.json();
      const allRows = Array.isArray(rows) ? rows : [];
      const userIds = allRows.map((r) => r.user_id);
      const userMap = await getUserMap(userIds);
      const comments = nestComments(allRows, userMap, viewerId);
      return Response.json({ comments });
    } catch (err) {
      console.error('GET /api/reviews?listId error:', err);
      return Response.json({ error: 'Failed to load discussion' }, { status: 500 });
    }
  }

  // ─── PROFILE REVIEWS ───
  if (profileUserId) {
    try {
      const res = await fetch(
        `${db('reviews')}?user_id=eq.${profileUserId}&parent_id=is.null&order=created_at.desc&select=id,user_id,movie_id,movie_title,text,rating,time,created_at,parent_id&limit=50`,
        { headers }
      );
      const rows = await res.json();
      const allRows = Array.isArray(rows) ? rows : [];

      const comments = allRows.map((row) => ({
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
    const res = await fetch(
      `${db('reviews')}?movie_id=eq.${movieId}&order=created_at.desc&select=id,user_id,movie_id,movie_title,text,rating,time,created_at,parent_id`,
      { headers }
    );
    const rows = await res.json();
    const allRows = Array.isArray(rows) ? rows : [];

    const userIds = allRows.map((r) => r.user_id);
    const userMap = await getUserMap(userIds);
    const comments = nestComments(allRows, userMap, viewerId);

    return Response.json({ comments });
  } catch (err) {
    console.error('GET /api/reviews error:', err);
    return Response.json({ error: 'Failed to load reviews' }, { status: 500 });
  }
}

// POST /api/reviews { movieId, movieTitle, text, rating, parentId? }
// POST /api/reviews { listId, text, parentId? }
async function notifyMentions({ fromId, fromName, text, mentions, movieId, movieTitle, moviePoster, mediaType, reviewId, listId }) {
  const handles = [...new Set((text.match(/@([a-zA-Z0-9_.]{2,32})/g) || []).map((h) => h.slice(1).toLowerCase()))];
  if (!handles.length) return;
  const ids = new Set();
  // Picked from the suggestion list: trust the id, but only if the handle is still in the text
  for (const m of Array.isArray(mentions) ? mentions : []) {
    if (m?.user_id && m?.handle && handles.includes(String(m.handle).toLowerCase())) ids.add(m.user_id);
  }
  // Typed by hand: resolve real usernames through Clerk
  const unresolved = handles.filter((h) => !(Array.isArray(mentions) ? mentions : []).some((m) => String(m?.handle || '').toLowerCase() === h));
  if (unresolved.length) {
    try {
      const { data: users } = await clerkClient.users.getUserList({ username: unresolved, limit: 20 });
      (users || []).forEach((u) => ids.add(u.id));
    } catch {}
  }
  ids.delete(fromId);
  if (!ids.size) return;
  const snippet = text.length > 140 ? text.slice(0, 137) + '…' : text;
  const rows = [...ids].slice(0, 10).map((uid) => ({
    user_id: uid, from_user_id: fromId, type: 'mention', read: false,
    data: { movie_id: movieId || null, title: movieTitle || null, poster: moviePoster, media_type: mediaType, review_id: reviewId || null, list_id: listId || null, snippet },
  }));
  await fetch(db('notifications'), { method: 'POST', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify(rows) });
  try {
    const notify = await import('@/lib/notify');
    await Promise.race([
      Promise.all(rows.map((r) => notify.pushUser({ userId: r.user_id, category: 'activity', title: `@${fromName} mentioned you`, body: movieTitle ? `On ${movieTitle}: ${snippet}` : snippet, url: movieId ? `/?m=${mediaType === 'tv' ? 'tv' : 'movie'}-${movieId}` : '/', tag: `mention-${reviewId}` }))),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch {}
}

export async function POST(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { movieId, movieTitle, text, rating, parentId, time, listId } = body;

    if (!text || !text.trim()) {
      return Response.json({ error: 'Text is required' }, { status: 400 });
    }
    if (!movieId && !listId) {
      return Response.json({ error: 'movieId or listId is required' }, { status: 400 });
    }

    const payload = {
      user_id: userId,
      text: text.trim(),
      list_id: listId || null,
      parent_id: parentId || null,
    };
    if (movieId) {
      payload.movie_id = movieId;
      payload.movie_title = movieTitle || null;
      payload.rating = rating || 0;
      payload.time = time || 'just now';
    }

    const res = await fetch(db('reviews'), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Supabase insert error:', res.status, errText);
      return Response.json({ error: `Failed to post: ${errText.slice(0, 200)}` }, { status: 500 });
    }

    const data = await res.json();
    const row = Array.isArray(data) ? data[0] : data;
    const userMap = await getUserMap([userId]);

    // @mentions → notification (+ push) for each tagged person, friends or not
    try {
      await notifyMentions({ fromId: userId, fromName: userMap[userId]?.username || 'someone', text: payload.text, mentions: body.mentions, movieId, movieTitle, moviePoster: body.moviePoster || null, mediaType: body.mediaType || 'movie', reviewId: row?.id, listId });
    } catch (e) {
      console.error('mention notify error', e);
    }

    if (listId) {
      return Response.json({
        comment: {
          id: row?.id,
          user_id: userId,
          list_id: row?.list_id,
          text: row?.text,
          created_at: row?.created_at,
          parent_id: row?.parent_id || null,
          username: userMap[userId]?.username || 'user',
          avatar_url: userMap[userId]?.avatar_url || null,
          isSelf: true,
          replies: [],
        },
      });
    }

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
    return Response.json({ error: 'Failed to post' }, { status: 500 });
  }
}

// DELETE /api/reviews { id }
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
      return Response.json({ error: 'Comment not found or not yours to delete' }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/reviews error:', err);
    return Response.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}
