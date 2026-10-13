'use client';
import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from 'react';
import { T, ambient, SvgIcon, track, fmtWhen, untilLabel } from './shared';
import { RecapPanel } from './Recap';
import { useVoiceRecorder, RecorderBar, VoiceBubble } from './Voice';

// ── Watch party room ──
// One screen, one conversation. A compact stage keeps the shared clock; everything that happens —
// chat, reactions, pauses, rewinds, "what just happened?" — flows through a single live feed, each
// moment stamped with the film time. Each person plays the film in their own streaming app.
// State lives on the server (reloads/rejoins resync); realtime broadcasts carry the new moments instantly.

const glass = { background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.14)' };
const eyebrow = (c) => ({ fontSize: 10.5, letterSpacing: 2.2, textTransform: 'uppercase', fontWeight: 700, color: c });
const REASONS = [['water', '💧', 'Water'], ['snacks', '🍿', 'Snacks'], ['bathroom', '🚻', 'Bathroom'], ['call', '📞', 'A call'], ['other', '⚡', 'Something came up']];
const REASON_TEXT = { water: '💧 getting water', snacks: '🍿 grabbing snacks', bathroom: '🚻 bathroom break', call: '📞 taking a call', other: '⚡ something came up' };
const ASKS = [['what', '🤔', 'What happened?'], ['louder', '🔊', 'Louder'], ['subs', '💬', 'Subtitles?']];
const EMOJI = ['😂', '😱', '😭', '🔥', '❤️', '👀'];

const fmt = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};
const first = (u) => { const n = String(u?.display_name || u?.username || 'Friend').trim(); const w = n.split(/\s+/)[0]; return w.length <= 3 && n.length > w.length ? (n.length > 16 ? n.slice(0, 15) + '…' : n) : w; };

function Face({ u, size = 40, ring = '#0B0B12', dot }) {
  const letter = first(u)[0]?.toUpperCase();
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.12)', boxShadow: `0 0 0 2.5px ${ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 800, color: '#fff' }}>
        {u?.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : letter}
      </div>
      {dot && <span style={{ position: 'absolute', right: -1, bottom: -1, width: Math.max(9, size * 0.28), height: Math.max(9, size * 0.28), borderRadius: '50%', background: dot, boxShadow: '0 0 0 2px #0B0B12' }} />}
    </div>
  );
}

const MoonIcon = ({ on }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={on ? '#fff' : 'none'} stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
);

export function PartyRoom({ partyId, accent: accentIn = '#F5A623', onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [intro, setIntro] = useState(true);
  const [events, setEvents] = useState([]);
  const [bursts, setBursts] = useState([]);
  const [presence, setPresence] = useState({}); // userId → { away }
  const [providers, setProviders] = useState(null);
  const [text, setText] = useState('');
  const [tray, setTray] = useState('main'); // main | pause
  const [menu, setMenu] = useState(false);
  const [dim, setDim] = useState(false);
  const [compact, setCompact] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [newBelow, setNewBelow] = useState(0);
  const [, setTick] = useState(0);
  const skewRef = useRef(0);
  const chanRef = useRef(null);
  const subscribedRef = useRef(false);
  const busyRef = useRef(false);
  const lastIdRef = useRef(0);
  const feedRef = useRef(null);
  const atBottomRef = useRef(true);
  const typingSentRef = useRef(0);
  const typingTimerRef = useRef(null);
  const inputRef = useRef(null);
  const dataRef = useRef(null); dataRef.current = data;

  const accent = accentIn; // the app's own accent, so the room matches the rest of Thiscene
  const party = data?.party;
  const me = data?.me;
  const peer = data?.peer;
  const self = data?.self;
  const movie = party?.movie || {};
  const who = (uid) => (uid === me ? self : peer);

  const apply = useCallback((d) => { if (d && d.party) { skewRef.current = (d.serverNow || Date.now()) - Date.now(); setData(d); } }, []);
  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`/api/party?id=${encodeURIComponent(partyId)}`, { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || 'Could not open the watch party'); return; }
      apply(d);
    } catch { /* keep last state */ }
  }, [partyId, apply]);

  // ── feed ──
  const burst = (e) => {
    const id = Date.now() + Math.random();
    const parts = Array.from({ length: 10 }, () => ({ dx: (Math.random() - 0.5) * 160, rise: 240 + Math.random() * 240, delay: Math.random() * 0.25, size: 22 + Math.random() * 20, rot: (Math.random() - 0.5) * 60, dur: 1.2 + Math.random() * 0.6 }));
    setBursts((b) => [...b.slice(-3), { id, e, parts }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 2300);
  };
  const addEvents = useCallback((list, { live = false } = {}) => {
    if (!list?.length) return;
    setEvents((cur) => {
      const have = new Set(cur.map((e) => e.id));
      const fresh = list.filter((e) => e && !have.has(e.id));
      if (!fresh.length) return cur;
      fresh.forEach((e) => { if (e.id > lastIdRef.current) lastIdRef.current = e.id; });
      if (live) fresh.forEach((e) => { if (e.kind === 'react' && e.user_id !== dataRef.current?.me) burst(e.body); if (e.kind === 'chat' && e.user_id !== dataRef.current?.me) setPeerTyping(false); });
      if (!atBottomRef.current) setNewBelow((n) => n + fresh.filter((e) => e.user_id !== dataRef.current?.me).length);
      return [...cur, ...fresh].sort((a, b) => a.id - b.id).slice(-500);
    });
  }, []);
  const loadEvents = useCallback(async (live = false) => {
    try {
      const r = await fetch(`/api/party?events=${encodeURIComponent(partyId)}&after=${lastIdRef.current}`, { cache: 'no-store' });
      const d = await r.json();
      addEvents(d.events || [], { live });
    } catch {}
  }, [partyId, addEvents]);

  const broadcast = (event, payload = {}) => { try { chanRef.current?.send({ type: 'broadcast', event, payload: { ...payload, from: me } }); } catch {} };
  const post = async (payload) => {
    const r = await fetch('/api/party', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: partyId, ...payload }) });
    const d = await r.json().catch(() => ({}));
    return { ok: r.ok, d };
  };
  const act = async (action, extra = {}) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const { ok, d } = await post({ action, ...extra });
      if (ok) { apply(d); if (d.event) { addEvents([d.event]); broadcast('event', { event: d.event }); } broadcast('sync'); } else setErr(d.error || 'Something went wrong');
    } finally { busyRef.current = false; }
  };

  useEffect(() => { if (!err || !data) return; const t = setTimeout(() => setErr(null), 3000); return () => clearTimeout(t); }, [err, data]);
  // load + auto-join as guest
  useEffect(() => { refresh(); loadEvents(); }, [refresh, loadEvents]);
  const schedAt = party?.scheduled_for ? Date.parse(party.scheduled_for) : null;
  const early = !!schedAt && schedAt - (Date.now() + skewRef.current) > 10 * 60000;
  useEffect(() => {
    if (!party || !me) return;
    if (party.status === 'invited' && party.guest_id === me) act('join');
    else if (party.status === 'accepted' && !early) act('join');
  }, [party?.status, me, early]); // eslint-disable-line react-hooks/exhaustive-deps
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
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 250); return () => clearInterval(t); }, []);
  // fallback polling (fast when realtime isn't connected)
  useEffect(() => { const t = setInterval(() => { if (!subscribedRef.current || Date.now() % 20000 < 4000) { refresh(); loadEvents(true); } }, 4000); return () => clearInterval(t); }, [refresh, loadEvents]);
  useEffect(() => {
    if (!movie.id || providers) return;
    fetch(`/api/providers?id=${movie.id}&type=${movie.is_tv ? 'tv' : 'movie'}`).then((r) => r.json()).then((d) => setProviders(d.providers || [])).catch(() => setProviders([]));
  }, [movie.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // keep the screen awake while you're in the room (it's your remote + chat on the sofa)
  useEffect(() => {
    let lock = null, dead = false;
    const get = async () => { try { if (!dead && document.visibilityState === 'visible' && navigator.wakeLock) lock = await navigator.wakeLock.request('screen'); } catch {} };
    get();
    const vis = () => { if (document.visibilityState === 'visible') get(); };
    document.addEventListener('visibilitychange', vis);
    return () => { dead = true; document.removeEventListener('visibilitychange', vis); try { lock?.release(); } catch {} };
  }, []);

  // realtime: broadcast events + presence on a server-issued secret channel
  useEffect(() => {
    if (!data?.channel || !me) return;
    let client = null, ch = null, dead = false;
    const vis = () => { try { ch?.track({ at: Date.now(), away: document.visibilityState !== 'visible' }); } catch {} };
    (async () => {
      try {
        const { getRealtime } = await import('@/lib/realtime');
        client = getRealtime(); if (!client || dead) return;
        ch = client.channel(data.channel, { config: { broadcast: { self: false }, presence: { key: me } } });
        ch.on('broadcast', { event: 'sync' }, () => refresh());
        ch.on('broadcast', { event: 'event' }, ({ payload }) => { if (payload?.event) addEvents([payload.event], { live: true }); else loadEvents(true); });
        ch.on('broadcast', { event: 'typing' }, () => { setPeerTyping(true); clearTimeout(typingTimerRef.current); typingTimerRef.current = setTimeout(() => setPeerTyping(false), 3500); });
        ch.on('presence', { event: 'sync' }, () => { const st = ch.presenceState(); const o = {}; Object.entries(st).forEach(([k, metas]) => { const m = metas?.[metas.length - 1] || {}; o[k] = { away: !!m.away }; }); setPresence(o); });
        ch.subscribe(async (status) => { subscribedRef.current = status === 'SUBSCRIBED'; if (status === 'SUBSCRIBED') { vis(); loadEvents(true); } });
        chanRef.current = ch;
        document.addEventListener('visibilitychange', vis);
      } catch {}
    })();
    return () => { dead = true; subscribedRef.current = false; document.removeEventListener('visibilitychange', vis); try { ch && client && client.removeChannel(ch); } catch {} chanRef.current = null; };
  }, [data?.channel, me]); // eslint-disable-line react-hooks/exhaustive-deps

  // auto-scroll the feed when you're at the bottom
  useEffect(() => {
    const el = feedRef.current; if (!el) return;
    if (atBottomRef.current) { el.scrollTop = el.scrollHeight; setNewBelow(0); }
  }, [events.length, peerTyping]);
  useEffect(() => {
    if (dataRef.current?.party?.status !== 'ended') return;
    atBottomRef.current = false; setNewBelow(0);
    const el = feedRef.current; if (el) el.scrollTop = 0;
  }, [data?.party?.status]);
  const onFeedScroll = () => { const el = feedRef.current; if (!el) return; const at = el.scrollHeight - el.scrollTop - el.clientHeight < 60; atBottomRef.current = at; if (at) setNewBelow(0); };
  const toBottom = () => { const el = feedRef.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); atBottomRef.current = true; setNewBelow(0); };

  // ── derived clock ──
  const now = Date.now() + skewRef.current;
  const startAt = party?.clock_started_at ? Date.parse(party.clock_started_at) : null;
  const status = party?.status;
  const playing = status === 'playing';
  const counting = playing && startAt && now < startAt;
  const clockMs = !party ? 0 : playing && startAt ? Number(party.clock_offset_ms || 0) + Math.max(0, now - startAt) : Number(party.clock_offset_ms || 0);
  const runtimeMs = movie.runtime_min ? movie.runtime_min * 60000 : null;
  const pct = runtimeMs ? Math.min(1, clockMs / runtimeMs) : 0;
  const nearEnd = runtimeMs && clockMs > runtimeMs - 5 * 60000;
  const countN = counting ? Math.ceil((startAt - now) / 1000) : 0;
  const justStarted = playing && startAt && now >= startAt && now - startAt < 1400;
  const ready = party?.ready || {};
  const iReady = !!ready[me];
  const peerReady = peer && !!ready[peer.user_id];
  const peerHere = peer && !!presence[peer.user_id];
  const peerAway = peerHere && presence[peer.user_id].away;
  const pausedByMe = party?.paused_by === me;
  const lobbyish = status === 'invited' || status === 'lobby' || status === 'accepted';
  const live = playing || status === 'paused';
  const ended = status === 'ended';
  const started = live || ended;

  // ── actions in the room ──
  const say = async (body) => {
    const t = String(body ?? text).trim(); if (!t) return;
    if (body === undefined) setText('');
    const tmp = { id: 1e15 + Date.now(), user_id: me, kind: 'chat', body: t, film_ms: started ? clockMs : 0, created_at: new Date().toISOString(), pending: true };
    setEvents((c) => [...c, tmp]); atBottomRef.current = true;
    const { ok, d } = await post({ action: 'say', text: t });
    setEvents((c) => c.filter((e) => e.id !== tmp.id));
    if (ok && d.event) { addEvents([d.event]); broadcast('event', { event: d.event }); }
  };
  const lastReactRef = useRef(0);
  const react = async (e) => {
    burst(e); track('party_react');
    const t = Date.now(); if (t - lastReactRef.current < 250) return; lastReactRef.current = t;
    const { ok, d } = await post({ action: 'react', emoji: e });
    if (ok && d.event) { addEvents([d.event]); broadcast('event', { event: d.event }); }
  };
  const ask = async (key) => {
    const { ok, d } = await post({ action: 'ask', key });
    if (ok && d.event) { addEvents([d.event]); broadcast('event', { event: d.event }); }
  };
  const [voiceBusy, setVoiceBusy] = useState(false);
  const vrec = useVoiceRecorder({
    maxSecs: 90,
    onDone: async (blob, secs, peaks) => {
      setVoiceBusy(true); atBottomRef.current = true;
      try {
        const form = new FormData(); form.append('file', blob, `voice-${Date.now()}.webm`); form.append('kind', 'voice');
        const up = await fetch('/api/upload-chat-media', { method: 'POST', body: form }).then((r) => r.json()).catch(() => ({}));
        if (!up?.url) throw new Error('upload');
        const { ok, d } = await post({ action: 'voice', url: up.url, secs, peaks });
        if (ok && d.event) { addEvents([d.event]); broadcast('event', { event: d.event }); track('party_voice'); }
      } catch { setErr('Couldn’t send that voice note'); setTimeout(() => setErr(null), 2500); }
      setVoiceBusy(false);
    },
  });
  const onType = (v) => {
    setText(v);
    const t = Date.now(); if (v && t - typingSentRef.current > 1800) { typingSentRef.current = t; broadcast('typing'); }
  };
  const myReactions = () => { const out = {}; events.forEach((e) => { if (e.kind === 'react' && e.user_id === me) out[e.body] = (out[e.body] || 0) + 1; }); return out; };

  // loudest moment (most reactions within a 30s window of film time)
  const loudest = useMemo(() => {
    const b = {}; events.forEach((e) => { if (e.kind === 'react' && e.film_ms > 0) { const k = Math.floor(e.film_ms / 30000); b[k] = b[k] || { n: 0, em: {} }; b[k].n++; b[k].em[e.body] = (b[k].em[e.body] || 0) + 1; } });
    let best = null; Object.entries(b).forEach(([k, v]) => { if (!best || v.n > best.n) best = { at: Number(k) * 30000, n: v.n, emoji: Object.entries(v.em).sort((x, y) => y[1] - x[1])[0][0] }; });
    return best && best.n >= 3 ? best : null;
  }, [events]);

  // group consecutive reactions from the same person into one row
  const rows = useMemo(() => {
    const out = [];
    events.forEach((e) => {
      const last = out[out.length - 1];
      if (e.kind === 'react' && last && last.kind === 'reacts' && last.user_id === e.user_id && Date.parse(e.created_at) - Date.parse(last.lastAt) < 20000) { last.emojis.push(e.body); last.lastAt = e.created_at; return; }
      if (e.kind === 'react') { out.push({ kind: 'reacts', id: e.id, user_id: e.user_id, emojis: [e.body], film_ms: e.film_ms, lastAt: e.created_at }); return; }
      out.push(e);
    });
    return out;
  }, [events]);

  if (err && !data) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 460, background: ambient(accent), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, color: '#fff', textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{err}</div>
        <button onClick={onClose} style={{ ...glass, height: 44, borderRadius: 22, padding: '0 22px', color: '#fff', fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' }}>Close</button>
      </div>
    );
  }

  const bigBtn = { ...glass, height: 48, borderRadius: 24, padding: '0 20px', color: '#fff', fontFamily: 'inherit', fontSize: 14.5, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 };
  const chip = { ...glass, height: 36, borderRadius: 18, padding: '0 13px', color: '#fff', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, whiteSpace: 'nowrap' };
  const round = { ...glass, width: 38, height: 38, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 };
  const stamp = (ms) => (started && ms > 0 ? fmt(ms) : null);
  const stateLabel = early ? 'Scheduled' : lobbyish ? 'Lobby' : counting ? 'Starting' : playing ? 'Live · in sync' : status === 'paused' ? 'Paused' : ended ? 'Finished' : status === 'expired' ? 'Expired' : status === 'declined' ? 'Declined' : 'Watch party';
  const peerStatus = !peer ? '' : early ? (status === 'accepted' ? 'Going ✓' : 'Invited') : lobbyish ? (peerReady ? 'Ready ✓' : peerHere ? 'Getting ready' : 'Not here yet') : peerTyping ? 'typing…' : peerAway ? 'Away' : peerHere ? 'Here' : 'Offline';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 460, background: ambient(accent), color: '#fff', overflow: 'hidden', fontFamily: 'inherit' }}>
      <style>{`
        @keyframes pIn{from{opacity:0}to{opacity:1}}
        @keyframes pUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pCount{0%{transform:scale(1.6);opacity:0}25%{transform:scale(1);opacity:1}85%{opacity:1}100%{transform:scale(.8);opacity:0}}
        @keyframes pPulse{0%,100%{opacity:.45}50%{opacity:1}}
        @keyframes pDot{0%,100%{box-shadow:0 0 0 0 rgba(61,220,132,.6)}50%{box-shadow:0 0 0 5px rgba(61,220,132,0)}}
        @keyframes pFloat{0%{transform:translate(-50%,0) scale(.3);opacity:0}12%{opacity:1;transform:translate(calc(-50% + var(--dx)*.15),-30px) scale(1.15) rotate(var(--rot))}100%{transform:translate(calc(-50% + var(--dx)),calc(var(--rise)*-1)) scale(.85);opacity:0}}
        @keyframes pPop{from{opacity:0;transform:translateY(6px) scale(.97)}to{opacity:1;transform:none}}
        @keyframes pType{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-2px)}}
        @keyframes iL{0%{transform:translateX(-170px) scale(.7);opacity:0}70%{transform:translateX(10px) scale(1.04);opacity:1}100%{transform:translateX(0) scale(1)}}
        @keyframes iR{0%{transform:translateX(170px) scale(.7);opacity:0}70%{transform:translateX(-10px) scale(1.04);opacity:1}100%{transform:translateX(0) scale(1)}}
        @keyframes iRing{0%{transform:scale(.6);opacity:0}8%{opacity:.9}100%{transform:scale(2.6);opacity:0}}
        @keyframes iGlow{0%{transform:scale(.3);opacity:0}40%{transform:scale(1.1);opacity:1}100%{transform:scale(1);opacity:.65}}
        @keyframes iPop{0%{transform:translateX(-50%) scale(0);opacity:0}100%{transform:translateX(-50%) scale(1);opacity:1}}
        @keyframes iUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes iFill{from{width:0}to{width:100%}}
        .pr-feed::-webkit-scrollbar,.pr-tray::-webkit-scrollbar{display:none}
        .pr-in::placeholder{color:rgba(255,255,255,.45)}
      `}</style>

      {dim && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', pointerEvents: 'none' }} />}

      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', maxWidth: 600, margin: '0 auto', padding: 'max(12px, env(safe-area-inset-top)) 14px calc(10px + env(safe-area-inset-bottom))', boxSizing: 'border-box', animation: 'pIn .4s ease' }}>
        {/* top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onClose} aria-label="Leave room" style={round}><SvgIcon name="close" size={14} color="#fff" /></button>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, ...glass, borderRadius: 20, padding: '5px 12px 5px 6px', maxWidth: '100%' }}>
              <div style={{ display: 'flex' }}><Face u={self} size={24} /><div style={{ marginLeft: -7 }}><Face u={peer} size={24} ring={accent} dot={peer ? (peerHere && !peerAway ? '#3DDC84' : 'rgba(255,255,255,0.4)') : null} /></div></div>
              <div style={{ minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>You & {peer ? first(peer) : '…'}</div>
                <div style={{ fontSize: 10.5, color: peerTyping ? accent : 'rgba(255,255,255,0.6)', lineHeight: 1.2 }}>{peerStatus}</div>
              </div>
            </div>
          </div>
          <button onClick={() => setDim((v) => !v)} aria-label={dim ? 'Brighten' : 'Dim the room'} title="Cinema mode" style={{ ...round, background: dim ? `${accent}33` : glass.background, borderColor: dim ? accent : 'rgba(255,255,255,0.14)' }}><MoonIcon on={dim} /></button>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenu((v) => !v)} aria-label="More" style={round}><SvgIcon name="dots" size={16} color="#fff" /></button>
            {menu && (
              <>
                <div onClick={() => setMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />
                <div style={{ position: 'absolute', right: 0, top: 46, zIndex: 10, width: 230, ...glass, background: 'rgba(14,14,20,0.94)', borderRadius: 16, padding: 6, animation: 'pPop .15s ease' }}>
                  {[
                    ['🔄', 'Resync my clock', () => { refresh(); loadEvents(); }, true],
                    ['⏩', 'Jump ahead 10s (both)', () => act('seek', { deltaMs: 10000 }), live],
                    ['🎉', 'We finished it', () => act('end'), live],
                    ['🚪', 'Leave the room', onClose, true],
                  ].filter((x) => x[3]).map(([e, l, fn]) => (
                    <button key={l} onClick={() => { setMenu(false); fn(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', borderRadius: 10, padding: '11px 10px', color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}><span style={{ fontSize: 17 }}>{e}</span>{l}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── stage: film + shared clock + state ── */}
        <div style={{ marginTop: 14, padding: compact ? '2px 2px 12px' : '4px 2px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', transition: 'padding .25s ease', flexShrink: 0, opacity: dim ? 0.75 : 1 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: compact ? 'center' : 'flex-start' }}>
            {movie.poster && <div style={{ width: compact ? 34 : 58, aspectRatio: '2/3', borderRadius: 6, overflow: 'hidden', flexShrink: 0, boxShadow: '0 10px 26px rgba(0,0,0,0.5)', transition: 'width .25s ease' }}><img src={movie.poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></div>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...eyebrow(status === 'paused' ? '#ffb86b' : accent) }}>
                {playing && !counting && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3DDC84', animation: 'pDot 1.8s ease infinite' }} />}
                {stateLabel}
              </div>
              <div style={{ fontFamily: T.serif, fontSize: compact ? 15 : 18, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.15, marginTop: 3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: compact ? 1 : 2, WebkitBoxOrient: 'vertical' }}>{movie.title || ' '}</div>
              {!compact && <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[movie.year, movie.is_tv ? 'Series' : null, movie.runtime_min ? `${movie.runtime_min} min` : null, providers?.length ? providers[0].provider_name : null].filter(Boolean).join(' · ')}</div>}
            </div>
            {started && (
              <div style={{ textAlign: 'right', flexShrink: 0, paddingTop: compact ? 0 : 12 }}>
                <div style={{ fontFamily: T.serif, fontSize: compact ? 22 : 30, fontWeight: 800, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1, opacity: status === 'paused' ? 0.55 : 1, transition: 'font-size .25s ease' }}>{fmt(clockMs)}</div>
                {runtimeMs && !compact && <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.5)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>of {fmt(runtimeMs)}</div>}
              </div>
            )}
          </div>
          {started && (
            <div style={{ position: 'relative', height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.14)', margin: compact ? '12px 14px 4px' : '18px 14px 6px' }}>
              <div style={{ height: '100%', width: `${pct * 100}%`, borderRadius: 2, background: '#fff', transition: 'width .25s linear' }} />
              {loudest && Math.abs(Math.min(1, loudest.at / (runtimeMs || 1)) - pct) > 0.06 && <span title="Loudest moment" style={{ position: 'absolute', left: `${Math.min(1, loudest.at / (runtimeMs || 1)) * 100}%`, top: -17, fontSize: 11, transform: 'translateX(-50%)' }}>{loudest.emoji}</span>}
              <div style={{ position: 'absolute', top: '50%', left: `${pct * 100}%`, transform: 'translate(-50%,-50%)', display: 'flex' }}><Face u={self} size={18} /><div style={{ marginLeft: -6 }}><Face u={peer} size={18} ring={accent} /></div></div>
            </div>
          )}

          {/* state actions live inside the stage */}
          {party && (status === 'invited' || status === 'accepted') && early && (
            <div style={{ marginTop: 12, animation: 'pUp .3s ease' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>🗓 {fmtWhen(party.scheduled_for)} <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>· starts {untilLabel(party.scheduled_for, now)}</span></div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>{status === 'accepted' ? `${first(peer)} is in ✓ · ` : party.host_id === me ? `Waiting for ${first(peer)} to answer · ` : ''}The room opens 10 minutes before. We’ll remind you both.</div>
              {status === 'invited' && party.guest_id === me && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={async () => { await act('decline'); onClose(); }} style={{ ...bigBtn, flex: 1, color: 'rgba(255,255,255,0.75)' }}>Can’t make it</button>
                  <button onClick={() => act('join')} style={{ ...bigBtn, flex: 1.3, background: `${accent}2e`, borderColor: accent }}>🍿 I’m in</button>
                </div>
              )}
              {(party.host_id === me || (party.guest_id === me && status === 'accepted')) && <button onClick={async () => { await act(party.host_id === me ? 'cancel' : 'decline'); onClose(); }} style={{ marginTop: 10, background: 'none', border: 'none', padding: 0, color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{party.host_id === me ? 'Cancel watch party' : 'I can’t make it anymore'}</button>}
            </div>
          )}
          {party && lobbyish && !early && (
            <div style={{ marginTop: 12, animation: 'pUp .3s ease' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {[[self, iReady, 'You'], [peer, peerReady, first(peer)]].map(([u, rd, label], i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 14, background: rd ? `${accent}1f` : 'rgba(255,255,255,0.05)', border: `1px solid ${rd ? `${accent}66` : 'rgba(255,255,255,0.08)'}`, transition: 'all .25s' }}>
                    <Face u={u} size={26} ring={rd ? accent : '#0B0B12'} />
                    <div style={{ minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 800 }}>{label}</div><div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.6)' }}>{rd ? 'Ready ✓' : i === 1 && !peerHere ? (status === 'invited' ? 'Invited' : 'Not here yet') : 'Getting ready'}</div></div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 10, lineHeight: 1.45 }}>Open <b>{movie.title}</b>{providers?.length ? <> on <b>{providers.slice(0, 2).map((p) => p.provider_name).join(' or ')}</b></> : ''} and hold it at 0:00. When you’re both ready, we count you in.</div>
              <button onClick={() => act('ready', { ready: !iReady })} style={{ ...bigBtn, width: '100%', marginTop: 10, background: iReady ? `${accent}26` : glass.background, borderColor: iReady ? accent : 'rgba(255,255,255,0.14)' }}>
                {iReady ? <><SvgIcon name="check" size={15} color="#fff" />Ready — waiting for {first(peer)}</> : "I'm ready"}
              </button>
              {status === 'invited' && party.host_id === me && <button onClick={async () => { await act('cancel'); onClose(); }} style={{ marginTop: 8, background: 'none', border: 'none', padding: 0, color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>Cancel invite</button>}
            </div>
          )}
          {status === 'paused' && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, animation: 'pUp .3s ease' }}>
              <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>{pausedByMe ? 'You paused' : `${first(peer)} paused`}<div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{REASON_TEXT[party.pause_reason] || 'be right back'} · pause your player too</div></div>
              <button onClick={() => act('resume')} style={{ ...bigBtn, height: 42, padding: '0 16px', background: `${accent}2e`, borderColor: accent, flexShrink: 0 }}>▶ Resume</button>
            </div>
          )}
          {(status === 'expired' || status === 'declined') && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{status === 'expired' ? 'This invite expired' : `${first(peer)} can’t make it right now`}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>Start a new watch party whenever you’re both free.</div>
            </div>
          )}
        </div>

        {/* ── the room's live feed ── */}
        <div style={{ position: 'relative', flex: 1, minHeight: 0, marginTop: 10 }}>
          <div ref={feedRef} onScroll={onFeedScroll} className="pr-feed" style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', paddingRight: live ? 52 : 0, paddingBottom: 6, WebkitMaskImage: 'linear-gradient(to bottom,transparent 0,#000 18px)', maskImage: 'linear-gradient(to bottom,transparent 0,#000 18px)' }}>
            {ended && (
              <div style={{ padding: '14px 4px 8px' }}>
                {loudest && <div style={{ textAlign: 'center', fontSize: 12.5, color: 'rgba(255,255,255,0.75)', marginBottom: 14 }}>{loudest.emoji} Loudest moment · <b>{fmt(loudest.at)}</b> · {loudest.n} reactions</div>}
                <RecapPanel party={party} self={self} peer={peer} movie={movie} accent={accent} onRate={(n) => act('rate', { rating: n, reactions: myReactions() })} onClose={onClose} />
                <div style={{ ...eyebrow('rgba(255,255,255,0.45)'), textAlign: 'center', marginTop: 22 }}>How it went</div>
              </div>
            )}
            {!rows.length && !ended && (
              <div style={{ textAlign: 'center', padding: '28px 18px', color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.55 }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🍿</div>
                {lobbyish ? `Say hi while you get set up — ${first(peer)} sees it instantly.` : 'Everything you say and react lands here, pinned to the moment in the film.'}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 10 }}>
              {rows.map((e, i) => {
                const mine = e.user_id === me;
                const prev = rows[i - 1];
                const st = stamp(e.film_ms);
                if (e.kind === 'system') {
                  const name = e.meta?.both ? '' : mine ? 'You ' : `${first(who(e.user_id))} `;
                  return (
                    <div key={e.id} style={{ alignSelf: 'center', maxWidth: '88%', fontSize: 11.5, lineHeight: 1.45, color: 'rgba(255,255,255,0.62)', padding: '5px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', margin: '4px 0', animation: 'pPop .2s ease', textAlign: 'center' }}>
                      <span style={{ marginRight: 5 }}>{e.meta?.icon || '•'}</span><b style={{ color: 'rgba(255,255,255,0.85)' }}>{name}</b>{e.body}{st && <span style={{ color: 'rgba(255,255,255,0.4)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}> · {st}</span>}
                    </div>
                  );
                }
                if (e.kind === 'request') {
                  return (
                    <div key={e.id} style={{ alignSelf: 'center', width: '88%', ...glass, background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0', animation: 'pPop .2s ease' }}>
                      <Face u={who(e.user_id)} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{e.body}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{mine ? 'You asked' : `${first(who(e.user_id))} asked`}{st ? ` · at ${st}` : ''}</div>
                      </div>
                      {!mine && <button onClick={() => say('👍 Got it')} style={{ ...chip, height: 32 }}>👍</button>}
                    </div>
                  );
                }
                if (e.kind === 'voice') {
                  return (
                    <div key={e.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', marginTop: 4, animation: 'pPop .2s ease' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, maxWidth: '92%' }}>
                        {!mine && <Face u={who(e.user_id)} size={24} />}
                        <VoiceBubble src={e.body} peaks={e.meta?.peaks} secs={e.meta?.secs} mine={mine} accent={accent} />
                      </div>
                      {st && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3, marginLeft: mine ? 0 : 31, fontVariantNumeric: 'tabular-nums' }}>at {st}</div>}
                    </div>
                  );
                }
                if (e.kind === 'reacts') {
                  const shown = e.emojis.slice(-10);
                  return (
                    <div key={e.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', display: 'flex', alignItems: 'center', gap: 6, animation: 'pPop .2s ease' }}>
                      {!mine && <Face u={who(e.user_id)} size={20} />}
                      <span style={{ fontSize: 19, letterSpacing: -2 }}>{shown.join('')}{e.emojis.length > 10 ? <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.6)', letterSpacing: 0, marginLeft: 4 }}>+{e.emojis.length - 10}</span> : null}</span>
                      {st && <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', fontVariantNumeric: 'tabular-nums' }}>{st}</span>}
                    </div>
                  );
                }
                // chat
                const groupStart = !prev || prev.kind !== 'chat' || prev.user_id !== e.user_id;
                const next = rows[i + 1];
                const groupEnd = !next || next.kind !== 'chat' || next.user_id !== e.user_id;
                return (
                  <div key={e.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', marginTop: groupStart ? 4 : -2, animation: 'pPop .2s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, maxWidth: '86%' }}>
                      {!mine && <div style={{ width: 24, flexShrink: 0 }}>{groupEnd && <Face u={who(e.user_id)} size={24} />}</div>}
                      <div style={{ background: mine ? `${accent}2b` : 'rgba(255,255,255,0.09)', border: `1px solid ${mine ? `${accent}55` : 'rgba(255,255,255,0.08)'}`, color: '#fff', borderRadius: 18, borderBottomRightRadius: mine && groupEnd ? 6 : 18, borderBottomLeftRadius: !mine && groupEnd ? 6 : 18, padding: '8px 12px', fontSize: 14, lineHeight: 1.4, wordBreak: 'break-word', opacity: e.pending ? 0.6 : 1 }}>{e.body}</div>
                    </div>
                    {groupEnd && st && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3, marginLeft: mine ? 0 : 31, fontVariantNumeric: 'tabular-nums' }}>at {st}</div>}
                  </div>
                );
              })}
              {voiceBusy && (
                <div style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 20, background: `${accent}1f`, border: `1px solid ${accent}44`, fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.8)', animation: 'pPop .2s ease' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, animation: 'pPulse 1s ease infinite' }} />Sending voice note…
                </div>
              )}
              {peerTyping && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, animation: 'pPop .2s ease' }}>
                  <Face u={peer} size={24} />
                  <div style={{ background: 'rgba(255,255,255,0.09)', borderRadius: 16, padding: '10px 12px', display: 'flex', gap: 4 }}>{[0, 1, 2].map((k) => <span key={k} style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: `pType 1.2s ease ${k * 0.15}s infinite` }} />)}</div>
                </div>
              )}
            </div>
          </div>

          {/* reaction rail — tap to send, they float up for both of you */}
          {live && (
            <div style={{ position: 'absolute', right: 0, bottom: 4, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 2 }}>
              {EMOJI.map((e) => <button key={e} onClick={() => react(e)} aria-label={`React ${e}`} style={{ ...round, width: 42, height: 42, fontSize: 20, lineHeight: 1 }}>{e}</button>)}
            </div>
          )}
          {newBelow > 0 && (
            <button onClick={toBottom} style={{ position: 'absolute', left: '50%', bottom: 8, transform: 'translateX(-50%)', ...chip, background: 'rgba(10,10,16,0.9)', zIndex: 3 }}>↓ {newBelow} new</button>
          )}
        </div>

        {/* ── quick actions + composer ── */}
        {status !== 'expired' && status !== 'declined' && (
          <div style={{ flexShrink: 0, paddingTop: 8 }}>
            {live && !counting && (
              <div className="pr-tray" style={{ display: 'flex', gap: 7, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 8, paddingRight: 24, animation: 'pUp .25s ease', WebkitMaskImage: 'linear-gradient(to right,#000 calc(100% - 28px),transparent)', maskImage: 'linear-gradient(to right,#000 calc(100% - 28px),transparent)' }}>
                {tray === 'pause' ? (
                  <>
                    <button onClick={() => setTray('main')} aria-label="Back" style={{ ...chip, padding: '0 11px' }}>✕</button>
                    {REASONS.map(([k, e, l]) => <button key={k} onClick={() => { setTray('main'); act('pause', { reason: k }); }} style={chip}><span style={{ fontSize: 15 }}>{e}</span>{l}</button>)}
                  </>
                ) : (
                  <>
                    {playing
                      ? <button onClick={() => setTray('pause')} style={{ ...chip, background: `${accent}26`, borderColor: `${accent}88` }}><svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><rect x="5" y="4" width="5" height="16" rx="1.2" /><rect x="14" y="4" width="5" height="16" rx="1.2" /></svg>Pause</button>
                      : <button onClick={() => act('resume')} style={{ ...chip, background: `${accent}26`, borderColor: `${accent}88` }}>▶ Resume</button>}
                    <button onClick={() => act('seek', { deltaMs: -10000 })} style={chip}>⏪ 10s</button>
                    {ASKS.map(([k, e, l]) => <button key={k} onClick={() => ask(k)} style={chip}><span style={{ fontSize: 14 }}>{e}</span>{l}</button>)}
                    {nearEnd && <button onClick={() => act('end')} style={{ ...chip, background: `${accent}26`, borderColor: `${accent}88` }}>🎉 We finished</button>}
                  </>
                )}
              </div>
            )}
            {vrec.recording ? <RecorderBar rec={vrec} accent={accent} maxSecs={90} /> : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                ref={inputRef}
                className="pr-in"
                value={text}
                onChange={(e) => onType(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); say(); } }}
                onFocus={() => { setCompact(true); setTimeout(toBottom, 250); }}
                onBlur={() => setTimeout(() => setCompact(false), 150)}
                placeholder={ended ? 'So… what did you think?' : live ? 'Say something about the film…' : `Message ${peer ? first(peer) : ''}…`}
                maxLength={500}
                enterKeyHint="send"
                style={{ flex: 1, minWidth: 0, height: 46, ...glass, borderRadius: 23, padding: '0 18px', color: '#fff', fontSize: 15, outline: 'none', fontFamily: 'inherit' }}
              />
              {text.trim()
                ? <button onClick={() => say()} aria-label="Send" style={{ ...round, width: 46, height: 46, background: `${accent}33`, borderColor: accent }}><SvgIcon name="send" size={16} color="#fff" /></button>
                : <button onClick={async () => { if (voiceBusy) return; const ok = await vrec.start(); if (!ok) { setErr('Microphone permission needed for voice notes'); setTimeout(() => setErr(null), 2500); } }} aria-label="Record a voice note" style={{ ...round, width: 46, height: 46 }}><SvgIcon name="mic" size={18} color="#fff" /></button>}
            </div>
            )}
          </div>
        )}
        {(status === 'expired' || status === 'declined') && <button onClick={onClose} style={{ ...bigBtn, width: '100%', marginTop: 8 }}>Close</button>}
      </div>

      {err && data && (
        <div style={{ position: 'absolute', top: 'calc(64px + env(safe-area-inset-top))', left: 0, right: 0, zIndex: 8, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ ...glass, background: 'rgba(10,10,16,0.88)', borderRadius: 16, padding: '9px 14px', fontSize: 13, fontWeight: 700, animation: 'pPop .2s ease' }}>{err}</div>
        </div>
      )}
      {/* countdown */}
      {(counting || justStarted) && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,6,11,0.6)', backdropFilter: 'blur(6px)', pointerEvents: 'none' }}>
          {counting ? <div key={countN} style={{ fontFamily: T.serif, fontSize: 140, fontWeight: 800, lineHeight: 1, animation: 'pCount 1s ease forwards' }}>{countN}</div>
            : <div style={{ fontFamily: T.serif, fontSize: 40, fontWeight: 800, animation: 'pCount 1.3s ease forwards' }}>▶ Press play now</div>}
          {counting && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 10 }}>Get your finger on play…</div>}
        </div>
      )}

      {/* reaction bursts rise from the rail */}
      {bursts.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 7, pointerEvents: 'none', overflow: 'hidden' }}>
          {bursts.map((b) => (
            <Fragment key={b.id}>
              {b.parts.map((pt, i) => (
                <span key={i} style={{ position: 'absolute', left: 'calc(50% + min(300px, 50vw) - 40px)', bottom: '22%', fontSize: pt.size, lineHeight: 1, opacity: 0, '--dx': `${pt.dx - 40}px`, '--rise': `${pt.rise}px`, '--rot': `${pt.rot}deg`, animation: `pFloat ${pt.dur}s cubic-bezier(.2,.7,.3,1) ${pt.delay}s forwards` }}>{b.e}</span>
              ))}
            </Fragment>
          ))}
        </div>
      )}

      {/* intro: both faces glide together, meet with a pulse, the room "builds", then fades into the room */}
      {intro && (
        <div onClick={() => { if (data) { setIntroFade(true); setTimeout(() => setIntro(false), 400); } }} style={{ position: 'absolute', inset: 0, zIndex: 9, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: ambient(accent), transition: 'opacity .6s ease, transform .6s ease', opacity: introFade ? 0 : 1, transform: introFade ? 'scale(1.04)' : 'scale(1)', pointerEvents: introFade ? 'none' : 'auto' }}>
          <div style={{ position: 'absolute', width: 360, height: 360, borderRadius: '50%', background: `radial-gradient(circle, ${accent}55, transparent 65%)`, animation: 'iGlow 2.4s ease 1.1s both' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div style={{ animation: 'iL 1.25s cubic-bezier(.16,.84,.24,1) .15s both' }}><Face u={self} size={104} /></div>
            <div style={{ marginLeft: -24, animation: 'iR 1.25s cubic-bezier(.16,.84,.24,1) .15s both' }}><Face u={peer} size={104} ring={accent} /></div>
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
