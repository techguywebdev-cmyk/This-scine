import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../lib/theme';

// Native take on the web `ambient(accent)` wash: soft accent glow top-left and bottom-right over near-black.
export default function Ambient({ accent = T.accent, style }) {
  const noir = accent === '#E6E6EA';
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: noir ? '#000' : T.bg }, style]}>
      <LinearGradient colors={[`${accent}${noir ? '10' : '33'}`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.85, y: 0.6 }} style={StyleSheet.absoluteFill} />
      {!noir && <LinearGradient colors={['transparent', `${accent}26`]} start={{ x: 0.2, y: 0.4 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
      {!noir && <LinearGradient colors={[`${accent}12`, `${accent}08`, `${accent}14`]} style={StyleSheet.absoluteFill} />}
    </View>
  );
}
