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

/** Order a free-form watchlist mild → peak */
function buildWatchlistArc(watchlist, accent) {
  const items = (watchlist || [])
    .map((m, idx) => {
      const rating = Number(m.vote_average || m.rating || 6.5);
      const runtime = Number(m.runtime || 110);
      const year = Number(String(m.release_date || m.year || '2010').slice(0, 4));
      const score = rating * 1.15 + runtime / 45 + (year - 1990) / 25;
      return { m, score, idx };
    })
    .sort((a, b) => a.score - b.score)
    .map(({ m }, i, arr) => {
      const intensity = Math.min(5, Math.max(1, Math.ceil(((i + 1) / arr.length) * 5)));
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
  return {
    id: MY_ARC_ID,
    slug: MY_ARC_ID,
    title: 'My Watchlist Arc',
    subtitle: 'Your saves, ordered mild → peak',
    theme: 'action',
    media_type: 'movie',
    cover_poster: cover,
    theme_meta: {
      id: 'personal',
      label: 'Yours',
      accent: accent || '#F5A623',
      meter: 'fuse',
      stages: ['Warm-up', 'Climb', 'Heat', 'Peak', 'Encore'],
      stageCopy: [
        'Ease in. No pressure.',
        'The path starts climbing.',
        'You’re in the thick of it.',
        'This is your peak stretch.',
        'You finished your own arc.',
      ],
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

function ArcCard({ arc, progress, onOpen }) {
  const meta = arc.theme_meta || {};
  const accent = meta.accent || '#FF7A2F';
  const watched = progress?.watched?.length || 0;
  const total = arc.item_count || 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(arc)}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: T.surface,
        border: `1px solid ${T.hairline}`,
        borderRadius: 18,
        overflow: 'hidden',
        cursor: 'pointer',
        padding: 0,
        fontFamily: 'inherit',
        marginBottom: 14,
      }}
    >
      <div style={{ position: 'relative', height: 120, background: '#111' }}>
        {arc.cover_poster ? (
          <img
            src={arc.cover_poster}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${accent}33, #0a0a12)` }} />
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, #06060B 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            background: `${accent}22`,
            border: `1px solid ${accent}55`,
            borderRadius: 12,
            padding: '4px 10px',
            fontSize: 10,
            fontWeight: 700,
            color: accent,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {meta.label || arc.theme} · {arc.media_type === 'tv' ? 'TV' : 'Film'}
        </div>
      </div>
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 800, fontStyle: 'italic', color: T.text }}>
          {arc.title}
        </div>
        <div style={{ fontSize: 12, color: T.text3, marginTop: 4, lineHeight: 1.4 }}>{arc.subtitle}</div>
        <IntensityMeter
          theme={meta.meter || 'fuse'}
          progress={watched}
          total={total}
          accent={accent}
          stages={meta.stages || []}
        />
      </div>
    </button>
  );
}

function ArcDetail({ arc, progress, onBack, onToggleWatched, onWatchTrailer, accent: shellAccent }) {
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
            <div style={{ fontSize: 12, color: T.text2, marginTop: 6 }}>
              You walked the full intensity path. Pick another arc — or build your own from your watchlist.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CineArcs({ onClose, accent = '#F5A623', onWatchTrailer, watchlist = [] }) {
  const [arcs, setArcs] = useState([]);
  const [themes, setThemes] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [active, setActive] = useState(null);
  const [detail, setDetail] = useState(null);
  const [progressMap, setProgressMap] = useState({});
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    setProgressMap(loadProgress());
    fetch('/api/arcs')
      .then((r) => r.json())
      .then((d) => {
        setArcs(d.arcs || []);
        setThemes(d.themes || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return arcs;
    if (filter === 'movie' || filter === 'tv') return arcs.filter((a) => a.media_type === filter);
    return arcs.filter((a) => a.theme === filter);
  }, [arcs, filter]);

  const myArcPreview = useMemo(() => {
    if (!watchlist || watchlist.length === 0) return null;
    const built = buildWatchlistArc(watchlist, accent);
    return {
      id: built.id,
      title: built.title,
      subtitle: built.subtitle,
      theme: 'personal',
      media_type: 'movie',
      item_count: built.items.length,
      cover_poster: built.cover_poster,
      theme_meta: built.theme_meta,
    };
  }, [watchlist, accent]);

  const openArc = async (arc) => {
    setActive(arc);
    setLoadingDetail(true);
    try {
      if (arc.id === MY_ARC_ID) {
        setDetail(buildWatchlistArc(watchlist, accent));
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
    if (!watchlist || watchlist.length < 2) return;
    openArc({ id: MY_ARC_ID });
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

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'action', label: 'Action' },
    { id: 'romance', label: 'Romance' },
    { id: 'horror', label: 'Horror' },
    { id: 'mind', label: 'Mind' },
    { id: 'movie', label: 'Films' },
    { id: 'tv', label: 'TV' },
  ];

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
              padding: '16px 18px 0',
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
              <div style={{ fontSize: 12, color: T.text3, marginTop: 2 }}>Intensity rises as you go</div>
            </div>
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

          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: '14px 18px',
              overflowX: 'auto',
              flexShrink: 0,
              scrollbarWidth: 'none',
            }}
          >
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                style={{
                  background: filter === f.id ? accent : T.surface2,
                  border: `1px solid ${filter === f.id ? accent : T.hairline}`,
                  borderRadius: 16,
                  padding: '7px 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: filter === f.id ? '#07070F' : T.text2,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 28px', WebkitOverflowScrolling: 'touch' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 48, color: T.text3, fontSize: 13 }}>Loading arcs…</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: T.text3, fontSize: 13 }}>No arcs in this filter</div>
            ) : (
              filtered.map((arc) => (
                <ArcCard key={arc.id} arc={arc} progress={progressMap[arc.id]} onOpen={openArc} />
              ))
            )}

            {/* Personal watchlist → Arc */}
            <div
              style={{
                marginTop: 8,
                padding: 16,
                borderRadius: 16,
                border: `1px solid ${T.hairline}`,
                background: T.surface,
              }}
            >
              <div style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 800, fontStyle: 'italic', color: T.text }}>
                Your watchlist, as an Arc
              </div>
              <div style={{ fontSize: 12, color: T.text3, marginTop: 6, lineHeight: 1.45 }}>
                {!watchlist || watchlist.length === 0
                  ? 'Save a few titles, then turn them into a mild→peak path.'
                  : watchlist.length < 2
                    ? 'Add at least 2 titles to build your arc.'
                    : `We’ll sort ${watchlist.length} saves from easier entry points to peak intensity.`}
              </div>
              {myArcPreview && (
                <div style={{ marginTop: 12 }}>
                  <IntensityMeter
                    theme="fuse"
                    progress={progressMap[MY_ARC_ID]?.watched?.length || 0}
                    total={myArcPreview.item_count}
                    accent={accent}
                    stages={myArcPreview.theme_meta.stages}
                  />
                </div>
              )}
              <button
                type="button"
                onClick={openMyWatchlistArc}
                disabled={!watchlist || watchlist.length < 2}
                style={{
                  marginTop: 14,
                  width: '100%',
                  background: watchlist && watchlist.length >= 2 ? accent : T.surface2,
                  border: 'none',
                  borderRadius: 16,
                  padding: '12px 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: watchlist && watchlist.length >= 2 ? '#07070F' : T.text3,
                  cursor: watchlist && watchlist.length >= 2 ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                }}
              >
                {!watchlist || watchlist.length === 0
                  ? 'Save movies first'
                  : watchlist.length < 2
                    ? 'Need 2+ titles'
                    : 'Build my Arc'}
              </button>
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
        />
      )}
    </div>
  );
}
