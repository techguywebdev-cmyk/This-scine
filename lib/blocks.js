// Server-only helpers for user blocking. A block in either direction cuts all contact.
import { SUPABASE_URL, SUPABASE_KEY, clean } from '@/lib/db';

const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
const db = (p) => `${SUPABASE_URL}/rest/v1/${p}`;

// Set of user ids that `userId` has blocked or been blocked by
export async function blockedIds(userId) {
  const u = clean(userId);
  if (!u) return new Set();
  const rows = await fetch(`${db('blocks')}?or=(blocker_id.eq.${u},blocked_id.eq.${u})&select=blocker_id,blocked_id`, { headers, cache: 'no-store' })
    .then((r) => r.json()).catch(() => []);
  return new Set((Array.isArray(rows) ? rows : []).map((r) => (r.blocker_id === u ? r.blocked_id : r.blocker_id)));
}

// 'by_me' | 'by_them' | null
export async function blockState(a, b) {
  const x = clean(a), y = clean(b);
  if (!x || !y || x === y) return null;
  const rows = await fetch(`${db('blocks')}?or=(and(blocker_id.eq.${x},blocked_id.eq.${y}),and(blocker_id.eq.${y},blocked_id.eq.${x}))&select=blocker_id`, { headers, cache: 'no-store' })
    .then((r) => r.json()).catch(() => []);
  if (!Array.isArray(rows) || !rows.length) return null;
  return rows.some((r) => r.blocker_id === x) ? 'by_me' : 'by_them';
}

export const blockedResponse = () => Response.json({ error: 'You can’t interact with this account.' }, { status: 403 });
