import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Ambient from '../../components/Ambient';
import StatusBackdrop from '../../components/StatusBackdrop';
import ActionSheet from '../../components/ActionSheet';
import { Avatar } from '../../components/Ui';
import { useApi } from '../../lib/api';
import { statusCache } from '../../lib/statusCache';
import { F, T, inkOn } from '../../lib/theme';

const DURATION = 5500;
const REACTS = ['😂', '😍', '🔥', '👏', '😮'];
const ago = (ts) => { const m = Math.floor((Date.now() - new Date(ts)) / 60000); if (m < 60) return `${Math.max(1, m)}m`; return `${Math.floor(m / 60)}h`; };

function VideoItem({ uri, paused, onProgress, onEnd }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false; p.play(); });
  useEffect(() => { paused ? player.pause() : player.play(); }, [paused, player]);
  useEffect(() => {
    const sub = player.addListener('playToEnd', onEnd);
    const t = setInterval(() => { if (player.duration) onProgress(Math.min(1, player.currentTime / player.duration)); }, 100);
    return () => { sub.remove(); clearInterval(t); };
  }, [player, onEnd, onProgress]);
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />;
}

export default function StatusViewer() {
  const { userId } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const api = useApi();
  const people = statusCache.people;
  const [pi, setPi] = useState(Math.max(0, people.findIndex((p) => p.user_id === userId)));
  const person = people[pi];
  const firstUnseen = (p) => Math.max(0, (p?.items || []).findIndex((i) => !i.seen));
  const [ii, setIi] = useState(() => firstUnseen(person));
  const [prog, setProg] = useState(0);
  const [held, setHeld] = useState(false);
  const [reply, setReply] = useState('');
  const [typing, setTyping] = useState(false);
  const [viewers, setViewers] = useState(null);
  const [toast, setToast] = useState('');
  const item = person?.items?.[ii];
  const paused = held || typing || viewers !== null;
  const started = useRef(0);
  const elapsed = useRef(0);

  const next = useCallback(() => {
    setProg(0); elapsed.current = 0;
    if (ii + 1 < (person?.items?.length || 0)) { setIi(ii + 1); return; }
    if (pi + 1 < people.length) { setPi(pi + 1); setIi(firstUnseen(people[pi + 1])); return; }
    router.back();
  }, [ii, pi, person, people]);
  const prev = () => {
    setProg(0); elapsed.current = 0;
    if (ii > 0) { setIi(ii - 1); return; }
    if (pi > 0) { setPi(pi - 1); setIi(0); }
  };

  // mark as seen
  useEffect(() => {
    if (!item || person.isSelf || item.seen) return;
    item.seen = true;
    api.post('/api/status', { view: item.id }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  // timer for text + photo statuses
  useEffect(() => {
    if (!item || item.kind === 'video' || paused) return;
    started.current = Date.now() - elapsed.current;
    const t = setInterval(() => {
      elapsed.current = Date.now() - started.current;
      const p = elapsed.current / DURATION;
      if (p >= 1) { clearInterval(t); next(); } else setProg(p);
    }, 50);
    return () => clearInterval(t);
  }, [item, paused, next]);

  const gone = !person || !item;
  useEffect(() => { if (gone) router.back(); }, [gone]);
  if (gone) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  const sendReply = async (text, reaction = false) => {
    if (!text.trim()) return;
    setReply(''); setTyping(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await api.post('/api/messages', { toUserId: person.user_id, msg_type: 'status_reply', text: text.trim(), meta: { status_id: item.id, kind: item.kind, text: item.text, media_url: item.media_url, bg: item.bg, reaction } });
      setToast(reaction ? `Sent ${text}` : 'Reply sent'); setTimeout(() => setToast(''), 1600);
    } catch { setToast('Couldn’t send'); setTimeout(() => setToast(''), 1600); }
  };
  const openViewers = async () => { setViewers([]); try { const d = await api.get(`/api/status?viewers=${item.id}`); setViewers(d.viewers || []); } catch {} };
  const remove = async () => {
    try { await api.del('/api/status', { id: item.id }); } catch {}
    person.items.splice(ii, 1);
    setViewers(null);
    if (!person.items.length) { router.back(); return; }
    setIi(Math.min(ii, person.items.length - 1)); setProg(0); elapsed.current = 0;
  };

  const bg = item.bg || T.accent;
  const noir = bg === '#E6E6EA';
  const ink = item.kind === 'text' && item.meta?.text?.color === '#07070F' ? '#07070F' : '#fff';
  const dark = ink !== '#fff' && ink !== '#FFFFFF';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#000' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* content */}
      {item.kind === 'text' ? (
        item.meta?.bgStyle === 'ambient' ? <Ambient accent={bg} /> : <StatusBackdrop bg={bg} />
      ) : null}
      {item.kind === 'image' ? <Image source={{ uri: item.media_url }} style={StyleSheet.absoluteFill} contentFit="contain" transition={150} /> : null}
      {item.kind === 'video' ? <VideoItem key={item.id} uri={item.media_url} paused={paused} onProgress={setProg} onEnd={next} /> : null}
      {item.kind === 'text' ? (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', padding: 30 }]} pointerEvents="none">
          <Text style={[styles.statusText, dark && { color: ink, textShadowRadius: 0 }, { fontSize: item.text?.length > 140 ? 22 : item.text?.length > 60 ? 28 : 36 }]}>{item.text}</Text>
        </View>
      ) : null}
      {item.kind !== 'text' && item.text ? <View style={[styles.caption, { bottom: insets.bottom + 90 }]} pointerEvents="none"><Text style={styles.captionText}>{item.text}</Text></View> : null}

      {/* tap zones */}
      <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', top: insets.top + 70, bottom: insets.bottom + 80 }]}>
        <Pressable style={{ width: width * 0.32 }} onPress={prev} onLongPress={() => setHeld(true)} onPressOut={() => setHeld(false)} delayLongPress={180} />
        <Pressable style={{ flex: 1 }} onPress={next} onLongPress={() => setHeld(true)} onPressOut={() => setHeld(false)} delayLongPress={180} />
      </View>

      {/* progress + header */}
      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.bars}>
          {person.items.map((it, i) => (
            <View key={it.id} style={[styles.barBg, dark && { backgroundColor: 'rgba(0,0,0,0.18)' }]}><View style={[styles.barFill, dark && { backgroundColor: ink }, { width: `${i < ii ? 100 : i === ii ? prog * 100 : 0}%` }]} /></View>
          ))}
        </View>
        <View style={styles.headRow}>
          <Pressable onPress={() => !person.isSelf && router.push({ pathname: '/person/[id]', params: { id: person.user_id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <Avatar uri={person.avatar_url} name={person.display_name} size={34} />
            <Text style={[styles.who, dark && { color: ink, textShadowRadius: 0 }]} numberOfLines={1}>{person.isSelf ? 'Your status' : person.display_name || person.username}</Text>
            <Text style={[styles.when, dark && { color: ink, opacity: 0.6 }]}>{ago(item.created_at)}</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Close"><Feather name="x" size={24} color={dark ? ink : '#fff'} /></Pressable>
        </View>
      </View>

      {toast ? <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}

      {/* bottom */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
        {person.isSelf ? (
          <Pressable onPress={openViewers} style={styles.viewsBtn}><Feather name="eye" size={16} color="#fff" /><Text style={styles.viewsText}>{item.views || 0} {item.views === 1 ? 'view' : 'views'}</Text><Feather name="chevron-up" size={16} color="#fff" /></Pressable>
        ) : (
          <>
            {!typing ? (
              <View style={styles.reacts}>{REACTS.map((e) => <Pressable key={e} onPress={() => sendReply(e, true)} hitSlop={6}><Text style={{ fontSize: 28 }}>{e}</Text></Pressable>)}</View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TextInput value={reply} onChangeText={setReply} onFocus={() => setTyping(true)} onBlur={() => setTyping(false)} placeholder={`Reply to ${(person.display_name || 'them').split(' ')[0]}…`} placeholderTextColor="rgba(255,255,255,0.6)" style={styles.input} onSubmitEditing={() => sendReply(reply)} returnKeyType="send" />
              {reply.trim() ? <Pressable onPress={() => sendReply(reply)} style={styles.send} accessibilityLabel="Send reply"><Feather name="arrow-up" size={18} color="#07070F" /></Pressable> : null}
            </View>
          </>
        )}
      </View>

      {viewers !== null ? (
        <ActionSheet visible onClose={() => setViewers(null)} title={`${item.views || 0} ${item.views === 1 ? 'view' : 'views'}`} sub="Who saw this status">
          <ScrollView style={{ maxHeight: 320 }}>
            {viewers.length === 0 ? <Text style={styles.empty}>No views yet</Text> : viewers.map((u) => (
              <View key={u.user_id} style={styles.viewerRow}><Avatar uri={u.avatar_url} name={u.display_name} size={36} /><Text style={styles.viewerName} numberOfLines={1}>{u.display_name || u.username}</Text><Text style={styles.when}>{ago(u.viewed_at)}</Text></View>
            ))}
          </ScrollView>
          <Pressable onPress={remove} style={styles.del}><Feather name="trash-2" size={16} color="#ff8a8a" /><Text style={styles.delText}>Delete this status</Text></Pressable>
        </ActionSheet>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const glass = { backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' };
const styles = StyleSheet.create({
  statusText: { fontFamily: F.displayHeavy, color: '#fff', textAlign: 'center', letterSpacing: -0.5, textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 12 },
  caption: { position: 'absolute', left: 20, right: 20, alignItems: 'center' },
  captionText: { fontFamily: F.semibold, fontSize: 15, color: '#fff', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, overflow: 'hidden' },
  top: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: 12 },
  bars: { flexDirection: 'row', gap: 4 },
  barBg: { flex: 1, height: 2.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  barFill: { height: 2.5, backgroundColor: '#fff' },
  headRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 4 },
  who: { fontFamily: F.bold, fontSize: 14.5, color: '#fff', flexShrink: 1, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 6 },
  when: { fontFamily: F.body, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, gap: 12 },
  reacts: { flexDirection: 'row', justifyContent: 'space-around' },
  input: { flex: 1, height: 46, borderRadius: 23, paddingHorizontal: 18, color: '#fff', fontFamily: F.body, fontSize: 15, ...glass },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  viewsBtn: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 16, borderRadius: 20, ...glass },
  viewsText: { fontFamily: F.bold, fontSize: 13.5, color: '#fff' },
  toast: { position: 'absolute', alignSelf: 'center', top: '45%', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.7)' },
  toastText: { fontFamily: F.bold, fontSize: 14, color: '#fff' },
  empty: { fontFamily: F.body, fontSize: 13, color: T.text2, paddingVertical: 20, textAlign: 'center' },
  viewerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  viewerName: { flex: 1, fontFamily: F.semibold, fontSize: 14, color: '#fff' },
  del: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 14, marginTop: 14, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  delText: { fontFamily: F.bold, fontSize: 14, color: '#ff8a8a' },
});
