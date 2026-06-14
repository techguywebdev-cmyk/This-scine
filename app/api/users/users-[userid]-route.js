// app/api/users/[userId]/route.js
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// GET /api/users/[userId] -> public profile info for any user
export async function GET(req, { params }) {
  const { userId: targetId } = params;
  const { userId: viewerId } = auth();

  if (!targetId) {
    return Response.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    // 1. Clerk profile info
    let username = 'user';
    let avatar_url = null;
    let display_name = null;
    try {
      const clerkUser = await clerkClient.users.getUser(targetId);
      username = clerkUser.username || clerkUser.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'user';
      avatar_url = clerkUser.imageUrl || null;
      display_name = clerkUser.firstName
        ? `${clerkUser.firstName}${clerkUser.lastName ? ' ' + clerkUser.lastName : ''}`
        : username;
    } catch {
      // user may no longer exist in Clerk; fall back to defaults
    }

    // 2. Follower / following counts
    const { count: followerCount } = await supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', targetId);

    const { count: followingCount } = await supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', targetId);

    // 3. Is the viewer following this user? Is this the viewer's own profile?
    let isFollowing = false;
    const isSelf = viewerId === targetId;
    if (viewerId && !isSelf) {
      const { data: followRow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', viewerId)
        .eq('following_id', targetId)
        .maybeSingle();
      isFollowing = !!followRow;
    }

    // 4. Watchlist privacy setting (defaults to public if no row exists)
    const { data: settingsRow } = await supabase
      .from('user_settings')
      .select('watchlist_public')
      .eq('user_id', targetId)
      .maybeSingle();
    const watchlistPublic = settingsRow ? settingsRow.watchlist_public : true;

    // 5. Watchlist count + top genres (always computed; list itself only returned if visible)
    const { data: watchlistRows, count: watchlistCount } = await supabase
      .from('watchlist')
      .select('movie_id,title,year,rating,poster,backdrop,genre,overview,accent,gradient,is_tv,watched,saved_at', { count: 'exact' })
      .eq('user_id', targetId)
      .order('saved_at', { ascending: false });

    const topGenres = (() => {
      const counts = {};
      for (const row of watchlistRows || []) {
        for (const g of row.genre || []) {
          counts[g] = (counts[g] || 0) + 1;
        }
      }
      return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g);
    })();

    const canViewWatchlist = isSelf || watchlistPublic;

    return Response.json({
      user_id: targetId,
      username,
      display_name,
      avatar_url,
      followers: followerCount || 0,
      following: followingCount || 0,
      watchlistCount: watchlistCount || 0,
      topGenres,
      watchlistPublic,
      isSelf,
      isFollowing,
      watchlist: canViewWatchlist ? (watchlistRows || []) : null,
    });
  } catch (err) {
    console.error('GET /api/users/[userId] error:', err);
    return Response.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}
