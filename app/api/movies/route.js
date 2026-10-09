const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

const GENRE_MAP = {
  28: 'Action', 18: 'Drama', 35: 'Comedy', 27: 'Horror', 878: 'Sci-Fi',
  10749: 'Romance', 53: 'Thriller', 16: 'Animation', 99: 'Documentary',
  80: 'Crime', 14: 'Fantasy', 9648: 'Mystery', 10752: 'War', 37: 'Western',
  12: 'Adventure', 10751: 'Family', 36: 'History',
  // TV-only genre ids
  10759: 'Action', 10765: 'Sci-Fi', 10768: 'War', 10762: 'Kids', 10764: 'Reality',
};

// Genre name -> TMDB ids for movie and TV discover
const NAME_TO_IDS = {
  Action: { movie: 28, tv: 10759 }, Adventure: { movie: 12, tv: 10759 }, Drama: { movie: 18, tv: 18 },
  Comedy: { movie: 35, tv: 35 }, Horror: { movie: 27 }, 'Sci-Fi': { movie: 878, tv: 10765 },
  Romance: { movie: 10749 }, Thriller: { movie: 53 }, Animation: { movie: 16, tv: 16 },
  Documentary: { movie: 99, tv: 99 }, Crime: { movie: 80, tv: 80 }, Fantasy: { movie: 14, tv: 10765 },
  Mystery: { movie: 9648, tv: 9648 }, War: { movie: 10752, tv: 10768 }, Western: { movie: 37, tv: 37 },
  Family: { movie: 10751, tv: 10751 }, History: { movie: 36 },
};

// ── Seeded randomness so each session walks its own path through TMDB's catalogue ──
function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Page n (1-based) of a seeded permutation of 1..max — consecutive pages never repeat a source page
function permPage(seed, tag, max, n) {
  const r = rng(hashStr(`${seed}|${tag}`));
  const arr = Array.from({ length: max }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr[(n - 1) % max];
}
function seededShuffle(list, seed) {
  const r = rng(seed);
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const keyOf = (m) => `${m.title ? 'm' : 't'}${m.id}`;
const primaryGenre = (m) => (m.genre_ids || [])[0] || 0;

// Order so neighbouring cards rarely share a primary genre or a media type run > 2
function diversify(items) {
  const pool = [...items];
  const out = [];
  while (pool.length) {
    const last = out[out.length - 1];
    const prev = out[out.length - 2];
    let idx = pool.findIndex((m) => {
      if (!last) return true;
      if (primaryGenre(m) && primaryGenre(m) === primaryGenre(last)) return false;
      const isTv = !m.title;
      if (prev && isTv === !last.title && isTv === !prev.title) return false;
      return true;
    });
    if (idx < 0) idx = 0;
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

// Per-title accent colours, ordered so neighbouring cards never share a hue family.
// '#E6E6EA' is the noir look: black card, silver-white highlights.
const ACCENTS = [
  '#F5A623', '#818CF8', '#2DD4BF', '#FF6B8A',
  '#A3E635', '#E6E6EA', '#B07FEF', '#38BDF8', '#FDBA74',
  '#E87AAA', '#50C8D4', '#E8C84A', '#7C9CFF',
  '#86EFAC', '#F0ABFC', '#E6E6EA', '#FF7A2F', '#7BC8FF',
  '#C4922A', '#5EEAD4',
];

const GRADS = [
  'linear-gradient(170deg,#0a0500 0%,#2e1c00 50%,#7a4800 100%)',
  'linear-gradient(170deg,#080300 0%,#200d00 50%,#6b2800 100%)',
  'linear-gradient(170deg,#060310 0%,#120830 50%,#3d1f7a 100%)',
  'linear-gradient(170deg,#060000 0%,#1c0505 50%,#5c1212 100%)',
  'linear-gradient(170deg,#00060d 0%,#001428 50%,#0a3352 100%)',
  'linear-gradient(170deg,#050300 0%,#150e00 50%,#3d2800 100%)',
  'linear-gradient(170deg,#000600 0%,#081508 50%,#1a4a1a 100%)',
  'linear-gradient(170deg,#080005 0%,#200010 50%,#6b0a35 100%)',
];

const CERT_MAP = {
  G: 'G', PG: 'PG', 'PG-13': 'PG-13', R: 'R', 'NC-17': 'NC-17',
  'TV-Y': 'TV-Y', 'TV-G': 'TV-G', 'TV-PG': 'TV-PG', 'TV-14': 'TV-14', 'TV-MA': 'TV-MA',
  U: 'U', '12A': '12A', 12: '12', 15: '15', 18: '18', NR: 'NR', UR: 'UR',
};

// TMDB watch provider IDs (US region)
const PROVIDER_IDS = {
  netflix: 8,
  prime: 9,
  'disney+': 337,
  'apple tv+': 350,
  max: 1899,
  hulu: 15,
};

function truncateDescription(text, maxWords = 28) {
  if (!text) return 'No description available.';
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(' ') + '…';
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatItem(m, i, cert = '') {
  const isTV = !m.title;
  const releaseDate = m.release_date || m.first_air_date || '';
  const genreIds = m.genre_ids || (m.genres || []).map((g) => g.id) || [];
  return {
    id: m.id,
    title: m.title || m.name || 'Untitled',
    year: (m.release_date || m.first_air_date || '').split('-')[0],
    rating: m.vote_average ? m.vote_average.toFixed(1) : 'N/A',
    votes: m.vote_count >= 1000 ? `${(m.vote_count / 1000).toFixed(0)}K` : String(m.vote_count || 0),
    genre: genreIds.map((id) => GENRE_MAP[id]).filter(Boolean).slice(0, 2),
    genreIds,
    overview: truncateDescription(m.overview, 28),
    backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : null,
    poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
    accent: ACCENTS[i % ACCENTS.length],
    gradient: GRADS[i % GRADS.length],
    isTV,
    mediaType: isTV ? 'tv' : 'movie',
    certification: cert,
    releaseDate: releaseDate || null,
    // Anything releasing after today gets the "Coming Soon" card treatment in the feed
    isUpcoming: !!releaseDate && releaseDate > todayISO(),
  };
}

async function getMovieCert(id, isTV) {
  try {
    if (isTV) {
      const res = await fetch(`${TMDB_BASE}/tv/${id}/content_ratings?api_key=${TMDB_KEY}`);
      const data = await res.json();
      const us = (data.results || []).find((r) => r.iso_3166_1 === 'US');
      return us?.rating || '';
    }
    const res = await fetch(`${TMDB_BASE}/movie/${id}/release_dates?api_key=${TMDB_KEY}`);
    const data = await res.json();
    const us = (data.results || []).find((r) => r.iso_3166_1 === 'US');
    const cert = us?.release_dates?.find((d) => d.certification)?.certification || '';
    return CERT_MAP[cert] || cert;
  } catch {
    return '';
  }
}

function normalizeMood(mood) {
  const m = (mood || 'trending').toLowerCase().trim();
  if (m === 'top rated' || m === 'toprated') return 'top rated';
  if (m === 'hidden gems' || m === 'hiddengems') return 'hidden gems';
  if (m === 'coming soon' || m === 'upcoming') return 'upcoming';
  if (m === 'recently added' || m === 'recent') return 'new';
  if (m === 'award winners' || m === 'awards') return 'awards';
  if (m === 'international') return 'international';
  if (m === 'new') return 'new';
  return 'trending';
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mood = normalizeMood(searchParams.get('mood') || 'trending');
  const genre = searchParams.get('genre') || '';
  const search = searchParams.get('search') || '';
  const page = searchParams.get('page') || '1';
  const similar = searchParams.get('similar') || '';
  const similarType = searchParams.get('similarType') || 'movie';
  const similarGenres = searchParams.get('similarGenres') || '';
  const providerRaw = (searchParams.get('provider') || '').toLowerCase().trim();
  const providerId =
    searchParams.get('providerId') ||
    PROVIDER_IDS[providerRaw] ||
    PROVIDER_IDS[providerRaw.replace(/\s+/g, '')] ||
    '';
  const popularOnly = searchParams.get('popular') === '1';


  try {
    // ── POPULAR SEARCHES (rotating trending picks) ──
    if (popularOnly) {
      const p = Math.floor(Math.random() * 5) + 1;
      const [movRes, tvRes] = await Promise.all([
        fetch(`${TMDB_BASE}/trending/movie/day?api_key=${TMDB_KEY}&page=${p}`),
        fetch(`${TMDB_BASE}/trending/tv/day?api_key=${TMDB_KEY}&page=${p}`),
      ]);
      const movData = await movRes.json().catch(() => ({ results: [] }));
      const tvData = await tvRes.json().catch(() => ({ results: [] }));
      const pool = shuffle([
        ...(movData.results || []).filter((m) => m.poster_path),
        ...(tvData.results || []).filter((m) => m.poster_path),
      ]).slice(0, 8);
      return Response.json({
        movies: pool.map((m, i) => formatItem(m, i)),
      });
    }

    // ── SIMILAR ──
    // Scored blend of: franchise entries, TMDB "recommendations" (what fans watched next),
    // TMDB "similar", and keyword/genre discovery. Every candidate gets a score + a human reason.
    if (similar) {
      const itemId = parseInt(similar, 10);
      const type = similarType === 'tv' ? 'tv' : 'movie';
      const get = (url) => fetch(url).then((r) => r.json()).catch(() => ({}));

      const detail = await get(
        `${TMDB_BASE}/${type}/${itemId}?api_key=${TMDB_KEY}&append_to_response=keywords,recommendations,similar`
      );
      const srcGenres = new Set([
        ...(detail.genres || []).map((g) => g.id),
        ...similarGenres.split(',').filter(Boolean).map(Number),
      ]);
      const srcKeywords = (detail.keywords?.keywords || detail.keywords?.results || []).slice(0, 6);
      const srcYear = parseInt((detail.release_date || detail.first_air_date || '').slice(0, 4), 10) || null;
      const srcLang = detail.original_language;
      const isAnim = srcGenres.has(16);
      const isDoc = srcGenres.has(99);

      const kwParam = srcKeywords.map((k) => k.id).join('|'); // | = OR
      const mainGenres = [...srcGenres].filter((g) => g !== 16 && g !== 99).slice(0, 2);
      const [rec2, kwDisc, genreDisc, collection] = await Promise.all([
        get(`${TMDB_BASE}/${type}/${itemId}/recommendations?api_key=${TMDB_KEY}&page=2`),
        kwParam
          ? get(`${TMDB_BASE}/discover/${type}?api_key=${TMDB_KEY}&with_keywords=${kwParam}&sort_by=popularity.desc&vote_count.gte=80`)
          : Promise.resolve({}),
        mainGenres.length
          ? get(`${TMDB_BASE}/discover/${type}?api_key=${TMDB_KEY}&with_genres=${mainGenres.join(',')}&sort_by=vote_average.desc&vote_count.gte=500${srcYear ? `&${type === 'tv' ? 'first_air_date' : 'primary_release_date'}.gte=${srcYear - 12}-01-01` : ''}`)
          : Promise.resolve({}),
        type === 'movie' && detail.belongs_to_collection?.id
          ? get(`${TMDB_BASE}/collection/${detail.belongs_to_collection.id}?api_key=${TMDB_KEY}`)
          : Promise.resolve({}),
      ]);

      const cands = new Map();
      const add = (m, source, rank) => {
        if (!m || m.id === itemId || (!m.poster_path && !m.backdrop_path)) return;
        const c = cands.get(m.id) || { m, sources: {} };
        if (c.sources[source] == null || rank < c.sources[source]) c.sources[source] = rank;
        cands.set(m.id, c);
      };
      (collection.parts || []).forEach((m, i) => add(m, 'franchise', i));
      [...(detail.recommendations?.results || []), ...(rec2.results || [])].forEach((m, i) => add(m, 'rec', i));
      (detail.similar?.results || []).forEach((m, i) => add(m, 'similar', i));
      (kwDisc.results || []).forEach((m, i) => add(m, 'keywords', i));
      (genreDisc.results || []).forEach((m, i) => add(m, 'genre', i));

      const today = new Date().toISOString().slice(0, 10);
      const scored = [];
      for (const { m, sources } of cands.values()) {
        const gIds = m.genre_ids || [];
        const released = (m.release_date || m.first_air_date || '') <= today;
        const votes = m.vote_count || 0;
        if (!sources.franchise && (!released || votes < 40)) continue;
        const cAnim = gIds.includes(16);
        if (isAnim !== cAnim && !sources.franchise) continue; // don't mix cartoons with live action
        if (!isDoc && gIds.includes(99)) continue;

        const shared = gIds.filter((g) => srcGenres.has(g));
        const genreSim = srcGenres.size ? shared.length / new Set([...srcGenres, ...gIds]).size : 0;
        let score = 0;
        if (sources.franchise != null) score += 60;
        if (sources.rec != null) score += 38 - Math.min(sources.rec, 38) * 0.6;
        if (sources.similar != null) score += 12;
        if (sources.keywords != null) score += 18 - Math.min(sources.keywords, 18) * 0.5;
        if (sources.genre != null) score += 6;
        score += genreSim * 30;
        // Bayesian-ish quality so 9.0 with 12 votes doesn't beat 8.2 with 20k
        const quality = (votes * (m.vote_average || 0) + 200 * 6.5) / (votes + 200);
        score += (quality - 6.5) * 8;
        const y = parseInt((m.release_date || m.first_air_date || '').slice(0, 4), 10);
        if (srcYear && y) score -= Math.min(Math.abs(srcYear - y), 30) * 0.3;
        if (srcLang && m.original_language === srcLang) score += 4;
        if (shared.length === 0 && !sources.franchise && !sources.rec) score -= 25;

        let reason;
        if (sources.franchise != null) reason = 'Same franchise';
        else if (sources.rec != null && sources.rec < 10) reason = 'Fans also watched';
        else if (sources.keywords != null) reason = 'Similar story & themes';
        else if (shared.length) reason = `Also ${shared.map((g) => GENRE_MAP[g]).filter(Boolean).slice(0, 2).join(' · ')}`;
        else reason = 'Fans also watched';

        scored.push({ m, score, reason });
      }

      scored.sort((a, b) => b.score - a.score);
      const top = scored.slice(0, 18);
      const max = top[0]?.score || 1;
      const min = top[top.length - 1]?.score || 0;
      const movies = top.map(({ m, score, reason }, i) => ({
        ...formatItem(m, i),
        isTV: type === 'tv',
        mediaType: type,
        matchReason: reason,
        // Spread into a friendly 68–98% range
        match: Math.round(68 + ((score - min) / Math.max(1, max - min)) * 30),
      }));
      return Response.json({
        source: {
          title: detail.title || detail.name,
          backdrop: detail.backdrop_path ? `https://image.tmdb.org/t/p/w780${detail.backdrop_path}` : null,
          keywords: srcKeywords.slice(0, 4).map((k) => k.name),
        },
        movies,
      });
    }

    // ── SEARCH ──
    if (search) {
      const [movRes, tvRes] = await Promise.all([
        fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(search)}&page=1`),
        fetch(`${TMDB_BASE}/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(search)}&page=1`),
      ]);
      const movData = await movRes.json();
      const tvData = await tvRes.json();
      const combined = [
        ...(movData.results || []).filter((m) => m.backdrop_path || m.poster_path).slice(0, 8),
        ...(tvData.results || []).filter((m) => m.backdrop_path || m.poster_path).slice(0, 8),
      ]
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 16);
      return Response.json({ movies: combined.map((m, i) => formatItem(m, i)) });
    }

    // ── MAIN FEED ──
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const seed = searchParams.get('seed') || String(Math.floor(Math.random() * 1e9));
    const P = (tag, max) => permPage(seed, `${mood}|${genre}|${providerId}|${tag}`, max, pageNum);
    const exclude = new Set((searchParams.get('exclude') || '').split(',').filter(Boolean));
    const taste = (searchParams.get('taste') || '').split(',').map((t) => t.trim()).filter((t) => NAME_TO_IDS[t]).slice(0, 4);
    const avoid = new Set((searchParams.get('avoid') || '').split(',').map((t) => NAME_TO_IDS[t.trim()]?.movie).filter(Boolean));
    const today = todayISO();
    const monthsAgo = (n) => { const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString().slice(0, 10); };

    const genreQ = genre ? `&with_genres=${genre}` : '';
    const providerQ = providerId
      ? `&with_watch_providers=${providerId}&watch_region=US&with_watch_monetization_types=flatrate`
      : '';
    const D = (type, q) => `${TMDB_BASE}/discover/${type}?api_key=${TMDB_KEY}&include_adult=false${q}`;
    const L = (path, pg) => `${TMDB_BASE}/${path}?api_key=${TMDB_KEY}&page=${pg}`;

    // Each source: url, how many to take, and minimum votes for quality
    let sources = [];
    const src = (url, take, minVotes = 100, minRating = 5.8) => sources.push({ url, take, minVotes, minRating });

    if (providerId) {
      const sort = mood === 'top rated' ? 'vote_average.desc' : mood === 'new' || mood === 'upcoming' ? 'primary_release_date.desc' : 'popularity.desc';
      src(D('movie', `${genreQ}${providerQ}&vote_count.gte=50&sort_by=${sort}&page=${P('a', 20)}`), 8, 50);
      src(D('movie', `${genreQ}${providerQ}&vote_count.gte=300&sort_by=vote_average.desc&page=${P('b', 20)}`), 4, 300, 6.8);
      src(D('tv', `${genreQ}${providerQ}&vote_count.gte=30&sort_by=popularity.desc&page=${P('c', 15)}`), 6, 30);
    } else if (mood === 'upcoming') {
      src(D('movie', `${genreQ}&primary_release_date.gte=${today}&sort_by=popularity.desc&page=${P('a', 8)}`), 12, 0, 0);
      src(L('movie/upcoming', P('b', 6)), 5, 0, 0);
      src(D('tv', `${genreQ}&first_air_date.gte=${today}&sort_by=popularity.desc&page=${P('c', 5)}`), 4, 0, 0);
    } else if (mood === 'international') {
      src(D('movie', `${genreQ}&with_original_language=ko&sort_by=popularity.desc&vote_count.gte=100&page=${P('a', 15)}`), 4);
      src(D('movie', `${genreQ}&with_original_language=ja|es|fr|hi|de|it|pt|zh|th|tr|da|sv|no&sort_by=popularity.desc&vote_count.gte=80&page=${P('b', 25)}`), 6, 80);
      src(D('movie', `${genreQ}&without_original_language=en&sort_by=vote_average.desc&vote_count.gte=400&page=${P('c', 25)}`), 4, 400, 7);
      src(D('tv', `${genreQ}&with_original_language=ko|ja|es|fr|hi|de|tr&sort_by=popularity.desc&vote_count.gte=50&page=${P('d', 15)}`), 5, 50);
    } else if (mood === 'awards') {
      src(D('movie', `${genreQ}&sort_by=vote_average.desc&vote_count.gte=3000&vote_average.gte=7.5&page=${P('a', 20)}`), 8, 3000, 7.5);
      src(L('movie/top_rated', P('b', 40)), 5, 1000, 7.5);
      src(D('tv', `${genreQ}&sort_by=vote_average.desc&vote_count.gte=800&vote_average.gte=7.8&page=${P('c', 15)}`), 5, 500, 7.5);
    } else if (mood === 'top rated') {
      src(D('movie', `${genreQ}&sort_by=vote_average.desc&vote_count.gte=1000&vote_average.gte=7&page=${P('a', 40)}`), 9, 500, 7);
      src(D('movie', `${genreQ}&sort_by=vote_count.desc&vote_average.gte=7.4&page=${P('b', 30)}`), 4, 500, 7);
      src(D('tv', `${genreQ}&sort_by=vote_average.desc&vote_count.gte=300&vote_average.gte=7.5&page=${P('c', 20)}`), 5, 200, 7);
    } else if (mood === 'new') {
      src(D('movie', `${genreQ}&primary_release_date.gte=${monthsAgo(4)}&primary_release_date.lte=${today}&sort_by=popularity.desc&vote_count.gte=20&page=${P('a', 10)}`), 9, 20);
      src(L('movie/now_playing', P('b', 6)), 4, 20);
      src(D('tv', `${genreQ}&first_air_date.gte=${monthsAgo(4)}&first_air_date.lte=${today}&sort_by=popularity.desc&vote_count.gte=10&page=${P('c', 8)}`), 6, 10);
    } else if (mood === 'hidden gems') {
      src(D('movie', `${genreQ}&vote_average.gte=7.3&vote_count.gte=300&vote_count.lte=4000&sort_by=vote_average.desc&page=${P('a', 30)}`), 8, 300, 7.2);
      src(D('movie', `${genreQ}&vote_average.gte=7.0&vote_count.gte=200&vote_count.lte=2500&sort_by=popularity.desc&primary_release_date.gte=${monthsAgo(60)}&page=${P('b', 20)}`), 5, 200, 7);
      src(D('tv', `${genreQ}&vote_average.gte=7.5&vote_count.gte=100&vote_count.lte=2000&sort_by=vote_average.desc&page=${P('c', 20)}`), 5, 100, 7.4);
    } else if (genre) {
      // Trending within a genre
      src(D('movie', `${genreQ}&sort_by=popularity.desc&vote_count.gte=200&vote_average.gte=6&page=${P('a', 25)}`), 7, 200, 6);
      src(D('movie', `${genreQ}&sort_by=vote_count.desc&vote_average.gte=6.8&page=${P('b', 30)}`), 4, 500, 6.8);
      src(D('movie', `${genreQ}&primary_release_date.gte=${monthsAgo(18)}&sort_by=popularity.desc&vote_count.gte=80&page=${P('c', 8)}`), 3, 80, 6);
      const tvGenre = NAME_TO_IDS[GENRE_MAP[genre]]?.tv;
      if (tvGenre) src(D('tv', `&with_genres=${tvGenre}&sort_by=popularity.desc&vote_count.gte=100&page=${P('d', 15)}`), 4, 100, 6.5);
    } else {
      // Default "For you" feed: a blend so it never feels like the same chart on repeat
      src(L('trending/movie/week', P('tw', 12)), 4, 150, 6);
      src(L('trending/tv/week', P('tt', 10)), 3, 100, 6.5);
      if (pageNum <= 3) src(L('trending/movie/day', P('td', 4)), 2, 50, 6);
      src(D('movie', `&sort_by=popularity.desc&vote_count.gte=400&vote_average.gte=6.4&page=${P('pop', 30)}`), 3, 400, 6.4);
      src(D('movie', `&sort_by=vote_count.desc&vote_average.gte=7.2&page=${P('acc', 40)}`), 2, 1500, 7.2);
      src(D('movie', `&primary_release_date.gte=${monthsAgo(18)}&primary_release_date.lte=${today}&sort_by=popularity.desc&vote_count.gte=150&page=${P('fresh', 10)}`), 2, 150, 6.2);
      if (pageNum % 2 === 0) src(D('movie', `&vote_average.gte=7.4&vote_count.gte=300&vote_count.lte=3000&sort_by=vote_average.desc&page=${P('gem', 30)}`), 2, 300, 7.3);
      // Taste: rotate through the genres this person saves most
      if (taste.length) {
        const t1 = taste[(pageNum - 1) % taste.length];
        const t2 = taste[pageNum % taste.length];
        src(D('movie', `&with_genres=${NAME_TO_IDS[t1].movie}&sort_by=popularity.desc&vote_count.gte=250&vote_average.gte=6.4&page=${P('t1' + t1, 20)}`), 3, 250, 6.4);
        if (NAME_TO_IDS[t2].tv) src(D('tv', `&with_genres=${NAME_TO_IDS[t2].tv}&sort_by=popularity.desc&vote_count.gte=150&vote_average.gte=7&page=${P('t2' + t2, 12)}`), 2, 150, 7);
        src(D('movie', `&with_genres=${NAME_TO_IDS[t2].movie}&sort_by=vote_count.desc&vote_average.gte=7&page=${P('t3' + t2, 25)}`), 2, 800, 7);
      }
    }

    const results = await Promise.all(
      sources.map((s) => fetch(s.url, { next: { revalidate: 1800 } }).then((r) => r.json()).catch(() => ({ results: [] })))
    );

    const used = new Set();
    const picked = [];
    const leftovers = [];
    sources.forEach((s, si) => {
      const rows = seededShuffle(results[si]?.results || [], hashStr(`${seed}|${pageNum}|${si}`)).filter((m) => {
        if (!(m.backdrop_path || m.poster_path) || !m.overview) return false;
        if ((m.vote_count || 0) < s.minVotes || (m.vote_average || 0) < s.minRating) return false;
        if (exclude.has(keyOf(m)) || exclude.has(String(m.id))) return false;
        return true;
      });
      let took = 0;
      for (const m of rows) {
        const k = keyOf(m);
        if (used.has(k)) continue;
        // Soft-avoid genres the person keeps dismissing (unless it's what they asked for)
        if (!genre && avoid.has(primaryGenre(m)) && Math.random() < 0.75) continue;
        if (took < s.take) { used.add(k); picked.push(m); took++; } else leftovers.push(m);
      }
    });
    // Top up from leftovers if quality filters left us short
    for (const m of leftovers) {
      if (picked.length >= 18) break;
      const k = keyOf(m);
      if (!used.has(k)) { used.add(k); picked.push(m); }
    }

    const interleaved = diversify(seededShuffle(picked, hashStr(`${seed}|mix|${pageNum}`))).slice(0, 20);

    // ── Mix a couple of upcoming releases into the default feed ──
    // Only for the plain Trending feed (no platform/genre filter), so filtered feeds stay pure.
    if (!providerId && !genre && mood === 'trending' && pageNum % 2 === 1) {
      try {
        const upPage = permPage(seed, 'up', 5, Math.ceil(pageNum / 2));
        const upRes = await fetch(
          `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&primary_release_date.gte=${todayISO()}&sort_by=popularity.desc&with_original_language=en&page=${upPage}`
        );
        const upData = await upRes.json();
        const seen = new Set([...interleaved.map((m) => m.id), ...[...exclude].map((k) => Number(String(k).replace(/^[mt]/, '')))]);
        const picks = shuffle(
          (upData.results || []).filter(
            (m) => m.backdrop_path && m.overview && m.release_date > todayISO() && !seen.has(m.id)
          )
        ).slice(0, 2);
        // Positions 3 and 8 — far enough apart to feel like a surprise, not an ad block
        picks.forEach((m, idx) => {
          const pos = Math.min(3 + idx * 5, interleaved.length);
          interleaved.splice(pos, 0, m);
        });
      } catch (e) {
        console.error('upcoming injection failed', e);
      }
    }

    const certPromises = interleaved.slice(0, 8).map((m) => getMovieCert(m.id, !m.title));
    const certs = await Promise.all(certPromises);
    const formatted = interleaved.map((m, i) => formatItem(m, i, certs[i] || ''));
    return Response.json({ movies: formatted });
  } catch (err) {
    console.error(err);
    return Response.json({ movies: [], error: 'Failed to fetch' }, { status: 500 });
  }
}
