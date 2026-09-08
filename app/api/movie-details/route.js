import { auth } from '@clerk/nextjs/server';

const TMDB_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_KEY;

// GET /api/movie-details?id=123&type=movie|tv
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const type = (searchParams.get('type') || 'movie').toLowerCase() === 'tv' ? 'tv' : 'movie';

  if (!id) {
    return Response.json({ error: 'Missing id' }, { status: 400 });
  }
  if (!TMDB_KEY) {
    return Response.json({ error: 'TMDB key not configured' }, { status: 500 });
  }

  try {
    const append =
      type === 'tv'
        ? 'credits,content_ratings,videos'
        : 'credits,release_dates,videos';
    const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_KEY}&append_to_response=${append}&language=en-US`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      const text = await res.text();
      return Response.json({ error: `TMDB error: ${text.slice(0, 120)}` }, { status: res.status });
    }
    const data = await res.json();

    // Normalize a few fields for the client
    const director =
      (data.credits?.crew || []).find((c) => c.job === 'Director')?.name ||
      (data.created_by || [])[0]?.name ||
      null;

    let certification = null;
    if (type === 'movie') {
      const us = (data.release_dates?.results || []).find((r) => r.iso_3166_1 === 'US');
      certification = us?.release_dates?.find((d) => d.certification)?.certification || null;
    } else {
      const us = (data.content_ratings?.results || []).find((r) => r.iso_3166_1 === 'US');
      certification = us?.rating || null;
    }

    return Response.json({
      details: data,
      director,
      certification,
      runtime: data.runtime || data.episode_run_time?.[0] || null,
      release_date: data.release_date || data.first_air_date || null,
      language:
        data.spoken_languages?.[0]?.english_name ||
        (data.original_language ? String(data.original_language).toUpperCase() : null),
      vote_count: data.vote_count || 0,
      overview: data.overview || '',
      cast: (data.credits?.cast || []).slice(0, 12),
    });
  } catch (err) {
    console.error('GET /api/movie-details error:', err);
    return Response.json({ error: 'Failed to load details' }, { status: 500 });
  }
}
