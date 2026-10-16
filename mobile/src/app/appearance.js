import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Ambient from '../components/Ambient';
import { useAccent } from '../lib/accent';
import { DOTS } from '../components/Brand';
import { useApi } from '../lib/api';
import { PALETTE, setUserTheme, useUserTheme } from '../lib/userTheme';
import { F } from '../lib/theme';

// Extra shades for "Any colour": a full hue wheel at the app's brightness
const hsl = (h, s = 85, l = 66) => {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return `#${[f(0), f(8), f(4)].map((x) => x.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
};
const HUES = Array.from({ length: 24 }, (_, i) => hsl(i * 15));

// Miniature of the feed in the chosen colour
function Preview({ color, film }) {
  const [i, setI] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => { if (!film) return undefined; const t = setInterval(() => setI((x) => (x + 1) % DOTS.length), 1400); return () => clearInterval(t); }, [film]);
  useEffect(() => { fade.setValue(0.6); Animated.timing(fade, { toValue: 1, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(); }, [color, i, fade]);
  const c = film ? DOTS[i] : color;
  return (
    <Animated.View style={[styles.preview, { borderColor: `${c}66`, shadowColor: c, opacity: fade }]}>
      <Ambient accent={c} style={{ borderRadius: 24 }} />
      <LinearGradient colors={['transparent', 'rgba(6,6,11,0.85)']} locations={[0.35, 1]} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'absolute', top: 12, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontFamily: F.displayHeavy, fontSize: 11, color: '#fff' }}>thi<Text style={{ color: c }}>scene</Text></Text>
        <View style={{ flexDirection: 'row', gap: 3 }}>{[0, 1, 2].map((k) => <View key={k} style={styles.miniBtn} />)}</View>
      </View>
      <View style={[styles.miniPlay, { borderColor: `${c}88` }]}><View style={{ width: 0, height: 0, borderLeftWidth: 8, borderLeftColor: c, borderTopWidth: 5, borderTopColor: 'transparent', borderBottomWidth: 5, borderBottomColor: 'transparent', marginLeft: 2 }} /></View>
      <View style={{ position: 'absolute', right: 7, bottom: 16, gap: 4 }}>
        {[1, 0, 0, 0].map((on, k) => <View key={k} style={{ width: 17, height: 19, borderRadius: 6, backgroundColor: on ? `${c}30` : 'rgba(0,0,0,0.42)', borderWidth: 1, borderColor: on ? `${c}88` : 'rgba(255,255,255,0.1)' }} />)}
      </View>
      <View style={{ position: 'absolute', left: 10, right: 32, bottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 3, marginBottom: 5 }}>{[0, 1].map((k) => <View key={k} style={{ width: 22, height: 6, borderRadius: 2, borderWidth: 1, borderColor: `${c}66` }} />)}</View>
        <View style={{ height: 10, width: '85%', borderRadius: 3, backgroundColor: '#fff', marginBottom: 4 }} />
        <View style={{ height: 5, width: 22, borderRadius: 2, backgroundColor: c, marginBottom: 5 }} />
        <View style={{ height: 4, width: '100%', borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginBottom: 3 }} />
        <View style={{ height: 4, width: '70%', borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' }} />
      </View>
    </Animated.View>
  );
}

function Swatch({ hex, name, on, onPress, size }) {
  const s = useRef(new Animated.Value(1)).current;
  useEffect(() => { if (on) { s.setValue(0.85); Animated.spring(s, { toValue: 1, friction: 4, useNativeDriver: true }).start(); } }, [on, s]);
  return (
    <Pressable onPress={onPress} accessibilityLabel={name} style={{ width: size, alignItems: 'center', gap: 6 }}>
      <Animated.View style={[styles.swatch, { width: size - 8, height: size - 8, borderColor: on ? '#fff' : `${hex}55`, shadowColor: hex, shadowOpacity: on ? 0.6 : 0, transform: [{ scale: s }] }]}>
        <Ambient accent={hex} style={{ borderRadius: 18 }} />
        <LinearGradient colors={[`${hex}bb`, 'transparent']} start={{ x: 0.2, y: 0.1 }} end={{ x: 0.9, y: 0.9 }} style={StyleSheet.absoluteFill} />
        {on ? <Feather name="check" size={20} color="#fff" /> : null}
      </Animated.View>
      <Text style={[styles.swName, on && { color: '#fff', fontFamily: F.bold }]}>{name}</Text>
    </Pressable>
  );
}

export default function Appearance() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const api = useApi();
  const theme = useUserTheme();
  const film = theme.mode !== 'fixed';
  const color = theme.color || '#818CF8';
  const filmAccent = useAccent();
  const live = film ? filmAccent : color;
  const [saved, setSaved] = useState(false);
  const pick = (t) => { Haptics.selectionAsync().catch(() => {}); setUserTheme(t, api); setSaved(true); };
  useEffect(() => { if (!saved) return undefined; const t = setTimeout(() => setSaved(false), 2200); return () => clearTimeout(t); }, [saved]);
  const col = (width - 40) / 4;

  const Mode = ({ on, title, sub, onPress, dots }) => (
    <Pressable onPress={onPress} style={[styles.mode, on && { backgroundColor: `${live}22`, borderColor: live }]}>
      <View style={{ flexDirection: 'row', gap: 3, marginBottom: 10 }}>{dots}</View>
      <Text style={styles.modeTitle}>{title}</Text>
      <Text style={styles.modeSub}>{sub}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#06060B' }}>
      <Ambient accent={live} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back} accessibilityLabel="Back"><Feather name="arrow-left" size={19} color="#fff" /></Pressable>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center', marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: live }]}>APPEARANCE</Text>
            <Text style={styles.h1}>Make it yours</Text>
            <Text style={styles.lead}>Pick the colour Thiscene wears — the gradient, header, action bar, chats and buttons all follow it.</Text>
            {saved ? <Text style={styles.saved}>Saved — the website will match too</Text> : null}
          </View>
          <Preview color={color} film={film} />
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
          <Mode on={film} title="Follow each film" sub="Colours change with every card" onPress={() => pick({ mode: 'film', color })} dots={DOTS.slice(0, 5).map((c) => <View key={c} style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c }} />)} />
          <Mode on={!film} title="My colour" sub="One colour, everywhere" onPress={() => pick({ mode: 'fixed', color })} dots={<View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />} />
        </View>

        <Text style={styles.label}>{film ? 'OR PICK YOUR COLOUR' : 'YOUR COLOUR'}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }}>
          {PALETTE.map(([name, hex]) => <Swatch key={hex} name={name} hex={hex} size={col} on={!film && color.toUpperCase() === hex} onPress={() => pick({ mode: 'fixed', color: hex })} />)}
        </View>

        <Text style={styles.label}>ANY COLOUR</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          {HUES.map((h) => {
            const on = !film && color.toUpperCase() === h;
            return <Pressable key={h} onPress={() => pick({ mode: 'fixed', color: h })} accessibilityLabel={`Colour ${h}`} style={[styles.hue, { backgroundColor: h, borderColor: on ? '#fff' : 'transparent' }]} />;
          })}
        </ScrollView>

        <Pressable onPress={() => router.back()} style={[styles.done, { backgroundColor: `${live}2e`, borderColor: `${live}99` }]}><Text style={styles.doneText}>Done</Text></Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  eyebrow: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 2.2 },
  h1: { fontFamily: F.displayHeavy, fontSize: 28, letterSpacing: -0.7, color: '#fff', marginTop: 6 },
  lead: { fontFamily: F.body, fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.62)', marginTop: 8 },
  saved: { fontFamily: F.semibold, fontSize: 12, color: '#7BFF9E', marginTop: 10 },
  preview: { width: 140, height: 244, borderRadius: 24, overflow: 'hidden', borderWidth: 1, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10, backgroundColor: '#06060B' },
  miniBtn: { width: 12, height: 12, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  miniPlay: { position: 'absolute', top: 88, alignSelf: 'center', width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  mode: { flex: 1, padding: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)' },
  modeTitle: { fontFamily: F.bold, fontSize: 14.5, color: '#fff' },
  modeSub: { fontFamily: F.body, fontSize: 11.5, lineHeight: 16, color: 'rgba(255,255,255,0.55)', marginTop: 3 },
  label: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 2, color: 'rgba(255,255,255,0.5)', marginTop: 26, marginBottom: 12 },
  swatch: { borderRadius: 18, borderWidth: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', shadowRadius: 14, elevation: 4, backgroundColor: '#06060B' },
  swName: { fontFamily: F.semibold, fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  hue: { width: 34, height: 34, borderRadius: 17, borderWidth: 2.5 },
  done: { alignSelf: 'center', marginTop: 28, height: 48, paddingHorizontal: 30, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  doneText: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
});
