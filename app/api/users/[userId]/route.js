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
const countHeaders = { ...headers, 'Prefer': 'count=exact' };

// GET /api/users/[userId] -> public profile info for any user
// targetId may be a real Clerk user ID (always starts with "user_") OR a plain @username
// (used by the public /u/[username] share page) - usernames are resolved to a Clerk ID first.
export async function GET(req, { params }) {
  let { userId: targetId } = params;
  const { userId: viewerId } = auth();

  if (!targetId) {
    return Response.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    if (!targetId.startsWith('user_')) {
      try {
        const { data: matches } = await clerkClient.users.getUserList({ username: [targetId], limit: 1 });
        if (!matches || matches.length === 0) {
          return Response.json({ error: 'User not found' }, { status: 404 });
        }
        targetId = matches[0].id;
      } catch (err) {
        console.error('username lookup error:', err);
        return Response.json({ error: 'User not found' }, { status: 404 });
      }
    }

    // Everything below runs in parallel: one round-trip instead of six
    const isSelf = viewerId === targetId;
    const clerkP = clerkClient.users.getUser(targetId).catch(() => null);
    const followerP = fetch(`${db('follows')}?following_id=eq.${targetId}&select=id`, { headers: countHeaders });
    const followingP = fetch(`${db('follows')}?follower_id=eq.${targetId}&select=id`, { headers: countHeaders });
    const settingsP = fetch(`${db('user_settings')}?user_id=eq.${targetId}&select=watchlist_public,bio,cover_url,nickname`, { headers }).then((r) => r.json()).catch(() => []);
    const watchlistP = fetch(`${db('watchlist')}?user_id=eq.${targetId}&order=saved_at.desc&select=movie_id,title,year,rating,poster,backdrop,genre,overview,accent,gradient,is_tv,watched,saved_at`, { headers: countHeaders });
    const viewerP = viewerId && !isSelf
      ? Promise.all([
          fetch(`${db('follows')}?follower_id=eq.${viewerId}&following_id=eq.${targetId}&select=id`, { headers }).then((r) => r.json()).catch(() => []),
          fetch(`${db('follows')}?follower_id=eq.${targetId}&following_id=eq.${viewerId}&select=id`, { headers }).then((r) => r.json()).catch(() => []),
          fetch(`${db('watchlist')}?user_id=eq.${viewerId}&select=movie_id`, { headers }).then((r) => r.json()).catch(() => []),
        ])
      : Promise.resolve(null);
    const [clerkUser, followerRes, followingRes, settingsData, watchlistRes, viewerData] = await Promise.all([clerkP, followerP, followingP, settingsP, watchlistP, viewerP]);

    // 1. Clerk profile info
    let username = 'user';
    let hasUsername = false;
    let avatar_url = null;
    let display_name = null;
    if (clerkUser) {
      username = publicHandle(clerkUser) || 'user';
      hasUsername = !!clerkUser.username;
      avatar_url = clerkUser.imageUrl || null;
      display_name = clerkUser.firstName ? `${clerkUser.firstName}${clerkUser.lastName ? ' ' + clerkUser.lastName : ''}` : username;
    }

    // 2. Follower / following counts
    const followerCount = parseInt(followerRes.headers.get('content-range')?.split('/')[1] || '0', 10);
    const followingCount = parseInt(followingRes.headers.get('content-range')?.split('/')[1] || '0', 10);

    // 3. Viewer relationship
    let isFollowing = false;
    let followsYou = false;
    let viewerIds = null;
    if (viewerData) {
      const [a, b, w] = viewerData;
      isFollowing = Array.isArray(a) && a.length > 0;
      followsYou = Array.isArray(b) && b.length > 0;
      viewerIds = new Set((Array.isArray(w) ? w : []).map((x) => String(x.movie_id)));
    }

    // 4. Settings
    const settingsRow = Array.isArray(settingsData) && settingsData.length > 0 ? settingsData[0] : null;
    const watchlistPublic = settingsRow ? settingsRow.watchlist_public : true;
    const bio = settingsRow?.bio || '';
    const coverUrl = settingsRow?.cover_url || null;
    if (settingsRow?.nickname) display_name = settingsRow.nickname;

    // 5. Watchlist rows + count
    const watchlistRows = await watchlistRes.json();
    const watchlistCount = parseInt(watchlistRes.headers.get('content-range')?.split('/')[1] || '0', 10);

    const topGenres = (() => {
      const counts = {};
      for (const row of Array.isArray(watchlistRows) ? watchlistRows : []) {
        for (const g of row.genre || []) {
          counts[g] = (counts[g] || 0) + 1;
        }
      }
      return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g);
    })();

    const canViewWatchlist = isSelf || watchlistPublic;
    const rowsArr = Array.isArray(watchlistRows) ? watchlistRows : [];
    const watchedCount = rowsArr.filter((r) => r.watched).length;
    // Titles you both saved — only revealed when their watchlist is visible to you
    const inCommon = viewerIds && canViewWatchlist ? rowsArr.filter((r) => viewerIds.has(String(r.movie_id))) : [];

    return Response.json({
      user_id: targetId,
      has_username: hasUsername,
      username,
      display_name,
      avatar_url,
      bio,
      cover_url: coverUrl,
      followers: followerCount || 0,
      following: followingCount || 0,
      watchlistCount: watchlistCount || 0,
      topGenres,
      watchlistPublic,
      isSelf,
      isFollowing,
      followsYou,
      watchedCount,
      inCommon: inCommon.slice(0, 20),
      inCommonCount: inCommon.length,
      watchlist: canViewWatchlist ? (Array.isArray(watchlistRows) ? watchlistRows : []) : null,
    });
  } catch (err) {
    console.error('GET /api/users/[userId] error:', err);
    return Response.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}
