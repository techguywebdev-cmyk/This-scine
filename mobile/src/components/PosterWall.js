import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Tilted wall of five posters used as a page header (Friends, Watchlist, Profile)
export default function PosterWall({ posters = [], height = 200 }) {
  const insets = useSafeAreaInsets();
  const list = posters.length ? posters.slice(0, 5) : Array(5).fill(null);
  return (
    <View pointerEvents="none" style={[styles.wrap, { height: height + insets.top }]}>
      <View style={styles.row}>
        {list.map((src, i) => (
          <View key={i} style={[styles.poster, { transform: [{ translateY: i % 2 ? 22 : 0 }] }]}>
            {src ? <Image source={{ uri: src }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} /> : null}
          </View>
        ))}
      </View>
      <LinearGradient colors={['rgba(6,6,11,0.35)', 'rgba(6,6,11,0.05)', 'rgba(6,6,11,0.7)', '#06060B00']} locations={[0, 0.4, 0.8, 1]} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['transparent', 'rgba(6,6,11,0.95)']} locations={[0.55, 1]} style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },
  row: { position: 'absolute', left: -18, right: -18, top: -34, flexDirection: 'row', gap: 6, transform: [{ rotate: '-4deg' }] },
  poster: { flex: 1, aspectRatio: 2 / 3, borderRadius: 4, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)' },
});
