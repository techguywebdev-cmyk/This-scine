// app/api/follows/route.js
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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

  const { data: rows } = await supabase
    .from('watchlist')
    .select('user_id,genre')
    .in('user_id', uniqueIds);

  for (const id of uniqueIds) meta[id] = { watchlistCount: 0, genreCounts: {} };

  for (const row of rows || []) {
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
      const { count: following } = await supabase
        .from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId);
      const { count: followers } = await supabase
        .from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId);
      // No follow-request system yet (instant follow) -> pending is always 0
      return Response.json({ following: following || 0, followers: followers || 0, pending: 0 });
    }

    // ─── FOLLOWING (people I follow) ────────────────────────
    if (type === 'following') {
      const { data: rows } = await supabase
        .from('follows').select('following_id').eq('follower_id', userId);
      const ids = (rows || []).map(r => r.following_id);
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
      const { data: rows } = await supabase
        .from('follows').select('follower_id').eq('following_id', userId);
      const ids = (rows || []).map(r => r.follower_id);
      const userMap = await getUserMap(ids);

      // also figure out which of my followers I already follow back
      const { data: myFollowing } = await supabase
        .from('follows').select('following_id').eq('follower_id', userId);
      const followingSet = new Set((myFollowing || []).map(r => r.following_id));

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
      // people I follow
      const { data: myFollowingRows } = await supabase
        .from('follows').select('following_id').eq('follower_id', userId);
      const myFollowingIds = (myFollowingRows || []).map(r => r.following_id);
      const excludeSet = new Set([...myFollowingIds, userId]);

      // candidates = people followed by people I follow (2nd-degree), ranked by mutual count
      const mutualCounts = {};
      if (myFollowingIds.length > 0) {
        const { data: secondDegree } = await supabase
          .from('follows')
          .select('following_id')
          .in('follower_id', myFollowingIds);
        for (const row of secondDegree || []) {
          if (excludeSet.has(row.following_id)) continue;
          mutualCounts[row.following_id] = (mutualCounts[row.following_id] || 0) + 1;
        }
      }

      let candidateIds = Object.keys(mutualCounts).sort((a, b) => mutualCounts[b] - mutualCounts[a]);

      // top up with most-followed users overall if not enough candidates
      if (candidateIds.length < 10) {
        const { data: popular } = await supabase
          .from('follows')
          .select('following_id');
        const popularityCounts = {};
        for (const row of popular || []) {
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

      const ids = foundUsers.map(u => u.id);
      const { data: myFollowing } = await supabase
        .from('follows').select('following_id').eq('follower_id', userId);
      const followingSet = new Set((myFollowing || []).map(r => r.following_id));

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
export async function POST(req) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { targetId } = await req.json();
    if (!targetId || targetId === userId) {
      return Response.json({ error: 'Invalid targetId' }, { status: 400 });
    }

    const { error } = await supabase
      .from('follows')
      .upsert({ follower_id: userId, following_id: targetId }, { onConflict: 'follower_id,following_id' });

    if (error) throw error;

    // create a "follow" notification for the target user (best-effort, ignore failures)
    await supabase
      .from('notifications')
      .insert({ user_id: targetId, from_user_id: userId, type: 'follow', read: false })
      .then(() => {})
      .catch((e) => console.error('notification insert error:', e));

    return Response.json({ success: true });
  } catch (err) {
    console.error('POST /api/follows error:', err);
    return Response.json({ error: 'Failed to follow user' }, { status: 500 });
  }
}

// DELETE /api/follows { targetId } -> unfollow a user
export async function DELETE(req) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { targetId } = await req.json();
    if (!targetId) return Response.json({ error: 'Invalid targetId' }, { status: 400 });

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', userId)
      .eq('following_id', targetId);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/follows error:', err);
    return Response.json({ error: 'Failed to unfollow user' }, { status: 500 });
  }
}
