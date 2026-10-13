import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { F } from '../lib/theme';

// Same dot colours the web loader cycles through (the movie-card accents)
export const DOTS = ['#818CF8', '#2DD4BF', '#FF6B8A', '#A3E635', '#B07FEF', '#38BDF8', '#FF7A2F', '#F5A623'];

// "ts." mark: white letters, the dot cycles through the card colours with a soft glow
export function TsLoader({ size = 64, label }) {
  const t = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const intro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const steps = DOTS.map((_, i) => Animated.sequence([
      Animated.delay(380),
      Animated.parallel([
        Animated.timing(t, { toValue: i + 1, duration: 240, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.sequence([
          Animated.timing(pop, { toValue: 1.22, duration: 120, useNativeDriver: false }),
          Animated.timing(pop, { toValue: 1, duration: 160, useNativeDriver: false }),
        ]),
      ]),
    ]));
    const loop = Animated.loop(Animated.sequence([...steps, Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: false })]));
    loop.start();
    return () => loop.stop();
  }, [t, pop, intro]);

  const color = t.interpolate({ inputRange: DOTS.map((_, i) => i).concat(DOTS.length), outputRange: DOTS.concat(DOTS[0]) });
  const d = size * 0.17;

  return (
    <Animated.View style={{ alignItems: 'center', opacity: intro, transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [size * 0.1, 0] }) }] }} accessibilityLabel="Loading Thiscene" accessible>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <Text style={{ fontFamily: F.displayHeavy, fontSize: size, lineHeight: size * 1.05, color: '#fff', letterSpacing: -size * 0.03 }}>ts</Text>
        <View style={{ width: d * 3, height: d * 3, marginLeft: -d * 0.4, marginBottom: size * 0.2 - d, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ position: 'absolute', width: d * 2.6, height: d * 2.6, borderRadius: d * 1.3, backgroundColor: color, opacity: 0.22 }} />
          <Animated.View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: color, transform: [{ scale: pop }] }} />
        </View>
      </View>
      {label ? <Text style={{ fontFamily: F.bold, fontSize: 10.5, letterSpacing: 2.2, color: 'rgba(255,255,255,0.4)', marginTop: 18 }}>{label}</Text> : null}
    </Animated.View>
  );
}

// Header wordmark: "thi" white, "scene" + dot in the current card's colour
export function Wordmark({ accent = '#fff', size = 21 }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }} accessibilityLabel="Thiscene" accessible>
      <Text style={{ fontFamily: F.displayHeavy, fontSize: size, color: '#fff', letterSpacing: -size * 0.03 }}>
        thi<Text style={{ color: accent }}>scene</Text>
      </Text>
      <View style={{ width: size * 0.17, height: size * 0.17, borderRadius: size, backgroundColor: accent, marginLeft: size * 0.07, marginBottom: size * 0.2 }} />
    </View>
  );
}
