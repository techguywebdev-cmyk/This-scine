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
const countHeaders = { ...headers, 'Prefer': 'count=exact' };

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
        display_name: u.firstName ? `${u.firstName}${u.lastName ? ' ' + u.lastName : ''}` : (u.username || 'user'),
        avatar_url: u.imageUrl || null,
      };
    }
  } catch (err) {
    console.error('getUserMap error:', err);
  }
  for (const id of uniqueIds) {
    if (!map[id]) map[id] = { username: 'user', display_name: 'user', avatar_url: null };
  }
  return map;
}

// Compute watchlist count + top 2 genres per user, in one batched query
async function getWatchlistMeta(userIds) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const meta = {};
  if (uniqueIds.length === 0) return meta;

  const inList = uniqueIds.join(',');
  const res = await fetch(`${db('watchlist')}?user_id=in.(${inList})&select=user_id,genre`, { headers });
  const rows = await res.json();

  for (const id of uniqueIds) meta[id] = { watchlistCount: 0, genreCounts: {} };

  for (const row of Array.isArray(rows) ? rows : []) {
    if (!meta[row.user_id]) meta[row.user_id] = { watchlistCount: 0, genreCounts: {} };
    meta[row.user_id].watchlistCount += 1;
    for (const g of row.genre || []) {
      meta[row.user_id].genreCounts[g] = (meta[row.user_id].genreCounts[g] || 0) + 1;
    }
  }

  const result = {};
  for (const id of uniqueIds) {
    const m = meta[id];
    const topGenres = Object.entries(m.genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([g]) => g);
    result[id] = { watchlistCount: m.watchlistCount, topGenres };
  }
  return result;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'following';
  const { userId } = auth();

  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // ─── STATS ───────────────────────────────────────────────
    if (type === 'stats') {
      const followingRes = await fetch(`${db('follows')}?follower_id=eq.${userId}&select=id`, { headers: countHeaders });
      const following = parseInt(followingRes.headers.get('content-range')?.split('/')[1] || '0', 10);

      const followersRes = await fetch(`${db('follows')}?following_id=eq.${userId}&select=id`, { headers: countHeaders });
      const followers = parseInt(followersRes.headers.get('content-range')?.split('/')[1] || '0', 10);

      // No follow-request system yet (instant follow) -> pending is always 0
      return Response.json({ following: following || 0, followers: followers || 0, pending: 0 });
    }

    // ─── FOLLOWING (people I follow) ────────────────────────
    if (type === 'following') {
      const res = await fetch(`${db('follows')}?follower_id=eq.${userId}&select=following_id`, { headers });
      const rows = await res.json();
      const ids = (Array.isArray(rows) ? rows : []).map(r => r.following_id);
      const userMap = await getUserMap(ids);
      const wlMeta = await getWatchlistMeta(ids);

      const users = ids.map(id => ({
        user_id: id,
        username: userMap[id]?.username || 'user',
        display_name: userMap[id]?.display_name || 'user',
        avatar_url: userMap[id]?.avatar_url || null,
        watchlistCount: wlMeta[id]?.watchlistCount || 0,
        topGenres: wlMeta[id]?.topGenres || [],
        isFollowing: true,
      }));

      return Response.json({ users });
    }

    // ─── FOLLOWERS (people who follow me) ───────────────────
    if (type === 'followers') {
      const res = await fetch(`${db('follows')}?following_id=eq.${userId}&select=follower_id`, { headers });
      const rows = await res.json();
      const ids = (Array.isArray(rows) ? rows : []).map(r => r.follower_id);
      const userMap = await getUserMap(ids);

      const myFollowingRes = await fetch(`${db('follows')}?follower_id=eq.${userId}&select=following_id`, { headers });
      const myFollowingRows = await myFollowingRes.json();
      const followingSet = new Set((Array.isArray(myFollowingRows) ? myFollowingRows : []).map(r => r.following_id));

      const users = ids.map(id => ({
        user_id: id,
        username: userMap[id]?.username || 'user',
        display_name: userMap[id]?.display_name || 'user',
        avatar_url: userMap[id]?.avatar_url || null,
        isFollowing: followingSet.has(id),
      }));

      return Response.json({ users });
    }

    // ─── SUGGESTED (users not yet followed, ranked by mutuals) ─
    if (type === 'suggested') {
      const myFollowingRes = await fetch(`${db('follows')}?follower_id=eq.${userId}&select=following_id`, { headers });
      const myFollowingRows = await myFollowingRes.json();
      const myFollowingIds = (Array.isArray(myFollowingRows) ? myFollowingRows : []).map(r => r.following_id);
      const excludeSet = new Set([...myFollowingIds, userId]);

      const mutualCounts = {};
      if (myFollowingIds.length > 0) {
        const inList = myFollowingIds.join(',');
        const secondDegreeRes = await fetch(`${db('follows')}?follower_id=in.(${inList})&select=following_id`, { headers });
        const secondDegree = await secondDegreeRes.json();
        for (const row of Array.isArray(secondDegree) ? secondDegree : []) {
          if (excludeSet.has(row.following_id)) continue;
          mutualCounts[row.following_id] = (mutualCounts[row.following_id] || 0) + 1;
        }
      }

      let candidateIds = Object.keys(mutualCounts).sort((a, b) => mutualCounts[b] - mutualCounts[a]);

      if (candidateIds.length < 10) {
        const popularRes = await fetch(`${db('follows')}?select=following_id`, { headers });
        const popular = await popularRes.json();
        const popularityCounts = {};
        for (const row of Array.isArray(popular) ? popular : []) {
          if (excludeSet.has(row.following_id) || candidateIds.includes(row.following_id)) continue;
          popularityCounts[row.following_id] = (popularityCounts[row.following_id] || 0) + 1;
        }
        const popularIds = Object.keys(popularityCounts).sort((a, b) => popularityCounts[b] - popularityCounts[a]);
        candidateIds = [...candidateIds, ...popularIds];
      }

      candidateIds = candidateIds.slice(0, 10);
      const userMap = await getUserMap(candidateIds);

      const users = candidateIds.map(id => ({
        user_id: id,
        username: userMap[id]?.username || 'user',
        display_name: userMap[id]?.display_name || 'user',
        avatar_url: userMap[id]?.avatar_url || null,
        verified: false,
        mutualCount: mutualCounts[id] || 0,
        isFollowing: false,
      }));

      return Response.json({ users });
    }

    // ─── SEARCH (by username) ────────────────────────────────
    if (type === 'search') {
      const q = (searchParams.get('q') || '').trim();
      if (!q) return Response.json({ users: [] });

      let foundUsers = [];
      try {
        const { data: results } = await clerkClient.users.getUserList({ query: q, limit: 20 });
        foundUsers = results.filter(u => u.id !== userId);
      } catch (err) {
        console.error('Clerk search error:', err);
      }

      const myFollowingRes = await fetch(`${db('follows')}?follower_id=eq.${userId}&select=following_id`, { headers });
      const myFollowingRows = await myFollowingRes.json();
      const followingSet = new Set((Array.isArray(myFollowingRows) ? myFollowingRows : []).map(r => r.following_id));

      const users = foundUsers.map(u => ({
        user_id: u.id,
        username: u.username || u.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'user',
        display_name: u.firstName ? `${u.firstName}${u.lastName ? ' ' + u.lastName : ''}` : (u.username || 'user'),
        avatar_url: u.imageUrl || null,
        isFollowing: followingSet.has(u.id),
      }));

      return Response.json({ users });
    }

    return Response.json({ error: 'Unknown type' }, { status: 400 });
  } catch (err) {
    console.error('GET /api/follows error:', err);
    return Response.json({ error: 'Failed to load follows data' }, { status: 500 });
  }
}

// POST /api/follows { targetId } -> follow a user
export async function POST(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { targetId } = await request.json();
    if (!targetId || targetId === userId) {
      return Response.json({ error: 'Invalid targetId' }, { status: 400 });
    }

    await fetch(db('follows'), {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ follower_id: userId, following_id: targetId }),
    });

    // create a "follow" notification for the target user (best-effort, ignore failures)
    try {
      await fetch(db('notifications'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ user_id: targetId, from_user_id: userId, type: 'follow', read: false }),
      });
    } catch (e) {
      console.error('notification insert error:', e);
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('POST /api/follows error:', err);
    return Response.json({ error: 'Failed to follow user' }, { status: 500 });
  }
}

// DELETE /api/follows { targetId } -> unfollow a user
export async function DELETE(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { targetId } = await request.json();
    if (!targetId) return Response.json({ error: 'Invalid targetId' }, { status: 400 });

    await fetch(`${db('follows')}?follower_id=eq.${userId}&following_id=eq.${targetId}`, {
      method: 'DELETE',
      headers,
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/follows error:', err);
    return Response.json({ error: 'Failed to unfollow user' }, { status: 500 });
  }
}
