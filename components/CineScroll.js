'use client'; import { useState, useEffect, useRef, useCallback } from 'react'; import { useUser, useClerk } from '@clerk/nextjs';

export default function CineScroll({ movies }) { const [trailerUrl, setTrailerUrl] = useState(null); const longPressTimeout = useRef();

async function fetchTrailer(movieId, isTV=false) { const type = isTV ? 'tv' : 'movie'; const url = https://api.themoviedb.org/3/${type}/${movieId}/videos?api_key=${process.env.TMDB_API_KEY}; try { const res = await fetch(url); const data = await res.json(); const trailer = data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube'); return trailer ? https://www.youtube.com/embed/${trailer.key}?autoplay=1 : null; } catch (e) { console.error(e); return null; } }

const handleMouseDown = (movie) => { longPressTimeout.current = setTimeout(async () => { const url = await fetchTrailer(movie.movie_id, movie.is_tv); if (url) setTrailerUrl(url); else alert('No trailer available'); }, 600); };

const handleMouseUp = () => clearTimeout(longPressTimeout.current);

function TrailerOverlay({ url, onClose }) { if (!url) return null; return ( <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.9)', display:'flex', alignItems:'center', justifyContent:'center' }} > <iframe
width="80%" height="80%"
src={url}
title="Trailer"
frameBorder="0"
allow="autoplay; fullscreen"
allowFullScreen
/> </div> ); }

return ( <div style={{ display: 'flex', overflowX: 'scroll', gap: '1rem' }}> {movies.map((movie) => ( <div key={movie.movie_id} onMouseDown={() => handleMouseDown(movie)} onMouseUp={handleMouseUp} onTouchStart={() => handleMouseDown(movie)} onTouchEnd={handleMouseUp} style={{ cursor: 'pointer', flex: '0 0 auto' }} > <img src={movie.poster_url} alt={movie.title} style={{ width: '150px', borderRadius: '8px' }} /> <p style={{ textAlign: 'center', marginTop: '0.5rem' }}>{movie.title}</p> </div> ))}

{trailerUrl && <TrailerOverlay url={trailerUrl} onClose={() => setTrailerUrl(null)} />}
</div>

); }
