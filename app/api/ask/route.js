import { auth } from '@clerk/nextjs/server';
import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/db';
import { parseAsk } from '@/lib/askParse';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

// GET /api/ask?q=funny 90s movie on Netflix  → { understood, chips, movies:[…feed movies with `why`] }
// Free: plain-language parsing + TMDB. No paid AI.

const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB = 'https://api.themoviedb.org/3';
const GENRE_MAP = { 28: 'Action', 18: 'Drama', 35: 'Comedy', 27: 'Horror', 878: 'Sci-Fi', 10749: 'Romance', 53: 'Thriller', 16: 'Animation', 99: 'Documentary', 80: 'Crime', 14: 'Fantasy', 9648: 'Mystery', 10752: 'War', 37: 'Western', 12: 'Adventure', 10751: 'Family', 36: 'History', 10759: 'Action', 10765: 'Sci-Fi', 10768: 'War', 10762: 'Kids', 10764: 'Reality' };
const IDS = { Action: { movie: 28, tv: 10759 }, Adventure: { movie: 12, tv: 10759 }, Drama: { movie: 18, tv: 18 }, Comedy: { movie: 35, tv: 35 }, Horror: { movie: 27, tv: 9648 }, 'Sci-Fi': { movie: 878, tv: 10765 }, Romance: { movie: 10749, tv: 18 }, Thriller: { movie: 53, tv: 80 }, Animation: { movie: 16, tv: 16 }, Documentary: { movie: 99, tv: 99 }, Crime: { movie: 80, tv: 80 }, Fantasy: { movie: 14, tv: 10765 }, Mystery: { movie: 9648, tv: 9648 }, War: { movie: 10752, tv: 10768 }, Western: { movie: 37, tv: 37 }, Family: { movie: 10751, tv: 10751 }, History: { movie: 36, tv: 18 } };
const ACCENTS = ['#F5A623', '#818CF8', '#2DD4BF', '#FF6B8A', '#A3E635', '#B07FEF', '#38BDF8', '#FDBA74', '#E87AAA', '#50C8D4', '#E8C84A', '#7C9CFF', '#86EFAC', '#F0ABFC', '#FF7A2F', '#7BC8FF', '#5EEAD4'];
const PROVIDER_NAMES = { 8: 'Netflix', 9: 'Prime Video', 337: 'Disney+', 350: 'Apple TV+', 1899: 'Max', 15: 'Hulu', 531: 'Paramount+', 386: 'Peacock', 283: 'Crunchyroll' };

const tmdb = (path, params = {}) => {
  const q = new URLSearchParams({ api_key: TMDB_KEY, ...params });
  return fetch(`${TMDB}${path}?${q}`, { next: { revalidate: 3600 } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
};
const today = () => new Date().toISOString().slice(0, 10);
const trim = (t, n = 28) => { const w = String(t || '').trim().split(/\s+/); return w.length <= n ? w.join(' ') : `${w.slice(0, n).join(' ')}…`; };
const fmtRt = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`);

function format(m, i, type) {
  const isTV = type ? type === 'tv' : !m.title;
  const rd = m.release_date || m.first_air_date || '';
  const genreIds = m.genre_ids || (m.genres || []).map((g) => g.id);
  return {
    id: m.id, title: m.title || m.name || 'Untitled', year: rd.split('-')[0],
    rating: m.vote_average ? m.vote_average.toFixed(1) : 'N/A',
    votes: m.vote_count >= 1000 ? `${(m.vote_count / 1000).toFixed(0)}K` : String(m.vote_count || 0),
    genre: genreIds.map((g) => GENRE_MAP[g]).filter(Boolean).slice(0, 2), genreIds,
    overview: trim(m.overview), backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : null,
    poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
    accent: ACCENTS[(m.id + i) % ACCENTS.length], gradient: '', isTV, mediaType: isTV ? 'tv' : 'movie', certification: '',
    releaseDate: rd || null, isUpcoming: !!rd && rd > today(),
  };
}

async function watchedIds(userId) {
  if (!userId) return new Set();
  const rows = await fetch(`${SUPABASE_URL}/rest/v1/watchlist?user_id=eq.${encodeURIComponent(userId)}&watched=eq.true&select=movie_id&limit=2000`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, cache: 'no-store' }).then((r) => r.json()).catch(() => []);
  return new Set((Array.isArray(rows) ? rows : []).map((r) => r.movie_id));
}

export async function GET(req) {
  if (!TMDB_KEY) return Response.json({ error: 'Search is not configured' }, { status: 500 });
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  if (!q) return Response.json({ understood: false, chips: [], movies: [] });
  let userId = null; try { userId = auth().userId; } catch {}
  const p = parseAsk(q);
  const seen = await watchedIds(userId);

  // 1) "like X": find X first
  let base = null, baseType = p.type;
  if (p.likeTitle) {
    const r = await tmdb('/search/multi', { query: p.likeTitle, include_adult: 'false' });
    base = (r?.results || []).filter((x) => x.media_type === 'movie' || x.media_type === 'tv').sort((a, b) => (b.popularity || 0) - (a.popularity || 0))[0] || null;
    if (base) {
      baseType = base.media_type;
      if (!/\b(series|show|tv|movie|film)\b/i.test(q)) p.type = baseType;
      const d = await tmdb(`/${baseType}/${base.id}`);
      const rt = d?.runtime || d?.episode_run_time?.[0];
      if (p.shorter && rt) p.maxRuntime = Math.max(80, rt - 20);
      base.title = base.title || base.name;
    }
  }

  // 2) A subject: a person ("with Denzel", "by Nolan"), a topic ("about Steve Jobs", "about chess") or a title
  const words = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 1);
  const covers = (name, subj) => { const n = ` ${words(name).join(' ')} `; return words(subj).every((w) => n.includes(` ${w} `) || n.includes(` ${w.replace(/s$/, '')} `)); };
  let subj = null; // { person, kwIds, kwName, titles }
  if (p.subject && !base) {
    const sq = p.subject;
    const [kwR, peR, muR, muRaw] = await Promise.all([
      tmdb('/search/keyword', { query: sq }),
      tmdb('/search/person', { query: sq, include_adult: 'false' }),
      tmdb('/search/multi', { query: sq, include_adult: 'false' }),
      p.subjectMode === 'any' && q.length < 60 ? tmdb('/search/multi', { query: q, include_adult: 'false' }) : null,
    ]);
    const person = (peR?.results || []).filter((x) => covers(x.name, sq) && (x.popularity || 0) > 0.6).sort((a, b) => (b.popularity || 0) - (a.popularity || 0))[0] || null;
    const kws = (kwR?.results || []).filter((k) => covers(k.name, sq));
    const exact = kws.filter((k) => words(k.name).join(' ') === words(sq).join(' ') || words(k.name).join(' ') === words(sq).map((w) => w.replace(/s$/, '')).join(' '));
    const kwPick = (exact.length ? exact : kws).slice(0, 3);
    const titleHits = [...(muRaw?.results || []), ...(muR?.results || [])]
      .filter((x) => (x.media_type === 'movie' || x.media_type === 'tv') && x.poster_path && (!p.typeExplicit || x.media_type === type0(p)))
      .filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i);
    subj = { person, kwIds: kwPick.map((k) => k.id), kwName: kwPick[0]?.name || sq, titles: titleHits };
  }
  function type0(pp) { return pp.type === 'tv' ? 'tv' : 'movie'; }

  const type = p.type === 'tv' ? 'tv' : 'movie';
  const gid = (names) => [...new Set(names.map((n) => IDS[n]?.[type]).filter(Boolean))];
  const dateKey = type === 'tv' ? 'first_air_date' : 'primary_release_date';
  const params = { include_adult: 'false', language: 'en-US', page: '1' };
  const g = gid(p.genres);
  if (g.length) params.with_genres = g.join(p.anyGenre ? '|' : ',');
  const ng = gid(p.without);
  if (ng.length) params.without_genres = ng.join(',');
  if (p.safe) { params.without_genres = [...new Set([...(params.without_genres ? params.without_genres.split(',') : []), type === 'tv' ? '' : '27'])].filter(Boolean).join(','); if (type === 'movie') { params.certification_country = 'US'; params['certification.lte'] = 'PG-13'; } }
  if (p.keywords.length) params.with_keywords = p.keywords.join('|');
  if (p.yearFrom) params[`${dateKey}.gte`] = `${p.yearFrom}-01-01`;
  if (p.yearTo) params[`${dateKey}.lte`] = `${p.yearTo}-12-31`;
  else params[`${dateKey}.lte`] = today();
  if (p.maxRuntime) params['with_runtime.lte'] = String(p.maxRuntime);
  if (p.minRuntime) params['with_runtime.gte'] = String(p.minRuntime);
  if (p.language) params.with_original_language = p.language;
  if (p.region) params.with_origin_country = p.region;
  const region = /^[A-Za-z]{2}$/.test(searchParams.get('region') || '') ? searchParams.get('region').toUpperCase() : 'US';
  if (p.providers.length) { params.with_watch_providers = p.providers.join('|'); params.watch_region = region; }
  if (p.sort === 'top') { params.sort_by = 'vote_average.desc'; params['vote_count.gte'] = '800'; }
  else if (p.sort === 'hidden') { params.sort_by = 'vote_average.desc'; params['vote_count.gte'] = '60'; params['vote_count.lte'] = '1500'; params['vote_average.gte'] = '7'; }
  else if (p.sort === 'new') { params.sort_by = 'popularity.desc'; params['vote_count.gte'] = '20'; }
  else { params.sort_by = 'popularity.desc'; params['vote_count.gte'] = '120'; }

  let pool = [];
  const nice = (t) => String(t || '').replace(/\b\w/g, (c) => c.toUpperCase());
  if (subj) {
    const sname = nice(p.subject);
    const hasFilters = g.length || p.keywords.length || p.yearFrom || p.yearTo || p.maxRuntime || p.minRuntime || p.language || p.providers.length || p.safe;
    const fit = (m) => (!g.length || (m.genre_ids || []).some((x) => g.includes(x))) && (!p.yearFrom || ((m.release_date || m.first_air_date || '').slice(0, 4) >= String(p.yearFrom))) && (!p.yearTo || ((m.release_date || m.first_air_date || '9999').slice(0, 4) <= String(p.yearTo)));
    const loose = { ...params }; delete loose['vote_count.gte']; loose['vote_count.gte'] = '5';
    const tasks = [];
    // People: in it / made it
    if (subj.person && (p.subjectMode === 'cast' || p.subjectMode === 'crew' || (p.subjectMode === 'any' && !subj.kwIds.length))) {
      const dept = subj.person.known_for_department;
      const crew = p.subjectMode === 'crew' || (p.subjectMode === 'any' && dept && dept !== 'Acting');
      const key = crew ? 'with_crew' : 'with_cast';
      tasks.push(tmdb(`/discover/${type}`, { ...loose, [key]: String(subj.person.id), sort_by: p.sort === 'top' ? 'vote_average.desc' : 'popularity.desc' })
        .then((d) => (d?.results || []).map((m) => ({ m, why: `${crew ? (dept === 'Writing' ? 'Written by' : 'Directed by') : 'With'} ${subj.person.name}`, rank: 1 }))));
    }
    // Topic: TMDB keywords (e.g. "steve jobs", "chess", "dog")
    if (subj.kwIds.length && p.subjectMode !== 'cast' && p.subjectMode !== 'crew') {
      const kp = { ...loose, with_keywords: [...subj.kwIds, ...p.keywords].join(p.keywords.length ? ',' : '|'), sort_by: 'popularity.desc' };
      tasks.push(Promise.all([tmdb(`/discover/${type}`, kp), !p.typeExplicit ? tmdb(`/discover/${type === 'tv' ? 'movie' : 'tv'}`, (({ with_genres, ...o }) => o)(kp)) : null])
        .then(([a1, a2]) => [...(a1?.results || []), ...((a2?.results || []).map((m) => ({ ...m, media_type: type === 'tv' ? 'movie' : 'tv' })))].map((m) => ({ m, why: `About ${nice(subj.kwName)}`, rank: 0 }))));
    }
    const lists = await Promise.all(tasks);
    // Titles that match the words directly (e.g. "Steve Jobs" (2015), "Jobs" (2013))
    const titled = subj.titles.filter((m) => covers(m.title || m.name, p.subject) || p.subjectMode === 'any').slice(0, 8).map((m) => ({ m, why: covers(m.title || m.name, p.subject) ? `Matches “${sname}”` : 'Matches your search', rank: -1 }));
    const merged = [...titled, ...lists.flat()].sort((a, b) => a.rank - b.rank);
    pool = hasFilters ? [...merged.filter(({ m }) => fit(m)), ...merged.filter(({ m }) => !fit(m))] : merged;
    if (!pool.length && !hasFilters) {
      // Nothing about it on TMDB — fall back to a plain text search so we never show unrelated picks
      const r = await tmdb('/search/multi', { query: q, include_adult: 'false' });
      pool = (r?.results || []).filter((x) => x.media_type === 'movie' || x.media_type === 'tv').map((m) => ({ m, why: 'Closest match' }));
    }
    if (subj.person && !p.chips.some((c) => c.includes(subj.person.name))) p.chips.unshift(p.subjectMode === 'about' ? `About ${subj.person.name}` : p.subjectMode === 'crew' ? `By ${subj.person.name}` : `With ${subj.person.name}`);
    else if (!p.chips.length || p.subjectMode === 'about') p.chips.unshift(p.subjectMode === 'about' ? `About ${sname}` : `“${sname}”`);
  }
  if (subj && !pool.length && !(g.length || p.keywords.length || p.yearFrom || p.yearTo || p.providers.length)) {
    return Response.json({ understood: false, chips: p.chips, movies: [], note: `Couldn’t find anything for “${p.subject}” — try different words.` });
  }
  if (subj && pool.length) {
    // keep going to formatting below with this pool
  } else if (base) {
    // Titles like X: TMDB recommendations, then keep the ones that also fit the rest of the request
    const [r1, r2] = await Promise.all([tmdb(`/${baseType}/${base.id}/recommendations`, { page: '1' }), tmdb(`/${baseType}/${base.id}/recommendations`, { page: '2' })]);
    const recs = [...(r1?.results || []), ...(r2?.results || [])];
    const hasFilters = g.length || ng.length || p.keywords.length || p.yearFrom || p.yearTo || p.maxRuntime || p.minRuntime || p.language || p.providers.length || p.safe;
    if (!hasFilters) pool = recs.map((m) => ({ m, why: `Like ${base.title}` }));
    else {
      // Use X's genres as the backbone, plus the extra filters; favour titles TMDB also recommends
      const bd = await tmdb(`/${baseType}/${base.id}`);
      const baseG = (bd?.genres || []).map((x) => x.id).slice(0, 2);
      const dp = { ...params };
      if (!dp.with_genres && baseG.length && baseType === type) dp.with_genres = baseG.join(',');
      const [d1, d2] = await Promise.all([tmdb(`/discover/${type}`, dp), tmdb(`/discover/${type}`, { ...dp, page: '2' })]);
      const recIds = new Set(recs.map((m) => m.id));
      const found = [...(d1?.results || []), ...(d2?.results || [])];
      pool = found.sort((a, b) => (recIds.has(b.id) ? 1 : 0) - (recIds.has(a.id) ? 1 : 0)).map((m) => ({ m, why: recIds.has(m.id) ? `Like ${base.title}` : `Same feel as ${base.title}` }));
    }
    pool = pool.filter(({ m }) => m.id !== base.id);
  } else {
    const [d1, d2] = await Promise.all([tmdb(`/discover/${type}`, params), tmdb(`/discover/${type}`, { ...params, page: '2' })]);
    pool = [...(d1?.results || []), ...(d2?.results || [])].map((m) => ({ m, why: '' }));
    // Too strict? relax the softest filters once
    if (pool.length < 6 && (params.with_keywords || params['with_runtime.lte'])) {
      const loose = { ...params }; delete loose.with_keywords; if (p.keywords.length && !g.length) delete loose.with_genres; loose['vote_count.gte'] = '30';
      const d3 = await tmdb(`/discover/${type}`, loose);
      pool = [...pool, ...(d3?.results || []).map((m) => ({ m, why: '' }))];
    }
  }

  // Build a short "why it fits" line from what they asked for
  const facets = p.chips.filter((c) => !/^Like /.test(c));
  const out = [];
  const ids = new Set();
  for (const { m, why } of pool) {
    if (!m.poster_path || ids.has(m.id) || seen.has(m.id)) continue;
    ids.add(m.id);
    const item = format(m, out.length, m.media_type ? (m.media_type === 'tv' ? 'tv' : 'movie') : type === 'tv' || (!m.title && m.name) ? 'tv' : 'movie');
    const bits = [why, ...facets.filter((f) => !/^(Series|Recent|Classic|Highly rated|Popular)$/.test(f)).slice(0, 3)].filter(Boolean);
    if (p.providers.length === 1) bits.push(`On ${PROVIDER_NAMES[p.providers[0]] || 'your service'}`);
    item.why = [...new Set(bits)].slice(0, 3).join(' · ') || `${item.genre.join(' · ')}${item.year ? ` · ${item.year}` : ''}`;
    item._votes = m.vote_count || 0;
    out.push(item);
    if (out.length >= 40) break;
  }
  // Trailers first: check which picks actually have a YouTube trailer, put those on top, and drop
  // near-empty listings (no trailer, hardly any votes) when there are enough good ones
  const vids = await Promise.all(out.map((it) => tmdb(`/${it.mediaType}/${it.id}/videos`).then((d) => (d?.results || []).some((v) => v.site === 'YouTube' && v.key && /Trailer|Teaser|Clip/.test(v.type || ''))).catch(() => false)));
  out.forEach((it, i) => { it.hasTrailer = vids[i]; });
  const good = out.filter((it) => it.hasTrailer || it._votes >= 25);
  const ranked = (good.length >= 8 ? good : out).map((it, i) => ({ it, i })).sort((a, b) => (b.it.hasTrailer - a.it.hasTrailer) || (a.i - b.i)).map((x) => x.it).slice(0, 24);
  out.length = 0; out.push(...ranked.map(({ _votes, ...it }) => it));
  // Fill in the runtime for the top few when length mattered
  if ((p.maxRuntime || p.minRuntime) && out.length) {
    await Promise.all(out.slice(0, 10).map(async (it) => {
      const d = await tmdb(`/${it.mediaType}/${it.id}`);
      const rt = d?.runtime || d?.episode_run_time?.[0];
      if (rt) it.why = `${it.why}${it.why ? ' · ' : ''}${fmtRt(rt)}`;
    }));
  }

  return Response.json({ understood: p.understood || !!base, mode: subj ? 'subject' : undefined, chips: p.chips, base: base ? { id: base.id, title: base.title, type: baseType } : null, movies: out });
}
