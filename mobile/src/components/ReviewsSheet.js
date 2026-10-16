import { useThemed } from '../lib/userTheme';
import { useEffect, useRef, useState } from 'react';
import { MentionSuggest, MentionText, applyMention } from './Mentions';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import Ambient from './Ambient';
import { Avatar } from './Ui';
import { TsLoader } from './Brand';
import { useApi } from '../lib/api';
import { F, T } from '../lib/theme';

const ago = (ts) => { const m = Math.floor((Date.now() - new Date(ts)) / 60000); if (m < 1) return 'now'; if (m < 60) return `${m}m`; const h = Math.floor(m / 60); if (h < 24) return `${h}h`; const d = Math.floor(h / 24); return d < 30 ? `${d}d` : new Date(ts).toLocaleDateString([], { day: 'numeric', month: 'short' }); };
const Stars = ({ n, size = 11 }) => (n > 0 ? <Text style={{ color: '#FFD166', fontSize: size, letterSpacing: 1 }}>{'★'.repeat(n)}<Text style={{ color: 'rgba(255,255,255,0.2)' }}>{'★'.repeat(5 - n)}</Text></Text> : null);

// Reviews & replies for a title (same /api/reviews as the website's comment panel)
export default function ReviewsSheet({ movie, onClose }) {
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const api = useApi();
  const accent = useThemed(movie?.accent || T.accent);
  const [list, setList] = useState(null);
  const [text, setText] = useState('');
  const mentions = useRef([]);
  const [rating, setRating] = useState(0);
  const [replyTo, setReplyTo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = () => api.get(`/api/reviews?movieId=${movie.id}`).then((d) => setList(d.comments || [])).catch(() => setList([]));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [movie?.id]);

  const post = async () => {
    if (!isSignedIn) { onClose(); router.push('/sign-in'); return; }
    if (!text.trim() || busy) return;
    setBusy(true); setErr('');
    try {
      await api.post('/api/reviews', { movieId: movie.id, movieTitle: movie.title, moviePoster: movie.poster || null, mediaType: movie.isTV ? 'tv' : 'movie', text: text.trim(), rating: replyTo ? 0 : rating, parentId: replyTo?.id || null, mentions: mentions.current.filter((m) => text.includes(`@${m.handle}`)) });
      setText(''); mentions.current = []; setRating(0); setReplyTo(null);
      await load();
    } catch (e) { setErr(e.message || 'Couldn’t post'); }
    setBusy(false);
  };
  const remove = async (id) => { setList((p) => (p || []).filter((c) => c.id !== id).map((c) => ({ ...c, replies: (c.replies || []).filter((r) => r.id !== id) }))); api.del('/api/reviews', { id }).catch(() => load()); };

  const Item = ({ c, reply }) => (
    <View style={[styles.item, reply && { marginLeft: 44, paddingTop: 10 }]}>
      <Avatar uri={c.avatar_url} name={c.username} size={reply ? 28 : 36} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={styles.user} onPress={() => { onClose(); router.push({ pathname: '/person/[id]', params: { id: c.user_id || c.username } }); }} suppressHighlighting>@{c.username}</Text>
          <Stars n={c.rating} />
          <Text style={styles.time}>{ago(c.created_at)}</Text>
        </View>
        <MentionText text={c.text} accent={accent} style={styles.text} />
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
          {!reply ? <Pressable onPress={() => setReplyTo(c)} hitSlop={6}><Text style={styles.act}>Reply</Text></Pressable> : null}
          {c.isSelf ? <Pressable onPress={() => remove(c.id)} hitSlop={6}><Text style={[styles.act, { color: '#ff8a8a' }]}>Delete</Text></Pressable> : null}
        </View>
      </View>
    </View>
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetWrap} pointerEvents="box-none">
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 10 }]}>
          <Ambient accent={accent} style={{ borderTopLeftRadius: 22, borderTopRightRadius: 22 }} />
          <View style={styles.grab} />
          <View style={styles.head}>
            <Text style={styles.title}>Reviews</Text>
            <Text style={styles.count}>{list ? list.length : ''}</Text>
            <View style={{ flex: 1 }} />
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close"><Feather name="x" size={22} color="#fff" /></Pressable>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
            {list === null ? <View style={{ paddingVertical: 40, alignItems: 'center' }}><TsLoader size={36} /></View>
              : list.length === 0 ? <Text style={styles.empty}>No reviews yet. Be the first to say what you think of {movie.title}.</Text>
              : list.map((c) => <View key={c.id}><Item c={c} />{(c.replies || []).map((r) => <Item key={r.id} c={r} reply />)}</View>)}
          </ScrollView>
          {replyTo ? (
            <View style={styles.replyBar}><Text style={styles.replyText} numberOfLines={1}>Replying to @{replyTo.username}</Text><Pressable onPress={() => setReplyTo(null)} hitSlop={8}><Feather name="x" size={15} color={T.text2} /></Pressable></View>
          ) : (
            <View style={styles.rateRow}>
              <Text style={styles.rateLabel}>Your rating</Text>
              {[1, 2, 3, 4, 5].map((n) => <Pressable key={n} onPress={() => setRating(rating === n ? 0 : n)} hitSlop={4}><Feather name="star" size={20} color={rating >= n ? '#FFD166' : 'rgba(255,255,255,0.25)'} /></Pressable>)}
            </View>
          )}
          {err ? <Text style={styles.err}>{err}</Text> : null}
          <MentionSuggest value={text} accent={accent} onPick={(u) => { mentions.current = [...mentions.current, { user_id: u.user_id, handle: u.username }]; setText((v) => applyMention(v, u)); }} />
          <View style={styles.inputRow}>
            <TextInput value={text} onChangeText={setText} placeholder={isSignedIn ? (replyTo ? 'Write a reply…' : 'What did you think?') : 'Sign in to review'} placeholderTextColor="rgba(255,255,255,0.35)" multiline maxLength={1000} style={styles.input} editable={isSignedIn} onPressIn={() => !isSignedIn && (onClose(), router.push('/sign-in'))} />
            <Pressable onPress={post} disabled={busy || !text.trim()} style={[styles.send, { opacity: text.trim() ? 1 : 0.35 }]} accessibilityLabel="Post review"><Feather name="arrow-up" size={18} color="#07070F" /></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const glass = { backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' };
const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { height: '78%', paddingHorizontal: 18, paddingTop: 10, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden', backgroundColor: T.bg },
  grab: { width: 34, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'center', marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.hairlineStrong },
  title: { fontFamily: F.displayHeavy, fontSize: 20, color: '#fff' },
  count: { fontFamily: F.semibold, fontSize: 13, color: T.text3 },
  item: { flexDirection: 'row', gap: 10, paddingTop: 16 },
  user: { fontFamily: F.bold, fontSize: 13, color: '#fff' },
  time: { fontFamily: F.body, fontSize: 11.5, color: T.text3 },
  text: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.88)', marginTop: 4 },
  act: { fontFamily: F.semibold, fontSize: 12, color: T.text2 },
  empty: { fontFamily: F.body, fontSize: 13.5, color: T.text2, textAlign: 'center', paddingVertical: 40, paddingHorizontal: 20, lineHeight: 20 },
  replyBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  replyText: { fontFamily: F.semibold, fontSize: 12.5, color: T.text2, flex: 1 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  rateLabel: { fontFamily: F.semibold, fontSize: 12.5, color: T.text2, marginRight: 4 },
  err: { fontFamily: F.body, fontSize: 12, color: '#ff8a8a', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, minHeight: 44, maxHeight: 110, color: '#fff', fontFamily: F.body, fontSize: 15, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, borderRadius: 22, ...glass },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
});
