import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

// Drifting poster wall for the header — two rows sliding in opposite directions
export default function Marquee({ posters, tone, rows: rowCount = 2, size = 92, fade = true }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { const l = Animated.loop(Animated.timing(a, { toValue: 1, duration: 60000, easing: Easing.linear, useNativeDriver: true })); l.start(); return () => l.stop(); }, [a]);
  const list = posters.length ? posters : Array(10).fill(null);
  const rows = Array.from({ length: rowCount }, (_, r) => list.filter((_, i) => i % rowCount === r));
  const W = size + 8;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      <View style={{ position: 'absolute', left: -40, right: -40, top: -30, transform: [{ rotate: '-6deg' }], opacity: 0.6 }}>
        {rows.map((items, r) => {
          const span = Math.max(1, items.length) * W;
          const x = a.interpolate({ inputRange: [0, 1], outputRange: r ? [-span, 0] : [0, -span] });
          return (
            <Animated.View key={r} style={{ flexDirection: 'row', gap: 8, marginBottom: 8, transform: [{ translateX: x }] }}>
              {[...items, ...items, ...items].map((src, i) => (
                <View key={i} style={{ width: size, aspectRatio: 2 / 3, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  {src ? <Image source={{ uri: src }} style={StyleSheet.absoluteFill} contentFit="cover" transition={500} /> : null}
                </View>
              ))}
            </Animated.View>
          );
        })}
      </View>
      {tone ? <LinearGradient colors={[`${tone}55`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 0.7 }} style={StyleSheet.absoluteFill} /> : null}
      {fade ? <LinearGradient colors={['rgba(6,6,11,0.35)', 'rgba(6,6,11,0.2)', 'rgba(6,6,11,0.88)', '#06060B']} locations={[0, 0.35, 0.8, 1]} style={StyleSheet.absoluteFill} /> : null}
    </View>
  );
}

