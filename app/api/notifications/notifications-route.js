// app/api/notifications/route.js
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
    const { data: rows, error } = await supabase
      .from('notifications')
      .select('id,type,from_user_id,read,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const fromIds = (rows || []).map(r => r.from_user_id);
    const userMap = await getUserMap(fromIds);

    // figure out which "follow" notifications I've already followed back
    const { data: myFollowing } = await supabase
      .from('follows').select('following_id').eq('follower_id', userId);
    const followingSet = new Set((myFollowing || []).map(r => r.following_id));

    const items = (rows || []).map(r => ({
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
export async function PATCH(req) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await req.json();
    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return Response.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/notifications error:', err);
    return Response.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
