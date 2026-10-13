import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ambient from '../components/Ambient';
import { Avatar, Empty, GlassButton } from '../components/Ui';
import { TsLoader } from '../components/Brand';
import { useApi } from '../lib/api';
import { F, T } from '../lib/theme';

const ago = (ts) => {
  const m = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (m < 1) return 'now'; if (m < 60) return `${m}m`; const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d`; return new Date(ts).toLocaleDateString([], { day: 'numeric', month: 'short' });
};

export default function Inbox() {
  const insets = useSafeAreaInsets();
  const api = useApi();
  const [list, setList] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef(null);

  const load = useCallback(async () => {
    try { const d = await api.get('/api/messages'); setList(d.conversations || []); } catch { setList((p) => p || []); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    timer.current = setInterval(load, 10000);
    return () => clearInterval(timer.current);
  }, [load]));

  return (
    <View style={{ flex: 1 }}>
      <Ambient />
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <GlassButton icon="chevron-left" label="Back" onPress={() => router.back()} />
      </View>
      {list === null ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><TsLoader size={44} /></View> : (
        <FlatList
          data={list}
          keyExtractor={(c) => c.peer_id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor="#fff" />}
          ListHeaderComponent={<Text style={styles.h1}>Messages</Text>}
          ListEmptyComponent={<Empty title="No messages yet" sub="Open a friend’s profile and tap Message to start a conversation." />}
          renderItem={({ item: c, index }) => (
            <Pressable onPress={() => router.push({ pathname: '/chat/[id]', params: { id: c.peer_id, name: c.display_name, avatar: c.avatar_url || '' } })} style={({ pressed }) => [styles.row, index > 0 && styles.border, { opacity: pressed ? 0.6 : 1 }]}>
              <Avatar uri={c.avatar_url} name={c.display_name} size={48} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.name, c.unread && { fontFamily: F.displayHeavy }]} numberOfLines={1}>{c.display_name || c.username}</Text>
                  <Text style={styles.time}>{ago(c.last_at)}</Text>
                </View>
                <Text style={[styles.preview, c.unread && { color: '#fff', fontFamily: F.semibold }]} numberOfLines={1}>{c.from_me ? 'You: ' : ''}{c.last_text}</Text>
              </View>
              {c.unread ? <View style={styles.dot} /> : null}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: 20, paddingBottom: 4 },
  h1: { fontFamily: F.displayHeavy, fontSize: 28, color: '#fff', letterSpacing: -0.5, marginTop: 14, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13 },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hairline },
  name: { flexShrink: 1, fontFamily: F.bold, fontSize: 15, color: '#fff' },
  time: { fontFamily: F.body, fontSize: 11.5, color: T.text3 },
  preview: { fontFamily: F.body, fontSize: 13, color: T.text2, marginTop: 3 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#fff' },
});
