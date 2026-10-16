import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ambient from './Ambient';
import { Avatar, Poster } from './Ui';
import { useApi } from '../lib/api';
import { openTitle } from '../lib/titles';
import { F } from '../lib/theme';

const dayPart = () => { const h = new Date().getHours(); return h < 12 ? 'This morning' : h < 17 ? 'This afternoon' : 'Tonight'; };
const ago = (ts) => { const m = Math.floor((Date.now() - new Date(ts)) / 60000); if (m < 60) return `${Math.max(1, m)}m`; const h = Math.floor(m / 60); return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`; };
const VERB = { watched: 'watched', saved: 'saved', reviewed: 'reviewed', list_follow: 'followed' };

function useSlide(show) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(a, { toValue: show ? 1 : 0, useNativeDriver: true, friction: 9 }).start(); }, [show, a]);
  return { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }] };
}

// The feed's two gentle popups, like the website: "Tonight for you" once a day, and "From friends" when there's something new
export default function FeedPopups({ accent, top, activeIndex = 0 }) {
  const api = useApi();
  const { isSignedIn } = useAuth();
  const [tonight, setTonight] = useState(false);
  const [pulse, setPulse] = useState([]);
  const [pulseOff, setPulseOff] = useState(false);
  const start = useRef(null);

  useEffect(() => {
    if (!isSignedIn) return undefined;
    let t1; let t2;
    const day = new Date().toISOString().slice(0, 10);
    AsyncStorage.getItem('thiscene.tonight.v1').then((v) => {
      if (v === day) return;
      t1 = setTimeout(() => { setTonight(true); AsyncStorage.setItem('thiscene.tonight.v1', day).catch(() => {}); }, 2200);
      t2 = setTimeout(() => setTonight(false), 9000);
    }).catch(() => {});
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn) return;
    api.get('/api/activity?type=feed').then(async (d) => {
      const list = (d.items || []).filter((i) => VERB[i.type] && i.movie_id).slice(0, 8);
      const newest = list[0]?.created_at ? new Date(list[0].created_at).getTime() : 0;
      const [seen, shown] = await Promise.all([AsyncStorage.getItem('thiscene.pulseSeen.v1'), AsyncStorage.getItem('thiscene.pulseShown.v1')]).catch(() => [0, 0]);
      if (!newest || newest <= Number(seen || 0) || Date.now() - Number(shown || 0) < 4 * 3600000) return;
      AsyncStorage.multiSet([['thiscene.pulseSeen.v1', String(newest)], ['thiscene.pulseShown.v1', String(Date.now())]]).catch(() => {});
      setTimeout(() => setPulse(list), 12000); // after the Tonight nudge has had its moment
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Step aside after two swipes so they never fight the feed
  useEffect(() => {
    if (!pulse.length || pulseOff) return;
    if (start.current == null) start.current = activeIndex;
    if (Math.abs(activeIndex - start.current) >= 2) setPulseOff(true);
  }, [activeIndex, pulse.length, pulseOff]);

  const tStyle = useSlide(tonight);
  const pShow = pulse.length > 0 && !pulseOff && !tonight;
  const pStyle = useSlide(pShow);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top }]}>
      {tonight ? (
        <Animated.View style={tStyle}>
          <Pressable onPress={() => { setTonight(false); router.navigate('/discover'); }} style={[styles.card, styles.row, { borderColor: `${accent}55` }]}>
            <Ambient accent={accent} style={{ borderRadius: 22 }} />
            <View style={[styles.icon, { backgroundColor: `${accent}22` }]}><Feather name="star" size={14} color={accent} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{dayPart()} for you</Text>
              <Text style={styles.sub}>Fresh picks from your platforms</Text>
            </View>
            <Pressable onPress={() => setTonight(false)} hitSlop={10} accessibilityLabel="Dismiss"><Feather name="x" size={14} color="rgba(255,255,255,0.5)" /></Pressable>
          </Pressable>
        </Animated.View>
      ) : null}
      {pShow ? (
        <Animated.View style={pStyle}>
          <View style={[styles.card, { borderColor: `${accent}44`, paddingVertical: 10 }]}>
            <Ambient accent={accent} style={{ borderRadius: 18 }} />
            <View style={[styles.row, { marginBottom: 8 }]}>
              <Feather name="users" size={12} color={accent} />
              <Text style={styles.eyebrow}>FROM FRIENDS</Text>
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => { setPulseOff(true); router.navigate('/friends'); }} hitSlop={8}><Text style={[styles.see, { color: accent }]}>See all</Text></Pressable>
              <Pressable onPress={() => setPulseOff(true)} hitSlop={10} accessibilityLabel="Dismiss" style={{ marginLeft: 10 }}><Feather name="x" size={14} color="rgba(255,255,255,0.5)" /></Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {pulse.map((i) => (
                <Pressable key={i.id || `${i.user_id}${i.movie_id}`} onPress={() => openTitle({ id: i.movie_id, title: i.movie_title, poster: i.movie_poster, accent: i.movie_accent })} style={styles.item}>
                  <Poster uri={i.movie_poster} width={30} />
                  <View style={{ maxWidth: 150 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Avatar uri={i.avatar_url} name={i.display_name || i.username} size={16} />
                      <Text style={styles.who} numberOfLines={1}>{(i.display_name || i.username || 'Friend').split(' ')[0]} <Text style={styles.verb}>{VERB[i.type]} · {ago(i.created_at)}</Text></Text>
                    </View>
                    <Text style={styles.film} numberOfLines={1}>{i.movie_title}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 20 },
  card: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, overflow: 'hidden', backgroundColor: '#06060B', elevation: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: F.bold, fontSize: 13, color: '#fff' },
  sub: { fontFamily: F.body, fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  eyebrow: { fontFamily: F.bold, fontSize: 9.5, letterSpacing: 2, color: 'rgba(255,255,255,0.55)', marginLeft: -4 },
  see: { fontFamily: F.bold, fontSize: 11.5 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 10, paddingVertical: 4, paddingLeft: 4, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.22)' },
  who: { fontFamily: F.bold, fontSize: 11.5, color: '#fff', flexShrink: 1 },
  verb: { fontFamily: F.body, color: 'rgba(255,255,255,0.55)' },
  film: { fontFamily: F.semibold, fontSize: 11.5, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
});
