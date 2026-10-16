import { useEffect, useState, useSyncExternalStore } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Ambient from './Ambient';
import { Avatar } from './Ui';
import { useApi } from '../lib/api';
import { shareExternal } from '../lib/titles';
import { useThemed } from '../lib/userTheme';
import { F } from '../lib/theme';

// One share sheet for the whole app: send a film to friends in DMs, or share the link anywhere
let current = null;
const subs = new Set();
export const openShare = (movie) => { current = movie; subs.forEach((f) => f()); };
const close = () => { current = null; subs.forEach((f) => f()); };

export function ShareHost() {
  const movie = useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => current, () => current);
  return movie ? <ShareSheet movie={movie} onClose={close} /> : null;
}

function ShareSheet({ movie, onClose }) {
  const insets = useSafeAreaInsets();
  const api = useApi();
  const { isSignedIn } = useAuth();
  const accent = useThemed(movie.accent || '#F5A623');
  const [friends, setFriends] = useState(null);
  const [picked, setPicked] = useState(() => new Set());
  const [q, setQ] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState('');
  const type = movie.isTV || movie.mediaType === 'tv' || movie.is_tv ? 'tv' : 'movie';

  useEffect(() => {
    if (!isSignedIn) { setFriends([]); return; }
    Promise.all([
      api.get('/api/follows?type=following').catch(() => ({ users: [] })),
      api.get('/api/messages').catch(() => ({ conversations: [] })),
    ]).then(([f, m]) => {
      const map = new Map();
      (m.threads || m.conversations || []).forEach((t) => { const id = t.peer_id || t.user_id; if (id) map.set(id, { user_id: id, username: t.username || t.peer_username, display_name: t.display_name, avatar_url: t.avatar_url || t.peer_avatar }); });
      (f.users || []).forEach((u) => { if (!map.has(u.user_id)) map.set(u.user_id, u); });
      setFriends([...map.values()].filter((u) => u.username));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);
  useEffect(() => {
    if (q.trim().length < 2) return undefined;
    const t = setTimeout(() => api.get(`/api/follows?type=search&q=${encodeURIComponent(q.trim())}`).then((d) => setFriends((p) => { const have = new Set((p || []).map((u) => u.user_id)); return [...(p || []), ...(d.users || []).filter((u) => !have.has(u.user_id))]; })).catch(() => {}), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const shown = (friends || []).filter((u) => !q.trim() || `${u.username} ${u.display_name || ''}`.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (id) => { Haptics.selectionAsync().catch(() => {}); setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const send = async () => {
    if (!picked.size || sending) return;
    setSending(true);
    const meta = { id: movie.id, type, title: movie.title, poster: movie.poster || null, backdrop: movie.backdrop || null, year: movie.year || null, rating: movie.rating || null, accent: movie.accent || null };
    const ids = [...picked];
    await Promise.all(ids.map((id) => api.post('/api/messages', { toUserId: id, msg_type: 'title', text: movie.title, meta })
      .then(() => (note.trim() ? api.post('/api/messages', { toUserId: id, text: note.trim() }) : null)).catch(() => {})));
    setSending(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const first = (friends || []).find((u) => u.user_id === ids[0]);
    setDone(ids.length === 1 ? `Sent to ${first?.display_name || first?.username || '1 person'}` : `Sent to ${ids.length} people`);
    setTimeout(onClose, 1100);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.wrap} pointerEvents="box-none">
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 14 }]}>
          <Ambient accent={accent} style={{ borderTopLeftRadius: 22, borderTopRightRadius: 22 }} />
          <View style={styles.grab} />
          <View style={styles.head}>
            {movie.poster ? <Image source={{ uri: movie.poster }} style={styles.poster} contentFit="cover" /> : null}
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: accent }]}>SHARE</Text>
              <Text style={styles.title} numberOfLines={2}>{movie.title}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close"><Feather name="x" size={22} color="#fff" /></Pressable>
          </View>

          {!isSignedIn ? (
            <Pressable onPress={() => { onClose(); router.push('/sign-in'); }} style={styles.signin}><Text style={styles.signinText}>Sign in to send it to friends</Text></Pressable>
          ) : (
            <>
              <View style={styles.search}>
                <Feather name="search" size={16} color="rgba(255,255,255,0.5)" />
                <TextInput value={q} onChangeText={setQ} placeholder="Send to…" placeholderTextColor="rgba(255,255,255,0.38)" autoCapitalize="none" autoCorrect={false} style={styles.input} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 20, paddingVertical: 6 }} keyboardShouldPersistTaps="handled">
                {friends === null ? <Text style={styles.muted}>Loading…</Text> : shown.length === 0 ? <Text style={styles.muted}>{q ? 'No one found' : 'Follow people to send them films'}</Text> : shown.map((u) => {
                  const on = picked.has(u.user_id);
                  return (
                    <Pressable key={u.user_id} onPress={() => toggle(u.user_id)} style={{ width: 64, alignItems: 'center' }} accessibilityState={{ selected: on }} accessibilityLabel={u.display_name || u.username}>
                      <View style={[styles.ring, on && { borderColor: accent }]}>
                        <Avatar uri={u.avatar_url} name={u.display_name || u.username} size={52} />
                        {on ? <View style={[styles.check, { backgroundColor: accent }]}><Feather name="check" size={11} color="#07070F" /></View> : null}
                      </View>
                      <Text style={[styles.name, on && { color: '#fff' }]} numberOfLines={1}>{(u.display_name || u.username || '').split(' ')[0]}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              {picked.size ? (
                <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 10 }}>
                  <TextInput value={note} onChangeText={setNote} placeholder="Add a note (optional)" placeholderTextColor="rgba(255,255,255,0.38)" style={[styles.search, styles.input, { flex: 1, marginHorizontal: 0, marginTop: 0, paddingHorizontal: 16 }]} />
                  <Pressable onPress={send} disabled={sending} style={[styles.send, { backgroundColor: `${accent}33`, borderColor: `${accent}99` }]}>
                    <Text style={styles.sendText}>{sending ? 'Sending…' : `Send${picked.size > 1 ? ` (${picked.size})` : ''}`}</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          )}
          {done ? <Text style={styles.done}>{done}</Text> : null}
          <View style={styles.rule} />
          <Pressable onPress={() => shareExternal(movie)} style={styles.more}>
            <View style={styles.moreIcon}><Feather name="share-2" size={17} color="#fff" /></View>
            <Text style={styles.moreText}>Share link to other apps</Text>
            <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.4)" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  wrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden', backgroundColor: '#06060B', paddingTop: 10 },
  grab: { width: 34, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'center', marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, marginBottom: 12 },
  poster: { width: 42, height: 63, borderRadius: 6 },
  eyebrow: { fontFamily: F.bold, fontSize: 10, letterSpacing: 2.2 },
  title: { fontFamily: F.displayHeavy, fontSize: 19, color: '#fff', letterSpacing: -0.4, marginTop: 2 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, paddingHorizontal: 14, borderRadius: 23, marginHorizontal: 20, marginTop: 4, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  input: { flex: 1, color: '#fff', fontFamily: F.body, fontSize: 14.5, paddingVertical: 0 },
  ring: { borderRadius: 30, borderWidth: 2, borderColor: 'transparent', padding: 2 },
  check: { position: 'absolute', right: -1, bottom: -1, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#06060B' },
  name: { fontFamily: F.semibold, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 5, maxWidth: 64 },
  muted: { fontFamily: F.body, fontSize: 13, color: 'rgba(255,255,255,0.5)', paddingVertical: 18 },
  send: { height: 46, paddingHorizontal: 20, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  sendText: { fontFamily: F.bold, fontSize: 14, color: '#fff' },
  done: { fontFamily: F.semibold, fontSize: 13, color: '#7BFF9E', textAlign: 'center', marginTop: 10 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 16, marginHorizontal: 20 },
  more: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  moreIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  moreText: { flex: 1, fontFamily: F.bold, fontSize: 14, color: '#fff' },
  signin: { marginHorizontal: 20, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  signinText: { fontFamily: F.bold, fontSize: 14, color: '#fff' },
});
