'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

// Voice notes, shared by chat and the watch room.
// - useVoiceRecorder: mic → MediaRecorder with a live level meter and a 40-bar waveform on finish
// - RecorderBar: the recording UI (live waveform, timer, cancel / send) in the glass style
// - VoiceBubble: player with round play button, scrubbable waveform, elapsed time and 1×/1.5×/2×

const BARS = 40;
const glass = { background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.14)' };
const fmt = (s) => { s = Math.max(0, Math.round(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const hashBars = (seed) => { let h = 2166136261; for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return Array.from({ length: BARS }, (_, i) => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; const r = ((h >>> 0) % 1000) / 1000; return 0.25 + 0.75 * r * (0.6 + 0.4 * Math.sin(i / 3)); }); };
const squash = (arr, n = BARS) => { if (!arr.length) return Array(n).fill(0.15); const out = []; for (let i = 0; i < n; i++) { const a = Math.floor((i / n) * arr.length), b = Math.max(a + 1, Math.floor(((i + 1) / n) * arr.length)); let m = 0; for (let k = a; k < b; k++) m = Math.max(m, arr[k] || 0); out.push(m); } const top = Math.max(...out, 0.05); return out.map((v) => Math.max(0.08, Math.min(1, v / top))); };

export function useVoiceRecorder({ maxSecs = 120, onDone } = {}) {
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [levels, setLevels] = useState([]);
  const recRef = useRef(null), streamRef = useRef(null), chunksRef = useRef([]), ctxRef = useRef(null), rafRef = useRef(0), startRef = useRef(0), samplesRef = useRef([]), cancelRef = useRef(false), timerRef = useRef(0);
  const doneRef = useRef(onDone); doneRef.current = onDone;

  const teardown = () => {
    cancelAnimationFrame(rafRef.current); clearInterval(timerRef.current);
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    try { ctxRef.current?.close(); } catch {}
    streamRef.current = null; ctxRef.current = null;
  };

  const start = useCallback(async () => {
    if (recRef.current) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;
      const mime = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : MediaRecorder.isTypeSupported?.('audio/webm') ? 'audio/webm' : MediaRecorder.isTypeSupported?.('audio/mp4') ? 'audio/mp4' : '';
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = []; samplesRef.current = []; cancelRef.current = false;
      rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const dur = (Date.now() - startRef.current) / 1000;
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        const peaks = squash(samplesRef.current);
        teardown(); recRef.current = null; setRecording(false); setSecs(0); setLevels([]);
        if (!cancelRef.current && blob.size > 800 && dur >= 0.6) doneRef.current?.(blob, Math.round(dur), peaks);
      };
      // live level meter
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext; const ctx = new Ctx(); ctxRef.current = ctx;
        const an = ctx.createAnalyser(); an.fftSize = 1024; ctx.createMediaStreamSource(stream).connect(an);
        const buf = new Uint8Array(an.fftSize); let last = 0;
        const tick = (t) => {
          an.getByteTimeDomainData(buf); let sum = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
          const rms = Math.min(1, Math.sqrt(sum / buf.length) * 3.2);
          if (t - last > 60) { last = t; samplesRef.current.push(rms); setLevels((l) => [...l.slice(-BARS + 1), rms]); }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {}
      recRef.current = rec; rec.start(250); startRef.current = Date.now(); setRecording(true); setSecs(0);
      timerRef.current = setInterval(() => { const s = Math.floor((Date.now() - startRef.current) / 1000); setSecs(s); if (s >= maxSecs) { try { rec.stop(); } catch {} } }, 250);
      try { navigator.vibrate?.(12); } catch {}
      return true;
    } catch { teardown(); return false; }
  }, [maxSecs]);

  const stop = useCallback(() => { try { if (recRef.current?.state !== 'inactive') recRef.current?.stop(); } catch {} }, []);
  const cancel = useCallback(() => { cancelRef.current = true; try { if (recRef.current?.state !== 'inactive') recRef.current?.stop(); else teardown(); } catch { teardown(); } recRef.current = null; setRecording(false); setSecs(0); setLevels([]); }, []);
  useEffect(() => () => { cancelRef.current = true; try { recRef.current?.stop(); } catch {} teardown(); }, []);
  return { recording, secs, levels, start, stop, cancel };
}

export function RecorderBar({ rec, accent = '#F5A623', maxSecs = 120, compact = false }) {
  const bars = [...Array(Math.max(0, BARS - rec.levels.length)).fill(0), ...rec.levels];
  const near = maxSecs - rec.secs <= 10;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, animation: 'vrIn .22s cubic-bezier(.2,.8,.2,1)' }}>
      <style>{`@keyframes vrIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@keyframes vrDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.8)}}`}</style>
      <button type="button" onClick={rec.cancel} aria-label="Discard voice note" style={{ ...glass, width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>
      </button>
      <div style={{ flex: 1, minWidth: 0, height: compact ? 44 : 46, ...glass, borderRadius: 23, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px' }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#FF5A5F', flexShrink: 0, animation: 'vrDot 1.1s ease infinite' }} />
        <span style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: near ? '#FF8A8A' : '#fff', flexShrink: 0, minWidth: 34 }}>{fmt(rec.secs)}</span>
        <div aria-hidden style={{ flex: 1, minWidth: 0, height: 26, display: 'flex', alignItems: 'center', gap: 2, overflow: 'hidden', justifyContent: 'flex-end' }}>
          {bars.map((v, i) => <span key={i} style={{ flex: '0 0 3px', height: `${Math.max(10, v * 100)}%`, borderRadius: 2, background: i >= bars.length - 3 ? accent : 'rgba(255,255,255,0.75)', opacity: v ? 1 : 0.25, transition: 'height .08s linear' }} />)}
        </div>
      </div>
      <button type="button" onClick={rec.stop} aria-label="Send voice note" style={{ ...glass, width: 44, height: 44, borderRadius: '50%', background: `${accent}33`, borderColor: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
      </button>
    </div>
  );
}

// Only one voice note plays at a time across the app
let currentAudio = null;

export function VoiceBubble({ src, peaks, secs, mine = false, accent = '#F5A623', label }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(secs || 0);
  const [rate, setRate] = useState(1);
  const bars = peaks && peaks.length ? squash(peaks) : hashBars(src);

  useEffect(() => {
    const a = new Audio(); a.preload = 'metadata'; a.src = src; audioRef.current = a;
    const onMeta = () => { if (isFinite(a.duration) && a.duration > 0) setDur(a.duration); };
    const onTime = () => setPos(a.currentTime);
    const onEnd = () => { setPlaying(false); setPos(0); a.currentTime = 0; };
    const onPause = () => setPlaying(false); const onPlay = () => setPlaying(true);
    a.addEventListener('loadedmetadata', onMeta); a.addEventListener('durationchange', onMeta); a.addEventListener('timeupdate', onTime); a.addEventListener('ended', onEnd); a.addEventListener('pause', onPause); a.addEventListener('play', onPlay);
    return () => { a.pause(); a.removeAttribute('src'); if (currentAudio === a) currentAudio = null; };
  }, [src]);
  // smooth progress while playing
  useEffect(() => { if (!playing) return; let r; const f = () => { const a = audioRef.current; if (a) setPos(a.currentTime); r = requestAnimationFrame(f); }; r = requestAnimationFrame(f); return () => cancelAnimationFrame(r); }, [playing]);

  const toggle = () => {
    const a = audioRef.current; if (!a) return;
    if (a.paused) { if (currentAudio && currentAudio !== a) currentAudio.pause(); currentAudio = a; a.playbackRate = rate; a.play().catch(() => {}); } else a.pause();
  };
  const seek = (e) => {
    const a = audioRef.current; if (!a || !dur) return;
    const r = e.currentTarget.getBoundingClientRect(); const k = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    a.currentTime = k * dur; setPos(a.currentTime); if (a.paused) toggle();
  };
  const cycle = () => { const n = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1; setRate(n); if (audioRef.current) audioRef.current.playbackRate = n; };
  const p = dur ? Math.min(1, pos / dur) : 0;
  const shown = playing || pos > 0 ? pos : dur;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 210, maxWidth: 270, padding: '8px 10px 8px 8px', borderRadius: 22, background: mine ? `${accent}2b` : 'rgba(255,255,255,0.09)', border: `1px solid ${mine ? `${accent}55` : 'rgba(255,255,255,0.08)'}` }}>
      <button type="button" onClick={toggle} aria-label={playing ? 'Pause voice note' : 'Play voice note'} style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: mine ? accent : 'rgba(255,255,255,0.92)', boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}>
        {playing
          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="#0A0A0F"><rect x="5" y="4" width="5" height="16" rx="1.5" /><rect x="14" y="4" width="5" height="16" rx="1.5" /></svg>
          : <svg width="14" height="14" viewBox="0 0 24 24" fill="#0A0A0F" style={{ marginLeft: 2 }}><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" /></svg>}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div onClick={seek} role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(pos)} style={{ height: 26, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
          {bars.map((v, i) => { const on = (i + 0.5) / bars.length <= p; return <span key={i} style={{ flex: 1, minWidth: 2, height: `${Math.max(14, v * 100)}%`, borderRadius: 2, background: on ? (mine ? '#fff' : accent) : 'rgba(255,255,255,0.35)', transition: 'background .12s' }} />; })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontVariantNumeric: 'tabular-nums' }}>{fmt(shown)}{label ? <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}> · {label}</span> : null}</span>
          <button type="button" onClick={cycle} aria-label="Playback speed" style={{ height: 18, padding: '0 7px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(0,0,0,0.25)', color: '#fff', fontSize: 10, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', lineHeight: '16px' }}>{rate}×</button>
        </div>
      </div>
    </div>
  );
}
