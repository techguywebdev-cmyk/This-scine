import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Ambient from '../../components/Ambient';
import ActionSheet from '../../components/ActionSheet';
import VoiceBubble from '../../components/VoiceBubble';
import { RecorderBar, useVoiceRecorder } from '../../components/VoiceRecorder';
import { Avatar, GlassButton, Poster } from '../../components/Ui';
import { TsLoader } from '../../components/Brand';
import { useApi } from '../../lib/api';
import { F, T, label } from '../../lib/theme';

const EMOJI = ['😂', '😱', '😭', '🔥', '❤️', '👀'];
const ASKS = [['what', '🤔 What happened?'], ['louder', '🔊 Louder?'], ['subs', '💬 Subtitles?'], ['snack', '🍿 Snack break?']];
const REASONS = [['water', '💧 Water'], ['snacks', '🍿 Snacks'], ['bathroom', '🚻 Bathroom'], ['call', '📞 Call'], ['other', '⚡ Something came up']];
const clock = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`; };
const first = (u) => { const n = String(u?.display_name || u?.username || 'Friend').trim(); const w = n.split(/\s+/)[0]; return w.length <= 3 && n.length > w.length ? n : w; };

export default function PartyRoom() {
  const { id } = useLocalSearchParams();
  const pid = String(id);
  const insets = useSafeAreaInsets();
  const api = useApi();
  const { user } = useUser();
  const me = user?.id;
  const [v, setV] = useState(null); // server view
  const [err, setErr] = useState('');
  const [events, setEvents] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [rating, setRating] = useState(0);
  const [, tick] = useState(0);
  const skew = useRef(0);
  const lastId = useRef(0);
  const flash = (m) => { setErr(m); setTimeout(() => setErr(''), 3000); };

  const loadState = useCallback(async () => {
    try {
      const t0 = Date.now();
      const d = await api.get(`/api/party?id=${encodeURIComponent(pid)}`);
      skew.current = d.serverNow - (t0 + Date.now()) / 2;
      setV(d);
    } catch (e) { if (e.status === 404) setV({ missing: true }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);
  const loadEvents = useCallback(async () => {
    try {
      const d = await api.get(`/api/party?events=${encodeURIComponent(pid)}&after=${lastId.current}`);
      const list = d.events || [];
      if (list.length) {
        lastId.current = list[list.length - 1].id;
        setEvents((p) => { const have = new Set(p.map((e) => e.id)); return [...p, ...list.filter((e) => !have.has(e.id))]; });
        if (list.some((e) => e.kind === 'system')) loadState();
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  useFocusEffect(useCallback(() => {
    loadState(); loadEvents();
    const a = setInterval(loadState, 2500), b = setInterval(loadEvents, 2000), c = setInterval(() => tick((n) => n + 1), 250);
    return () => { clearInterval(a); clearInterval(b); clearInterval(c); };
  }, [loadState, loadEvents]));

  const act = async (action, extra = {}) => {
    if (busy) return;
    setBusy(true);
    try { const d = await api.post('/api/party', { action, id: pid, ...extra }); if (d.party) setV((x) => ({ ...x, ...d, serverNow: d.serverNow })); await Promise.all([loadState(), loadEvents()]); }
    catch (e) { flash(e.message || 'Something went wrong'); }
    setBusy(false);
  };
  const talk = async (action, extra) => {
    try { const d = await api.post('/api/party', { action, id: pid, ...extra }); if (d.event) setEvents((p) => (p.some((e) => e.id === d.event.id) ? p : [...p, d.event])); }
    catch (e) { flash(e.message || 'Couldn’t send'); }
  };

  const sendVoice = async ({ uri, secs, peaks }) => {
    try {
      const form = new FormData();
      form.append('file', { uri, name: `voice-${Date.now()}.m4a`, type: 'audio/mp4' });
      form.append('kind', 'voice');
      const up = await api.request('/api/upload-chat-media', { method: 'POST', body: form });
      if (!up.url) throw new Error('Voice upload failed');
      await talk('voice', { url: up.url, secs, peaks });
    } catch (e) { flash(e.message || 'Couldn’t send your voice note'); }
  };
  const rec = useVoiceRecorder({ maxSecs: 90, onDone: sendVoice, onError: flash });

  const p = v?.party;
  const peer = v?.peer, self = v?.self;
  const accent = p?.movie?.accent || T.accent;
  const nameOf = (uid) => (uid === me ? 'You' : first(uid === peer?.user_id ? peer : self));

  // Shared clock from the server's anchor
  const now = Date.now() + skew.current;
  let ms = v?.clockMs || 0, countdown = 0;
  if (p?.status === 'playing' && p.clock_started_at) {
    const started = Date.parse(p.clock_started_at);
    if (now < started) countdown = Math.ceil((started - now) / 1000);
    ms = (Number(p.clock_offset_ms) || 0) + Math.max(0, now - started);
  } else if (p) ms = Number(p.clock_offset_ms) || 0;
  const runtime = (p?.movie?.runtime_min || 0) * 60000;
  const prog = runtime ? Math.min(1, ms / runtime) : 0;

  const myReactions = useMemo(() => { const c = {}; events.forEach((e) => { if (e.kind === 'react' && e.user_id === me) c[e.body] = (c[e.body] || 0) + 1; }); return c; }, [events, me]);

  // group consecutive reactions by the same person
  const feed = useMemo(() => {
    const out = [];
    events.forEach((e) => {
      const last = out[out.length - 1];
      if (e.kind === 'react' && last?.kind === 'react' && last.user_id === e.user_id) { last.emojis.push(e.body); last.id = e.id; return; }
      out.push(e.kind === 'react' ? { ...e, emojis: [e.body] } : e);
    });
    return out.reverse();
  }, [events]);

  if (!v) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Ambient /><TsLoader size={48} /></View>;
  if (v.missing) return (
    <View style={{ flex: 1, padding: 20, paddingTop: insets.top + 8 }}>
      <Ambient /><GlassButton icon="chevron-left" label="Back" onPress={() => router.back()} />
      <Text style={[styles.title, { marginTop: 40 }]}>This watch party isn’t available</Text>
    </View>
  );

  const st = p.status;
  const isHost = p.host_id === me;
  const ready = p.ready || {};
  const live = st === 'playing' || st === 'paused';
  const ended = st === 'ended';
  const eyebrow = countdown ? 'Starting' : st === 'playing' ? 'Live · in sync' : st === 'paused' ? 'Paused' : st === 'lobby' ? 'Getting ready' : st === 'invited' ? (isHost ? 'Invite sent' : 'You’re invited') : st === 'accepted' ? 'Scheduled' : st === 'ended' ? 'Finished' : st === 'declined' ? 'Declined' : 'Expired';
  const myRating = p.recap?.ratings?.[me];
  const theirRating = peer ? p.recap?.ratings?.[peer.user_id] : null;

  const renderEvent = ({ item: e }) => {
    const mine = e.user_id === me;
    const at = e.film_ms ? ` at ${clock(e.film_ms)}` : '';
    if (e.kind === 'system') {
      const both = e.meta?.both;
      return <View style={styles.sysWrap}><Text style={styles.sys}>{e.meta?.icon ? `${e.meta.icon}  ` : ''}{both ? '' : `${nameOf(e.user_id)} `}{e.body}</Text></View>;
    }
    if (e.kind === 'react') return <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginVertical: 3 }}><Text style={styles.reacts}>{e.emojis.join(' ')}</Text><Text style={styles.stamp}>{nameOf(e.user_id)}{at}</Text></View>;
    if (e.kind === 'request') return (
      <View style={[styles.req, { alignSelf: mine ? 'flex-end' : 'flex-start' }]}>
        <Text style={styles.reqText}>{e.body}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={styles.stamp}>{nameOf(e.user_id)}{at}</Text>
          {!mine ? <Pressable onPress={() => talk('say', { text: '👍' })} hitSlop={8}><Text style={{ fontSize: 16 }}>👍</Text></Pressable> : null}
        </View>
      </View>
    );
    if (e.kind === 'voice') return (
      <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginVertical: 4 }}>
        <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}><VoiceBubble src={e.body} secs={e.meta?.secs} peaks={e.meta?.peaks} mine={mine} /></View>
        <Text style={styles.stamp}>{mine ? 'You' : nameOf(e.user_id)}{at}</Text>
      </View>
    );
    return (
      <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginVertical: 4 }}>
        <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}><Text style={[styles.msg, mine && { color: '#07070F' }]}>{e.body}</Text></View>
        <Text style={styles.stamp}>{mine ? 'You' : nameOf(e.user_id)}{at}</Text>
      </View>
    );
  };

  const Face = ({ u, isReady }) => (
    <View style={{ alignItems: 'center', gap: 6, width: 90 }}>
      <View style={{ borderRadius: 32, borderWidth: 2, borderColor: isReady ? '#7BFFB0' : 'rgba(255,255,255,0.14)', padding: 2 }}><Avatar uri={u?.avatar_url} name={u?.display_name} size={54} /></View>
      <Text style={styles.faceName} numberOfLines={1}>{u?.user_id === me ? 'You' : first(u)}</Text>
      <Text style={[styles.faceState, isReady && { color: '#7BFFB0' }]}>{isReady ? 'Ready ✓' : 'Not ready'}</Text>
    </View>
  );

  const header = (
    <View>
      {/* Stage */}
      <View style={styles.stage}>
        <Poster uri={p.movie?.poster} width={86} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={label(accent)}>{eyebrow}</Text>
          <Text style={styles.title} numberOfLines={2}>{p.movie?.title}</Text>
          <Text style={styles.clock}>{countdown ? `${countdown}…` : clock(ms)}{runtime ? <Text style={styles.clockOf}> / {clock(runtime)}</Text> : null}</Text>
        </View>
      </View>
      {runtime ? <View style={styles.track}><View style={[styles.fill, { width: `${prog * 100}%`, backgroundColor: accent }]} /></View> : null}

      {/* State actions */}
      {st === 'invited' && !isHost ? (
        <View style={styles.row2}>
          <Pressable onPress={() => act('join')} style={[styles.primary, { flex: 1 }]}><Text style={styles.primaryText}>{p.scheduled_for ? 'I’m in' : 'Join'}</Text></Pressable>
          <Pressable onPress={() => act('decline').then(() => router.back())} style={[styles.ghost, { flex: 1 }]}><Text style={styles.ghostText}>Can’t make it</Text></Pressable>
        </View>
      ) : null}
      {(st === 'invited' && isHost) || st === 'accepted' ? (
        <Text style={styles.note}>{p.scheduled_for ? `Starts ${new Date(p.scheduled_for).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })} · the room opens 10 minutes before.` : `Waiting for ${first(peer)} to join…`}</Text>
      ) : null}
      {st === 'lobby' ? (
        <View style={{ marginTop: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 30 }}>
            <Face u={self} isReady={!!ready[me]} />
            <Face u={peer} isReady={!!(peer && ready[peer.user_id])} />
          </View>
          <Text style={styles.note}>Get the film up on your TV or app. When you’re both ready, we count 3-2-1 and you both press play.</Text>
          <Pressable onPress={() => act('ready', { ready: !ready[me] })} style={[ready[me] ? styles.ghost : styles.primary, { marginTop: 12 }]}><Text style={ready[me] ? styles.ghostText : styles.primaryText}>{ready[me] ? 'Not ready yet' : 'I’m ready'}</Text></Pressable>
        </View>
      ) : null}
      {st === 'paused' ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{p.paused_by === me ? 'You' : first(peer)} paused{p.pause_reason ? ` — ${(REASONS.find((r) => r[0] === p.pause_reason) || [])[1] || ''}` : ''}</Text>
          <Pressable onPress={() => act('resume')} style={[styles.primary, { height: 40, paddingHorizontal: 18 }]}><Text style={styles.primaryText}>Resume</Text></Pressable>
        </View>
      ) : null}
      {st === 'expired' || st === 'declined' ? <Text style={styles.note}>{st === 'declined' ? `${first(peer)} can’t make it this time.` : 'This invite expired. Start a new one from the film.'}</Text> : null}
      {ended ? (
        <View style={styles.recap}>
          <Text style={label(accent)}>How was it?</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} disabled={!!myRating} onPress={() => { setRating(n); act('rate', { rating: n, reactions: myReactions }); Haptics.selectionAsync().catch(() => {}); }} hitSlop={6}>
                <Feather name="star" size={28} color={(myRating || rating) >= n ? '#FFD166' : 'rgba(255,255,255,0.25)'} />
              </Pressable>
            ))}
          </View>
          {myRating ? <Text style={styles.note}>{theirRating ? `${first(peer)} gave it ${theirRating}★ · you gave it ${myRating}★` : `You gave it ${myRating}★ — waiting for ${first(peer)}.`}</Text> : null}
        </View>
      ) : null}
      <View style={{ height: 1, backgroundColor: T.hairline, marginTop: 18 }} />
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Ambient accent={accent} />
      {/* Top bar */}
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <GlassButton icon="chevron-down" label="Leave room" onPress={() => router.back()} />
        <View style={styles.pill}>
          <Avatar uri={peer?.avatar_url} name={peer?.display_name} size={24} />
          <Text style={styles.pillText} numberOfLines={1}>{first(peer)}</Text>
        </View>
        <GlassButton icon="more-horizontal" label="Room options" onPress={() => setMenu(true)} />
      </View>

      <FlatList
        inverted
        data={feed}
        keyExtractor={(e) => String(e.id)}
        renderItem={renderEvent}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10 }}
        ListFooterComponent={header}
        showsVerticalScrollIndicator={false}
      />

      {err ? <View style={styles.err}><Text style={styles.errText}>{err}</Text></View> : null}

      {/* Tray + reactions */}
      {live ? (
        <View>
          {pauseOpen ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tray}>
              {REASONS.map(([k, t]) => <Pressable key={k} onPress={() => { setPauseOpen(false); act('pause', { reason: k }); }} style={styles.chip}><Text style={styles.chipText}>{t}</Text></Pressable>)}
              <Pressable onPress={() => setPauseOpen(false)} style={styles.chip}><Text style={styles.chipText}>Cancel</Text></Pressable>
            </ScrollView>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tray}>
              {st === 'playing' ? <Pressable onPress={() => setPauseOpen(true)} style={styles.chip}><Text style={styles.chipText}>⏸ Pause</Text></Pressable> : null}
              <Pressable onPress={() => act('seek', { deltaMs: -10000 })} style={styles.chip}><Text style={styles.chipText}>⏪ 10s</Text></Pressable>
              {runtime && prog > 0.85 ? <Pressable onPress={() => act('end')} style={styles.chip}><Text style={styles.chipText}>🎉 We finished</Text></Pressable> : null}
              {ASKS.map(([k, t]) => <Pressable key={k} onPress={() => talk('ask', { key: k })} style={styles.chip}><Text style={styles.chipText}>{t}</Text></Pressable>)}
            </ScrollView>
          )}
          <View style={styles.emojis}>
            {EMOJI.map((e) => <Pressable key={e} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); talk('react', { emoji: e }); }} hitSlop={4}><Text style={{ fontSize: 24 }}>{e}</Text></Pressable>)}
          </View>
        </View>
      ) : null}

      {/* Composer */}
      {st !== 'expired' && st !== 'declined' ? (
        <View style={[styles.composer, { paddingBottom: insets.bottom + 10 }]}>
          {rec.recording ? <RecorderBar rec={rec} maxSecs={90} /> : (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              <TextInput value={text} onChangeText={setText} placeholder={ended ? 'So… what did you think?' : 'Say something…'} placeholderTextColor="rgba(255,255,255,0.35)" multiline maxLength={500} style={styles.input} />
              {text.trim() ? (
                <Pressable onPress={() => { const t = text.trim(); setText(''); talk('say', { text: t }); }} style={styles.send} accessibilityLabel="Send"><Feather name="arrow-up" size={18} color="#07070F" /></Pressable>
              ) : (
                <Pressable onPress={rec.start} style={[styles.send, styles.mic]} accessibilityLabel="Record a voice note"><Feather name="mic" size={18} color="#fff" /></Pressable>
              )}
            </View>
          )}
        </View>
      ) : null}

      <ActionSheet visible={menu} onClose={() => setMenu(false)} title={p.movie?.title} sub={`With ${first(peer)}`} accent={accent} poster={p.movie?.poster}
        actions={[
          ...(live ? [['refresh-cw', 'Resync', () => { loadState(); loadEvents(); }], ['fast-forward', 'Jump ahead 10s', () => act('seek', { deltaMs: 10000 })], ['flag', 'We finished it', () => act('end')]] : []),
          ...(isHost && ['invited', 'accepted', 'lobby'].includes(st) ? [['x', 'Cancel watch party', () => act('cancel')]] : []),
          ['log-out', 'Leave room', () => router.back()],
        ]} />
    </KeyboardAvoidingView>
  );
}

const glass = { backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' };
const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 36, paddingLeft: 6, paddingRight: 14, borderRadius: 18, maxWidth: 200, ...glass },
  pillText: { fontFamily: F.bold, fontSize: 13, color: '#fff' },
  stage: { flexDirection: 'row', gap: 16, alignItems: 'center', marginTop: 8 },
  title: { fontFamily: F.displayHeavy, fontSize: 22, lineHeight: 26, color: '#fff', letterSpacing: -0.4, marginTop: 6 },
  clock: { fontFamily: F.displayHeavy, fontSize: 30, color: '#fff', marginTop: 8, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  clockOf: { fontFamily: F.semibold, fontSize: 13, color: T.text3 },
  track: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 16, overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2 },
  row2: { flexDirection: 'row', gap: 10, marginTop: 18 },
  primary: { height: 48, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: F.bold, fontSize: 14.5, color: '#07070F' },
  ghost: { height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', ...glass },
  ghostText: { fontFamily: F.bold, fontSize: 14.5, color: '#fff' },
  note: { fontFamily: F.body, fontSize: 13, lineHeight: 19, color: T.text2, marginTop: 14, textAlign: 'center' },
  faceName: { fontFamily: F.bold, fontSize: 13, color: '#fff' },
  faceState: { fontFamily: F.semibold, fontSize: 11.5, color: T.text3 },
  banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 16, padding: 12, paddingLeft: 16, borderRadius: 16, ...glass },
  bannerText: { flex: 1, fontFamily: F.semibold, fontSize: 13.5, color: '#fff' },
  recap: { alignItems: 'center', marginTop: 20 },
  sysWrap: { alignItems: 'center', marginVertical: 8 },
  sys: { fontFamily: F.semibold, fontSize: 12, color: T.text2, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, overflow: 'hidden', ...glass },
  reacts: { fontSize: 22 },
  stamp: { fontFamily: F.body, fontSize: 10.5, color: T.text3, marginTop: 3, marginHorizontal: 4 },
  req: { maxWidth: '80%', padding: 12, borderRadius: 16, marginVertical: 4, ...glass },
  reqText: { fontFamily: F.bold, fontSize: 14, color: '#fff' },
  bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  mine: { backgroundColor: '#fff', borderBottomRightRadius: 6 },
  theirs: { backgroundColor: 'rgba(255,255,255,0.09)', borderBottomLeftRadius: 6 },
  msg: { fontFamily: F.body, fontSize: 14.5, lineHeight: 20, color: '#fff' },
  tray: { gap: 8, paddingHorizontal: 14, paddingVertical: 8 },
  chip: { height: 34, paddingHorizontal: 13, borderRadius: 17, justifyContent: 'center', ...glass },
  chipText: { fontFamily: F.bold, fontSize: 12.5, color: '#fff' },
  emojis: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 18, paddingBottom: 6 },
  composer: { paddingHorizontal: 12, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hairline },
  input: { flex: 1, maxHeight: 110, minHeight: 44, color: '#fff', fontFamily: F.body, fontSize: 15, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, borderRadius: 22, ...glass },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  mic: { ...glass },
  err: { position: 'absolute', top: 110, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(20,20,28,0.95)', borderWidth: 1, borderColor: 'rgba(255,138,138,0.4)' },
  errText: { fontFamily: F.semibold, fontSize: 12.5, color: '#ff8a8a' },
});
