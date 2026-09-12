'use client';
/**
 * Cine Arcs UI — progressive intensity watchlists
 * Copy to: components/CineArcs.js
 *
 * Usage from CineScroll:
 *   import CineArcs from './CineArcs';
 *   {showArcs && <CineArcs accent={accent} onClose={() => setShowArcs(false)} onWatchTrailer={...} watchlist={watchlist} />}
 */

import { useState, useEffect, useMemo } from 'react';

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

function IntensityMeter({ theme, progress, total, accent, stages = [] }) {
  const pct = total ? Math.round((progress / total) * 100) : 0;
  const stageIdx = total ? Math.min(stages.length - 1, Math.floor((progress / total) * stages.length)) : 0;
  const stageLabel = stages[stageIdx] || '';

  // Genre-tinted fills
  const fills = {
    fuse: `linear-gradient(90deg, ${accent}55 0%, ${accent} 100%)`,
    warmth: `linear-gradient(90deg, #FFB6D9 0%, ${accent} 100%)`,
    dread: `linear-gradient(90deg, #3a1010 0%, ${accent} 100%)`,
    fracture: `linear-gradient(90deg, #4a2a7a 0%, ${accent} 100%)`,
    laugh: `linear-gradient(90deg, #2a6a4a 0%, ${accent} 100%)`,
  };
  const fill = fills[theme] || fills.fuse;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: accent, letterSpacing: 0.5 }}>
          {stageLabel}
        </span>
        <span style={{ fontSize: 11, color: T.text3 }}>
          {progress}/{total} · {pct}%
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 6,
          background: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 6,
            background: fill,
            boxShadow: pct > 0 ? `0 0 12px ${accent}66` : 'none',
            transition: 'width 0.45s cubic-bezier(0.22,1,0.36,1)',
          }}
        />
      </div>
      {/* Stage dots */}
      {stages.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          {stages.map((s, i) => {
            const reached = stageIdx >= i && progress > 0;
            return (
              <div key={s} style={{ textAlign: 'center', flex: 1 }}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    margin: '0 auto 4px',
                    background: reached ? accent : 'rgba(255,255,255,0.12)',
                    boxShadow: reached ? `0 0 6px ${accent}` : 'none',
                  }}
                />
                <div
                  style={{
                    fontSize: 8,
                    color: reached ? accent : T.text3,
                    fontWeight: reached ? 700 : 500,
                    letterSpacing: 0.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    padding: '0 2px',
                  }}
                >
                  {s}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
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

/** 2-column grid card — dominant cover image with numbered mini-gallery at bottom */
function ArcCard({ arc, progress, onOpen, rating }) {
  const meta = arc.theme_meta || {};
  const accent = meta.accent || '#F5A623';
  const watched = progress?.watched?.length || 0;
  const total = arc.item_count || arc.items?.length || 0;
  const pct = total ? Math.round((watched / total) * 100) : 0;
  const posters = (arc.sample_posters || []).filter(Boolean).slice(0, 4);
  const cover = arc.cover_poster || posters[0] || null;
  const stageLabel = pct === 0 ? 'Not started' : pct === 100 ? 'Completed' : (meta.stages?.[0] || 'In progress');
  const genreLabel = arc.genre_label || arc.theme || '';
  const mediaLabel = arc.media_type === 'tv' ? 'TV' : null;

  return (
    <button
      type="button"
      onClick={() => onOpen(arc)}
      style={{
        display: 'flex', flexDirection: 'column', width: '100%', textAlign: 'left',
        background: T.bg, border: `1px solid ${T.hairline}`, borderRadius: 18,
        overflow: 'hidden', cursor: 'pointer', padding: 0, fontFamily: 'inherit',
      }}
    >
      {/* COVER — taller aspect ratio for cinematic feel */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '3/4' }}>
        {/* Main cover image */}
        <div style={{
          position: 'absolute', inset: 0,
          background: cover ? `url(${cover})` : `linear-gradient(160deg, ${accent}35, ${T.surface} 70%)`,
          backgroundSize: 'cover', backgroundPosition: 'center top',
        }}/>
        {/* Cinematic gradient — heavier at bottom to float the info */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(6,6,11,0.08) 0%, rgba(6,6,11,0.3) 40%, rgba(6,6,11,0.92) 100%)` }}/>
        {/* Accent glow */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: `radial-gradient(ellipse at 30% 100%, ${accent}18 0%, transparent 70%)`, pointerEvents: 'none' }}/>

        {/* Genre badge top-left */}
        <div style={{ position: 'absolute', top: 10, left: 10 }}>
          <span style={{ fontSize: 8.5, fontWeight: 800, color: accent, background: `${accent}20`, border: `1px solid ${accent}50`, borderRadius: 20, padding: '3px 8px', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            {genreLabel}{mediaLabel ? ` · ${mediaLabel}` : ''}
          </span>
        </div>

        {/* Title count top-right */}
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>{total} titles</span>
        </div>

        {/* Arc title over the image */}
        <div style={{ position: 'absolute', bottom: 54, left: 10, right: 10 }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 13, fontWeight: 800, fontStyle: 'italic', color: '#fff', lineHeight: 1.25, textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>
            {arc.title}
          </div>
        </div>

        {/* Mini poster row at bottom of cover */}
        <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', gap: 4 }}>
          {(posters.length ? posters : Array(4).fill(null)).slice(0, 4).map((src, i) => (
            <div key={i} style={{ position: 'relative', width: 28, height: 40, borderRadius: 6, overflow: 'hidden', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', flexShrink: 0 }}>
              {src && <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>}
              <div style={{ position: 'absolute', bottom: 2, left: 2, width: 12, height: 12, borderRadius: '50%', background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 6.5, fontWeight: 900, color: '#fff' }}>{i + 1}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* INFO STRIP */}
      <div style={{ padding: '10px 12px 12px', background: T.bg }}>
        {/* Progress bar */}
        <div style={{ height: 2.5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${accent}77, ${accent})`, borderRadius: 3, transition: 'width 0.5s ease' }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: pct === 100 ? accent : T.text3 }}>{stageLabel}</span>
          <span style={{ fontSize: 9, color: T.text3 }}>{watched}/{total}</span>
        </div>
      </div>
    </button>
  );
}
function ArcDetail({
  arc,
  progress,
  onBack,
  onToggleWatched,
  onWatchTrailer,
  accent: shellAccent,
  onShareComplete,
  shareStatus,
  user,
}) {
  const meta = arc.theme_meta || {};
  const accent = meta.accent || shellAccent || '#FF7A2F';
  const watchedSet = new Set(progress?.watched || []);
  const watchedCount = arc.items?.filter((i) => watchedSet.has(String(i.movie_id))).length || 0;
  const total = arc.items?.length || 0;
  const pct = total ? watchedCount / total : 0;
  const stageIdx = Math.min(
    (meta.stages?.length || 1) - 1,
    Math.floor(pct * (meta.stages?.length || 1))
  );
  const stageCopy = meta.stageCopy?.[stageIdx] || '';

  const [engage, setEngage] = useState({ avg: null, count: 0, myRating: null, comments: [] });
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [ratingBusy, setRatingBusy] = useState(false);

  useEffect(() => {
    if (!arc?.id) return;
    let cancelled = false;
    fetch(`/api/arcs/engage?arcId=${encodeURIComponent(arc.id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setEngage(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [arc?.id]);

  const rateArc = async (n) => {
    if (!user || ratingBusy) return;
    setRatingBusy(true);
    setEngage((p) => ({ ...p, myRating: n }));
    try {
      await fetch('/api/arcs/engage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rate', arcId: arc.id, rating: n }),
      });
      const d = await fetch(`/api/arcs/engage?arcId=${encodeURIComponent(arc.id)}`).then((r) => r.json());
      setEngage(d);
    } catch {}
    setRatingBusy(false);
  };

  const postComment = async () => {
    const body = commentText.trim();
    if (!body || posting || !user) return;
    setPosting(true);
    try {
      const res = await fetch('/api/arcs/engage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'comment',
          arcId: arc.id,
          text: body,
          username: user?.username || user?.firstName || 'user',
          avatarUrl: user?.imageUrl || null,
        }),
      });
      const d = await res.json();
      if (d.comment) {
        setEngage((p) => ({ ...p, comments: [d.comment, ...(p.comments || [])] }));
        setCommentText('');
      }
    } catch {}
    setPosting(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ position: 'relative', height: 160, flexShrink: 0 }}>
        {arc.cover_poster || arc.items?.[0]?.backdrop ? (
          <img
            src={arc.cover_poster || arc.items[0].backdrop}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(160deg, ${accent}40, #06060B)` }} />
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, #06060B 5%, transparent 60%)',
          }}
        />
        <button
          type="button"
          onClick={onBack}
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            background: 'rgba(0,0,0,0.5)',
            border: 'none',
            borderRadius: 20,
            padding: '8px 12px',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          ← Arcs
        </button>
      </div>

      <div style={{ padding: '0 18px 18px', flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 800, fontStyle: 'italic', color: T.text }}>
          {arc.title}
        </div>
        <div style={{ fontSize: 13, color: T.text2, marginTop: 4 }}>{arc.subtitle}</div>

        {(arc.is_user || String(arc.id || '').startsWith(MY_ARC_ID)) && (arc.user_name || user) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <img
              src={arc.user_avatar || user?.imageUrl || ''}
              alt=""
              style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', background: T.surface2 }}
            />
            <div style={{ fontSize: 12, color: T.text2 }}>
              by <span style={{ color: T.text, fontWeight: 600 }}>{arc.user_name || user?.username || user?.firstName || 'you'}</span>
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: 12,
            padding: '12px 14px',
            borderRadius: 14,
            background: T.surface2,
            border: `1px solid ${T.hairline}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 9.5, letterSpacing: 1.5, color: T.text3, fontWeight: 700, textTransform: 'uppercase' }}>
              Rate this arc
            </div>
            <div style={{ marginTop: 6 }}>
              <Stars
                value={engage.myRating || engage.avg || 0}
                size={18}
                color={accent}
                onPick={user ? rateArc : null}
              />
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 800, color: T.text }}>
              {engage.avg != null ? Number(engage.avg).toFixed(1) : '—'}
            </div>
            <div style={{ fontSize: 10, color: T.text3 }}>
              {engage.count ? `${engage.count} rating${engage.count === 1 ? '' : 's'}` : 'No ratings yet'}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 14,
            background: `${accent}12`,
            border: `1px solid ${accent}33`,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: accent, marginBottom: 4 }}>
            {meta.stages?.[stageIdx] || 'Progress'}
          </div>
          <div style={{ fontSize: 13, color: T.text, fontStyle: 'italic', fontFamily: T.serif, lineHeight: 1.4 }}>
            {stageCopy || 'Start the arc. Intensity rises with every title you finish.'}
          </div>
          <IntensityMeter
            theme={meta.meter || 'fuse'}
            progress={watchedCount}
            total={total}
            accent={accent}
            stages={meta.stages || []}
          />
        </div>

        <div
          style={{
            fontSize: 9.5,
            letterSpacing: 2,
            color: T.text3,
            fontWeight: 700,
            textTransform: 'uppercase',
            margin: '20px 0 10px',
          }}
        >
          The path · mild → peak
        </div>

        {(arc.items || []).map((item, i) => {
          const done = watchedSet.has(String(item.movie_id));
          const bars = item.intensity || 1;
          return (
            <div
              key={item.movie_id}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                padding: '12px 0',
                borderTop: i === 0 ? 'none' : `1px solid ${T.hairline}`,
                opacity: done ? 0.55 : 1,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 78,
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: T.surface2,
                  flexShrink: 0,
                  position: 'relative',
                }}
              >
                {item.poster ? (
                  <img src={item.poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : null}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    left: 4,
                    background: 'rgba(0,0,0,0.75)',
                    borderRadius: 6,
                    padding: '2px 5px',
                    fontSize: 9,
                    fontWeight: 700,
                    color: accent,
                  }}
                >
                  {i + 1}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: T.text,
                    textDecoration: done ? 'line-through' : 'none',
                  }}
                >
                  {item.title}
                </div>
                <div style={{ fontSize: 11, color: T.text3, marginTop: 3 }}>
                  {item.year || (item.release_date || '').slice(0, 4)}
                  {item.vote_average ? ` · ★ ${Number(item.vote_average).toFixed(1)}` : ''}
                </div>
                {/* Intensity ticks */}
                <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      style={{
                        width: 14,
                        height: 4,
                        borderRadius: 2,
                        background: n <= bars ? accent : 'rgba(255,255,255,0.1)',
                      }}
                    />
                  ))}
                  <span style={{ fontSize: 9, color: T.text3, marginLeft: 4 }}>
                    {['', 'Spark', 'Heat', 'Rise', 'Peak', 'Max'][bars] || ''}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => onToggleWatched(arc.id, item.movie_id)}
                  style={{
                    background: done ? `${accent}33` : 'transparent',
                    border: `1px solid ${done ? accent : T.hairline}`,
                    borderRadius: 14,
                    padding: '6px 10px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: done ? accent : T.text2,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {done ? 'Seen' : 'Mark'}
                </button>
                {onWatchTrailer && (
                  <button
                    type="button"
                    onClick={() =>
                      onWatchTrailer({
                        id: item.movie_id,
                        title: item.title,
                        poster_path: item.poster,
                        media_type: arc.media_type,
                      })
                    }
                    style={{
                      background: 'transparent',
                      border: `1px solid ${T.hairline}`,
                      borderRadius: 14,
                      padding: '6px 10px',
                      fontSize: 11,
                      color: T.text3,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Play
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {watchedCount === total && total > 0 && (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 16,
              background: `${accent}18`,
              border: `1px solid ${accent}44`,
              textAlign: 'center',
            }}
          >
            <div style={{ fontFamily: T.serif, fontSize: 18, fontStyle: 'italic', color: accent, fontWeight: 800 }}>
              Arc complete
            </div>
            <div style={{ fontSize: 12, color: T.text2, marginTop: 6, lineHeight: 1.45 }}>
              You walked the full intensity path.
            </div>
            <button
              type="button"
              onClick={() => onShareComplete && onShareComplete(arc)}
              disabled={shareStatus === 'shared' || shareStatus === 'sharing'}
              style={{
                marginTop: 12,
                background: shareStatus === 'shared' ? `${accent}33` : accent,
                border: 'none',
                borderRadius: 16,
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 700,
                color: shareStatus === 'shared' ? accent : '#07070F',
                cursor: shareStatus === 'shared' ? 'default' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {shareStatus === 'sharing'
                ? 'Sharing…'
                : shareStatus === 'shared'
                  ? 'Shared with friends'
                  : 'Share with friends'}
            </button>
          </div>
        )}

        {/* Discussion */}
        <div style={{ marginTop: 22, paddingBottom: 8 }}>
          <div
            style={{
              fontSize: 9.5,
              letterSpacing: 2,
              color: T.text3,
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Discussion
          </div>

          {user ? (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {user.imageUrl && (
                <img
                  src={user.imageUrl}
                  alt=""
                  style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && postComment()}
                  placeholder="Say something about this arc…"
                  style={{
                    flex: 1,
                    background: T.surface2,
                    border: `1px solid ${T.hairline}`,
                    borderRadius: 14,
                    padding: '10px 12px',
                    color: T.text,
                    fontSize: 13,
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={postComment}
                  disabled={posting || !commentText.trim()}
                  style={{
                    background: commentText.trim() ? accent : T.surface2,
                    border: 'none',
                    borderRadius: 14,
                    padding: '0 14px',
                    fontWeight: 700,
                    fontSize: 12,
                    color: commentText.trim() ? '#07070F' : T.text3,
                    cursor: commentText.trim() ? 'pointer' : 'default',
                    fontFamily: 'inherit',
                  }}
                >
                  Post
                </button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: T.text3, marginBottom: 12 }}>Sign in to rate and comment.</div>
          )}

          {(engage.comments || []).length === 0 ? (
            <div style={{ fontSize: 12, color: T.text3, padding: '8px 0 16px' }}>No comments yet — start the conversation.</div>
          ) : (
            (engage.comments || []).map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: '12px 0',
                  borderTop: `1px solid ${T.hairline}`,
                }}
              >
                {c.avatar_url ? (
                  <img
                    src={c.avatar_url}
                    alt=""
                    style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: T.surface2,
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: T.text, lineHeight: 1.4 }}>{c.body}</div>
                  <div style={{ fontSize: 11, color: T.text3, marginTop: 4 }}>
                    {c.username || 'user'}
                    {c.created_at
                      ? ` · ${new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                      : ''}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}


function ArcFilterSheet({ open, onClose, filter, setFilter, accent, themes }) {
  if (!open) return null;
  const themeKeys = themes && typeof themes === 'object' ? Object.keys(themes) : [];
  const options = [
    { id: 'all', label: 'All genres' },
    { id: 'movie', label: 'Movies only' },
    { id: 'tv', label: 'TV only' },
    ...themeKeys.map((k) => ({
      id: k,
      label: (themes[k] && themes[k].label) || k,
    })),
  ];
  // de-dupe by id
  const seen = new Set();
  const unique = options.filter((o) => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          background: T.bg,
          borderRadius: '22px 22px 0 0',
          border: `1px solid ${T.hairline}`,
          borderBottom: 'none',
          padding: '12px 18px 36px',
        }}
      >
        <div
          style={{
            width: 32,
            height: 3,
            borderRadius: 2,
            background: 'rgba(255,255,255,0.14)',
            margin: '0 auto 16px',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontFamily: T.serif,
              fontSize: 18,
              fontWeight: 800,
              fontStyle: 'italic',
              color: T.text,
            }}
          >
            Filter arcs
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: T.text2,
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {unique.map((o) => {
            const active = filter === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  setFilter(o.id);
                  onClose();
                }}
                style={{
                  textAlign: 'left',
                  background: active ? `${accent}18` : T.surface2,
                  border: `1px solid ${active ? accent + '55' : T.hairline}`,
                  borderRadius: 14,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? accent : T.text,
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CineArcs({ onClose, accent = '#F5A623', onWatchTrailer, watchlist = [], user = null }) {
  const [arcs, setArcs] = useState([]);
  const [themes, setThemes] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [active, setActive] = useState(null);
  const [detail, setDetail] = useState(null);
  const [progressMap, setProgressMap] = useState({});
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [myGenre, setMyGenre] = useState('all');
  const [shareStatus, setShareStatus] = useState({});
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [ratingsMap, setRatingsMap] = useState({});

  useEffect(() => {
    setProgressMap(loadProgress());
    fetch('/api/arcs')
      .then((r) => r.json())
      .then(async (d) => {
        const list = d.arcs || [];
        setArcs(list);
        setThemes(d.themes || {});
        setLoading(false);
        // Light rating prefetch for grid cards
        const map = {};
        await Promise.all(
          list.slice(0, 12).map(async (a) => {
            try {
              const r = await fetch(`/api/arcs/engage?arcId=${encodeURIComponent(a.id)}`);
              const j = await r.json();
              map[a.id] = { avg: j.avg, count: j.count };
            } catch {}
          })
        );
        setRatingsMap((p) => ({ ...p, ...map }));
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return arcs;
    if (filter === 'movie' || filter === 'tv') return arcs.filter((a) => a.media_type === filter);
    return arcs.filter((a) => a.theme === filter);
  }, [arcs, filter]);

  const genreOptions = useMemo(() => {
    const counts = {};
    (watchlist || []).forEach((m) => {
      movieGenres(m).forEach((g) => {
        counts[g] = (counts[g] || 0) + 1;
      });
    });
    const preferred = ['Action', 'Romance', 'Horror', 'Comedy', 'Drama', 'Sci-Fi', 'Thriller'];
    const opts = [{ id: 'all', label: 'All', count: (watchlist || []).length }];
    preferred.forEach((g) => {
      if (counts[g] >= 2) opts.push({ id: g, label: g, count: counts[g] });
    });
    Object.keys(counts)
      .filter((g) => !preferred.includes(g) && counts[g] >= 2)
      .slice(0, 4)
      .forEach((g) => opts.push({ id: g, label: g, count: counts[g] }));
    return opts;
  }, [watchlist]);

  const myArcPreview = useMemo(() => {
    if (!watchlist || watchlist.length === 0) return null;
    const built = buildWatchlistArc(watchlist, accent, myGenre);
    return {
      id: built.id,
      title: built.title,
      subtitle: built.subtitle,
      theme: built.theme,
      media_type: 'movie',
      item_count: built.items.length,
      cover_poster: built.cover_poster,
      theme_meta: built.theme_meta,
      tooSmall: built.items.length < 2,
    };
  }, [watchlist, accent, myGenre]);

  const openArc = async (arc) => {
    setActive(arc);
    setLoadingDetail(true);
    try {
      if (String(arc.id).startsWith(MY_ARC_ID)) {
        const g = arc.genre_key || myGenre || 'all';
        const built = buildWatchlistArc(watchlist, accent, g);
        setDetail({
          ...built,
          is_user: true,
          user_name: user?.username || user?.firstName || 'You',
          user_avatar: user?.imageUrl || null,
        });
      } else {
        const r = await fetch(`/api/arcs?id=${encodeURIComponent(arc.id)}`);
        const d = await r.json();
        setDetail(d);
      }
    } catch {
      setDetail(null);
    }
    setLoadingDetail(false);
  };

  const openMyWatchlistArc = () => {
    const built = buildWatchlistArc(watchlist, accent, myGenre);
    if (built.items.length < 2) return;
    openArc({ id: built.id, genre_key: myGenre });
  };

  const shareArcComplete = async (arc) => {
    if (!arc?.id) return;
    setShareStatus((p) => ({ ...p, [arc.id]: 'sharing' }));
    try {
      await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'arc_complete',
          listId: arc.id,
          listTitle: arc.title || 'a Cine Arc',
          listPoster: arc.cover_poster || arc.items?.[0]?.poster || null,
          listAccent: arc.theme_meta?.accent || accent,
          username: user?.username || user?.firstName || 'user',
          avatarUrl: user?.imageUrl || null,
        }),
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
      const has = cur.watched.includes(id);
      const watched = has ? cur.watched.filter((x) => x !== id) : [...cur.watched, id];
      const next = { ...prev, [arcId]: { watched } };
      saveProgress(next);
      return next;
    });
  };

  

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 95,
        background: T.bg,
        display: 'flex',
        flexDirection: 'column',
        animation: 'playerSlideUp 0.35s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <style>{`@keyframes playerSlideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {!detail ? (
        <>
          <div
            style={{
              padding: '16px 18px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <div>
              <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 800, fontStyle: 'italic', color: T.text }}>
                Cine Arcs
              </div>
              <div style={{ fontSize: 12, color: T.text3, marginTop: 2 }}>
                {filter === 'all' ? 'All genres · intensity rises as you go' : `Filtered · ${filter}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowFilterSheet(true)}
                style={{
                  background: filter !== 'all' ? `${accent}18` : T.surface2,
                  border: `1px solid ${filter !== 'all' ? accent : T.hairline}`,
                  borderRadius: 12,
                  height: 34,
                  padding: '0 12px',
                  cursor: 'pointer',
                  color: filter !== 'all' ? accent : T.text2,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'inherit',
                }}
              >
                Filter
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: T.surface2,
                  border: `1px solid ${T.hairline}`,
                  borderRadius: '50%',
                  width: 34,
                  height: 34,
                  cursor: 'pointer',
                  color: T.text2,
                  fontSize: 16,
                }}
              >
                ×
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 28px', WebkitOverflowScrolling: 'touch' }}>
            {/* Your arcs with profile */}
            {user && myArcPreview && !myArcPreview.tooSmall && filter === 'all' && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 9.5,
                    letterSpacing: 2,
                    color: T.text3,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    marginBottom: 10,
                    paddingLeft: 4,
                  }}
                >
                  Your arcs
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    padding: 12,
                    borderRadius: 16,
                    background: T.surface,
                    border: `1px solid ${T.hairline}`,
                    marginBottom: 10,
                  }}
                >
                  {user.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt=""
                      style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: T.surface2 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
                      {user.username || user.firstName || 'You'}
                    </div>
                    <div style={{ fontSize: 11, color: T.text3 }}>
                      {(watchlist || []).length} saves · build a personal path
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div
              style={{
                fontSize: 9.5,
                letterSpacing: 2,
                color: T.text3,
                fontWeight: 700,
                textTransform: 'uppercase',
                marginBottom: 10,
                paddingLeft: 4,
              }}
            >
              Official arcs
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 48, color: T.text3, fontSize: 13 }}>Loading arcs…</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: T.text3, fontSize: 13 }}>No arcs in this filter</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 0 8px' }}>
                {filtered.map((arc) => (
                  <ArcCard
                    key={arc.id}
                    arc={arc}
                    progress={progressMap[arc.id]}
                    onOpen={openArc}
                    rating={ratingsMap[arc.id]}
                  />
                ))}
              </div>
            )}

            {/* Build Your Arc */}
            <div style={{ marginTop: 16, position: 'relative', borderRadius: 20, overflow: 'hidden', border: `1px solid ${accent}30` }}>
              {/* Background glow */}
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${accent}12 0%, ${T.surface} 60%)` }}/>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`, pointerEvents: 'none' }}/>

              <div style={{ position: 'relative', padding: 18 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}20`, border: `1px solid ${accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 800, fontStyle: 'italic', color: T.text, lineHeight: 1.2 }}>Build Your Arc</div>
                    <div style={{ fontSize: 11, color: T.text3, marginTop: 1 }}>Turn your watchlist into a curated journey</div>
                  </div>
                </div>

                {/* Watchlist preview strip */}
                {watchlist && watchlist.length > 0 ? (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                      {watchlist.slice(0, 6).map((m, i) => (
                        <div key={m.movie_id || i} style={{ width: 36, height: 50, borderRadius: 7, overflow: 'hidden', background: T.surface, border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                          {m.poster && <img src={m.poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>}
                        </div>
                      ))}
                      {watchlist.length > 6 && (
                        <div style={{ width: 36, height: 50, borderRadius: 7, background: T.surface2, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: T.text3 }}>+{watchlist.length - 6}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: T.text2 }}>
                      <span style={{ fontWeight: 700, color: accent }}>{watchlist.length}</span> titles saved · pick a genre to shape your path
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: `1px solid ${T.hairline}` }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.text3} strokeWidth="1.5" strokeLinecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                    <span style={{ fontSize: 12, color: T.text3 }}>Save movies to your watchlist first</span>
                  </div>
                )}

                {/* Genre chips */}
                {watchlist && watchlist.length >= 2 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                    {genreOptions.map((g) => {
                      const active = myGenre === g.id;
                      const chipAccent = g.id !== 'all' && GENRE_ARC_THEMES[g.id]?.accent ? GENRE_ARC_THEMES[g.id].accent : accent;
                      return (
                        <button key={g.id} type="button" onClick={() => setMyGenre(g.id)}
                          style={{ background: active ? `${chipAccent}22` : T.surface2, border: `1px solid ${active ? chipAccent : T.hairline}`, borderRadius: 20, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: active ? chipAccent : T.text2, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.18s ease' }}>
                          {g.label}{g.count != null ? ` · ${g.count}` : ''}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Intensity meter preview */}
                {myArcPreview && !myArcPreview.tooSmall && (
                  <div style={{ marginBottom: 14 }}>
                    <IntensityMeter
                      theme={myArcPreview.theme_meta?.meter || 'fuse'}
                      progress={progressMap[myArcPreview.id]?.watched?.length || 0}
                      total={myArcPreview.item_count}
                      accent={myArcPreview.theme_meta?.accent || accent}
                      stages={myArcPreview.theme_meta?.stages || []}
                    />
                  </div>
                )}

                {/* CTA Button */}
                <button type="button" onClick={openMyWatchlistArc} disabled={!myArcPreview || myArcPreview.tooSmall}
                  style={{ width: '100%', background: myArcPreview && !myArcPreview.tooSmall ? (myArcPreview.theme_meta?.accent || accent) : 'rgba(255,255,255,0.06)', border: `1px solid ${myArcPreview && !myArcPreview.tooSmall ? 'transparent' : T.hairline}`, borderRadius: 14, padding: '13px 16px', fontSize: 14, fontWeight: 700, color: myArcPreview && !myArcPreview.tooSmall ? '#07070F' : T.text3, cursor: myArcPreview && !myArcPreview.tooSmall ? 'pointer' : 'default', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s ease' }}>
                  {!watchlist || watchlist.length === 0 ? (
                    <>Save movies first</>
                  ) : myArcPreview?.tooSmall ? (
                    <>{myGenre === 'all' ? 'Need 2+ titles' : `Need 2+ ${myGenre} titles`}</>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      {myGenre === 'all' ? 'Build my Arc' : `Build ${myGenre} Arc`}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : loadingDetail ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              width: 24,
              height: 24,
              border: '2px solid rgba(255,255,255,0.1)',
              borderTop: `2px solid ${accent}`,
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </div>
      ) : (
        <ArcDetail
          arc={detail}
          progress={progressMap[detail.id]}
          onBack={() => {
            setDetail(null);
            setActive(null);
          }}
          onToggleWatched={toggleWatched}
          onWatchTrailer={onWatchTrailer}
          accent={accent}
          onShareComplete={shareArcComplete}
          shareStatus={shareStatus[detail.id]}
          user={user}
        />
      )}

      <ArcFilterSheet
        open={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        filter={filter}
        setFilter={setFilter}
        accent={accent}
        themes={themes}
      />
    </div>
  );
}
