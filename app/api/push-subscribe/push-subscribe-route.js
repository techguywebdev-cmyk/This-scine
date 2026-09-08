import { auth } from '@clerk/nextjs/server';

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dmZpaG96eHlib2lya2FpeHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjYxMDEsImV4cCI6MjA5NTY0MjEwMX0.y6zfENBPd6iJvFEf5-nRFeiWvVTzlDMAkNLr4CGfsGc';

const db = (path) => `${SUPABASE_URL}/rest/v1/${path}`;
const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates,return=representation',
};

// POST /api/push-subscribe { subscription }  — save web push subscription
// DELETE /api/push-subscribe                 — clear subscription
export async function POST(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const subscription = body.subscription;
    if (!subscription || !subscription.endpoint) {
      return Response.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    const res = await fetch(db('user_settings'), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_id: userId,
        push_subscription: subscription,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return Response.json({ error: t.slice(0, 200) }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('POST push-subscribe', err);
    return Response.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}

export async function DELETE() {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await fetch(db('user_settings'), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_id: userId,
        push_subscription: null,
        updated_at: new Date().toISOString(),
      }),
    });
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: 'Failed to clear subscription' }, { status: 500 });
  }
}

// GET returns public VAPID key for client subscribe
export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || '';
  return Response.json({ publicKey, enabled: !!publicKey });
}
