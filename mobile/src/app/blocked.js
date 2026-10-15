import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ambient from '../components/Ambient';
import { Avatar, Empty, GlassButton, Spinner } from '../components/Ui';
import { useApi } from '../lib/api';
import { F, T } from '../lib/theme';

export default function Blocked() {
  const insets = useSafeAreaInsets();
  const api = useApi();
  const [list, setList] = useState(null);
  useEffect(() => { api.get('/api/safety').then((d) => setList(d.blocked || [])).catch(() => setList([])); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  const unblock = async (u) => {
    setList((p) => p.filter((x) => x.user_id !== u.user_id));
    try { await api.post('/api/safety', { action: 'unblock', userId: u.user_id }); } catch { setList((p) => [u, ...p]); }
  };
  return (
    <View style={{ flex: 1 }}>
      <Ambient />
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }}>
        <GlassButton icon="chevron-left" label="Back" onPress={() => router.back()} />
        <Text style={styles.h1}>Blocked accounts</Text>
        <Text style={styles.sub}>They can’t message you, see your profile, follow you or invite you to watch.</Text>
        {list === null ? <Spinner /> : list.length === 0 ? <Empty icon="shield" title="You haven’t blocked anyone" /> : list.map((u, i) => (
          <View key={u.user_id} style={[styles.row, i && styles.border]}>
            <Avatar uri={u.avatar_url} name={u.display_name} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{u.display_name}</Text>
              {u.username ? <Text style={styles.handle}>@{u.username}</Text> : null}
            </View>
            <Pressable onPress={() => unblock(u)} style={styles.btn}><Text style={styles.btnText}>Unblock</Text></Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontFamily: F.displayHeavy, fontSize: 26, color: '#fff', letterSpacing: -0.5, marginTop: 22 },
  sub: { fontFamily: F.body, fontSize: 13, color: T.text2, marginTop: 6, marginBottom: 10, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hairlineStrong },
  name: { fontFamily: F.bold, fontSize: 14, color: '#fff' },
  handle: { fontFamily: F.body, fontSize: 12, color: T.text2, marginTop: 2 },
  btn: { height: 34, paddingHorizontal: 14, borderRadius: 17, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  btnText: { fontFamily: F.bold, fontSize: 12, color: '#fff' },
});
