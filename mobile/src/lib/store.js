import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth, useUser } from '@clerk/expo';
import { router } from 'expo-router';
import { useApi } from './api';

// Watchlist state shared by every tab, mirroring the web app's handleSave / handleMarkWatched.
const Ctx = createContext(null);

export function WatchlistProvider({ children }) {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const api = useApi();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isSignedIn) { setItems([]); return; }
    setLoading(true);
    try { const d = await api.get('/api/watchlist'); setItems(d.items || []); } catch {}
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  useEffect(() => { refresh(); }, [refresh]);

  const ids = useMemo(() => new Set(items.map((m) => m.movie_id)), [items]);

  const requireAuth = () => { if (!isSignedIn) { router.push('/sign-in'); return false; } return true; };

  const logActivity = (type, movie) =>
    api.post('/api/activity', {
      type, movieId: movie.id, movieTitle: movie.title, moviePoster: movie.poster, movieYear: movie.year,
      movieRating: movie.rating, movieAccent: movie.accent, username: user?.username || user?.firstName || 'user', avatarUrl: user?.imageUrl || null,
    }).catch(() => {});

  const toggleSave = async (movie) => {
    if (!requireAuth()) return false;
    if (ids.has(movie.id)) {
      setItems((p) => p.filter((m) => m.movie_id !== movie.id));
      api.del('/api/watchlist', { movieId: movie.id }).catch(() => {});
      return false;
    }
    setItems((p) => [{ movie_id: movie.id, title: movie.title, year: movie.year, rating: movie.rating, poster: movie.poster, backdrop: movie.backdrop, genre: movie.genre, overview: movie.overview, accent: movie.accent, is_tv: !!movie.isTV, watched: false, saved_at: Date.now() }, ...p]);
    await api.post('/api/watchlist', movie).catch(() => {});
    logActivity('saved', movie);
    return true;
  };

  const toggleWatched = async (movie) => {
    if (!requireAuth()) return;
    const existing = items.find((m) => m.movie_id === movie.id);
    const next = !existing?.watched;
    if (!existing) {
      setItems((p) => [{ movie_id: movie.id, title: movie.title, year: movie.year, rating: movie.rating, poster: movie.poster, backdrop: movie.backdrop, genre: movie.genre, accent: movie.accent, is_tv: !!movie.isTV, watched: true, saved_at: Date.now() }, ...p]);
      await api.post('/api/watchlist', movie).catch(() => {});
    } else {
      setItems((p) => p.map((m) => (m.movie_id === movie.id ? { ...m, watched: next } : m)));
    }
    api.patch('/api/watchlist', { movieId: movie.id, watched: next }).catch(() => {});
    if (next) logActivity('watched', movie);
  };

  const value = { items, ids, loading, refresh, toggleSave, toggleWatched, isWatched: (id) => !!items.find((m) => m.movie_id === id && m.watched) };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useWatchlist = () => useContext(Ctx);

// Convert a saved watchlist row into the movie shape the API/feed uses
export const rowToMovie = (m) => ({
  id: m.movie_id, title: m.title, poster: m.poster, backdrop: m.backdrop, year: m.year, rating: m.rating,
  genre: m.genre, overview: m.overview, accent: m.accent, isTV: !!m.is_tv, mediaType: m.is_tv ? 'tv' : 'movie',
});
