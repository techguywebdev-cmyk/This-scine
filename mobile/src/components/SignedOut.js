import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import Marquee from './PosterMarquee';
import { AmbientGlow, usePosters } from './StatusScreen';
import { TsLoader } from './Brand';
import { useAccent } from '../lib/accent';
import { API_URL } from '../lib/config';
import { F, T } from '../lib/theme';

const open = (path) => WebBrowser.openBrowserAsync(`${API_URL}${path}`, { toolbarColor: T.bg, controlsColor: '#ffffff' }).catch(() => {});

// Glass pill, primary tinted with the live colour — same as the sign-in screen
function Pill({ label, icon, primary, accent, onPress }) {
  const sc = useRef(new Animated.Value(1)).current;
  const press = (v) => Animated.spring(sc, { toValue: v, useNativeDriver: true, speed: 40 }).start();
  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: sc }] }}>
      <Pressable onPressIn={() => press(0.97)} onPressOut={() => press(1)} onPress={onPress} accessibilityRole="button"
        style={[styles.btn, primary ? { backgroundColor: `${accent}33`, borderColor: `${accent}99` } : styles.btnGlass]}>
        <Feather name={icon} size={17} color="#fff" />
        <Text style={styles.btnText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function SignInPills({ style }) {
  const accent = useAccent();
  return (
    <View style={[{ flexDirection: 'row', gap: 10 }, style]}>
      <Pill primary accent={accent} icon="log-in" label="Sign in" onPress={() => router.push('/sign-in')} />
      <Pill accent={accent} icon="user-plus" label="Join" onPress={() => router.push('/sign-in')} />
    </View>
  );
}

// Full-screen signed-out state: posters drifting down the top, the colour glowing up from below
export default function SignedOutHero({ title, sub, legal }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const posters = usePosters(24);
  return (
    <View style={{ flex: 1, backgroundColor: '#06060B' }}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: height * 0.58 }}>
        <Marquee posters={posters} rows={4} size={88} />
      </View>
      <AmbientGlow width={width} height={height} />
      <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: insets.bottom + 110 }}>
        <View style={{ alignItems: 'flex-start', marginBottom: 18 }}><TsLoader size={46} /></View>
        <Text style={styles.title}>{title}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
        <SignInPills style={{ marginTop: 26 }} />
        {legal ? (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 22 }}>
            <Pressable onPress={() => open('/privacy')} hitSlop={8}><Text style={styles.link}>Privacy</Text></Pressable>
            <Pressable onPress={() => open('/terms')} hitSlop={8}><Text style={styles.link}>Terms</Text></Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: F.displayHeavy, fontSize: 36, lineHeight: 39, letterSpacing: -0.9, color: '#fff' },
  sub: { fontFamily: F.body, fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.65)', marginTop: 10 },
  btn: { height: 52, borderRadius: 26, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderWidth: 1 },
  btnGlass: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)' },
  btnText: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  link: { fontFamily: F.semibold, fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecorationLine: 'underline' },
});
