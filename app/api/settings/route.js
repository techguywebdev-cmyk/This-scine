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

// GET /api/settings -> current user's settings (defaults applied if no row exists)
export async function GET() {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const res = await fetch(`${db('user_settings')}?user_id=eq.${userId}&select=watchlist_public,bio,cover_url,nickname`, { headers });
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      return Response.json({ watchlist_public: true, bio: '', cover_url: null, nickname: '' });
    }

    return Response.json({
      watchlist_public: data[0].watchlist_public,
      bio: data[0].bio || '',
      cover_url: data[0].cover_url || null,
      nickname: data[0].nickname || '',
    });
  } catch (err) {
    console.error('GET /api/settings error:', err);
    return Response.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

// PATCH /api/settings { watchlist_public?, bio?, cover_url?, nickname? } -> partial update, at least one field required
export async function PATCH(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const payload = { user_id: userId, updated_at: new Date().toISOString() };

    if (typeof body.watchlist_public === 'boolean') payload.watchlist_public = body.watchlist_public;
    if (typeof body.bio === 'string') payload.bio = body.bio.slice(0, 160); // cap bio length
    if (typeof body.cover_url === 'string' || body.cover_url === null) payload.cover_url = body.cover_url;
    if (typeof body.nickname === 'string') payload.nickname = body.nickname.trim().slice(0, 40); // cap nickname length

    if (Object.keys(payload).length <= 2) {
      return Response.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    // upsert via Prefer: resolution=merge-duplicates (requires user_id primary key / unique constraint)
    // columns not present in payload are left untouched on existing rows
    const upsertRes = await fetch(db('user_settings'), {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(payload),
    });

    if (!upsertRes.ok) {
      const errText = await upsertRes.text();
      console.error('Supabase upsert error:', upsertRes.status, errText);
      return Response.json({ error: 'Database update failed' }, { status: 500 });
    }

    return Response.json({ success: true, ...payload });
  } catch (err) {
    console.error('PATCH /api/settings error:', err);
    return Response.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
