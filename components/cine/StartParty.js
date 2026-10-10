'use client';
import { useEffect, useMemo, useState } from 'react';
import { T, ambient, SvgIcon, track } from './shared';

// "🍿 Watch with…" — one picker used everywhere a film appears.
// Opened via: window.dispatchEvent(new CustomEvent('cine:watch-with', { detail: { movie } }))
//   or with { candidates: [movie…], label } to pick a film from a folder/watchlist first.
const glass = { background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.14)' };
const eyebrow = (c) => ({ fontSize: 10.5, letterSpacing: 2.2, textTransform: 'uppercase', fontWeight: 700, color: c });

// Normalise the different movie shapes used around the app
export const toPartyMovie = (m) => ({
  id: m.id ?? m.movie_id,
  title: m.title || m.movie_title || 'Untitled',
  poster: m.poster || m.movie_poster || null,
  backdrop: m.backdrop || null,
  year: m.year || m.movie_year || null,
  rating: m.rating || m.movie_rating || null,
  is_tv: !!(m.is_tv || m.isTV || m.mediaType === 'tv' || m.media_type === 'tv'),
  accent: m.accent || m.movie_accent || null,
});

export function StartPartySheet({ movie: movieIn, candidates, label, accent = '#F5A623', onClose }) {
  const pool = useMemo(() => (candidates || []).map(toPartyMovie).filter((m) => m.id), [candidates]);
  const pickFrom = (avoid) => { const opts = pool.filter((m) => m.id !== avoid); const src = opts.length ? opts : pool; return src[Math.floor(Math.random() * src.length)] || null; };
  const [movie, setMovie] = useState(() => (movieIn ? toPartyMovie(movieIn) : pickFrom(null)));
  const [friends, setFriends] = useState(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!movie?.id) return;
    setFriends(null);
    fetch(`/api/together?movie=${encodeURIComponent(movie.id)}`, { cache: 'no-store' }).then((r) => r.json()).then((d) => setFriends(d.friends || [])).catch(() => setFriends([]));
  }, [movie?.id]);
  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev; }; }, []);

  const start = async (f) => {
    if (busy || !movie) return;
    setBusy(f.user_id); setErr(null);
    try {
      const r = await fetch('/api/party', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', with: f.user_id, movie }) });
      const d = await r.json();
      if (!r.ok || !d.party?.id) throw new Error(d.error || 'Could not start the party');
      track('party_start', { from: candidates ? 'pick' : 'title' });
      window.dispatchEvent(new CustomEvent('cine:open-party', { detail: { id: d.party.id } }));
      onClose();
    } catch (e) { setErr(e.message); setBusy(null); }
  };

  const shown = (friends || []).filter((f) => !q.trim() || `${f.display_name} ${f.username}`.toLowerCase().includes(q.trim().toLowerCase()));
  const anySaved = (friends || []).some((f) => f.alsoSaved);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 390, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)' }} />
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 391, maxWidth: 560, margin: '0 auto', maxHeight: '86dvh', display: 'flex', flexDirection: 'column', background: ambient(accent), borderRadius: '22px 22px 0 0', borderTop: `1px solid ${T.hairline}`, animation: 'spUp .3s cubic-bezier(0.22,1,0.36,1)', color: '#fff' }}>
        <style>{`@keyframes spUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes spIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}`}</style>
        <div style={{ padding: '10px 20px 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.3)', margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {movie && (
              <div key={movie.id} style={{ width: 54, aspectRatio: '2/3', borderRadius: 3, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.06)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', animation: 'spIn .3s ease' }}>
                {movie.poster && <img src={movie.poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={eyebrow(accent)}>{candidates ? (label || 'Picked for you') : 'Watch party'}</div>
              <div style={{ fontFamily: T.serif, fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4, lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{movie ? `Watch ${movie.title} with…` : 'Nothing to pick from yet'}</div>
            </div>
            <button onClick={onClose} aria-label="Close" style={{ ...glass, width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}><SvgIcon name="close" size={14} color="#fff" /></button>
          </div>
          {candidates && pool.length > 1 && (
            <button onClick={() => setMovie(pickFrom(movie?.id))} style={{ marginTop: 12, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6 }}>🎲 Pick another</button>
          )}
          {friends && friends.length > 6 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, ...glass, borderRadius: 20, padding: '0 14px' }}>
              <SvgIcon name="search" size={14} color="rgba(255,255,255,0.55)" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search friends" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 14, padding: '10px 0', fontFamily: 'inherit' }} />
            </div>
          )}
          {err && <div style={{ fontSize: 12.5, color: '#FF8FA3', marginTop: 10 }}>{err}</div>}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px calc(20px + env(safe-area-inset-bottom))', marginTop: 6 }}>
          {movie && friends === null && <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', padding: '18px 0' }}>Finding your friends…</div>}
          {friends && friends.length === 0 && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', padding: '18px 0', lineHeight: 1.5 }}>Follow a few friends first, then you can watch together.</div>}
          {anySaved && !q && <div style={{ ...eyebrow('rgba(255,255,255,0.5)'), margin: '10px 0 2px' }}>They want to watch it too</div>}
          {shown.map((f, i) => {
            const divider = anySaved && !q && i > 0 && shown[i - 1].alsoSaved && !f.alsoSaved;
            return (
              <div key={f.user_id}>
                {divider && <div style={{ ...eyebrow('rgba(255,255,255,0.5)'), margin: '18px 0 2px' }}>Everyone else</div>}
                <button onClick={() => start(f)} disabled={!!busy} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', borderTop: `1px solid ${T.hairline}`, padding: '12px 0', cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', textAlign: 'left', opacity: busy && busy !== f.user_id ? 0.45 : 1 }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff' }}>{f.avatar_url ? <img src={f.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (f.display_name || '?')[0].toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.display_name}</div>
                    <div style={{ fontSize: 11.5, color: f.alsoSaved ? accent : 'rgba(255,255,255,0.5)', marginTop: 2, fontWeight: f.alsoSaved ? 700 : 500 }}>{f.alsoSaved ? '🍿 Also saved it' : f.alsoWatched ? 'Has seen it' : `@${f.username}`}</div>
                  </div>
                  <span style={{ ...glass, height: 34, borderRadius: 17, padding: '0 14px', display: 'inline-flex', alignItems: 'center', fontSize: 12.5, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{busy === f.user_id ? 'Starting…' : 'Invite'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
