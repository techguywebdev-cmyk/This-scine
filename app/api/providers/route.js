// GET /api/providers?id=123&type=movie|tv
// Returns flatrate/free/ads providers + TMDB watch link for deep-linking

const TMDB_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type') === 'tv' ? 'tv' : 'movie';

  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
  if (!TMDB_KEY) return Response.json({ error: 'TMDB key not configured' }, { status: 500 });

  try {
    const res = await fetch(`${TMDB_BASE}/${type}/${id}/watch/providers?api_key=${TMDB_KEY}`);
    const data = await res.json();
    const results = data.results || {};
    const regionData = results['US'] || results['GB'] || results['CA'] || Object.values(results)[0] || null;

    if (!regionData) {
      return Response.json({ providers: [], link: null });
    }

    const list = [
      ...(regionData.flatrate || []),
      ...(regionData.free || []),
      ...(regionData.ads || []),
    ];
    const seen = new Set();
    const providers = [];
    for (const p of list) {
      if (seen.has(p.provider_id)) continue;
      seen.add(p.provider_id);
      providers.push({
        provider_id: p.provider_id,
        provider_name: p.provider_name,
        logo_path: p.logo_path,
      });
      if (providers.length >= 5) break;
    }

    return Response.json({
      providers,
      link: regionData.link || null,
    });
  } catch (err) {
    console.error('GET /api/providers error:', err);
    return Response.json({ error: 'Failed to load providers' }, { status: 500 });
  }
}
