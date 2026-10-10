'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { T, ambient, track } from './shared';
import { ImportMotion, InviteMotion } from './WelcomeMotion';

// First-run flow for new accounts: pick titles you love → import history → invite a friend.
const NEED = 5;
const glass = { background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.14)' };
const eyebrow = (accent) => ({ fontSize: 10.5, letterSpacing: 2.2, textTransform: 'uppercase', fontWeight: 700, color: accent });
const keyOf = (m) => `${m.isTV ? 't' : 'm'}${m.id}`;

export function Welcome({ user, accent = '#F5A623', onDone }) {
  const [step, setStep] = useState(0); // 0 pick, 1 import, 2 invite
  const [pool, setPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState([]); // movie objects, in tap order
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const scrollRef = useRef(null);
  const name = (user?.firstName || user?.username || '').trim();

  useEffect(() => {
    track('onboard_start');
    fetch('/api/movies?onboard=1').then((r) => r.json()).then((d) => setPool(d.movies || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Debounced search so people can find the exact films they love
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults(null); setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(() => {
      fetch(`/api/movies?search=${encodeURIComponent(term)}`).then((r) => r.json()).then((d) => setResults((d.movies || []).filter((m) => m.poster))).catch(() => setResults([])).finally(() => setSearching(false));
    }, 320);
    return () => clearTimeout(t);
  }, [q]);

  const pickedKeys = useMemo(() => new Set(picked.map(keyOf)), [picked]);
  const toggle = (m) => {
    const k = keyOf(m);
    setPicked((p) => (p.some((x) => keyOf(x) === k) ? p.filter((x) => keyOf(x) !== k) : [...p, m]));
    try { navigator.vibrate?.(8); } catch {}
  };

  const savePicks = () => {
    if (!picked.length) return;
    track('onboard_pick', { count: picked.length });
    fetch('/api/watchlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: picked, watched: true }) })
      .then(() => window.dispatchEvent(new Event('cine:watchlist-refresh'))).catch(() => {});
  };

  const finish = (how) => {
    track('onboard_done', { how, picks: picked.length, step });
    setLeaving(true);
    setTimeout(() => onDone({ picks: picked.length }), 260);
  };

  const invite = async () => {
    const handle = user?.username || user?.id;
    if (!handle) return;
    const url = `${window.location.origin}/u/${encodeURIComponent(handle)}`;
    const text = `Join me on CineScroll — let's see what we both want to watch 🍿`;
    track('share', { via: 'onboard_invite' });
    try { if (navigator.share) { await navigator.share({ title: 'CineScroll', text, url }); return; } } catch (e) { if (e?.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(`${text} ${url}`); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const grid = results ?? pool;
  const left = Math.max(0, NEED - picked.length);

  const btn = { ...glass, height: 54, borderRadius: 27, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 800, cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 };
  const primary = { ...btn, background: `${accent}33`, borderColor: accent };
  const quiet = { background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 10 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 380, background: ambient(accent), color: '#fff', display: 'flex', flexDirection: 'column', opacity: leaving ? 0 : 1, transition: 'opacity .25s ease', animation: 'wlIn .4s ease' }}>
      <style>{`@keyframes wlIn{from{opacity:0}to{opacity:1}}@keyframes wlUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}@keyframes wlPop{0%{transform:scale(.6)}70%{transform:scale(1.15)}100%{transform:scale(1)}}@keyframes wlShimmer{0%{opacity:.35}50%{opacity:.6}100%{opacity:.35}}.wl-in::placeholder{color:rgba(255,255,255,0.45)}`}</style>

      {/* Top bar: progress + skip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'max(16px, env(safe-area-inset-top)) 20px 0' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2].map((i) => <span key={i} style={{ width: i === step ? 22 : 7, height: 7, borderRadius: 4, background: i <= step ? accent : 'rgba(255,255,255,0.22)', transition: 'all .3s ease' }} />)}
        </div>
        <button onClick={() => (step === 0 ? (savePicks(), finish('skip')) : finish('skip'))} style={quiet}>Skip</button>
      </div>

      {step === 0 && (
        <>
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 130px', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ animation: 'wlUp .45s ease' }}>
              <div style={eyebrow(accent)}>{name ? `Welcome, ${name}` : 'Welcome to CineScroll'}</div>
              <div style={{ fontFamily: T.serif, fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.12, marginTop: 10 }}>Pick {NEED} you love</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8, lineHeight: 1.5 }}>Films or shows you’ve seen and loved. Your feed tunes itself to them straight away.</div>
            </div>

            <div style={{ position: 'relative', marginTop: 20 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.2" strokeLinecap="round" style={{ position: 'absolute', left: 16, top: 15 }}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <input className="wl-in" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search any film or show" style={{ ...glass, width: '100%', boxSizing: 'border-box', height: 46, borderRadius: 23, padding: '0 40px 0 42px', color: '#fff', fontFamily: 'inherit', fontSize: 15, outline: 'none' }} />
              {q && <button onClick={() => setQ('')} aria-label="Clear search" style={{ position: 'absolute', right: 8, top: 8, width: 30, height: 30, borderRadius: 15, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14 }}>✕</button>}
            </div>

            {results && !searching && results.length === 0 && <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.6)', marginTop: 24, textAlign: 'center' }}>Nothing found for “{q.trim()}”</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 18 }}>
              {(loading || searching) && !grid.length
                ? Array.from({ length: 12 }).map((_, i) => <div key={i} style={{ aspectRatio: '2/3', borderRadius: 8, background: 'rgba(255,255,255,0.08)', animation: `wlShimmer 1.4s ease ${i * 0.06}s infinite` }} />)
                : grid.map((m) => {
                    const on = pickedKeys.has(keyOf(m));
                    const n = on ? picked.findIndex((x) => keyOf(x) === keyOf(m)) + 1 : 0;
                    return (
                      <button key={keyOf(m)} onClick={() => toggle(m)} aria-pressed={on} aria-label={m.title} style={{ position: 'relative', padding: 0, border: 'none', background: 'rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden', aspectRatio: '2/3', cursor: 'pointer', boxShadow: on ? `0 0 0 2.5px ${accent}` : 'none', transform: on ? 'scale(0.95)' : 'none', transition: 'transform .18s ease, box-shadow .18s ease', opacity: searching ? 0.5 : 1 }}>
                        {m.poster && <img src={m.poster.replace('/w500/', '/w342/')} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: on ? 'brightness(0.55)' : 'none', transition: 'filter .18s ease' }} />}
                        {on && <span style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, background: accent, color: '#000', fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'wlPop .25s ease' }}>{n}</span>}
                        {on && <span style={{ position: 'absolute', left: 6, right: 6, bottom: 6, fontSize: 11, fontWeight: 700, lineHeight: 1.25, textAlign: 'left', color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>{m.title}</span>}
                      </button>
                    );
                  })}
            </div>
          </div>

          {/* Sticky bottom */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '28px 20px calc(18px + env(safe-area-inset-bottom))', background: 'linear-gradient(to top, rgba(0,0,0,0.55) 40%, transparent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {picked.length > 0 && (
                <div style={{ display: 'flex', flexShrink: 0 }}>
                  {picked.slice(-3).map((m, i) => <img key={keyOf(m)} src={(m.poster || '').replace('/w500/', '/w185/')} alt="" style={{ width: 30, height: 45, objectFit: 'cover', borderRadius: 4, marginLeft: i ? -12 : 0, boxShadow: '0 0 0 2px rgba(0,0,0,0.6)', animation: 'wlPop .25s ease' }} />)}
                </div>
              )}
              <button disabled={left > 0} onClick={() => { savePicks(); setStep(1); }} style={{ ...(left > 0 ? btn : primary), flex: 1, opacity: left > 0 ? 0.75 : 1, cursor: left > 0 ? 'default' : 'pointer' }}>
                {left > 0 ? (picked.length ? `${left} more to go` : `Pick ${NEED} to continue`) : `Continue · ${picked.length} picked`}
              </button>
            </div>
          </div>
        </>
      )}

      {step === 1 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px 24px calc(22px + env(safe-area-inset-bottom))', animation: 'wlUp .45s ease' }}>
          <div />
          <div style={{ textAlign: 'center' }}>
            <ImportMotion posters={picked.length ? picked : pool} accent={accent} />
            <div style={{ ...eyebrow(accent), marginTop: 26 }}>Your feed is tuned</div>
            <div style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, marginTop: 10 }}>Already log films<br />somewhere?</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 10, lineHeight: 1.55, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>Bring your Letterboxd or IMDb history across — everything you’ve watched, rated and saved, in under a minute.</div>
          </div>
          <div style={{ width: '100%', maxWidth: 420, margin: '0 auto' }}>
            <button onClick={() => { track('onboard_import'); window.dispatchEvent(new Event('cine:open-import')); setStep(2); }} style={primary}>Import from Letterboxd or IMDb</button>
            <button onClick={() => setStep(2)} style={{ ...quiet, display: 'block', margin: '8px auto 0' }}>I’m starting fresh</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px 24px calc(22px + env(safe-area-inset-bottom))', animation: 'wlUp .45s ease' }}>
          <div />
          <div style={{ textAlign: 'center' }}>
            <InviteMotion user={user} name={name} accent={accent} posters={picked.length ? picked : pool} />
            <div style={{ ...eyebrow(accent), marginTop: 26 }}>Better together</div>
            <div style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, marginTop: 10 }}>Bring a friend</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 10, lineHeight: 1.55, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>See what they’re saving, find films you both want, and press play at the same moment with a watch party.</div>
          </div>
          <div style={{ width: '100%', maxWidth: 420, margin: '0 auto' }}>
            <button onClick={invite} style={primary}>{copied ? 'Invite link copied ✓' : 'Invite a friend'}</button>
            <button onClick={() => finish('done')} style={{ ...btn, marginTop: 12 }}>Start exploring</button>
          </div>
        </div>
      )}
    </div>
  );
}
