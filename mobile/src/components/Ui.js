import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { F, T, label } from '../lib/theme';

export const Spinner = ({ accent = T.accent }) => (
  <View style={{ paddingVertical: 32, alignItems: 'center' }}><ActivityIndicator color={accent} /></View>
);

export const SectionLabel = ({ children, right, accent, style }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 }, style]}>
    <Text style={label(accent)}>{children}</Text>
    {right}
  </View>
);

export const GlassButton = ({ icon, onPress, size = 38, label: a11y }) => (
  <Pressable onPress={onPress} accessibilityLabel={a11y} hitSlop={8} style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', opacity: pressed ? 0.7 : 1 }]}>
    <BlurView intensity={30} tint="dark" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' }]}>
      <Feather name={icon} size={size * 0.48} color="#fff" />
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

export const Tabs = ({ tabs, value, onChange, accent = T.accent, style }) => (
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

export const Empty = ({ title, sub }) => (
  <View style={{ paddingVertical: 26 }}>
    <Text style={{ fontFamily: F.bold, fontSize: 13.5, color: '#fff' }}>{title}</Text>
    {sub ? <Text style={{ fontFamily: F.body, fontSize: 12.5, color: T.text2, marginTop: 4, lineHeight: 18 }}>{sub}</Text> : null}
  </View>
);
