import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// GET — get followers/following/search users
export async function GET(request) {
  const { userId } = auth();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'following', 'followers', 'search', 'check'
  const query = searchParams.get('q') || '';
  const targetId = searchParams.get('targetId') || '';

  try {
    // Search users by username
    if (type === 'search') {
      if (!query.trim()) return Response.json({ users: [] });
      const { data } = await supabase
        .from('activity')
        .select('user_id, username, avatar_url')
        .ilike('username', `%${query}%`)
        .neq('user_id', userId || '')
        .limit(20);
      // Deduplicate by user_id
      const seen = new Set();
      const users = (data || []).filter(u => {
        if (seen.has(u.user_id)) return false;
        seen.add(u.user_id); return true;
      });
      // Check follow status for each
      if (userId && users.length > 0) {
        const ids = users.map(u => u.user_id);
        const { data: followData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId)
          .in('following_id', ids);
        const followingSet = new Set((followData || []).map(f => f.following_id));
        return Response.json({ users: users.map(u => ({ ...u, isFollowing: followingSet.has(u.user_id) })) });
      }
      return Response.json({ users });
    }

    // Check if following a specific user
    if (type === 'check' && userId && targetId) {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', userId)
        .eq('following_id', targetId)
        .single();
      return Response.json({ isFollowing: !!data });
    }

    // Get who current user follows
    if (type === 'following' && userId) {
      const { data: followData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);
      const ids = (followData || []).map(f => f.following_id);
      if (ids.length === 0) return Response.json({ users: [] });
      // Get latest activity for each to get username/avatar
      const { data: actData } = await supabase
        .from('activity')
        .select('user_id, username, avatar_url')
        .in('user_id', ids);
      const seen = new Set();
      const users = (actData || []).filter(u => {
        if (seen.has(u.user_id)) return false;
        seen.add(u.user_id); return true;
      });
      // Add users with no activity yet
      ids.forEach(id => { if (!seen.has(id)) users.push({ user_id: id, username: 'User', avatar_url: null }); });
      // Get watchlist counts
      const { data: wData } = await supabase
        .from('watchlist')
        .select('user_id')
        .in('user_id', ids);
      const counts = (wData || []).reduce((acc, w) => { acc[w.user_id] = (acc[w.user_id] || 0) + 1; return acc; }, {});
      return Response.json({ users: users.map(u => ({ ...u, watchlistCount: counts[u.user_id] || 0, isFollowing: true })) });
    }

    // Get followers count
    if (type === 'followers' && targetId) {
      const { count } = await supabase
        .from('follows')
        .select('id', { count: 'exact' })
        .eq('following_id', targetId);
      return Response.json({ count: count || 0 });
    }

    return Response.json({ users: [] });
  } catch (e) {
    console.error(e);
    return Response.json({ users: [] });
  }
}

// POST — follow a user
export async function POST(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { targetId } = await request.json();
  if (!targetId) return Response.json({ error: 'Missing targetId' }, { status: 400 });
  try {
    await supabase.from('follows').upsert({ follower_id: userId, following_id: targetId });
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — unfollow a user
export async function DELETE(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { targetId } = await request.json();
  try {
    await supabase.from('follows').delete().eq('follower_id', userId).eq('following_id', targetId);
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
        }
