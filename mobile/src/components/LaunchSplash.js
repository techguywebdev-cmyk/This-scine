import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { TsLoader } from './Brand';
import { onBootReady } from '../lib/boot';
import { bootStage } from '../lib/report';
import { F } from '../lib/theme';

// "Opening night": Popcorn — our little bucket — hauls the rope and the velvet curtains part.
// How far they're open is how far the app has loaded; once the feed is ready they swing wide
// and the whole stage fades into the app.
const MIN_MS = 1800, MAX_MS = 9000;

// Velvet: folds as alternating light/dark crimson bands
const FOLDS = ['#5A0A16', '#8E1426', '#6A0C1B', '#A3192D', '#5E0B18', '#93162A', '#650C1A', '#A01A2D', '#5A0A16'];

function Curtain({ width, height, side }) {
  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <LinearGradient colors={side === 'left' ? FOLDS : [...FOLDS].reverse()} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      {/* soft shading toward the floor and the inner edge */}
      <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)']} start={{ x: 0, y: 0.4 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={side === 'left' ? ['rgba(0,0,0,0)', 'rgba(0,0,0,0.35)'] : ['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      {/* gold hem */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, backgroundColor: '#C9962E' }} />
    </View>
  );
}

// Popcorn, the mascot: a striped bucket with a puffy top, eyes, a grin, arms on the rope
function Popcorn({ size = 96, lean = 0, blink = false, cheer = false }) {
  const s = size;
  return (
    <View style={{ width: s, height: s * 1.25, transform: [{ rotate: `${lean}deg` }] }}>
      <Svg width={s} height={s * 1.25} viewBox="0 0 100 125">
        {/* legs + shoes */}
        <Line x1="40" y1="104" x2="36" y2="118" stroke="#F4E7D3" strokeWidth="4" strokeLinecap="round" />
        <Line x1="60" y1="104" x2="66" y2="118" stroke="#F4E7D3" strokeWidth="4" strokeLinecap="round" />
        <Ellipse cx="33" cy="119" rx="7" ry="4" fill="#1B1B24" />
        <Ellipse cx="69" cy="119" rx="7" ry="4" fill="#1B1B24" />
        {/* bucket with stripes */}
        <Path d="M22 46 L78 46 L70 106 L30 106 Z" fill="#FFF7EA" />
        <Path d="M30 46 L38 46 L37 106 L32 106 Z" fill="#E3283E" />
        <Path d="M46 46 L54 46 L53 106 L47 106 Z" fill="#E3283E" />
        <Path d="M62 46 L70 46 L68 106 L63 106 Z" fill="#E3283E" />
        <Rect x="20" y="42" width="60" height="8" rx="4" fill="#E3283E" />
        {/* popcorn puffs */}
        {[[28, 36, 11], [42, 30, 12], [57, 29, 12], [71, 36, 11], [35, 24, 9], [50, 21, 10], [64, 24, 9]].map(([x, y, r], i) => (
          <Circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? '#FFE9A8' : '#FFF4CF'} />
        ))}
        {/* face */}
        {blink ? (
          <G><Path d="M38 66 q4 3 8 0" stroke="#1B1B24" strokeWidth="2.5" fill="none" strokeLinecap="round" /><Path d="M54 66 q4 3 8 0" stroke="#1B1B24" strokeWidth="2.5" fill="none" strokeLinecap="round" /></G>
        ) : (
          <G>
            <Ellipse cx="42" cy="66" rx="5" ry="6" fill="#fff" /><Ellipse cx="58" cy="66" rx="5" ry="6" fill="#fff" />
            <Circle cx="43.5" cy="67" r="2.6" fill="#1B1B24" /><Circle cx="59.5" cy="67" r="2.6" fill="#1B1B24" />
          </G>
        )}
        <Path d={cheer ? 'M41 78 q9 10 18 0 Z' : 'M42 79 q8 6 16 0'} stroke="#1B1B24" strokeWidth="2.5" fill={cheer ? '#7A1020' : 'none'} strokeLinecap="round" />
        <Ellipse cx="36" cy="75" rx="3.5" ry="2" fill="#FF8FA3" opacity="0.7" />
        <Ellipse cx="64" cy="75" rx="3.5" ry="2" fill="#FF8FA3" opacity="0.7" />
        {/* arms: reaching forward to the rope, or up in a cheer */}
        {cheer ? (
          <G><Line x1="24" y1="70" x2="10" y2="50" stroke="#F4E7D3" strokeWidth="4" strokeLinecap="round" /><Line x1="76" y1="70" x2="90" y2="50" stroke="#F4E7D3" strokeWidth="4" strokeLinecap="round" /></G>
        ) : (
          <G><Line x1="74" y1="72" x2="94" y2="62" stroke="#F4E7D3" strokeWidth="4" strokeLinecap="round" /><Line x1="74" y1="84" x2="96" y2="70" stroke="#F4E7D3" strokeWidth="4" strokeLinecap="round" /><Circle cx="95" cy="66" r="4.5" fill="#F4E7D3" /></G>
        )}
      </Svg>
    </View>
  );
}

export default function LaunchSplash() {
  const { width: W, height: H } = useWindowDimensions();
  const [gone, setGone] = useState(false);
  const [p, setP] = useState(0); // how open the curtains are, 0 → 1
  const [tick, setTick] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const ready = useRef(false);
  const start = useRef(Date.now());

  useEffect(() => {
    let raf; let cur = 0; let leaving = false;
    const off = onBootReady(() => { ready.current = true; });
    const cap = setTimeout(() => { ready.current = true; }, MAX_MS);
    const step = () => {
      const t = (Date.now() - start.current) / 1000;
      // Real progress where we have it, a steady crawl in between, never "done" before it is
      let target = 0.62 * (1 - Math.exp(-t / 1.3));
      if (bootStage.fonts) target += 0.08;
      if (bootStage.clerk) target += 0.12;
      if (ready.current) target = 1;
      target = Math.min(ready.current ? 1 : 0.9, target);
      cur += (target - cur) * (ready.current ? 0.09 : 0.05);
      setP(cur); setTick((k) => k + 1);
      if (!leaving && ready.current && cur > 0.985 && Date.now() - start.current > MIN_MS) {
        leaving = true;
        setTimeout(() => Animated.timing(fade, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => setGone(true)), 380);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); off(); clearTimeout(cap); };
  }, [fade]);

  if (gone) return null;
  const half = W / 2;
  const open = p * half * 0.9; // each curtain slides this far; a bunched edge stays at the sides
  const curtainH = H - 54;
  const done = p > 0.97;
  // Popcorn tugs in rhythm: leans back, then a quick jerk on the rope
  const phase = (tick % 48) / 48;
  const tug = done ? 0 : -10 - 8 * Math.max(0, Math.sin(phase * Math.PI * 2));
  const blink = tick % 140 < 6;
  // rope: from Popcorn's hands to the inner edge of the left curtain
  const popX = W * 0.06, popY = H - 210;
  const POP = 116;
  const handX = popX + POP * 0.95, handY = popY + POP * 0.66;
  const edgeX = half - open - 2, edgeY = H * 0.5;

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.root, { opacity: fade }]}>
      {/* Behind the curtains: the stage with the mark under a spotlight */}
      <LinearGradient colors={['#14101F', '#06060B']} style={StyleSheet.absoluteFill} />
      <View style={[styles.spot, { width: W * 1.1, height: W * 1.1, borderRadius: W * 0.55, left: -W * 0.05, top: H * 0.5 - W * 0.55, opacity: 0.12 + p * 0.25 }]} />
      <View style={{ transform: [{ scale: 0.86 + p * 0.14 }], opacity: 0.4 + p * 0.6 }}><TsLoader size={84} /></View>

      {/* Curtains */}
      <View style={{ position: 'absolute', left: -open, top: 54 }}><Curtain width={half + 2} height={curtainH} side="left" /></View>
      <View style={{ position: 'absolute', left: half + open - 2, top: 54 }}><Curtain width={half + 2} height={curtainH} side="right" /></View>

      {/* Valance with scallops and gold trim */}
      <View style={[styles.valance, { width: W }]}>
        <LinearGradient colors={['#4A0812', '#7A1020']} style={StyleSheet.absoluteFill} />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 10, height: 3, backgroundColor: '#C9962E' }} />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: -14, flexDirection: 'row' }}>
          {Array.from({ length: Math.ceil(W / 44) + 1 }).map((_, i) => <View key={i} style={styles.scallop} />)}
        </View>
      </View>

      {/* Rope */}
      <Svg style={StyleSheet.absoluteFill} width={W} height={H} pointerEvents="none">
        {!done ? <Path d={`M${handX} ${handY} Q ${(handX + edgeX) / 2} ${Math.max(handY, edgeY) + 30 * (1 - p)} ${edgeX} ${edgeY}`} stroke="#E0B44C" strokeWidth="5" fill="none" strokeLinecap="round" /> : null}
        {!done ? <Circle cx={edgeX} cy={edgeY} r="7" fill="#E0B44C" /> : null}
      </Svg>

      {/* Popcorn */}
      <View style={{ position: 'absolute', left: popX, top: popY }}>
        <Popcorn size={POP} lean={tug} blink={blink} cheer={done} />
      </View>

      <Text style={[styles.caption, { bottom: 34 }]}>{done ? 'Showtime' : `Setting the scene · ${Math.round(p * 100)}%`}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 200, elevation: 40, backgroundColor: '#06060B', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  spot: { position: 'absolute', backgroundColor: '#F5D38A' },
  valance: { position: 'absolute', left: 0, top: 0, height: 64 },
  scallop: { width: 44, height: 28, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, backgroundColor: '#7A1020', borderBottomWidth: 3, borderColor: '#C9962E' },
  caption: { position: 'absolute', fontFamily: F.semibold, fontSize: 12.5, letterSpacing: 1.5, color: 'rgba(255,255,255,0.7)' },
});
