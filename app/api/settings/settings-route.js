// app/api/settings/route.js
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// GET /api/settings -> current user's settings (creates a default row if missing)
export async function GET() {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('watchlist_public')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // default to public, matches table default
      return Response.json({ watchlist_public: true });
    }

    return Response.json({ watchlist_public: data.watchlist_public });
  } catch (err) {
    console.error('GET /api/settings error:', err);
    return Response.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

// PATCH /api/settings { watchlist_public: boolean }
export async function PATCH(req) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    if (typeof body.watchlist_public !== 'boolean') {
      return Response.json({ error: 'watchlist_public must be a boolean' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        watchlist_public: body.watchlist_public,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) throw error;

    return Response.json({ watchlist_public: body.watchlist_public });
  } catch (err) {
    console.error('PATCH /api/settings error:', err);
    return Response.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
