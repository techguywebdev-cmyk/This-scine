import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Feather, Ionicons } from '@expo/vector-icons';
import { F, T, label } from '../lib/theme';
import { useAccent } from '../lib/accent';

export const Spinner = ({ accent = T.accent }) => (
  <View style={{ paddingVertical: 32, alignItems: 'center' }}><ActivityIndicator color={accent} /></View>
);

export const SectionLabel = ({ children, right, accent: given, style }) => {
  const live = useAccent();
  const accent = given || live;
  return (
  <View style={[{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 }, style]}>
    <Text style={label(accent)}>{children}</Text>
    {right}
  </View>
  );
};

export const GlassButton = ({ icon, ionicon, onPress, size = 38, label: a11y }) => (
  <Pressable onPress={onPress} accessibilityLabel={a11y} hitSlop={8} style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', opacity: pressed ? 0.7 : 1 }]}>
    <BlurView intensity={30} tint="dark" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' }]}>
      {ionicon ? <Ionicons name={ionicon} size={size * 0.5} color="#fff" /> : <Feather name={icon} size={size * 0.48} color="#fff" />}
    </BlurView>
  </Pressable>
);

export const Avatar = ({ uri, name, size = 40, ring, accent = T.accent }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, padding: ring ? 2 : 0, backgroundColor: ring ? accent : 'transparent' }}>
    <View style={{ flex: 1, borderRadius: size, overflow: 'hidden', backgroundColor: '#1A1A22', borderWidth: ring ? 2 : 0, borderColor: T.bg, alignItems: 'center', justifyContent: 'center' }}>
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text style={{ color: '#fff', fontFamily: F.bold, fontSize: size * 0.38 }}>{(name || 'U')[0].toUpperCase()}</Text>}
    </View>
  </View>
);

export const Poster = ({ uri, width, style, dim }) => (
  <View style={[{ width, aspectRatio: 2 / 3, borderRadius: 3, overflow: 'hidden', backgroundColor: T.surface }, style]}>
    {uri ? <Image source={{ uri }} style={[StyleSheet.absoluteFill, dim ? { opacity: 0.6 } : null]} contentFit="cover" transition={250} recyclingKey={uri} /> : null}
  </View>
);

export const Tabs = ({ tabs, value, onChange, accent: given, style }) => {
  const live = useAccent();
  const accent = given || live;
  return (
  <View style={[{ flexDirection: 'row', gap: 24, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.hairlineStrong }, style]}>
    {tabs.map(([id, text]) => {
      const on = value === id;
      return (
        <Pressable key={id} onPress={() => onChange(id)} style={{ paddingBottom: 11, borderBottomWidth: 2, borderBottomColor: on ? accent : 'transparent', marginBottom: -1 }}>
          <Text style={{ fontFamily: on ? F.bold : F.medium, fontSize: 13.5, color: on ? accent : 'rgba(255,255,255,0.5)' }}>{text}</Text>
        </Pressable>
      );
    })}
  </View>
  );
};

// Empty state: floating icon tile in the current film colour, a title and a hint
export function Empty({ title, sub, icon = 'film', action, onAction }) {
  const accent = useAccent();
  const f = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 450, useNativeDriver: true }).start();
    const l = Animated.loop(Animated.sequence([Animated.timing(f, { toValue: 1, duration: 1600, useNativeDriver: true }), Animated.timing(f, { toValue: 0, duration: 1600, useNativeDriver: true })]));
    l.start(); return () => l.stop();
  }, [f, enter]);
  return (
    <Animated.View style={{ alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20, opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
      <Animated.View style={{ width: 62, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: `${accent}1f`, borderWidth: 1, borderColor: `${accent}55`, marginBottom: 14, transform: [{ translateY: f.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }, { rotate: f.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) }] }}>
        <Feather name={icon} size={26} color={accent} />
      </Animated.View>
      <Text style={{ fontFamily: F.bold, fontSize: 15, color: '#fff', textAlign: 'center' }}>{title}</Text>
      {sub ? <Text style={{ fontFamily: F.body, fontSize: 13, color: T.text2, marginTop: 6, lineHeight: 19, textAlign: 'center', maxWidth: 300 }}>{sub}</Text> : null}
      {action ? <Pressable onPress={onAction} style={({ pressed }) => ({ marginTop: 16, height: 42, borderRadius: 21, paddingHorizontal: 20, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', opacity: pressed ? 0.8 : 1 })}><Text style={{ fontFamily: F.bold, fontSize: 14, color: '#fff' }}>{action}</Text></Pressable> : null}
    </Animated.View>
  );
}
