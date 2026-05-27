const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mood = searchParams.get('mood') || 'trending';
  const genre = searchParams.get('genre') || '';
  const search = searchParams.get('search') || '';

  try {
    let url;
    if (search) {
      url = `${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(search)}`;
    } else if (mood === 'trending') {
      url = `${TMDB_BASE}/trending/movie/week?api_key=${TMDB_KEY}`;
    } else if (mood === 'top rated') {
      url = `${TMDB_BASE}/movie/top_rated?api_key=${TMDB_KEY}`;
    } else if (mood === 'new') {
      url = `${TMDB_BASE}/movie/now_playing?api_key=${TMDB_KEY}`;
    } else {
      url = `${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&vote_average.gte=7&vote_count.lte=5000&sort_by=vote_average.desc`;
    }
    if (genre) url += `&with_genres=${genre}`;

    const res = await fetch(url);
    const data = await res.json();

    const GENRE_MAP = {28:'Action',18:'Drama',35:'Comedy',27:'Horror',878:'Sci-Fi',10749:'Romance',53:'Thriller',16:'Animation',99:'Documentary',80:'Crime'};
    const ACCENTS = ['#F5A623','#FF7A2F','#B07FEF','#D45050','#4DA8DA','#C4922A','#6BBF6B','#E87AAA','#50C8D4','#E8C84A','#FF6B8A','#7BC8FF'];
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

    const movies = (data.results || [])
      .filter(m => m.backdrop_path || m.poster_path)
      .slice(0, 12)
      .map((m, i) => ({
        id: m.id,
        title: m.title || m.name || 'Untitled',
        year: (m.release_date || '').split('-')[0],
        rating: m.vote_average?.toFixed(1) || 'N/A',
        votes: m.vote_count >= 1000 ? `${(m.vote_count/1000).toFixed(0)}K` : String(m.vote_count || 0),
        genre: (m.genre_ids||[]).map(id => GENRE_MAP[id]).filter(Boolean).slice(0,2),
        overview: m.overview || 'No description available.',
        backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : null,
        poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
        accent: ACCENTS[i % ACCENTS.length],
        gradient: GRADS[i % GRADS.length],
      }));

    return Response.json({ movies });
  } catch (err) {
    return Response.json({ movies: [], error: 'Failed' }, { status: 500 });
  }
}
