import { auth } from '@clerk/nextjs/server';
import { SUPABASE_KEY, clean } from '@/lib/db';

// Per-conversation chat theme, shared by both people.
// GET /api/chat-theme?with=<userId> → { theme }   ·   POST { with, theme } → { theme }
export const dynamic = 'force-dynamic';
const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
const THEMES = ['classic', 'batman', 'avatar', 'action', 'love', 'horror', 'scifi', 'nature'];
const pairKey = (a, b) => [a, b].sort().join(':');

export async function GET(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const peer = clean(new URL(request.url).searchParams.get('with') || '');
  if (!peer) return Response.json({ theme: 'classic' });
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/chat_themes?pair_key=eq.${encodeURIComponent(pairKey(userId, peer))}&select=theme,set_by,updated_at`, { headers, cache: 'no-store' });
    const rows = await r.json();
    const row = Array.isArray(rows) && rows[0];
    return Response.json({ theme: row?.theme || 'classic', setBy: row?.set_by || null, updatedAt: row?.updated_at || null });
  } catch {
    return Response.json({ theme: 'classic' });
  }
}

export async function POST(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const peer = clean(body.with || '');
  const theme = THEMES.includes(body.theme) ? body.theme : null;
  if (!peer || peer === userId || !theme) return Response.json({ error: 'Invalid request' }, { status: 400 });
  // Can't theme a chat with someone who blocked you (or you blocked)
  try {
    const b = await fetch(`${SUPABASE_URL}/rest/v1/blocks?or=(and(blocker_id.eq.${userId},blocked_id.eq.${peer}),and(blocker_id.eq.${peer},blocked_id.eq.${userId}))&select=blocker_id&limit=1`, { headers, cache: 'no-store' });
    const rows = await b.json();
    if (Array.isArray(rows) && rows.length) return Response.json({ error: 'Not available' }, { status: 403 });
  } catch {}
  const r = await fetch(`${SUPABASE_URL}/rest/v1/chat_themes?on_conflict=pair_key`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ pair_key: pairKey(userId, peer), theme, set_by: userId, updated_at: new Date().toISOString() }),
  });
  if (!r.ok) return Response.json({ error: 'Couldn’t save the theme' }, { status: 500 });
  return Response.json({ theme });
}
