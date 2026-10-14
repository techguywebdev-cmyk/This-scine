import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@clerk/expo';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices } from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';
import * as Haptics from 'expo-haptics';
import { useApi } from './api';

// Calls use the same signalling as the website: every signal is a `call_signal` message,
// so app ↔ app and app ↔ website calls work. The app watches /api/messages?ringing=1 to ring.
const Ctx = createContext(null);
const sidOf = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const STUN = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }];

export function CallProvider({ children }) {
  const { isSignedIn } = useAuth();
  const api = useApi();
  const [call, setCall] = useState(null); // { peer, mode, status: outgoing|incoming|connecting|connected, startedAt }
  const [local, setLocal] = useState(null);
  const [remote, setRemote] = useState(null);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [camOff, setCamOff] = useState(false);
  const [error, setError] = useState('');
  const pc = useRef(null);
  const ice = useRef(STUN);
  const pendingIce = useRef([]);
  const seen = useRef(new Set());
  const callRef = useRef(null);
  const since = useRef(0);
  const offer = useRef(null);
  callRef.current = call;

  useEffect(() => { if (isSignedIn) api.get('/api/ice').then((d) => { if (d.iceServers?.length) ice.current = d.iceServers; }).catch(() => {}); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [isSignedIn]);

  const send = useCallback(async (peerId, payload) => {
    const p = { ...payload, sid: payload.sid || sidOf() };
    seen.current.add(p.sid);
    try { await api.post('/api/messages', { toUserId: peerId, text: JSON.stringify(p), msg_type: 'call_signal' }); return true; } catch { return false; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanup = useCallback(() => {
    try { pc.current?.close(); } catch {}
    pc.current = null;
    setLocal((s) => { s?.getTracks().forEach((t) => t.stop()); return null; });
    setRemote(null);
    pendingIce.current = []; offer.current = null;
    try { InCallManager.stop(); } catch {}
    setMuted(false); setCamOff(false); setSpeaker(true);
    setCall(null);
  }, []);

  const makePc = (peerId) => {
    const conn = new RTCPeerConnection({ iceServers: ice.current, iceCandidatePoolSize: 4, bundlePolicy: 'max-bundle' });
    conn.addEventListener('icecandidate', (e) => { if (e.candidate) send(peerId, { kind: 'ice', candidate: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate }); });
    conn.addEventListener('track', (e) => { if (e.streams?.[0]) setRemote(e.streams[0]); });
    conn.addEventListener('connectionstatechange', () => {
      const st = conn.connectionState;
      if (st === 'connected') setCall((c) => (c ? { ...c, status: 'connected', startedAt: c.startedAt || Date.now() } : c));
      if (st === 'failed') { setError('Couldn’t connect the call'); setTimeout(() => setError(''), 3000); }
    });
    pc.current = conn;
    return conn;
  };

  const getMedia = async (mode) => {
    const stream = await mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: mode === 'video' ? { facingMode: 'user', width: 640, height: 480, frameRate: 24 } : false });
    setLocal(stream);
    return stream;
  };

  const flushIce = async () => {
    const list = pendingIce.current.splice(0);
    for (const c of list) { try { await pc.current?.addIceCandidate(new RTCIceCandidate(c)); } catch {} }
  };

  const start = useCallback(async (peer, mode = 'audio') => {
    if (callRef.current) return;
    setError('');
    since.current = Date.now() - 2000;
    setCall({ peer, mode, status: 'outgoing' });
    try {
      InCallManager.start({ media: mode === 'video' ? 'video' : 'audio', ringback: '_DEFAULT_' });
      InCallManager.setForceSpeakerphoneOn(mode === 'video');
      setSpeaker(mode === 'video');
      const stream = await getMedia(mode);
      const conn = makePc(peer.user_id);
      stream.getTracks().forEach((t) => conn.addTrack(t, stream));
      const o = await conn.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await conn.setLocalDescription(o);
      await new Promise((r) => setTimeout(r, 700)); // let a few candidates into the SDP
      const ok = await send(peer.user_id, { kind: 'offer', sdp: conn.localDescription || o, callType: mode });
      if (!ok) throw new Error('Couldn’t reach them');
    } catch (e) {
      setError(e.message?.includes('ermission') ? 'Allow microphone and camera to call' : e.message || 'Couldn’t start the call');
      setTimeout(() => setError(''), 3500);
      cleanup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanup, send]);

  const accept = useCallback(async () => {
    const c = callRef.current;
    if (!c || c.status !== 'incoming' || !offer.current) return;
    setCall({ ...c, status: 'connecting' });
    try {
      try { InCallManager.stopRingtone(); } catch {}
      InCallManager.start({ media: c.mode === 'video' ? 'video' : 'audio' });
      InCallManager.setForceSpeakerphoneOn(c.mode === 'video');
      setSpeaker(c.mode === 'video');
      const stream = await getMedia(c.mode);
      const conn = makePc(c.peer.user_id);
      stream.getTracks().forEach((t) => conn.addTrack(t, stream));
      await conn.setRemoteDescription(new RTCSessionDescription(offer.current));
      await flushIce();
      const a = await conn.createAnswer();
      await conn.setLocalDescription(a);
      await send(c.peer.user_id, { kind: 'answer', sdp: conn.localDescription || a });
    } catch (e) {
      setError(e.message?.includes('ermission') ? 'Allow microphone and camera to answer' : 'Couldn’t answer the call');
      setTimeout(() => setError(''), 3500);
      send(c.peer.user_id, { kind: 'end' });
      cleanup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanup, send]);

  const hangup = useCallback(() => {
    const c = callRef.current;
    if (c) send(c.peer.user_id, { kind: 'end', ...(c.status === 'incoming' ? { reason: 'declined' } : {}) });
    try { InCallManager.stopRingtone(); } catch {}
    cleanup();
  }, [cleanup, send]);

  const handle = async (sig) => {
    const conn = pc.current;
    if (sig.kind === 'end' || sig.kind === 'decline') { try { InCallManager.stopRingtone(); } catch {} cleanup(); return; }
    if (sig.kind === 'answer' && conn && conn.signalingState === 'have-local-offer') {
      try { await conn.setRemoteDescription(new RTCSessionDescription(sig.sdp)); await flushIce(); setCall((c) => (c ? { ...c, status: 'connecting' } : c)); } catch {}
      return;
    }
    if (sig.kind === 'restart_offer' && conn) {
      try { await conn.setRemoteDescription(new RTCSessionDescription(sig.sdp)); await flushIce(); const a = await conn.createAnswer(); await conn.setLocalDescription(a); send(callRef.current.peer.user_id, { kind: 'answer', sdp: conn.localDescription || a }); } catch {}
      return;
    }
    if (sig.kind === 'ice' && sig.candidate) {
      if (conn && conn.remoteDescription) { try { await conn.addIceCandidate(new RTCIceCandidate(sig.candidate)); } catch {} }
      else pendingIce.current.push(sig.candidate);
    }
  };

  // While a call is up: read the signal trail with that person every second
  useEffect(() => {
    if (!call) return;
    const peerId = call.peer.user_id;
    let alive = true;
    const tick = async () => {
      try {
        const d = await api.get(`/api/messages?with=${encodeURIComponent(peerId)}`);
        if (!alive) return;
        for (const m of d.messages || []) {
          if (m.msg_type !== 'call_signal' || m.from_me) continue;
          if (Date.parse(m.created_at) < since.current) continue;
          let sig = null; try { sig = JSON.parse(m.text || '{}'); } catch {}
          if (!sig?.kind || (sig.sid && seen.current.has(sig.sid))) continue;
          if (sig.sid) seen.current.add(sig.sid);
          if (sig.kind !== 'offer') await handle(sig);
        }
      } catch {}
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => { alive = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call?.peer?.user_id, !!call]);

  // Idle: ring when someone calls (checked every 3s while the app is open)
  useEffect(() => {
    if (!isSignedIn) return;
    let active = AppState.currentState === 'active';
    const sub = AppState.addEventListener('change', (s) => { active = s === 'active'; });
    const t = setInterval(async () => {
      if (!active || callRef.current) return;
      try {
        const d = await api.get('/api/messages?ringing=1');
        const c = (d.calls || []).find((x) => !x.sid || !seen.current.has(x.sid));
        if (!c || callRef.current) return;
        if (c.sid) seen.current.add(c.sid);
        offer.current = c.sdp;
        since.current = Date.parse(c.created_at) - 1000;
        setCall({ peer: { user_id: c.peer_id, display_name: c.display_name, username: c.username, avatar_url: c.avatar_url }, mode: c.callType, status: 'incoming' });
        try { InCallManager.startRingtone('_DEFAULT_'); } catch {}
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      } catch {}
    }, 3000);
    return () => { clearInterval(t); sub.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Auto-cancel an unanswered outgoing call after 45s
  useEffect(() => {
    if (call?.status !== 'outgoing' && call?.status !== 'incoming') return;
    const t = setTimeout(() => { if (callRef.current?.status === 'outgoing') { setError('No answer'); setTimeout(() => setError(''), 2500); hangup(); } else if (callRef.current?.status === 'incoming') { try { InCallManager.stopRingtone(); } catch {} cleanup(); } }, 45000);
    return () => clearTimeout(t);
  }, [call?.status, hangup, cleanup]);

  const toggleMute = () => { const next = !muted; local?.getAudioTracks().forEach((t) => { t.enabled = !next; }); setMuted(next); };
  const toggleCam = () => { const next = !camOff; local?.getVideoTracks().forEach((t) => { t.enabled = !next; }); setCamOff(next); };
  const toggleSpeaker = () => { const next = !speaker; try { InCallManager.setForceSpeakerphoneOn(next); } catch {} setSpeaker(next); };
  const flip = () => { local?.getVideoTracks().forEach((t) => { try { t._switchCamera(); } catch {} }); };

  const value = { call, local, remote, muted, speaker, camOff, error, start, accept, hangup, toggleMute, toggleCam, toggleSpeaker, flip };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCalls = () => useContext(Ctx);
