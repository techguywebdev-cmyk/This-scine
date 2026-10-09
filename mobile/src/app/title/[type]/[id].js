import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import Ambient from '../../../components/Ambient';
import { GlassButton, Poster, SectionLabel, Spinner } from '../../../components/Ui';
import { useApi } from '../../../lib/api';
import { useWatchlist } from '../../../lib/store';
import { openTitle, shareTitle } from '../../../lib/titles';
import { F, T } from '../../../lib/theme';

export default function TitleScreen() {
  const { type, id, title: initialTitle, focus } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const api = useApi();
  const wl = useWatchlist();
  const [movie, setMovie] = useState(null);
  const [trailerKey, setTrailerKey] = useState(undefined);
  const [similar, setSimilar] = useState(null);
  const [playing, setPlaying] = useState(true);
  const scrollRef = useRef(null);
  const similarY = useRef(0);

  useEffect(() => {
    let alive = true;
    api.get(`/api/movies?item=${id}&itemType=${type}`).then((d) => {
      if (!alive) return;
      const m = d.movies?.[0];
      setMovie(m || null);
      const genres = (m?.genreIds || []).join(',');
      api.get(`/api/movies?similar=${id}&similarType=${type}&similarGenres=${genres}`).then((s) => alive && setSimilar(s.movies || [])).catch(() => alive && setSimilar([]));
    }).catch(() => {});
    api.get(`/api/trailer?id=${id}&type=${type}`).then((d) => alive && setTrailerKey(d.trailerKey || null)).catch(() => alive && setTrailerKey(null));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, type]);

  useEffect(() => {
    if (focus === 'similar' && similar && similar.length && scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollTo({ y: similarY.current - 20, animated: true }), 250);
    }
  }, [focus, similar]);

  const accent = movie?.accent || T.accent;
  const videoH = Math.round((width * 9) / 16);
  const saved = movie && wl.ids.has(movie.id);
  const watched = movie && wl.isWatched(movie.id);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <Ambient accent={accent} />
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* Trailer / hero */}
        <View style={{ width, height: videoH + insets.top, paddingTop: insets.top, backgroundColor: '#000' }}>
          {trailerKey ? (
            <YoutubePlayer height={videoH} width={width} videoId={trailerKey} play={playing} onChangeState={(s) => s === 'ended' && setPlaying(false)} webViewProps={{ allowsInlineMediaPlayback: true }} initialPlayerParams={{ modestbranding: true, rel: false }} />
          ) : (
            <View style={{ width, height: videoH }}>
              {movie?.backdrop ? <Image source={{ uri: movie.backdrop }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
              <LinearGradient colors={['transparent', 'rgba(6,6,11,0.8)']} style={StyleSheet.absoluteFill} />
              <View style={styles.center}>{trailerKey === undefined ? <ActivityIndicator color="#fff" /> : <Text style={styles.noTrailer}>No trailer available</Text>}</View>
            </View>
          )}
        </View>
        <View style={[styles.close, { top: insets.top + 10 }]}><GlassButton icon="chevron-down" onPress={() => router.back()} label="Close" /></View>

        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <Text style={styles.title}>{movie?.title || initialTitle}</Text>
          {movie ? (
            <View style={styles.metaRow}>
              {movie.year ? <Text style={styles.meta}>{movie.year}</Text> : null}
              {movie.rating && movie.rating !== 'N/A' ? (<><Text style={styles.dot}>·</Text><Feather name="star" size={11} color={T.star} /><Text style={[styles.meta, { color: '#fff' }]}> {movie.rating}</Text></>) : null}
              {movie.certification ? (<><Text style={styles.dot}>·</Text><Text style={styles.meta}>{movie.certification}</Text></>) : null}
              {movie.isTV ? (<><Text style={styles.dot}>·</Text><Text style={styles.meta}>Series</Text></>) : null}
            </View>
          ) : null}
          {movie?.genre?.length ? <Text style={[styles.genres, { color: accent }]}>{movie.genre.join('  ·  ')}</Text> : null}

          {movie ? (
            <View style={styles.actions}>
              {[
                [saved ? 'check' : 'plus', saved ? 'Saved' : 'Save', saved, '#7BFF9E', () => wl.toggleSave(movie)],
                ['eye', watched ? 'Seen' : 'Seen it', watched, '#7BFFB0', () => wl.toggleWatched(movie)],
                ['share-2', 'Share', false, accent, () => shareTitle(movie)],
              ].map(([icon, label, on, color, fn]) => (
                <Pressable key={label} onPress={fn} style={({ pressed }) => [styles.action, on && { borderColor: `${color}66`, backgroundColor: `${color}1f` }, { opacity: pressed ? 0.8 : 1 }]}>
                  <Feather name={icon} size={15} color={on ? color : '#fff'} />
                  <Text style={[styles.actionText, on && { color }]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {movie?.overview ? <Text style={styles.overview}>{movie.overview}</Text> : null}

          {/* Similar — flat list with reasons, as on the web */}
          <View onLayout={(e) => { similarY.current = e.nativeEvent.layout.y; }}>
            <SectionLabel accent={accent}>More like this</SectionLabel>
            {similar === null ? <Spinner accent={accent} /> : similar.length === 0 ? <Text style={styles.muted}>Nothing similar found yet.</Text> : similar.map((m, i) => (
              <Pressable key={`${m.id}-${i}`} onPress={() => openTitle(m)} style={({ pressed }) => [styles.simRow, i && styles.simBorder, { opacity: pressed ? 0.75 : 1 }]}>
                <Poster uri={m.poster} width={54} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.simTitle} numberOfLines={1}>{m.title}</Text>
                  <Text style={styles.simMeta} numberOfLines={1}>{[m.year, m.rating && m.rating !== 'N/A' ? `★ ${m.rating}` : null, m.isTV ? 'Series' : null].filter(Boolean).join(' · ')}</Text>
                  {m.matchReason ? <Text style={[styles.simReason, { color: accent }]} numberOfLines={2}>{m.match ? `${m.match}% · ` : ''}{m.matchReason}</Text> : null}
                </View>
                <Pressable hitSlop={10} onPress={() => wl.toggleSave(m)}>
                  <Feather name={wl.ids.has(m.id) ? 'check' : 'plus'} size={18} color={wl.ids.has(m.id) ? '#7BFF9E' : 'rgba(255,255,255,0.7)'} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  noTrailer: { fontFamily: F.semibold, color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  close: { position: 'absolute', left: 14 },
  title: { fontFamily: F.displayHeavy, fontSize: 26, lineHeight: 30, color: '#fff', letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  meta: { fontFamily: F.medium, fontSize: 12.5, color: 'rgba(255,255,255,0.7)' },
  dot: { color: 'rgba(255,255,255,0.4)', marginHorizontal: 6 },
  genres: { fontFamily: F.bold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  action: { flex: 1, height: 42, borderRadius: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: T.hairlineStrong, backgroundColor: 'rgba(255,255,255,0.04)' },
  actionText: { fontFamily: F.bold, fontSize: 13, color: '#fff' },
  overview: { fontFamily: F.body, fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,0.82)', marginTop: 18 },
  muted: { fontFamily: F.body, fontSize: 12.5, color: T.text2 },
  simRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  simBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hairlineStrong },
  simTitle: { fontFamily: F.bold, fontSize: 14, color: '#fff' },
  simMeta: { fontFamily: F.body, fontSize: 11.5, color: T.text2, marginTop: 3 },
  simReason: { fontFamily: F.semibold, fontSize: 11.5, marginTop: 4, lineHeight: 16 },
});
