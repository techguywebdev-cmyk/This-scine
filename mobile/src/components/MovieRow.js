import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Poster } from './Ui';
import { useWatchlist } from '../lib/store';
import { openTitle } from '../lib/titles';
import { F, T } from '../lib/theme';

// Flat list row used by Discover, folders and search results
export default function MovieRow({ movie, rank, first, sub }) {
  const wl = useWatchlist();
  const saved = wl.ids.has(movie.id);
  return (
    <Pressable onPress={() => openTitle(movie)} style={({ pressed }) => [styles.row, !first && styles.border, { opacity: pressed ? 0.75 : 1 }]}>
      {rank ? <Text style={styles.rank}>{rank}</Text> : null}
      <Poster uri={movie.poster} width={50} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{movie.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>{sub || [movie.year, movie.rating && movie.rating !== 'N/A' ? `★ ${movie.rating}` : null, movie.isTV ? 'Series' : (movie.genre || [])[0]].filter(Boolean).join(' · ')}</Text>
        {movie.overview ? <Text style={styles.overview} numberOfLines={2}>{movie.overview}</Text> : null}
      </View>
      <Pressable hitSlop={10} onPress={() => wl.toggleSave(movie)}>
        <Feather name={saved ? 'check' : 'plus'} size={18} color={saved ? '#7BFF9E' : 'rgba(255,255,255,0.7)'} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hairlineStrong },
  rank: { width: 20, fontFamily: F.display, fontSize: 18, color: 'rgba(255,255,255,0.45)' },
  title: { fontFamily: F.bold, fontSize: 14, color: '#fff' },
  meta: { fontFamily: F.body, fontSize: 11.5, color: T.text2, marginTop: 3 },
  overview: { fontFamily: F.body, fontSize: 12, lineHeight: 17, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
});
