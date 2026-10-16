import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { F } from '../lib/theme';

const until = (at) => {
  const ms = Date.parse(at) - Date.now();
  if (ms <= 0) return '';
  const m = Math.round(ms / 60000);
  if (m < 60) return `in ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `in ${h} hr${h > 1 ? 's' : ''}`;
  const d = Math.round(h / 24);
  return `in ${d} day${d > 1 ? 's' : ''}`;
};

function LiveDot() {
  const a = useRef(new Animated.Value(1)).current;
  useEffect(() => { const l = Animated.loop(Animated.sequence([Animated.timing(a, { toValue: 0.35, duration: 700, useNativeDriver: true }), Animated.timing(a, { toValue: 1, duration: 700, useNativeDriver: true })])); l.start(); return () => l.stop(); }, [a]);
  return <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#3DDC84', opacity: a }} />;
}

// Vertical "ticket" for a watch-party invite: poster on top, torn stub with date + status below (matches the web)
export default function PartyTicket({ m, mine, status = {}, accent }) {
  const st = status.status || 'invited';
  const at = status.at || m.meta?.scheduled_for;
  const future = at && Date.parse(at) - Date.now() > 10 * 60000;
  const live = st === 'lobby' || st === 'playing' || st === 'paused';
  const done = st === 'ended' || st === 'expired' || st === 'declined';
  const label = st === 'ended' ? 'Ended' : st === 'expired' ? 'Expired' : st === 'declined' ? 'Declined' : live ? (st === 'lobby' ? 'Join lobby' : 'Join now') : future ? (st === 'accepted' ? 'Going' : mine ? 'Invited' : 'Answer') : (st === 'accepted' || at) ? 'Join' : mine ? 'Open room' : 'Join';
  const d = at ? new Date(at) : null;
  const img = m.meta?.poster || m.meta?.backdrop;
  const pid = m.meta?.party_id;
  return (
    <Pressable disabled={done || !pid} onPress={() => router.push({ pathname: '/party/[id]', params: { id: pid } })} style={({ pressed }) => [{ width: 210, opacity: done ? 0.7 : pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      <View style={[styles.top, { borderColor: `${accent}55` }]}>
        {img ? <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
        <LinearGradient colors={['rgba(6,6,11,0.35)', 'rgba(6,6,11,0)', 'rgba(6,6,11,0.15)', 'rgba(6,6,11,0.85)']} locations={[0, 0.3, 0.55, 0.9]} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['transparent', `${accent}40`]} locations={[0.6, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.badge}><Text style={styles.badgeText}>🍿 WATCH PARTY</Text></View>
        {live ? <View style={styles.live}><LiveDot /><Text style={styles.liveText}>LIVE</Text></View> : null}
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={3}>{m.meta?.title || m.text}</Text>
          <Text style={styles.sub}>{mine ? 'You invited them to watch' : 'Invited you to watch together'}</Text>
        </View>
      </View>
      <View style={[styles.perf, { borderColor: `${accent}55` }]} />
      <View style={[styles.stub, { borderColor: `${accent}55` }]}>
        <LinearGradient colors={[`${accent}38`, `${accent}14`, `${accent}24`]} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={{ flex: 1 }}>
          {d ? (
            <>
              <Text style={[styles.day, { color: accent }]}>{d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}</Text>
              <Text style={styles.time}>{d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
              {future && !done ? <Text style={styles.until}>{until(at)}</Text> : null}
            </>
          ) : <Text style={styles.now}>Right now</Text>}
        </View>
        <View style={[styles.cta, done ? styles.ctaDone : live ? { backgroundColor: '#3DDC84', borderColor: '#3DDC84' } : { backgroundColor: `${accent}2e`, borderColor: `${accent}99` }]}>
          <Text style={[styles.ctaText, done && { color: 'rgba(255,255,255,0.5)' }, live && { color: '#06060B' }]}>{label}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { aspectRatio: 2 / 2.6, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, overflow: 'hidden', backgroundColor: '#111', borderWidth: 1, borderBottomWidth: 0 },
  badge: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  badgeText: { fontFamily: F.bold, fontSize: 9.5, letterSpacing: 1.4, color: '#fff' },
  live: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(61,220,132,0.18)', borderWidth: 1, borderColor: 'rgba(61,220,132,0.5)' },
  liveText: { fontFamily: F.bold, fontSize: 9.5, letterSpacing: 1.2, color: '#3DDC84' },
  titleWrap: { position: 'absolute', left: 12, right: 12, bottom: 12 },
  title: { fontFamily: F.displayHeavy, fontSize: 19, lineHeight: 22, letterSpacing: -0.4, color: '#fff', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 12 },
  sub: { fontFamily: F.body, fontSize: 11.5, color: 'rgba(255,255,255,0.72)', marginTop: 4 },
  perf: { marginHorizontal: 10, borderTopWidth: 1.5, borderStyle: 'dashed' },
  stub: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 11, paddingBottom: 12, borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, backgroundColor: 'rgba(8,8,14,0.55)', borderWidth: 1, borderTopWidth: 0, overflow: 'hidden' },
  day: { fontFamily: F.bold, fontSize: 9.5, letterSpacing: 1.6 },
  time: { fontFamily: F.displayHeavy, fontSize: 20, color: '#fff', marginTop: 2 },
  until: { fontFamily: F.body, fontSize: 10.5, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  now: { fontFamily: F.bold, fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  cta: { height: 34, paddingHorizontal: 14, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  ctaDone: { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.14)' },
  ctaText: { fontFamily: F.bold, fontSize: 12.5, color: '#fff' },
});
