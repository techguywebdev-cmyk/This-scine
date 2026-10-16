// GET /api/watch-options?region=GH
//  → { detected, region, supported, regions:[{code,name}], providers:[{id,name,logo}] }
// Countries TMDB/JustWatch track streaming for, and the main services in one of them.

export const dynamic = 'force-dynamic';
const TMDB_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_KEY;
const TMDB = 'https://api.themoviedb.org/3';
const get = (p) => fetch(`${TMDB}${p}${p.includes('?') ? '&' : '?'}api_key=${TMDB_KEY}`, { next: { revalidate: 86400 } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const detected = (req.headers.get('x-vercel-ip-country') || '').toUpperCase() || null;
  const reg = await get('/watch/providers/regions?language=en-US');
  const regions = (reg?.results || []).map((r) => ({ code: r.iso_3166_1, name: r.english_name })).sort((a, b) => a.name.localeCompare(b.name));
  const codes = new Set(regions.map((r) => r.code));
  const want = (searchParams.get('region') || detected || 'US').toUpperCase();
  const region = codes.has(want) ? want : 'US';
  const [mv, tv] = await Promise.all([get(`/watch/providers/movie?watch_region=${region}`), get(`/watch/providers/tv?watch_region=${region}`)]);
  const map = new Map();
  for (const p of [...(mv?.results || []), ...(tv?.results || [])]) {
    const pr = p.display_priorities?.[region] ?? p.display_priority ?? 999;
    const cur = map.get(p.provider_id);
    if (!cur || pr < cur.pr) map.set(p.provider_id, { id: p.provider_id, name: p.provider_name, logo: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null, pr });
  }
  const providers = [...map.values()].sort((a, b) => a.pr - b.pr).slice(0, 30).map(({ pr, ...p }) => p);
  return Response.json({ detected, detectedSupported: detected ? codes.has(detected) : false, region, supported: codes.has(want), regions, providers });
}
