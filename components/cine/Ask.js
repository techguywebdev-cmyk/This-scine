'use client';
import { useEffect, useRef, useState } from 'react';
import { GLASS, T, ambient, track } from './shared';

// "Ask Thiscene": describe what you feel like watching (type or speak) → a short list that fits.
// Free: the browser's own speech recognition + our sentence parser on the server.

const EXAMPLES = [
  'Something like Interstellar but shorter',
  'A funny 90s movie on Netflix',
  'Feel-good film for date night',
  'Underrated heist movies',
  'Scary Korean series',
  'True story about boxing, no subtitles',
];
const DOTS = ['#818CF8', '#2DD4BF', '#FF6B8A', '#A3E635', '#B07FEF', '#38BDF8', '#FF7A2F', '#F5A623'];
const glass = { background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.14)' };

const Spark = ({ size = 18, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true"><path d="M11 3l1.9 5.6L18.5 10.5l-5.6 1.9L11 18l-1.9-5.6L3.5 10.5l5.6-1.9z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></svg>
);

export function AskButton({ onClick }) {
  return (
    <button onClick={onClick} aria-label="Ask Thiscene — describe what you want to watch" style={{ ...GLASS, borderRadius: 12, width: 38, height: 38, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spark size={17} color="rgba(255,255,255,0.95)" />
    </button>
  );
}

// Drifting poster wall for the header — two rows sliding in opposite directions
function PosterMarquee({ posters, tone }) {
  const list = posters.length ? posters : Array(10).fill(null);
  const rowA = list.filter((_, i) => i % 2 === 0), rowB = list.filter((_, i) => i % 2 === 1);
  const Row = ({ items, dir, dur, top }) => (
    <div style={{ position: 'absolute', left: 0, top, display: 'flex', gap: 8, width: 'max-content', animation: `askMarq ${dur}s linear infinite ${dir < 0 ? 'reverse' : 'normal'}` }}>
      {[...items, ...items, ...items, ...items].map((src, i) => (
        <div key={i} style={{ width: 92, aspectRatio: '2/3', borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.05)' }}>
          {src && <img src={src} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', animation: 'askFade .6s ease both' }} />}
        </div>
      ))}
    </div>
  );
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: '22px 22px 0 0' }}>
      <div style={{ position: 'absolute', left: -40, right: -40, top: -30, height: 320, transform: 'rotate(-6deg)', opacity: 0.6 }}>
        <Row items={rowA} dir={1} dur={70} top={0} />
        <Row items={rowB} dir={-1} dur={85} top={146} />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(6,6,11,0.35) 0%, rgba(6,6,11,0.2) 35%, rgba(6,6,11,0.85) 78%, #06060B 100%), radial-gradient(120% 80% at 0% 0%, ${tone}55, transparent 60%)`, transition: 'background .6s ease' }} />
    </div>
  );
}

export default function AskSheet({ accent = '#818CF8', onClose, onOpen, onSave, savedIds, hidden }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const [listening, setListening] = useState(false);
  const [canVoice, setCanVoice] = useState(false);
  const [wall, setWall] = useState([]);
  const recRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setCanVoice(typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition));
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    fetch('/api/movies?popular=1').then((r) => r.json()).then((d) => setWall((d.movies || []).map((m) => m.poster).filter(Boolean).sort(() => Math.random() - 0.5).slice(0, 14))).catch(() => {});
    return () => { window.removeEventListener('keydown', k); try { recRef.current?.abort(); } catch {} };
  }, [onClose]);

  const ask = async (text) => {
    const t = String(text ?? q).trim();
    if (!t || busy) return;
    setQ(t); setBusy(true); setErr('');
    try {
      const r = await fetch(`/api/ask?q=${encodeURIComponent(t)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Something went wrong');
      setRes(d);
      const ps = (d.movies || []).map((m) => m.poster).filter(Boolean);
      if (ps.length >= 4) setWall(ps.slice(0, 14));
      track('ask', { q: t.slice(0, 80), n: (d.movies || []).length });
    } catch (e) { setErr(e.message || 'Something went wrong'); }
    setBusy(false);
  };

  const listen = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) { try { recRef.current?.stop(); } catch {} return; }
    const rec = new SR();
    rec.lang = navigator.language || 'en-US';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let final = '';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const tx = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += tx; else interim += tx;
      }
      setQ((final + interim).trim());
    };
    rec.onerror = (e) => { setListening(false); if (e.error === 'not-allowed') setErr('Allow the microphone to talk to Thiscene'); };
    rec.onend = () => { setListening(false); if (final.trim()) ask(final.trim()); };
    recRef.current = rec;
    setErr(''); setQ(''); setListening(true);
    try { rec.start(); if (navigator.vibrate) navigator.vibrate(10); } catch { setListening(false); }
  };

  const movies = res?.movies || [];
  const top = movies[0];
  const tone = top?.accent || accent;
  const saveBtn = (m, size = 36) => {
    const saved = savedIds?.has?.(m.id);
    return (
      <button onClick={(e) => { e.stopPropagation(); onSave(m); }} aria-label={saved ? 'Saved' : 'Save'} style={{ ...glass, width: size, height: size, borderRadius: '50%', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, background: saved ? '#7BFF9E22' : glass.background, borderColor: saved ? '#7BFF9E66' : 'rgba(255,255,255,0.14)' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={saved ? '#7BFF9E' : '#fff'} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">{saved ? <path d="M5 12l5 5L20 7" /> : <path d="M12 5v14M5 12h14" />}</svg>
      </button>
    );
  };

  return (
    <div onClick={onClose} style={{ display: hidden ? 'none' : 'flex', position: 'fixed', inset: 0, zIndex: 480, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', alignItems: 'flex-end', justifyContent: 'center', animation: 'askIn .2s ease' }}>
      <style>{`@keyframes askIn{from{opacity:0}to{opacity:1}}@keyframes askUp{from{transform:translateY(100%)}to{transform:none}}@keyframes askMarq{from{transform:translateX(0)}to{transform:translateX(-50%)}}@keyframes askFade{from{opacity:0}to{opacity:1}}@keyframes askPulse{0%{box-shadow:0 0 0 0 ${tone}99}70%{box-shadow:0 0 0 18px ${tone}00}100%{box-shadow:0 0 0 0 ${tone}00}}@keyframes askDot{0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(-6px);opacity:1}}@keyframes askRow{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@keyframes askBar{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}@media (prefers-reduced-motion:reduce){[style*="askMarq"]{animation:none!important}}`}</style>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Ask Thiscene" style={{ position: 'relative', width: '100%', maxWidth: 560, height: '94dvh', display: 'flex', flexDirection: 'column', background: ambient(tone), borderRadius: '22px 22px 0 0', borderTop: `1px solid ${T.hairline}`, color: '#fff', animation: 'askUp .34s cubic-bezier(0.22,1,0.36,1)', overflow: 'hidden' }}>
        {/* Header: drifting posters, tinted by the top pick */}
        <div style={{ position: 'relative', height: 196, flexShrink: 0 }}>
          <PosterMarquee posters={wall} tone={tone} />
          <div style={{ position: 'absolute', top: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}><div style={{ width: 34, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.35)' }} /></div>
          <button onClick={onClose} aria-label="Close" style={{ ...glass, position: 'absolute', top: 18, right: 18, width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
          <div style={{ position: 'absolute', left: 20, right: 20, bottom: 6 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 10.5, letterSpacing: 2.2, textTransform: 'uppercase', fontWeight: 800, color: '#fff', background: `${tone}33`, border: `1px solid ${tone}66`, borderRadius: 20, padding: '5px 10px', transition: 'all .5s ease' }}><Spark size={12} color={tone} />Ask Thiscene</div>
            <div style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08, marginTop: 10, textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}>{listening ? 'Listening…' : res && movies.length ? `${movies.length} picks for you` : 'What do you feel like watching?'}</div>
          </div>
        </div>

        <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>
          <form onSubmit={(e) => { e.preventDefault(); ask(); }} style={{ display: 'flex', alignItems: 'center', gap: 8, ...glass, background: 'rgba(0,0,0,0.45)', borderRadius: 26, padding: '6px 6px 6px 18px', borderColor: listening ? tone : 'rgba(255,255,255,0.16)', boxShadow: listening ? `0 0 0 4px ${tone}22` : 'none', transition: 'all .25s ease' }}>
            {listening ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minHeight: 40, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 22 }}>{[0, 1, 2, 3, 4].map((i) => <span key={i} style={{ width: 3, height: 22, borderRadius: 2, background: tone, transformOrigin: 'center', animation: `askBar .8s ease-in-out ${i * 0.12}s infinite` }} />)}</div>
                <span style={{ fontSize: 15, color: q ? '#fff' : 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q || 'Say it like you’d tell a friend…'}</span>
              </div>
            ) : (
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mood, a film it’s like, length, where…" aria-label="Describe what you want to watch" maxLength={300} enterKeyHint="search"
                style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 15.5, fontFamily: 'inherit', padding: '10px 0' }} />
            )}
            {canVoice && (
              <button type="button" onClick={listen} aria-label={listening ? 'Stop listening' : 'Speak instead'} style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: listening ? tone : `linear-gradient(135deg, ${tone}, ${tone}99)`, animation: listening ? 'askPulse 1.4s infinite' : 'none', boxShadow: listening ? 'none' : `0 4px 18px ${tone}55` }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#07070F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{listening ? <rect x="7" y="7" width="10" height="10" rx="2" fill="#07070F" /> : <><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5" /></>}</svg>
              </button>
            )}
            {!listening && (
              <button type="submit" disabled={!q.trim() || busy} aria-label="Find" style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: q.trim() ? 'pointer' : 'default', flexShrink: 0, display: q.trim() || !canVoice ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', background: '#fff', opacity: q.trim() ? 1 : 0.35 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#07070F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            )}
          </form>
          {err && <div role="alert" style={{ fontSize: 12.5, color: '#FF8FA3', marginTop: 10 }}>{err}</div>}
          {res?.chips?.length > 0 && !busy && (
            <div style={{ display: 'flex', gap: 6, marginTop: 12, overflowX: 'auto', scrollbarWidth: 'none' }} aria-label="What we understood">
              {res.chips.map((c) => <span key={c} style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, padding: '6px 11px', borderRadius: 20, background: `${tone}22`, border: `1px solid ${tone}55`, color: '#fff', whiteSpace: 'nowrap' }}>{c}</span>)}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px calc(24px + env(safe-area-inset-bottom))' }}>
          {busy ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingTop: 46 }}>
              <div style={{ display: 'flex', gap: 7 }}>{DOTS.slice(0, 5).map((c, i) => <span key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, animation: `askDot .9s ease-in-out ${i * 0.12}s infinite` }} />)}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Finding films that fit…</div>
            </div>
          ) : res ? (
            movies.length ? (
              <>
                {/* Top pick */}
                <div onClick={() => onOpen(top)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen(top)} style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', cursor: 'pointer', aspectRatio: '16/10', background: '#111', border: `1px solid ${tone}44`, animation: 'askRow .35s ease both', marginTop: 4 }}>
                  {(top.backdrop || top.poster) && <img src={(top.backdrop || top.poster).replace('/original/', '/w1280/')} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 30%, rgba(6,6,11,0.95) 100%)' }} />
                  <div style={{ position: 'absolute', top: 12, left: 12, fontSize: 10, letterSpacing: 1.8, fontWeight: 800, textTransform: 'uppercase', background: tone, color: '#07070F', borderRadius: 20, padding: '4px 9px' }}>Top pick</div>
                  <div style={{ position: 'absolute', left: 16, right: 16, bottom: 14, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{top.title}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{[top.year, top.rating !== 'N/A' ? `★ ${top.rating}` : null, top.isTV ? 'Series' : null].filter(Boolean).join(' · ')}</div>
                      {top.why && <div style={{ fontSize: 12.5, color: tone, marginTop: 5, fontWeight: 700 }}>{top.why}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="15" height="15" viewBox="0 0 24 24" fill="#07070F"><path d="M7 4.5v15l13-7.5z" /></svg></span>
                      {saveBtn(top, 40)}
                    </div>
                  </div>
                </div>

                {movies.length > 1 && <div style={{ fontSize: 10.5, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, color: 'rgba(255,255,255,0.45)', margin: '22px 0 4px' }}>More picks</div>}
                {movies.slice(1).map((m, i) => (
                  <div key={`${m.mediaType}-${m.id}`} onClick={() => onOpen(m)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen(m)} style={{ display: 'flex', gap: 13, alignItems: 'center', padding: '11px 0', borderTop: i ? `1px solid ${T.hairline}` : 'none', cursor: 'pointer', animation: `askRow .35s ease ${Math.min(i + 1, 9) * 0.04}s both` }}>
                    <div style={{ width: 58, aspectRatio: '2/3', borderRadius: 9, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.06)', boxShadow: `0 6px 18px ${m.accent}33` }}>{m.poster && <img src={m.poster.replace('/w500/', '/w185/')} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{[m.year, m.rating !== 'N/A' ? `★ ${m.rating}` : null, m.isTV ? 'Series' : null].filter(Boolean).join(' · ')}</div>
                      {m.why && <div style={{ fontSize: 12, color: m.accent || tone, marginTop: 4, fontWeight: 600, lineHeight: 1.35 }}>{m.why}</div>}
                    </div>
                    {saveBtn(m)}
                  </div>
                ))}
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: 18 }}>Not quite? Add to it — “newer”, “on Prime”, “no horror”…</div>
              </>
            ) : <div style={{ textAlign: 'center', paddingTop: 40, fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>Nothing fits all of that. Try fewer details, or a different film it’s like.</div>
          ) : (
            <>
              <div style={{ fontSize: 10.5, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, color: 'rgba(255,255,255,0.45)', margin: '8px 0 12px' }}>Try saying</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {EXAMPLES.map((ex, i) => (
                  <button key={ex} onClick={() => ask(ex)} style={{ ...glass, borderRadius: 16, padding: '10px 14px', color: '#fff', fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, animation: `askRow .35s ease ${i * 0.05}s both` }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: DOTS[i % DOTS.length], flexShrink: 0 }} />{ex}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 18, lineHeight: 1.5 }}>{canVoice ? 'Tap the mic and say it like you’d tell a friend — mood, a film it’s like, how long, where you watch.' : 'Describe it like you’d tell a friend — mood, a film it’s like, how long, where you watch.'}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
