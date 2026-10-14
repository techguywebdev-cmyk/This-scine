import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { DOTS, TsLoader } from './Brand';
import { onBootReady } from '../lib/boot';

// Same launch as the website: "ts." with the dot cycling the card colours and a soft
// glow in that colour, held for a moment so it's seen, then fades into the feed.
const MIN_MS = 2400, MAX_MS = 9000;

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
  const fade = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const t = useRef(new Animated.Value(0)).current;
  const start = useRef(Date.now());

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: DOTS.length, duration: DOTS.length * 620, easing: Easing.linear, useNativeDriver: false }));
    loop.start();
    let timer;
    const leave = () => {
      const wait = Math.max(0, MIN_MS - (Date.now() - start.current));
      timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fade, { toValue: 0, duration: 450, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.08, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start(() => { loop.stop(); setGone(true); });
      }, wait);
    };
    const off = onBootReady(leave);
    const cap = setTimeout(leave, MAX_MS);
    return () => { off(); clearTimeout(timer); clearTimeout(cap); loop.stop(); };
  }, [fade, scale, t]);

  if (gone) return null;
  const color = t.interpolate({ inputRange: DOTS.map((_, i) => i).concat(DOTS.length), outputRange: DOTS.concat(DOTS[0]) });
  const big = Math.max(width, height) * 1.25;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.root, { opacity: fade }]}>
      <Glow color={color} size={big} cx={0} cy={0} strength={1} />
      <Glow color={color} size={big} cx={width} cy={height} strength={0.7} />
      <Animated.View style={{ transform: [{ scale }] }}><TsLoader size={84} /></Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 200, elevation: 40, backgroundColor: '#06060B', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
