import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { F } from '../lib/theme';
import StreamOn from './StreamOn';
import { useThemed } from '../lib/userTheme';

const daysUntil = (d) => Math.max(0, Math.ceil((new Date(d) - Date.now()) / 86400000));
const NOIR = '#E6E6EA';

// Right-hand action tile — same size, glass and colours as the website rail
function RailButton({ icon, label, active, color, onPress }) {
  return (
    <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onPress(); }} accessibilityLabel={label} style={({ pressed }) => [styles.tile, active && { backgroundColor: `${color}26`, borderColor: `${color}80` }, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
      {!active ? <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} /> : null}
      <Feather name={icon} size={20} color={active ? color : 'rgba(255,255,255,0.65)'} />
      <Text style={[styles.tileLabel, active && { color }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function FeedCard({ movie, index = 0, active = true, height, bottomInset, topInset = 0, saved, watched, reminded, reviewCount, onOpen, onSave, onWatched, onRemind, onReviews, onSimilar, onShare }) {
  const accent = useThemed(movie.accent || '#F5A623');
  const img = movie.backdrop || movie.poster;
  const upcoming = movie.isUpcoming && movie.releaseDate;
  const titleSize = Math.min(50, Math.max(28, 54 - (movie.title?.length || 0) * 0.9));

  return (
    <View style={{ height, backgroundColor: '#04040A', overflow: 'hidden' }}>
      {img ? <Image source={{ uri: img }} style={[StyleSheet.absoluteFill, { opacity: active ? 1 : 0.7 }]} contentFit="cover" contentPosition="top" transition={350} recyclingKey={String(movie.id)} priority="high" /> : null}
      {/* Same darkening as the web card: vignette, deep bottom fade, soft top fade */}
      <LinearGradient colors={['rgba(0,0,0,0.38)', 'transparent', 'transparent', 'rgba(0,0,0,0.38)']} locations={[0, 0.25, 0.75, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.98)']} locations={[0, 0.4, 0.72, 1]} style={[styles.bottomFade, { height: height * 0.75 }]} pointerEvents="none" />
      <LinearGradient colors={['rgba(0,0,0,0.55)', 'transparent']} style={[styles.topFade, { height: height * 0.25 }]} pointerEvents="none" />

      <Pressable onPress={onOpen} style={StyleSheet.absoluteFill} />

      {/* Top badges */}
      <View pointerEvents="none" style={[styles.badges, { top: topInset + 92, opacity: active ? 1 : 0.5 }]}>
        <View style={styles.pill}>
          <View style={[styles.dot, { backgroundColor: accent }]} />
          {upcoming ? <Text style={styles.soon}>COMING SOON</Text> : <Text style={styles.num}>{String(index + 1).padStart(2, '0')}</Text>}
          {movie.isTV && !upcoming ? <Text style={[styles.tv, { color: accent }]}>TV</Text> : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {movie.certification ? (() => { const c = movie.certification; const col = ['R', 'NC-17', '18', 'TV-MA'].includes(c) ? '#FF4444' : ['PG-13', 'TV-14', '15'].includes(c) ? '#F5A623' : 'rgba(255,255,255,0.5)'; return <View style={[styles.cert, { borderColor: col.startsWith('#') ? `${col}55` : 'rgba(255,255,255,0.25)' }]}><Text style={[styles.certText, { color: col }]}>{c}</Text></View>; })() : null}
          {upcoming ? (
            <View style={[styles.pill, { borderColor: `${accent}4d` }]}><Feather name="calendar" size={12} color={accent} /><Text style={styles.rating}>In {daysUntil(movie.releaseDate)}d</Text></View>
          ) : movie.rating && movie.rating !== 'N/A' ? (
            <View style={[styles.pill, { borderColor: `${accent}4d` }]}><Ionicons name="star" size={12} color={accent} /><Text style={styles.rating}>{movie.rating}</Text><Text style={styles.of}>/10</Text></View>
          ) : null}
        </View>
      </View>

      {/* Centre play — opens the trailer */}
      {active ? (
        <Pressable onPress={onOpen} accessibilityLabel="Play trailer" style={[styles.play, { top: height * 0.4 - 34, borderColor: `${accent}66`, shadowColor: accent }]}>
          <Ionicons name="play" size={28} color={accent} style={{ marginLeft: 4 }} />
        </Pressable>
      ) : null}

      {/* Info */}
      <View pointerEvents="box-none" style={[styles.info, { bottom: bottomInset + 14, opacity: active ? 1 : 0.4 }]}>
        {movie.genre?.length || movie.isTV ? (
          <View style={styles.genres}>
            {(movie.genre || []).map((g) => <Text key={g} style={[styles.genre, { color: accent, borderColor: `${accent}38` }]}>{g}</Text>)}
            {movie.isTV ? <Text style={[styles.genre, { color: 'rgba(255,255,255,0.35)', borderColor: 'rgba(255,255,255,0.1)' }]}>SERIES</Text> : null}
          </View>
        ) : null}
        {active ? <StreamOn movie={movie} /> : null}
        <Pressable onPress={onOpen}>
          <Text style={[styles.title, { fontSize: titleSize, lineHeight: titleSize * 1.04, textShadowColor: 'rgba(0,0,0,0.8)' }]} numberOfLines={3}>{movie.title}</Text>
        </Pressable>
        <View style={styles.metaRow}>
          {movie.year ? <Text style={[styles.year, { color: accent === NOIR ? '#fff' : `${accent}` }]}>{movie.year}</Text> : null}
          <View style={styles.sep} />
          {upcoming ? (
            <><Feather name="calendar" size={11} color="rgba(255,255,255,0.4)" /><Text style={styles.votes}> In theaters in {daysUntil(movie.releaseDate)} days</Text></>
          ) : (
            <><Feather name="eye" size={11} color="rgba(255,255,255,0.28)" /><Text style={styles.votes}> {movie.votes || '—'} ratings</Text></>
          )}
        </View>
        <Text style={styles.overview} numberOfLines={4}>{movie.overview}</Text>
      </View>

      {/* Action rail */}
      <View style={[styles.rail, { bottom: bottomInset + 16, opacity: active ? 1 : 0 }]}>
        <RailButton icon={saved ? 'check' : 'plus'} label={saved ? 'Saved' : 'Save'} active={saved} color="#7BFF9E" onPress={onSave} />
        <RailButton icon="message-square" label={reviewCount ? String(reviewCount) : 'Review'} color="#7BC8FF" onPress={onReviews} />
        {upcoming
          ? <RailButton icon="bell" label={reminded ? 'Reminded' : 'Remind'} active={reminded} color="#FFD166" onPress={onRemind} />
          : <RailButton icon="eye" label={watched ? 'Seen' : 'Seen it'} active={watched} color="#7BFFB0" onPress={onWatched} />}
        <RailButton icon="hexagon" label="Similar" color={accent} onPress={onSimilar} />
        <RailButton icon="share" label="Share" color={accent} onPress={onShare} />
      </View>
    </View>
  );
}

export default memo(FeedCard);

const pillBase = { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 };
const styles = StyleSheet.create({
  bottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  topFade: { position: 'absolute', left: 0, right: 0, top: 0 },
  badges: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: pillBase,
  dot: { width: 5, height: 5, borderRadius: 3 },
  num: { fontFamily: F.displayHeavy, fontSize: 12, color: 'rgba(255,255,255,0.55)', letterSpacing: 1 },
  soon: { fontFamily: F.bold, fontSize: 10.5, color: 'rgba(255,255,255,0.8)', letterSpacing: 1.6 },
  tv: { fontFamily: F.bold, fontSize: 9, marginLeft: 2 },
  rating: { fontFamily: F.displayHeavy, fontSize: 14, color: '#fff' },
  of: { fontFamily: F.body, fontSize: 10, color: 'rgba(255,255,255,0.25)' },
  cert: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, alignSelf: 'center' },
  certText: { fontFamily: F.displayHeavy, fontSize: 10, letterSpacing: 0.5 },
  play: { position: 'absolute', alignSelf: 'center', width: 68, height: 68, borderRadius: 34, borderWidth: 2, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.4, shadowRadius: 16, elevation: 8, zIndex: 16 },
  info: { position: 'absolute', left: 20, right: 74 },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 9 },
  genre: { fontFamily: F.bold, fontSize: 9, letterSpacing: 2.2, textTransform: 'uppercase', paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderRadius: 4, overflow: 'hidden' },
  title: { fontFamily: F.displayHeavy, color: '#fff', letterSpacing: -0.6, textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 22, marginBottom: 7 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  year: { fontFamily: F.display, fontSize: 13.5, opacity: 0.8 },
  sep: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)' },
  votes: { fontFamily: F.body, fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  overview: { fontFamily: F.body, fontSize: 13.5, lineHeight: 21.5, color: 'rgba(255,255,255,0.55)' },
  rail: { position: 'absolute', right: 12, alignItems: 'center', gap: 5 },
  tile: { width: 56, paddingVertical: 11, borderRadius: 18, alignItems: 'center', gap: 4, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.42)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  tileLabel: { fontFamily: F.bold, fontSize: 9, letterSpacing: 0.2, color: 'rgba(255,255,255,0.55)' },
});
