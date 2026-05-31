const TMDB_KEY = process.env.TMDB_API_KEY; const TMDB_BASE = 'https://api.themoviedb.org/3';

const GENRE_MAP = { 28:'Action',18:'Drama',35:'Comedy',27:'Horror',878:'Sci-Fi', 10749:'Romance',53:'Thriller',16:'Animation',99:'Documentary', 80:'Crime',14:'Fantasy',9648:'Mystery',10752:'War',37:'Western', };

const ACCENTS = [ '#F5A623','#FF7A2F','#B07FEF','#D45050', '#4DA8DA','#C4922A','#6BBF6B','#E87AAA', '#50C8D4','#E8C84A','#FF6B8A','#7BC8FF', ];

const GRADS = [ 'linear-gradient(170deg,#0a0500 0%,#2e1c00 50%,#7a4800 100%)', 'linear-gradient(170deg,#080300 0%,#200d00 50%,#6b2800 100%)', 'linear-gradient(170deg,#060310 0%,#120830 50%,#3d1f7a 100%)', 'linear-gradient(170deg,#060000 0%,#1c0505 50%,#5c1212 100%)', 'linear-gradient(170deg,#00060d 0%,#001428 50%,#0a3352 100%)', 'linear-gradient(170deg,#050300 0%,#150e00 50%,#3d2800 100%)', 'linear-gradient(170deg,#000600 0%,#081508 50%,#1a4a1a 100%)', 'linear-gradient(170deg,#080005 0%,#200010 50%,#6b0a35 100%)', ];

function truncateDescription(text, maxWords = 28) { if (!text) return 'No description available.'; const words = text.trim().split(/\s+/); if (words.length <= maxWords) return text.trim(); return words.slice(0, maxWords).join(' ') + '…'; }

function formatItem(m, i) { const isTV = !m.title; const genreIds = m.genre_ids || (m.genres || []).map(g => g.id) || []; return { id: m.id, title: m.title || m.name || 'Untitled', year: (m.release_date || m.first_air_date || '').split('-')[0], rating: m.vote_average ? m.vote_average.toFixed(1) : 'N/A', votes: m.vote_count >= 1000 ? ${(m.vote_count/1000).toFixed(0)}K : String(m.vote_count || 0), genre: genreIds.map(id => GENRE_MAP[id]).filter(Boolean).slice(0, 2), genreIds, overview: truncateDescription(m.overview, 28), backdrop: m.backdrop_path ? https://image.tmdb.org/t/p/original${m.backdrop_path} : null, poster: m.poster_path ? https://image.tmdb.org/t/p/w500${m.poster_path} : null, accent: ACCENTS[i % ACCENTS.length], gradient: GRADS[i % GRADS.length], isTV, mediaType: isTV ? 'tv' : 'movie', }; }

export async function GET(request) { const { searchParams } = new URL(request.url); const mood = searchParams.get('mood') || 'trending'; const genre = searchParams.get('genre') || ''; const search = searchParams.get('search') || ''; const page = searchParams.get('page') || '1'; const similar = searchParams.get('similar') || ''; const similarType = searchParams.get('similarType') || 'movie'; const similarGenres = searchParams.get('similarGenres') || '';

const randomOffset = page === '1' ? Math.floor(Math.random() * 8) + 1 : parseInt(page);

try { // SIMILAR, SEARCH, MAIN FEED logic here (unchanged)

return Response.json({ movies: [] }); // placeholder response for structure

} catch (err) { console.error(err); return Response.json({ movies: [], error: 'Failed to fetch' }, { status: 500 }); } }
