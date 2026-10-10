'use client';
import { useEffect, useState } from 'react';
import { T, ambient, track, fmtWhen, untilLabel } from './shared';

// Full-screen incoming watch-party invite — styled like an incoming call so it can't be missed.
const first = (u) => { const n = String(u?.display_name || u?.username || 'A friend').trim(); const w = n.split(/\s+/)[0]; return w.length <= 3 && n.length > w.length ? (n.length > 16 ? n.slice(0, 15) + '…' : n) : w; };
const glass = { background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.16)' };

export function PartyInvite({ invite, accent = '#F5A623', onJoin, onLater, onDecline }) {
  const [leaving, setLeaving] = useState(false);
  const m = invite.movie || {};
  const host = invite.host || {};
  useEffect(() => { track('party_invite_seen'); try { navigator.vibrate?.([120, 80, 120]); } catch {} }, []);
  const go = (fn) => { setLeaving(true); setTimeout(fn, 220); };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 470, background: ambient(accent), color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: 'max(48px, env(safe-area-inset-top)) 24px calc(34px + env(safe-area-inset-bottom))', animation: 'ivIn .35s ease', opacity: leaving ? 0 : 1, transition: 'opacity .2s ease' }}>
      <style>{`@keyframes ivIn{from{opacity:0;transform:scale(1.03)}to{opacity:1;transform:scale(1)}}@keyframes ivRing{0%{transform:scale(.8);opacity:.8}100%{transform:scale(2.2);opacity:0}}@keyframes ivBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 10.5, letterSpacing: 2.2, textTransform: 'uppercase', fontWeight: 700, color: accent }}>Watch party invite</div>
        <div style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 10, lineHeight: 1.2 }}>{first(host)} wants to watch<br />with you</div>
        {invite.scheduled_for && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, ...glass, borderRadius: 16, padding: '7px 14px', fontSize: 13, fontWeight: 700 }}>🗓 {fmtWhen(invite.scheduled_for)} · {untilLabel(invite.scheduled_for)}</div>}
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {[0, 0.6, 1.2].map((d) => <span key={d} style={{ position: 'absolute', width: 170, height: 170, borderRadius: 24, border: `2px solid ${accent}`, animation: `ivRing 1.8s ease-out ${d}s infinite` }} />)}
        <div style={{ position: 'relative', width: 150, aspectRatio: '2/3', borderRadius: 8, overflow: 'hidden', boxShadow: '0 24px 70px rgba(0,0,0,0.6)', animation: 'ivBob 3s ease-in-out infinite', background: 'rgba(255,255,255,0.06)' }}>
          {m.poster && <img src={m.poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
        </div>
        <div style={{ position: 'absolute', bottom: -18, right: -18, width: 54, height: 54, borderRadius: '50%', overflow: 'hidden', boxShadow: `0 0 0 3px ${accent}`, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
          {host.avatar_url ? <img src={host.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : first(host)[0]}
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 800 }}>{m.title}</div>
        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>{[m.year, m.is_tv ? 'Series' : null, m.runtime_min ? `${m.runtime_min} min` : null].filter(Boolean).join(' · ')}</div>
        <div style={{ display: 'flex', gap: 12, marginTop: 26 }}>
          <button onClick={() => go(onLater)} style={{ ...glass, flex: 1, height: 54, borderRadius: 27, color: 'rgba(255,255,255,0.85)', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Not now</button>
          <button onClick={() => go(onJoin)} style={{ ...glass, flex: 1.4, height: 54, borderRadius: 27, background: `${accent}33`, borderColor: accent, color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>{invite.scheduled_for && Date.parse(invite.scheduled_for) - Date.now() > 10 * 60000 ? '🍿 I’m in' : '🍿 Join'}</button>
        </div>
        <button onClick={() => go(onDecline)} style={{ marginTop: 16, background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Can’t make it — let {first(host)} know</button>
      </div>
    </div>
  );
}
