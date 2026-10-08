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
  serif: "'Playfair Display',serif",
};

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
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height }}>
      {steps.map((src, i) => {
        const h = Math.round(height * (0.5 + (0.5 * (i + 1)) / n));
        const done = watchedSet?.has(String(ids[i]));
        return (
          <div key={i} style={{ position: 'relative', flex: 1, height: h, borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', boxShadow: i === n - 1 ? `0 0 28px ${accent}55` : '0 6px 18px rgba(0,0,0,0.45)', border: `1px solid ${i === n - 1 ? accent + '88' : 'rgba(255,255,255,0.1)'}` }}>
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
  const watched = (arc.sample_ids || []).filter((id) => watchedSet.has(id)).length || progress?.watched?.length || 0;
  const done = total > 0 && watched >= total;
  const stage = stageFor(meta, Math.min(watched, total), total);
  const kind = arc.media_type === 'tv' ? 'series' : 'films';

  return (
    <button
      type="button"
      onClick={() => onOpen(arc)}
      style={{ display: 'block', width: '100%', textAlign: 'left', padding: 0, border: `1px solid ${T.hairline}`, borderRadius: 22, overflow: 'hidden', background: T.surface, cursor: 'pointer', fontFamily: 'inherit', color: 'inherit' }}
    >
      <div style={{ position: 'relative', padding: '22px 18px 0', overflow: 'hidden' }}>
        {arc.cover_backdrop && (
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${arc.cover_backdrop})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.22, filter: 'blur(14px) saturate(1.2)', transform: 'scale(1.15)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(120% 90% at 100% 100%, ${accent}30 0%, transparent 60%)` }} />
        <div style={{ position: 'relative' }}>
          <Staircase posters={arc.sample_posters || []} ids={arc.sample_ids || []} watchedSet={watchedSet} accent={accent} height={150} />
        </div>
      </div>

      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: accent }}>{meta.label || arc.theme} {arc.media_type === 'tv' ? 'series' : ''}</span>
          <span style={{ fontSize: 12.5, color: T.text2 }}>
            {total} {kind}
            {rating?.avg != null && rating.count > 0 && (
              <span style={{ marginLeft: 10, color: T.text }}>
                <span style={{ color: '#FFD166' }}>★</span> {Number(rating.avg).toFixed(1)}
              </span>
            )}
          </span>
        </div>
        <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 800, fontSize: 23, lineHeight: 1.15, color: '#fff', marginTop: 6 }}>{shortTitle(arc.title)}</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginTop: 6 }}>{arc.subtitle}</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <div style={{ width: `${total ? (Math.min(watched, total) / total) * 100 : 0}%`, height: '100%', background: accent, borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: watched ? accent : T.text2, whiteSpace: 'nowrap' }}>
            {done ? 'Completed' : watched ? `${Math.min(watched, total)} of ${total} · ${stage.label}` : 'Start the climb'}
          </span>
        </div>
      </div>
    </button>
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
          <h1 style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 800, fontSize: 34, lineHeight: 1.05, color: '#fff', margin: '8px 0 0' }}>{shortTitle(arc.title)}</h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.72)', lineHeight: 1.55, margin: '10px 0 0', maxWidth: 560 }}>{arc.summary || arc.subtitle}</p>
        </div>
      </div>

      <div style={{ padding: '18px 20px 0' }}>
        {/* Primary action */}
        {next ? (
          <button type="button" onClick={() => play(next)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: accent, color: '#06060B', border: 'none', borderRadius: 16, padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
            <div style={{ width: 38, height: 54, borderRadius: 7, overflow: 'hidden', background: 'rgba(0,0,0,0.2)', flexShrink: 0 }}>
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
          <div style={{ padding: 18, borderRadius: 18, background: `${accent}16`, border: `1px solid ${accent}44`, textAlign: 'center' }}>
            <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 800, fontSize: 22, color: '#fff' }}>You finished the climb</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 6 }}>{meta.stageCopy?.[meta.stageCopy.length - 1] || 'Every step, done.'}</div>
            {onShareComplete && (
              <button type="button" onClick={() => onShareComplete(arc)} disabled={shareStatus === 'shared' || shareStatus === 'sharing'}
                style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8, background: shareStatus === 'shared' ? 'transparent' : accent, border: `1px solid ${accent}`, borderRadius: 999, padding: '10px 18px', fontSize: 14, fontWeight: 800, color: shareStatus === 'shared' ? accent : '#06060B', cursor: shareStatus === 'shared' ? 'default' : 'pointer', fontFamily: 'inherit' }}>
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
              <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 700, fontSize: 19, color: '#fff' }}>{stage.label}</div>
              <div style={{ fontSize: 13, color: T.text2 }}>{watchedCount} of {total} watched</div>
            </div>
            <StageMeter meta={meta} watched={watchedCount} total={total} accent={accent} />
            {stage.copy && <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 10, lineHeight: 1.5 }}>{stage.copy}</div>}
          </div>
        )}

        {/* The path */}
        <div ref={pathRef} style={{ marginTop: 28 }}>
          <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 700, fontSize: 19, color: '#fff', marginBottom: 4 }}>The path</div>
          <div style={{ fontSize: 13, color: T.text2, marginBottom: 14 }}>Gentlest first, most intense last. Tap a poster for the trailer, tap the circle once you've watched it.</div>

          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 15, top: 20, bottom: 20, width: 2, background: `linear-gradient(to bottom, ${accent}22, ${accent})`, borderRadius: 1 }} />
            {items.map((item, i) => {
              const done = watchedSet.has(String(item.movie_id));
              const isNext = i === nextIdx;
              const stepName = meta.stages?.[Math.max(0, (item.intensity || 1) - 1)] || '';
              return (
                <div key={item.movie_id} style={{ position: 'relative', display: 'flex', gap: 14, paddingBottom: 14 }}>
                  <button type="button" onClick={() => onToggleWatched(arc.id, item.movie_id)} aria-label={done ? `Mark ${item.title} as not watched` : `Mark ${item.title} as watched`}
                    style={{ position: 'relative', zIndex: 1, width: 32, height: 32, marginTop: 34, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? accent : T.bg, border: `2px solid ${done || isNext ? accent : 'rgba(255,255,255,0.18)'}`, boxShadow: isNext ? `0 0 0 4px ${accent}22` : 'none', fontFamily: 'inherit' }}>
                    {done ? <Icon name="check" size={15} color="#06060B" stroke={3} /> : <span style={{ fontSize: 12.5, fontWeight: 800, color: isNext ? accent : T.text2 }}>{i + 1}</span>}
                  </button>

                  <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 12, padding: 10, borderRadius: 16, background: isNext ? `${accent}10` : T.surface, border: `1px solid ${isNext ? accent + '55' : T.hairline}` }}>
                    <button type="button" onClick={() => play(item)} aria-label={`Play trailer for ${item.title}`}
                      style={{ position: 'relative', width: 68, height: 100, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: 'none', padding: 0, cursor: 'pointer' }}>
                      {item.poster && <img src={item.poster} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: done ? 0.55 : 1 }} />}
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(6,6,11,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="play" size={12} color="#fff" filled />
                        </div>
                      </div>
                    </button>
                    <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: accent }}>{isNext ? 'Up next' : stepName}</div>
                      <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 700, fontSize: 17, lineHeight: 1.2, color: done ? T.text2 : '#fff', marginTop: 3 }}>{item.title}</div>
                      <div style={{ fontSize: 12.5, color: T.text2, marginTop: 4 }}>
                        {item.year || (item.release_date || '').slice(0, 4)}
                        {item.vote_average ? <>  <span style={{ color: '#FFD166' }}>★</span> {Number(item.vote_average).toFixed(1)}</> : null}
                      </div>
                      {item.overview && (
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.45, marginTop: 5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.overview}</div>
                      )}
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
            <div style={{ marginTop: 18, padding: 16, borderRadius: 18, background: T.surface, border: `1px solid ${T.hairline}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{engage.myRating ? 'Your rating' : 'Rate this arc'}</div>
                <div style={{ marginTop: 8 }}>
                  <Stars value={engage.myRating || 0} size={24} color={accent} onPick={user ? rateArc : null} />
                </div>
                {!user && <div style={{ fontSize: 12.5, color: T.text2, marginTop: 6 }}>Sign in to rate</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: T.serif, fontSize: 30, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{engage.avg != null ? Number(engage.avg).toFixed(1) : '–'}</div>
                <div style={{ fontSize: 12, color: T.text2, marginTop: 4 }}>{engage.count ? `${engage.count} rating${engage.count === 1 ? '' : 's'}` : 'No ratings yet'}</div>
              </div>
            </div>

            <div style={{ marginTop: 26 }}>
              <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 700, fontSize: 19, color: '#fff', marginBottom: 12 }}>
                Discussion {engage.comments?.length ? <span style={{ fontFamily: 'inherit', fontStyle: 'normal', fontSize: 14, color: T.text2, fontWeight: 500 }}>{engage.comments.length}</span> : null}
              </div>
              {user ? (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && postComment()} placeholder="Which step hit hardest?"
                    style={{ flex: 1, minWidth: 0, background: T.surface, border: `1px solid ${T.hairline}`, borderRadius: 14, padding: '12px 14px', color: '#fff', fontSize: 15, fontFamily: 'inherit', outline: 'none' }} />
                  <button type="button" onClick={postComment} disabled={posting || !commentText.trim()}
                    style={{ background: commentText.trim() ? accent : T.surface, border: `1px solid ${commentText.trim() ? accent : T.hairline}`, borderRadius: 14, padding: '0 16px', fontWeight: 800, fontSize: 14, color: commentText.trim() ? '#06060B' : T.text3, cursor: commentText.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>
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

  const chip = (active, a = accent) => ({
    flexShrink: 0, background: active ? a : 'rgba(255,255,255,0.05)', border: `1px solid ${active ? a : T.hairline}`,
    color: active ? '#06060B' : 'rgba(255,255,255,0.8)', borderRadius: 999, padding: '8px 15px', fontSize: 14,
    fontWeight: active ? 800 : 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 95, background: T.bg, display: 'flex', flexDirection: 'column', animation: 'arcsIn 0.35s cubic-bezier(0.22,1,0.36,1)' }}>
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
          <div style={{ padding: 'max(16px, env(safe-area-inset-top)) 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 800, fontSize: 34, lineHeight: 1.05, color: '#fff', margin: 0 }}>Cine Arcs</h1>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, margin: '8px 0 0', maxWidth: 420 }}>Watchlists that build. Each one starts easy and gets more intense with every title.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close"
              style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.hairline}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <Icon name="close" size={16} color="#fff" stroke={2} />
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '18px 20px 4px', scrollbarWidth: 'none' }}>
            {filterOptions.map((o) => (
              <button key={o.id} type="button" onClick={() => setFilter(o.id)} style={chip(filter === o.id, themes[o.id]?.accent || accent)}>{o.label}</button>
            ))}
          </div>

          <div style={{ padding: '14px 16px 0' }}>
            {/* Continue */}
            {filter === 'all' && inProgress.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 700, fontSize: 19, color: '#fff', margin: '4px 4px 10px' }}>Keep climbing</div>
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', margin: '0 -16px', padding: '0 16px' }}>
                  {inProgress.map(({ a, w, t }) => {
                    const ac = a.theme_meta?.accent || accent;
                    return (
                      <button key={a.id} type="button" onClick={() => openArc(a)}
                        style={{ flexShrink: 0, width: 250, display: 'flex', gap: 12, alignItems: 'center', padding: 10, borderRadius: 16, background: T.surface, border: `1px solid ${ac}44`, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                        <div style={{ width: 44, height: 64, borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }}>
                          {a.sample_posters?.[w] && <img src={a.sample_posters[w]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shortTitle(a.title)}</div>
                          <div style={{ fontSize: 12.5, color: ac, fontWeight: 700, marginTop: 3 }}>Step {w + 1} of {t}</div>
                          <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', marginTop: 8 }}>
                            <div style={{ width: `${(w / t) * 100}%`, height: '100%', background: ac, borderRadius: 2 }} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Official arcs */}
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[0, 1].map((i) => (
                  <div key={i} style={{ height: 330, borderRadius: 22, background: 'linear-gradient(90deg,rgba(255,255,255,0.03),rgba(255,255,255,0.07),rgba(255,255,255,0.03))', backgroundSize: '600px 100%', animation: 'arcsShimmer 1.3s linear infinite' }} />
                ))}
              </div>
            ) : loadError ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 16, color: '#fff', fontWeight: 700 }}>Arcs didn’t load</div>
                <div style={{ fontSize: 14, color: T.text2, marginTop: 6 }}>Check your connection and try again.</div>
                <button type="button" onClick={loadArcs} style={{ ...chip(false), marginTop: 14 }}>Try again</button>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', fontSize: 15, color: T.text2 }}>No arcs here yet. Try another filter.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {filtered.map((arc) => (
                  <ArcRow key={arc.id} arc={arc} progress={progressMap[arc.id]} rating={ratingsMap[arc.id]} onOpen={openArc} />
                ))}
              </div>
            )}

            {/* Build your own */}
            {filter === 'all' && !loading && (
              <div style={{ marginTop: 28, padding: '20px 18px', borderRadius: 22, background: T.surface, border: `1px dashed ${accent}55` }}>
                <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 800, fontSize: 23, color: '#fff' }}>Make one from your saves</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginTop: 6 }}>
                  {!user ? 'Sign in and save a few titles. We’ll line them up from easy watch to big finish.'
                    : !watchlist?.length ? 'Save a few titles from your feed first. We’ll line them up from easy watch to big finish.'
                    : 'We line up your saved titles from easy watch to big finish. Pick a genre to narrow it down.'}
                </div>

                {user && watchlist?.length >= 2 && (
                  <>
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', margin: '14px -18px 0', padding: '0 18px' }}>
                      {genreOptions.map((g) => (
                        <button key={g.id} type="button" onClick={() => setMyGenre(g.id)} style={{ ...chip(myGenre === g.id, GENRE_ARC_THEMES[g.id]?.accent || accent), padding: '7px 13px', fontSize: 13.5 }}>
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
                  style={{ marginTop: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, padding: '14px 16px', fontSize: 15, fontWeight: 800, fontFamily: 'inherit', cursor: myArcReady ? 'pointer' : 'default', border: 'none', background: myArcReady ? (myArc.theme_meta?.accent || accent) : 'rgba(255,255,255,0.06)', color: myArcReady ? '#06060B' : T.text2 }}>
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
