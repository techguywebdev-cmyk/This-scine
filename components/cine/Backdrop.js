'use client';
import { useEffect, useState } from 'react';

// Shared cinematic backdrop for full-screen moments (sign-in, 404, errors):
// drifting rows of posters, a glow that cycles through the card colours, and a fade to the page.
export const DOTS = ['#818CF8', '#2DD4BF', '#FF6B8A', '#A3E635', '#B07FEF', '#38BDF8', '#FF7A2F', '#F5A623'];

let cache = null;
export function usePosters(n = 24) {
  const [list, setList] = useState(cache || []);
  useEffect(() => {
    if (cache) return;
    fetch('/api/movies?popular=1').then((r) => r.json()).then((d) => {
      cache = (d.movies || []).map((m) => m.poster).filter(Boolean).sort(() => Math.random() - 0.5);
      setList(cache);
    }).catch(() => {});
  }, []);
  return list.slice(0, n);
}

const glowFrames = () => {
  const seg = 100 / DOTS.length;
  return DOTS.map((c, i) => `${(i * seg).toFixed(2)}%{background:${c}}`).join('') + `100%{background:${DOTS[0]}}`;
};

export const BACKDROP_CSS = `
@keyframes bdGlow{${glowFrames()}}
@keyframes bdMarq{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes bdUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes bdRing{0%{transform:scale(1);opacity:.45}100%{transform:scale(2.1);opacity:0}}
@keyframes bdFloat{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-6px) rotate(3deg)}}
@keyframes bdSpin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.bd-anim{animation:none!important}}
`;

export function Backdrop({ height = '62%', rows = 4, size = 104 }) {
  const posters = usePosters(rows * 7);
  const list = posters.length ? posters : Array(rows * 7).fill(null);
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div className="bd-anim" style={{ position: 'absolute', width: '120vmax', height: '120vmax', left: '-70vmax', top: '-70vmax', borderRadius: '50%', filter: 'blur(90px)', opacity: 0.22, animation: `bdGlow ${DOTS.length * 1.4}s linear infinite` }} />
      <div className="bd-anim" style={{ position: 'absolute', width: '120vmax', height: '120vmax', right: '-75vmax', bottom: '-75vmax', borderRadius: '50%', filter: 'blur(90px)', opacity: 0.16, animation: `bdGlow ${DOTS.length * 1.4}s linear infinite reverse` }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: -60, right: -60, top: -40, transform: 'rotate(-6deg)', opacity: 0.55 }}>
          {Array.from({ length: rows }, (_, r) => {
            const items = list.filter((_, i) => i % rows === r);
            return (
              <div key={r} className="bd-anim" style={{ display: 'flex', gap: 10, marginBottom: 10, width: 'max-content', animation: `bdMarq ${70 + r * 12}s linear infinite ${r % 2 ? 'reverse' : 'normal'}` }}>
                {[...items, ...items, ...items, ...items].map((src, i) => (
                  <div key={i} style={{ width: size, aspectRatio: '2/3', borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.05)' }}>
                    {src && <img src={src.replace('/w500/', '/w342/')} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(6,6,11,0.35) 0%, rgba(6,6,11,0.15) 35%, rgba(6,6,11,0.85) 80%, #06060B 100%)' }} />
      </div>
    </div>
  );
}

// Full-screen state (404, error…) with the backdrop, a pulsing icon and clear actions
export default function StatusPage({ icon, title, body, primary, secondary }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#06060B', color: '#fff', fontFamily: "var(--font-sans), system-ui, sans-serif", display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
      <style>{BACKDROP_CSS}</style>
      <Backdrop height="100%" rows={7} />
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(6,6,11,0.1) 0%, rgba(6,6,11,0.35) 55%, rgba(6,6,11,0.75) 100%)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 460, padding: '0 14px calc(14px + env(safe-area-inset-bottom))' }}>
      <div style={{ position: 'relative', borderRadius: 30, padding: '34px 24px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'linear-gradient(160deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03) 45%, rgba(10,10,18,0.35))', backdropFilter: 'blur(26px) saturate(150%)', WebkitBackdropFilter: 'blur(26px) saturate(150%)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)', animation: 'bdUp .45s ease both' }}>
        <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 22, animation: 'bdUp .5s ease both' }}>
          {[0, 1.1].map((d) => <span key={d} className="bd-anim" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.5)', animation: `bdRing 2.2s ease-out ${d}s infinite` }} />)}
          <div className="bd-anim" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'bdFloat 3.2s ease-in-out infinite' }}>{icon}</div>
        </div>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display), 'Inter Tight', system-ui, sans-serif", fontSize: 30, lineHeight: 1.08, fontWeight: 800, letterSpacing: '-0.03em', animation: 'bdUp .55s ease .05s both' }}>{title}</h1>
        {body && <p style={{ margin: '12px 0 0', fontSize: 15.5, lineHeight: 1.55, color: 'rgba(255,255,255,0.65)', maxWidth: 360, animation: 'bdUp .55s ease .1s both' }}>{body}</p>}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 28, animation: 'bdUp .55s ease .15s both' }}>
          {primary && (primary.href
            ? <a href={primary.href} style={btn(true)}>{primary.label}</a>
            : <button onClick={primary.onClick} style={btn(true)}>{primary.label}</button>)}
          {secondary && (secondary.href
            ? <a href={secondary.href} style={btn(false)}>{secondary.label}</a>
            : <button onClick={secondary.onClick} style={btn(false)}>{secondary.label}</button>)}
        </div>
      </div>
      </div>
    </div>
  );
}

const btn = (primary) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', height: 54, borderRadius: 27, fontSize: 16, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', textDecoration: 'none',
  ...(primary ? { background: '#fff', color: '#06060B', border: 'none' } : { background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }),
});

export const Icon = ({ d, size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
