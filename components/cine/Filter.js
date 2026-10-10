'use client';
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import ImportSheet from '../ImportSheet';
import { GENRE_OPTIONS, GRADS, SvgIcon, T, ambient, dayPart } from './shared';

// DISCOVER / FILTER SHEET
export function FilterSheet({ show, onClose, activeGenre, activeMood, onGenre, onMood, accent, onSearchSelect, activeProvider, onProvider, onOpenFolder, onOpenFolders }) {
  const [searchQ, setSearchQ] = useState('');
  const [searchRes, setSearchRes] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchMood, setSearchMood] = useState(null);
  const [popular, setPopular] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(false);
  const [tonight, setTonight] = useState([]);
  const [loadingTonight, setLoadingTonight] = useState(false);
  const [focused, setFocused] = useState(false);
  const [folders, setFolders] = useState([]);

  const MOOD_SIGNALS = [
    ['happy','cheerful','funny','laugh','comedy','light','feel good'],
    ['sad','cry','emotional','heartbreak','tearjerker','melancholy'],
    ['scary','horror','terrifying','creepy','dark','thriller','suspense'],
    ['romantic','love','date night','romance'],
    ['action','exciting','adrenaline','intense','epic','adventure'],
    ['thought provoking','intelligent','deep','mind bending','complex'],
    ['chill','relaxing','easy','calm','comfort','cozy'],
    ['inspiring','uplifting','motivating'],
  ];
  const MOOD_NAMES = ['happy','sad','horror','romance','action','thoughtful','chill','uplifting'];
  const detectMood = (q) => {
    const lower = q.toLowerCase();
    for (let i = 0; i < MOOD_SIGNALS.length; i++) {
      if (MOOD_SIGNALS[i].some(kw => lower.includes(kw))) return MOOD_NAMES[i];
    }
    return null;
  };

  useEffect(() => {
    if (!searchQ.trim()) { setSearchRes([]); setSearching(false); setSearchMood(null); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const detectedMood = detectMood(searchQ);
        setSearchMood(detectedMood);
        const params = new URLSearchParams({ search: searchQ });
        if (detectedMood) params.set('mood', detectedMood);
        const res = await fetch(`/api/movies?${params}`);
        const data = await res.json();
        setSearchRes(data.movies || []);
      } catch {}
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [searchQ]);

  const loadPopular = () => {
    setLoadingPopular(true);
    fetch('/api/movies?popular=1')
      .then(r => r.json())
      .then(d => { setPopular((d.movies || []).slice(0, 6)); setLoadingPopular(false); })
      .catch(() => setLoadingPopular(false));
  };

  // Rotate popular + load the time-of-day picks whenever Discover opens
  useEffect(() => {
    if (!show) return;
    setLoadingTonight(true);
    let preferred = '';
    try { preferred = localStorage.getItem('cine_preferred_provider') || ''; } catch {}
    const params = new URLSearchParams({ mood: 'trending', page: '1' });
    if (preferred) params.set('provider', preferred);
    fetch(`/api/movies?${params}`)
      .then(r => r.json())
      .then(d => {
        const pool = (d.movies || []).filter(m => !m.isUpcoming);
        // Stable daily order so picks feel like "today's", not random every open
        const day = new Date().toISOString().slice(0, 10);
        let seed = 0;
        for (let i = 0; i < day.length; i++) seed = (seed * 31 + day.charCodeAt(i)) >>> 0;
        const ranked = [...pool].sort((a, b) => (((a.id * 2654435761) ^ seed) >>> 0) - (((b.id * 2654435761) ^ seed) >>> 0));
        setTonight(ranked.slice(0, 8));
        setLoadingTonight(false);
      })
      .catch(() => setLoadingTonight(false));
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [show]);

  const pick = (m) => {
    onSearchSelect && onSearchSelect(m);
    setSearchQ(''); setSearchRes([]);
    onClose();
  };

  // One list for "what kind of feed" — moods and quick filters were the same thing in two shapes
  const FEEDS = [
    { label: 'Trending',       apiMood: 'Trending',      icon: 'flame',    desc: 'Hot right now' },
    { label: 'Top rated',      apiMood: 'Top Rated',     icon: 'star',     desc: 'Best of all time' },
    { label: 'New this week',  apiMood: 'New',           icon: 'sparkle',  desc: 'Just landed' },
    { label: 'Coming soon',    apiMood: 'Upcoming',      icon: 'calendar', desc: 'First looks' },
    { label: 'Hidden gems',    apiMood: 'Hidden Gems',   icon: 'gem',      desc: 'Under the radar' },
    { label: 'International',  apiMood: 'International', icon: 'globe',   desc: 'Beyond Hollywood' },
    { label: 'Award winners',  apiMood: 'Awards',        icon: 'trophy',   desc: 'Oscar, Cannes & festival picks' },
  ];

  const PLATFORMS = [
    { name: 'Netflix',   color: '#E50914' },
    { name: 'Prime',     color: '#00A8E0' },
    { name: 'Disney+',   color: '#3D7BFF' },
    { name: 'Apple TV+', color: '#FFFFFF' },
    { name: 'Max',       color: '#5B7CFF' },
    { name: 'Hulu',      color: '#1CE783' },
  ];

  const moodIs = (m) => (activeMood || 'Trending').toLowerCase() === m.apiMood.toLowerCase();
  const genreLabel = GENRE_OPTIONS.find(g => g.id === activeGenre)?.label;
  const feedLabel = FEEDS.find(moodIs)?.label;
  const hasFilters = (activeMood && activeMood !== 'Trending') || activeGenre || activeProvider;

  const chooseFeed = (m) => { onMood(m.apiMood); onClose(); };
  // one cover image per feed tile — fetched once per session
  const [feedCovers, setFeedCovers] = useState(() => { try { return JSON.parse(sessionStorage.getItem('cs_feed_covers') || '{}'); } catch { return {}; } });
  useEffect(() => {
    if (!show || Object.keys(feedCovers).length >= FEEDS.length) return;
    let alive = true;
    Promise.all(FEEDS.map(f => fetch(`/api/movies?mood=${encodeURIComponent(f.apiMood)}&page=1`).then(r => r.json()).then(d => d.movies || []).catch(() => [])))
      .then(lists => {
        if (!alive) return;
        const used = new Set(); const out = {};
        lists.forEach((list, i) => {
          const m = list.find(x => (x.backdrop || x.poster) && !used.has(x.id)) || list.find(x => x.backdrop || x.poster);
          if (m) { used.add(m.id); out[FEEDS[i].apiMood] = m.backdrop || m.poster; }
        });
        setFeedCovers(out);
        try { sessionStorage.setItem('cs_feed_covers', JSON.stringify(out)); } catch {}
      });
    return () => { alive = false; };
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps
  const chooseGenre = (id) => { onGenre(activeGenre === id ? '' : id); onClose(); };
  const choosePlatform = (p) => {
    const on = activeProvider === p.name;
    if (on) {
      onProvider && onProvider('');
      try { localStorage.removeItem('cine_preferred_provider'); } catch {}
    } else {
      onProvider && onProvider(p.name);
      try { localStorage.setItem('cine_preferred_provider', p.name); } catch {}
    }
    onClose();
  };
  const clearAll = () => {
    onMood('Trending'); onGenre(''); onProvider && onProvider('');
    try { localStorage.removeItem('cine_preferred_provider'); } catch {}
  };

  if (!show) return null;

  const H = ({ children, right }) => (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '30px 0 6px' }}>
      <span style={{  fontSize:10.5,letterSpacing:2.2,textTransform:'uppercase', fontWeight:700, color:accent }}>{children}</span>
      {right}
    </div>
  );
  const Spinner = () => (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.1)', borderTop: `2px solid ${accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
  const Row = ({ m, i, rank }) => (
    <div role="button" tabIndex={0} onClick={() => pick(m)} onKeyDown={(e) => e.key === 'Enter' && pick(m)}
      style={{ display: 'flex', gap: 14, padding: '14px 0', borderTop: `1px solid ${T.hairline}`, cursor: 'pointer' }}>
      {rank != null && <div style={{ width: 18, flexShrink: 0, fontFamily: T.serif, fontSize: 16, fontWeight: 700, color: rank === 1 ? accent : 'rgba(255,255,255,0.3)', paddingTop: 1 }}>{rank}</div>}
      <div style={{ width: 56, aspectRatio: '2/3', borderRadius: 3, overflow: 'hidden', flexShrink: 0, background: m.gradient || GRADS[i % GRADS.length] }}>
        {m.poster && <img src={m.poster} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, fontSize: 11, color:T.text2 }}>
          <span>{m.year}</span>
          {m.rating && m.rating !== 'N/A' && <><span>·</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'rgba(255,255,255,0.85)' }}><SvgIcon name="star" size={10} color="#FFD166" filled />{m.rating}</span></>}
          {m.isTV && <><span>·</span><span>Series</span></>}
        </div>
        {m.overview && <p style={{ fontSize: 12, color:'rgba(255,255,255,0.58)', lineHeight: 1.45, margin: '5px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.overview}</p>}
      </div>
    </div>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 91, height: '92dvh', background:ambient(accent), borderRadius: '18px 18px 0 0', borderTop: `1px solid ${T.hairline}`, display: 'flex', flexDirection: 'column', animation: 'sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)' }}>
        <style>{`@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.cs-disc-input::placeholder{color:rgba(255,255,255,0.35)}`}</style>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)', margin: '10px auto 0', flexShrink: 0 }} />

        {/* Header + search */}
        <div style={{ position: 'relative', padding: '12px 20px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily:T.serif, fontSize:16,letterSpacing:'-0.02em', fontWeight:700, color:T.text }}>Discover</span>
            <button onClick={onClose} aria-label="Close" style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SvgIcon name="close" size={14} color="#fff" /></button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, paddingBottom: 10, borderBottom: `1.5px solid ${focused ? accent : 'rgba(255,255,255,0.14)'}`, transition: 'border-color 0.2s ease' }}>
            <SvgIcon name="search" size={18} color={focused ? accent : 'rgba(255,255,255,0.5)'} />
            <input
              className="cs-disc-input"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search a title, or describe a mood"
              enterKeyHint="search"
              style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 14, fontFamily: 'inherit' }}
            />
            {searchQ && (
              <button onClick={() => setSearchQ('')} aria-label="Clear search" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
                <SvgIcon name="close" size={13} color="rgba(255,255,255,0.6)" />
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 20px calc(36px + env(safe-area-inset-bottom))', scrollbarWidth: 'none', overscrollBehavior: 'contain' }}>
          {!searchQ.trim() ? (
            <>
              {/* What the feed is showing now */}
              {hasFilters && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 0', borderBottom: `1px solid ${T.hairline}` }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Your feed: <span style={{ color: '#fff', fontWeight: 700 }}>{[feedLabel && feedLabel !== 'Trending' ? feedLabel : null, genreLabel && activeGenre ? genreLabel : null, activeProvider || null].filter(Boolean).join(' · ')}</span>
                  </span>
                  <button onClick={clearAll} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: accent, fontFamily: 'inherit', flexShrink: 0 }}>Clear all</button>
                </div>
              )}

              {/* Time-of-day picks */}
              <H right={<span style={{ fontSize: 12, color:T.text2 }}>{activeProvider ? `On ${activeProvider}` : 'Trending today'}</span>}>{dayPart().title} for you</H>
              {loadingTonight ? <Spinner /> : tonight.length === 0 ? (
                <p style={{ fontSize: 12.5, color:T.text2, lineHeight: 1.5, margin: '6px 0 0' }}>Pick a platform below and we’ll fill this with what you can watch {dayPart().phrase}.</p>
              ) : (
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', margin: '8px -20px 0', padding: '0 20px' }}>
                  {tonight.map((m, i) => (
                    <div key={m.id} role="button" tabIndex={0} onClick={() => pick(m)} onKeyDown={(e) => e.key === 'Enter' && pick(m)} style={{ flexShrink: 0, width: 112, cursor: 'pointer' }}>
                      <div style={{ width: '100%', aspectRatio: '2/3', borderRadius: 3, overflow: 'hidden', background: m.gradient || GRADS[i % GRADS.length] }}>
                        {m.poster && <img src={m.poster} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginTop: 8, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color:T.text2, marginTop: 2 }}>
                        {m.year}{m.rating && m.rating !== 'N/A' && <> · <SvgIcon name="star" size={9} color="#FFD166" filled /><span style={{ color: 'rgba(255,255,255,0.8)' }}>{m.rating}</span></>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Feed type — tile grid with a live cover per category */}
              <H>Browse by</H>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 4 }}>
                {FEEDS.map((m, i) => {
                  const on = moodIs(m);
                  const wide = i === FEEDS.length - 1 && FEEDS.length % 2 === 1;
                  const cover = feedCovers[m.apiMood];
                  return (
                    <div key={m.label} role="button" tabIndex={0} aria-pressed={on} onClick={() => chooseFeed(m)} onKeyDown={(e) => e.key === 'Enter' && chooseFeed(m)}
                      style={{ gridColumn: wide ? '1 / -1' : 'auto', position: 'relative', height: wide ? 92 : 104, borderRadius: 10, overflow: 'hidden', cursor: 'pointer', background: `linear-gradient(140deg, ${accent}22, rgba(255,255,255,0.03))`, boxShadow: on ? `inset 0 0 0 2px ${accent}` : 'inset 0 0 0 1px rgba(255,255,255,0.08)', transition: 'box-shadow .2s' }}>
                      {cover && <img src={cover} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: on ? 0.6 : 0.42, transition: 'opacity .3s', animation: 'fadeIn .5s ease' }} />}
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(6,6,11,0.15) 0%, rgba(6,6,11,0.85) 100%)' }} />
                      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 11 }}>
                        <SvgIcon name={m.icon} size={17} color={on ? accent : '#fff'} filled={m.icon === 'star' || m.icon === 'sparkle'} />
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fff', marginTop: 6, lineHeight: 1.15 }}>{m.label}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.desc}</div>
                      </div>
                      {on && <div style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SvgIcon name="check" size={12} color="#07070F" /></div>}
                    </div>
                  );
                })}
              </div>

              {/* Genre — plain text, 2-column grid */}
              <H>Genre</H>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 22 }}>
                {[{ id: '', label: 'Any genre' }, ...GENRE_OPTIONS.filter(g => g.id)].map(g => {
                  const on = (activeGenre || '') === g.id;
                  return (
                    <button key={g.id || 'any'} onClick={() => chooseGenre(g.id)} aria-pressed={on}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'none', border: 'none', borderTop: `1px solid ${T.hairline}`, padding: '13px 0', cursor: 'pointer', fontFamily: T.serif, fontSize: 15, letterSpacing: '-0.01em', fontWeight: on ? 700 : 600, color: on ? accent : 'rgba(255,255,255,0.82)', textAlign: 'left', transition: 'color .2s' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: on ? accent : 'rgba(255,255,255,0.18)', flexShrink: 0, boxShadow: on ? `0 0 8px ${accent}` : 'none', transition: 'all .2s' }} />
                        {g.label}
                      </span>
                      {on && <SvgIcon name="check" size={14} color={accent} />}
                    </button>
                  );
                })}
              </div>

              {/* Platforms — tinted tiles */}
              <H>Platforms</H>
              <div style={{ fontSize: 11.5, color: T.text2, marginTop: -4, marginBottom: 10 }}>Only show what you can stream</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {PLATFORMS.map(p => {
                  const on = activeProvider === p.name;
                  return (
                    <div key={p.name} role="button" tabIndex={0} aria-pressed={on} onClick={() => choosePlatform(p)} onKeyDown={(e) => e.key === 'Enter' && choosePlatform(p)}
                      style={{ position: 'relative', height: 64, borderRadius: 10, cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(120% 120% at 0% 0%, ${p.color}${on ? '55' : '33'}, transparent 70%), rgba(255,255,255,0.03)`, boxShadow: on ? `inset 0 0 0 2px ${accent}` : 'inset 0 0 0 1px rgba(255,255,255,0.08)', transition: 'box-shadow .2s, background .2s' }}>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>{p.name}</span>
                      {on && <div style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SvgIcon name="check" size={10} color="#07070F" /></div>}
                    </div>
                  );
                })}
              </div>

            </>
          ) : (
            <div>
              {searching ? <Spinner /> : searchRes.length === 0 ? (
                <div style={{ padding: '36px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>Nothing found for “{searchQ}”</div>
                  <div style={{ fontSize: 12.5, color:T.text2, marginTop: 6, lineHeight: 1.5 }}>Check the spelling, or describe a mood instead, like “something scary” or “feel good”.</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color:T.text2, padding: '16px 0 8px' }}>
                    {searchMood ? <>Showing <span style={{ color: accent, fontWeight: 700 }}>{searchMood}</span> picks for “{searchQ}”</> : <>{searchRes.length} results for “{searchQ}”</>}
                  </div>
                  <div>{searchRes.map((m, i) => <Row key={m.id} m={m} i={i} />)}</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
