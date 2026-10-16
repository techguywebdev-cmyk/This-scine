'use client';
import { useEffect, useState } from 'react';
import { T, ambient } from './shared';
import { setPrefs, usePrefs } from './prefs';

const GENRES = [['Action', 28], ['Comedy', 35], ['Drama', 18], ['Horror', 27], ['Thriller', 53], ['Romance', 10749], ['Sci-Fi', 878], ['Animation', 16], ['Documentary', 99], ['Crime', 80], ['Fantasy', 14], ['War', 10752], ['Western', 37], ['Family', 10751]];
const eyebrow = (c) => ({ fontSize: 10.5, letterSpacing: 2.2, textTransform: 'uppercase', fontWeight: 700, color: c });

function Switch({ on, onClick, label, accent }) {
  return (
    <button type="button" role="switch" aria-checked={!!on} aria-label={label} onClick={onClick} style={{ width: 46, height: 28, borderRadius: 14, border: 'none', padding: 3, cursor: 'pointer', background: on ? accent : 'rgba(255,255,255,0.16)', transition: 'background .2s', flexShrink: 0 }}>
      <span style={{ display: 'block', width: 22, height: 22, borderRadius: '50%', background: '#fff', transform: on ? 'translateX(18px)' : 'none', transition: 'transform .2s cubic-bezier(.3,.7,.3,1)' }} />
    </button>
  );
}

function Row({ title, sub, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderTop: `1px solid ${T.hairline}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2, lineHeight: 1.4 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export default function FeedSettings({ accent = '#818CF8', onClose }) {
  const p = usePrefs();
  const [opts, setOpts] = useState(null);
  const [toast, setToast] = useState('');
  const region = p.region || opts?.region || 'US';

  useEffect(() => {
    fetch(`/api/watch-options${p.region ? `?region=${p.region}` : ''}`, { cache: 'no-store' }).then((r) => r.json()).then((d) => {
      setOpts(d);
      if (!p.region && d.region) setPrefs({ region: d.region });
    }).catch(() => setOpts({ regions: [], providers: [] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.region]);
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  useEffect(() => { if (!toast) return undefined; const t = setTimeout(() => setToast(''), 1800); return () => clearTimeout(t); }, [toast]);

  const save = (patch, msg = 'Saved') => { setPrefs(patch); setToast(msg); if (navigator.vibrate) navigator.vibrate(8); };
  const toggleService = (id) => { const has = p.services.includes(id); save({ services: has ? p.services.filter((x) => x !== id) : [...p.services, id] }); };
  const toggleGenre = (id) => { const has = p.hideGenres.includes(id); save({ hideGenres: has ? p.hideGenres.filter((x) => x !== id) : [...p.hideGenres, id] }); };
  const detectedName = opts?.regions?.find((r) => r.code === opts?.detected)?.name;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'fsIn .2s ease' }}>
      <style>{'@keyframes fsIn{from{opacity:0}to{opacity:1}}@keyframes fsUp{from{transform:translateY(100%)}to{transform:none}}'}</style>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Your feed" style={{ width: '100%', maxWidth: 560, maxHeight: '92dvh', overflowY: 'auto', background: ambient(accent), borderRadius: '22px 22px 0 0', borderTop: `1px solid ${T.hairline}`, padding: '10px 20px calc(24px + env(safe-area-inset-bottom))', color: '#fff', animation: 'fsUp .32s cubic-bezier(0.22,1,0.36,1)' }}>
        <div style={{ width: 34, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)', margin: '0 auto 16px' }} />
        <div style={eyebrow(accent)}>Your feed</div>
        <div style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 6 }}>Tune Thiscene to you</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 6, lineHeight: 1.5 }}>Where you watch, how trailers play, and what shows up in your feed.</div>
        <div aria-live="polite" style={{ height: 18, fontSize: 12, color: '#7BFF9E', fontWeight: 600, marginTop: 6 }}>{toast}</div>

        {/* Country */}
        <div style={{ ...eyebrow('rgba(255,255,255,0.5)'), marginTop: 10, marginBottom: 10 }}>Your country</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', height: 50, borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)' }}>
          <span style={{ fontSize: 20 }} aria-hidden="true">{region ? String.fromCodePoint(...[...region].map((c) => 127397 + c.charCodeAt(0))) : '🌍'}</span>
          <select value={region} onChange={(e) => save({ region: e.target.value, services: [] }, 'Country updated')} aria-label="Your country" style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 15, fontFamily: 'inherit', appearance: 'none', cursor: 'pointer' }}>
            {(opts?.regions?.length ? opts.regions : [{ code: region, name: region }]).map((r) => <option key={r.code} value={r.code} style={{ color: '#000' }}>{r.name}</option>)}
          </select>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>▾</span>
        </div>
        {opts?.detected && !opts.detectedSupported && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 8, lineHeight: 1.45 }}>Streaming data isn’t available for {detectedName || 'your country'} yet — pick the country whose services you use.</div>}

        {/* Services */}
        <div style={{ ...eyebrow('rgba(255,255,255,0.5)'), marginTop: 24, marginBottom: 10 }}>Services you have</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 12 }}>
          {opts === null ? <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)' }}>Loading…</div> : (opts.providers || []).map((s) => {
            const on = p.services.includes(s.id);
            return (
              <button key={s.id} type="button" onClick={() => toggleService(s.id)} aria-pressed={on} aria-label={s.name} title={s.name} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <span style={{ position: 'relative', width: 56, height: 56, borderRadius: 16, overflow: 'hidden', border: `2px solid ${on ? accent : 'rgba(255,255,255,0.12)'}`, opacity: on ? 1 : 0.55, transition: 'all .2s ease', boxShadow: on ? `0 0 16px ${accent}55` : 'none' }}>
                  {s.logo && <img src={s.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  {on && <span style={{ position: 'absolute', right: 3, bottom: 3, width: 16, height: 16, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#07070F" strokeWidth="4" strokeLinecap="round"><path d="M5 12l5 5L20 7" /></svg></span>}
                </span>
                <span style={{ fontSize: 10, color: on ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: on ? 700 : 500, maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
              </button>
            );
          })}
        </div>
        <Row title="Only what I can watch" sub={p.services.length ? 'Your feed only shows titles on your services' : 'Pick your services above first'} right={<Switch accent={accent} label="Only what I can watch" on={p.onlyMine && p.services.length > 0} onClick={() => p.services.length && save({ onlyMine: !p.onlyMine })} />} />

        {/* Trailers & data */}
        <div style={{ ...eyebrow('rgba(255,255,255,0.5)'), marginTop: 24, marginBottom: 2 }}>Trailers & data</div>
        <Row title="Autoplay trailers" sub="Start playing as soon as you open a film" right={<Switch accent={accent} label="Autoplay trailers" on={p.autoplay !== false} onClick={() => save({ autoplay: p.autoplay === false })} />} />
        <Row title="Start muted" sub="Trailers begin without sound" right={<Switch accent={accent} label="Start muted" on={!!p.startMuted} onClick={() => save({ startMuted: !p.startMuted })} />} />
        <Row title="Data saver" sub="Lighter images — kinder to mobile data" right={<Switch accent={accent} label="Data saver" on={!!p.dataSaver} onClick={() => save({ dataSaver: !p.dataSaver })} />} />

        {/* Content */}
        <div style={{ ...eyebrow('rgba(255,255,255,0.5)'), marginTop: 24, marginBottom: 10 }}>What to show</div>
        <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
          {[['both', 'Films & series'], ['movie', 'Films only'], ['tv', 'Series only']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => save({ kind: k })} aria-pressed={p.kind === k} style={{ flex: 1, height: 38, borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: p.kind === k ? '#fff' : 'rgba(255,255,255,0.55)', background: p.kind === k ? `${accent}33` : 'transparent', boxShadow: p.kind === k ? `inset 0 0 0 1px ${accent}88` : 'none', transition: 'all .2s ease' }}>{l}</button>
          ))}
        </div>
        <Row title="Hide adult ratings" sub="No R, 18 or TV-MA titles in your feed" right={<Switch accent={accent} label="Hide adult ratings" on={!!p.safe} onClick={() => save({ safe: !p.safe })} />} />
        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 14 }}>Never show me</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2, marginBottom: 10 }}>Tap genres to hide them from your feed</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {GENRES.map(([name, id]) => {
            const off = p.hideGenres.includes(id);
            return <button key={id} type="button" onClick={() => toggleGenre(id)} aria-pressed={off} style={{ height: 34, padding: '0 13px', borderRadius: 17, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: off ? '#FF8FA3' : 'rgba(255,255,255,0.8)', background: off ? 'rgba(255,107,138,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${off ? 'rgba(255,107,138,0.5)' : 'rgba(255,255,255,0.14)'}`, textDecoration: off ? 'line-through' : 'none' }}>{name}</button>;
          })}
        </div>

        <button type="button" onClick={() => { onClose(); setTimeout(() => window.dispatchEvent(new Event('cine:feed-refresh')), 200); }} style={{ display: 'flex', margin: '26px auto 0', height: 46, padding: '0 26px', alignItems: 'center', borderRadius: 23, background: `${accent}2e`, border: `1px solid ${accent}99`, color: '#fff', fontWeight: 700, fontSize: 14.5, fontFamily: 'inherit', cursor: 'pointer' }}>Done — refresh my feed</button>
      </div>
    </div>
  );
}
