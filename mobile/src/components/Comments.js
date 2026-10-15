import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import { Avatar } from './Ui';
import { TsLoader } from './Brand';
import { useApi } from '../lib/api';
import { F, T } from '../lib/theme';

const ago = (ts) => { const m = Math.floor((Date.now() - new Date(ts)) / 60000); if (m < 1) return 'now'; if (m < 60) return `${m}m`; const h = Math.floor(m / 60); if (h < 24) return `${h}h`; const d = Math.floor(h / 24); return d < 30 ? `${d}d` : new Date(ts).toLocaleDateString([], { day: 'numeric', month: 'short' }); };
const Stars = ({ n }) => (n > 0 ? <Text style={{ color: '#FFD166', fontSize: 11, letterSpacing: 1 }}>{'★'.repeat(n)}<Text style={{ color: 'rgba(255,255,255,0.2)' }}>{'★'.repeat(5 - n)}</Text></Text> : null);

// Comments for a title, shared by the film page tab (same /api/reviews as the website)
export function useComments(movie) {
  const api = useApi();
  const [list, setList] = useState(null);
  const load = useCallback(() => (movie?.id ? api.get(`/api/reviews?movieId=${movie.id}`).then((d) => setList(d.comments || [])).catch(() => setList([])) : Promise.resolve()), [movie?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  const post = async ({ text, rating, parentId }) => {
    await api.post('/api/reviews', { movieId: movie.id, movieTitle: movie.title, moviePoster: movie.poster || null, mediaType: movie.isTV ? 'tv' : 'movie', text, rating: parentId ? 0 : rating, parentId: parentId || null });
    await load();
  };
  const remove = (id) => { setList((p) => (p || []).filter((c) => c.id !== id).map((c) => ({ ...c, replies: (c.replies || []).filter((r) => r.id !== id) }))); api.del('/api/reviews', { id }).catch(() => load()); };
  return { list, post, remove };
}

export function CommentList({ list, onReply, onRemove, title }) {
  const Item = ({ c, reply }) => (
    <View style={[styles.item, reply && { marginLeft: 44, paddingTop: 10 }]}>
      <Avatar uri={c.avatar_url} name={c.username} size={reply ? 28 : 36} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={styles.user}>@{c.username}</Text>
          <Stars n={c.rating} />
          <Text style={styles.time}>{ago(c.created_at)}</Text>
        </View>
        <Text style={styles.text}>{c.text}</Text>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
          {!reply ? <Pressable onPress={() => onReply(c)} hitSlop={6}><Text style={styles.act}>Reply</Text></Pressable> : null}
          {c.isSelf ? <Pressable onPress={() => onRemove(c.id)} hitSlop={6}><Text style={[styles.act, { color: '#ff8a8a' }]}>Delete</Text></Pressable> : null}
        </View>
      </View>
    </View>
  );
  if (list === null) return <View style={{ paddingVertical: 40, alignItems: 'center' }}><TsLoader size={36} /></View>;
  if (!list.length) return <Text style={styles.empty}>No comments yet. Be the first to say what you think of {title}.</Text>;
  return list.map((c) => <View key={c.id}><Item c={c} />{(c.replies || []).map((r) => <Item key={r.id} c={r} reply />)}</View>);
}

export function Composer({ onPost, replyTo, onCancelReply, accent = '#fff' }) {
  const { isSignedIn } = useAuth();
  const [text, setText] = useState('');
  const [rating, setRating] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const send = async () => {
    if (!isSignedIn) { router.push('/sign-in'); return; }
    if (!text.trim() || busy) return;
    setBusy(true); setErr('');
    try { await onPost({ text: text.trim(), rating, parentId: replyTo?.id }); setText(''); setRating(0); onCancelReply?.(); }
    catch (e) { setErr(e.message || 'Couldn’t post'); }
    setBusy(false);
  };
  return (
    <View>
      {replyTo ? (
        <View style={styles.replyBar}><Text style={styles.replyText} numberOfLines={1}>Replying to @{replyTo.username}</Text><Pressable onPress={onCancelReply} hitSlop={8}><Feather name="x" size={15} color={T.text2} /></Pressable></View>
      ) : (
        <View style={styles.rateRow}>
          <Text style={styles.rateLabel}>Your rating</Text>
          {[1, 2, 3, 4, 5].map((n) => <Pressable key={n} onPress={() => setRating(rating === n ? 0 : n)} hitSlop={4}><Feather name="star" size={19} color={rating >= n ? accent : 'rgba(255,255,255,0.25)'} /></Pressable>)}
        </View>
      )}
      {err ? <Text style={styles.err}>{err}</Text> : null}
      <View style={styles.inputRow}>
        <TextInput value={text} onChangeText={setText} placeholder={isSignedIn ? (replyTo ? 'Write a reply…' : 'Add a comment…') : 'Sign in to comment'} placeholderTextColor="rgba(255,255,255,0.35)" multiline maxLength={1000} style={styles.input} editable={!!isSignedIn} onPressIn={() => !isSignedIn && router.push('/sign-in')} />
        <Pressable onPress={send} disabled={busy || !text.trim()} style={[styles.send, { opacity: text.trim() ? 1 : 0.35 }]} accessibilityLabel="Post comment"><Feather name="arrow-up" size={18} color="#07070F" /></Pressable>
      </View>
    </View>
  );
}

const glass = { backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' };
const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: 10, paddingTop: 16 },
  user: { fontFamily: F.bold, fontSize: 13, color: '#fff' },
  time: { fontFamily: F.body, fontSize: 11.5, color: T.text3 },
  text: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.88)', marginTop: 4 },
  act: { fontFamily: F.semibold, fontSize: 12, color: T.text2 },
  empty: { fontFamily: F.body, fontSize: 13.5, color: T.text2, textAlign: 'center', paddingVertical: 36, paddingHorizontal: 20, lineHeight: 20 },
  replyBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  replyText: { fontFamily: F.semibold, fontSize: 12.5, color: T.text2, flex: 1 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  rateLabel: { fontFamily: F.semibold, fontSize: 12.5, color: T.text2, marginRight: 4 },
  err: { fontFamily: F.body, fontSize: 12, color: '#ff8a8a', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, minHeight: 44, maxHeight: 110, color: '#fff', fontFamily: F.body, fontSize: 15, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, borderRadius: 22, ...glass },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
});
