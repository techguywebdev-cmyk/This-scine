import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gwvfihozxyboirkaixqb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dmZpaG96eHlib2lya2FpeHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjYxMDEsImV4cCI6MjA5NTY0MjEwMX0.y6zfENBPd6iJvFEf5-nRFeiWvVTzlDMAkNLr4CGfsGc'
);

export async function GET() {
  const { userId } = auth();
  if (!userId) return Response.json({ items: [] });
  const { data } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return Response.json({ items: data || [] });
}

export async function POST(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const review = await request.json();
  const { error } = await supabase.from('reviews').insert({
    user_id: userId,
    movie_id: review.movieId,
    movie_title: review.movieTitle,
    text: review.text,
    rating: review.rating || 0,
    time: 'just now',
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
