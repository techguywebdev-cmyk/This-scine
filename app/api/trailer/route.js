// GET /api/trailer?id=123&type=movie|tv
// Server-side TMDB proxy so the playlist player does not need NEXT_PUBLIC_TMDB_KEY

const TMDB_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type') === 'tv' ? 'tv' : 'movie';

  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
  if (!TMDB_KEY) return Response.json({ error: 'TMDB key not configured' }, { status: 500 });

  try {
    const res = await fetch(`${TMDB_BASE}/${type}/${id}/videos?api_key=${TMDB_KEY}`);
    const data = await res.json();
    const vids = Array.isArray(data.results) ? data.results : [];

    const pick =
      vids.find((v) => v.type === 'Trailer' && v.site === 'YouTube') ||
      vids.find((v) => v.type === 'Teaser' && v.site === 'YouTube') ||
      vids.find((v) => v.site === 'YouTube');

    return Response.json({
      trailerKey: pick?.key || null,
      name: pick?.name || null,
      type: pick?.type || null,
    });
  } catch (err) {
    console.error('GET /api/trailer error:', err);
    return Response.json({ error: 'Failed to load trailer' }, { status: 500 });
  }
}
