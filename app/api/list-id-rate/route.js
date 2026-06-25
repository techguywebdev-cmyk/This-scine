import { auth } from '@clerk/nextjs/server';

const SUPABASE_URL = 'https://gwvfihozxyboirkaixqb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dmZpaG96eHlib2lya2FpeHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjYxMDEsImV4cCI6MjA5NTY0MjEwMX0.y6zfENBPd6iJvFEf5-nRFeiWvVTzlDMAkNLr4CGfsGc';
const db = (path) => `${SUPABASE_URL}/rest/v1/${path}`;
const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=representation' };

// POST /api/lists/[id]/rate  { rating: 1-5 }
export async function POST(req, { params }) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = params;
  try {
    const { rating } = await req.json();
    if (!rating || rating < 1 || rating > 5) return Response.json({ error: 'Rating must be 1-5' }, { status: 400 });
    const res = await fetch(db('community_list_ratings'), {
      method: 'POST', headers,
      body: JSON.stringify({ list_id: id, user_id: userId, rating }),
    });
    if (!res.ok) return Response.json({ error: 'Failed to rate' }, { status: 500 });
    return Response.json({ success: true, rating });
  } catch (err) {
    return Response.json({ error: 'Failed to rate list' }, { status: 500 });
  }
}
