import { auth } from '@clerk/nextjs/server';
import { SUPABASE_KEY } from '@/lib/db';

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';

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
export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const res = await fetch(
      `${db('user_settings')}?user_id=eq.${userId}&select=watchlist_public,bio,cover_url,nickname,notify_prefs,push_subscription,theme,prefs,top4`,
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
        theme: { mode: 'film' },
        prefs: {},
        top4: [],
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
      theme: row.theme && typeof row.theme === 'object' ? row.theme : { mode: 'film' },
      prefs: row.prefs && typeof row.prefs === 'object' ? row.prefs : {},
      top4: Array.isArray(row.top4) ? row.top4 : [],
    });
  } catch (err) {
    console.error('GET /api/settings error:', err);
    return Response.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

// PATCH /api/settings
// Update the row if it exists, otherwise insert it. Errors carry the real reason
// so the client can show something more useful than "couldn't save".
export async function PATCH(request) {
  let userId = null;
  try { userId = auth().userId; } catch (e) { console.error('settings auth error', e); }
  if (!userId) return Response.json({ error: 'You are signed out — sign in again to save' }, { status: 401 });

  let body = {};
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid request body' }, { status: 400 }); }

  try {
    const payload = { updated_at: new Date().toISOString() };

    if (typeof body.watchlist_public === 'boolean') payload.watchlist_public = body.watchlist_public;
    if (typeof body.bio === 'string') payload.bio = body.bio.slice(0, 160);
    if (typeof body.cover_url === 'string' || body.cover_url === null) payload.cover_url = body.cover_url;
    if (typeof body.nickname === 'string') payload.nickname = body.nickname.trim().slice(0, 40);

    if (body.notify_prefs && typeof body.notify_prefs === 'object') {
      let existing = { ...DEFAULT_PREFS };
      try {
        const cur = await fetch(`${db('user_settings')}?user_id=eq.${encodeURIComponent(userId)}&select=notify_prefs`, { headers, cache: 'no-store' });
        const rows = await cur.json();
        if (Array.isArray(rows) && rows[0]) existing = parsePrefs(rows[0].notify_prefs);
      } catch {}
      payload.notify_prefs = { ...existing, ...body.notify_prefs };
    }

    if (body.push_subscription !== undefined) payload.push_subscription = body.push_subscription;

    // Your feed & playback (region, services, trailers, data saver, content filters)
    if (body.prefs && typeof body.prefs === 'object') {
      const p = body.prefs, out = {};
      if (/^[A-Za-z]{2}$/.test(p.region || '')) out.region = p.region.toUpperCase();
      if (Array.isArray(p.services)) out.services = p.services.map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 20);
      for (const k of ['onlyMine', 'autoplay', 'startMuted', 'dataSaver', 'safe']) if (typeof p[k] === 'boolean') out[k] = p[k];
      if (Array.isArray(p.hideGenres)) out.hideGenres = p.hideGenres.map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 12);
      if (['both', 'movie', 'tv'].includes(p.kind)) out.kind = p.kind;
      let existing = {};
      try {
        const cur = await fetch(`${db('user_settings')}?user_id=eq.${encodeURIComponent(userId)}&select=prefs`, { headers, cache: 'no-store' });
        const rows = await cur.json();
        if (Array.isArray(rows) && rows[0]?.prefs && typeof rows[0].prefs === 'object') existing = rows[0].prefs;
      } catch {}
      payload.prefs = { ...existing, ...out };
    }

    // Top 4 favourite films on the profile
    if (Array.isArray(body.top4)) {
      payload.top4 = body.top4.slice(0, 4).filter((m) => m && Number.isFinite(Number(m.id))).map((m) => ({
        id: Number(m.id), type: m.type === 'tv' ? 'tv' : 'movie', title: String(m.title || '').slice(0, 200),
        poster: typeof m.poster === 'string' && /^https:\/\/image\.tmdb\.org\//.test(m.poster) ? m.poster : null,
        year: String(m.year || '').slice(0, 4), accent: /^#[0-9a-fA-F]{6}$/.test(m.accent || '') ? m.accent : null,
      }));
    }

    // Appearance: follow each film's colour, or one colour of their own everywhere
    if (body.theme && typeof body.theme === 'object') {
      const mode = body.theme.mode === 'fixed' ? 'fixed' : 'film';
      const color = /^#[0-9a-fA-F]{6}$/.test(body.theme.color || '') ? body.theme.color.toUpperCase() : null;
      payload.theme = mode === 'fixed' && color ? { mode, color } : { mode: 'film', ...(color ? { color } : {}) };
    }

    if (Object.keys(payload).length <= 1) {
      return Response.json({ error: 'Nothing to save' }, { status: 400 });
    }

    // 1) Try updating an existing row
    const upd = await fetch(`${db('user_settings')}?user_id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    if (!upd.ok) {
      const t = await upd.text();
      console.error('settings update failed', upd.status, t);
      return Response.json({ error: `Save failed (${upd.status}): ${t.slice(0, 140)}` }, { status: 500 });
    }
    const updated = await upd.json().catch(() => []);

    // 2) No row yet: insert one
    if (!Array.isArray(updated) || updated.length === 0) {
      const ins = await fetch(db('user_settings'), {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ user_id: userId, ...payload }),
        cache: 'no-store',
      });
      if (!ins.ok) {
        const t = await ins.text();
        console.error('settings insert failed', ins.status, t);
        return Response.json({ error: `Save failed (${ins.status}): ${t.slice(0, 140)}` }, { status: 500 });
      }
    }

    return Response.json({ success: true, ...payload });
  } catch (err) {
    console.error('PATCH /api/settings error:', err);
    return Response.json({ error: `Save failed: ${err?.message || 'unknown error'}` }, { status: 500 });
  }
}
