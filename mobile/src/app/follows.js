import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Ambient from '../components/Ambient';
import { Avatar, Empty, Spinner, Tabs } from '../components/Ui';
import { useApi } from '../lib/api';
import { useAccent } from '../lib/accent';
import { F, T } from '../lib/theme';

// Followers / following for you or anyone (same as the website's follow list)
export default function Follows() {
  const { type: start = 'followers', userId = '', name = '' } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const api = useApi();
  const accent = useAccent();
  const [type, setType] = useState(start === 'following' ? 'following' : 'followers');
  const [lists, setLists] = useState({});
  useEffect(() => {
    if (lists[type]) return;
    api.get(`/api/follows?type=${type}${userId ? `&targetUserId=${encodeURIComponent(userId)}` : ''}`)
      .then((d) => setLists((l) => ({ ...l, [type]: d.users || [] }))).catch(() => setLists((l) => ({ ...l, [type]: [] })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);
  const list = lists[type];
  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <Ambient accent={accent} />
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 20 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back} accessibilityLabel="Back"><Feather name="arrow-left" size={19} color="#fff" /></Pressable>
        <Text style={styles.h1}>{name ? String(name) : 'Your people'}</Text>
        <Tabs style={{ marginTop: 14 }} tabs={[['followers', 'Followers'], ['following', 'Following']]} value={type} onChange={setType} />
      </View>
      {!list ? <Spinner accent={accent} /> : (
        <FlatList data={list} keyExtractor={(u) => u.user_id} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 30 }}
          ListEmptyComponent={<View style={{ paddingTop: 40 }}><Empty icon="users" title={type === 'followers' ? 'No followers yet' : 'Not following anyone yet'} /></View>}
          renderItem={({ item: u, index }) => (
            <Pressable onPress={() => router.push({ pathname: '/person/[id]', params: { id: u.user_id } })} style={[styles.row, index && styles.border]}>
              <Avatar uri={u.avatar_url} name={u.display_name || u.username} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{u.display_name || u.username}</Text>
                <Text style={styles.meta} numberOfLines={1}>@{u.username}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={T.text3} />
            </Pressable>
          )} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  h1: { fontFamily: F.displayHeavy, fontSize: 28, letterSpacing: -0.7, color: '#fff', marginTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hairlineStrong },
  name: { fontFamily: F.bold, fontSize: 14, color: '#fff' },
  meta: { fontFamily: F.body, fontSize: 12, color: T.text2, marginTop: 2 },
});
