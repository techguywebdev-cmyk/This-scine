'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import { UserProfileSheet, InlinePlayer } from '../../../components/CineScroll';

// Public share page for a profile, e.g. this-scine.vercel.app/u/somehandle
// Reuses the same UserProfileSheet + InlinePlayer used inside the app's modal flow,
// so it always stays visually and functionally in sync with the in-app experience.
// Works for logged-out visitors too (GET /api/users/[userId] doesn't require auth) -
// a visitor without an account can browse the profile and watch trailers, but is
// prompted to sign in if they try to save something to a watchlist.
export default function PublicProfilePage({ params }) {
  const router = useRouter();
  const { username } = params;
  const { isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();

  const [trailerMovie, setTrailerMovie] = useState(null);
  const [watchlistIds, setWatchlistIds] = useState(new Set());

  // Mirrors the main app's handleSave so "Add to Watchlist" works identically
  // from a shared profile page, for any signed-in visitor (not just the profile owner).
  const handleSave = useCallback(async (movie) => {
    if (!isSignedIn) { openSignIn(); return; }
    const already = watchlistIds.has(movie.id);
    if (already) {
      setWatchlistIds(p => { const n = new Set(p); n.delete(movie.id); return n; });
      await fetch('/api/watchlist', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ movieId: movie.id }) }).catch(() => {});
    } else {
      setWatchlistIds(p => new Set([...p, movie.id]));
      await fetch('/api/watchlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(movie) }).catch(() => {});
      fetch('/api/activity', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'saved', movieId: movie.id, movieTitle: movie.title, moviePoster: movie.poster, movieYear: movie.year, movieRating: movie.rating, movieAccent: movie.accent, username: user?.username || user?.firstName || 'user', avatarUrl: user?.imageUrl || null }),
      }).catch(() => {});
    }
  }, [isSignedIn, openSignIn, watchlistIds, user]);

  return (
    <div style={{ minHeight: '100vh', background: '#07070F' }}>
      <UserProfileSheet
        userId={username}
        accent="#FFB800"
        onClose={() => router.push('/')}
        onWatchTrailer={(movie) => setTrailerMovie(movie)}
        onAddToWatchlist={handleSave}
      />
      {trailerMovie && (
        <InlinePlayer
          movie={trailerMovie}
          onClose={() => setTrailerMovie(null)}
          accent={trailerMovie.accent || '#FFB800'}
          onSave={handleSave}
          isSaved={watchlistIds.has(trailerMovie.id)}
          initialTab={trailerMovie.initialTab}
          highlightCommentId={trailerMovie.highlightCommentId}
        />
      )}
    </div>
  );
}
