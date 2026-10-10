// Server-only: everything a public title page needs, cached (ISR) so pages are fast and cheap.
import { clerkClient } from '@clerk/nextjs/server';
import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/db';
import { publicHandle } from '@/lib/handle';

const TMDB = 'https://api.themoviedb.org/3';
const KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_KEY;
const IMG = 'https://image.tmdb.org/t/p';

export async function getTitle(type, id) {
  const t = type === 'tv' ? 'tv' : 'movie';
  const n = parseInt(id, 10);
  if (!n || !KEY) return null;
  const extra = t === 'tv' ? 'credits,videos,watch/providers,recommendations,content_ratings' : 'credits,videos,watch/providers,recommendations,release_dates';
  const r = await fetch(`${TMDB}/${t}/${n}?api_key=${KEY}&append_to_response=${extra}`, { next: { revalidate: 21600 } }).catch(() => null);
  if (!r || !r.ok) return null;
  const d = await r.json();
  if (d.adult) return null;

  const title = d.title || d.name || 'Untitled';
  const date = d.release_date || d.first_air_date || '';
  const year = date.slice(0, 4);
  const runtime = t === 'movie' ? d.runtime : (d.episode_run_time || [])[0];
  const vids = (d.videos?.results || []).filter((v) => v.site === 'YouTube');
  const trailer = vids.find((v) => v.type === 'Trailer' && v.official) || vids.find((v) => v.type === 'Trailer') || vids[0] || null;
  const wp = d['watch/providers']?.results || {};
  const regionKey = ['US', 'GB', 'CA'].find((k) => wp[k]) || Object.keys(wp)[0];
  const region = regionKey ? wp[regionKey] : null;
  const seen = new Set();
  const providers = region ? [...(region.flatrate || []), ...(region.free || []), ...(region.ads || []), ...(region.rent || [])].filter((p) => !seen.has(p.provider_id) && seen.add(p.provider_id)).slice(0, 8).map((p) => ({ name: p.provider_name, logo: `${IMG}/w92${p.logo_path}`, kind: (region.flatrate || []).some((x) => x.provider_id === p.provider_id) ? 'Stream' : (region.rent || []).some((x) => x.provider_id === p.provider_id) ? 'Rent' : 'Free' })) : [];
  let cert = '';
  if (t === 'movie') cert = (d.release_dates?.results || []).find((x) => x.iso_3166_1 === 'US')?.release_dates?.find((x) => x.certification)?.certification || '';
  else cert = (d.content_ratings?.results || []).find((x) => x.iso_3166_1 === 'US')?.rating || '';
  const crew = d.credits?.crew || [];
  const directors = t === 'movie' ? crew.filter((c) => c.job === 'Director').map((c) => c.name) : (d.created_by || []).map((c) => c.name);

  return {
    id: d.id, type: t, title, year, date, runtime: runtime || null, cert,
    overview: d.overview || '',
    tagline: d.tagline || '',
    genres: (d.genres || []).map((g) => g.name),
    rating: d.vote_average ? Number(d.vote_average.toFixed(1)) : null,
    votes: d.vote_count || 0,
    poster: d.poster_path ? `${IMG}/w500${d.poster_path}` : null,
    backdrop: d.backdrop_path ? `${IMG}/w1280${d.backdrop_path}` : null,
    seasons: t === 'tv' ? d.number_of_seasons || null : null,
    directors,
    cast: (d.credits?.cast || []).slice(0, 12).map((c) => ({ name: c.name, character: c.character || '', photo: c.profile_path ? `${IMG}/w185${c.profile_path}` : null })),
    trailer: trailer ? { key: trailer.key, name: trailer.name } : null,
    providers, providerRegion: regionKey || null, providerLink: region?.link || null,
    similar: (d.recommendations?.results || []).filter((m) => m.poster_path && !m.adult).slice(0, 12).map((m) => ({ id: m.id, type: m.media_type === 'tv' || (!m.title && m.name) ? 'tv' : 'movie', title: m.title || m.name, year: (m.release_date || m.first_air_date || '').slice(0, 4), poster: `${IMG}/w342${m.poster_path}` })),
  };
}

// CineScroll members' reviews of this title (top-level only), newest first
export async function getCommunityReviews(movieId) {
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
  const rows = await fetch(`${SUPABASE_URL}/rest/v1/reviews?movie_id=eq.${parseInt(movieId, 10)}&parent_id=is.null&list_id=is.null&order=created_at.desc&limit=6&select=id,user_id,text,rating,created_at`, { headers, next: { revalidate: 3600 } }).then((r) => r.json()).catch(() => []);
  const list = (Array.isArray(rows) ? rows : []).filter((r) => r.text && r.text.trim());
  if (!list.length) return [];
  let users = [];
  try { const res = await clerkClient.users.getUserList({ userId: [...new Set(list.map((r) => r.user_id))], limit: 50 }); users = res?.data || res || []; } catch {}
  const by = Object.fromEntries(users.map((u) => [u.id, u]));
  return list.filter((r) => by[r.user_id]).map((r) => {
    const u = by[r.user_id];
    return { id: r.id, text: r.text.slice(0, 600), rating: r.rating || null, at: r.created_at, name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || 'Member', handle: publicHandle(u), avatar: u.imageUrl || null };
  });
}

// Popular titles for the sitemap
export async function getSitemapTitles() {
  if (!KEY) return [];
  const lists = [
    ...[1, 2, 3, 4, 5].map((p) => ['movie', `${TMDB}/movie/popular?api_key=${KEY}&page=${p}`]),
    ...[1, 2, 3, 4, 5].map((p) => ['movie', `${TMDB}/movie/top_rated?api_key=${KEY}&page=${p}`]),
    ['movie', `${TMDB}/trending/movie/week?api_key=${KEY}`],
    ...[1, 2, 3].map((p) => ['tv', `${TMDB}/tv/popular?api_key=${KEY}&page=${p}`]),
    ...[1, 2, 3].map((p) => ['tv', `${TMDB}/tv/top_rated?api_key=${KEY}&page=${p}`]),
    ['tv', `${TMDB}/trending/tv/week?api_key=${KEY}`],
  ];
  const res = await Promise.all(lists.map(([t, u]) => fetch(u, { next: { revalidate: 86400 } }).then((r) => r.json()).then((d) => (d.results || []).map((m) => ({ type: t, id: m.id, title: m.title || m.name, adult: m.adult }))).catch(() => [])));
  const seen = new Set();
  return res.flat().filter((m) => !m.adult && m.title && !seen.has(`${m.type}${m.id}`) && seen.add(`${m.type}${m.id}`));
}
