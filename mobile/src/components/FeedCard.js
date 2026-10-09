import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { F, T } from '../lib/theme';

const daysUntil = (d) => Math.max(0, Math.ceil((new Date(d) - Date.now()) / 86400000));

function RailButton({ icon, label, active, color, onPress }) {
  return (
    <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onPress(); }} hitSlop={6} style={({ pressed }) => [styles.railBtn, { transform: [{ scale: pressed ? 0.9 : 1 }] }]}>
      <View style={[styles.railIcon, active && { backgroundColor: `${color}26`, borderColor: `${color}66` }]}>
        <Feather name={icon} size={20} color={active ? color : '#fff'} />
      </View>
      <Text style={[styles.railLabel, active && { color }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function FeedCard({ movie, height, bottomInset, saved, watched, reminded, onOpen, onSave, onWatched, onRemind, onSimilar, onShare }) {
  const [liked, setLiked] = useState(false);
  const accent = movie.accent || T.accent;
  const img = movie.backdrop || movie.poster;
  const upcoming = movie.isUpcoming && movie.releaseDate;

  return (
    <View style={{ height, backgroundColor: T.bg }}>
      {img ? <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} recyclingKey={String(movie.id)} priority="high" /> : null}
      <LinearGradient colors={['rgba(6,6,11,0.55)', 'transparent', 'transparent', 'rgba(6,6,11,0.75)', '#06060B']} locations={[0, 0.18, 0.42, 0.72, 1]} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['transparent', `${accent}22`]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

      <Pressable onPress={onOpen} style={StyleSheet.absoluteFill} />

      {/* Info */}
      <View pointerEvents="box-none" style={[styles.info, { bottom: bottomInset + 22 }]}>
        {upcoming ? (
          <View style={styles.pillWrap}>
            <BlurView intensity={25} tint="dark" style={styles.pill}><Text style={styles.pillText}>Coming soon · in {daysUntil(movie.releaseDate)} days</Text></BlurView>
          </View>
        ) : null}
        <Pressable onPress={onOpen}>
          <Text style={styles.title} numberOfLines={2}>{movie.title}</Text>
        </Pressable>
        <View style={styles.metaRow}>
          {movie.year ? <Text style={styles.meta}>{movie.year}</Text> : null}
          {movie.rating && movie.rating !== 'N/A' ? (<><Text style={styles.dot}>·</Text><Feather name="star" size={11} color={T.star} /><Text style={[styles.meta, { color: '#fff' }]}> {movie.rating}</Text></>) : null}
          {movie.certification ? (<><Text style={styles.dot}>·</Text><Text style={styles.meta}>{movie.certification}</Text></>) : null}
          {movie.isTV ? (<><Text style={styles.dot}>·</Text><Text style={styles.meta}>Series</Text></>) : null}
        </View>
        {movie.genre?.length ? <Text style={[styles.genres, { color: accent }]}>{movie.genre.join('  ·  ')}</Text> : null}
        <Text style={styles.overview} numberOfLines={3}>{movie.overview}</Text>
        <Pressable onPress={onOpen} style={({ pressed }) => [styles.trailerBtn, { backgroundColor: accent, opacity: pressed ? 0.85 : 1 }]}>
          <Feather name="play" size={14} color="#07070F" />
          <Text style={styles.trailerText}>Watch trailer</Text>
        </Pressable>
      </View>

      {/* Action rail — same order as the web: Save first */}
      <View style={[styles.rail, { bottom: bottomInset + 18 }]}>
        <RailButton icon={saved ? 'check' : 'plus'} label={saved ? 'Saved' : 'Save'} active={saved} color="#7BFF9E" onPress={onSave} />
        <RailButton icon="heart" label="Like" active={liked} color="#FF6B8A" onPress={() => setLiked((v) => !v)} />
        {upcoming
          ? <RailButton icon="bell" label={reminded ? 'Reminded' : 'Remind'} active={reminded} color={T.star} onPress={onRemind} />
          : <RailButton icon="eye" label={watched ? 'Seen' : 'Seen it'} active={watched} color="#7BFFB0" onPress={onWatched} />}
        <RailButton icon="layers" label="Similar" color={accent} onPress={onSimilar} />
        <RailButton icon="share-2" label="Share" color={accent} onPress={onShare} />
      </View>
    </View>
  );
}

export default memo(FeedCard);

const styles = StyleSheet.create({
  info: { position: 'absolute', left: 18, right: 86 },
  pillWrap: { flexDirection: 'row', marginBottom: 10 },
  pill: { borderRadius: 999, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  pillText: { fontFamily: F.semibold, fontSize: 11.5, color: '#fff' },
  title: { fontFamily: F.displayHeavy, fontSize: 32, lineHeight: 35, color: '#fff', letterSpacing: -0.6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  meta: { fontFamily: F.medium, fontSize: 12.5, color: 'rgba(255,255,255,0.7)' },
  dot: { color: 'rgba(255,255,255,0.4)', marginHorizontal: 6 },
  genres: { fontFamily: F.bold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 8 },
  overview: { fontFamily: F.body, fontSize: 13.5, lineHeight: 19.5, color: 'rgba(255,255,255,0.82)', marginTop: 10 },
  trailerBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', borderRadius: 22, paddingHorizontal: 16, height: 40, marginTop: 16 },
  trailerText: { fontFamily: F.bold, fontSize: 13, color: '#07070F' },
  rail: { position: 'absolute', right: 10, width: 64, alignItems: 'center', gap: 14 },
  railBtn: { alignItems: 'center', width: 64 },
  railIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  railLabel: { fontFamily: F.semibold, fontSize: 10.5, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
});
