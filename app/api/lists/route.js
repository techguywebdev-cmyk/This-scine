import { auth, clerkClient } from '@clerk/nextjs/server';

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dmZpaG96eHlib2lya2FpeHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjYxMDEsImV4cCI6MjA5NTY0MjEwMX0.y6zfENBPd6iJvFEf5-nRFeiWvVTzlDMAkNLr4CGfsGc';
const db = (path) => `${SUPABASE_URL}/rest/v1/${path}`;
const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

async function enrichLists(lists, viewerId) {
  if (!lists.length) return [];
  const userIds = [...new Set(lists.map(l => l.user_id))];
  const userMap = {};
  try {
    const { data: users } = await clerkClient.users.getUserList({ userId: userIds, limit: userIds.length });
    for (const u of users) {
      userMap[u.id] = { username: u.username || u.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'user', avatar_url: u.imageUrl || null };
    }
    // overlay nicknames
    const inList = userIds.join(',');
    const nickRes = await fetch(`${db('user_settings')}?user_id=in.(${inList})&select=user_id,nickname`, { headers });
    const nickRows = await nickRes.json();
    for (const row of Array.isArray(nickRows) ? nickRows : []) {
      if (row.nickname && userMap[row.user_id]) userMap[row.user_id].display_name = row.nickname;
    }
  } catch (err) { console.error('enrichLists error:', err); }

  const listIds = lists.map(l => l.id);
  const idList = listIds.join(',');

  // batch: movie counts, follower counts, avg ratings, viewer's follows
  const [movieCountsRes, followerCountsRes, ratingsRes] = await Promise.all([
    fetch(`${db('community_list_movies')}?list_id=in.(${idList})&select=list_id`, { headers }),
    fetch(`${db('community_list_follows')}?list_id=in.(${idList})&select=list_id`, { headers }),
    fetch(`${db('community_list_ratings')}?list_id=in.(${idList})&select=list_id,rating`, { headers }),
  ]);

  const movieRows = Array.isArray(await movieCountsRes.json()) ? await (async() => {
    const r = await fetch(`${db('community_list_movies')}?list_id=in.(${idList})&select=list_id`, { headers });
    return r.json();
  })() : [];

  // simpler: just re-fetch since we already awaited
  const [mr, fr, rr] = await Promise.all([
    fetch(`${db('community_list_movies')}?list_id=in.(${idList})&select=list_id`, { headers }).then(r=>r.json()),
    fetch(`${db('community_list_follows')}?list_id=in.(${idList})&select=list_id`, { headers }).then(r=>r.json()),
    fetch(`${db('community_list_ratings')}?list_id=in.(${idList})&select=list_id,rating`, { headers }).then(r=>r.json()),
  ]);

  const movieCounts = {}, followerCounts = {}, ratingTotals = {}, ratingCounts = {};
  for (const row of Array.isArray(mr) ? mr : []) movieCounts[row.list_id] = (movieCounts[row.list_id] || 0) + 1;
  for (const row of Array.isArray(fr) ? fr : []) followerCounts[row.list_id] = (followerCounts[row.list_id] || 0) + 1;
  for (const row of Array.isArray(rr) ? rr : []) {
    ratingTotals[row.list_id] = (ratingTotals[row.list_id] || 0) + row.rating;
    ratingCounts[row.list_id] = (ratingCounts[row.list_id] || 0) + 1;
  }

  let viewerFollows = new Set();
  let viewerRatings = {};
  if (viewerId) {
    const [vfRes, vrRes] = await Promise.all([
      fetch(`${db('community_list_follows')}?list_id=in.(${idList})&user_id=eq.${viewerId}&select=list_id`, { headers }).then(r=>r.json()),
      fetch(`${db('community_list_ratings')}?list_id=in.(${idList})&user_id=eq.${viewerId}&select=list_id,rating`, { headers }).then(r=>r.json()),
    ]);
    for (const r of Array.isArray(vfRes) ? vfRes : []) viewerFollows.add(r.list_id);
    for (const r of Array.isArray(vrRes) ? vrRes : []) viewerRatings[r.list_id] = r.rating;
  }

  // get first poster for each list (cover fallback)
  const posterMap = {};
  const posterRes = await fetch(`${db('community_list_movies')}?list_id=in.(${idList})&select=list_id,movie_poster,movie_accent&order=added_at.asc`, { headers });
  const posterRows = await posterRes.json();
  for (const r of Array.isArray(posterRows) ? posterRows : []) {
    if (!posterMap[r.list_id]) posterMap[r.list_id] = { poster: r.movie_poster, accent: r.movie_accent };
  }

  return lists.map(l => {
    const u = userMap[l.user_id] || {};
    const rc = ratingCounts[l.list_id || l.id] || 0;
    const avgRating = rc > 0 ? Math.round((ratingTotals[l.list_id || l.id] / rc) * 10) / 10 : null;
    const id = l.list_id || l.id;
    return {
      ...l,
      id,
      username: u.username || 'user',
      display_name: u.display_name || u.username || 'user',
      avatar_url: u.avatar_url || null,
      movie_count: movieCounts[id] || 0,
      follower_count: followerCounts[id] || 0,
      avg_rating: avgRating,
      rating_count: rc,
      is_following: viewerFollows.has(id),
      viewer_rating: viewerRatings[id] || null,
      cover_poster: l.cover_url || posterMap[id]?.poster || null,
      cover_accent: posterMap[id]?.accent || null,
    };
  });
}

// GET /api/lists?tab=trending|following|mine
export async function GET(req) {
  const { userId } = auth();
  const { searchParams } = new URL(req.url);
  const tab = searchParams.get('tab') || 'trending';

  try {
    let listsRes;
    if (tab === 'mine') {
      if (!userId) return Response.json({ lists: [] });
      listsRes = await fetch(`${db('community_lists')}?user_id=eq.${userId}&is_public=eq.true&order=updated_at.desc&limit=50`, { headers });
    } else if (tab === 'following') {
      if (!userId) return Response.json({ lists: [] });
      const followsRes = await fetch(`${db('community_list_follows')}?user_id=eq.${userId}&select=list_id`, { headers });
      const followRows = await followsRes.json();
      const ids = (Array.isArray(followRows) ? followRows : []).map(r => r.list_id);
      if (!ids.length) return Response.json({ lists: [] });
      listsRes = await fetch(`${db('community_lists')}?id=in.(${ids.join(',')})&is_public=eq.true&order=updated_at.desc&limit=50`, { headers });
    } else {
      // trending: all public lists, we'll sort by score client-side after enrichment
      listsRes = await fetch(`${db('community_lists')}?is_public=eq.true&order=created_at.desc&limit=100`, { headers });
    }

    const raw = await listsRes.json();
    const lists = Array.isArray(raw) ? raw : [];
    const enriched = await enrichLists(lists, userId);

    if (tab === 'trending') {
      enriched.sort((a, b) => {
        const scoreA = (a.follower_count * 2) + (a.avg_rating || 0) * 3 + a.movie_count;
        const scoreB = (b.follower_count * 2) + (b.avg_rating || 0) * 3 + b.movie_count;
        return scoreB - scoreA;
      });
    }

    return Response.json({ lists: enriched });
  } catch (err) {
    console.error('GET /api/lists error:', err);
    return Response.json({ error: 'Failed to load lists' }, { status: 500 });
  }
}

// POST /api/lists { title, description? }
export async function POST(req) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { title, description } = await req.json();
    if (!title?.trim()) return Response.json({ error: 'Title is required' }, { status: 400 });
    const res = await fetch(db('community_lists'), {
      method: 'POST', headers,
      body: JSON.stringify({ user_id: userId, title: title.trim(), description: description?.trim() || null }),
    });
    if (!res.ok) { const t = await res.text(); return Response.json({ error: `Failed to create list: ${t}` }, { status: 500 }); }
    const [list] = await res.json();
    return Response.json({ list });
  } catch (err) {
    console.error('POST /api/lists error:', err);
    return Response.json({ error: 'Failed to create list' }, { status: 500 });
  }
}
