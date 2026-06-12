import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// GET — get activity feed for current user's friends
export async function GET(request) {
  const { userId } = auth();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'feed' or 'user'
  const targetId = searchParams.get('targetId') || '';

  try {
    if (type === 'user' && targetId) {
      const { data } = await supabase
        .from('activity')
        .select('*')
        .eq('user_id', targetId)
        .order('created_at', { ascending: false })
        .limit(20);
      return Response.json({ items: data || [] });
    }

    if (type === 'feed' && userId) {
      // Get who I follow
      const { data: followData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);
      const ids = (followData || []).map(f => f.following_id);
      if (ids.length === 0) return Response.json({ items: [] });
      const { data } = await supabase
        .from('activity')
        .select('*')
        .in('user_id', ids)
        .order('created_at', { ascending: false })
        .limit(50);
      return Response.json({ items: data || [] });
    }

    return Response.json({ items: [] });
  } catch (e) {
    console.error(e);
    return Response.json({ items: [] });
  }
}

// POST — log an activity event
export async function POST(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const { type, username, avatarUrl, movie } = body;
    await supabase.from('activity').insert({
      user_id: userId,
      username: username || 'User',
      avatar_url: avatarUrl || null,
      type,
      movie_id: movie?.id || null,
      movie_title: movie?.title || null,
      movie_poster: movie?.poster || null,
      movie_year: movie?.year || null,
      movie_rating: movie?.rating || null,
      movie_accent: movie?.accent || null,
      review_text: body.reviewText || null,
    });
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
      }
