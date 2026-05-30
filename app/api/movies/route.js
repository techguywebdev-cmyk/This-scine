const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

const GENRE_MAP = {
  28:'Action',18:'Drama',35:'Comedy',27:'Horror',878:'Sci-Fi',
  10749:'Romance',53:'Thriller',16:'Animation',99:'Documentary',
  80:'Crime',14:'Fantasy',9648:'Mystery',10752:'War',37:'Western',
};

const ACCENTS = [
  '#F5A623','#FF7A2F','#B07FEF','#D45050',
  '#4DA8DA','#C4922A','#6BBF6B','#E87AAA',
  '#50C8D4','#E8C84A','#FF6B8A','#7BC8FF',
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

function truncateDescription(text, maxWords = 28) {
  if (!text) return 'No description available.';
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(' ') + '…';
}

function formatItem(m, i) {
  const isTV = !m.title;
  const genreIds = m.genre_ids || (m.genres || []).map(g => g.id) || [];
  return {
    id: m.id,
    title: m.title || m.name || 'Untitled',
    year: (m.release_date || m.first_air_date || '').split('-')[0],
    rating: m.vote_average ? m.vote_average.toFixed(1) : 'N/A',
    votes: m.vote_count >= 1000 ? `${(m.vote_count/1000).toFixed(0)}K` : String(m.vote_count || 0),
    genre: genreIds.map(id => GENRE_MAP[id]).filter(Boolean).slice(0, 2),
    genreIds,
    overview: truncateDescription(m.overview, 28),
    backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : null,
    poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
    accent: ACCENTS[i % ACCENTS.length],
    gradient: GRADS[i % GRADS.length],
    isTV,
    mediaType: isTV ? 'tv' : 'movie',
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mood = searchParams.get('mood') || 'trending';
  const genre = searchParams.get('genre') || '';
  const search = searchParams.get('search') || '';
  const page = searchParams.get('page') || '1';
  const similar = searchParams.get('similar') || '';
  const similarType = searchParams.get('similarType') || 'movie';
  const similarGenres = searchParams.get('similarGenres') || '';

  const randomOffset = page === '1' ? Math.floor(Math.random() * 8) + 1 : parseInt(page);

  try {

    // ── SIMILAR: multi-signal approach ──────────────────────────────────────
    if (similar) {
      const itemId = parseInt(similar);

      // Fetch full details, keywords, and recommendations in parallel
      const [detailRes, keywordRes, recMovieRes, recTvRes] = await Promise.all([
        fetch(`${TMDB_BASE}/${similarType}/${itemId}?api_key=${TMDB_KEY}`),
        fetch(`${TMDB_BASE}/${similarType}/${itemId}/keywords?api_key=${TMDB_KEY}`),
        fetch(`${TMDB_BASE}/${similarType}/${itemId}/recommendations?api_key=${TMDB_KEY}&page=1`),
        // Also try the other type in case it's misidentified
        fetch(`${TMDB_BASE}/${similarType === 'tv' ? 'movie' : 'tv'}/${itemId}/recommendations?api_key=${TMDB_KEY}&page=1`),
      ]);

      const detail = await detailRes.json().catch(() => ({}));
      const keywordData = await keywordRes.json().catch(() => ({ keywords: [], results: [] }));
      const recMovieData = await recMovieRes.json().catch(() => ({ results: [] }));
      const recTvData = await recTvRes.json().catch(() => ({ results: [] }));

      // Get genre IDs from multiple sources
      const detailGenreIds = (detail.genres || []).map(g => g.id);
      const passedGenreIds = similarGenres.split(',').filter(Boolean).map(Number);
      const allGenreIds = [...new Set([...detailGenreIds, ...passedGenreIds])];

      // Get keywords for better matching
      const keywords = (keywordData.keywords || keywordData.results || [])
        .slice(0, 3).map(k => k.id);

      // Build discover URLs using genre + keyword signals
      const genreParam = allGenreIds.slice(0, 3).join(',');
      const keywordParam = keywords.join(',');

      const discoverBase = genreParam
        ? `${TMDB_BASE}/discover/${similarType}?api_key=${TMDB_KEY}&with_genres=${genreParam}&sort_by=vote_average.desc&vote_count.gte=100`
        : `${TMDB_BASE}/discover/${similarType}?api_key=${TMDB_KEY}&sort_by=popularity.desc&vote_count.gte=100`;

      const [discoverRes, discoverRes2, crossTypeRes] = await Promise.all([
        fetch(discoverBase + (keywordParam ? `&with_keywords=${keywordParam}` : '') + '&page=1'),
        fetch(discoverBase + '&page=2'),
        // Cross-search: if it's a movie look for similar TV shows too
        genreParam
          ? fetch(`${TMDB_BASE}/discover/${similarType === 'tv' ? 'movie' : 'tv'}?api_key=${TMDB_KEY}&with_genres=${genreParam}&sort_by=vote_average.desc&vote_count.gte=100&page=1`)
          : fetch(`${TMDB_BASE}/trending/${similarType}/week?api_key=${TMDB_KEY}`),
      ]);

      const discoverData = await discoverRes.json().catch(() => ({ results: [] }));
      const discoverData2 = await discoverRes2.json().catch(() => ({ results: [] }));
      const crossTypeData = await crossTypeRes.json().catch(() => ({ results: [] }));

      // Pool all results, remove the source item, deduplicate
      const allResults = [
        ...(recMovieData.results || []),
        ...(recTvData.results || []),
        ...(discoverData.results || []),
        ...(discoverData2.results || []),
        ...(crossTypeData.results || []),
      ];

      const seen = new Set([itemId]);
      const unique = allResults.filter(m => {
        const id = m.id;
        if (seen.has(id)) return false;
        if (!m.backdrop_path && !m.poster_path) return false;
        if ((m.vote_average || 0) < 5) return false;
        seen.add(id);
        return true;
      });

      // Sort by rating × popularity for best results first
      unique.sort((a, b) => {
        const scoreA = (a.vote_average || 0) * Math.log(Math.max(a.vote_count || 1, 1));
        const scoreB = (b.vote_average || 0) * Math.log(Math.max(b.vote_count || 1, 1));
        return scoreB - scoreA;
      });

      return Response.json({ movies: unique.slice(0, 14).map((m, i) => formatItem(m, i)) });
    }

    // ── SEARCH ──────────────────────────────────────────────────────────────
    if (search) {
      const [movRes, tvRes] = await Promise.all([
        fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(search)}&page=1`),
        fetch(`${TMDB_BASE}/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(search)}&page=1`),
      ]);
      const movData = await movRes.json();
      const tvData = await tvRes.json();
      const combined = [
        ...(movData.results || []).slice(0, 6),
        ...(tvData.results || []).slice(0, 6),
      ].filter(m => m.backdrop_path || m.poster_path).slice(0, 12);
      return Response.json({ movies: combined.map((m, i) => formatItem(m, i)) });
    }

    // ── MAIN FEED ────────────────────────────────────────────────────────────
    let movieUrl, tvUrl;
    if (genre) {
      movieUrl = `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&with_genres=${genre}&sort_by=popularity.desc&vote_count.gte=100&page=${randomOffset}`;
      tvUrl = `${TMDB_BASE}/discover/tv?api_key=${TMDB_KEY}&with_genres=${genre}&sort_by=popularity.desc&vote_count.gte=50&page=${randomOffset}`;
      if (mood === 'top rated') {
        movieUrl = `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&with_genres=${genre}&sort_by=vote_average.desc&vote_count.gte=500&page=${randomOffset}`;
        tvUrl = `${TMDB_BASE}/discover/tv?api_key=${TMDB_KEY}&with_genres=${genre}&sort_by=vote_average.desc&vote_count.gte=200&page=${randomOffset}`;
      } else if (mood === 'new') {
        const year = new Date().getFullYear();
        movieUrl = `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&with_genres=${genre}&sort_by=release_date.desc&vote_count.gte=20&primary_release_year=${year}&page=${randomOffset}`;
        tvUrl = `${TMDB_BASE}/discover/tv?api_key=${TMDB_KEY}&with_genres=${genre}&sort_by=first_air_date.desc&vote_count.gte=10&first_air_date_year=${year}&page=${randomOffset}`;
      } else if (mood === 'hidden gems') {
        movieUrl = `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&with_genres=${genre}&vote_average.gte=7&vote_count.lte=5000&vote_count.gte=200&sort_by=vote_average.desc&page=${randomOffset}`;
        tvUrl = `${TMDB_BASE}/discover/tv?api_key=${TMDB_KEY}&with_genres=${genre}&vote_average.gte=7&vote_count.lte=2000&vote_count.gte=100&sort_by=vote_average.desc&page=${randomOffset}`;
      }
    } else {
      if (mood === 'trending') {
        movieUrl = `${TMDB_BASE}/trending/movie/week?api_key=${TMDB_KEY}&page=${randomOffset}`;
        tvUrl = `${TMDB_BASE}/trending/tv/week?api_key=${TMDB_KEY}&page=${randomOffset}`;
      } else if (mood === 'top rated') {
        movieUrl = `${TMDB_BASE}/movie/top_rated?api_key=${TMDB_KEY}&page=${randomOffset}`;
        tvUrl = `${TMDB_BASE}/tv/top_rated?api_key=${TMDB_KEY}&page=${randomOffset}`;
      } else if (mood === 'new') {
        movieUrl = `${TMDB_BASE}/movie/now_playing?api_key=${TMDB_KEY}&page=${randomOffset}`;
        tvUrl = `${TMDB_BASE}/tv/on_the_air?api_key=${TMDB_KEY}&page=${randomOffset}`;
      } else {
        movieUrl = `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&vote_average.gte=7&vote_count.lte=5000&vote_count.gte=500&sort_by=vote_average.desc&page=${randomOffset}`;
        tvUrl = `${TMDB_BASE}/discover/tv?api_key=${TMDB_KEY}&vote_average.gte=7&vote_count.lte=2000&vote_count.gte=200&sort_by=vote_average.desc&page=${randomOffset}`;
      }
    }

    const [movRes, tvRes] = await Promise.all([fetch(movieUrl), fetch(tvUrl)]);
    const movData = await movRes.json();
    const tvData = await tvRes.json();

    const movies = (movData.results || []).filter(m => m.backdrop_path || m.poster_path).slice(0, 8);
    const shows = (tvData.results || []).filter(m => m.backdrop_path || m.poster_path).slice(0, 4);

    const interleaved = [];
    let mi = 0, ti = 0;
    while (interleaved.length < 12 && (mi < movies.length || ti < shows.length)) {
      if (mi < movies.length) interleaved.push(movies[mi++]);
      if (mi < movies.length) interleaved.push(movies[mi++]);
      if (ti < shows.length) interleaved.push(shows[ti++]);
    }

    return Response.json({ movies: interleaved.map((m, i) => formatItem(m, i)) });

  } catch (err) {
    console.error(err);
    return Response.json({ movies: [], error: 'Failed to fetch' }, { status: 500 });
  }
                   }
