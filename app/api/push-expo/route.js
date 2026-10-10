import { auth } from '@clerk/nextjs/server';
import { SUPABASE_KEY } from '@/lib/db';

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

// POST /api/push-expo { token } — save the mobile app's Expo push token
export async function POST(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  let token = '';
  try { ({ token } = await request.json()); } catch {}
  if (!token || !/^Expo(nent)?PushToken\[/.test(token)) return Response.json({ error: 'Invalid token' }, { status: 400 });
  const upd = await fetch(`${SUPABASE_URL}/rest/v1/user_settings?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ expo_push_token: token, updated_at: new Date().toISOString() }),
  });
  const rows = await upd.json().catch(() => []);
  if (!Array.isArray(rows) || rows.length === 0) {
    await fetch(`${SUPABASE_URL}/rest/v1/user_settings`, {
      method: 'POST', headers: { ...headers, Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ user_id: userId, expo_push_token: token, updated_at: new Date().toISOString() }),
    });
  }
  return Response.json({ success: true });
}
