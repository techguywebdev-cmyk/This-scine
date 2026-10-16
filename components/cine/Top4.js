'use client';
import { useEffect, useState } from 'react';
import { T, ambient } from './shared';

// Top 4: the four films that say the most about you — shown on your profile and to everyone who visits it
const openTitle = (m) => window.dispatchEvent(new CustomEvent('cine:open-title', { detail: { id: m.id, title: m.title, poster: m.poster, year: m.year, isTV: m.type === 'tv', mediaType: m.type === 'tv' ? 'tv' : 'movie', accent: m.accent } }));
const eyebrow = (c) => ({ fontSize: 10.5, letterSpacing: 2.2, textTransform: 'uppercase', fontWeight: 700, color: c });

export function Top4Row({ items = [], accent = '#F5A623', editable = false, watchlist = [], label = 'Top 4', onSaved }) {
  const [list, setList] = useState(items);
  const [slot, setSlot] = useState(null);
  useEffect(() => { setList(items); }, [items]);
  if (!editable && !list.length) return null;
  const save = async (next) => {
    setList(next);
    try { await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ top4: next }) }); onSaved?.(next); } catch {}
  };
  const place = (m) => {
    const entry = { id: Number(m.id), type: m.isTV || m.mediaType === 'tv' || m.type === 'tv' ? 'tv' : 'movie', title: m.title, poster: m.poster || null, year: m.year || null, accent: m.accent || null };
    const next = [...list.filter((x) => !(x.id === entry.id && x.type === entry.type))];
    next.splice(Math.min(slot, next.length), 0, entry);
    save(next.slice(0, 4)); setSlot(null);
  };
  const remove = (i) => save(list.filter((_, k) => k !== i));
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={eyebrow(accent)}>{label}</span>
        {editable && <span style={{ fontSize: 11.5, color: T.text3 }}>{list.length < 4 ? 'Tap + to add' : 'Tap × to swap'}</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[0, 1, 2, 3].map((i) => {
          const m = list[i];
          if (m) return (
            <div key={`${m.type}-${m.id}`} style={{ position: 'relative', minWidth: 0 }}>
              <button type="button" onClick={() => openTitle(m)} aria-label={m.title} style={{ display: 'block', width: '100%', aspectRatio: '2/3', borderRadius: 8, overflow: 'hidden', border: 'none', padding: 0, cursor: 'pointer', background: T.surface, boxShadow: `0 10px 26px rgba(0,0,0,0.4), 0 0 0 1px ${(m.accent || accent)}33` }}>
                {m.poster && <img src={m.poster} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              </button>
              {editable && <button type="button" onClick={() => remove(i)} aria-label={`Remove ${m.title}`} style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(10,10,16,0.85)', color: '#fff', fontSize: 13, lineHeight: 1, cursor: 'pointer', padding: 0 }}>×</button>}
            </div>
          );
          return editable ? (
            <button key={i} type="button" onClick={() => setSlot(list.length)} aria-label="Add a favourite" style={{ aspectRatio: '2/3', borderRadius: 8, border: `1.5px dashed ${accent}66`, background: `${accent}0f`, color: accent, fontSize: 22, cursor: 'pointer', fontFamily: 'inherit' }}>+</button>
          ) : <div key={i} />;
        })}
      </div>
      {slot !== null && <Top4Picker accent={accent} watchlist={watchlist} onPick={place} onClose={() => setSlot(null)} />}
    </div>
  );
}

function Top4Picker({ accent, watchlist, onPick, onClose }) {
  const [q, setQ] = useState('');
  const [found, setFound] = useState(null);
  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { setFound(null); return undefined; }
    let alive = true;
    const k = setTimeout(() => fetch(`/api/movies?search=${encodeURIComponent(t)}`).then((r) => r.json()).then((d) => alive && setFound(d.movies || [])).catch(() => alive && setFound([])), 250);
    return () => { alive = false; clearTimeout(k); };
  }, [q]);
  useEffect(() => { const f = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f); }, [onClose]);
  const list = found || (watchlist || []).map((w) => ({ id: w.id ?? w.movie_id, title: w.title ?? w.movie_title, poster: w.poster ?? w.movie_poster, year: w.year ?? w.movie_year, accent: w.accent ?? w.movie_accent, isTV: w.isTV ?? w.is_tv }));
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 720, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Pick a favourite" style={{ width: '100%', maxWidth: 560, maxHeight: '86dvh', display: 'flex', flexDirection: 'column', background: ambient(accent), borderRadius: '22px 22px 0 0', borderTop: `1px solid ${T.hairline}`, padding: '10px 20px calc(20px + env(safe-area-inset-bottom))', color: '#fff' }}>
        <div style={{ width: 34, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)', margin: '0 auto 14px' }} />
        <div style={eyebrow(accent)}>Top 4</div>
        <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', margin: '4px 0 12px' }}>Pick a favourite</div>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search any film or series" aria-label="Search films" style={{ height: 46, borderRadius: 23, padding: '0 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff', fontSize: 15, fontFamily: 'inherit', outline: 'none' }} />
        <div style={{ fontSize: 11.5, color: T.text3, margin: '12px 0 8px' }}>{found ? `${found.length} results` : 'From your watchlist'}</div>
        <div style={{ overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, paddingBottom: 6 }}>
          {list.filter((m) => m.poster).map((m) => (
            <button key={`${m.isTV ? 't' : 'm'}${m.id}`} type="button" onClick={() => onPick(m)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', minWidth: 0 }}>
              <img src={m.poster} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: 6, display: 'block' }} />
              <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
            </button>
          ))}
          {!list.length && <div style={{ gridColumn: '1 / -1', fontSize: 13, color: T.text2, padding: '12px 0' }}>Search for a film above.</div>}
        </div>
      </div>
    </div>
  );
}
