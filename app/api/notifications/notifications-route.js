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

// GET /api/notifications -> recent notifications for the current user
export async function GET() {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const res = await fetch(`${db('notifications')}?user_id=eq.${userId}&order=created_at.desc&limit=50&select=id,type,from_user_id,read,created_at`, { headers });
    const rows = await res.json();
    const allRows = Array.isArray(rows) ? rows : [];

    const fromIds = allRows.map(r => r.from_user_id);
    const userMap = await getUserMap(fromIds);

    const myFollowingRes = await fetch(`${db('follows')}?follower_id=eq.${userId}&select=following_id`, { headers });
    const myFollowingRows = await myFollowingRes.json();
    const followingSet = new Set((Array.isArray(myFollowingRows) ? myFollowingRows : []).map(r => r.following_id));

    const items = allRows.map(r => ({
      id: r.id,
      type: r.type,
      user_id: r.from_user_id,
      username: userMap[r.from_user_id]?.username || 'user',
      avatar_url: userMap[r.from_user_id]?.avatar_url || null,
      read: r.read,
      created_at: r.created_at,
      followedBack: r.type === 'follow' ? followingSet.has(r.from_user_id) : undefined,
    }));

    return Response.json({ items });
  } catch (err) {
    console.error('GET /api/notifications error:', err);
    return Response.json({ error: 'Failed to load notifications' }, { status: 500 });
  }
}

// PATCH /api/notifications { id } -> mark a single notification as read
export async function PATCH(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await request.json();
    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

    await fetch(`${db('notifications')}?id=eq.${id}&user_id=eq.${userId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ read: true }),
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/notifications error:', err);
    return Response.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
