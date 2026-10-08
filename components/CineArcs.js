'use client';
/**
 * Cine Arcs UI — progressive intensity watchlists
 * Copy to: components/CineArcs.js
 *
 * Usage from CineScroll:
 *   import CineArcs from './CineArcs';
 *   {showArcs && <CineArcs accent={accent} onClose={() => setShowArcs(false)} onWatchTrailer={...} watchlist={watchlist} />}
 */

import { useState, useEffect, useMemo, useRef } from 'react';

const T = {
  bg: '#06060B',
  surface: '#0F0F18',
  surface2: 'rgba(255,255,255,0.025)',
  hairline: 'rgba(255,255,255,0.06)',
  text: 'rgba(255,255,255,0.92)',
  text2: 'rgba(255,255,255,0.45)',
  text3: 'rgba(255,255,255,0.25)',
  serif: "var(--font-display), 'Inter Tight', system-ui, -apple-system, sans-serif",
};

// Soft cinematic page backdrop: the current film's accent bleeds in from the top-left and settles
// at the bottom-right, so every page feels lit by what you were just watching.
const ambient = (a = '#F5A623') => `radial-gradient(140% 55% at 0% 0%, ${a}26 0%, ${a}0f 38%, transparent 70%), radial-gradient(120% 45% at 100% 100%, ${a}17 0%, transparent 65%), #06060B`;

const PROGRESS_KEY = 'cine_arc_progress';
const MY_ARC_ID = 'my-watchlist-arc';

const GENRE_ARC_THEMES = {
  all: {
    id: 'personal',
    label: 'Yours',
    accent: null, // use shell accent
    meter: 'fuse',
    stages: ['Warm-up', 'Climb', 'Heat', 'Peak', 'Encore'],
    stageCopy: [
      'Ease in. No pressure.',
      'The path starts climbing.',
      "You're in the thick of it.",
      'This is your peak stretch.',
      'You finished your own arc.',
    ],
  },
  Action: {
    id: 'action',
    label: 'Action',
    accent: '#FF7A2F',
    meter: 'fuse',
    stages: ['Spark', 'Heat', 'Blaze', 'Detonation', 'Aftermath'],
    stageCopy: [
      'The fuse is lit.',
      'Pressure builds.',
      'No turning back.',
      'This is the deep end.',
      'You made it through the fire.',
    ],
  },
  Romance: {
    id: 'romance',
    label: 'Romance',
    accent: '#FF6BAE',
    meter: 'warmth',
    stages: ['Glance', 'Pull', 'Fall', 'Free fall', 'Afterglow'],
    stageCopy: [
      'Just a look.',
      'Something shifts.',
      'Hearts on the line.',
      'All in.',
      'What remains.',
    ],
  },
  Horror: {
    id: 'horror',
    label: 'Horror',
    accent: '#FF4444',
    meter: 'dread',
    stages: ['Unease', 'Shadows', 'Breach', 'No sleep', 'Silence'],
    stageCopy: [
      'Something feels off.',
      'The house notices you.',
      'Rules break.',
      'Lights stay on.',
      'What you carry home.',
    ],
  },
  Comedy: {
    id: 'comedy',
    label: 'Comedy',
    accent: '#6BEF9E',
    meter: 'laugh',
    stages: ['Chuckle', 'Grin', 'Howl', 'Chaos', 'Encore'],
    stageCopy: [
      'Easy laughs.',
      'Getting ridiculous.',
      "Can't keep a straight face.",
      'Absolute mayhem.',
      'One more for the road.',
    ],
  },
  Drama: {
    id: 'drama',
    label: 'Drama',
    accent: '#7BC8FF',
    meter: 'fracture',
    stages: ['Quiet', 'Weight', 'Break', 'Reckoning', 'After'],
    stageCopy: [
      'Soft entry.',
      'The weight settles in.',
      'Something gives.',
      'Everything on the table.',
      'What you leave with.',
    ],
  },
  'Sci-Fi': {
    id: 'mind',
    label: 'Sci-Fi',
    accent: '#B07FEF',
    meter: 'fracture',
    stages: ['Crack', 'Tilt', 'Spiral', 'Shatter', 'Echo'],
    stageCopy: [
      'A hairline fracture.',
      'Reality leans.',
      'Which layer is true?',
      'Nothing holds.',
      'The question stays.',
    ],
  },
  Thriller: {
    id: 'thriller',
    label: 'Thriller',
    accent: '#4DA8FF',
    meter: 'fuse',
    stages: ['Tension', 'Tighten', 'Trap', 'Rush', 'Release'],
    stageCopy: [
      'A quiet unease.',
      'The screws turn.',
      "Nowhere comfortable.",
      'Hold your breath.',
      'You can exhale.',
    ],
  },
};

function movieGenres(m) {
  const g = m.genre || m.genres || [];
  if (Array.isArray(g)) return g.map(String);
  if (typeof g === 'string') return g.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

function filterWatchlistByGenre(watchlist, genre) {
  if (!genre || genre === 'all') return watchlist || [];
  return (watchlist || []).filter((m) =>
    movieGenres(m).some((g) => g.toLowerCase() === genre.toLowerCase() || g.toLowerCase().includes(genre.toLowerCase()))
  );
}

/** Order a free-form watchlist mild → peak, optionally genre-filtered */
function buildWatchlistArc(watchlist, accent, genreKey = 'all') {
  const theme = GENRE_ARC_THEMES[genreKey] || GENRE_ARC_THEMES.all;
  const themeAccent = theme.accent || accent || '#F5A623';
  const filtered = filterWatchlistByGenre(watchlist, genreKey === 'all' ? null : genreKey);
  const arcId = genreKey === 'all' ? MY_ARC_ID : `${MY_ARC_ID}-${genreKey.toLowerCase().replace(/\s+/g, '-')}`;

  const items = filtered
    .map((m, idx) => {
      const rating = Number(m.vote_average || m.rating || 6.5);
      const runtime = Number(m.runtime || 110);
      const year = Number(String(m.release_date || m.year || '2010').slice(0, 4));
      const score = rating * 1.15 + runtime / 45 + (year - 1990) / 25;
      return { m, score, idx };
    })
    .sort((a, b) => a.score - b.score)
    .map(({ m }, i, arr) => {
      const intensity = Math.min(5, Math.max(1, Math.ceil(((i + 1) / Math.max(arr.length, 1)) * 5)));
      const poster =
        m.poster ||
        m.poster_url ||
        (m.poster_path
          ? m.poster_path.startsWith('http')
            ? m.poster_path
            : `https://image.tmdb.org/t/p/w500${m.poster_path}`
          : null);
      return {
        movie_id: m.movie_id || m.id,
        title: m.title || m.name || 'Untitled',
        intensity,
        year: (m.release_date || m.year || '').toString().slice(0, 4) || null,
        poster,
        vote_average: m.vote_average || m.rating || null,
        overview: m.overview || null,
        backdrop: m.backdrop || m.backdrop_url || null,
        media_type: m.media_type || m.mediaType || 'movie',
      };
    });

  const cover = items.find((i) => i.poster)?.poster || null;
  const label = genreKey === 'all' ? 'My Watchlist Arc' : `${genreKey} Arc`;
  const subtitle =
    genreKey === 'all'
      ? 'Your saves, ordered mild → peak'
      : `Only your ${genreKey} saves — intensity rises with the genre.`;

  return {
    id: arcId,
    slug: arcId,
    title: label,
    subtitle,
    theme: theme.id,
    media_type: 'movie',
    cover_poster: cover,
    genre_key: genreKey,
    theme_meta: {
      ...theme,
      accent: themeAccent,
      label: theme.label,
    },
    items,
  };
}

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveProgress(map) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  } catch {}
}

function Stars({ value = 0, size = 12, color = '#F5A623', onPick = null }) {
  const v = Number(value) || 0;
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onPick) onPick(n);
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: onPick ? 'pointer' : 'default',
            lineHeight: 1,
            fontSize: size,
            color: n <= Math.round(v) ? color : 'rgba(255,255,255,0.18)',
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

/* ───────────────────────── shared bits ───────────────────────── */

const ICONS = {
  close: ['M18 6L6 18', 'M6 6l12 12'],
  back: ['M15 18l-6-6 6-6'],
  play: ['M6 4l14 8-14 8V4z'],
  check: ['M20 6L9 17l-5-5'],
  share: ['M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8', 'M16 6l-4-4-4 4', 'M12 2v13'],
  star: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  layers: ['M12 2L2 7l10 5 10-5-10-5z', 'M2 17l10 5 10-5', 'M2 12l10 5 10-5'],
  bookmark: ['M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'],
};
function Icon({ name, size = 16, color = 'currentColor', filled = false, stroke = 1.8 }) {
  const paths = ICONS[name] || [];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

/** "Action Arc: Fuse → Detonation" → "Fuse → Detonation" */
function shortTitle(title = '') {
  const i = title.indexOf(':');
  return i > -1 ? title.slice(i + 1).trim() : title;
}

function stageFor(meta, watched, total) {
  const stages = meta?.stages || [];
  if (!stages.length || !total) return { label: '', copy: '' };
  if (watched === 0) return { label: 'Not started', copy: 'Start at the gentle end. Every title turns it up a notch.' };
  const idx = Math.min(stages.length - 1, Math.floor((watched / total) * stages.length));
  return { label: stages[idx], copy: meta.stageCopy?.[idx] || '' };
}

function toTrailerMovie(item, arc, accent) {
  const mt = item.media_type || arc.media_type || 'movie';
  return {
    id: Number(item.movie_id) || item.movie_id,
    title: item.title,
    poster: item.poster || null,
    backdrop: item.backdrop || null,
    overview: item.overview || '',
    year: item.year ? String(item.year) : (item.release_date || '').slice(0, 4),
    rating: item.vote_average ? Number(item.vote_average).toFixed(1) : 'N/A',
    mediaType: mt,
    isTV: mt === 'tv',
    accent,
  };
}

/**
 * The signature visual: posters stepping up in height, left → right,
 * so every arc literally shows its climb. Watched steps stay lit, the rest dim.
 */
function Staircase({ posters = [], ids = [], watchedSet, accent, height = 150 }) {
  const steps = posters.slice(0, 6);
  const n = Math.max(steps.length, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height }}>
      {steps.map((src, i) => {
        const h = Math.round(height * (0.45 + (0.55 * (i + 1)) / n));
        const done = watchedSet?.has(String(ids[i]));
        return (
          <div key={i} style={{ position: 'relative', flex: 1, height: h, borderRadius: 3, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', borderBottom: `2px solid ${i === n - 1 ? accent : 'transparent'}` }}>
            {src && <img src={src} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
            {done && (
              <div style={{ position: 'absolute', inset: 0, background: `${accent}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={18} color="#fff" stroke={3} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Five segments = five stages. Filled up to where you are. */
function StageMeter({ meta, watched, total, accent }) {
  const stages = meta?.stages || [];
  const reached = total ? Math.ceil((watched / total) * stages.length) : 0;
  return (
    <div>
      <div style={{ display: 'flex', gap: 4 }}>
        {stages.map((s, i) => (
          <div key={s} style={{ flex: 1, height: 6, borderRadius: 3, background: i < reached ? accent : 'rgba(255,255,255,0.08)', opacity: i < reached ? 0.45 + (0.55 * (i + 1)) / stages.length : 1, transition: 'background 0.3s ease' }} />
        ))}
      </div>
      <div style={{ display: 'flex', marginTop: 7 }}>
        {stages.map((s, i) => (
          <div key={s} style={{ flex: 1, fontSize: 10.5, color: i < reached ? accent : T.text3, fontWeight: i === reached - 1 ? 800 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s}</div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── list view ───────────────────────── */

function ArcRow({ arc, progress, rating, onOpen }) {
  const meta = arc.theme_meta || {};
  const accent = meta.accent || '#F5A623';
  const total = arc.item_count || arc.items?.length || 0;
  const watchedSet = new Set(progress?.watched || []);
  const watched = Math.min(total, (arc.sample_ids || []).filter((id) => watchedSet.has(id)).length || progress?.watched?.length || 0);
  const done = total > 0 && watched >= total;
  const stage = stageFor(meta, watched, total);
  const kind = arc.media_type === 'tv' ? 'series' : 'films';

  return (
    <div role="button" tabIndex={0} onClick={() => onOpen(arc)} onKeyDown={(e) => e.key === 'Enter' && onOpen(arc)}
      style={{ padding: '18px 4px', borderTop: `1px solid ${T.hairline}`, cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontWeight: 700, fontSize: 21, lineHeight: 1.2, color: '#fff', minWidth: 0 }}>{shortTitle(arc.title)}</div>
        {rating?.avg != null && rating.count > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}><span style={{ color: '#FFD166' }}>★</span>{Number(rating.avg).toFixed(1)}</span>
        )}
      </div>
      <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
        <span style={{ color: accent, fontWeight: 700 }}>{meta.label || arc.theme}</span> · {total} {kind}
      </div>

      <div style={{ marginTop: 12 }}>
        <Staircase posters={arc.sample_posters || []} ids={arc.sample_ids || []} watchedSet={watchedSet} accent={accent} height={112} />
      </div>

      <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.68)', lineHeight: 1.5, margin: '12px 0 0', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{arc.summary || arc.subtitle}</p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: watched ? accent : 'rgba(255,255,255,0.5)' }}>
          {done ? 'Completed' : watched ? `${watched} of ${total} watched · ${stage.label}` : 'Not started'}
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>{done ? 'View' : watched ? 'Continue' : 'Start'}</span>
      </div>
    </div>
  );
}

/* ───────────────────────── detail view ───────────────────────── */

function ArcDetail({ arc, progress, onBack, onToggleWatched, onWatchTrailer, accent: shellAccent, onShareComplete, shareStatus, user }) {
  const meta = arc.theme_meta || {};
  const accent = meta.accent || shellAccent || '#FF7A2F';
  const items = arc.items || [];
  const watchedSet = new Set(progress?.watched || []);
  const watchedCount = items.filter((i) => watchedSet.has(String(i.movie_id))).length;
  const total = items.length;
  const nextIdx = items.findIndex((i) => !watchedSet.has(String(i.movie_id)));
  const next = nextIdx >= 0 ? items[nextIdx] : null;
  const stage = stageFor(meta, watchedCount, total);
  const heroImg = items.find((i) => i.backdrop)?.backdrop || arc.cover_poster;
  const isUserArc = arc.is_user || String(arc.id || '').startsWith(MY_ARC_ID);

  const [engage, setEngage] = useState({ avg: null, count: 0, myRating: null, comments: [] });
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [ratingBusy, setRatingBusy] = useState(false);
  const pathRef = useRef(null);

  useEffect(() => {
    if (!arc?.id || isUserArc) return;
    let cancelled = false;
    fetch(`/api/arcs/engage?arcId=${encodeURIComponent(arc.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setEngage({ avg: null, count: 0, myRating: null, comments: [], ...d }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [arc?.id, isUserArc]);

  const rateArc = async (n) => {
    if (!user || ratingBusy) return;
    setRatingBusy(true);
    setEngage((p) => ({ ...p, myRating: n }));
    try {
      await fetch('/api/arcs/engage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'rate', arcId: arc.id, rating: n }) });
      const d = await fetch(`/api/arcs/engage?arcId=${encodeURIComponent(arc.id)}`).then((r) => r.json());
      setEngage((p) => ({ ...p, ...d }));
    } catch {}
    setRatingBusy(false);
  };

  const postComment = async () => {
    const body = commentText.trim();
    if (!body || posting || !user) return;
    setPosting(true);
    try {
      const res = await fetch('/api/arcs/engage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'comment', arcId: arc.id, text: body, username: user?.username || user?.firstName || 'user', avatarUrl: user?.imageUrl || null }),
      });
      const d = await res.json();
      if (d.comment) { setEngage((p) => ({ ...p, comments: [d.comment, ...(p.comments || [])] })); setCommentText(''); }
    } catch {}
    setPosting(false);
  };

  const play = (item) => onWatchTrailer && onWatchTrailer(toTrailerMovie(item, arc, accent));

  return (
    <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
      {/* Hero */}
      <div style={{ position: 'relative', minHeight: 330, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        {heroImg ? (
          <img src={heroImg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, ${accent}40, ${T.bg})` }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${T.bg} 4%, rgba(6,6,11,0.72) 45%, rgba(6,6,11,0.25) 100%)` }} />
        <button type="button" onClick={onBack} aria-label="Back to arcs"
          style={{ position: 'absolute', top: 'max(14px, env(safe-area-inset-top))', left: 14, width: 40, height: 40, borderRadius: '50%', background: 'rgba(6,6,11,0.55)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Icon name="back" size={18} color="#fff" stroke={2.2} />
        </button>
        <div style={{ position: 'relative', padding: '90px 20px 4px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: accent }}>
            {isUserArc ? `Built by ${arc.user_name || 'you'}` : `${meta.label || ''} arc`} · {total} {arc.media_type === 'tv' ? 'series' : 'titles'}
          </div>
          <h1 style={{ fontFamily:T.serif, fontWeight:700, fontSize:26,letterSpacing:'-0.02em', lineHeight: 1.05, color:T.text, margin: '8px 0 0' }}>{shortTitle(arc.title)}</h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.72)', lineHeight: 1.55, margin: '10px 0 0', maxWidth: 560 }}>{arc.summary || arc.subtitle}</p>
        </div>
      </div>

      <div style={{ padding: '18px 20px 0' }}>
        {/* Primary action */}
        {next ? (
          <button type="button" onClick={() => play(next)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: accent, color: '#06060B', border: 'none', borderRadius: 6, padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
            <div style={{ width: 38, height: 54, borderRadius: 3, overflow: 'hidden', background: 'rgba(0,0,0,0.2)', flexShrink: 0 }}>
              {next.poster && <img src={next.poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.7 }}>{watchedCount === 0 ? 'Start with step 1' : `Up next · step ${nextIdx + 1}`}</div>
              <div style={{ fontSize: 16, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{next.title}</div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#06060B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="play" size={15} color={accent} filled />
            </div>
          </button>
        ) : total > 0 ? (
          <div style={{ padding: '18px 0', borderTop: `2px solid ${accent}`, borderBottom: `1px solid ${T.hairline}` }}>
            <div style={{ fontFamily:T.serif, fontWeight:700, fontSize:17,letterSpacing:'-0.02em', color:T.text }}>You finished the climb</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 6 }}>{meta.stageCopy?.[meta.stageCopy.length - 1] || 'Every step, done.'}</div>
            {onShareComplete && (
              <button type="button" onClick={() => onShareComplete(arc)} disabled={shareStatus === 'shared' || shareStatus === 'sharing'}
                style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8, background: shareStatus === 'shared' ? 'transparent' : accent, border: `1px solid ${accent}`, borderRadius: 6, padding: '10px 18px', fontSize: 14, fontWeight: 800, color: shareStatus === 'shared' ? accent : '#06060B', cursor: shareStatus === 'shared' ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                <Icon name={shareStatus === 'shared' ? 'check' : 'share'} size={14} color={shareStatus === 'shared' ? accent : '#06060B'} stroke={2.2} />
                {shareStatus === 'sharing' ? 'Sharing…' : shareStatus === 'shared' ? 'Shared with friends' : 'Share with friends'}
              </button>
            )}
          </div>
        ) : null}

        {/* Where you are */}
        {total > 0 && (
          <div style={{ marginTop: 22 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontFamily:T.serif, fontWeight:700, fontSize:17,letterSpacing:'-0.02em', color:T.text }}>{stage.label}</div>
              <div style={{ fontSize: 13, color: T.text2 }}>{watchedCount} of {total} watched</div>
            </div>
            <StageMeter meta={meta} watched={watchedCount} total={total} accent={accent} />
            {stage.copy && <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 10, lineHeight: 1.5 }}>{stage.copy}</div>}
          </div>
        )}

        {/* The path */}
        <div ref={pathRef} style={{ marginTop: 28 }}>
          <div style={{  fontWeight:700, fontSize:10.5,letterSpacing:2.2,textTransform:'uppercase', color:accent, marginBottom: 4 }}>The path</div>
          <div style={{ fontSize: 13, color: T.text2, marginBottom: 12 }}>Gentlest first, most intense last.</div>

          <div>
            {items.map((item, i) => {
              const done = watchedSet.has(String(item.movie_id));
              const isNext = i === nextIdx;
              const stepName = meta.stages?.[Math.max(0, (item.intensity || 1) - 1)] || '';
              return (
                <div key={item.movie_id} role="button" tabIndex={0} onClick={() => play(item)} onKeyDown={(e) => e.key === 'Enter' && play(item)}
                  style={{ display: 'flex', gap: 14, padding: '16px 0 16px 10px', borderTop: `1px solid ${T.hairline}`, borderLeft: `2px solid ${isNext ? accent : 'transparent'}`, cursor: 'pointer' }}>
                  <div style={{ width: 22, flexShrink: 0, fontFamily: T.serif, letterSpacing: '-0.02em', fontWeight: 700, fontSize: 22, lineHeight: 1, color: done || isNext ? accent : 'rgba(255,255,255,0.3)', paddingTop: 2 }}>{i + 1}</div>
                  <div style={{ position: 'relative', width: 70, aspectRatio: '2/3', borderRadius: 3, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.05)' }}>
                    {item.poster && <img src={item.poster} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: done ? 0.5 : 1 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontWeight: 700, fontSize: 18, lineHeight: 1.2, color: done ? 'rgba(255,255,255,0.55)' : '#fff' }}>{item.title}</div>
                    <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                      {item.year || (item.release_date || '').slice(0, 4)}
                      {item.vote_average ? <> · <span style={{ color: '#FFD166' }}>★</span> <span style={{ color: 'rgba(255,255,255,0.85)' }}>{Number(item.vote_average).toFixed(1)}</span></> : null}
                    </div>
                    {item.overview && (
                      <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.68)', lineHeight: 1.5, margin: '7px 0 0', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.overview}</p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: accent, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isNext ? 'Up next' : stepName}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        <button type="button" onClick={(e) => { e.stopPropagation(); onToggleWatched(arc.id, item.movie_id); }}
                          aria-label={done ? `Mark ${item.title} as not watched` : `Mark ${item.title} as watched`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', padding: 4, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', color: done ? accent : 'rgba(255,255,255,0.7)' }}>
                          <Icon name="check" size={14} color={done ? accent : 'rgba(255,255,255,0.7)'} stroke={2.4} />{done ? 'Seen' : 'Mark seen'}
                        </button>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: '#fff' }}><Icon name="play" size={11} color="#fff" filled />Trailer</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rating + discussion — only for shared, official arcs */}
        {!isUserArc && (
          <>
            <div style={{ marginTop: 8, padding: '18px 0', borderTop: `1px solid ${T.hairline}`, borderBottom: `1px solid ${T.hairline}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{engage.myRating ? 'Your rating' : 'Rate this arc'}</div>
                <div style={{ marginTop: 8 }}>
                  <Stars value={engage.myRating || 0} size={24} color={accent} onPick={user ? rateArc : null} />
                </div>
                {!user && <div style={{ fontSize: 12.5, color: T.text2, marginTop: 6 }}>Sign in to rate</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontSize: 30, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{engage.avg != null ? Number(engage.avg).toFixed(1) : '–'}</div>
                <div style={{ fontSize: 12, color: T.text2, marginTop: 4 }}>{engage.count ? `${engage.count} rating${engage.count === 1 ? '' : 's'}` : 'No ratings yet'}</div>
              </div>
            </div>

            <div style={{ marginTop: 26 }}>
              <div style={{  fontWeight:700, fontSize:10.5,letterSpacing:2.2,textTransform:'uppercase', color:accent, marginBottom: 12 }}>
                Discussion {engage.comments?.length ? <span style={{ fontFamily: 'inherit', fontStyle: 'normal', fontSize: 14, color: T.text2, fontWeight: 500 }}>{engage.comments.length}</span> : null}
              </div>
              {user ? (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && postComment()} placeholder="Which step hit hardest?"
                    style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', borderBottom: `1px solid ${T.hairlineStrong || 'rgba(255,255,255,0.15)'}`, borderRadius: 0, padding: '12px 2px', color: '#fff', fontSize: 15, fontFamily: 'inherit', outline: 'none' }} />
                  <button type="button" onClick={postComment} disabled={posting || !commentText.trim()}
                    style={{ background: commentText.trim() ? accent : T.surface, border: `1px solid ${commentText.trim() ? accent : T.hairline}`, borderRadius: 6, padding: '0 16px', fontWeight: 800, fontSize: 14, color: commentText.trim() ? '#06060B' : T.text3, cursor: commentText.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                    Post
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 14, color: T.text2, marginBottom: 12 }}>Sign in to join the discussion.</div>
              )}
              {(engage.comments || []).length === 0 ? (
                <div style={{ fontSize: 14, color: T.text2, paddingBottom: 8 }}>No comments yet. Finish a step and say how it landed.</div>
              ) : (
                (engage.comments || []).map((c) => (
                  <div key={c.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderTop: `1px solid ${T.hairline}` }}>
                    {c.avatar_url ? <img src={c.avatar_url} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: 34, height: 34, borderRadius: '50%', background: T.surface, flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: T.text2 }}><span style={{ color: '#fff', fontWeight: 700 }}>{c.username || 'user'}</span>{c.created_at ? `  ${new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}</div>
                      <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 1.45, marginTop: 3 }}>{c.body}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
        <div style={{ height: 'calc(32px + env(safe-area-inset-bottom))' }} />
      </div>
    </div>
  );
}

/* ───────────────────────── page ───────────────────────── */

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'movie', label: 'Movies' },
  { id: 'tv', label: 'Series' },
];

export default function CineArcs({ onClose, accent = '#F5A623', onWatchTrailer, watchlist = [], user = null }) {
  const [arcs, setArcs] = useState([]);
  const [themes, setThemes] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState('all');
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [progressMap, setProgressMap] = useState({});
  const [myGenre, setMyGenre] = useState('all');
  const [shareStatus, setShareStatus] = useState({});
  const [ratingsMap, setRatingsMap] = useState({});
  const listScrollRef = useRef(null);
  const listScrollPos = useRef(0);

  const loadArcs = () => {
    setLoading(true);
    setLoadError(false);
    fetch('/api/arcs')
      .then((r) => r.json())
      .then(async (d) => {
        const list = d.arcs || [];
        setArcs(list);
        setThemes(d.themes || {});
        setLoading(false);
        const map = {};
        await Promise.all(list.slice(0, 12).map(async (a) => {
          try {
            const r = await fetch(`/api/arcs/engage?arcId=${encodeURIComponent(a.id)}`);
            if (!r.ok) return;
            const j = await r.json();
            map[a.id] = { avg: j.avg, count: j.count };
          } catch {}
        }));
        setRatingsMap((p) => ({ ...p, ...map }));
      })
      .catch(() => { setLoading(false); setLoadError(true); });
  };

  useEffect(() => {
    setProgressMap(loadProgress());
    loadArcs();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const filterOptions = useMemo(() => {
    const present = new Set(arcs.map((a) => a.theme));
    return [...FILTERS, ...Object.keys(themes).filter((k) => present.has(k)).map((k) => ({ id: k, label: themes[k]?.label || k }))];
  }, [arcs, themes]);

  const filtered = useMemo(() => {
    if (filter === 'all') return arcs;
    if (filter === 'movie' || filter === 'tv') return arcs.filter((a) => a.media_type === filter);
    return arcs.filter((a) => a.theme === filter);
  }, [arcs, filter]);

  // Arcs you've started but not finished, most progressed first
  const inProgress = useMemo(() => arcs
    .map((a) => ({ a, w: (progressMap[a.id]?.watched || []).length, t: a.item_count || 0 }))
    .filter(({ w, t }) => w > 0 && w < t)
    .sort((x, y) => y.w / y.t - x.w / x.t), [arcs, progressMap]);

  const genreOptions = useMemo(() => {
    const counts = {};
    (watchlist || []).forEach((m) => movieGenres(m).forEach((g) => { counts[g] = (counts[g] || 0) + 1; }));
    const opts = [{ id: 'all', label: 'Everything', count: (watchlist || []).length }];
    Object.keys(counts).filter((g) => counts[g] >= 2).sort((a, b) => counts[b] - counts[a]).slice(0, 6)
      .forEach((g) => opts.push({ id: g, label: g, count: counts[g] }));
    return opts;
  }, [watchlist]);

  const myArc = useMemo(() => (watchlist?.length ? buildWatchlistArc(watchlist, accent, myGenre) : null), [watchlist, accent, myGenre]);
  const myArcReady = myArc && myArc.items.length >= 3;

  const openArc = async (arc) => {
    listScrollPos.current = listScrollRef.current?.scrollTop || 0;
    setLoadingDetail(true);
    setDetail({ id: arc.id, _loading: true });
    try {
      if (String(arc.id).startsWith(MY_ARC_ID)) {
        const built = buildWatchlistArc(watchlist, accent, arc.genre_key || myGenre || 'all');
        setDetail({ ...built, is_user: true, user_name: user?.username || user?.firstName || 'you', user_avatar: user?.imageUrl || null });
      } else {
        const r = await fetch(`/api/arcs?id=${encodeURIComponent(arc.id)}`);
        if (!r.ok) throw new Error('arc');
        setDetail(await r.json());
      }
    } catch {
      setDetail(null);
    }
    setLoadingDetail(false);
  };

  const backToList = () => {
    setDetail(null);
    requestAnimationFrame(() => { if (listScrollRef.current) listScrollRef.current.scrollTop = listScrollPos.current; });
  };

  const shareArcComplete = async (arc) => {
    if (!arc?.id) return;
    setShareStatus((p) => ({ ...p, [arc.id]: 'sharing' }));
    try {
      await fetch('/api/activity', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'arc_complete', movieId: arc.id, movieTitle: arc.title || 'a Cine Arc', moviePoster: arc.cover_poster || arc.items?.[0]?.poster || null, movieAccent: arc.theme_meta?.accent || accent, username: user?.username || user?.firstName || 'user', avatarUrl: user?.imageUrl || null }),
      });
      setShareStatus((p) => ({ ...p, [arc.id]: 'shared' }));
    } catch {
      setShareStatus((p) => ({ ...p, [arc.id]: 'error' }));
    }
  };

  const toggleWatched = (arcId, movieId) => {
    setProgressMap((prev) => {
      const cur = prev[arcId] || { watched: [] };
      const id = String(movieId);
      const watched = cur.watched.includes(id) ? cur.watched.filter((x) => x !== id) : [...cur.watched, id];
      const next = { ...prev, [arcId]: { watched } };
      saveProgress(next);
      return next;
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 95, background: ambient(detail?.theme_meta?.accent || accent), display: 'flex', flexDirection: 'column', animation: 'arcsIn 0.35s cubic-bezier(0.22,1,0.36,1)' }}>
      <style>{`@keyframes arcsIn{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes arcsSpin{to{transform:rotate(360deg)}}@keyframes arcsShimmer{0%{background-position:-300px 0}100%{background-position:300px 0}}@media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}`}</style>

      {detail ? (
        detail._loading || loadingDetail ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 26, height: 26, border: '2px solid rgba(255,255,255,0.1)', borderTop: `2px solid ${accent}`, borderRadius: '50%', animation: 'arcsSpin 0.8s linear infinite' }} />
          </div>
        ) : (
          <ArcDetail arc={detail} progress={progressMap[detail.id]} onBack={backToList} onToggleWatched={toggleWatched} onWatchTrailer={onWatchTrailer}
            accent={accent} onShareComplete={shareArcComplete} shareStatus={shareStatus[detail.id]} user={user} />
        )
      ) : (
        <div ref={listScrollRef} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          {/* Header */}
          <div style={{ position: 'relative', padding: 'max(16px, env(safe-area-inset-top)) 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <h1 style={{ fontFamily:T.serif, fontWeight:700, fontSize:21,letterSpacing:'-0.02em', lineHeight: 1.05, color:T.text, margin: 0 }}>Cine Arcs</h1>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, margin: '8px 0 0', maxWidth: 420 }}>Watchlists that build. Each one starts easy and gets more intense with every title.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close"
              style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.hairline}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <Icon name="close" size={16} color="#fff" stroke={2} />
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 22, overflowX: 'auto', padding: '20px 20px 0', scrollbarWidth: 'none', borderBottom: `1px solid ${T.hairline}` }}>
            {filterOptions.map((o) => {
              const on = filter === o.id;
              const c = themes[o.id]?.accent || accent;
              return (
                <button key={o.id} type="button" onClick={() => setFilter(o.id)}
                  style={{ flexShrink: 0, background: 'none', border: 'none', borderBottom: `2px solid ${on ? c : 'transparent'}`, padding: '0 0 10px', marginBottom: -1, fontSize: 14.5, fontWeight: on ? 800 : 600, color: on ? c : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  {o.label}
                </button>
              );
            })}
          </div>

          <div style={{ padding: '6px 16px 0' }}>
            {/* Continue */}
            {filter === 'all' && inProgress.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{  fontWeight:700, fontSize:10.5,letterSpacing:2.2,textTransform:'uppercase', color:accent, margin: '14px 4px 8px' }}>Keep climbing</div>
                {inProgress.map(({ a, w, t }) => {
                  const ac = a.theme_meta?.accent || accent;
                  return (
                    <div key={a.id} role="button" tabIndex={0} onClick={() => openArc(a)} onKeyDown={(e) => e.key === 'Enter' && openArc(a)}
                      style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 4px', borderTop: `1px solid ${T.hairline}`, cursor: 'pointer' }}>
                      <div style={{ width: 44, aspectRatio: '2/3', borderRadius: 3, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }}>
                        {a.sample_posters?.[w] && <img src={a.sample_posters[w]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontWeight: 700, fontSize: 17, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shortTitle(a.title)}</div>
                        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}><span style={{ color: ac, fontWeight: 700 }}>Step {w + 1} of {t}</span> · {stageFor(a.theme_meta, w, t).label}</div>
                        <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', marginTop: 8 }}>
                          <div style={{ width: `${(w / t) * 100}%`, height: '100%', background: ac }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>Continue</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Official arcs */}
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[0, 1].map((i) => (
                  <div key={i} style={{ height: 260, borderRadius: 3, background: 'linear-gradient(90deg,rgba(255,255,255,0.03),rgba(255,255,255,0.07),rgba(255,255,255,0.03))', backgroundSize: '600px 100%', animation: 'arcsShimmer 1.3s linear infinite' }} />
                ))}
              </div>
            ) : loadError ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 16, color: '#fff', fontWeight: 700 }}>Arcs didn’t load</div>
                <div style={{ fontSize: 14, color: T.text2, marginTop: 6 }}>Check your connection and try again.</div>
                <button type="button" onClick={loadArcs} style={{ marginTop: 14, background: 'none', border: `1px solid ${T.hairline}`, borderRadius: 6, padding: '9px 18px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Try again</button>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', fontSize: 15, color: T.text2 }}>No arcs here yet. Try another filter.</div>
            ) : (
              <div>
                {filter === 'all' && <div style={{  fontWeight:700, fontSize:10.5,letterSpacing:2.2,textTransform:'uppercase', color:accent, margin: '14px 4px 8px' }}>All arcs</div>}
                {filtered.map((arc) => (
                  <ArcRow key={arc.id} arc={arc} progress={progressMap[arc.id]} rating={ratingsMap[arc.id]} onOpen={openArc} />
                ))}
              </div>
            )}

            {/* Build your own */}
            {filter === 'all' && !loading && (
              <div style={{ marginTop: 10, padding: '22px 4px 0', borderTop: `1px solid ${T.hairline}` }}>
                <div style={{ fontFamily:T.serif, fontWeight:700, fontSize:17,letterSpacing:'-0.02em', color:T.text }}>Make one from your saves</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginTop: 6 }}>
                  {!user ? 'Sign in and save a few titles. We’ll line them up from easy watch to big finish.'
                    : !watchlist?.length ? 'Save a few titles from your feed first. We’ll line them up from easy watch to big finish.'
                    : 'We line up your saved titles from easy watch to big finish. Pick a genre to narrow it down.'}
                </div>

                {user && watchlist?.length >= 2 && (
                  <>
                    <div style={{ display: 'flex', gap: 18, overflowX: 'auto', scrollbarWidth: 'none', marginTop: 14, borderBottom: `1px solid ${T.hairline}` }}>
                      {genreOptions.map((g) => (
                        <button key={g.id} type="button" onClick={() => setMyGenre(g.id)} style={{ flexShrink: 0, background: 'none', border: 'none', borderBottom: `2px solid ${myGenre === g.id ? (GENRE_ARC_THEMES[g.id]?.accent || accent) : 'transparent'}`, padding: '0 0 9px', marginBottom: -1, fontSize: 14, fontWeight: myGenre === g.id ? 800 : 600, color: myGenre === g.id ? '#fff' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                          {g.label} <span style={{ opacity: 0.6 }}>{g.count}</span>
                        </button>
                      ))}
                    </div>
                    {myArc && myArc.items.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <Staircase posters={myArc.items.map((i) => i.poster)} ids={myArc.items.map((i) => String(i.movie_id))} watchedSet={new Set(progressMap[myArc.id]?.watched || [])} accent={myArc.theme_meta?.accent || accent} height={110} />
                      </div>
                    )}
                  </>
                )}

                <button type="button" disabled={!myArcReady} onClick={() => myArcReady && openArc({ id: myArc.id, genre_key: myGenre })}
                  style={{ marginTop: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 6, padding: '14px 16px', fontSize: 15, fontWeight: 800, fontFamily: 'inherit', cursor: myArcReady ? 'pointer' : 'default', border: 'none', background: myArcReady ? (myArc.theme_meta?.accent || accent) : 'rgba(255,255,255,0.06)', color: myArcReady ? '#06060B' : T.text2 }}>
                  <Icon name="layers" size={16} color={myArcReady ? '#06060B' : T.text2} stroke={2} />
                  {myArcReady
                    ? `Build my ${myGenre === 'all' ? '' : myGenre + ' '}arc · ${myArc.items.length} titles`
                    : !user ? 'Sign in to build your arc'
                    : `Save ${Math.max(1, 3 - (myArc?.items.length || 0))} more ${myGenre === 'all' ? '' : myGenre + ' '}title${3 - (myArc?.items.length || 0) === 1 ? '' : 's'} to build one`}
                </button>
              </div>
            )}
            <div style={{ height: 'calc(36px + env(safe-area-inset-bottom))' }} />
          </div>
        </div>
      )}
    </div>
  );
}
