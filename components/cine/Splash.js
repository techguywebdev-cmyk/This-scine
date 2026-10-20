'use client';
import { useEffect, useRef, useState } from 'react';

// Thiscene "ts." mark — white letters; the dot cycles through the same accent
// colours the movie cards use, and the screen picks up a soft card-style glow
// in whatever colour the dot is on. Pure CSS so it runs before hydration.

const DOTS = ['#818CF8', '#2DD4BF', '#FF6B8A', '#A3E635', '#B07FEF', '#38BDF8', '#FF7A2F', '#F5A623'];
const STEP = 0.62; // seconds per colour
const CYCLE = +(DOTS.length * STEP).toFixed(2);

// Hold each colour, then glide to the next.
const colorFrames = (prop) => {
  const n = DOTS.length, seg = 100 / n;
  let k = '';
  DOTS.forEach((c, i) => {
    const a = (i * seg).toFixed(2), b = (i * seg + seg * 0.62).toFixed(2);
    k += `${a}%,${b}%{${prop}:${c}}`;
  });
  return k + `100%{${prop}:${DOTS[0]}}`;
};
// Little pop on every colour change.
const popFrames = () => {
  const n = DOTS.length, seg = 100 / n;
  let k = '';
  for (let i = 0; i < n; i++) {
    const s = i * seg;
    k += `${s.toFixed(2)}%{transform:scale(1)}${(s + seg * 0.7).toFixed(2)}%{transform:scale(1)}${(s + seg * 0.84).toFixed(2)}%{transform:scale(1.22)}`;
  }
  return k + '100%{transform:scale(1)}';
};

const CSS = `
@keyframes tsCol{${colorFrames('background-color')}}
@keyframes tsPop{${popFrames()}}
@keyframes tsIn{0%{opacity:0;transform:translateY(10%)}100%{opacity:1;transform:none}}
@keyframes tsDotIn{0%{opacity:0;transform:scale(0)}100%{opacity:1;transform:scale(1)}}
.ts-mark{display:inline-flex;align-items:baseline;font-family:var(--font-display,'Inter Tight'),'Inter Tight',system-ui,sans-serif;font-weight:800;letter-spacing:-.03em;line-height:1;color:#fff;user-select:none;animation:tsIn .5s cubic-bezier(.2,.8,.2,1) both}
.ts-mark .ts-d{position:relative;display:inline-block;width:.17em;height:.17em;margin-left:.07em;animation:tsDotIn .4s cubic-bezier(.3,1.4,.5,1) .25s both}
.ts-mark .ts-d i{position:absolute;inset:0;border-radius:50%;background:${DOTS[0]};animation:tsCol ${CYCLE}s linear infinite,tsPop ${CYCLE}s ease-in-out infinite}
.ts-mark .ts-d b{position:absolute;inset:-60%;border-radius:50%;background:${DOTS[0]};filter:blur(.12em);opacity:.45;animation:tsCol ${CYCLE}s linear infinite}
.ts-glow{position:absolute;width:120vmax;height:120vmax;border-radius:50%;filter:blur(90px);opacity:.16;background:${DOTS[0]};animation:tsCol ${CYCLE}s linear infinite;pointer-events:none}
@media (prefers-reduced-motion:reduce){.ts-mark,.ts-mark .ts-d{animation:none!important}.ts-mark .ts-d i,.ts-mark .ts-d b,.ts-glow{animation-duration:${CYCLE * 3}s!important}}
`;

export function TsMark({ size = 84 }) {
  return (
    <span className="ts-mark" style={{ fontSize: size }} role="img" aria-label="Thiscene">
      <style>{CSS}</style>
      <span aria-hidden="true">ts</span>
      <span className="ts-d" aria-hidden="true"><b /><i /></span>
    </span>
  );
}

// ── "Opening night" splash ──
// Popcorn, our little bucket, hauls the rope and the velvet curtains part. How far they're
// open is how far the page has loaded; once the feed is in they swing wide and fade away.
const FOLDS = 'linear-gradient(90deg,#5A0A16 0%,#8E1426 12%,#6A0C1B 24%,#A3192D 36%,#5E0B18 48%,#93162A 60%,#650C1A 72%,#A01A2D 86%,#5A0A16 100%)';
const PUFFS = [[28, 36, 11], [42, 30, 12], [57, 29, 12], [71, 36, 11], [35, 24, 9], [50, 21, 10], [64, 24, 9]];

export function Popcorn({ size = 100, lean = 0, blink = false, cheer = false }) {
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 100 125" style={{ transform: `rotate(${lean}deg)`, transformOrigin: '50% 95%', overflow: 'visible' }} aria-hidden="true">
      <line x1="40" y1="104" x2="36" y2="118" stroke="#F4E7D3" strokeWidth="4" strokeLinecap="round" />
      <line x1="60" y1="104" x2="66" y2="118" stroke="#F4E7D3" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="33" cy="119" rx="7" ry="4" fill="#1B1B24" /><ellipse cx="69" cy="119" rx="7" ry="4" fill="#1B1B24" />
      <path d="M22 46 L78 46 L70 106 L30 106 Z" fill="#FFF7EA" />
      <path d="M30 46 L38 46 L37 106 L32 106 Z" fill="#E3283E" /><path d="M46 46 L54 46 L53 106 L47 106 Z" fill="#E3283E" /><path d="M62 46 L70 46 L68 106 L63 106 Z" fill="#E3283E" />
      <rect x="20" y="42" width="60" height="8" rx="4" fill="#E3283E" />
      {PUFFS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? '#FFE9A8' : '#FFF4CF'} />)}
      {blink
        ? <g><path d="M38 66 q4 3 8 0" stroke="#1B1B24" strokeWidth="2.5" fill="none" strokeLinecap="round" /><path d="M54 66 q4 3 8 0" stroke="#1B1B24" strokeWidth="2.5" fill="none" strokeLinecap="round" /></g>
        : <g><ellipse cx="42" cy="66" rx="5" ry="6" fill="#fff" /><ellipse cx="58" cy="66" rx="5" ry="6" fill="#fff" /><circle cx="43.5" cy="67" r="2.6" fill="#1B1B24" /><circle cx="59.5" cy="67" r="2.6" fill="#1B1B24" /></g>}
      <path d={cheer ? 'M41 78 q9 10 18 0 Z' : 'M42 79 q8 6 16 0'} stroke="#1B1B24" strokeWidth="2.5" fill={cheer ? '#7A1020' : 'none'} strokeLinecap="round" />
      <ellipse cx="36" cy="75" rx="3.5" ry="2" fill="#FF8FA3" opacity="0.7" /><ellipse cx="64" cy="75" rx="3.5" ry="2" fill="#FF8FA3" opacity="0.7" />
      {cheer
        ? <g><line x1="24" y1="70" x2="10" y2="50" stroke="#F4E7D3" strokeWidth="4" strokeLinecap="round" /><line x1="76" y1="70" x2="90" y2="50" stroke="#F4E7D3" strokeWidth="4" strokeLinecap="round" /></g>
        : <g><line x1="74" y1="72" x2="94" y2="62" stroke="#F4E7D3" strokeWidth="4" strokeLinecap="round" /><line x1="74" y1="84" x2="96" y2="70" stroke="#F4E7D3" strokeWidth="4" strokeLinecap="round" /><circle cx="95" cy="66" r="4.5" fill="#F4E7D3" /></g>}
    </svg>
  );
}

export default function Splash({ ready, onDone, minMs = 1800 }) {
  const start = useRef(Date.now());
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const [p, setP] = useState(0);
  const [tick, setTick] = useState(0);
  const [vw, setVw] = useState({ w: 400, h: 800 });
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const size = () => setVw({ w: window.innerWidth, h: window.innerHeight });
    size(); window.addEventListener('resize', size);
    let reduce = false; try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch {}
    let min = minMs;
    try { if (sessionStorage.getItem('ts_intro')) min = Math.min(minMs, 1000); else sessionStorage.setItem('ts_intro', '1'); } catch {}
    let raf; let cur = 0; let left = false;
    const step = () => {
      const t = (Date.now() - start.current) / 1000;
      let target = Math.min(0.88, 0.88 * (1 - Math.exp(-t / 1.4)));
      if (readyRef.current) target = 1;
      cur += (target - cur) * (reduce ? 1 : readyRef.current ? 0.09 : 0.05);
      setP(cur); setTick((k) => k + 1);
      if (!left && readyRef.current && cur > 0.985 && Date.now() - start.current > min) {
        left = true; setTimeout(() => setLeaving(true), reduce ? 0 : 380);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); };
  }, [minMs]);

  useEffect(() => {
    if (!leaving) return undefined;
    const t = setTimeout(() => onDone && onDone(), 460);
    return () => clearTimeout(t);
  }, [leaving, onDone]);

  const { w: W, h: H } = vw;
  const half = W / 2;
  const open = p * half * 0.9;
  const done = p > 0.97;
  const phase = (tick % 48) / 48;
  const lean = done ? 0 : -10 - 8 * Math.max(0, Math.sin(phase * Math.PI * 2));
  const blink = tick % 140 < 6;
  const popX = Math.max(12, W * 0.06), popY = H - 210;
  const POP = 116;
  const handX = popX + POP * 0.95, handY = popY + POP * 0.66;
  const edgeX = half - open - 2, edgeY = H * 0.5;

  return (
    <div aria-busy={!leaving} role="progressbar" aria-label="Loading Thiscene" aria-valuenow={Math.round(p * 100)} aria-valuemin={0} aria-valuemax={100}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'linear-gradient(180deg,#14101F,#06060B)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: leaving ? 0 : 1, transition: 'opacity .44s ease', pointerEvents: leaving ? 'none' : 'auto' }}>
      {/* the stage behind: a spotlight and the mark */}
      <div style={{ position: 'absolute', width: '110vmax', height: '110vmax', borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,211,138,0.9), rgba(245,211,138,0) 60%)', opacity: 0.1 + p * 0.22, filter: 'blur(20px)' }} />
      <div style={{ position: 'relative', transform: `scale(${0.86 + p * 0.14})`, opacity: 0.4 + p * 0.6 }}><TsMark size={88} /></div>

      {/* curtains */}
      {['left', 'right'].map((side) => (
        <div key={side} style={{ position: 'absolute', top: 54, bottom: 0, width: half + 2, [side]: -open, background: FOLDS, boxShadow: side === 'left' ? 'inset -30px 0 40px rgba(0,0,0,0.35)' : 'inset 30px 0 40px rgba(0,0,0,0.35)' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.45))' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, background: '#C9962E' }} />
        </div>
      ))}

      {/* valance */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 64, background: 'linear-gradient(180deg,#4A0812,#7A1020)' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 10, height: 3, background: '#C9962E' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: -14, display: 'flex', overflow: 'hidden' }}>
          {Array.from({ length: Math.ceil(W / 44) + 1 }).map((_, i) => <span key={i} style={{ flexShrink: 0, width: 44, height: 28, borderRadius: '0 0 22px 22px', background: '#7A1020', borderBottom: '3px solid #C9962E' }} />)}
        </div>
      </div>

      {/* rope */}
      {!done && (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden="true">
          <path d={`M${handX} ${handY} Q ${(handX + edgeX) / 2} ${Math.max(handY, edgeY) + 30 * (1 - p)} ${edgeX} ${edgeY}`} stroke="#E0B44C" strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx={edgeX} cy={edgeY} r="7" fill="#E0B44C" />
        </svg>
      )}

      {/* Popcorn */}
      <div style={{ position: 'absolute', left: popX, top: popY }}><Popcorn size={POP} lean={lean} blink={blink} cheer={done} /></div>

      <div style={{ position: 'absolute', bottom: 'calc(30px + env(safe-area-inset-bottom))', fontSize: 12.5, fontWeight: 600, letterSpacing: 1.5, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>{done ? 'Showtime' : `Setting the scene · ${Math.round(p * 100)}%`}</div>
    </div>
  );
}
