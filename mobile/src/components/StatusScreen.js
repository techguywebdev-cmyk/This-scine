import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Marquee from './PosterMarquee';
import { DOTS } from './Brand';
import { API_URL } from '../lib/config';
import { F } from '../lib/theme';

// Popular posters for backdrops, fetched once (no sign-in needed; silently skipped offline)
let posterCache = null;
export function usePosters(n = 18) {
  const [list, setList] = useState(posterCache || []);
  useEffect(() => {
    if (posterCache) return;
    fetch(`${API_URL}/api/movies?popular=1`).then((r) => r.json()).then((d) => {
      posterCache = (d.movies || []).map((m) => m.poster).filter(Boolean).sort(() => Math.random() - 0.5);
      setList(posterCache);
    }).catch(() => {});
  }, []);
  return list.slice(0, n);
}

// Soft glow that drifts through the card colours (no blur needed: stacked fading circles)
export function CyclingGlow({ size, cx, cy, strength = 1 }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => { const l = Animated.loop(Animated.timing(t, { toValue: DOTS.length, duration: DOTS.length * 1400, easing: Easing.linear, useNativeDriver: false })); l.start(); return () => l.stop(); }, [t]);
  const color = t.interpolate({ inputRange: DOTS.map((_, i) => i).concat(DOTS.length), outputRange: DOTS.concat(DOTS[0]) });
  return [1, 0.82, 0.66, 0.52, 0.4, 0.3, 0.21].map((r, i) => (
    <Animated.View key={i} pointerEvents="none" style={{ position: 'absolute', width: size * r, height: size * r, borderRadius: (size * r) / 2, left: cx - (size * r) / 2, top: cy - (size * r) / 2, backgroundColor: color, opacity: 0.035 * strength }} />
  ));
}

// Full-screen state (can't connect, something broke, offline…) in the app's own style:
// drifting posters, colour glow, a pulsing icon, and clear actions.
export default function StatusScreen({ icon = 'wifi-off', title, body, primary, secondary, busy, children }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const posters = usePosters();
  const enter = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const l = Animated.loop(Animated.timing(ring, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true })); l.start();
    return () => l.stop();
  }, [enter, ring]);
  useEffect(() => {
    if (!busy) { spin.stopAnimation(); spin.setValue(0); return undefined; }
    const l = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })); l.start();
    return () => l.stop();
  }, [busy, spin]);
  const big = Math.max(width, height) * 1.2;
  const up = (d) => ({ opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [d, 0] }) }] });

  return (
    <View style={styles.root}>
      <CyclingGlow size={big} cx={0} cy={0} />
      <CyclingGlow size={big} cx={width} cy={height} strength={0.7} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: height * 0.42 }}>
        <Marquee posters={posters} rows={3} size={84} />
      </View>
      <LinearGradient pointerEvents="none" colors={['transparent', '#06060B']} locations={[0.25, 0.48]} style={StyleSheet.absoluteFill} />

      <View style={[styles.body, { paddingBottom: insets.bottom + 34 }]}>
        <Animated.View style={[styles.iconWrap, up(10)]}>
          {[0, 0.5].map((off) => {
            const p = Animated.modulo(Animated.add(ring, off), 1);
            return <Animated.View key={off} style={[styles.ring, { opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }), transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] }) }] }]} />;
          })}
          <Animated.View style={[styles.icon, busy && { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
            <Feather name={busy ? 'loader' : icon} size={28} color="#fff" />
          </Animated.View>
        </Animated.View>
        <Animated.Text style={[styles.title, up(16)]}>{title}</Animated.Text>
        {body ? <Animated.Text style={[styles.text, up(20)]}>{body}</Animated.Text> : null}
        {children}
        <Animated.View style={[{ width: '100%', gap: 10, marginTop: 28 }, up(24)]}>
          {primary ? (
            <Pressable onPress={primary.onPress} disabled={busy} style={({ pressed }) => [styles.primary, { opacity: pressed || busy ? 0.7 : 1 }]}>
              <Text style={styles.primaryText}>{busy ? 'Trying…' : primary.label}</Text>
            </Pressable>
          ) : null}
          {secondary ? (
            <Pressable onPress={secondary.onPress} style={({ pressed }) => [styles.secondary, { opacity: pressed ? 0.7 : 1 }]}>
              <Text style={styles.secondaryText}>{secondary.label}</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#06060B', overflow: 'hidden' },
  body: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 28 },
  iconWrap: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  ring: { position: 'absolute', width: 76, height: 76, borderRadius: 38, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  icon: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  title: { fontFamily: F.displayHeavy, fontSize: 28, lineHeight: 32, letterSpacing: -0.6, color: '#fff', textAlign: 'center' },
  text: { fontFamily: F.body, fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginTop: 10, maxWidth: 340 },
  primary: { height: 54, borderRadius: 27, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: F.bold, fontSize: 16, color: '#06060B' },
  secondary: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  secondaryText: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
});
