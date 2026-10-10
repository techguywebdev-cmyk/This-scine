'use client';
import { useRef, useState } from 'react';
import { readExportFiles } from '@/lib/importParse';

// Bring your film history from Letterboxd or IMDb.
// Parsing happens in the browser; titles are matched to TMDB on the server in batches of 40.
const BATCH = 40;
const MAX_ITEMS = 3000;

const ambient = (a) => `radial-gradient(120% 70% at 0% 0%, ${a}2e 0%, transparent 70%), radial-gradient(120% 70% at 100% 100%, ${a}24 0%, transparent 70%), linear-gradient(165deg, ${a}1f 0%, ${a}12 50%, ${a}1c 100%), #06060B`;
const glass = { background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.14)' };
const eyebrow = (accent) => ({ fontSize: 10.5, letterSpacing: 2.2, textTransform: 'uppercase', fontWeight: 700, color: accent });

const SOURCES = {
  letterboxd: {
    name: 'Letterboxd',
    steps: ['On letterboxd.com, open Settings → Data', 'Tap “Export your data” and download the ZIP', 'Upload that ZIP here — no need to unzip it'],
    accept: '.zip,.csv',
  },
  imdb: {
    name: 'IMDb',
    steps: ['On imdb.com, open Your Ratings → ⋯ → Export', 'Do the same for your Watchlist (optional)', 'Upload the CSV files here — you can pick both at once'],
    accept: '.csv',
  },
};

export default function ImportSheet({ accent = '#F5A623', onClose, onImported }) {
  const [src, setSrc] = useState('letterboxd');
  const [phase, setPhase] = useState('pick'); // pick | ready | importing | done
  const [parsed, setParsed] = useState(null);
  const [prog, setProg] = useState({ done: 0, total: 0, matched: 0, missed: [] });
  const [err, setErr] = useState(null);
  const fileRef = useRef(null);
  const cancelled = useRef(false);

  const onFiles = async (files) => {
    setErr(null);
    try {
      const res = await readExportFiles(files);
      if (!res.items.length) throw new Error('No films found in that file — check it’s a Letterboxd or IMDb export');
      setParsed({ ...res, items: res.items.slice(0, MAX_ITEMS), truncated: res.items.length > MAX_ITEMS });
      setPhase('ready');
    } catch (e) { setErr(e.message || 'Could not read that file'); }
  };

  const run = async () => {
    const items = parsed.items;
    cancelled.current = false;
    setPhase('importing');
    let matched = 0; const missed = [];
    setProg({ done: 0, total: items.length, matched: 0, missed: [] });
    for (let i = 0; i < items.length; i += BATCH) {
      if (cancelled.current) break;
      const chunk = items.slice(i, i + BATCH);
      try {
        const r = await fetch('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: chunk }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'Import failed');
        matched += d.matched || 0; missed.push(...(d.missed || []));
      } catch (e) {
        setErr(e.message || 'Import failed'); break;
      }
      setProg({ done: Math.min(items.length, i + BATCH), total: items.length, matched, missed: [...missed] });
    }
    setPhase('done');
    try { window.dispatchEvent(new CustomEvent('cine:watchlist-refresh')); } catch {}
    onImported && onImported({ matched, missed });
  };

  const counts = parsed ? { watched: parsed.items.filter((i) => i.list === 'watched').length, watchlist: parsed.items.filter((i) => i.list === 'watchlist').length } : null;
  const pct = prog.total ? Math.round((prog.done / prog.total) * 100) : 0;
  const S = SOURCES[src];
  const btn = { ...glass, height: 46, borderRadius: 23, padding: '0 22px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 };

  return (
    <div onClick={() => phase !== 'importing' && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <style>{`@keyframes impUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, maxHeight: '88dvh', overflowY: 'auto', background: ambient(accent), borderRadius: '22px 22px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '10px 20px calc(22px + env(safe-area-inset-bottom))', animation: 'impUp .32s cubic-bezier(0.22,1,0.36,1)', color: '#fff' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.3)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={eyebrow(accent)}>Bring your history</div>
            <div style={{ fontFamily: "var(--font-display), 'Inter Tight', system-ui, sans-serif", fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 6, lineHeight: 1.1 }}>Import your films</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 6, lineHeight: 1.45 }}>Everything you’ve watched and want to watch, in one go. Your feed and friends’ matches get smarter instantly.</div>
          </div>
          {phase !== 'importing' && <button onClick={onClose} aria-label="Close" style={{ ...glass, width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg></button>}
        </div>

        {phase === 'pick' && (
          <>
            <div style={{ display: 'flex', gap: 22, marginTop: 22 }}>
              {Object.entries(SOURCES).map(([k, v]) => (
                <button key={k} onClick={() => { setSrc(k); setErr(null); }} style={{ background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: src === k ? 800 : 600, color: src === k ? '#fff' : 'rgba(255,255,255,0.45)' }}>{v.name}</button>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              {S.steps.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '11px 0', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 13.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
                  <span style={{ width: 20, color: accent, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>{s}
                </div>
              ))}
            </div>
            <input ref={fileRef} type="file" accept={S.accept} multiple style={{ display: 'none' }} onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />
            {err && <div style={{ fontSize: 12.5, color: '#FF8FA3', marginTop: 12 }}>{err}</div>}
            <button onClick={() => fileRef.current?.click()} style={{ ...btn, width: '100%', marginTop: 18 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V4" /><path d="m7 9 5-5 5 5" /><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>
              Upload {src === 'letterboxd' ? 'ZIP' : 'CSV'}
            </button>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 10 }}>Your file is read on this device. Only film titles are sent to match them.</div>
          </>
        )}

        {phase === 'ready' && counts && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: 22, borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {[['Watched', counts.watched], ['Watchlist', counts.watchlist]].map(([l, v], i) => (
                <div key={l} style={{ padding: '16px 0', textAlign: 'center', boxShadow: i ? 'inset 1px 0 0 rgba(255,255,255,0.08)' : 'none' }}>
                  <div style={{ fontFamily: "var(--font-display), 'Inter Tight', system-ui, sans-serif", fontSize: 30, fontWeight: 800 }}>{v}</div>
                  <div style={{ ...eyebrow('rgba(255,255,255,0.45)'), fontSize: 9.5, marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', marginTop: 12, lineHeight: 1.5 }}>
              Found in your {parsed.source === 'imdb' ? 'IMDb' : 'Letterboxd'} export{parsed.truncated ? ` — importing the first ${MAX_ITEMS}` : ''}. Anything already in CineScroll is kept, and watched films stay watched.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => { setPhase('pick'); setParsed(null); }} style={{ ...btn, flex: 1, color: 'rgba(255,255,255,0.75)' }}>Back</button>
              <button onClick={run} style={{ ...btn, flex: 2 }}>Import {parsed.items.length} titles</button>
            </div>
          </>
        )}

        {(phase === 'importing' || phase === 'done') && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 700 }}>
              <span>{phase === 'done' ? (err ? 'Stopped' : 'All done') : 'Matching your films…'}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.75 }}>{prog.done} / {prog.total}</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', overflow: 'hidden', marginTop: 8 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: '#fff', borderRadius: 2, transition: 'width .3s ease' }} />
            </div>
            {err && <div style={{ fontSize: 12.5, color: '#FF8FA3', marginTop: 12 }}>{err}</div>}
            {phase === 'done' && (
              <>
                <div style={{ fontFamily: "var(--font-display), 'Inter Tight', system-ui, sans-serif", fontSize: 20, fontWeight: 800, marginTop: 20 }}>{prog.matched} titles added</div>
                {prog.missed.length > 0 && (
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>{prog.missed.length} couldn’t be matched</summary>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 8, lineHeight: 1.6, maxHeight: 160, overflowY: 'auto' }}>{prog.missed.slice(0, 200).join(' · ')}</div>
                  </details>
                )}
                <button onClick={onClose} style={{ ...btn, width: '100%', marginTop: 20 }}>Done</button>
              </>
            )}
            {phase === 'importing' && <button onClick={() => { cancelled.current = true; }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', marginTop: 16, padding: 0 }}>Stop</button>}
          </div>
        )}
      </div>
    </div>
  );
}
