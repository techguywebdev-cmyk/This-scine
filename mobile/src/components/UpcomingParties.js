import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { Avatar, Poster, SectionLabel } from './Ui';
import { useApi } from '../lib/api';
import { useAccent } from '../lib/accent';
import { F, T } from '../lib/theme';

const when = (iso) => {
  const d = new Date(iso), now = new Date(), tmr = new Date(); tmr.setDate(now.getDate() + 1);
  const t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  if (d.toDateString() === now.toDateString()) return `Today ${t}`;
  if (d.toDateString() === tmr.toDateString()) return `Tomorrow ${t}`;
  return `${d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })} ${t}`;
};
const until = (iso) => {
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 10 * 60000) return 'Open now';
  const h = Math.round(ms / 3600000);
  if (h < 1) return `in ${Math.round(ms / 60000)} min`;
  if (h < 24) return `in ${h}h`;
  const d = Math.round(h / 24); return `in ${d} day${d === 1 ? '' : 's'}`;
};

// Scheduled watch parties you're in, at the top of the Friends feed (like the web)
export default function UpcomingParties() {
  const { isSignedIn } = useAuth();
  const api = useApi();
  const accent = useAccent();
  const [list, setList] = useState([]);
  useFocusEffect(useCallback(() => {
    if (!isSignedIn) return;
    api.get('/api/party?upcoming=1').then((d) => setList(d.upcoming || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]));
  if (!list.length) return null;
  return (
    <View style={{ marginTop: 6 }}>
      <SectionLabel>Upcoming watch parties</SectionLabel>
      {list.map((p) => (
        <Pressable key={p.id} onPress={() => router.push({ pathname: '/party/[id]', params: { id: p.id } })} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
          <View>
            <Poster uri={p.movie?.poster} width={44} />
            <View style={styles.face}><Avatar uri={p.peer?.avatar_url} name={p.peer?.display_name} size={22} /></View>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.title} numberOfLines={1}>{p.movie?.title}</Text>
            <Text style={styles.meta} numberOfLines={1}>🗓 {when(p.scheduled_for)} · with {p.peer?.display_name || 'a friend'}{p.status === 'invited' && !p.isHost ? ' · tap to answer' : p.status === 'invited' ? ' · awaiting reply' : ''}</Text>
          </View>
          <Text style={[styles.until, { color: accent }]}>{until(p.scheduled_for)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 },
  face: { position: 'absolute', right: -8, bottom: -6, borderRadius: 14, borderWidth: 2, borderColor: T.bg },
  title: { fontFamily: F.displayHeavy, fontSize: 15.5, color: '#fff' },
  meta: { fontFamily: F.body, fontSize: 12.5, color: T.text2, marginTop: 3 },
  until: { fontFamily: F.bold, fontSize: 13 },
});
