'use client';
import { useCallback, useEffect, useRef, useState, Fragment } from 'react';
import { T, ambient, SvgIcon, track } from './shared';

// ── Watch party room ──
// Each person plays the film in their own streaming app; the room keeps a shared clock, a synced 3-2-1,
// pauses with a reason, quick requests, live reactions and a chat drawer. State lives on the server
// (so reloads/rejoins resync) and realtime broadcasts just say "something changed".

const glass = { background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.14)' };
const eyebrow = (c) => ({ fontSize: 10.5, letterSpacing: 2.2, textTransform: 'uppercase', fontWeight: 700, color: c });
const REASONS = [['water', '💧', 'Water'], ['snacks', '🍿', 'Snacks'], ['bathroom', '🚻', 'Bathroom'], ['call', '📞', 'A call'], ['other', '⚡', 'Something came up']];
const REASON_TEXT = { water: '💧 getting water', snacks: '🍿 grabbing snacks', bathroom: '🚻 bathroom break', call: '📞 taking a call', other: '⚡ something came up' };
const REQUESTS = [['back', '⏪', 'Go back 10s'], ['what', '🤔', 'Wait, what happened?'], ['louder', '🔊', 'Turn it up'], ['subs', '💬', 'Subtitles on?']];
const EMOJI = ['😂', '😱', '😭', '🔥', '❤️', '👀'];

const fmt = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};
const first = (u) => (u?.display_name || u?.username || 'Friend').split(' ')[0];

function Face({ u, size = 40, ring = '#0B0B12', online }) {
  const letter = first(u)[0]?.toUpperCase();
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.12)', boxShadow: `0 0 0 3px ${ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 800, color: '#fff' }}>
        {u?.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : letter}
      </div>
      {online !== undefined && <span style={{ position: 'absolute', right: -1, bottom: -1, width: size * 0.28, height: size * 0.28, borderRadius: '50%', background: online ? '#3DDC84' : 'rgba(255,255,255,0.35)', boxShadow: '0 0 0 2.5px #0B0B12' }} />}
    </div>
  );
}

export function PartyRoom({ partyId, accent: accentIn = '#F5A623', onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [intro, setIntro] = useState(true);
  const [sheet, setSheet] = useState(null); // pause | requests | chat | more
  const [toasts, setToasts] = useState([]);
  const [bursts, setBursts] = useState([]);
  const [online, setOnline] = useState({});
  const [providers, setProviders] = useState(null);
  const [chat, setChat] = useState([]);
  const [chatText, setChatText] = useState('');
  const [unread, setUnread] = useState(0);
  const [, setTick] = useState(0);
  const skewRef = useRef(0);
  const chanRef = useRef(null);
  const subscribedRef = useRef(false);
  const busyRef = useRef(false);
  const dataRef = useRef(null); dataRef.current = data;

  const accent = data?.party?.movie?.accent || accentIn;
  const party = data?.party;
  const me = data?.me;
  const peer = data?.peer;
  const self = data?.self;
  const movie = party?.movie || {};

  const apply = useCallback((d) => { if (d && d.party) { skewRef.current = (d.serverNow || Date.now()) - Date.now(); setData(d); } }, []);
  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`/api/party?id=${encodeURIComponent(partyId)}`, { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || 'Could not open the watch party'); return; }
      apply(d);
    } catch { /* keep last state */ }
  }, [partyId, apply]);

  const broadcast = (event, payload = {}) => { try { chanRef.current?.send({ type: 'broadcast', event, payload: { ...payload, from: me } }); } catch {} };
  const act = async (action, extra = {}) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const r = await fetch('/api/party', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, id: partyId, ...extra }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { apply(d); broadcast('sync'); } else setErr(d.error || 'Something went wrong');
    } finally { busyRef.current = false; }
  };

  const toast = (t) => { const id = Date.now() + Math.random(); setToasts((x) => [...x.slice(-2), { id, ...t }]); setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), t.ms || 4200); };
  const burst = (e) => {
    const id = Date.now() + Math.random();
    const parts = Array.from({ length: 12 }, () => ({ dx: (Math.random() - 0.5) * 220, rise: 260 + Math.random() * 260, delay: Math.random() * 0.3, size: 20 + Math.random() * 22, rot: (Math.random() - 0.5) * 60, dur: 1.2 + Math.random() * 0.6 }));
    setBursts((b) => [...b.slice(-3), { id, e, parts }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 2300);
  };

  // load + auto-join as guest
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { if (party && me && party.guest_id === me && party.status === 'invited') act('join'); }, [party?.status, me]); // eslint-disable-line react-hooks/exhaustive-deps
  const [introMin, setIntroMin] = useState(false);
  const [introFade, setIntroFade] = useState(false);
  useEffect(() => { const t = setTimeout(() => setIntroMin(true), 4300); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (!intro || !introMin || !data) return;
    setIntroFade(true);
    const t = setTimeout(() => setIntro(false), 650);
    return () => clearTimeout(t);
  }, [intro, introMin, data]);
  useEffect(() => { track('party_open'); const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev; }; }, []);
  // clock tick
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 250); return () => clearInterval(t); }, []);
  // fallback polling (fast when realtime isn't connected)
  useEffect(() => { const t = setInterval(() => { if (!subscribedRef.current || Date.now() % 20000 < 4000) refresh(); }, 4000); return () => clearInterval(t); }, [refresh]);
  // where to watch
  useEffect(() => {
    if (!movie.id || providers) return;
    fetch(`/api/providers?id=${movie.id}&type=${movie.is_tv ? 'tv' : 'movie'}`).then((r) => r.json()).then((d) => setProviders(d.providers || [])).catch(() => setProviders([]));
  }, [movie.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // realtime: broadcast events + presence on a server-issued secret channel
  useEffect(() => {
    if (!data?.channel || !me) return;
    let client = null, ch = null, dead = false;
    (async () => {
      try {
        const { getRealtime } = await import('@/lib/realtime');
        client = getRealtime(); if (!client || dead) return;
        ch = client.channel(data.channel, { config: { broadcast: { self: false }, presence: { key: me } } });
        ch.on('broadcast', { event: 'sync' }, () => refresh());
        ch.on('broadcast', { event: 'react' }, ({ payload }) => payload?.emoji && burst(payload.emoji));
        ch.on('broadcast', { event: 'request' }, ({ payload }) => payload?.text && toast({ who: dataRef.current?.peer, text: payload.text, ack: !payload.ack }));
        ch.on('broadcast', { event: 'chat' }, () => { setUnread((n) => n + 1); loadChat(); });
        ch.on('presence', { event: 'sync' }, () => { const st = ch.presenceState(); const o = {}; Object.keys(st).forEach((k) => { o[k] = true; }); setOnline(o); });
        ch.subscribe(async (status) => { subscribedRef.current = status === 'SUBSCRIBED'; if (status === 'SUBSCRIBED') { try { await ch.track({ at: Date.now() }); } catch {} } });
        chanRef.current = ch;
      } catch {}
    })();
    return () => { dead = true; subscribedRef.current = false; try { ch && client && client.removeChannel(ch); } catch {} chanRef.current = null; };
  }, [data?.channel, me]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadChat = useCallback(async () => {
    const pid = dataRef.current?.peer?.user_id; if (!pid) return;
    try { const r = await fetch(`/api/messages?with=${encodeURIComponent(pid)}`, { cache: 'no-store' }); const d = await r.json(); setChat((d.messages || []).filter((m) => !m.msg_type || m.msg_type === 'text' || m.msg_type === 'sticker').slice(-40)); } catch {}
  }, []);
  useEffect(() => { if (sheet === 'chat') { setUnread(0); loadChat(); } }, [sheet, loadChat]);
  const sendChat = async () => {
    const t = chatText.trim(); if (!t || !peer) return;
    setChatText('');
    setChat((c) => [...c, { id: 'tmp' + Date.now(), text: t, from_user_id: me, mine: true }]);
    await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toUserId: peer.user_id, text: t }) }).catch(() => {});
    broadcast('chat');
  };

  // ── derived clock ──
  const now = Date.now() + skewRef.current;
  const startAt = party?.clock_started_at ? Date.parse(party.clock_started_at) : null;
  const playing = party?.status === 'playing';
  const counting = playing && startAt && now < startAt;
  const clockMs = !party ? 0 : playing && startAt ? Number(party.clock_offset_ms || 0) + Math.max(0, now - startAt) : Number(party.clock_offset_ms || 0);
  const runtimeMs = movie.runtime_min ? movie.runtime_min * 60000 : null;
  const pct = runtimeMs ? Math.min(1, clockMs / runtimeMs) : 0;
  const nearEnd = runtimeMs && clockMs > runtimeMs - 60000;
  const countN = counting ? Math.ceil((startAt - now) / 1000) : 0;
  const justStarted = playing && startAt && now >= startAt && now - startAt < 1400;
  const ready = party?.ready || {};
  const iReady = !!ready[me];
  const peerReady = peer && !!ready[peer.user_id];
  const peerOnline = peer && !!online[peer.user_id];
  const pausedByMe = party?.paused_by === me;

  const react = (e) => { burst(e); broadcast('react', { emoji: e }); track('party_react'); };
  const request = (k, label) => {
    setSheet(null);
    if (k === 'back') act('seek', { deltaMs: -10000 });
    broadcast('request', { text: k === 'back' ? '⏪ went back 10 seconds — rewind your player too' : label });
    toast({ who: self, text: k === 'back' ? 'You went back 10s — rewind your player' : `Sent: ${label}`, ms: 2200 });
  };

  if (err && !data) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 460, background: ambient(accent), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, color: '#fff', textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{err}</div>
        <button onClick={onClose} style={{ ...glass, height: 44, borderRadius: 22, padding: '0 22px', color: '#fff', fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' }}>Close</button>
      </div>
    );
  }

  const bigBtn = { ...glass, height: 52, borderRadius: 26, padding: '0 24px', color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 };
  const pill = { ...glass, height: 40, borderRadius: 20, padding: '0 15px', color: '#fff', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, flexShrink: 0 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 460, background: ambient(accent), color: '#fff', overflow: 'hidden', fontFamily: 'inherit' }}>
      <style>{`
        @keyframes pIn{from{opacity:0}to{opacity:1}}
        @keyframes pL{0%{transform:translateX(-140px) scale(.8);opacity:0}60%{transform:translateX(12px) scale(1.05);opacity:1}100%{transform:translateX(0) scale(1)}}
        @keyframes pR{0%{transform:translateX(140px) scale(.8);opacity:0}60%{transform:translateX(-12px) scale(1.05);opacity:1}100%{transform:translateX(0) scale(1)}}
        @keyframes pUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pOut{to{opacity:0;visibility:hidden}}
        @keyframes pCount{0%{transform:scale(1.6);opacity:0}25%{transform:scale(1);opacity:1}85%{opacity:1}100%{transform:scale(.8);opacity:0}}
        @keyframes pPulse{0%,100%{opacity:.45}50%{opacity:1}}
        @keyframes pFloat{0%{transform:translate(-50%,0) scale(.3);opacity:0}12%{opacity:1;transform:translate(calc(-50% + var(--dx)*.15),-30px) scale(1.15) rotate(var(--rot))}100%{transform:translate(calc(-50% + var(--dx)),calc(var(--rise)*-1)) scale(.85);opacity:0}}
        @keyframes pSheet{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes pToast{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes iL{0%{transform:translateX(-170px) scale(.7);opacity:0}70%{transform:translateX(10px) scale(1.04);opacity:1}100%{transform:translateX(0) scale(1)}}
        @keyframes iR{0%{transform:translateX(170px) scale(.7);opacity:0}70%{transform:translateX(-10px) scale(1.04);opacity:1}100%{transform:translateX(0) scale(1)}}
        @keyframes iRing{0%{transform:scale(.6);opacity:0}8%{opacity:.9}100%{transform:scale(2.6);opacity:0}}
        @keyframes iGlow{0%{transform:scale(.3);opacity:0}40%{transform:scale(1.1);opacity:1}100%{transform:scale(1);opacity:.65}}
        @keyframes iPop{0%{transform:translateX(-50%) scale(0);opacity:0}100%{transform:translateX(-50%) scale(1);opacity:1}}
        @keyframes iUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes iFill{from{width:0}to{width:100%}}
      `}</style>

      {/* backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: ambient(accent) }} />
      {(movie.backdrop || movie.poster) && <img src={movie.backdrop || movie.poster} alt="" style={{ position: 'absolute', inset: -40, width: 'calc(100% + 80px)', height: 'calc(100% + 80px)', objectFit: 'cover', filter: 'blur(34px) saturate(1.1)', opacity: 0.16, mixBlendMode: 'screen' }} />}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(6,6,11,0) 40%, rgba(6,6,11,0.55) 100%)' }} />

      {/* room */}
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', maxWidth: 560, margin: '0 auto', padding: 'max(14px, env(safe-area-inset-top)) 18px calc(16px + env(safe-area-inset-bottom))', boxSizing: 'border-box', animation: 'pIn .4s ease' }}>
        {/* top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onClose} aria-label="Leave room" style={{ ...glass, width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><SvgIcon name="close" size={15} color="#fff" /></button>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
            <div style={eyebrow(accent)}>Watch party</div>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{movie.title || ' '}</div>
          </div>
          <button onClick={() => setSheet('chat')} aria-label="Chat" style={{ ...glass, position: 'relative', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
            <SvgIcon name="chat" size={16} color="#fff" />
            {unread > 0 && <span style={{ position: 'absolute', top: -2, right: -2, minWidth: 17, height: 17, borderRadius: 9, background: accent, color: '#07070F', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', boxSizing: 'border-box' }}>{unread}</span>}
          </button>
        </div>

        {/* people */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 18 }}>
          {[[self, true, iReady], [peer, peerOnline, peerReady]].map(([u, on, rd], i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 70 }}>
              <Face u={u} size={46} online={!!on} ring={rd && (party?.status === 'lobby' || party?.status === 'invited') ? accent : '#0B0B12'} />
              <div style={{ fontSize: 12, fontWeight: 700 }}>{i === 0 ? 'You' : first(u)}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)' }}>{(party?.status === 'lobby' || party?.status === 'invited') ? (rd ? 'Ready ✓' : (i === 1 && !on ? 'Not here yet' : 'Getting ready')) : (on ? 'Here' : 'Away')}</div>
            </div>
          ))}
        </div>

        {/* film + clock */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {movie.poster && <div style={{ width: 'min(36vw, 150px)', aspectRatio: '2/3', borderRadius: 6, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}><img src={movie.poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></div>}
          <div style={{ fontFamily: T.serif, fontSize: 'clamp(40px, 13vw, 58px)', fontWeight: 800, letterSpacing: '-0.03em', marginTop: 18, fontVariantNumeric: 'tabular-nums', lineHeight: 1, opacity: party?.status === 'paused' ? 0.6 : 1 }}>{fmt(clockMs)}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 6 }}>{runtimeMs ? `of ${fmt(runtimeMs)}` : 'shared clock'}</div>
          <div style={{ position: 'relative', width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.14)', marginTop: 22 }}>
            <div style={{ height: '100%', width: `${pct * 100}%`, borderRadius: 2, background: '#fff', transition: 'width .25s linear' }} />
            <div style={{ position: 'absolute', top: '50%', left: `${pct * 100}%`, transform: 'translate(-50%,-50%)', display: 'flex' }}>
              <Face u={self} size={22} /><div style={{ marginLeft: -8 }}><Face u={peer} size={22} ring={accent} /></div>
            </div>
          </div>
        </div>

        {/* state-specific controls */}
        <div style={{ paddingTop: 18 }}>
          {party && (party.status === 'invited' || party.status === 'lobby') && (
            <div style={{ animation: 'pUp .3s ease' }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 1.5 }}>
                {party.status === 'invited' && party.host_id === me ? <span style={{ animation: 'pPulse 1.6s ease infinite' }}>Waiting for {first(peer)} to join…</span> : <>Open <b>{movie.title}</b>{providers?.length ? <> on <b>{providers.slice(0, 2).map((p) => p.provider_name).join(' or ')}</b></> : ''} and have it ready at 0:00.</>}
              </div>
              <button onClick={() => act('ready', { ready: !iReady })} style={{ ...bigBtn, width: '100%', marginTop: 14, background: iReady ? `${accent}26` : glass.background, borderColor: iReady ? accent : 'rgba(255,255,255,0.14)' }}>
                {iReady ? <><SvgIcon name="check" size={16} color="#fff" />Ready — waiting for {first(peer)}</> : "I'm ready"}
              </button>
            </div>
          )}

          {playing && !counting && (
            <div style={{ animation: 'pUp .3s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                {EMOJI.map((e) => <button key={e} onClick={() => react(e)} style={{ ...glass, width: 44, height: 44, borderRadius: '50%', fontSize: 21, cursor: 'pointer', padding: 0, lineHeight: 1 }}>{e}</button>)}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button onClick={() => setSheet('pause')} style={{ ...bigBtn, flex: 1.4 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>Pause for a sec</button>
                <button onClick={() => setSheet('requests')} style={{ ...bigBtn, flex: 1, padding: '0 14px' }}>Ask {first(peer)}</button>
              </div>
              {nearEnd && <button onClick={() => act('end')} style={{ ...bigBtn, width: '100%', marginTop: 10, background: `${accent}26`, borderColor: accent }}>🎉 We finished it</button>}
            </div>
          )}

          {party?.status === 'paused' && (
            <div style={{ animation: 'pUp .3s ease', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{pausedByMe ? 'You paused' : `${first(peer)} paused`} — {REASON_TEXT[party.pause_reason] || 'be right back'}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Paused at {fmt(clockMs)} · pause your player too</div>
              <button onClick={() => act('resume')} style={{ ...bigBtn, width: '100%', marginTop: 14 }}>▶ Resume together</button>
            </div>
          )}

          {party?.status === 'ended' && (
            <div style={{ animation: 'pUp .3s ease', textAlign: 'center' }}>
              <div style={{ fontSize: 40 }}>🎉</div>
              <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 800, marginTop: 4 }}>You finished it together</div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>Marked as watched for both of you.</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={() => { window.dispatchEvent(new CustomEvent('cine:open-title', { detail: { id: movie.id, title: movie.title, poster: movie.poster, backdrop: movie.backdrop, year: movie.year, rating: movie.rating, isTV: !!movie.is_tv, mediaType: movie.is_tv ? 'tv' : 'movie', initialTab: 'comments' } })); onClose(); }} style={{ ...bigBtn, flex: 1 }}>⭐ Rate it</button>
                <button onClick={onClose} style={{ ...bigBtn, flex: 1, color: 'rgba(255,255,255,0.75)' }}>Close</button>
              </div>
            </div>
          )}

          {party?.status === 'declined' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{first(peer)} can’t make it right now</div>
              <button onClick={onClose} style={{ ...bigBtn, width: '100%', marginTop: 14 }}>Close</button>
            </div>
          )}

          {playing && !counting && <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}><button onClick={() => setSheet('more')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>More</button></div>}
        </div>
      </div>

      {/* countdown */}
      {(counting || justStarted) && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,6,11,0.55)', backdropFilter: 'blur(6px)', pointerEvents: 'none' }}>
          {counting ? <div key={countN} style={{ fontFamily: T.serif, fontSize: 140, fontWeight: 800, lineHeight: 1, animation: 'pCount 1s ease forwards' }}>{countN}</div>
            : <div style={{ fontFamily: T.serif, fontSize: 40, fontWeight: 800, animation: 'pCount 1.3s ease forwards' }}>▶ Press play now</div>}
          {counting && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 10 }}>Get your finger on play…</div>}
        </div>
      )}

      {/* toasts (requests from your friend) */}
      <div style={{ position: 'absolute', top: 'calc(70px + env(safe-area-inset-top))', left: 0, right: 0, zIndex: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none', padding: '0 16px' }}>
        {toasts.map((t) => (
          <div key={t.id} style={{ ...glass, background: 'rgba(10,10,16,0.8)', pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 16, maxWidth: 420, width: '100%', animation: 'pToast .25s ease' }}>
            <Face u={t.who} size={28} />
            <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{t.who === self ? t.text : <><b>{first(t.who)}:</b> {t.text}</>}</div>
            {t.ack && <button onClick={() => { broadcast('request', { text: '👍 got it', ack: true }); setToasts((x) => x.filter((y) => y.id !== t.id)); }} style={{ ...pill, height: 32, padding: '0 12px' }}>👍</button>}
          </div>
        ))}
      </div>

      {/* reaction bursts */}
      {bursts.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 7, pointerEvents: 'none', overflow: 'hidden' }}>
          {bursts.map((b) => (
            <Fragment key={b.id}>
              {b.parts.map((pt, i) => (
                <span key={i} style={{ position: 'absolute', left: '50%', bottom: '18%', fontSize: pt.size, lineHeight: 1, opacity: 0, '--dx': `${pt.dx}px`, '--rise': `${pt.rise}px`, '--rot': `${pt.rot}deg`, animation: `pFloat ${pt.dur}s cubic-bezier(.2,.7,.3,1) ${pt.delay}s forwards` }}>{b.e}</span>
              ))}
            </Fragment>
          ))}
        </div>
      )}

      {/* sheets */}
      {sheet && (
        <div onClick={() => setSheet(null)} style={{ position: 'absolute', inset: 0, zIndex: 8, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, maxHeight: '75%', display: 'flex', flexDirection: 'column', background: ambient(accent), borderRadius: '22px 22px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '10px 18px calc(18px + env(safe-area-inset-bottom))', animation: 'pSheet .28s cubic-bezier(0.22,1,0.36,1)', boxSizing: 'border-box' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.3)', margin: '0 auto 14px' }} />
            {sheet === 'pause' && (
              <>
                <div style={eyebrow(accent)}>Pause for both of you</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
                  {REASONS.map(([k, e, l], i) => (
                    <button key={k} onClick={() => { setSheet(null); act('pause', { reason: k }); }} style={{ ...glass, gridColumn: i === REASONS.length - 1 ? '1 / -1' : 'auto', height: 58, borderRadius: 14, color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}><span style={{ fontSize: 20 }}>{e}</span>{l}</button>
                  ))}
                </div>
              </>
            )}
            {sheet === 'requests' && (
              <>
                <div style={eyebrow(accent)}>Ask {first(peer)}</div>
                <div style={{ marginTop: 8 }}>
                  {REQUESTS.map(([k, e, l]) => (
                    <button key={k} onClick={() => request(k, `${e} ${l}`)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', borderTop: `1px solid ${T.hairline}`, padding: '15px 2px', color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}><span style={{ fontSize: 20 }}>{e}</span>{l}</button>
                  ))}
                </div>
              </>
            )}
            {sheet === 'more' && (
              <>
                <div style={eyebrow(accent)}>Party</div>
                <div style={{ marginTop: 8 }}>
                  {[['🔄', 'Resync my clock', () => { setSheet(null); refresh(); }], ['⏩', 'Jump ahead 10s (both)', () => { setSheet(null); act('seek', { deltaMs: 10000 }); broadcast('request', { text: '⏩ jumped ahead 10 seconds — skip ahead too' }); }], ['🎉', 'We finished it', () => { setSheet(null); act('end'); }]].map(([e, l, fn]) => (
                    <button key={l} onClick={fn} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', borderTop: `1px solid ${T.hairline}`, padding: '15px 2px', color: '#fff', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}><span style={{ fontSize: 20 }}>{e}</span>{l}</button>
                  ))}
                </div>
              </>
            )}
            {sheet === 'chat' && (
              <>
                <div style={eyebrow(accent)}>Chat with {first(peer)}</div>
                <div style={{ flex: 1, minHeight: 160, overflowY: 'auto', marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {chat.length === 0 && <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', padding: '20px 0', textAlign: 'center' }}>Say something about the film…</div>}
                  {chat.map((m) => {
                    const mine = m.mine ?? m.from_user_id === me;
                    return <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '78%', background: mine ? accent : 'rgba(255,255,255,0.1)', color: mine ? '#07070F' : '#fff', borderRadius: 16, padding: '8px 12px', fontSize: 13.5, lineHeight: 1.4 }}>{m.text}</div>;
                  })}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <input value={chatText} onChange={(e) => setChatText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChat()} placeholder="Message…" style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 22, padding: '11px 16px', color: '#fff', fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
                  <button onClick={sendChat} aria-label="Send" style={{ ...glass, width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}><SvgIcon name="send" size={15} color="#fff" /></button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* intro: both faces glide together, meet with a pulse, the room "builds", then fades into the room */}
      {intro && (
        <div onClick={() => { if (data) { setIntroFade(true); setTimeout(() => setIntro(false), 400); } }} style={{ position: 'absolute', inset: 0, zIndex: 9, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: ambient(accent), transition: 'opacity .6s ease, transform .6s ease', opacity: introFade ? 0 : 1, transform: introFade ? 'scale(1.04)' : 'scale(1)', pointerEvents: introFade ? 'none' : 'auto' }}>
          {(movie.backdrop || movie.poster) && <img src={movie.backdrop || movie.poster} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(30px)', opacity: 0.18, mixBlendMode: 'screen', animation: 'pIn 1.2s ease' }} />}
          {/* soft glow that blooms when the faces meet */}
          <div style={{ position: 'absolute', width: 360, height: 360, borderRadius: '50%', background: `radial-gradient(circle, ${accent}55, transparent 65%)`, animation: 'iGlow 2.4s ease 1.1s both' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div style={{ animation: 'iL 1.25s cubic-bezier(.16,.84,.24,1) .15s both' }}><Face u={self} size={104} /></div>
            <div style={{ marginLeft: -24, animation: 'iR 1.25s cubic-bezier(.16,.84,.24,1) .15s both' }}><Face u={peer} size={104} ring={accent} /></div>
            {/* pulse rings from the meeting point */}
            <span style={{ position: 'absolute', left: '50%', top: '50%', width: 120, height: 120, marginLeft: -60, marginTop: -60, borderRadius: '50%', border: `2px solid ${accent}`, animation: 'iRing 1.6s ease-out 1.25s both' }} />
            <span style={{ position: 'absolute', left: '50%', top: '50%', width: 120, height: 120, marginLeft: -60, marginTop: -60, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.6)', animation: 'iRing 1.6s ease-out 1.55s both' }} />
            <span style={{ position: 'absolute', left: '50%', top: -18, transform: 'translateX(-50%)', fontSize: 26, animation: 'iPop .6s cubic-bezier(.3,1.6,.5,1) 1.35s both' }}>🍿</span>
          </div>
          <div style={{ position: 'relative', ...eyebrow(accent), marginTop: 34, animation: 'iUp .7s ease 1.6s both' }}>Watch party</div>
          <div style={{ position: 'relative', fontFamily: T.serif, fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 8, animation: 'iUp .7s ease 1.85s both' }}>{peer ? `You & ${first(peer)}` : 'Your watch party'}</div>
          {movie.title && <div style={{ position: 'relative', fontSize: 15, color: 'rgba(255,255,255,0.75)', marginTop: 6, animation: 'iUp .7s ease 2.1s both' }}>{movie.title}</div>}
          <div style={{ position: 'relative', width: 180, marginTop: 30, animation: 'iUp .6s ease 2.4s both' }}>
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 2, background: '#fff', animation: 'iFill 1.8s cubic-bezier(.4,0,.2,1) 2.5s both' }} />
            </div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 10 }}>{introMin && !data ? 'Almost there…' : 'Setting up your room…'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
