import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth, useUser } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import { Avatar } from './Ui';
import { useApi } from '../lib/api';
import { statusCache } from '../lib/statusCache';
import { F, T } from '../lib/theme';

// Stories-style row: you first (tap to add), then friends with fresh statuses (white ring = new)
export default function StatusRow() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const api = useApi();
  const [people, setPeople] = useState([]);

  useFocusEffect(useCallback(() => {
    if (!isSignedIn) return;
    api.get('/api/status').then((d) => { setPeople(d.people || []); statusCache.people = d.people || []; }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]));

  if (!isSignedIn) return null;
  const mine = people.find((p) => p.isSelf);
  const others = people.filter((p) => !p.isSelf);
  const open = (uid) => router.push({ pathname: '/status/[userId]', params: { userId: uid } });

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginTop: 18 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}>
      <View style={styles.item}>
        <Pressable onPress={() => (mine ? open(mine.user_id) : router.push('/status/new'))} accessibilityLabel={mine ? 'View your status' : 'Add a status'}>
          <View style={[styles.ring, { borderColor: mine ? 'rgba(255,255,255,0.35)' : 'transparent' }]}><Avatar uri={user?.imageUrl} name={user?.firstName} size={58} /></View>
        </Pressable>
        <Pressable onPress={() => router.push('/status/new')} style={styles.plus} accessibilityLabel="Add a status"><Feather name="plus" size={13} color="#07070F" /></Pressable>
        <Text style={styles.name} numberOfLines={1}>Your status</Text>
      </View>
      {others.map((p) => (
        <Pressable key={p.user_id} onPress={() => open(p.user_id)} style={styles.item}>
          <View style={[styles.ring, { borderColor: p.allSeen ? 'rgba(255,255,255,0.2)' : '#fff' }]}><Avatar uri={p.avatar_url} name={p.display_name} size={58} /></View>
          <Text style={[styles.name, !p.allSeen && { color: '#fff', fontFamily: F.bold }]} numberOfLines={1}>{(p.display_name || p.username || '').split(' ')[0]}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  item: { width: 68, alignItems: 'center' },
  ring: { borderWidth: 2, borderRadius: 34, padding: 3 },
  plus: { position: 'absolute', top: 46, right: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: T.bg },
  name: { fontFamily: F.semibold, fontSize: 11.5, color: T.text2, marginTop: 6 },
});
