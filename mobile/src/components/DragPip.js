import { useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Self-view during video calls: drag it anywhere; it springs to the nearest corner. Corner is remembered.
const W = 108, H = 150, M = 16, KEY = 'thiscene.pip.corner';
let saved = 'tr';
AsyncStorage.getItem(KEY).then((v) => { if (v) saved = v; }).catch(() => {});

export default function DragPip({ children, style }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const spots = useMemo(() => {
    const top = insets.top + 70, bottom = height - insets.bottom - 200 - H;
    const left = M, right = width - W - M;
    return { tl: { x: left, y: top }, tr: { x: right, y: top }, bl: { x: left, y: bottom }, br: { x: right, y: bottom } };
  }, [width, height, insets.top, insets.bottom]);
  const pos = useRef(new Animated.ValueXY(spots[saved] || spots.tr)).current;
  const grab = useRef(new Animated.Value(1)).current;
  const spotsRef = useRef(spots);
  spotsRef.current = spots;

  useEffect(() => { pos.setValue(spots[saved] || spots.tr); }, [spots, pos]);

  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 4,
    onPanResponderGrant: () => {
      pos.extractOffset();
      Animated.spring(grab, { toValue: 1.06, useNativeDriver: false, speed: 30 }).start();
    },
    onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      pos.flattenOffset();
      const s = spotsRef.current;
      // where it would land with a little momentum, then the closest corner
      const x = pos.x._value + g.vx * 120, y = pos.y._value + g.vy * 120;
      const k = Object.keys(s).reduce((best, key) => (Math.hypot(s[key].x - x, s[key].y - y) < Math.hypot(s[best].x - x, s[best].y - y) ? key : best), 'tr');
      saved = k;
      AsyncStorage.setItem(KEY, k).catch(() => {});
      Haptics.selectionAsync().catch(() => {});
      Animated.parallel([
        Animated.spring(pos, { toValue: s[k], useNativeDriver: false, friction: 7, tension: 70 }),
        Animated.spring(grab, { toValue: 1, useNativeDriver: false, speed: 30 }),
      ]).start();
    },
    onPanResponderTerminate: () => { pos.flattenOffset(); const s = spotsRef.current; Animated.spring(pos, { toValue: s[saved] || s.tr, useNativeDriver: false }).start(); },
  }), [pos, grab]);

  return (
    <Animated.View {...pan.panHandlers} accessibilityLabel="Your camera, drag to move"
      style={[styles.pip, style, { transform: [{ translateX: pos.x }, { translateY: pos.y }, { scale: grab }] }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pip: { position: 'absolute', left: 0, top: 0, width: W, height: H, borderRadius: 16, overflow: 'hidden', zIndex: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: '#000', elevation: 8, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
});
