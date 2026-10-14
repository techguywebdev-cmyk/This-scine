import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// The website's status background: a strong colour glow top-left, a softer one bottom-right,
// over a dark diagonal wash. ('#E6E6EA' = noir: black with a faint white glow.)
function Glow({ color, size, cx, cy, alpha }) {
  const rings = [1, 0.84, 0.69, 0.56, 0.45, 0.35, 0.26, 0.18];
  return rings.map((r, i) => (
    <View key={i} pointerEvents="none" style={{ position: 'absolute', width: size * r, height: size * r, borderRadius: (size * r) / 2, left: cx - (size * r) / 2, top: cy - (size * r) / 2, backgroundColor: color, opacity: alpha }} />
  ));
}

export default function StatusBackdrop({ bg = '#818CF8', style }) {
  const { width, height } = useWindowDimensions();
  const noir = bg === '#E6E6EA';
  const size = Math.max(width, height) * 1.25;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: noir ? '#000' : '#0B0B12', overflow: 'hidden' }, style]}>
      {!noir ? <LinearGradient colors={[`${bg}55`, '#0B0B12']} start={{ x: 0, y: 0 }} end={{ x: 0.75, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
      <Glow color={noir ? '#ffffff' : bg} size={size} cx={0} cy={0} alpha={noir ? 0.012 : 0.09} />
      {!noir ? <Glow color={bg} size={size} cx={width} cy={height} alpha={0.065} /> : null}
    </View>
  );
}

// Small round preview of the same look, for the colour picker
export function StatusSwatch({ bg, size = 30 }) {
  const noir = bg === '#E6E6EA';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: noir ? '#000' : '#0B0B12' }}>
      <LinearGradient colors={noir ? ['rgba(255,255,255,0.35)', '#000'] : [bg, `${bg}66`, '#0B0B12']} locations={noir ? [0, 0.7] : [0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    </View>
  );
}
