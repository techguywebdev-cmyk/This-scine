'use client';
import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import ImportSheet from '../ImportSheet';
import { fmtWhen, untilLabel, TogetherSheet, SvgIcon, T, UserProfileSheet, ambient, statusBg } from './shared';

export const CHAT_THEMES = {
  classic: {
    id: 'classic', label: 'Classic', emoji: '🎬',
    bg: '#0a0a0f', surface: 'rgba(255,255,255,0.05)',
    bubbleMe: 'rgba(255,255,255,0.12)', bubbleThem: 'rgba(255,255,255,0.05)',
    accent: '#F5C842', text: 'rgba(255,255,255,0.92)', textMuted: 'rgba(255,255,255,0.4)',
    font: "var(--font-display), 'Inter Tight', system-ui, -apple-system, sans-serif", bodyFont: 'inherit',
    radius: 16, sound: { type: 'click', freq: 880, dur: 0.06 },
  },
  batman: {
    id: 'batman', label: 'Batman', emoji: '🦇',
    bg: '#050505', surface: 'rgba(245,200,66,0.07)',
    bubbleMe: 'rgba(245,200,66,0.2)', bubbleThem: 'rgba(30,30,30,0.9)',
    accent: '#F5C842', text: 'rgba(255,255,255,0.95)', textMuted: 'rgba(245,200,66,0.5)',
    font: "var(--font-display), 'Inter Tight', system-ui, -apple-system, sans-serif", bodyFont: 'ui-monospace,monospace',
    radius: 4, sound: { type: 'deep', freq: 120, dur: 0.12 },
  },
  avatar: {
    id: 'avatar', label: 'Avatar', emoji: '🌊',
    bg: '#021018', surface: 'rgba(0,168,224,0.08)',
    bubbleMe: 'rgba(0,168,224,0.25)', bubbleThem: 'rgba(0,40,60,0.7)',
    accent: '#00A8E0', text: 'rgba(230,248,255,0.95)', textMuted: 'rgba(0,168,224,0.55)',
    font: "var(--font-display), 'Inter Tight', system-ui, -apple-system, sans-serif", bodyFont: 'inherit',
    radius: 20, sound: { type: 'wave', freq: 440, dur: 0.15 },
  },
  action: {
    id: 'action', label: 'Action', emoji: '💥',
    bg: '#100808', surface: 'rgba(255,122,47,0.08)',
    bubbleMe: 'rgba(255,122,47,0.28)', bubbleThem: 'rgba(40,20,10,0.85)',
    accent: '#FF7A2F', text: 'rgba(255,245,235,0.95)', textMuted: 'rgba(255,122,47,0.55)',
    font: "var(--font-display), 'Inter Tight', system-ui, -apple-system, sans-serif", bodyFont: 'inherit',
    radius: 8, sound: { type: 'punch', freq: 180, dur: 0.08 },
  },
  love: {
    id: 'love', label: 'Love', emoji: '💕',
    bg: '#120810', surface: 'rgba(255,107,174,0.08)',
    bubbleMe: 'rgba(255,107,174,0.26)', bubbleThem: 'rgba(50,20,35,0.85)',
    accent: '#FF6BAE', text: 'rgba(255,240,248,0.95)', textMuted: 'rgba(255,107,174,0.55)',
    font: "var(--font-display), 'Inter Tight', system-ui, -apple-system, sans-serif", bodyFont: 'inherit',
    radius: 22, sound: { type: 'soft', freq: 660, dur: 0.14 },
  },
  horror: {
    id: 'horror', label: 'Horror', emoji: '🩸',
    bg: '#0a0404', surface: 'rgba(229,9,20,0.08)',
    bubbleMe: 'rgba(229,9,20,0.28)', bubbleThem: 'rgba(30,5,5,0.9)',
    accent: '#E50914', text: 'rgba(255,230,230,0.95)', textMuted: 'rgba(229,9,20,0.5)',
    font: "var(--font-display), 'Inter Tight', system-ui, -apple-system, sans-serif", bodyFont: 'ui-monospace,monospace',
    radius: 2, sound: { type: 'horror', freq: 90, dur: 0.2 },
  },
  scifi: {
    id: 'scifi', label: 'Sci-Fi', emoji: '🛸',
    bg: '#080612', surface: 'rgba(176,127,239,0.1)',
    bubbleMe: 'rgba(176,127,239,0.28)', bubbleThem: 'rgba(25,15,45,0.9)',
    accent: '#B07FEF', text: 'rgba(245,240,255,0.95)', textMuted: 'rgba(176,127,239,0.55)',
    font: "var(--font-display), 'Inter Tight', system-ui, -apple-system, sans-serif", bodyFont: 'ui-monospace,Menlo,monospace',
    radius: 12, sound: { type: 'blip', freq: 1200, dur: 0.07 },
  },
  nature: {
    id: 'nature', label: 'Nature', emoji: '🌿',
    bg: '#06100a', surface: 'rgba(28,231,131,0.08)',
    bubbleMe: 'rgba(28,231,131,0.22)', bubbleThem: 'rgba(10,30,18,0.9)',
    accent: '#1CE783', text: 'rgba(235,255,245,0.95)', textMuted: 'rgba(28,231,131,0.5)',
    font: "var(--font-display), 'Inter Tight', system-ui, -apple-system, sans-serif", bodyFont: 'inherit',
    radius: 18, sound: { type: 'soft', freq: 520, dur: 0.12 },
  },
};
export function playChatSound(theme) {
  try {
    const s = theme?.sound;
    if (!s) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    if (s.type === 'deep' || s.type === 'horror') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(s.freq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, s.freq * 0.4), now + s.dur);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + s.dur);
    } else if (s.type === 'wave' || s.type === 'soft') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(s.freq, now);
      osc.frequency.linearRampToValueAtTime(s.freq * 1.3, now + s.dur);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + s.dur);
    } else if (s.type === 'punch') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(s.freq, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + s.dur);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(s.freq, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + s.dur);
    }
    osc.start(now);
    osc.stop(now + s.dur + 0.02);
    setTimeout(() => { try { ctx.close(); } catch {} }, 400);
  } catch {}
}
// ─── CHAT WIDGET (message requests / DMs) ───────────────────────────────────
export function ChatWidget({ peer, onClose, accent }) {
  const { user } = useUser();
  const [messages, setMessages] = useState([]);
  const [peerInfo, setPeerInfo] = useState(peer || null);
  const [showPeerProfile, setShowPeerProfile] = useState(false);
  const [showTogether, setShowTogether] = useState(false);
  const [partyStatus, setPartyStatus] = useState({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [showStickers, setShowStickers] = useState(false);
  const [callMode, setCallMode] = useState(null); // null | 'audio' | 'video'
  const [callSecs, setCallSecs] = useState(0);
  const [callStatus, setCallStatus] = useState('idle'); // idle | ringing | connecting | connected | incoming
  const [incomingCall, setIncomingCall] = useState(null); // { type, from }
  const [micMuted, setMicMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [camOff, setCamOff] = useState(false);
  // The local preview <video> only exists in the DOM while camOff is false
  // (see the camOff ? placeholder : <video> render below), so its ref is
  // null while turning the camera back on. Re-attach the live stream here
  // once the element actually mounts, instead of relying on the click
  // handler to set srcObject before React has rendered the element.
  useEffect(() => {
    if (!camOff && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.muted = true;
      localVideoRef.current.play?.().catch(() => {});
    }
  }, [camOff]);
  const [remoteSpeaking, setRemoteSpeaking] = useState(false);
  const [upgradePrompt, setUpgradePrompt] = useState(false); // peer asked to go video
  const [upgradeRequested, setUpgradeRequested] = useState(false); // I asked to go video, waiting
  const upgradeTimerRef = useRef(null);
  const [remoteStreamTick, setRemoteStreamTick] = useState(0);
  const [facingMode, setFacingMode] = useState('user'); // user | environment
  const [switchingCam, setSwitchingCam] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showAttach, setShowAttach] = useState(false);
  const [mediaTab, setMediaTab] = useState('stickers'); // stickers | gifs
  const [gifQuery, setGifQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [gifsLoading, setGifsLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecRef = useRef(null);
  const chunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const fileInputRef = useRef(null);
  const dialToneRef = useRef(null);
  const processedSignalsRef = useRef(new Set());
  const pendingIceCandidatesRef = useRef([]);
  const iceRestartInProgressRef = useRef(false);
  const reconnectTimerRef = useRef(null);
  const isCallerRef = useRef(false);
  const makingOfferRef = useRef(false);
  const callModeRef = useRef(null);
  const callStatusRef = useRef('idle');
  const peerId = peer?.user_id || peer?.id;

  const DEFAULT_ICE = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  const iceServersRef = useRef(DEFAULT_ICE);
  // Fetch STUN/TURN servers as soon as the chat opens so a call never waits on it
  useEffect(() => {
    fetch('/api/ice').then(r => r.ok ? r.json() : null).then(d => { if (d && Array.isArray(d.iceServers) && d.iceServers.length) iceServersRef.current = d.iceServers; }).catch(() => {});
  }, []);

  // Live status for watch-party cards in this thread
  const partyIdsKey = messages.filter((m) => m.msg_type === 'party' && m.meta?.party_id).map((m) => m.meta.party_id).slice(-20).join(',');
  useEffect(() => {
    if (!partyIdsKey) return;
    fetch(`/api/party?statuses=${partyIdsKey}`, { cache: 'no-store' }).then((r) => r.json()).then((d) => setPartyStatus(d.statuses || {})).catch(() => {});
  }, [partyIdsKey]);

  // Instant signalling over a realtime socket (database polling stays as the fallback)
  const rtChannelRef = useRef(null);
  const rtReadyRef = useRef(false);
  const seenSidRef = useRef(new Set());
  const handleSignalRef = useRef(null);
  useEffect(() => {
    if (!peerId || !user?.id) return;
    let cancelled = false; let client = null; let channel = null;
    (async () => {
      try {
        const { getRealtime } = await import('@/lib/realtime');
        client = getRealtime();
        if (cancelled || !client) return;
        const cr = await fetch(`/api/call-channel?with=${encodeURIComponent(peerId)}`, { cache: 'no-store' }).catch(() => null);
        const cd = cr && cr.ok ? await cr.json().catch(() => null) : null;
        if (cancelled || !cd?.channel) return; // no secret channel → database polling fallback still works
        const name = cd.channel;
        channel = client.channel(name, { config: { broadcast: { self: false, ack: false } } });
        channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
          if (!payload || payload.from === user.id) return;
          const sig = payload.signal;
          if (!sig || (sig.sid && seenSidRef.current.has(sig.sid))) return;
          if (sig.sid) seenSidRef.current.add(sig.sid);
          handleSignalRef.current && handleSignalRef.current(sig, false);
        });
        channel.subscribe((status) => { rtReadyRef.current = status === 'SUBSCRIBED'; });
        rtChannelRef.current = channel;
      } catch (e) { console.warn('[call] realtime unavailable', e?.message || e); }
    })();
    return () => { cancelled = true; rtReadyRef.current = false; try { channel && client && client.removeChannel(channel); } catch {} rtChannelRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId, user?.id]);

  const AUDIO_CONSTRAINTS = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };
  const VIDEO_CONSTRAINTS = {
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };

  const STICKER_PACKS = {
    Cinema: ['🎬','🍿','🎥','🎞️','📽️','🎦','🏆','⭐','🌟','💫','🔥','💥'],
    Reactions: ['😂','😍','😱','😭','🤯','😎','🤔','😴','🫡','🫠','👀','💯'],
    Love: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💕','✨','🙌'],
    Fun: ['👻','💀','🎃','👽','🤖','👾','🎮','🎯','🍕','☕','🌙','📱'],
  };
  const [stickerPack, setStickerPack] = useState('Cinema');
  const STICKERS = STICKER_PACKS[stickerPack] || STICKER_PACKS.Cinema;

  const loadGifs = async (q) => {
    setGifsLoading(true);
    try {
      const query = (q || 'movie reaction').trim() || 'movie';
      // Giphy public beta key (client-side ok for discovery apps)
      const url = `https://api.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(query)}&limit=24&rating=pg-13`;
      const r = await fetch(url);
      const d = await r.json();
      const items = (d.data || []).map((g) => ({
        id: g.id,
        url: g.images?.fixed_height?.url || g.images?.downsized?.url || g.images?.original?.url,
        preview: g.images?.fixed_height_small?.url || g.images?.preview_gif?.url,
      })).filter((x) => x.url);
      setGifs(items);
    } catch {
      setGifs([]);
    }
    setGifsLoading(false);
  };

  useEffect(() => {
    if (showStickers && mediaTab === 'gifs' && gifs.length === 0) loadGifs('cinema');
  }, [showStickers, mediaTab]);

  const sendGif = async (gif) => {
    if (!peerId || sending || !gif?.url) return;
    setShowStickers(false);
    await postMessage(
      { text: 'GIF', msg_type: 'gif', media_url: gif.url },
      {
        id: `tmp-${Date.now()}`,
        text: 'GIF',
        msg_type: 'gif',
        media_url: gif.url,
        created_at: new Date().toISOString(),
        from_me: true,
        read: false,
        delivered: true,
      }
    );
  };

  const formatClock = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const scrollBottom = () => {
    setTimeout(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    }, 50);
  };

  const load = () => {
    if (!peerId) return;
    setError(null);
    fetch(`/api/messages?with=${peerId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error && !d.messages) setError(d.error);
        const list = [];
        for (const m of (d.messages || [])) {
          if (m.msg_type !== 'call_signal') { list.push(m); continue; }
          try {
            const payload = JSON.parse(m.text || '{}');
            if (payload.kind === 'offer') list.push({ ...m, msg_type: 'system', text: payload.callType === 'video' ? 'Video call started' : 'Audio call started' });
            else if (payload.kind === 'end') list.push({ ...m, msg_type: 'system', text: 'Call ended' });
          } catch {}
        }
        setMessages(list);
        if (d.peer) setPeerInfo((p) => ({ ...p, ...d.peer }));
        setLoading(false);
        scrollBottom();
      })
      .catch(() => {
        setError('Could not load conversation');
        setLoading(false);
      });
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId]);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      try { mediaRecRef.current?.stop(); } catch {}
    };
  }, []);

  const postMessage = async (payload, optimistic) => {
    setMessages((p) => [...p, optimistic]);
    scrollBottom();
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: peerId, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((p) => p.filter((m) => m.id !== optimistic.id));
        setError(data.error || 'Failed to send');
        return false;
      }
      if (data.message) {
        setMessages((p) => p.map((m) => (m.id === optimistic.id ? data.message : m)));
      }
      return true;
    } catch {
      setMessages((p) => p.filter((m) => m.id !== optimistic.id));
      setError('Failed to send');
      return false;
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || !peerId) return;
    setInput('');
    setShowStickers(false);
    playChatSound(CHAT_THEMES.classic);
    await postMessage(
      { text, msg_type: 'text' },
      {
        id: `tmp-${Date.now()}`,
        text,
        msg_type: 'text',
        created_at: new Date().toISOString(),
        from_me: true,
        read: false,
        delivered: true,
      }
    );
    inputRef.current?.focus();
  };

  const sendSticker = async (emoji) => {
    if (!peerId || sending) return;
    setShowStickers(false);
    await postMessage(
      { text: emoji, msg_type: 'sticker' },
      {
        id: `tmp-${Date.now()}`,
        text: emoji,
        msg_type: 'sticker',
        created_at: new Date().toISOString(),
        from_me: true,
        read: false,
        delivered: true,
      }
    );
  };

  const startRecording = async () => {
    if (recording || sending || !peerId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        setRecording(false);
        setRecordSecs(0);
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size < 800) return;
        await uploadAndSendVoice(blob);
      };
      mediaRecRef.current = rec;
      rec.start();
      setRecording(true);
      setRecordSecs(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSecs((s) => {
          if (s >= 59) {
            stopRecording();
            return 59;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setError('Microphone permission needed for voice notes');
    }
  };

  const stopRecording = () => {
    try {
      if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
        mediaRecRef.current.stop();
      }
    } catch {}
  };

  const cancelRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    try {
      if (mediaRecRef.current) {
        mediaRecRef.current.ondataavailable = null;
        mediaRecRef.current.onstop = null;
        if (mediaRecRef.current.state !== 'inactive') mediaRecRef.current.stop();
      }
    } catch {}
    setRecording(false);
    setRecordSecs(0);
    chunksRef.current = [];
  };

  const uploadAndSendVoice = async (blob) => {
    setSending(true);
    try {
      const form = new FormData();
      form.append('file', blob, `voice-${Date.now()}.webm`);
      form.append('kind', 'voice');
      const up = await fetch('/api/upload-chat-media', { method: 'POST', body: form });
      const upData = await up.json().catch(() => ({}));
      if (!up.ok || !upData.url) {
        // Fallback: embed as data URL for short clips (last resort)
        if (blob.size > 180000) {
          setError(upData.error || 'Voice upload failed');
          setSending(false);
          return;
        }
        const dataUrl = await new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        });
        await postMessage(
          { text: 'Voice note', msg_type: 'voice', media_url: dataUrl },
          {
            id: `tmp-${Date.now()}`,
            text: 'Voice note',
            msg_type: 'voice',
            media_url: dataUrl,
            created_at: new Date().toISOString(),
            from_me: true,
            read: false,
            delivered: true,
          }
        );
        setSending(false);
        return;
      }
      await postMessage(
        { text: 'Voice note', msg_type: 'voice', media_url: upData.url },
        {
          id: `tmp-${Date.now()}`,
          text: 'Voice note',
          msg_type: 'voice',
          media_url: upData.url,
          created_at: new Date().toISOString(),
          from_me: true,
          read: false,
          delivered: true,
        }
      );
    } catch {
      setError('Could not send voice note');
    }
    setSending(false);
  };

  const statusLabel = (m) => {
    const clock = formatClock(m.created_at) || timeAgo(m.created_at);
    if (!m.from_me) return clock;
    if (m.read) return `Seen ${formatClock(m.read_at) || clock}`;
    if (m.delivered !== false) return `Delivered · ${clock}`;
    return `Sent · ${clock}`;
  };

  const StatusTicks = ({ m }) => {
    if (!m.from_me) return null;
    const color = m.read ? accent : 'rgba(255,255,255,0.35)';
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4, letterSpacing: -2, fontSize: 11, color, fontWeight: 700 }}>
        {m.read || m.delivered !== false ? '✓✓' : '✓'}
      </span>
    );
  };

  const name = peerInfo?.display_name || peerInfo?.username || 'friend';
  const meBubble = accent || '#F5C842';
  const themBubble = 'rgba(255,255,255,0.08)';

  const formatCallTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const sendSignal = async (payloadIn) => {
    if (!peerId) return false;
    const payload = { ...payloadIn, sid: payloadIn.sid || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}` };
    seenSidRef.current.add(payload.sid);
    let broadcasted = false;
    if (rtReadyRef.current && rtChannelRef.current) {
      try { rtChannelRef.current.send({ type: 'broadcast', event: 'signal', payload: { from: user?.id, signal: payload } }); broadcasted = true; } catch {}
    }
    // ICE candidates already went out instantly; persist them without making the caller wait
    if (broadcasted && payload.kind === 'ice') {
      fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toUserId: peerId, text: JSON.stringify(payload), msg_type: 'call_signal' }) }).catch(() => {});
      return true;
    }
    if (broadcasted && payload.kind !== 'offer') {
      // Answer / end / upgrades reached the peer already; store in the background
      fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toUserId: peerId, text: JSON.stringify(payload), msg_type: 'call_signal' }) }).catch(() => {});
      return true;
    }
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: peerId,
          text: JSON.stringify(payload),
          msg_type: 'call_signal',
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        console.error('[call] signal failed', res.status, d);
        return false;
      }
      return true;
    } catch (e) {
      console.error('[call] signal error', e);
      return false;
    }
  };

  const attachRemoteStream = (stream) => {
    if (!stream) return;
    remoteStreamRef.current = stream;
    try {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play?.().catch(() => {});
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play?.().catch(() => {});
      }
    } catch (e) {
      console.error('[call] attach remote', e);
    }
    setRemoteStreamTick((n) => n + 1);
  };

  const flushIceQueue = async (pc) => {
    if (!pc || !pc.remoteDescription) return;
    const queue = pendingIceCandidatesRef.current.splice(0);
    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (e) {
        console.warn('[call] addIceCandidate (flush)', e?.message || e);
      }
    }
  };

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  const cleanupCall = () => {
    clearReconnectTimer();
    iceRestartInProgressRef.current = false;
    makingOfferRef.current = false;
    pendingIceCandidatesRef.current = [];
    try {
      const pc = pcRef.current;
      if (pc) {
        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.onconnectionstatechange = null;
        pc.oniceconnectionstatechange = null;
        try {
          pc.getSenders()?.forEach((s) => {
            try { s.track?.stop(); } catch {}
          });
        } catch {}
        try { pc.close(); } catch {}
      }
    } catch {}
    pcRef.current = null;
    try {
      localStreamRef.current?.getTracks?.()?.forEach((tr) => {
        try { tr.stop(); } catch {}
      });
    } catch {}
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    try {
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    } catch {}
    try { dialToneRef.current?.stop?.(); } catch {}
    dialToneRef.current = null;
    isCallerRef.current = false;
    callModeRef.current = null;
    callStatusRef.current = 'idle';
    setCallMode(null);
    setCallStatus('idle');
    setCallSecs(0);
    setIncomingCall(null);
    setMicMuted(false);
    setSpeakerOn(true);
    setCamOff(false);
    setRemoteSpeaking(false);
    setUpgradePrompt(false);
    setUpgradeRequested(false);
    clearTimeout(upgradeTimerRef.current);
    setFacingMode('user');
    setSwitchingCam(false);
    setControlsVisible(true);
  };

  const attemptIceRestart = async () => {
    const pc = pcRef.current;
    if (!pc || iceRestartInProgressRef.current || !isCallerRef.current) return;
    if (pc.signalingState !== 'stable') return;
    iceRestartInProgressRef.current = true;
    try {
      console.log('[call] ICE restart');
      makingOfferRef.current = true;
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      await sendSignal({ kind: 'restart_offer', sdp: offer });
    } catch (e) {
      console.error('[call] ice restart failed', e);
    } finally {
      makingOfferRef.current = false;
      setTimeout(() => {
        iceRestartInProgressRef.current = false;
      }, 4000);
    }
  };

  const ensurePc = () => {
    if (pcRef.current) return pcRef.current;
    if (typeof RTCPeerConnection === 'undefined') {
      throw new Error('Calling is not supported in this browser');
    }
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current, iceCandidatePoolSize: 4, bundlePolicy: 'max-bundle', rtcpMuxPolicy: 'require' });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal({ kind: 'ice', candidate: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate });
      }
    };

    pc.ontrack = (e) => {
      // Ask the browser to play audio as soon as it can instead of buffering extra
      try { if (e.receiver && 'jitterBufferTarget' in e.receiver) e.receiver.jitterBufferTarget = 40; } catch {}
      try { if (e.receiver && 'playoutDelayHint' in e.receiver) e.receiver.playoutDelayHint = 0.04; } catch {}
      let stream = remoteStreamRef.current;
      if (!stream) {
        stream = e.streams?.[0] || new MediaStream();
        if (!e.streams?.[0] && e.track) stream.addTrack(e.track);
        remoteStreamRef.current = stream;
      } else if (e.track && !stream.getTracks().includes(e.track)) {
        stream.addTrack(e.track);
      }
      attachRemoteStream(stream);
      setRemoteStreamTick((t) => t + 1);
      if (e.track) e.track.onunmute = () => { attachRemoteStream(remoteStreamRef.current); setRemoteStreamTick((t) => t + 1); };
      setCallStatus('connected');
      clearReconnectTimer();
    };

    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      console.log('[call] connectionState', st);
      if (st === 'connected') {
        setCallStatus('connected');
        clearReconnectTimer();
        iceRestartInProgressRef.current = false;
      } else if (st === 'disconnected') {
        // brief network blip — wait then try ICE restart
        clearReconnectTimer();
        reconnectTimerRef.current = setTimeout(() => {
          if (pcRef.current && pcRef.current.connectionState === 'disconnected') {
            setError('Connection interrupted. Reconnecting…');
            attemptIceRestart();
            setTimeout(() => setError(null), 3000);
          }
        }, 2500);
      } else if (st === 'failed') {
        setError('Unable to connect the call. Retrying…');
        attemptIceRestart();
        setTimeout(() => setError(null), 3000);
      } else if (st === 'closed') {
        // ended
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[call] iceConnectionState', pc.iceConnectionState);
    };

    pcRef.current = pc;
    return pc;
  };

  const getLocalMedia = async (withVideo) => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error('Camera/microphone are not available in this browser');
    }
    const constraints = {
      audio: AUDIO_CONSTRAINTS,
      video: withVideo ? VIDEO_CONSTRAINTS : false,
    };
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        throw new Error(withVideo ? 'Camera permission was denied.' : 'Microphone permission was denied.');
      }
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        throw new Error('No camera or microphone was found.');
      }
      if (name === 'NotReadableError') {
        throw new Error('Camera or microphone is already in use.');
      }
      throw new Error(err?.message || 'Could not access media devices.');
    }
  };

  const attachLocal = async (withVideo) => {
    const stream = await getLocalMedia(withVideo);
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true;
      localVideoRef.current.playsInline = true;
      localVideoRef.current.play?.().catch(() => {});
    }
    const pc = ensurePc();
    const existing = pc.getSenders().map((s) => s.track?.kind).filter(Boolean);
    stream.getTracks().forEach((track) => {
      if (!existing.includes(track.kind)) {
        pc.addTrack(track, stream);
      } else {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === track.kind);
        if (sender) sender.replaceTrack(track).catch(() => {});
      }
    });
    return stream;
  };

  const startCall = async (mode) => {
    if (!peerId || callMode) return;
    if (typeof RTCPeerConnection === 'undefined') {
      setError('Calling is not supported in this browser');
      return;
    }
    try {
      isCallerRef.current = true;
      setCallMode(mode);
      setCallStatus('ringing');
      setCallSecs(0);
      setError(null);
      await attachLocal(mode === 'video');
      const pc = ensurePc();
      makingOfferRef.current = true;
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      await new Promise((resolve) => {
        if (pc.iceGatheringState === 'complete') return resolve();
        const t = setTimeout(resolve, 900);
        const on = () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); pc.removeEventListener('icegatheringstatechange', on); resolve(); } };
        pc.addEventListener('icegatheringstatechange', on);
      });
      const ok = await sendSignal({ kind: 'offer', sdp: pc.localDescription || offer, callType: mode });
      if (!ok) {
        setError('Unable to reach the other person.');
        cleanupCall();
      }
    } catch (err) {
      console.error('[call] startCall', err);
      setError(err?.message || 'Could not start call');
      cleanupCall();
    } finally {
      makingOfferRef.current = false;
    }
  };

  const acceptCall = async (signal) => {
    try {
      const mode = signal.callType === 'video' ? 'video' : 'audio';
      isCallerRef.current = false;
      setIncomingCall(null);
      setCallMode(mode);
      setCallStatus('connecting');
      setError(null);
      await attachLocal(mode === 'video');
      const pc = ensurePc();
      await pc.setRemoteDescription(signal.sdp);
      await flushIceQueue(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal({ kind: 'answer', sdp: pc.localDescription || answer });
      setCallStatus((s) => (s === 'connecting' ? 'connecting' : s));
    } catch (err) {
      console.error('[call] acceptCall', err);
      setError(err?.message || 'Could not accept call');
      await sendSignal({ kind: 'end' });
      cleanupCall();
    }
  };

  const handleSignal = async (signal, fromMe) => {
    if (!signal || !signal.kind) return;
    if (signal.kind === 'end') {
      cleanupCall();
      return;
    }
    if (fromMe) return;

    const pc = pcRef.current;

    if (signal.kind === 'offer') {
      const busy =
        !!callModeRef.current ||
        callStatusRef.current === 'incoming' ||
        callStatusRef.current === 'ringing' ||
        callStatusRef.current === 'connecting' ||
        callStatusRef.current === 'connected';
      if (busy) {
        // already in a call — politely tell peer we're busy
        sendSignal({ kind: 'end', reason: 'busy' });
        return;
      }
      setIncomingCall({
        type: signal.callType || 'audio',
        callType: signal.callType || 'audio',
        sdp: signal.sdp,
      });
      setCallStatus('incoming');
      return;
    }

    if (signal.kind === 'answer') {
      if (!pc) return;
      try {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(signal.sdp);
          await flushIceQueue(pc);
          setCallStatus('connected');
        }
      } catch (e) {
        console.error('[call] answer error', e);
      }
      return;
    }

    if (signal.kind === 'restart_offer') {
      if (!pc) return;
      try {
        await pc.setRemoteDescription(signal.sdp);
        await flushIceQueue(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal({ kind: 'answer', sdp: pc.localDescription || answer });
      } catch (e) {
        console.error('[call] restart_offer', e);
      }
      return;
    }

    if (signal.kind === 'ice') {
      if (!signal.candidate) return;
      try {
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(signal.candidate);
        } else {
          pendingIceCandidatesRef.current.push(signal.candidate);
        }
      } catch (e) {
        console.warn('[call] ice error', e?.message || e);
      }
      return;
    }

    if (signal.kind === 'upgrade_request') {
      if (callModeRef.current === 'audio') setUpgradePrompt(true);
      return;
    }

    if (signal.kind === 'upgrade_cancel') {
      setUpgradePrompt(false);
      return;
    }

    if (signal.kind === 'upgrade_offer') {
      clearTimeout(upgradeTimerRef.current);
      setUpgradeRequested(false);
      try {
        const conn = pc || ensurePc();
        await conn.setRemoteDescription(signal.sdp);
        await flushIceQueue(conn);
        try {
          const vStream = await getLocalMedia(true);
          const vTrack = vStream.getVideoTracks()[0];
          if (vTrack) {
            const existing = conn.getSenders().find((s) => s.track && s.track.kind === 'video');
            if (existing) await existing.replaceTrack(vTrack);
            else conn.addTrack(vTrack, vStream);
            if (localStreamRef.current) {
              localStreamRef.current.getVideoTracks().forEach((tr) => {
                try { tr.stop(); localStreamRef.current.removeTrack(tr); } catch {}
              });
              vStream.getTracks().forEach((tr) => {
                if (tr.kind === 'video') localStreamRef.current.addTrack(tr);
              });
            } else {
              localStreamRef.current = vStream;
            }
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
              localVideoRef.current.muted = true;
              localVideoRef.current.play?.().catch(() => {});
            }
          }
        } catch (mediaErr) {
          console.error('[call] upgrade media', mediaErr);
          setError(mediaErr?.message || 'Camera permission was denied.');
          await sendSignal({ kind: 'upgrade_decline' });
          return;
        }
        const answer = await conn.createAnswer();
        await conn.setLocalDescription(answer);
        await sendSignal({ kind: 'upgrade_answer', sdp: conn.localDescription || answer });
        setCallMode('video');
        setUpgradePrompt(false);
        setCamOff(false);
      } catch (e) {
        console.error('[call] upgrade_offer', e);
      }
      return;
    }

    if (signal.kind === 'upgrade_answer') {
      if (!pc) return;
      try {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(signal.sdp);
          await flushIceQueue(pc);
        }
        setCallMode('video');
        setCamOff(false);
      } catch (e) {
        console.error('[call] upgrade_answer', e);
      }
      return;
    }

    if (signal.kind === 'upgrade_decline') {
      clearTimeout(upgradeTimerRef.current);
      setUpgradeRequested(false);
      setUpgradePrompt(false);
      setError('They declined video');
      setTimeout(() => setError(null), 2500);
      return;
    }

    if (signal.kind === 'downgrade_audio') {
      try {
        const senders = pc?.getSenders?.() || [];
        for (const s of senders) {
          if (s.track && s.track.kind === 'video') {
            try { s.track.stop(); } catch {}
            try { await s.replaceTrack(null); } catch {}
          }
        }
        localStreamRef.current?.getVideoTracks?.()?.forEach((tr) => {
          try {
            tr.stop();
            localStreamRef.current.removeTrack(tr);
          } catch {}
        });
        if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
        setCallMode('audio');
        setCamOff(true);
      } catch (e) {
        console.error('[call] downgrade', e);
      }
    }
  };

  const requestVideoUpgrade = async () => {
    if (callMode !== 'audio' || !pcRef.current) return;
    if (upgradeRequested) { cancelVideoUpgrade(); return; }
    setUpgradeRequested(true);
    clearTimeout(upgradeTimerRef.current);
    upgradeTimerRef.current = setTimeout(() => {
      setUpgradeRequested(false);
      setError('No answer to your video request');
      setTimeout(() => setError(null), 2500);
    }, 30000);
    await sendSignal({ kind: 'upgrade_request' });
  };
  const cancelVideoUpgrade = async () => {
    clearTimeout(upgradeTimerRef.current);
    setUpgradeRequested(false);
    await sendSignal({ kind: 'upgrade_cancel' });
  };

  const acceptVideoUpgrade = async () => {
    setUpgradePrompt(false);
    try {
      const pc = ensurePc();
      const vStream = await getLocalMedia(true);
      const vTrack = vStream.getVideoTracks()[0];
      if (!vTrack) throw new Error('Camera permission was denied.');
      const existing = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (existing) await existing.replaceTrack(vTrack);
      else pc.addTrack(vTrack, vStream);
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((tr) => {
          try { tr.stop(); localStreamRef.current.removeTrack(tr); } catch {}
        });
        vStream.getVideoTracks().forEach((tr) => localStreamRef.current.addTrack(tr));
      } else {
        localStreamRef.current = vStream;
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.muted = true;
        localVideoRef.current.play?.().catch(() => {});
      }
      makingOfferRef.current = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal({ kind: 'upgrade_offer', sdp: pc.localDescription || offer });
      setCallMode('video');
      setCamOff(false);
    } catch (e) {
      console.error('[call] acceptVideoUpgrade', e);
      setError(e?.message || 'Could not enable camera');
      await sendSignal({ kind: 'upgrade_decline' });
    } finally {
      makingOfferRef.current = false;
    }
  };

  const declineVideoUpgrade = async () => {
    setUpgradePrompt(false);
    await sendSignal({ kind: 'upgrade_decline' });
  };

  const switchToAudio = async () => {
    try {
      const senders = pcRef.current?.getSenders?.() || [];
      for (const s of senders) {
        if (s.track && s.track.kind === 'video') {
          try { s.track.stop(); } catch {}
          try { await s.replaceTrack(null); } catch {}
        }
      }
      localStreamRef.current?.getVideoTracks?.()?.forEach((tr) => {
        try {
          tr.stop();
          localStreamRef.current.removeTrack(tr);
        } catch {}
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      setCallMode('audio');
      setCamOff(true);
      await sendSignal({ kind: 'downgrade_audio' });
    } catch (e) {
      console.error('[call] switchToAudio', e);
    }
  };

  const switchCamera = async () => {
    if (callMode !== 'video' || switchingCam) return;
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setSwitchingCam(true);
    try {
      // Stop the current camera track FIRST. On many Android/Chrome devices,
      // requesting a second camera stream while the first is still live
      // either fails outright or silently hands back the same camera again
      // (the hardware can't be opened twice). Releasing it first is what
      // actually lets facingMode select the other physical camera.
      const oldVideoTracks = localStreamRef.current ? localStreamRef.current.getVideoTracks() : [];
      const oldAudioTracks = localStreamRef.current ? localStreamRef.current.getAudioTracks() : [];
      oldVideoTracks.forEach((tr) => { try { tr.stop(); } catch {} });

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { exact: nextFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      }).catch(async (exactErr) => {
        // Some devices reject `exact` if that physical camera genuinely
        // isn't available — fall back to `ideal` so at least something works.
        console.warn('[call] exact facingMode failed, retrying with ideal', exactErr?.name);
        return navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: nextFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      });

      const newTrack = stream.getVideoTracks()[0];
      if (!newTrack) throw new Error('No camera track returned');

      // Confirm we actually got a different physical camera, not the same one again
      const newSettings = newTrack.getSettings?.() || {};
      console.log('[call] switchCamera result', { requested: nextFacing, actualFacingMode: newSettings.facingMode, deviceId: newSettings.deviceId });

      const sender = pcRef.current?.getSenders?.()?.find((s) => s.track && s.track.kind === 'video');
      if (sender) {
        await sender.replaceTrack(newTrack);
      } else {
        console.warn('[call] no active video sender yet — camera will be correct once the call connects');
      }

      // Build a genuinely NEW MediaStream object (reusing the same stream
      // reference and just mutating its tracks doesn't reliably force the
      // <video> element to repaint in all browsers — a fresh stream does).
      const freshStream = new MediaStream();
      freshStream.addTrack(newTrack);
      oldAudioTracks.forEach((tr) => {
        if (tr.readyState === 'live') freshStream.addTrack(tr);
      });
      localStreamRef.current = freshStream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = freshStream;
        localVideoRef.current.muted = true;
        await localVideoRef.current.play?.().catch(() => {});
      }
      setFacingMode(nextFacing);
      setCamOff(false);
    } catch (e) {
      console.error('[call] switchCamera failed', e?.name, e?.message);
      setError(e?.name === 'OverconstrainedError' ? 'This device only has one camera.' : 'Unable to switch camera.');
      setTimeout(() => setError(null), 2500);
    }
    setSwitchingCam(false);
  };

  const onPickFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    setShowAttach(false);
    for (const file of files) {
      await sendFile(file);
    }
  };

  const sendFile = async (file) => {
    if (!peerId || !file) return;
    setSending(true);
    try {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      // Photos are resized on the phone first: faster to send, lighter to load
      let upload = file;
      if (isImage && file.type !== 'image/gif') {
        try {
          const bmp = await createImageBitmap(file);
          const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
          const c = document.createElement('canvas');
          c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
          c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
          const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82));
          if (blob && blob.size < file.size) upload = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
        } catch {}
      }
      if (upload.size > (isImage ? 8 : 4.4) * 1024 * 1024) {
        setError('File too large — try a smaller one');
        setSending(false);
        return;
      }
      const form = new FormData();
      form.append('file', upload, upload.name || 'upload');
      form.append('kind', isVideo ? 'video' : isImage ? 'image' : 'file');
      const up = await fetch('/api/upload-chat-media', { method: 'POST', body: form });
      const upData = await up.json().catch(() => ({}));
      if (!up.ok || !upData.url) throw new Error(upData.error || 'Upload failed');
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: peerId,
          text: isVideo ? 'Video' : isImage ? 'Photo' : file.name || 'File',
          msg_type: isVideo ? 'video' : isImage ? 'image' : 'file',
          media_url: upData.url,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Upload failed');
      if (d.message) setMessages((prev) => [...prev, d.message]);
      else load();
      playChatSound(CHAT_THEMES.classic);
      scrollBottom();
    } catch (err) {
      setError(err.message || 'Could not send file');
    }
    setSending(false);
  };

  // keep refs in sync for signal handlers (avoid stale closures)
  useEffect(() => { callModeRef.current = callMode; }, [callMode]);
  useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);

  // call timer
  useEffect(() => {
    if (!callMode && callStatus !== 'incoming') {
      setCallSecs(0);
      return;
    }
    const id = setInterval(() => setCallSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [callMode, callStatus]);

  // soft dial tone while ringing (caller only)
  useEffect(() => {
    const shouldRing = callStatus === 'ringing' && isCallerRef.current;
    if (!shouldRing) {
      try { dialToneRef.current?.stop?.(); } catch {}
      dialToneRef.current = null;
      return;
    }
    let ctx;
    let osc1;
    let osc2;
    let interval;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playBurst = () => {
        try {
          osc1 = ctx.createOscillator();
          osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          osc1.frequency.value = 440;
          osc2.frequency.value = 480;
          osc1.type = 'sine';
          osc2.type = 'sine';
          gain.gain.value = 0.06;
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
          osc1.start();
          osc2.start();
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
          setTimeout(() => {
            try { osc1.stop(); osc2.stop(); } catch {}
          }, 1250);
        } catch {}
      };
      playBurst();
      interval = setInterval(playBurst, 2800);
      dialToneRef.current = {
        stop: () => {
          clearInterval(interval);
          try { osc1?.stop(); osc2?.stop(); ctx?.close(); } catch {}
        },
      };
    } catch {}
    return () => {
      clearInterval(interval);
      try { osc1?.stop(); osc2?.stop(); ctx?.close(); } catch {}
      dialToneRef.current = null;
    };
  }, [callStatus]);

  // speech glow — analyse remote audio level during audio calls
  useEffect(() => {
    if (callMode !== 'audio' || callStatus !== 'connected') {
      setRemoteSpeaking(false);
      return;
    }
    const stream = remoteStreamRef.current;
    if (!stream) return;
    let audioCtx;
    let raf;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        setRemoteSpeaking(avg > 22);
        raf = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      console.error('speech detect', e);
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
      try { audioCtx?.close(); } catch {}
    };
  }, [callMode, callStatus, remoteStreamTick]);

  // The <video> elements only mount once the call is in video mode, so after an
  // audio→video switch the streams have to be attached again (both sides).
  useEffect(() => {
    if (!callMode) return;
    const t = setTimeout(() => {
      const rs = remoteStreamRef.current;
      if (rs && remoteVideoRef.current) {
        if (remoteVideoRef.current.srcObject !== rs) remoteVideoRef.current.srcObject = rs;
        else { remoteVideoRef.current.srcObject = null; remoteVideoRef.current.srcObject = rs; }
        remoteVideoRef.current.play?.().catch(() => {});
      }
      const ls = localStreamRef.current;
      if (ls && localVideoRef.current && localVideoRef.current.srcObject !== ls) {
        localVideoRef.current.srcObject = ls;
        localVideoRef.current.muted = true;
        localVideoRef.current.play?.().catch(() => {});
      }
    }, 60);
    return () => clearTimeout(t);
  }, [callMode, remoteStreamTick, camOff]);

  // auto-hide controls on video after idle
  useEffect(() => {
    if (callMode !== 'video' || !controlsVisible) return;
    if (callStatus !== 'connected') return;
    const id = setTimeout(() => setControlsVisible(false), 4200);
    return () => clearTimeout(id);
  }, [callMode, callStatus, controlsVisible, micMuted, camOff, speakerOn]);

  // poll signals — faster during active call, moderate otherwise
  useEffect(() => {
    if (!peerId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/messages?with=${peerId}`);
        const d = await res.json();
        const list = d.messages || [];
        if (!cancelled) {
          const visible = [];
          // A signal is "resolved" if a later call_signal exists for the same
          // call session — if any later row is an 'end', 'answer', or 'reject',
          // the call already concluded and must never be replayed as fresh.
          const callSignalRows = list.filter((m) => m.msg_type === 'call_signal');
          const resolvedIds = new Set();
          for (let idx = 0; idx < callSignalRows.length; idx++) {
            const row = callSignalRows[idx];
            try {
              const payload = JSON.parse(row.text || '{}');
              if (payload.kind === 'offer') {
                // look ahead for any later signal (end/answer/reject) — if found, this offer is stale
                const hasLaterResolution = callSignalRows.slice(idx + 1).some((later) => {
                  try {
                    const laterPayload = JSON.parse(later.text || '{}');
                    return ['end', 'answer', 'reject'].includes(laterPayload.kind);
                  } catch { return false; }
                });
                // also stale if the offer itself is older than ~45s (a live ring never sits unanswered that long before the UI catches it)
                const ageMs = row.created_at ? Date.now() - new Date(row.created_at).getTime() : 0;
                if (hasLaterResolution || ageMs > 45000) resolvedIds.add(row.id);
              }
            } catch {}
          }

          for (const m of list) {
            if (m.msg_type !== 'call_signal') {
              visible.push(m);
              continue;
            }
            let sidSeen = false;
            try { const pp = JSON.parse(m.text || '{}'); if (pp.sid) { sidSeen = seenSidRef.current.has(pp.sid); seenSidRef.current.add(pp.sid); } } catch {}
            if (sidSeen) processedSignalsRef.current.add(m.id);
            if (!processedSignalsRef.current.has(m.id)) {
              processedSignalsRef.current.add(m.id);
              if (resolvedIds.has(m.id)) {
                // stale/already-resolved offer — mark processed but never act on it
              } else {
                try {
                  const payload = JSON.parse(m.text || '{}');
                  await handleSignal(payload, !!m.from_me);
                } catch (e) {
                  console.warn('[call] bad signal', e);
                }
              }
            }
            try {
              const payload = JSON.parse(m.text || '{}');
              if (payload.kind === 'offer') {
                visible.push({
                  ...m,
                  msg_type: 'system',
                  text: payload.callType === 'video' ? 'Video call started' : 'Audio call started',
                });
              } else if (payload.kind === 'end') {
                visible.push({
                  ...m,
                  msg_type: 'system',
                  text: 'Call ended',
                });
              }
            } catch {}
          }
          // Keep messages that are still sending (tmp ids) so they never flicker out while the server catches up
          setMessages((prev) => {
            const pending = prev.filter((m) => String(m.id).startsWith('tmp-') && !visible.some((v) => v.from_me && v.text === m.text && Math.abs(new Date(v.created_at) - new Date(m.created_at)) < 60000));
            return pending.length ? [...visible, ...pending] : visible;
          });
          if (d.peer) setPeerInfo((p) => ({ ...p, ...d.peer }));
          setLoading(false);
        }
      } catch {}
    };
    tick();
    const active = !!callMode || callStatus === 'incoming' || callStatus === 'ringing' || callStatus === 'connecting';
    const interval = setInterval(tick, active ? 800 : 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId, callMode, callStatus]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (pcRef.current) {
          sendSignal({ kind: 'end' });
        }
      } catch {}
      cleanupCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endingRef = useRef(false);
  const endCall = () => {
    // Guard against rapid repeated taps re-triggering cleanup/signal mid-flight
    if (endingRef.current) return;
    endingRef.current = true;
    // Tear down the call locally and instantly — the UI must never wait on
    // the network for this. The "end" signal to the peer fires in the
    // background and its outcome doesn't affect what the caller sees.
    cleanupCall();
    sendSignal({ kind: 'end' }).catch(() => {});
    setTimeout(() => { endingRef.current = false; }, 1000);
  };


  handleSignalRef.current = handleSignal;
  return (
    <>
      {showPeerProfile && peerInfo?.user_id && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 140 }}>
          <UserProfileSheet userId={peerInfo.user_id} onClose={() => setShowPeerProfile(false)} accent={accent} onWatchTrailer={() => {}} />
        </div>
      )}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 130,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(14px)',
          animation: 'fadeIn 0.2s ease',
        }}
      />
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 131,
          height: '92vh',
          maxHeight: 820,
          background: ambient(accent),
          borderRadius: '24px 24px 0 0',
          border: `1px solid ${T.hairline}`,
          borderBottom: 'none',
          display: 'flex',
          flexDirection: 'column',
          animation: 'sheetUp 0.32s cubic-bezier(0.22,1,0.36,1)',
          overflow: 'hidden',
        }}
      >
        <style>{`@keyframes sheetUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes pulseRec{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>

        {/* Header */}
        <div
          style={{
            padding: '12px 14px 12px',
            paddingTop: 'max(12px, env(safe-area-inset-top))',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ display: 'inline-flex', transform: 'rotate(90deg)' }}>
              <SvgIcon name="chevron" size={18} color="rgba(255,255,255,0.7)" />
            </span>
          </button>

          <div role="button" tabIndex={0} aria-label="View profile" onClick={() => peerInfo?.user_id && setShowPeerProfile(true)} onKeyDown={e => e.key === 'Enter' && peerInfo?.user_id && setShowPeerProfile(true)} style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                overflow: 'hidden',
                background: `${accent}33`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {peerInfo?.avatar_url ? (
                <img src={peerInfo.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontWeight: 700, fontSize: 16, color: accent }}>
                  {(name || 'U')[0].toUpperCase()}
                </span>
              )}
            </div>
            <span
              style={{
                position: 'absolute',
                bottom: 1,
                right: 1,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#22C55E',
                border: '2px solid #0B0B10',
              }}
            />
          </div>

          <div role="button" tabIndex={0} onClick={() => peerInfo?.user_id && setShowPeerProfile(true)} onKeyDown={e => e.key === 'Enter' && peerInfo?.user_id && setShowPeerProfile(true)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.95)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {name}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>View profile</div>
          </div>

          <button
            type="button"
            onClick={() => setShowTogether(true)}
            aria-label="Watch together"
            title="Watch together"
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, lineHeight: 1 }}
          >
            🍿
          </button>
          <button
            type="button"
            onClick={() => startCall('audio')}
            aria-label="Start audio call"
            title="Audio call"
            disabled={!!callMode || callStatus === 'incoming'}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              cursor: callMode ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: callMode ? 0.4 : 1,
              transition: 'background 0.15s ease, opacity 0.15s ease',
            }}
          >
            <SvgIcon name="phone" size={18} color="rgba(255,255,255,0.88)" />
          </button>
          <button
            type="button"
            onClick={() => startCall('video')}
            aria-label="Start video call"
            title="Video call"
            disabled={!!callMode || callStatus === 'incoming'}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              cursor: callMode ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: callMode ? 0.4 : 1,
              transition: 'background 0.15s ease, opacity 0.15s ease',
            }}
          >
            <SvgIcon name="video" size={18} color="rgba(255,255,255,0.88)" />
          </button>
        </div>

        {showTogether && peerId && <TogetherSheet peer={{ user_id: peerId, username: peerInfo?.username, display_name: peerInfo?.display_name || peerInfo?.username, avatar_url: peerInfo?.avatar_url || null }} accent={accent} onClose={() => setShowTogether(false)} />}
        {/* Incoming call */}
        {callStatus === 'incoming' && incomingCall && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200,
              background: ambient(accent),
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'max(48px, env(safe-area-inset-top)) 28px max(40px, env(safe-area-inset-bottom))',
              animation: 'fadeIn 0.35s ease',
            }}
          >
            <style>{`
              @keyframes callRipple{0%{transform:scale(1);opacity:0.45}100%{transform:scale(1.55);opacity:0}}
              @keyframes callPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
              @keyframes fadeIn{from{opacity:0}to{opacity:1}}
              @media (prefers-reduced-motion: reduce){
                .cine-call-ripple,.cine-call-pulse{animation:none!important}
              }
            `}</style>
            {/* soft ambient from accent */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(ellipse at 50% 28%, ${accent}33 0%, transparent 55%)`,
                pointerEvents: 'none',
              }}
            />
            <div style={{ textAlign: 'center', zIndex: 1, marginTop: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                Incoming {incomingCall.type === 'video' ? 'video' : 'audio'} call
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, zIndex: 1 }}>
              <div style={{ position: 'relative', width: 148, height: 148 }}>
                <div className="cine-call-ripple" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1.5px solid ${accent}88`, animation: 'callRipple 2.2s ease-out infinite' }} />
                <div className="cine-call-ripple" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1.5px solid ${accent}55`, animation: 'callRipple 2.2s ease-out 0.7s infinite' }} />
                <div
                  className="cine-call-pulse"
                  style={{
                    width: 148,
                    height: 148,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: `${accent}28`,
                    border: `2px solid ${accent}66`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'callPulse 2.8s ease-in-out infinite',
                    boxShadow: `0 12px 48px ${accent}33`,
                  }}
                >
                  {peerInfo?.avatar_url ? (
                    <img src={peerInfo.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontSize: 52, fontWeight: 700, color: accent }}>{(name || 'U')[0].toUpperCase()}</span>
                  )}
                </div>
              </div>
              <div style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontSize: 26, fontWeight: 700, color: '#fff', textAlign: 'center' }}>{name}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
                {incomingCall.type === 'video' ? 'Video' : 'Audio'} · CineScroll
              </div>
            </div>

            <div style={{ display: 'flex', gap: 48, alignItems: 'center', zIndex: 1, marginBottom: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  aria-label="Decline call"
                  onClick={async () => {
                    await sendSignal({ kind: 'end' });
                    setIncomingCall(null);
                    setCallStatus('idle');
                  }}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: '#E50914',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 28px rgba(229,9,20,0.4)',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <SvgIcon name="phoneEnd" size={26} color="#fff" />
                </button>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Decline</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  aria-label="Answer call"
                  onClick={() => acceptCall(incomingCall)}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: '#22C55E',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 28px rgba(34,197,94,0.4)',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <SvgIcon name={incomingCall.type === 'video' ? 'video' : 'phone'} size={26} color="#fff" />
                </button>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Answer</span>
              </div>
            </div>
          </div>
        )}

        {/* Active call */}
        {callMode && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200,
              background: ambient(accent),
              animation: 'fadeIn 0.3s ease',
              overflow: 'hidden',
            }}
            onClick={() => {
              if (callMode === 'video') setControlsVisible(true);
            }}
          >
            <style>{`
              @keyframes callRipple{0%{transform:scale(1);opacity:0.4}100%{transform:scale(1.5);opacity:0}}
              @keyframes callPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
              @keyframes speakBar{0%{transform:scaleY(0.4)}100%{transform:scaleY(1)}}
              @keyframes fadeIn{from{opacity:0}to{opacity:1}}
              @media (prefers-reduced-motion: reduce){
                .cine-call-ripple,.cine-call-pulse{animation:none!important}
              }
            `}</style>

            {/* Top status — floats over the full-bleed background, never its own solid band */}
            <div
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0,
                padding: '14px 16px',
                paddingTop: 'max(16px, env(safe-area-inset-top))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 6,
                opacity: callMode === 'video' && !controlsVisible ? 0 : 1,
                transition: 'opacity 0.3s ease',
                pointerEvents: callMode === 'video' && !controlsVisible ? 'none' : 'auto',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)',
              }}
            >
              <button
                type="button"
                aria-label="Minimize call"
                onClick={(e) => { e.stopPropagation(); endCall(); }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ display: 'inline-flex', transform: 'rotate(90deg)' }}>
                  <SvgIcon name="chevron" size={16} color="#fff" />
                </span>
              </button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontSize: 17, fontWeight: 700, color: '#fff' }}>{name}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
                  {callStatus === 'connected'
                    ? formatCallTime(callSecs)
                    : callStatus === 'ringing'
                    ? 'Ringing…'
                    : callStatus === 'connecting'
                    ? 'Connecting…'
                    : 'Calling…'}
                  {error && callStatus === 'connected' ? ' · Reconnecting…' : ''}
                </div>
              </div>
              <div style={{ width: 36 }} />
            </div>

            {/* Stage — fills the entire call screen edge-to-edge; header/controls float above it */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
              {callMode === 'video' ? (
                <>
                  {/* Cinematic placeholder behind the video element, visible until remote video actually paints */}
                  {callStatus !== 'connected' && (
                    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                      {peerInfo?.avatar_url && (
                        <div style={{
                          position: 'absolute', inset: '-20px',
                          backgroundImage: `url(${peerInfo.avatar_url})`,
                          backgroundSize: 'cover', backgroundPosition: 'center',
                          filter: 'blur(36px) saturate(0.6)',
                          transform: 'scale(1.15)',
                          opacity: 0.4,
                        }}/>
                      )}
                      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 35%, rgba(6,6,11,0.2) 0%, rgba(6,6,11,0.75) 100%)' }}/>
                      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(165deg, ${accent}38 0%, ${accent}14 50%, ${accent}2a 100%)` }}/>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', border: `3px solid ${accent}55`, boxShadow: `0 20px 60px rgba(0,0,0,0.5)` }}>
                          {peerInfo?.avatar_url
                            ? <img src={peerInfo.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                            : <div style={{ width: '100%', height: '100%', background: `${accent}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontSize: 36, fontWeight: 700, color: accent }}>{(name||'U')[0].toUpperCase()}</span>
                              </div>
                          }
                        </div>
                      </div>
                    </div>
                  )}
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      background: 'transparent',
                    }}
                  />
                  {/* local PiP */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 'max(78px, calc(env(safe-area-inset-top) + 66px))',
                      right: 14,
                      width: 108,
                      height: 152,
                      borderRadius: 16,
                      overflow: 'hidden',
                      border: '1.5px solid rgba(255,255,255,0.2)',
                      boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
                      background: '#111',
                      zIndex: 4,
                      opacity: camOff ? 0.4 : 1,
                      transition: 'opacity 0.2s ease',
                    }}
                  >
                    {camOff ? (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a22' }}>
                        <SvgIcon name="videoOff" size={22} color="rgba(255,255,255,0.4)" />
                      </div>
                    ) : (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                        }}
                      />
                    )}
                    {switchingCam && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>Switching…</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                  {/* Full-screen blurred avatar background */}
                  {peerInfo?.avatar_url && (
                    <div style={{
                      position: 'absolute', inset: '-20px',
                      backgroundImage: `url(${peerInfo.avatar_url})`,
                      backgroundSize: 'cover', backgroundPosition: 'center',
                      filter: 'blur(32px) saturate(0.6)',
                      transform: 'scale(1.1)',
                      opacity: 0.35,
                    }}/>
                  )}
                  {/* Dark vignette */}
                  <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 30%, rgba(6,6,11,0.15) 0%, rgba(6,6,11,0.7) 100%)' }}/>
                  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(165deg, ${accent}38 0%, ${accent}14 50%, ${accent}2a 100%)` }}/>
                  {/* Accent glow */}
                  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 40%, ${accent}22 0%, transparent 65%)` }}/>

                  {/* Content */}
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 0 }}>
                    {/* Speaking ripple rings */}
                    <div style={{ position: 'relative', marginBottom: 28 }}>
                      {remoteSpeaking && (<>
                        <div className="cine-call-ripple" style={{ position: 'absolute', inset: -22, borderRadius: '50%', border: `1.5px solid ${accent}55`, animation: 'callRipple 2s ease-out infinite' }}/>
                        <div className="cine-call-ripple" style={{ position: 'absolute', inset: -14, borderRadius: '50%', border: `1.5px solid ${accent}77`, animation: 'callRipple 2s ease-out 0.6s infinite' }}/>
                        <div className="cine-call-ripple" style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: `2px solid ${accent}99`, animation: 'callRipple 2s ease-out 1.2s infinite' }}/>
                      </>)}
                      {/* Avatar */}
                      <div style={{
                        width: 136, height: 136, borderRadius: '50%', overflow: 'hidden',
                        border: `3px solid ${remoteSpeaking ? accent : 'rgba(255,255,255,0.15)'}`,
                        boxShadow: remoteSpeaking ? `0 0 60px ${accent}55, 0 20px 60px rgba(0,0,0,0.6)` : '0 20px 60px rgba(0,0,0,0.5)',
                        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                        flexShrink: 0,
                      }}>
                        {peerInfo?.avatar_url
                          ? <img src={peerInfo.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                          : <div style={{ width: '100%', height: '100%', background: `${accent}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontSize: 48, fontWeight: 700, color: accent }}>{(name||'U')[0].toUpperCase()}</span>
                            </div>
                        }
                      </div>
                    </div>

                    {/* Name */}
                    <div style={{ fontFamily: T.serif, letterSpacing: '-0.02em', fontSize: 30, fontWeight: 700, color: '#fff', letterSpacing: -0.5, marginBottom: 8, textAlign: 'center', textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}>
                      {name}
                    </div>

                    {/* Status */}
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: 500, letterSpacing: 0.3, textAlign: 'center' }}>
                      {callStatus === 'connected'
                        ? formatCallTime(callSecs)
                        : callStatus === 'ringing' ? 'Ringing…'
                        : callStatus === 'connecting' ? 'Connecting…'
                        : 'Calling…'}
                    </div>

                    {/* Speaking indicator */}
                    {remoteSpeaking && callStatus === 'connected' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 12, background: `${accent}18`, border: `1px solid ${accent}40`, borderRadius: 20, padding: '5px 12px' }}>
                        {[3,5,4,6,3].map((h,i) => (
                          <div key={i} style={{ width: 3, height: h * 2, borderRadius: 2, background: accent, animation: `speakBar 0.6s ease ${i*0.1}s infinite alternate` }}/>
                        ))}
                        <span style={{ fontSize: 11, color: accent, fontWeight: 600, marginLeft: 4 }}>Speaking</span>
                      </div>
                    )}

                    {micMuted && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '5px 12px' }}>
                        <SvgIcon name="micOff" size={13} color="rgba(255,255,255,0.5)"/>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>You are muted</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* I asked to switch to video — waiting for them */}
            {upgradeRequested && callMode === 'audio' && (
              <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', left: 16, right: 16, bottom: 130, zIndex: 12, display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(15,15,24,0.9)', border: `1px solid ${accent}55`, borderRadius: 16, padding: '12px 14px', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: `${accent}26`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, animation: 'callPulse 1.6s ease-in-out infinite' }}>
                  <SvgIcon name="video" size={16} color={accent} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Asking {name} to switch to video…</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Your camera turns on when they accept</div>
                </div>
                <button type="button" onClick={cancelVideoUpgrade} style={{ background: 'none', border: 'none', padding: '6px 4px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>Cancel</button>
              </div>
            )}

            {/* Upgrade prompt */}
            {upgradePrompt && (
              <div
                style={{
                  position: 'absolute',
                  left: 16,
                  right: 16,
                  bottom: 130,
                  zIndex: 12,
                  background: 'rgba(15,15,24,0.96)',
                  border: `1px solid ${T.hairlineStrong}`,
                  borderRadius: 18,
                  padding: '16px 18px',
                  textAlign: 'center',
                  backdropFilter: 'blur(12px)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ fontSize: 14, color: '#fff', fontWeight: 600, marginBottom: 6 }}>Switch to video?</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 14 }}>
                  {name} wants to turn on the camera
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={declineVideoUpgrade}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: 14,
                      border: `1px solid ${T.hairline}`,
                      background: 'rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.7)',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Not now
                  </button>
                  <button
                    type="button"
                    onClick={acceptVideoUpgrade}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: 14,
                      border: 'none',
                      background: accent,
                      color: '#0A0A0F',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Switch
                  </button>
                </div>
              </div>
            )}

            {/* Controls — floats over the full-bleed background, never its own solid band */}
            <div
              style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                padding: '20px 28px max(32px, env(safe-area-inset-bottom))',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 14,
                zIndex: 6,
                opacity: callMode === 'video' && !controlsVisible ? 0 : 1,
                transform: callMode === 'video' && !controlsVisible ? 'translateY(12px)' : 'translateY(0)',
                transition: 'opacity 0.3s ease, transform 0.3s ease',
                pointerEvents: callMode === 'video' && !controlsVisible ? 'none' : 'auto',
                background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mic mute */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  aria-label={micMuted ? 'Unmute' : 'Mute'}
                  onClick={() => {
                    setMicMuted((v) => {
                      const next = !v;
                      const track = localStreamRef.current?.getAudioTracks()?.[0];
                      if (track) track.enabled = !next;
                      return next;
                    });
                  }}
                  style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: micMuted ? '#fff' : 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${micMuted ? 'transparent' : 'rgba(255,255,255,0.2)'}`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <SvgIcon name={micMuted ? 'micOff' : 'mic'} size={22} color={micMuted ? '#0A0A0F' : '#fff'} />
                </button>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{micMuted ? 'Unmute' : 'Mute'}</span>
              </div>

              {/* Camera / Switch to video */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  aria-label={callMode === 'audio' ? 'Switch to video' : camOff ? 'Camera on' : 'Camera off'}
                  onClick={async () => {
                    if (callMode === 'audio') {
                      requestVideoUpgrade();
                      return;
                    }
                    if (camOff) {
                      // Re-enabling: don't trust the old (possibly suspended/dead)
                      // track — request a fresh camera stream and replace it on
                      // the active peer connection sender. The local preview
                      // <video> element doesn't exist yet (it only mounts once
                      // camOff flips to false), so attaching the stream to it
                      // is handled by the effect above once React mounts it —
                      // doing it here would silently fail against a null ref.
                      try {
                        const oldTrack = localStreamRef.current?.getVideoTracks()?.[0];
                        if (oldTrack) { try { oldTrack.stop(); } catch {} }
                        const stream = await navigator.mediaDevices.getUserMedia({
                          audio: false,
                          video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
                        });
                        const newTrack = stream.getVideoTracks()[0];
                        if (!newTrack) throw new Error('No camera track');
                        const sender = pcRef.current?.getSenders?.()?.find((s) => s.track && s.track.kind === 'video');
                        if (sender) await sender.replaceTrack(newTrack);
                        const oldAudioTracks = localStreamRef.current ? localStreamRef.current.getAudioTracks() : [];
                        const freshStream = new MediaStream();
                        freshStream.addTrack(newTrack);
                        oldAudioTracks.forEach((tr) => { if (tr.readyState === 'live') freshStream.addTrack(tr); });
                        localStreamRef.current = freshStream;
                        setCamOff(false);
                      } catch (e) {
                        console.error('[call] camera re-enable failed', e?.name, e?.message);
                        setError('Unable to turn camera back on.');
                        setTimeout(() => setError(null), 2500);
                      }
                    } else {
                      // Turning off: stop the track outright rather than just
                      // disabling it, so the browser fully releases the camera
                      // (and won't silently suspend/kill it in the background).
                      const track = localStreamRef.current?.getVideoTracks()?.[0];
                      if (track) { try { track.stop(); } catch {} }
                      setCamOff(true);
                    }
                  }}
                  style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: upgradeRequested ? accent : (callMode === 'video' && camOff) ? '#fff' : 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${upgradeRequested || (callMode === 'video' && camOff) ? 'transparent' : 'rgba(255,255,255,0.2)'}`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    animation: upgradeRequested ? 'callPulse 1.6s ease-in-out infinite' : 'none',
                  }}
                >
                  <SvgIcon name={(callMode === 'video' && camOff) ? 'videoOff' : 'video'} size={22} color={upgradeRequested || (callMode === 'video' && camOff) ? '#0A0A0F' : '#fff'} />
                </button>
                <span style={{ fontSize: 10, color: upgradeRequested ? accent : 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                  {upgradeRequested ? 'Waiting…' : callMode === 'audio' ? 'Video' : 'Camera'}
                </span>
              </div>

              {/* Flip camera (video only) / Speaker (audio only) */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                {callMode === 'video' ? (
                  <>
                    <button
                      type="button"
                      aria-label="Flip camera"
                      disabled={switchingCam || camOff}
                      onClick={switchCamera}
                      style={{
                        width: 56, height: 56, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        cursor: switchingCam || camOff ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: camOff ? 0.35 : 1,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <SvgIcon name="flipCam" size={22} color="#fff" />
                    </button>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Flip</span>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      aria-label={speakerOn ? 'Speaker off' : 'Speaker on'}
                      onClick={() => {
                        setSpeakerOn((v) => {
                          const next = !v;
                          try {
                            if (remoteVideoRef.current) remoteVideoRef.current.muted = !next;
                            if (remoteAudioRef.current) remoteAudioRef.current.muted = !next;
                          } catch {}
                          return next;
                        });
                      }}
                      style={{
                        width: 56, height: 56, borderRadius: '50%',
                        background: speakerOn ? '#fff' : 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(12px)',
                        border: `1px solid ${speakerOn ? 'transparent' : 'rgba(255,255,255,0.2)'}`,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <SvgIcon name={speakerOn ? 'speaker' : 'speakerOff'} size={22} color={speakerOn ? '#0A0A0F' : '#fff'} />
                    </button>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Speaker</span>
                  </>
                )}
              </div>

              {/* End call */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  aria-label="End call"
                  onClick={endCall}
                  style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: '#E50914',
                    border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 6px 24px rgba(229,9,20,0.5)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <SvgIcon name="phoneEnd" size={22} color="#fff" />
                </button>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>End</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: '8px 16px', background: 'rgba(255,80,80,0.1)', borderBottom: '1px solid rgba(255,80,80,0.15)', flexShrink: 0 }}>
            <div style={{ fontSize: 12, color: '#FF8A8A' }}>{error}</div>
          </div>
        )}

        {/* Messages */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '16px 14px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>Loading…</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
              Say hello — start the conversation
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 8px' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>Today</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
              </div>
              {messages.map((m) => {
                if (m.msg_type === 'system') {
                  return (
                    <div key={m.id} style={{ alignSelf: 'center', padding: '6px 0' }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '5px 12px' }}>
                        {m.text}
                      </span>
                    </div>
                  );
                }
                const isSticker = m.msg_type === 'sticker' || (m.msg_type !== 'title' && m.msg_type !== 'status_reply' && m.text && [...m.text].length <= 3 && !/[a-zA-Z0-9]/.test(m.text || ''));
                const isVoice = m.msg_type === 'voice' || (!!m.media_url && (m.text === 'Voice note' || m.msg_type === 'voice'));
                const isGif = m.msg_type === 'gif' || (m.media_url && (m.text === 'GIF' || m.msg_type === 'gif'));
                const mine = !!m.from_me;
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      flexDirection: mine ? 'row-reverse' : 'row',
                      alignItems: 'flex-end',
                      gap: 8,
                      alignSelf: mine ? 'flex-end' : 'flex-start',
                      maxWidth: '88%',
                    }}
                  >
                    {!mine && (
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          overflow: 'hidden',
                          background: `${accent}33`,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {peerInfo?.avatar_url ? (
                          <img src={peerInfo.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>{(name || 'U')[0].toUpperCase()}</span>
                        )}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', gap: 4 }}>
                      {isVoice && m.media_url ? (
                        <div
                          style={{
                            background: mine ? `${accent}33` : themBubble,
                            borderRadius: 18,
                            padding: '10px 12px',
                            minWidth: 180,
                            border: mine ? `1px solid ${accent}44` : '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <audio controls src={m.media_url} style={{ width: '100%', height: 32, outline: 'none' }} />
                        </div>
                      ) : isGif && m.media_url ? (
                        <div style={{ borderRadius: 14, overflow: 'hidden', maxWidth: 200, border: '1px solid rgba(255,255,255,0.06)' }}>
                          <img src={m.media_url} alt="GIF" style={{ width: '100%', display: 'block' }} />
                        </div>
                      ) : (m.msg_type === 'image' || m.msg_type === 'photo') && m.media_url ? (
                        <div style={{ borderRadius: 14, overflow: 'hidden', maxWidth: 220, border: '1px solid rgba(255,255,255,0.06)' }}>
                          <img src={m.media_url} alt="Photo" style={{ width: '100%', display: 'block' }} />
                        </div>
                      ) : m.msg_type === 'video' && m.media_url ? (
                        <div style={{ borderRadius: 14, overflow: 'hidden', maxWidth: 240, border: '1px solid rgba(255,255,255,0.06)' }}>
                          <video src={m.media_url} controls playsInline style={{ width: '100%', display: 'block', background: '#000' }} />
                        </div>
                      ) : m.msg_type === 'status_reply' && m.meta ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', gap: 4, maxWidth: 260 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 6, paddingRight: 10, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.hairline}` }}>
                            <div style={{ width: 34, height: 48, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: m.meta.kind === 'text' ? statusBg(m.meta.bg || accent) : '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {m.meta.kind === 'image' && m.meta.media_url ? <img src={m.meta.media_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : m.meta.kind === 'video' ? <SvgIcon name="play" size={12} color="#fff" filled /> : <span style={{ fontSize: 8, color: '#fff', fontWeight: 700, padding: 2, textAlign: 'center', lineHeight: 1.1, overflow: 'hidden' }}>{(m.meta.text || '').slice(0, 24)}</span>}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.3 }}>{mine ? 'You replied to their status' : 'Replied to your status'}{m.meta.text && m.meta.kind !== 'text' ? <div style={{ color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>{m.meta.text}</div> : null}</div>
                          </div>
                          {m.meta.reaction ? <div style={{ fontSize: 38, lineHeight: 1.1 }}>{m.text}</div> : (
                            <div style={{ background: mine ? accent : themBubble, color: mine ? '#0A0A0F' : 'rgba(255,255,255,0.92)', borderRadius: 18, borderBottomRightRadius: mine ? 6 : 18, borderBottomLeftRadius: mine ? 18 : 6, padding: '10px 14px', fontSize: 14, lineHeight: 1.45 }}>{m.text}</div>
                          )}
                        </div>
                      ) : m.msg_type === 'party' && m.meta ? (
                        <button
                          type="button"
                          onClick={() => { const st = partyStatus[m.meta.party_id]?.status; if (st === 'expired' || st === 'declined') return; window.dispatchEvent(new CustomEvent('cine:open-party', { detail: { id: m.meta.party_id } })); }}
                          style={{ position: 'relative', display: 'block', width: 260, textAlign: 'left', padding: 0, borderRadius: 18, overflow: 'hidden', cursor: 'pointer', fontFamily: 'inherit', background: '#111', border: `1px solid ${accent}66` }}
                        >
                          {(m.meta.backdrop || m.meta.poster) && <img src={m.meta.backdrop || m.meta.poster} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />}
                          <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(6,6,11,0.1), rgba(6,6,11,0.9))' }} />
                          <span style={{ position: 'relative', display: 'block', padding: '46px 14px 14px' }}>
                            <span style={{ display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: 1.6, textTransform: 'uppercase', color: accent }}>🍿 Watch party</span>
                            <span style={{ display: 'block', fontSize: 16, fontWeight: 800, color: '#fff', marginTop: 4, lineHeight: 1.2 }}>{m.meta.title}</span>
                            <span style={{ display: 'block', fontSize: 11.5, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>{m.meta.scheduled_for ? `🗓 ${fmtWhen(m.meta.scheduled_for)}` : mine ? 'You invited them to watch together' : 'Invited you to watch together'}</span>
                            {(() => {
                              const ps = partyStatus[m.meta.party_id] || {}; const st = ps.status || 'invited'; const at = ps.at || m.meta.scheduled_for; const future = at && Date.parse(at) - Date.now() > 10 * 60000;
                              const live = st === 'lobby' || st === 'playing' || st === 'paused';
                              const done = st === 'ended' || st === 'expired' || st === 'declined';
                              const label = st === 'ended' ? 'Ended' : st === 'expired' ? 'Expired' : st === 'declined' ? 'Declined' : live ? (st === 'lobby' ? 'In the lobby · Join' : 'Live now · Join') : future ? (st === 'accepted' ? `Going · ${untilLabel(at)}` : mine ? `Invited · ${untilLabel(at)}` : `${fmtWhen(at)} · Answer`) : (st === 'accepted' || at) ? 'Room open · Join' : mine ? 'Open room' : 'Join';
                              return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 10, height: 34, padding: '0 16px', borderRadius: 17, background: done ? 'transparent' : 'rgba(0,0,0,0.35)', border: `1px solid ${done ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)'}`, fontSize: 12.5, fontWeight: 800, color: done ? 'rgba(255,255,255,0.5)' : '#fff' }}>{live && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3DDC84' }} />}{label}</span>;
                            })()}
                          </span>
                        </button>
                      ) : m.msg_type === 'title' && m.meta ? (
                        <button
                          type="button"
                          onClick={() => window.dispatchEvent(new CustomEvent('cine:open-title', { detail: { id: m.meta.id, title: m.meta.title, poster: m.meta.poster, backdrop: m.meta.backdrop, year: m.meta.year, rating: m.meta.rating, accent: m.meta.accent || accent, mediaType: m.meta.type, isTV: m.meta.type === 'tv' } }))}
                          style={{ display: 'flex', gap: 10, alignItems: 'center', width: 250, textAlign: 'left', padding: 8, borderRadius: 16, cursor: 'pointer', fontFamily: 'inherit', background: mine ? `${accent}26` : themBubble, border: `1px solid ${mine ? accent + '55' : 'rgba(255,255,255,0.08)'}` }}
                        >
                          <span style={{ width: 56, aspectRatio: '2/3', borderRadius: 4, overflow: 'hidden', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }}>
                            {m.meta.poster && <img src={m.meta.poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                          </span>
                          <span style={{ minWidth: 0, flex: 1 }}>
                            <span style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: accent }}>{mine ? 'You shared' : 'Shared with you'}</span>
                            <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 3, lineHeight: 1.25 }}>{m.meta.title}</span>
                            <span style={{ display: 'block', fontSize: 11.5, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>{[m.meta.year, m.meta.rating ? `★ ${m.meta.rating}` : null, m.meta.type === 'tv' ? 'Series' : null].filter(Boolean).join(' · ')}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 7, fontSize: 11.5, fontWeight: 700, color: '#fff' }}><SvgIcon name="play" size={10} color="#fff" filled />Watch trailer</span>
                          </span>
                        </button>
                      ) : isSticker ? (
                        <div style={{ fontSize: 40, lineHeight: 1.1, padding: '2px' }}>{m.text}</div>
                      ) : (
                        <div
                          style={{
                            background: mine ? accent : themBubble,
                            color: mine ? '#0A0A0F' : 'rgba(255,255,255,0.92)',
                            borderRadius: 18,
                            borderBottomRightRadius: mine ? 6 : 18,
                            borderBottomLeftRadius: mine ? 18 : 6,
                            padding: '10px 14px',
                            fontSize: 14,
                            lineHeight: 1.45,
                            fontWeight: 500,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {m.text}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: 10.5,
                          color: 'rgba(255,255,255,0.3)',
                          padding: '0 4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {mine && (
                          <span style={{ color: m.read ? accent : 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: -1 }}>
                            {m.read || m.delivered !== false ? '✓✓' : '✓'}
                          </span>
                        )}
                        <span style={{ color: mine && m.read ? accent : 'rgba(255,255,255,0.3)' }}>
                          {statusLabel(m)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Stickers / GIFs panel */}
        {showStickers && (
          <div
            style={{
              background: `linear-gradient(180deg, ${accent}08, ${accent}12)`, borderTop: `1px solid ${accent}22`,
              padding: '10px 12px 12px',
              flexShrink: 0,
              maxHeight: 240,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {[
                { id: 'stickers', label: 'Stickers' },
                { id: 'gifs', label: 'GIFs' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMediaTab(tab.id)}
                  style={{
                    background: mediaTab === tab.id ? '#FFFFFF' : 'rgba(255,255,255,0.05)',
                    border: mediaTab === tab.id ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 16,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: mediaTab === tab.id ? '#0A0A0F' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {tab.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowStickers(false)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 18 }}
              >
                ×
              </button>
            </div>
            {mediaTab === 'stickers' ? (
              <>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, overflowX: 'auto' }}>
                  {Object.keys(STICKER_PACKS).map((pack) => (
                    <button
                      key={pack}
                      type="button"
                      onClick={() => setStickerPack(pack)}
                      style={{
                        background: stickerPack === pack ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 12,
                        padding: '5px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        color: stickerPack === pack ? '#fff' : 'rgba(255,255,255,0.45)',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {pack}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, overflowY: 'auto' }}>
                  {STICKERS.map((s) => (
                    <button
                      key={`${stickerPack}-${s}`}
                      type="button"
                      onClick={() => sendSticker(s)}
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 10,
                        padding: '8px 0',
                        fontSize: 24,
                        cursor: 'pointer',
                        lineHeight: 1,
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <form
                  onSubmit={(e) => { e.preventDefault(); loadGifs(gifQuery); }}
                  style={{ display: 'flex', gap: 8, marginBottom: 8 }}
                >
                  <input
                    value={gifQuery}
                    onChange={(e) => setGifQuery(e.target.value)}
                    placeholder="Search GIFs…"
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 16,
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: 13,
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                  />
                  <button type="submit" style={{ background: accent, border: 'none', borderRadius: 16, padding: '0 12px', color: '#0A0A0F', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Go
                  </button>
                </form>
                {gifsLoading ? (
                  <div style={{ textAlign: 'center', padding: 16, color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Loading…</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, overflowY: 'auto', maxHeight: 150 }}>
                    {gifs.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => sendGif(g)}
                        style={{ background: `${accent}14`, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 0, overflow: 'hidden', cursor: 'pointer', aspectRatio: '1' }}
                      >
                        <img src={g.preview || g.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Composer */}
        {recording ? (
          <div
            style={{
              padding: '12px 14px',
              paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexShrink: 0,
              background: `linear-gradient(180deg, ${accent}0a 0%, ${accent}17 100%)`, borderTop: `1px solid ${accent}22`,
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF4D4D', animation: 'pulseRec 1s ease infinite' }} />
            <div style={{ flex: 1, fontSize: 13, color: '#fff', fontWeight: 600 }}>
              Recording… 0:{String(recordSecs).padStart(2, '0')}
            </div>
            <button type="button" onClick={cancelRecording} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '8px 12px', color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button type="button" onClick={stopRecording} style={{ background: accent, border: 'none', borderRadius: 16, padding: '8px 14px', color: '#0A0A0F', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Send
            </button>
          </div>
        ) : (
          <div
            style={{
              padding: '10px 12px',
              paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              flexShrink: 0,
              background: `linear-gradient(180deg, ${accent}0a 0%, ${accent}17 100%)`, borderTop: `1px solid ${accent}22`,
            }}
          >
            {/* Attachment sheet — WhatsApp-style: Photo, Video, Document, Camera */}
            {showAttach && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, padding: '6px 0 4px', animation: 'attachIn .22s ease' }}>
                <style>{`@keyframes attachIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
                {[
                  { id: 'photo', label: 'Photos', accept: 'image/*', icon: 'image', tint: '#7BC8FF' },
                  { id: 'camera', label: 'Camera', accept: 'image/*', capture: 'environment', icon: 'camera', tint: '#FF8FB1' },
                  { id: 'video', label: 'Video', accept: 'video/*', icon: 'video', tint: '#B79CFF' },
                  { id: 'doc', label: 'File', accept: '*/*', icon: 'file', tint: '#7BFFB0' },
                  { id: 'gif', label: 'GIFs', icon: 'gif', tint: '#FFD166' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id === 'gif') { setShowAttach(false); setShowStickers(true); setMediaTab('gifs'); return; }
                      const inputEl = fileInputRef.current;
                      if (!inputEl) return;
                      inputEl.accept = item.accept;
                      if (item.capture) inputEl.setAttribute('capture', item.capture);
                      else inputEl.removeAttribute('capture');
                      inputEl.click();
                      setShowAttach(false);
                    }}
                    style={{ background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, fontFamily: 'inherit' }}
                  >
                    <span style={{ width: 50, height: 50, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(145deg, ${item.tint}38, ${item.tint}12)`, border: `1px solid ${item.tint}40`, boxShadow: `0 6px 18px ${item.tint}1f, inset 0 1px 0 rgba(255,255,255,0.08)` }}>
                      <SvgIcon name={item.icon} size={21} color={item.tint} />
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={onPickFiles}
            />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setShowStickers(false);
                  setShowAttach((v) => !v);
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: showAttach ? accent : `${accent}1f`,
                  border: `1px solid ${accent}38`,
                  transition: 'transform .2s, background .2s',
                  transform: showAttach ? 'rotate(45deg)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <SvgIcon name="plus" size={18} color={showAttach ? '#0A0A0F' : '#fff'} />
              </button>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: `linear-gradient(135deg, rgba(255,255,255,0.09), ${accent}14)`,
                  border: `1px solid ${accent}2e`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06)`,
                  borderRadius: 24,
                  padding: '4px 6px 4px 14px',
                  minHeight: 44,
                }}
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Type a message…"
                  maxLength={1000}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.92)',
                    fontSize: 15,
                    fontFamily: 'inherit',
                    outline: 'none',
                    padding: '8px 0',
                  }}
                />
                {input.trim() ? (
                  <button
                    type="button"
                    onClick={send}
                    disabled={sending}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: accent,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      opacity: sending ? 0.7 : 1,
                    }}
                  >
                    <SvgIcon name="send" size={15} color="#0A0A0F" />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttach(false);
                        setShowStickers((v) => !v);
                        setMediaTab('stickers');
                      }}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: 20,
                        lineHeight: 1,
                      }}
                      title="Emoji & stickers"
                    >
                      🙂
                    </button>
                    <button
                      type="button"
                      onClick={startRecording}
                      onContextMenu={(e) => e.preventDefault()}
                      disabled={sending}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <SvgIcon name="mic" size={18} color="rgba(255,255,255,0.5)" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
