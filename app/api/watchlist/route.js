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
    .from('watchlist')
    .select('*')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });
  return Response.json({ items: data || [] });
}

export async function POST(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const movie = await request.json();
  const { error } = await supabase.from('watchlist').upsert({
    user_id: userId,
    movie_id: movie.id,
    title: movie.title,
    year: movie.year,
    rating: movie.rating,
    poster: movie.poster,
    backdrop: movie.backdrop,
    genre: movie.genre,
    overview: movie.overview,
    accent: movie.accent,
    gradient: movie.gradient,
    is_tv: movie.isTV || false,
    watched: movie.watched || false,
    saved_at: Date.now(),
  }, { onConflict: 'user_id,movie_id' });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}

export async function DELETE(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { movieId } = await request.json();
  await supabase.from('watchlist').delete().eq('user_id', userId).eq('movie_id', movieId);
  return Response.json({ success: true });
}

export async function PATCH(request) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { movieId, watched } = await request.json();
  await supabase.from('watchlist').update({ watched }).eq('user_id', userId).eq('movie_id', movieId);
  return Response.json({ success: true });
}
