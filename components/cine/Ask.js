'use client';
import { useEffect, useRef, useState } from 'react';
import { T, ambient, track } from './shared';

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
    <button onClick={onClick} aria-label="Ask Thiscene — describe what you want to watch" style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, width: 38, height: 38, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)' }}>
      <Spark size={17} color="rgba(255,255,255,0.85)" />
    </button>
  );
}

export default function AskSheet({ accent = '#818CF8', onClose, onOpen, onSave, savedIds, hidden }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const [listening, setListening] = useState(false);
  const [canVoice, setCanVoice] = useState(false);
  const recRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setCanVoice(typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition));
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    setTimeout(() => inputRef.current?.focus(), 250);
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
    setErr(''); setListening(true);
    try { rec.start(); if (navigator.vibrate) navigator.vibrate(10); } catch { setListening(false); }
  };

  return (
    <div onClick={onClose} style={{ display: hidden ? 'none' : 'flex', position: 'fixed', inset: 0, zIndex: 480, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', alignItems: 'flex-end', justifyContent: 'center', animation: 'askIn .2s ease' }}>
      <style>{`@keyframes askIn{from{opacity:0}to{opacity:1}}@keyframes askUp{from{transform:translateY(100%)}to{transform:none}}@keyframes askPulse{0%{box-shadow:0 0 0 0 ${accent}88}70%{box-shadow:0 0 0 16px ${accent}00}100%{box-shadow:0 0 0 0 ${accent}00}}@keyframes askDot{0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(-6px);opacity:1}}@keyframes askRow{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Ask Thiscene" style={{ width: '100%', maxWidth: 560, height: '90dvh', display: 'flex', flexDirection: 'column', background: ambient(accent), borderRadius: '22px 22px 0 0', borderTop: `1px solid ${T.hairline}`, color: '#fff', animation: 'askUp .32s cubic-bezier(0.22,1,0.36,1)' }}>
        <div style={{ padding: '10px 20px 0' }}>
          <div style={{ width: 34, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)', margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10.5, letterSpacing: 2.2, textTransform: 'uppercase', fontWeight: 700, color: accent }}><Spark size={13} color={accent} />Ask Thiscene</div>
            <button onClick={onClose} aria-label="Close" style={{ ...glass, width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
          </div>
          <div style={{ fontFamily: T.serif, fontSize: 25, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.12, marginTop: 8 }}>{listening ? 'Listening…' : 'What do you feel like watching?'}</div>

          <form onSubmit={(e) => { e.preventDefault(); ask(); }} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, ...glass, borderRadius: 18, padding: '6px 6px 6px 16px', borderColor: listening ? accent : 'rgba(255,255,255,0.14)' }}>
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Describe it — mood, a film it’s like, length, where…" aria-label="Describe what you want to watch" maxLength={300} enterKeyHint="search"
              style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 15.5, fontFamily: 'inherit', padding: '8px 0' }} />
            {canVoice && (
              <button type="button" onClick={listen} aria-label={listening ? 'Stop listening' : 'Speak instead'} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: listening ? accent : 'rgba(255,255,255,0.1)', animation: listening ? 'askPulse 1.4s infinite' : 'none' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={listening ? '#07070F' : '#fff'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5" /></svg>
              </button>
            )}
            <button type="submit" disabled={!q.trim() || busy} aria-label="Find" style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', opacity: q.trim() ? 1 : 0.35 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#07070F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </form>
          {err && <div role="alert" style={{ fontSize: 12.5, color: '#FF8FA3', marginTop: 10 }}>{err}</div>}
          {res?.chips?.length > 0 && !busy && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }} aria-label="What we understood">
              {res.chips.map((c) => <span key={c} style={{ fontSize: 11.5, fontWeight: 700, padding: '5px 10px', borderRadius: 20, background: `${accent}22`, border: `1px solid ${accent}55`, color: '#fff' }}>{c}</span>)}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px calc(20px + env(safe-area-inset-bottom))' }}>
          {busy ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingTop: 50 }}>
              <div style={{ display: 'flex', gap: 7 }}>{DOTS.slice(0, 5).map((c, i) => <span key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, animation: `askDot .9s ease-in-out ${i * 0.12}s infinite` }} />)}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Finding films that fit…</div>
            </div>
          ) : res ? (
            res.movies?.length ? (
              <>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '6px 0 4px' }}>{res.movies.length} picks · tap one to watch the trailer</div>
                {res.movies.map((m, i) => {
                  const saved = savedIds?.has?.(m.id);
                  return (
                    <div key={`${m.mediaType}-${m.id}`} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderTop: i ? `1px solid ${T.hairline}` : 'none', animation: `askRow .3s ease ${Math.min(i, 8) * 0.04}s both` }}>
                      <button onClick={() => onOpen(m)} style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', color: '#fff', fontFamily: 'inherit' }}>
                        <div style={{ width: 54, aspectRatio: '2/3', borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.06)' }}>{m.poster && <img src={m.poster} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{[m.year, m.rating !== 'N/A' ? `★ ${m.rating}` : null, m.isTV ? 'Series' : null].filter(Boolean).join(' · ')}</div>
                          {m.why && <div style={{ fontSize: 12, color: accent, marginTop: 4, fontWeight: 600, lineHeight: 1.35 }}>{m.why}</div>}
                        </div>
                      </button>
                      <button onClick={() => onSave(m)} aria-label={saved ? 'Saved' : 'Save'} style={{ ...glass, width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, background: saved ? '#7BFF9E22' : glass.background }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={saved ? '#7BFF9E' : '#fff'} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">{saved ? <path d="M5 12l5 5L20 7" /> : <path d="M12 5v14M5 12h14" />}</svg>
                      </button>
                    </div>
                  );
                })}
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: 16 }}>Not quite? Add to it — “newer”, “on Prime”, “no horror”…</div>
              </>
            ) : <div style={{ textAlign: 'center', paddingTop: 40, fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>Nothing fits all of that. Try fewer details, or a different film it’s like.</div>
          ) : (
            <>
              <div style={{ fontSize: 10.5, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, color: 'rgba(255,255,255,0.45)', margin: '14px 0 10px' }}>Try</div>
              {EXAMPLES.map((ex) => (
                <button key={ex} onClick={() => ask(ex)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '13px 0', background: 'none', border: 'none', borderTop: `1px solid ${T.hairline}`, color: 'rgba(255,255,255,0.85)', fontSize: 14.5, fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
                  <Spark size={13} color={accent} />{ex}
                </button>
              ))}
              {canVoice && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 16 }}>Tip: tap the mic and just say it.</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
