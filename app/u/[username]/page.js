'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import { UserProfileSheet, InlinePlayer, track } from '../../../components/cine/shared';

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
  const { openSignIn, openSignUp } = useClerk();
  const [owner, setOwner] = useState(null);
  useEffect(() => {
    fetch(`/api/users/${encodeURIComponent(username)}`).then((r) => (r.ok ? r.json() : null)).then((d) => d && setOwner(d)).catch(() => {});
    track('invite_open', { to: String(username).slice(0, 40) });
  }, [username]);
  const ownerName = (owner?.display_name || owner?.username || 'A friend').split(' ')[0];

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
      {!isSignedIn && (
        <div style={{ position: 'fixed', left: 12, right: 12, bottom: 'calc(12px + env(safe-area-inset-bottom))', zIndex: 500, maxWidth: 520, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px 12px 16px', borderRadius: 18, background: 'rgba(10,10,16,0.72)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fff' }}>{ownerName} invited you to CineScroll</div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>Join to see what you both want to watch</div>
          </div>
          <button onClick={() => openSignUp ? openSignUp({ redirectUrl: typeof window !== 'undefined' ? window.location.href : '/' }) : openSignIn()} style={{ flexShrink: 0, height: 40, padding: '0 16px', borderRadius: 20, border: 'none', background: '#fff', color: '#07070F', fontFamily: 'inherit', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Join free</button>
        </div>
      )}
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
