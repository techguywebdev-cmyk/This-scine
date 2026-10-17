import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Ambient from '../components/Ambient';
import { Avatar, Empty, Spinner } from '../components/Ui';
import { useApi } from '../lib/api';
import { useAccent } from '../lib/accent';
import { setUnreadNotifs } from '../lib/notifs';
import { F, T } from '../lib/theme';

const ago = (ts) => { const m = Math.floor((Date.now() - new Date(ts)) / 60000); if (m < 1) return 'now'; if (m < 60) return `${m}m`; const h = Math.floor(m / 60); if (h < 24) return `${h}h`; return `${Math.floor(h / 24)}d`; };
const ICON = { follow: ['user-plus', '#7BC8FF'], follow_request: ['user-plus', null], like: ['heart', '#FF6B8A'], message_request: ['message-circle', '#7BC8FF'], message: ['message-circle', '#7BC8FF'], release_reminder: ['calendar', '#FFD166'], mention: ['at-sign', null] };

export default function Notifications() {
  const insets = useSafeAreaInsets();
  const api = useApi();
  const accent = useAccent();
  const [items, setItems] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.get('/api/notifications');
      const list = d.items || [];
      setItems(list);
      setUnreadNotifs(list.filter((n) => !n.read).length);
    } catch { setItems((p) => p || []); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markRead = (n) => {
    if (n.read) return;
    setItems((p) => { const next = p.map((x) => (x.id === n.id ? { ...x, read: true } : x)); setUnreadNotifs(next.filter((x) => !x.read).length); return next; });
    api.patch('/api/notifications', { id: n.id }).catch(() => {});
  };
  const markAll = () => { (items || []).filter((n) => !n.read).forEach(markRead); };

  const followBack = async (n) => {
    setItems((p) => p.map((x) => (x.id === n.id ? { ...x, followedBack: true } : x)));
    try { await api.post('/api/follows', { targetId: n.user_id }); } catch { setItems((p) => p.map((x) => (x.id === n.id ? { ...x, followedBack: false } : x))); }
  };
  const openChat = (n) => router.push({ pathname: '/chat/[id]', params: { id: n.user_id, name: n.username, avatar: n.avatar_url || '' } });
  const openPerson = (n) => router.push({ pathname: '/person/[id]', params: { id: n.user_id } });
  const openFilm = (n, tab) => {
    const d = n.data || {};
    if (!d.movie_id) return openPerson(n);
    router.push({ pathname: '/title/[type]/[id]', params: { type: d.media_type === 'tv' ? 'tv' : 'movie', id: String(d.movie_id), title: d.title || '', ...(tab ? { tab } : {}) } });
  };

  const press = (n) => {
    markRead(n);
    if (n.type === 'mention' || n.type === 'like') return openFilm(n, 'comments');
    if (n.type === 'release_reminder') return openFilm(n);
    if (n.type === 'message' || n.type === 'message_request') return openChat(n);
    return openPerson(n);
  };

  const unread = (items || []).filter((n) => !n.read).length;

  const renderItem = ({ item: n }) => {
    const [icon, c] = ICON[n.type] || ['bell', null];
    const color = c || accent;
    const who = <Text style={styles.b}>@{n.username || 'someone'}</Text>;
    const line = n.type === 'release_reminder' ? <Text style={styles.text}><Text style={styles.b}>{n.data?.title || 'A film you saved'}</Text> {n.data?.when === 'tomorrow' ? 'releases tomorrow' : 'is out today'}</Text>
      : n.type === 'mention' ? <Text style={styles.text}>{who} mentioned you{n.data?.title ? <> on <Text style={styles.b}>{n.data.title}</Text></> : ''}</Text>
      : <Text style={styles.text}>{who} {n.type === 'follow' ? 'started following you' : n.type === 'follow_request' ? 'requested to follow you' : n.type === 'message_request' ? 'sent you a message request' : n.type === 'message' ? 'sent you a message' : n.type === 'like' ? 'liked your review' : 'sent you a notification'}</Text>;
    return (
      <Pressable onPress={() => press(n)} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
        <View>
          {n.type === 'release_reminder' && n.data?.poster ? <Image source={{ uri: n.data.poster }} style={styles.poster} contentFit="cover" />
            : n.avatar_url ? <Avatar uri={n.avatar_url} name={n.username} size={42} />
            : <View style={[styles.iconDot, { backgroundColor: `${color}1c`, borderColor: `${color}55` }]}><Feather name={icon} size={17} color={color} /></View>}
          {n.avatar_url && n.type !== 'release_reminder' ? <View style={[styles.badge, { backgroundColor: color }]}><Feather name={icon} size={9} color="#07070F" /></View> : null}
        </View>
        <View style={{ flex: 1 }}>
          {line}
          {n.type === 'mention' && n.data?.snippet ? <Text style={styles.snippet} numberOfLines={2}>“{n.data.snippet}”</Text> : null}
          <Text style={styles.time}>{ago(n.created_at)}</Text>
        </View>
        {n.type === 'follow' && !n.followedBack ? (
          <Pressable onPress={() => followBack(n)} hitSlop={6} style={[styles.pill, { backgroundColor: `${accent}2e`, borderColor: `${accent}99` }]}><Text style={styles.pillText}>Follow back</Text></Pressable>
        ) : (n.type === 'message' || n.type === 'message_request') ? (
          <Pressable onPress={() => { markRead(n); openChat(n); }} hitSlop={6} style={styles.pill}><Text style={styles.pillText}>Reply</Text></Pressable>
        ) : n.type === 'mention' && n.data?.poster ? <Image source={{ uri: n.data.poster }} style={styles.thumb} contentFit="cover" /> : null}
        {!n.read ? <View style={[styles.dot, { backgroundColor: accent }]} /> : null}
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <Ambient accent={accent} />
      <View style={[styles.head, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back} accessibilityLabel="Back"><Feather name="arrow-left" size={19} color="#fff" /></Pressable>
        <View style={{ flex: 1 }} />
        {unread ? <Pressable onPress={markAll} hitSlop={8}><Text style={[styles.markAll, { color: accent }]}>Mark all read</Text></Pressable> : null}
      </View>
      <Text style={[styles.eyebrow, { color: accent }]}>{unread ? `${unread} NEW` : 'ALL CAUGHT UP'}</Text>
      <Text style={styles.h1}>Notifications</Text>
      {items === null ? <Spinner accent={accent} /> : (
        <FlatList data={items} keyExtractor={(n, i) => String(n.id || i)} renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor="#fff" colors={['#fff']} progressBackgroundColor="#1A1A22" onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          ListEmptyComponent={<View style={{ paddingTop: 40 }}><Empty icon="bell" title="No notifications yet" sub="New followers, mentions and activity show up here." /></View>} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  markAll: { fontFamily: F.bold, fontSize: 13 },
  eyebrow: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 2.2, marginTop: 18, paddingHorizontal: 20 },
  h1: { fontFamily: F.displayHeavy, fontSize: 28, letterSpacing: -0.7, color: '#fff', marginTop: 4, marginBottom: 8, paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.08)' },
  iconDot: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  poster: { width: 42, height: 60, borderRadius: 6 },
  thumb: { width: 30, height: 45, borderRadius: 4 },
  badge: { position: 'absolute', right: -3, bottom: -3, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: T.bg },
  text: { fontFamily: F.body, fontSize: 13.5, lineHeight: 19, color: 'rgba(255,255,255,0.9)' },
  b: { fontFamily: F.bold, color: '#fff' },
  snippet: { fontFamily: F.body, fontSize: 12.5, lineHeight: 18, color: 'rgba(255,255,255,0.6)', marginTop: 3 },
  time: { fontFamily: F.body, fontSize: 11.5, color: 'rgba(255,255,255,0.4)', marginTop: 3 },
  pill: { height: 32, paddingHorizontal: 13, borderRadius: 16, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  pillText: { fontFamily: F.bold, fontSize: 12, color: '#fff' },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
