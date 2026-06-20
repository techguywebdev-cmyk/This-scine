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
    const followerRes = await fetch(`${db('follows')}?following_id=eq.${targetId}&select=id`, { headers: countHeaders });
    const followerCount = parseInt(followerRes.headers.get('content-range')?.split('/')[1] || '0', 10);

    const followingRes = await fetch(`${db('follows')}?follower_id=eq.${targetId}&select=id`, { headers: countHeaders });
    const followingCount = parseInt(followingRes.headers.get('content-range')?.split('/')[1] || '0', 10);

    // 3. Is the viewer following this user? Is this the viewer's own profile?
    let isFollowing = false;
    const isSelf = viewerId === targetId;
    if (viewerId && !isSelf) {
      const res = await fetch(`${db('follows')}?follower_id=eq.${viewerId}&following_id=eq.${targetId}&select=id`, { headers });
      const data = await res.json();
      isFollowing = Array.isArray(data) && data.length > 0;
    }

    // 4. Watchlist privacy setting, bio, cover photo, and nickname (defaults applied if no row exists)
    const settingsRes = await fetch(`${db('user_settings')}?user_id=eq.${targetId}&select=watchlist_public,bio,cover_url,nickname`, { headers });
    const settingsData = await settingsRes.json();
    const settingsRow = Array.isArray(settingsData) && settingsData.length > 0 ? settingsData[0] : null;
    const watchlistPublic = settingsRow ? settingsRow.watchlist_public : true;
    const bio = settingsRow?.bio || '';
    const coverUrl = settingsRow?.cover_url || null;
    // a custom nickname overrides the Clerk-derived display name (the bold name text),
    // but never the @username handle, which stays tied to the unique Clerk identifier
    if (settingsRow?.nickname) display_name = settingsRow.nickname;

    // 5. Watchlist rows + count + top genres
    const watchlistRes = await fetch(`${db('watchlist')}?user_id=eq.${targetId}&order=saved_at.desc&select=movie_id,title,year,rating,poster,backdrop,genre,overview,accent,gradient,is_tv,watched,saved_at`, { headers: countHeaders });
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

    return Response.json({
      user_id: targetId,
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
      watchlist: canViewWatchlist ? (Array.isArray(watchlistRows) ? watchlistRows : []) : null,
    });
  } catch (err) {
    console.error('GET /api/users/[userId] error:', err);
    return Response.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}
