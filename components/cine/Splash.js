'use client';
import { useEffect, useRef, useState } from 'react';

// Thiscene "ts." mark — black & white. Letters rise in, the dot drops and then
// breathes like the in-app live dot until the first films are ready.

const CSS = `
@keyframes tsRise{0%{opacity:0;transform:translateY(32%);filter:blur(6px)}100%{opacity:1;transform:none;filter:blur(0)}}
@keyframes tsDrop{0%{opacity:0;transform:translateY(-140%) scale(.4)}55%{opacity:1;transform:translateY(8%) scale(1.12,.86)}75%{transform:translateY(-6%) scale(.96,1.04)}100%{opacity:1;transform:none}}
@keyframes tsBreathe{0%,100%{transform:scale(1)}50%{transform:scale(.82)}}
@keyframes tsRing{0%{opacity:.55;transform:scale(1)}100%{opacity:0;transform:scale(3.2)}}
@keyframes tsSweep{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
.ts-mark{display:inline-flex;align-items:baseline;font-family:var(--font-display,'Inter Tight'),'Inter Tight',system-ui,sans-serif;font-weight:800;letter-spacing:-.03em;line-height:1;color:#fff;user-select:none}
.ts-mark .ts-l{display:inline-block;opacity:0;animation:tsRise .62s cubic-bezier(.2,.8,.2,1) forwards}
.ts-mark .ts-l2{animation-delay:.09s}
.ts-mark .ts-d{position:relative;display:inline-block;width:.17em;height:.17em;margin-left:.07em;border-radius:50%;opacity:0;animation:tsDrop .56s cubic-bezier(.3,.7,.3,1) .42s forwards}
.ts-mark .ts-d i{position:absolute;inset:0;border-radius:50%;background:#fff;animation:tsBreathe 1.6s ease-in-out 1.1s infinite}
.ts-mark .ts-d b{position:absolute;inset:0;border-radius:50%;border:1.5px solid #fff;opacity:0;animation:tsRing 1.6s ease-out 1.1s infinite}
.ts-mark.ts-static .ts-l,.ts-mark.ts-static .ts-d{animation:none;opacity:1}
.ts-bar{position:relative;width:56px;height:2px;border-radius:2px;overflow:hidden;background:rgba(255,255,255,.12);opacity:0;animation:tsRise .5s ease 1s forwards}
.ts-bar::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,#fff,transparent);animation:tsSweep 1.1s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.ts-mark .ts-l,.ts-mark .ts-d,.ts-bar{animation:none!important;opacity:1}.ts-mark .ts-d i,.ts-mark .ts-d b{animation:none!important}}
`;

export function TsMark({ size = 84, still = false }) {
  return (
    <span className={`ts-mark${still ? ' ts-static' : ''}`} style={{ fontSize: size }} role="img" aria-label="Thiscene">
      <style>{CSS}</style>
      <span className="ts-l" aria-hidden="true">t</span>
      <span className="ts-l ts-l2" aria-hidden="true">s</span>
      <span className="ts-d" aria-hidden="true"><b /><i /></span>
    </span>
  );
}

// Full-screen boot splash. `ready` = first content is in; it then waits for the
// intro to finish (min ~1.15s) before fading out and calling onDone.
export default function Splash({ ready, onDone, minMs = 1150 }) {
  const start = useRef(Date.now());
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!ready || leaving) return;
    const wait = Math.max(0, minMs - (Date.now() - start.current));
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
        position: 'fixed', inset: 0, zIndex: 9999, background: '#06060B',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28,
        opacity: leaving ? 0 : 1, transition: 'opacity .44s ease',
        pointerEvents: leaving ? 'none' : 'auto',
      }}
    >
      <div style={{ transform: leaving ? 'scale(1.08)' : 'none', filter: leaving ? 'blur(4px)' : 'none', transition: 'transform .46s cubic-bezier(.4,0,.2,1), filter .46s ease' }}>
        <TsMark size={88} />
      </div>
      <div className="ts-bar" />
    </div>
  );
}
