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

const DEFAULT_PREFS = {
  email: true,
  web: true,
  app: true, // reserved for native app later
  messages: true,
  follows: true,
  activity: true, // likes, list follows, platform alerts digest
};

function parsePrefs(raw) {
  if (!raw) return { ...DEFAULT_PREFS };
  if (typeof raw === 'string') {
    try {
      return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_PREFS };
    }
  }
  return { ...DEFAULT_PREFS, ...raw };
}

// GET /api/settings
export async function GET() {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const res = await fetch(
      `${db('user_settings')}?user_id=eq.${userId}&select=watchlist_public,bio,cover_url,nickname,notify_prefs,push_subscription`,
      { headers }
    );
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      return Response.json({
        watchlist_public: true,
        bio: '',
        cover_url: null,
        nickname: '',
        notify_prefs: { ...DEFAULT_PREFS },
        has_web_push: false,
      });
    }

    const row = data[0];
    return Response.json({
      watchlist_public: row.watchlist_public,
      bio: row.bio || '',
      cover_url: row.cover_url || null,
      nickname: row.nickname || '',
      notify_prefs: parsePrefs(row.notify_prefs),
      has_web_push: !!row.push_subscription,
    });
  } catch (err) {
    console.error('GET /api/settings error:', err);
    return Response.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

// PATCH /api/settings
export async function PATCH(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const payload = { user_id: userId, updated_at: new Date().toISOString() };

    if (typeof body.watchlist_public === 'boolean') payload.watchlist_public = body.watchlist_public;
    if (typeof body.bio === 'string') payload.bio = body.bio.slice(0, 160);
    if (typeof body.cover_url === 'string' || body.cover_url === null) payload.cover_url = body.cover_url;
    if (typeof body.nickname === 'string') payload.nickname = body.nickname.trim().slice(0, 40);

    if (body.notify_prefs && typeof body.notify_prefs === 'object') {
      // merge with existing
      let existing = { ...DEFAULT_PREFS };
      try {
        const cur = await fetch(
          `${db('user_settings')}?user_id=eq.${userId}&select=notify_prefs`,
          { headers }
        );
        const rows = await cur.json();
        if (Array.isArray(rows) && rows[0]) existing = parsePrefs(rows[0].notify_prefs);
      } catch {}
      payload.notify_prefs = { ...existing, ...body.notify_prefs };
    }

    if (body.push_subscription !== undefined) {
      payload.push_subscription = body.push_subscription; // object or null
    }

    if (Object.keys(payload).length <= 2) {
      return Response.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    const upsertRes = await fetch(db('user_settings'), {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(payload),
    });

    if (!upsertRes.ok) {
      const errText = await upsertRes.text();
      console.error('Supabase upsert error:', upsertRes.status, errText);
      // If notify_prefs column missing, still try without it for core fields
      if (errText.includes('notify_prefs') || errText.includes('push_subscription')) {
        return Response.json(
          {
            error:
              'Add columns in Supabase: alter table user_settings add column if not exists notify_prefs jsonb default \'{}\'::jsonb; alter table user_settings add column if not exists push_subscription jsonb;',
          },
          { status: 500 }
        );
      }
      return Response.json({ error: 'Database update failed' }, { status: 500 });
    }

    return Response.json({ success: true, ...payload });
  } catch (err) {
    console.error('PATCH /api/settings error:', err);
    return Response.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
