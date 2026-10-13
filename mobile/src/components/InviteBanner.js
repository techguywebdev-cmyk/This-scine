import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/expo';
import * as Haptics from 'expo-haptics';
import { Poster } from './Ui';
import { useApi } from '../lib/api';
import { F } from '../lib/theme';

// Slides down when a friend invites you to a watch party (checked every 20s while the app is open)
export default function InviteBanner() {
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const api = useApi();
  const [inv, setInv] = useState(null);
  const dismissed = useRef(new Set());
  const y = useRef(new Animated.Value(-200)).current;

  const check = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const d = await api.get('/api/party?pending=1');
      const next = (d.pending || []).find((x) => !dismissed.current.has(x.id));
      if (next && next.id !== inv?.id) {
        setInv(next);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        Animated.spring(y, { toValue: 0, useNativeDriver: true, friction: 9 }).start();
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, inv?.id]);
  useEffect(() => { check(); const t = setInterval(check, 20000); return () => clearInterval(t); }, [check]);

  const hide = (then) => { if (inv) dismissed.current.add(inv.id); Animated.timing(y, { toValue: -200, duration: 220, useNativeDriver: true }).start(() => { setInv(null); then?.(); }); };
  if (!inv) return null;
  const host = (inv.host?.display_name || 'A friend').split(' ')[0];
  return (
    <Animated.View style={[styles.wrap, { top: insets.top + 8, transform: [{ translateY: y }] }]}>
      <Poster uri={inv.movie?.poster} width={40} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.t1} numberOfLines={1}>{host} wants to watch 🍿</Text>
        <Text style={styles.t2} numberOfLines={1}>{inv.movie?.title}</Text>
      </View>
      <Pressable onPress={() => hide()} hitSlop={6} style={styles.later}><Text style={styles.laterText}>Later</Text></Pressable>
      <Pressable onPress={() => hide(() => router.push({ pathname: '/party/[id]', params: { id: inv.id } }))} style={styles.join}><Text style={styles.joinText}>Open</Text></Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 50, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 18, backgroundColor: 'rgba(14,14,22,0.96)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', elevation: 12 },
  t1: { fontFamily: F.bold, fontSize: 13.5, color: '#fff' },
  t2: { fontFamily: F.body, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  later: { height: 34, paddingHorizontal: 10, justifyContent: 'center' },
  laterText: { fontFamily: F.semibold, fontSize: 12.5, color: 'rgba(255,255,255,0.6)' },
  join: { height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: '#fff', justifyContent: 'center' },
  joinText: { fontFamily: F.bold, fontSize: 12.5, color: '#07070F' },
});
