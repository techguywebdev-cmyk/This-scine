'use client';
import { useEffect, useState } from 'react';
import { T, ambient } from './shared';
import { PALETTE, setTheme, useTheme } from './theme';

const DOTS = ['#818CF8', '#2DD4BF', '#FF6B8A', '#A3E635', '#B07FEF', '#38BDF8', '#FF7A2F', '#F5A623'];
const eyebrow = (c) => ({ fontSize: 10.5, letterSpacing: 2.2, textTransform: 'uppercase', fontWeight: 700, color: c });

// Miniature of the feed in the chosen colour: header, card, action bar, gradient
function Preview({ color, film }) {
  const [i, setI] = useState(0);
  useEffect(() => { if (!film) return undefined; const t = setInterval(() => setI((x) => (x + 1) % DOTS.length), 1400); return () => clearInterval(t); }, [film]);
  const c = film ? DOTS[i] : color;
  return (
    <div aria-hidden="true" style={{ position: 'relative', width: 150, height: 260, borderRadius: 24, overflow: 'hidden', background: ambient(c), border: `1px solid ${c}55`, boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 40px ${c}22`, transition: 'border-color .6s ease, box-shadow .6s ease', flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 30%, rgba(6,6,11,0.85) 100%), radial-gradient(90% 60% at 50% 30%, ${c}44, transparent 70%)`, transition: 'background .6s ease' }} />
      <div style={{ position: 'absolute', top: 12, left: 10, right: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: T.serif, fontSize: 11, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>thi<span style={{ color: c, transition: 'color .6s ease' }}>scene</span><span style={{ display: 'inline-block', width: 3, height: 3, borderRadius: 2, background: c, marginLeft: 1 }} /></span>
        <span style={{ display: 'flex', gap: 3 }}>{[0, 1, 2].map((k) => <span key={k} style={{ width: 12, height: 12, borderRadius: 4, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.12)' }} />)}</span>
      </div>
      <div style={{ position: 'absolute', top: 34, left: 10, display: 'flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 8, background: 'rgba(0,0,0,0.4)', border: `1px solid ${c}55` }}><span style={{ width: 3, height: 3, borderRadius: 2, background: c }} /><span style={{ fontSize: 6.5, fontWeight: 800, color: 'rgba(255,255,255,0.7)' }}>01</span></div>
      <div style={{ position: 'absolute', top: 92, left: '50%', transform: 'translateX(-50%)', width: 30, height: 30, borderRadius: '50%', border: `1.5px solid ${c}88`, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ width: 0, height: 0, borderLeft: `8px solid ${c}`, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', marginLeft: 2 }} /></div>
      <div style={{ position: 'absolute', right: 7, bottom: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[1, 0, 0, 0].map((on, k) => <span key={k} style={{ width: 17, height: 19, borderRadius: 6, background: on ? `${c}30` : 'rgba(0,0,0,0.42)', border: `1px solid ${on ? `${c}88` : 'rgba(255,255,255,0.1)'}`, transition: 'all .6s ease' }} />)}
      </div>
      <div style={{ position: 'absolute', left: 10, right: 32, bottom: 16 }}>
        <div style={{ display: 'flex', gap: 3, marginBottom: 5 }}>{[0, 1].map((k) => <span key={k} style={{ width: 22, height: 6, borderRadius: 2, border: `1px solid ${c}66` }} />)}</div>
        <div style={{ height: 10, width: '85%', borderRadius: 3, background: '#fff', marginBottom: 4 }} />
        <div style={{ height: 5, width: 22, borderRadius: 2, background: c, marginBottom: 5 }} />
        <div style={{ height: 4, width: '100%', borderRadius: 2, background: 'rgba(255,255,255,0.3)', marginBottom: 3 }} />
        <div style={{ height: 4, width: '70%', borderRadius: 2, background: 'rgba(255,255,255,0.3)' }} />
      </div>
    </div>
  );
}

export default function AppearanceSheet({ onClose, accent }) {
  const theme = useTheme();
  const film = theme.mode !== 'fixed';
  const color = theme.color || '#818CF8';
  const live = film ? (accent || '#818CF8') : color;
  const [saved, setSaved] = useState('');
  const pick = (t) => { setTheme(t); if (navigator.vibrate) navigator.vibrate(8); setSaved('Saved — it’ll match on the app too'); };
  useEffect(() => { if (!saved) return undefined; const t = setTimeout(() => setSaved(''), 2200); return () => clearTimeout(t); }, [saved]);
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);

  const modeCard = (on, title, sub, onClick, swatch) => (
    <button type="button" onClick={onClick} aria-pressed={on} style={{ flex: 1, minWidth: 0, textAlign: 'left', padding: '14px 14px 13px', borderRadius: 18, cursor: 'pointer', fontFamily: 'inherit', color: '#fff', background: on ? `${live}22` : 'rgba(255,255,255,0.04)', border: `1.5px solid ${on ? live : 'rgba(255,255,255,0.12)'}`, transition: 'all .25s ease' }}>
      <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>{swatch}</div>
      <div style={{ fontSize: 14.5, fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', marginTop: 3, lineHeight: 1.4 }}>{sub}</div>
    </button>
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'apIn .2s ease' }}>
      <style>{'@keyframes apIn{from{opacity:0}to{opacity:1}}@keyframes apUp{from{transform:translateY(100%)}to{transform:none}}@keyframes apPop{0%{transform:scale(.7)}60%{transform:scale(1.15)}100%{transform:scale(1)}}'}</style>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Appearance" style={{ width: '100%', maxWidth: 560, maxHeight: '92dvh', overflowY: 'auto', background: ambient(live), borderRadius: '22px 22px 0 0', borderTop: `1px solid ${T.hairline}`, padding: '10px 20px calc(24px + env(safe-area-inset-bottom))', color: '#fff', animation: 'apUp .32s cubic-bezier(0.22,1,0.36,1)', transition: 'background .5s ease' }}>
        <div style={{ width: 34, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={eyebrow(live)}>Appearance</div>
            <div style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08, marginTop: 6 }}>Make it yours</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.62)', marginTop: 8, lineHeight: 1.5 }}>Pick the colour Thiscene wears — the gradient, header, action bar, chats and buttons all follow it.</div>
            {saved && <div style={{ fontSize: 12, color: '#7BFF9E', marginTop: 10, fontWeight: 600 }}>{saved}</div>}
          </div>
          <Preview color={color} film={film} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          {modeCard(film, 'Follow each film', 'Colours change with every card', () => pick({ mode: 'film', color }), DOTS.slice(0, 5).map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />))}
          {modeCard(!film, 'My colour', 'One colour, everywhere', () => pick({ mode: 'fixed', color }), <span style={{ width: 12, height: 12, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}` }} />)}
        </div>

        <div style={{ ...eyebrow('rgba(255,255,255,0.5)'), marginTop: 24, marginBottom: 12 }}>{film ? 'Or pick your colour' : 'Your colour'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {PALETTE.map(([name, hex]) => {
            const on = !film && color.toUpperCase() === hex.toUpperCase();
            return (
              <button key={hex} type="button" onClick={() => pick({ mode: 'fixed', color: hex })} aria-label={name} aria-pressed={on} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ position: 'relative', width: '100%', aspectRatio: '1', maxWidth: 64, borderRadius: 18, background: ambient(hex), border: `2px solid ${on ? '#fff' : `${hex}55`}`, boxShadow: on ? `0 0 0 3px ${hex}55, 0 8px 24px ${hex}44` : 'none', transition: 'all .2s ease', overflow: 'hidden' }}>
                  <span style={{ position: 'absolute', inset: 0, background: `radial-gradient(70% 70% at 30% 25%, ${hex}aa, transparent 70%)` }} />
                  {on && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'apPop .3s ease' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg></span>}
                </span>
                <span style={{ fontSize: 11, fontWeight: on ? 800 : 600, color: on ? '#fff' : 'rgba(255,255,255,0.6)' }}>{name}</span>
              </button>
            );
          })}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20, padding: '12px 14px', borderRadius: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer' }}>
          <span style={{ position: 'relative', width: 34, height: 34, borderRadius: 12, overflow: 'hidden', background: 'conic-gradient(#FF6B8A, #F5A623, #A3E635, #2DD4BF, #38BDF8, #818CF8, #B07FEF, #FF6B8A)', flexShrink: 0 }}>
            <input type="color" value={color.toLowerCase()} onChange={(e) => pick({ mode: 'fixed', color: e.target.value })} aria-label="Choose any colour" style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>Any colour</span>
            <span style={{ display: 'block', fontSize: 11.5, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>Pick exactly the shade you like</span>
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums' }}>{film ? '' : color}</span>
        </label>

        <button type="button" onClick={onClose} style={{ display: 'flex', margin: '22px auto 0', height: 46, padding: '0 26px', alignItems: 'center', borderRadius: 23, background: `${live}2e`, border: `1px solid ${live}99`, color: '#fff', fontWeight: 700, fontSize: 14.5, fontFamily: 'inherit', cursor: 'pointer' }}>Done</button>
      </div>
    </div>
  );
}
