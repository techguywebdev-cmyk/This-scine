import { auth } from '@clerk/nextjs/server';
import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB = 'https://api.themoviedb.org/3';
const GENRE_MAP = {
  28: 'Action', 18: 'Drama', 35: 'Comedy', 27: 'Horror', 878: 'Sci-Fi', 10749: 'Romance', 53: 'Thriller', 16: 'Animation',
  99: 'Documentary', 80: 'Crime', 14: 'Fantasy', 9648: 'Mystery', 10752: 'War', 37: 'Western', 12: 'Adventure', 10751: 'Family',
  36: 'History', 10759: 'Action', 10765: 'Sci-Fi', 10768: 'War', 10762: 'Kids', 10764: 'Reality',
};
const ACCENTS = ['#F5A623', '#818CF8', '#2DD4BF', '#FF6B8A', '#A3E635', '#B07FEF', '#38BDF8', '#FDBA74'];
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

const tmdb = (path) => fetch(`${TMDB}${path}${path.includes('?') ? '&' : '?'}api_key=${TMDB_KEY}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);

// Find the TMDB title for one imported row
async function resolve(it) {
  const imdb = /^tt\d{5,10}$/.test(it.imdbId || '') ? it.imdbId : null;
  if (imdb) {
    const d = await tmdb(`/find/${imdb}?external_source=imdb_id`);
    const m = d?.movie_results?.[0] || d?.tv_results?.[0];
    if (m) return m;
  }
  const title = String(it.title || '').trim().slice(0, 200);
  if (!title) return null;
  const year = /^\d{4}$/.test(String(it.year || '')) ? String(it.year) : '';
  const q = encodeURIComponent(title);
  const tryTv = /tv|series|episode/i.test(it.type || '');
  if (!tryTv) {
    let d = await tmdb(`/search/movie?query=${q}${year ? `&primary_release_year=${year}` : ''}&include_adult=false`);
    if (!d?.results?.length && year) d = await tmdb(`/search/movie?query=${q}&year=${year}&include_adult=false`);
    if (d?.results?.length) return d.results[0];
  }
  const t = await tmdb(`/search/tv?query=${q}${year ? `&first_air_date_year=${year}` : ''}`);
  if (t?.results?.length) return t.results[0];
  if (tryTv) {
    const d = await tmdb(`/search/movie?query=${q}&include_adult=false`);
    if (d?.results?.length) return d.results[0];
  }
  return null;
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

// POST /api/import { items: [{ title, year, imdbId?, type?, list: 'watched'|'watchlist', date? }] }  (max 40 per call)
export async function POST(req) {
  const { userId } = auth();
  if (!userId) return Response.json({ error: 'Sign in to import' }, { status: 401 });
  if (!TMDB_KEY) return Response.json({ error: 'Import is not configured' }, { status: 500 });
  let body = {};
  try { body = await req.json(); } catch {}
  const items = Array.isArray(body.items) ? body.items.slice(0, 40) : [];
  if (!items.length) return Response.json({ matched: 0, missed: [] });

  const found = await pool(items, 8, resolve);
  const rows = { watched: [], watchlist: [] };
  const missed = [];
  const seen = new Set();
  found.forEach((m, k) => {
    const it = items[k];
    if (!m) { missed.push(`${it.title}${it.year ? ` (${it.year})` : ''}`); return; }
    const list = it.list === 'watchlist' ? 'watchlist' : 'watched';
    const key = `${list}:${m.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    const isTV = !m.title;
    const ts = Date.parse(it.date || '') || Date.now() - k * 1000;
    rows[list].push({
      user_id: userId,
      movie_id: m.id,
      title: m.title || m.name || 'Untitled',
      year: (m.release_date || m.first_air_date || '').slice(0, 4),
      rating: m.vote_average ? m.vote_average.toFixed(1) : 'N/A',
      poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
      backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : null,
      genre: (m.genre_ids || []).map((g) => GENRE_MAP[g]).filter(Boolean).slice(0, 2),
      overview: String(m.overview || '').slice(0, 400),
      accent: ACCENTS[m.id % ACCENTS.length],
      gradient: '',
      is_tv: isTV,
      watched: list === 'watched',
      saved_at: ts,
    });
  });
  // Watched: upsert (marks existing saves as watched). Watchlist: never downgrade something already watched.
  const writes = [];
  if (rows.watched.length) writes.push(fetch(`${SUPABASE_URL}/rest/v1/watchlist?on_conflict=user_id,movie_id`, { method: 'POST', headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows.watched) }));
  if (rows.watchlist.length) writes.push(fetch(`${SUPABASE_URL}/rest/v1/watchlist?on_conflict=user_id,movie_id`, { method: 'POST', headers: { ...headers, Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(rows.watchlist) }));
  const res = await Promise.all(writes);
  const bad = res.find((r) => !r.ok);
  if (bad) return Response.json({ error: `Could not save (${bad.status})` }, { status: 500 });
  return Response.json({ matched: rows.watched.length + rows.watchlist.length, missed });
}
