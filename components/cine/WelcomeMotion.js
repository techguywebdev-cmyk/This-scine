'use client';
import { useEffect, useState } from 'react';

// Looping motion pieces for onboarding. Pure CSS/SVG — light, crisp, and tinted with the live accent.
// Both respect prefers-reduced-motion by showing a still, finished composition.

const useReducedMotion = () => {
  const [r, setR] = useState(false);
  useEffect(() => {
    try { const m = window.matchMedia('(prefers-reduced-motion: reduce)'); setR(m.matches); const f = (e) => setR(e.matches); m.addEventListener?.('change', f); return () => m.removeEventListener?.('change', f); } catch {}
  }, []);
  return r;
};
const small = (p) => (p || '').replace('/w500/', '/w185/').replace('/w342/', '/w185/');
const glass = { background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.16)' };

// ── Import: a history file streams posters into your library, counter ticks up ──
const IM_CYCLE = 5200;
const SLOTS = [[0, 0], [1, 0], [0, 1], [1, 1]];

export function ImportMotion({ posters = [], accent = '#F5A623' }) {
  const still = useReducedMotion();
  const [count, setCount] = useState(0);
  const total = 214;
  useEffect(() => {
    if (still) { setCount(total); return; }
    let raf; const t0 = performance.now();
    const tick = (now) => {
      const p = ((now - t0) % IM_CYCLE) / IM_CYCLE; // 0..1
      const k = Math.min(1, Math.max(0, (p - 0.08) / 0.62));
      setCount(Math.round(total * (1 - Math.pow(1 - k, 2.2))));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [still]);
  const P = [0, 1, 2, 3].map((i) => small(posters[i % Math.max(1, posters.length)]?.poster));
  // geometry (px) inside a 300×190 stage
  const src = { x: 26, y: 50 };
  const frame = { x: 176, y: 22, w: 100, h: 146 };
  const slot = (c, r) => ({ x: frame.x + 10 + c * 42, y: frame.y + 22 + r * 58 });
  const anim = (a) => (still ? 'none' : a);

  return (
    <div aria-hidden style={{ position: 'relative', width: 300, height: 190, margin: '0 auto' }}>
      <style>{`
        @keyframes imBob{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-6px) rotate(-2deg)}}
        @keyframes imLine{0%{opacity:.25}50%{opacity:.7}100%{opacity:.25}}
        @keyframes imDash{to{stroke-dashoffset:-28}}
        @keyframes imFly{0%{transform:translate(${src.x + 18}px,${src.y + 22}px) scale(.35) rotate(-10deg);opacity:0}
          10%{opacity:1}
          48%{transform:translate(var(--tx),var(--ty)) scale(1) rotate(0deg);opacity:1}
          56%{transform:translate(var(--tx),var(--ty)) scale(1);opacity:0}
          100%{transform:translate(var(--tx),var(--ty)) scale(1);opacity:0}}
        @keyframes imPulse{0%,100%{box-shadow:0 0 0 0 ${accent}00}50%{box-shadow:0 0 0 6px ${accent}22}}
      `}</style>

      {/* stream path */}
      <svg width="300" height="190" style={{ position: 'absolute', inset: 0 }}>
        <path d={`M ${src.x + 62} ${src.y + 30} C 120 10, 150 40, ${frame.x - 4} ${frame.y + 60}`} fill="none" stroke={accent} strokeOpacity=".55" strokeWidth="2" strokeDasharray="3 11" strokeLinecap="round" style={{ animation: anim('imDash .9s linear infinite') }} />
      </svg>

      {/* history file */}
      <div style={{ position: 'absolute', left: src.x, top: src.y, width: 72, height: 92, borderRadius: 12, ...glass, animation: anim('imBob 3.2s ease-in-out infinite'), padding: '14px 10px 0', boxSizing: 'border-box' }}>
        <div style={{ position: 'absolute', top: -1, right: -1, width: 18, height: 18, borderRadius: '0 12px 0 8px', background: `${accent}55` }} />
        {[44, 36, 46, 28].map((w, i) => <div key={i} style={{ height: 5, width: w, borderRadius: 3, background: '#fff', opacity: 0.35, marginTop: i ? 7 : 0, animation: anim(`imLine 1.6s ease-in-out ${i * 0.2}s infinite`) }} />)}
        <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 9.5, fontWeight: 800, letterSpacing: 1.2, color: accent }}>CSV · ZIP</div>
      </div>

      {/* your library */}
      <div style={{ position: 'absolute', left: frame.x, top: frame.y, width: frame.w, height: frame.h, borderRadius: 16, ...glass, animation: anim('imPulse 1.3s ease-in-out infinite') }}>
        <div style={{ position: 'absolute', top: 7, left: 0, right: 0, textAlign: 'center', fontSize: 8.5, fontWeight: 800, letterSpacing: 1.6, color: 'rgba(255,255,255,0.6)' }}>YOUR LIBRARY</div>
      </div>
      {SLOTS.map(([c, r], i) => {
        const s = slot(c, r);
        const on = 47 + i * 9.6; // % of cycle when the flying poster lands (flight lands at 48%, staggered 0.5s ≈ 9.6%)
        return (
          <div key={`s${i}`} style={{ position: 'absolute', left: s.x, top: s.y, width: 38, height: 54, borderRadius: 5, overflow: 'hidden', background: `${accent}33`, opacity: still ? 1 : 0, animation: anim(`imSlotK${i} ${IM_CYCLE}ms ease-out infinite`) }}>
            <style>{`@keyframes imSlotK${i}{0%,${on}%{opacity:0;transform:scale(.88)}${on + 5}%{opacity:1;transform:scale(1.06)}${on + 9}%{transform:scale(1)}88%{opacity:1}96%,100%{opacity:0}}`}</style>
            {P[i] && <img src={P[i]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
          </div>
        );
      })}
      {!still && SLOTS.map(([c, r], i) => {
        const s = slot(c, r);
        return (
          <div key={`f${i}`} style={{ position: 'absolute', left: 0, top: 0, width: 38, height: 54, borderRadius: 5, overflow: 'hidden', background: `${accent}55`, boxShadow: '0 8px 20px rgba(0,0,0,0.45)', '--tx': `${s.x}px`, '--ty': `${s.y}px`, animation: `imFly ${IM_CYCLE}ms cubic-bezier(.45,.05,.3,1) ${i * 0.5}s infinite`, opacity: 0 }}>
            {P[i] && <img src={P[i]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
          </div>
        );
      })}

      {/* counter */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: -6, display: 'flex', justifyContent: 'center' }}>
        <div style={{ ...glass, borderRadius: 14, padding: '5px 12px', fontSize: 12, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: '#fff' }}>
          {count >= total ? <><span style={{ color: accent }}>✓</span> {total} films imported</> : <>Importing… <span style={{ color: accent }}>{count}</span></>}
        </div>
      </div>
    </div>
  );
}

// ── Invite: your link travels to a friend, they pop in, you press play together ──
const IV = '6.4s';

export function InviteMotion({ user, name = '', accent = '#F5A623', posters = [] }) {
  const still = useReducedMotion();
  const anim = (a) => (still ? 'none' : a);
  const poster = (posters[0]?.poster || '').replace('/w500/', '/w342/');
  const me = { x: 46, y: 118 }, friend = { x: 190, y: 118 }, D = 64;
  const hue2 = '#FF6B8A';
  return (
    <div aria-hidden style={{ position: 'relative', width: 300, height: 200, margin: '0 auto' }}>
      <style>{`
        @keyframes ivLink{0%{transform:translate(${me.x + 10}px,${me.y + 18}px) scale(.6);opacity:0}6%{opacity:1;transform:translate(${me.x + 10}px,${me.y + 18}px) scale(1)}
          26%{transform:translate(${friend.x - 30}px,${friend.y + 18}px) scale(1);opacity:1}31%,100%{transform:translate(${friend.x - 30}px,${friend.y + 18}px) scale(.6);opacity:0}}
        @keyframes ivDash{0%,28%{opacity:1;transform:scale(1)}31%{transform:scale(1.08)}34%,94%{opacity:0;transform:scale(.8)}100%{opacity:1;transform:scale(1)}}
        @keyframes ivFriend{0%,30%{opacity:0;transform:scale(.4)}35%{opacity:1;transform:scale(1.12)}39%{transform:scale(1)}90%{opacity:1;transform:scale(1)}96%,100%{opacity:0;transform:scale(.8)}}
        @keyframes ivRipple{0%,32%{opacity:0;transform:scale(1)}34%{opacity:.8}52%,100%{opacity:0;transform:scale(1.9)}}
        @keyframes ivPoster{0%,40%{opacity:0;transform:translate(-50%,16px) scale(.85)}48%{opacity:1;transform:translate(-50%,0) scale(1)}90%{opacity:1;transform:translate(-50%,0)}96%,100%{opacity:0;transform:translate(-50%,-6px)}}
        @keyframes ivSync{0%,46%{stroke-dashoffset:60;opacity:0}54%{stroke-dashoffset:0;opacity:.8}90%{opacity:.8;stroke-dashoffset:0}96%,100%{opacity:0}}
        @keyframes ivPlay{0%,54%{opacity:0;transform:translate(-50%,4px)}60%{opacity:1;transform:translate(-50%,0)}90%{opacity:1}96%,100%{opacity:0}}
        @keyframes ivFloat{0%,58%{opacity:0;transform:translateY(0) scale(.6)}64%{opacity:1;transform:translateY(-8px) scale(1)}86%{opacity:0;transform:translateY(-46px) scale(1)}100%{opacity:0}}
      `}</style>

      {/* sync lines from both people to the film */}
      <svg width="300" height="200" style={{ position: 'absolute', inset: 0 }}>
        {[me, friend].map((p, i) => (
          <path key={i} d={`M ${p.x + D / 2} ${p.y - 2} Q ${p.x + D / 2} 70, 150 ${70}`} fill="none" stroke={accent} strokeWidth="2" strokeDasharray="60" strokeLinecap="round" style={{ opacity: still ? 0.8 : 0, animation: anim(`ivSync ${IV} ease-out infinite`) }} />
        ))}
      </svg>

      {/* the film you watch together */}
      <div style={{ position: 'absolute', left: '50%', top: 4, width: 56, height: 82, borderRadius: 7, overflow: 'hidden', background: `${accent}44`, boxShadow: '0 14px 34px rgba(0,0,0,0.55)', opacity: still ? 1 : 0, transform: 'translate(-50%,0)', animation: anim(`ivPoster ${IV} cubic-bezier(.2,.8,.2,1) infinite`) }}>
        {poster && <img src={poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      </div>
      <div style={{ position: 'absolute', left: '50%', top: 92, ...glass, borderRadius: 12, padding: '4px 10px', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', opacity: still ? 1 : 0, transform: 'translate(-50%,0)', animation: anim(`ivPlay ${IV} ease-out infinite`) }}>
        <span style={{ color: accent }}>▶</span> In sync
      </div>

      {/* me */}
      <div style={{ position: 'absolute', left: me.x, top: me.y, width: D, height: D, borderRadius: '50%', overflow: 'hidden', boxShadow: `0 0 0 3px ${accent}`, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: '#fff', zIndex: 2 }}>
        {user?.imageUrl ? <img src={user.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name[0] || '🙂')}
      </div>

      {/* friend slot → friend */}
      <div style={{ position: 'absolute', left: friend.x, top: friend.y, width: D, height: D, borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.45)', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: 'rgba(255,255,255,0.75)', opacity: still ? 0 : 1, animation: anim(`ivDash ${IV} ease-in-out infinite`) }}>+</div>
      <div style={{ position: 'absolute', left: friend.x, top: friend.y, width: D, height: D, borderRadius: '50%', border: `2px solid ${hue2}`, opacity: 0, animation: anim(`ivRipple ${IV} ease-out infinite`) }} />
      <div style={{ position: 'absolute', left: friend.x, top: friend.y, width: D, height: D, borderRadius: '50%', background: `linear-gradient(135deg, ${hue2}, ${accent})`, boxShadow: `0 0 0 3px ${hue2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, opacity: still ? 1 : 0, animation: anim(`ivFriend ${IV} cubic-bezier(.2,.9,.3,1.2) infinite`) }}>😄</div>

      {/* the invite link */}
      {!still && (
        <div style={{ position: 'absolute', left: 0, top: 0, ...glass, borderRadius: 12, padding: '4px 9px', fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap', color: '#fff', animation: `ivLink ${IV} cubic-bezier(.5,0,.3,1) infinite`, opacity: 0, zIndex: 3 }}>
          🔗 Invite
        </div>
      )}

      {/* reactions */}
      {!still && ['🍿', '❤️', '😂', '🍿'].map((e, i) => (
        <span key={i} style={{ position: 'absolute', left: [me.x - 6, me.x + 44, friend.x + 4, friend.x + 52][i], top: me.y - 10, fontSize: 16, opacity: 0, animation: `ivFloat ${IV} ease-out ${i * 0.14}s infinite` }}>{e}</span>
      ))}
    </div>
  );
}
