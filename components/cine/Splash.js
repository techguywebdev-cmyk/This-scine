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

// Full-screen boot splash. `ready` = first content is in; it waits until the dot
// has shown a couple of colours (min ~2.6s, about four colours) before fading out and calling onDone.
export default function Splash({ ready, onDone, minMs = 2600 }) {
  const start = useRef(Date.now());
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!ready || leaving) return;
    // Full intro once per browser session; quicker on later reloads.
    let min = minMs;
    try { if (sessionStorage.getItem('ts_intro')) min = Math.min(minMs, 1200); else sessionStorage.setItem('ts_intro', '1'); } catch {}
    const wait = Math.max(0, min - (Date.now() - start.current));
    const t = setTimeout(() => setLeaving(true), wait);
    return () => clearTimeout(t);
  }, [ready, leaving, minMs]);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => onDone && onDone(), 460);
    return () => clearTimeout(t);
  }, [leaving, onDone]);

  return (
    <div
      aria-busy={!leaving}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, background: '#06060B', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: leaving ? 0 : 1, transition: 'opacity .44s ease',
        pointerEvents: leaving ? 'none' : 'auto',
      }}
    >
      <div className="ts-glow" style={{ left: '-70vmax', top: '-70vmax' }} />
      <div className="ts-glow" style={{ right: '-75vmax', bottom: '-75vmax', opacity: 0.12 }} />
      <div style={{ position: 'relative', transform: leaving ? 'scale(1.06)' : 'none', transition: 'transform .46s cubic-bezier(.4,0,.2,1)' }}>
        <TsMark size={88} />
      </div>
    </div>
  );
}
