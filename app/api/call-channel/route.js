import { auth } from '@clerk/nextjs/server';
import { createHmac } from 'crypto';
import { SUPABASE_KEY, clean } from '@/lib/db';
import { blockState, blockedIds, blockedResponse } from '@/lib/blocks';

export const dynamic = 'force-dynamic';

// GET /api/call-channel?with=<userId>
// Returns an unguessable realtime channel name for the signed-in user + peer.
// Only the two participants can obtain it (it is derived from a server-only secret).
export async function GET(req) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const peer = clean(new URL(req.url).searchParams.get('with'));
  if (!peer || peer === userId) return Response.json({ error: 'Bad peer' }, { status: 400 });
  if (await blockState(userId, peer)) return blockedResponse();
  const secret = process.env.CALL_CHANNEL_SECRET || SUPABASE_KEY;
  const pair = [userId, peer].sort().join(':');
  const sig = createHmac('sha256', secret).update(`call:${pair}`).digest('base64url').slice(0, 32);
  return Response.json({ channel: `cs-call-${sig}` }, { headers: { 'Cache-Control': 'no-store' } });
}
