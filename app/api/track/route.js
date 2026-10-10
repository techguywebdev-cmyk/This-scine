import { auth } from '@clerk/nextjs/server';
import { SUPABASE_URL, SUPABASE_KEY, clean } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Only these events are accepted — keeps the table meaningful and cheap
const NAMES = new Set(['session_start', 'title_open', 'save', 'unsave', 'watched', 'share', 'follow', 'message', 'review', 'status_post', 'status_react', 'folder_create', 'signup', 'import', 'together_pick', 'together_open', 'client_error', 'invite_open', 'party_start', 'party_open', 'party_react', 'party_invite_seen', 'onboard_start', 'onboard_pick', 'onboard_import', 'onboard_done', 'block', 'unblock', 'report']);

// POST /api/track { name, props?, anonId? }   (also accepts sendBeacon text bodies)
export async function POST(req) {
  let body = {};
  try { body = JSON.parse(await req.text()); } catch {}
  const name = String(body.name || '');
  if (!NAMES.has(name)) return new Response(null, { status: 204 });
  let userId = null;
  try { userId = auth().userId || null; } catch {}
  let props = body.props && typeof body.props === 'object' && !Array.isArray(body.props) ? body.props : null;
  if (props && JSON.stringify(props).length > (name === 'client_error' ? 900 : 600)) props = null;
  const row = { name, user_id: userId, anon_id: clean(body.anonId).slice(0, 40) || null, props };
  await fetch(`${SUPABASE_URL}/rest/v1/events`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(row),
  }).catch(() => {});
  return new Response(null, { status: 204 });
}
