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

export async function GET() {
  const { userId } = auth();
  if (!userId) return Response.json({ items: [] });
  const res = await fetch(`${db('reviews')}?user_id=eq.${userId}&order=created_at.desc`, { headers });
  const data = await res.json();
  return Response.json({ items: Array.isArray(data) ? data : [] });
}

export async function POST(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const review = await request.json();
  await fetch(db('reviews'), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      user_id: userId,
      movie_id: review.movieId || null,
      movie_title: review.movieTitle || '',
      text: review.text,
      rating: review.rating || 0,
      time: 'just now',
    }),
  });
  return Response.json({ success: true });
}
