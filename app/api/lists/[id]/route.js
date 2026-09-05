import { auth, clerkClient } from '@clerk/nextjs/server';

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dmZpaG96eHlib2lya2FpeHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjYxMDEsImV4cCI6MjA5NTY0MjEwMX0.y6zfENBPd6iJvFEf5-nRFeiWvVTzlDMAkNLr4CGfsGc';
const db = (path) => `${SUPABASE_URL}/rest/v1/${path}`;
const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

// GET /api/lists/[id] - single list with movies + stats
export async function GET(req, { params }) {
  const { userId } = auth();
  const { id } = params;
  try {
    const [listRes, moviesRes, followsRes, ratingsRes] = await Promise.all([
      fetch(`${db('community_lists')}?id=eq.${id}`, { headers }),
      fetch(`${db('community_list_movies')}?list_id=eq.${id}&order=added_at.asc`, { headers }),
      fetch(`${db('community_list_follows')}?list_id=eq.${id}&select=user_id`, { headers }),
      fetch(`${db('community_list_ratings')}?list_id=eq.${id}&select=user_id,rating`, { headers }),
    ]);
    const [listRows, movies, follows, ratings] = await Promise.all([
      listRes.json(), moviesRes.json(), followsRes.json(), ratingsRes.json()
    ]);
    if (!Array.isArray(listRows) || !listRows[0]) return Response.json({ error: 'Not found' }, { status: 404 });
    const list = listRows[0];

    // enrich creator
    let creator = { username: 'user', display_name: 'user', avatar_url: null };
    try {
      const u = await clerkClient.users.getUser(list.user_id);
      creator.username = u.username || u.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'user';
      creator.display_name = u.firstName ? `${u.firstName}${u.lastName ? ' '+u.lastName : ''}` : creator.username;
      creator.avatar_url = u.imageUrl || null;
      const nickRes = await fetch(`${db('user_settings')}?user_id=eq.${list.user_id}&select=nickname`, { headers });
      const nickRows = await nickRes.json();
      if (nickRows?.[0]?.nickname) creator.display_name = nickRows[0].nickname;
    } catch {}

    const ratingArr = Array.isArray(ratings) ? ratings : [];
    const avgRating = ratingArr.length ? Math.round((ratingArr.reduce((s,r)=>s+r.rating,0)/ratingArr.length)*10)/10 : null;
    const isFollowing = userId ? (Array.isArray(follows)?follows:[]).some(r=>r.user_id===userId) : false;
    const viewerRating = userId ? ratingArr.find(r=>r.user_id===userId)?.rating || null : null;

    return Response.json({
      list: { ...list, ...creator, movie_count: (Array.isArray(movies)?movies:[]).length,
        follower_count: (Array.isArray(follows)?follows:[]).length, avg_rating: avgRating,
        rating_count: ratingArr.length, is_following: isFollowing, viewer_rating: viewerRating,
        is_owner: userId === list.user_id },
      movies: Array.isArray(movies) ? movies : [],
    });
  } catch (err) {
    console.error('GET /api/lists/[id] error:', err);
    return Response.json({ error: 'Failed to load list' }, { status: 500 });
  }
}

// PATCH /api/lists/[id] { title?, description?, cover_url? }
export async function PATCH(req, { params }) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = params;
  try {
    const body = await req.json();
    const patch = { updated_at: new Date().toISOString() };
    if (body.title?.trim()) patch.title = body.title.trim();
    if (typeof body.description === 'string') patch.description = body.description.trim() || null;
    if (typeof body.cover_url === 'string' || body.cover_url === null) patch.cover_url = body.cover_url;
    const res = await fetch(`${db('community_lists')}?id=eq.${id}&user_id=eq.${userId}`, {
      method: 'PATCH', headers, body: JSON.stringify(patch),
    });
    if (!res.ok) return Response.json({ error: 'Failed to update' }, { status: 500 });
    const rows = await res.json();
    if (!rows?.length) return Response.json({ error: 'Not found or not yours' }, { status: 404 });
    return Response.json({ list: rows[0] });
  } catch (err) {
    return Response.json({ error: 'Failed to update list' }, { status: 500 });
  }
}

// DELETE /api/lists/[id]
export async function DELETE(req, { params }) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = params;
  try {
    const res = await fetch(`${db('community_lists')}?id=eq.${id}&user_id=eq.${userId}`, {
      method: 'DELETE', headers,
    });
    if (!res.ok) return Response.json({ error: 'Failed to delete' }, { status: 500 });
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: 'Failed to delete list' }, { status: 500 });
  }
  }
