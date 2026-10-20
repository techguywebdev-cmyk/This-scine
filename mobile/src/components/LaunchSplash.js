import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { DOTS, TsLoader } from './Brand';
import Marquee from './PosterMarquee';
import { usePosters } from './StatusScreen';
import { onBootReady } from '../lib/boot';
import { bootStage } from '../lib/report';

// Launch: "ts." with the dot cycling the card colours and a soft glow in that colour,
// film posters drifting faintly behind, and a slim line under the mark that fills — in the
// same colour — as the app actually loads. Then it fades into the feed.
const MIN_MS = 1800, MAX_MS = 9000, BAR = 132;

// Soft radial glow without blur: stacked circles, each a little fainter
function Glow({ color, size, cx, cy, strength = 1 }) {
  const rings = [1, 0.82, 0.66, 0.52, 0.4, 0.3, 0.21];
  return rings.map((r, i) => (
    <Animated.View key={i} style={{ position: 'absolute', width: size * r, height: size * r, borderRadius: (size * r) / 2, left: cx - (size * r) / 2, top: cy - (size * r) / 2, backgroundColor: color, opacity: 0.035 * strength }} />
  ));
}

export default function LaunchSplash() {
  const { width, height } = useWindowDimensions();
  const [gone, setGone] = useState(false);
  const posters = usePosters(24);
  const fade = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const t = useRef(new Animated.Value(0)).current;
  const prog = useRef(new Animated.Value(0)).current;
  const wall = useRef(new Animated.Value(0)).current;
  const start = useRef(Date.now());

  useEffect(() => { if (posters.length) Animated.timing(wall, { toValue: 1, duration: 900, useNativeDriver: true }).start(); }, [posters.length, wall]);

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: DOTS.length, duration: DOTS.length * 620, easing: Easing.linear, useNativeDriver: false }));
    loop.start();
    let ready = false; let leaving = false; let timer;
    // Real progress where we have it (fonts → sign-in → feed), a gentle crawl in between
    const iv = setInterval(() => {
      const s = (Date.now() - start.current) / 1000;
      let target = 0.55 * (1 - Math.exp(-s / 1.2)) + (bootStage.fonts ? 0.1 : 0) + (bootStage.clerk ? 0.15 : 0);
      target = ready ? 1 : Math.min(0.9, target);
      Animated.timing(prog, { toValue: target, duration: ready ? 380 : 260, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
      if (ready && !leaving && Date.now() - start.current > MIN_MS) {
        leaving = true;
        timer = setTimeout(() => {
          Animated.parallel([
            Animated.timing(fade, { toValue: 0, duration: 450, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1.08, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          ]).start(() => { loop.stop(); setGone(true); });
        }, 420);
      }
    }, 240);
    const off = onBootReady(() => { ready = true; });
    const cap = setTimeout(() => { ready = true; }, MAX_MS);
    return () => { off(); clearInterval(iv); clearTimeout(timer); clearTimeout(cap); loop.stop(); };
  }, [fade, scale, t, prog]);

  if (gone) return null;
  const color = t.interpolate({ inputRange: DOTS.map((_, i) => i).concat(DOTS.length), outputRange: DOTS.concat(DOTS[0]) });
  const big = Math.max(width, height) * 1.25;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.root, { opacity: fade }]}>
      {/* posters drifting faintly behind, like the sign-in screen */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: wall.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] }) }]}>
        <Marquee posters={posters} rows={6} size={84} fade={false} />
      </Animated.View>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(6,6,11,0.55)' }]} />
      <Glow color={color} size={big} cx={0} cy={0} strength={1} />
      <Glow color={color} size={big} cx={width} cy={height} strength={0.7} />
      <Animated.View style={{ alignItems: 'center', transform: [{ scale }] }}>
        <TsLoader size={84} />
        <View style={styles.track}>
          <Animated.View style={{ height: 3, borderRadius: 2, backgroundColor: color, width: prog.interpolate({ inputRange: [0, 1], outputRange: [0, BAR] }) }} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 200, elevation: 40, backgroundColor: '#06060B', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  track: { width: BAR, height: 3, borderRadius: 2, marginTop: 26, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
});
