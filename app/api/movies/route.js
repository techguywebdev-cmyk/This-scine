const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

const GENRE_MAP = {
  28: 'Action', 18: 'Drama', 35: 'Comedy', 27: 'Horror', 878: 'Sci-Fi',
  10749: 'Romance', 53: 'Thriller', 16: 'Animation', 99: 'Documentary',
  80: 'Crime', 14: 'Fantasy', 9648: 'Mystery', 10752: 'War', 37: 'Western',
};

const ACCENTS = [
  '#F5A623', '#FF7A2F', '#B07FEF', '#D45050',
  '#4DA8DA', '#C4922A', '#6BBF6B', '#E87AAA',
  '#50C8D4', '#E8C84A', '#FF6B8A', '#7BC8FF',
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

  const randomPage = Math.floor(Math.random() * 12) + 1;
  const randomPage2 = Math.floor(Math.random() * 8) + 1;

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
    const pageNum = parseInt(page, 10) || 1;
    const useRandom = pageNum === 1;
    const p1 = useRandom ? randomPage : pageNum;
    const p2 = useRandom ? randomPage2 : Math.max(1, pageNum - 1);

    let movieUrls = [];
    let tvUrls = [];
    const genreQ = genre ? `&with_genres=${genre}` : '';
    const providerQ = providerId
      ? `&with_watch_providers=${providerId}&watch_region=US&with_watch_monetization_types=flatrate`
      : '';

    if (providerId) {
      // Platform-specific feed (still respects mood + genre when set)
      const sort =
        mood === 'top rated'
          ? 'vote_average.desc'
          : mood === 'new' || mood === 'upcoming'
            ? 'primary_release_date.desc'
            : 'popularity.desc';
      const base = `${genreQ}${providerQ}&vote_count.gte=50`;
      movieUrls = [
        `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}${base}&sort_by=${sort}&page=${p1}`,
        `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}${base}&sort_by=popularity.desc&page=${p2}`,
      ];
      tvUrls = [
        `${TMDB_BASE}/discover/tv?api_key=${TMDB_KEY}${genreQ}${providerQ}&vote_count.gte=30&sort_by=popularity.desc&page=${p1}`,
      ];
    } else if (mood === 'upcoming') {
      movieUrls = [
        `${TMDB_BASE}/movie/upcoming?api_key=${TMDB_KEY}&page=${p1}`,
        `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}${genreQ}&primary_release_date.gte=${new Date().toISOString().slice(0, 10)}&sort_by=popularity.desc&page=${p2}`,
      ];
      tvUrls = [
        `${TMDB_BASE}/tv/on_the_air?api_key=${TMDB_KEY}&page=${p1}`,
        `${TMDB_BASE}/discover/tv?api_key=${TMDB_KEY}${genreQ}&sort_by=first_air_date.desc&page=${p2}`,
      ];
    } else if (mood === 'international') {
      // Non-English titles that are currently hot
      movieUrls = [
        `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}${genreQ}&with_original_language=ko&sort_by=popularity.desc&vote_count.gte=100&page=${p1}`,
        `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}${genreQ}&with_original_language=ja|es|fr|hi|de|it|pt|zh|th|tr&sort_by=popularity.desc&vote_count.gte=80&page=${p2}`,
        `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}${genreQ}&with_original_language=es&sort_by=vote_average.desc&vote_count.gte=200&page=${Math.floor(Math.random() * 3) + 1}`,
      ];
      tvUrls = [
        `${TMDB_BASE}/discover/tv?api_key=${TMDB_KEY}${genreQ}&with_original_language=ko|ja|es|fr|hi&sort_by=popularity.desc&vote_count.gte=50&page=${p1}`,
      ];
    } else if (mood === 'awards') {
      // High-rated, critically acclaimed
      movieUrls = [
        `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}${genreQ}&sort_by=vote_average.desc&vote_count.gte=5000&vote_average.gte=7.5&page=${p1}`,
        `${TMDB_BASE}/movie/top_rated?api_key=${TMDB_KEY}&page=${p2}`,
      ];
      tvUrls = [
        `${TMDB_BASE}/tv/top_rated?api_key=${TMDB_KEY}&page=${p1}`,
        `${TMDB_BASE}/discover/tv?api_key=${TMDB_KEY}${genreQ}&sort_by=vote_average.desc&vote_count.gte=1000&vote_average.gte=7.5&page=${p2}`,
      ];
    } else if (mood === 'top rated') {
      if (genre) {
        movieUrls = [
          `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}${genreQ}&sort_by=vote_average.desc&vote_count.gte=500&vote_average.gte=7&page=${p1}`,
          `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}${genreQ}&sort_by=vote_average.desc&vote_count.gte=300&page=${p2}`,
        ];
        tvUrls = [
          `${TMDB_BASE}/discover/tv?api_key=${TMDB_KEY}${genreQ}&sort_by=vote_average.desc&vote_count.gte=200&vote_average.gte=7&page=${p1}`,
        ];
      } else {
        movieUrls = [
          `${TMDB_BASE}/movie/top_rated?api_key=${TMDB_KEY}&page=${p1}`,
          `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&sort_by=vote_average.desc&vote_count.gte=2000&page=${p2}`,
        ];
        tvUrls = [`${TMDB_BASE}/tv/top_rated?api_key=${TMDB_KEY}&page=${p1}`];
      }
    } else if (mood === 'new') {
      const year = new Date().getFullYear();
      if (genre) {
        movieUrls = [
          `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}${genreQ}&primary_release_year=${year}&sort_by=popularity.desc&page=${p1}`,
          `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}${genreQ}&primary_release_year=${year}&sort_by=primary_release_date.desc&page=${p2}`,
        ];
        tvUrls = [
          `${TMDB_BASE}/discover/tv?api_key=${TMDB_KEY}${genreQ}&first_air_date_year=${year}&sort_by=popularity.desc&page=${p1}`,
        ];
      } else {
        movieUrls = [
          `${TMDB_BASE}/movie/now_playing?api_key=${TMDB_KEY}&page=${p1}`,
          `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&sort_by=popularity.desc&primary_release_year=${year}&page=${p2}`,
        ];
        tvUrls = [
          `${TMDB_BASE}/tv/on_the_air?api_key=${TMDB_KEY}&page=${p1}`,
          `${TMDB_BASE}/discover/tv?api_key=${TMDB_KEY}&sort_by=popularity.desc&first_air_date_year=${year}&page=${p2}`,
        ];
      }
    } else if (mood === 'hidden gems') {
      movieUrls = [
        `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}${genreQ}&vote_average.gte=7.5&vote_count.lte=5000&vote_count.gte=400&sort_by=vote_average.desc&page=${p1}`,
        `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}${genreQ}&vote_average.gte=7.6&vote_count.lte=3000&vote_count.gte=250&sort_by=vote_count.desc&page=${p2}`,
      ];
      tvUrls = [
        `${TMDB_BASE}/discover/tv?api_key=${TMDB_KEY}${genreQ}&vote_average.gte=7.5&vote_count.lte=2000&vote_count.gte=150&sort_by=vote_average.desc&page=${p1}`,
      ];
    } else {
      // trending — what's hot / everyone talking about
      if (genre) {
        movieUrls = [
          `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}${genreQ}&sort_by=popularity.desc&vote_count.gte=200&vote_average.gte=6&page=${p1}`,
          `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}${genreQ}&sort_by=vote_count.desc&vote_average.gte=6&page=${p2}`,
        ];
        tvUrls = [
          `${TMDB_BASE}/discover/tv?api_key=${TMDB_KEY}${genreQ}&sort_by=popularity.desc&vote_count.gte=100&page=${p1}`,
        ];
      } else {
        movieUrls = [
          `${TMDB_BASE}/trending/movie/week?api_key=${TMDB_KEY}&page=${Math.min(p1, 5)}`,
          `${TMDB_BASE}/trending/movie/day?api_key=${TMDB_KEY}&page=${Math.min(p2, 5)}`,
          `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&sort_by=popularity.desc&vote_count.gte=300&vote_average.gte=6&page=${Math.floor(Math.random() * 5) + 1}`,
        ];
        tvUrls = [
          `${TMDB_BASE}/trending/tv/week?api_key=${TMDB_KEY}&page=${Math.min(p1, 5)}`,
          `${TMDB_BASE}/trending/tv/day?api_key=${TMDB_KEY}&page=${Math.min(p2, 5)}`,
        ];
      }
    }

    const allFetches = [...movieUrls, ...tvUrls].map((url) =>
      fetch(url)
        .then((r) => r.json())
        .catch(() => ({ results: [] }))
    );
    const allResults = await Promise.all(allFetches);

    const movieResults = allResults.slice(0, movieUrls.length).flatMap((d) => d.results || []);
    const tvResults = allResults.slice(movieUrls.length).flatMap((d) => d.results || []);

    // Upcoming can have lower vote counts
    const minVotesMovie = mood === 'upcoming' || mood === 'new' ? 20 : 100;
    const minVotesTv = mood === 'upcoming' || mood === 'new' ? 10 : 50;
    const minRating = mood === 'upcoming' ? 0 : 5.5;

    const filterFn = (m, minVotes) =>
      (m.backdrop_path || m.poster_path) &&
      (m.vote_average || 0) >= minRating &&
      (m.vote_count || 0) >= minVotes;

    const movies = shuffle(movieResults.filter((m) => filterFn(m, minVotesMovie))).slice(0, 12);
    const shows = shuffle(tvResults.filter((m) => filterFn(m, minVotesTv))).slice(0, 6);

    const interleaved = [];
    let mi = 0;
    let ti = 0;
    while (interleaved.length < 15 && (mi < movies.length || ti < shows.length)) {
      if (mi < movies.length) interleaved.push(movies[mi++]);
      if (mi < movies.length) interleaved.push(movies[mi++]);
      if (ti < shows.length) interleaved.push(shows[ti++]);
    }

    // ── Mix a couple of upcoming releases into the default feed ──
    // Only for the plain Trending feed (no platform/genre filter), so filtered feeds stay pure.
    if (!providerId && !genre && mood === 'trending') {
      try {
        const upPage = 1 + Math.floor(Math.random() * 3);
        const upRes = await fetch(
          `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&primary_release_date.gte=${todayISO()}&sort_by=popularity.desc&with_original_language=en&page=${upPage}`
        );
        const upData = await upRes.json();
        const seen = new Set(interleaved.map((m) => m.id));
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
