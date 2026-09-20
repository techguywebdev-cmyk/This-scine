import { auth, clerkClient } from '@clerk/nextjs/server';

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dmZpaG96eHlib2lya2FpeHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjYxMDEsImV4cCI6MjA5NTY0MjEwMX0.y6zfENBPd6iJvFEf5-nRFeiWvVTzlDMAkNLr4CGfsGc';

const db = (path) => `${SUPABASE_URL}/rest/v1/${path}`;
const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function enrichUsers(userIds) {
  const unique = [...new Set((userIds || []).filter(Boolean))];
  const map = {};
  if (!unique.length) return map;

  // Batch via getUserList when possible
  try {
    const { data: users } = await clerkClient.users.getUserList({
      userId: unique,
      limit: Math.min(unique.length, 100),
    });
    for (const u of users || []) {
      map[u.id] = {
        username: u.username || u.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'user',
        display_name: u.firstName
          ? `${u.firstName}${u.lastName ? ' ' + u.lastName : ''}`
          : u.username || 'user',
        avatar_url: u.imageUrl || null,
      };
    }
  } catch (err) {
    console.error('enrichUsers batch error:', err);
  }

  // Fill gaps with individual gets
  for (const id of unique) {
    if (map[id]?.avatar_url) continue;
    try {
      const u = await clerkClient.users.getUser(id);
      map[id] = {
        username: u.username || u.emailAddresses?.[0]?.emailAddress?.split('@')[0] || map[id]?.username || 'user',
        display_name: u.firstName
          ? `${u.firstName}${u.lastName ? ' ' + u.lastName : ''}`
          : u.username || map[id]?.display_name || 'user',
        avatar_url: u.imageUrl || map[id]?.avatar_url || null,
      };
    } catch {
      if (!map[id]) map[id] = { username: 'user', display_name: 'user', avatar_url: null };
    }
  }

  // Nicknames from user_settings
  try {
    const nickRows = await fetch(
      `${db('user_settings')}?user_id=in.(${unique.join(',')})&select=user_id,nickname`,
      { headers }
    ).then((r) => r.json());
    for (const row of Array.isArray(nickRows) ? nickRows : []) {
      if (row.nickname && map[row.user_id]) {
        map[row.user_id].display_name = row.nickname;
      }
    }
  } catch {}

  return map;
}

function applyEnrichment(rows, userMap) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const u = userMap[row.user_id] || {};
    return {
      ...row,
      username: row.username || u.username || 'user',
      display_name: u.display_name || row.username || 'user',
      avatar_url: row.avatar_url || u.avatar_url || null,
    };
  });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'feed';
  const { userId } = auth();

  try {
    if (type === 'user') {
      const targetId = searchParams.get('userId');
      if (!targetId) return Response.json({ error: 'Missing userId' }, { status: 400 });

      const res = await fetch(
        `${db('activity')}?user_id=eq.${targetId}&order=created_at.desc&limit=30&select=id,user_id,username,avatar_url,type,movie_id,movie_title,movie_poster,movie_year,movie_rating,movie_accent,created_at`,
        { headers }
      );
      const rows = await res.json();
      const userMap = await enrichUsers([targetId]);
      return Response.json({ items: applyEnrichment(rows, userMap) });
    }

    if (!userId) return Response.json({ items: [] });

    const followingRes = await fetch(`${db('follows')}?follower_id=eq.${userId}&select=following_id`, { headers });
    const followingRows = await followingRes.json();
    const followingIds = (Array.isArray(followingRows) ? followingRows : []).map((r) => r.following_id);

    // Include own activity too so the feed isn't empty of self
    const scopeIds = [...new Set([...followingIds, userId])];
    if (scopeIds.length === 0) return Response.json({ items: [] });

    const inList = scopeIds.join(',');
    const res = await fetch(
      `${db('activity')}?user_id=in.(${inList})&order=created_at.desc&limit=50&select=id,user_id,username,avatar_url,type,movie_id,movie_title,movie_poster,movie_year,movie_rating,movie_accent,created_at`,
      { headers }
    );
    const rows = await res.json();
    const ids = (Array.isArray(rows) ? rows : []).map((r) => r.user_id);
    const userMap = await enrichUsers(ids);
    return Response.json({ items: applyEnrichment(rows, userMap) });
  } catch (err) {
    console.error('GET /api/activity error:', err);
    return Response.json({ error: 'Failed to load activity' }, { status: 500 });
  }
}

export async function POST(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const {
      type,
      movieId,
      movieTitle,
      moviePoster,
      movieYear,
      movieRating,
      movieAccent,
      username,
      avatarUrl,
      listId,
      listTitle,
      listPoster,
      listAccent,
    } = body;

    if (!type) {
      return Response.json({ error: 'type is required' }, { status: 400 });
    }

    const isListFollow = type === 'list_follow';
    const isArc = type === 'arc_complete';

    if (!isListFollow && !isArc && !movieId) {
      return Response.json({ error: 'movieId is required for this activity type' }, { status: 400 });
    }

    // Always prefer live Clerk avatar when possible
    let resolvedAvatar = avatarUrl || null;
    let resolvedUsername = username || null;
    try {
      const u = await clerkClient.users.getUser(userId);
      resolvedAvatar = u.imageUrl || resolvedAvatar;
      resolvedUsername =
        resolvedUsername || u.username || u.firstName || u.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'user';
    } catch {}

    const payload = {
      user_id: userId,
      username: resolvedUsername,
      avatar_url: resolvedAvatar,
      type,
      movie_id: isListFollow || isArc ? null : movieId,
      movie_title: isListFollow ? listTitle || 'a list' : isArc ? listTitle || 'a Cine Arc' : movieTitle || null,
      movie_poster: isListFollow || isArc ? listPoster || null : moviePoster || null,
      movie_year: isListFollow || isArc ? (listId ? String(listId) : null) : movieYear || null,
      movie_rating: isListFollow || isArc ? null : movieRating || null,
      movie_accent: isListFollow || isArc ? listAccent || null : movieAccent || null,
    };

    await fetch(db('activity'), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error('POST /api/activity error:', err);
    return Response.json({ error: 'Failed to record activity' }, { status: 500 });
  }
}
