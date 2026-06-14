import { auth } from '@clerk/nextjs/server';

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dmZpaG96eHlib2lya2FpeHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjYxMDEsImV4cCI6MjA5NTY0MjEwMX0.y6zfENBPd6iJvFEf5-nRFeiWvVTzlDMAkNLr4CGfsGc';

const db = (path) => `${SUPABASE_URL}/rest/v1/${path}`;
const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

// GET /api/settings -> current user's settings (defaults to public if no row exists)
export async function GET() {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const res = await fetch(`${db('user_settings')}?user_id=eq.${userId}&select=watchlist_public`, { headers });
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      return Response.json({ watchlist_public: true });
    }

    return Response.json({ watchlist_public: data[0].watchlist_public });
  } catch (err) {
    console.error('GET /api/settings error:', err);
    return Response.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

// PATCH /api/settings { watchlist_public: boolean }
export async function PATCH(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    if (typeof body.watchlist_public !== 'boolean') {
      return Response.json({ error: 'watchlist_public must be a boolean' }, { status: 400 });
    }

    // upsert via Prefer: resolution=merge-duplicates (requires user_id primary key / unique constraint)
    await fetch(db('user_settings'), {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        user_id: userId,
        watchlist_public: body.watchlist_public,
        updated_at: new Date().toISOString(),
      }),
    });

    return Response.json({ watchlist_public: body.watchlist_public });
  } catch (err) {
    console.error('PATCH /api/settings error:', err);
    return Response.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
