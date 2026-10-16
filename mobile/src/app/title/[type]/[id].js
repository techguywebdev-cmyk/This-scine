import { useEffect, useRef, useState } from 'react';
import { getPrefs } from '../../../lib/prefs';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import Ambient from '../../../components/Ambient';
import { GlassButton, Poster, SectionLabel, Spinner } from '../../../components/Ui';
import { useApi } from '../../../lib/api';
import { useWatchlist } from '../../../lib/store';
import StartParty from '../../../components/StartParty';
import { CommentList, Composer, useComments } from '../../../components/Comments';
import { useAuth } from '@clerk/expo';
import { openTitle, shareTitle } from '../../../lib/titles';
import { F, T, inkOn } from '../../../lib/theme';
import { useAccent } from '../../../lib/accent';
import { useThemed } from '../../../lib/userTheme';
import StreamOn from '../../../components/StreamOn';

export default function TitleScreen() {
  const { type, id, title: initialTitle, focus, accent: passedAccent, act, tab: startTab } = useLocalSearchParams();
  const liveAccent = useAccent();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const api = useApi();
  const wl = useWatchlist();
  const [movie, setMovie] = useState(null);
  const [trailerKey, setTrailerKey] = useState(undefined);
  const [similar, setSimilar] = useState(null);
  const [details, setDetails] = useState(null);
  const keysRef = useRef([]);
  const [more, setMore] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [playing, setPlaying] = useState(getPrefs().autoplay !== false);
  const [party, setParty] = useState(act === 'party');
  const [tab, setTab] = useState(startTab === 'comments' ? 'comments' : 'about');
  const [replyTo, setReplyTo] = useState(null); // from a reminder's "Watch together" button
  const { isSignedIn } = useAuth();
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
    // A failed lookup (TMDB busy) is retried rather than shown as "no trailer"
    const retry = async (path) => { for (let i = 0; i < 3; i++) { try { return await api.get(path); } catch {} if (!alive) return null; await new Promise((r) => setTimeout(r, 800 * (i + 1))); } return null; };
    retry(`/api/movie-details?id=${id}&type=${type}`).then((d) => alive && d && setDetails(d));
    retry(`/api/trailer?id=${id}&type=${type}`).then((d) => { if (!alive) return; keysRef.current = d?.keys?.length ? d.keys : d?.trailerKey ? [d.trailerKey] : []; setTrailerKey(keysRef.current[0] || null); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, type]);

  useEffect(() => {
    if (focus === 'similar' && similar && similar.length && scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollTo({ y: similarY.current - 20, animated: true }), 250);
    }
  }, [focus, similar]);

  // Keep the colour of the card you came from (the API can assign a different one)
  const accent = useThemed(passedAccent || liveAccent || movie?.accent || T.accent);
  const videoH = Math.round((width * 9) / 16);
  const saved = movie && wl.ids.has(movie.id);
  const watched = movie && wl.isWatched(movie.id);
  const comments = useComments(movie || { id: Number(id), title: initialTitle, isTV: type === 'tv' });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: T.bg }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Ambient accent={accent} />
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        {/* Trailer / hero */}
        <View style={{ width, height: videoH + insets.top, paddingTop: insets.top, backgroundColor: '#000' }}>
          {trailerKey ? (
            <YoutubePlayer key={trailerKey} height={videoH} width={width} videoId={trailerKey} play={playing} mute={!!getPrefs().startMuted} onChangeState={(s) => s === 'ended' && setPlaying(false)} onError={() => { const ks = keysRef.current; const i = ks.indexOf(trailerKey); setTrailerKey(i >= 0 && i < ks.length - 1 ? ks[i + 1] : null); }} webViewProps={{ allowsInlineMediaPlayback: true }} initialPlayerParams={{ modestbranding: true, rel: false }} />
          ) : (
            <View style={{ width, height: videoH }}>
              {movie?.backdrop ? <Image source={{ uri: movie.backdrop }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
              <LinearGradient colors={['transparent', 'rgba(6,6,11,0.8)']} style={StyleSheet.absoluteFill} />
              <View style={styles.center}>{trailerKey === undefined ? <ActivityIndicator color="#fff" /> : <Text style={styles.noTrailer}>No trailer available</Text>}</View>
            </View>
          )}
        </View>
        <View style={[styles.close, { top: insets.top + 10 }]}><GlassButton icon="arrow-left" size={40} onPress={() => router.back()} label="Back" /></View>

        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <Text style={[styles.title, { flex: 1 }]}>{movie?.title || initialTitle}</Text>
            {movie ? (
              <>
                <Pressable onPress={() => (isSignedIn ? setParty(true) : router.push('/sign-in'))} accessibilityLabel="Start a watch party" style={[styles.roundBtn, { borderColor: `${accent}66`, backgroundColor: `${accent}1f` }]}><Text style={{ fontSize: 20 }}>🍿</Text></Pressable>
                <Pressable onPress={() => shareTitle(movie)} accessibilityLabel="Share" style={[styles.sharePill, { borderColor: `${accent}66`, backgroundColor: `${accent}1f` }]}>
                  <Feather name="share" size={15} color={accent} /><Text style={[styles.shareText, { color: accent }]}>Share</Text>
                </Pressable>
              </>
            ) : null}
          </View>
          {movie ? (
            <View style={styles.metaRow}>
              {movie.year ? <Text style={styles.meta}>{movie.year}</Text> : null}
              {(details?.certification || movie?.certification) ? <View style={styles.cert}><Text style={styles.certText}>{details?.certification || movie?.certification}</Text></View> : null}
              {(movie.genre || []).map((g, i) => <Text key={g} style={[styles.genre, { color: accent }]}>{i ? '· ' : ''}{g}</Text>)}
              {movie.isTV ? <Text style={styles.meta}>· Series</Text> : null}
            </View>
          ) : null}

          <View style={styles.tabs}>
            {[['about', 'About'], ['comments', `Comments${comments.list ? ` (${comments.list.reduce((n, c) => n + 1 + (c.replies || []).length, 0)})` : ''}`]].map(([k, l]) => (
              <Pressable key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && { borderBottomColor: accent }]}>
                <Text style={[styles.tabText, tab === k && { color: accent, fontFamily: F.bold }]}>{l}</Text>
              </Pressable>
            ))}
          </View>

          {tab === 'comments' ? (
            <View style={{ paddingBottom: 20 }}>
              <CommentList list={comments.list} title={movie?.title || initialTitle} onReply={setReplyTo} onRemove={comments.remove} />
              <View style={styles.inlineComposer}>
                <Composer accent={accent} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} onPost={comments.post} initialRating={myRating} />
              </View>
            </View>
          ) : null}

          {tab === 'about' && movie ? (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginTop: 20 }}>
                <View style={{ alignSelf: 'flex-start' }}><Poster uri={movie.poster} width={Math.round(width * 0.3)} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.overview} numberOfLines={more ? undefined : 6}>{details?.overview || movie.overview}</Text>
                  {(details?.overview || movie.overview || '').length > 200 ? <Pressable onPress={() => setMore((v) => !v)} hitSlop={6}><Text style={[styles.readMore, { color: accent }]}>{more ? 'Show less' : 'Read more'}</Text></Pressable> : null}
                  <View style={styles.tagRow}>
                    {details?.certification || movie?.certification ? <View style={styles.cert}><Text style={styles.certText}>{details?.certification || movie?.certification}</Text></View> : null}
                    {(movie.genre || []).map((g) => <View key={g} style={styles.tag}><Text style={styles.tagText}>{g}</Text></View>)}
                  </View>
                </View>
              </View>

              <View style={styles.ratings}>
                <View style={styles.rateBox}>
                  <Text style={styles.rateLabel}>TMDB RATING</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
                    <Ionicons name="star" size={18} color={accent} />
                    <Text style={styles.rateBig}>{movie.rating !== 'N/A' ? movie.rating : '—'}</Text>
                    <Text style={styles.rateOf}>/10</Text>
                  </View>
                  <Text style={styles.rateSub}>{details?.vote_count ? `${details.vote_count >= 1000 ? `${Math.round(details.vote_count / 1000)}K` : details.vote_count} votes` : movie.votes ? `${movie.votes} votes` : ''}</Text>
                </View>
                <View style={[styles.rateBox, { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: 'rgba(255,255,255,0.1)' }]}>
                  <Text style={styles.rateLabel}>YOUR RATING</Text>
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: 10 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Pressable key={n} hitSlop={4} onPress={() => { setMyRating(n); setTab('comments'); }} accessibilityLabel={`Rate ${n} stars`}>
                        <Ionicons name={n <= myRating ? 'star' : 'star-outline'} size={20} color={n <= myRating ? accent : 'rgba(255,255,255,0.3)'} />
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.rateSub}>{myRating ? `${myRating}/5 — add a comment` : 'Rate this movie'}</Text>
                </View>
              </View>

              <View style={styles.actions}>
                {[
                  [saved ? 'check' : 'plus', saved ? 'In your watchlist' : 'Add to watchlist', saved, '#7BFF9E', () => wl.toggleSave(movie)],
                  ['eye', watched ? 'Seen' : 'Seen it', watched, '#7BFFB0', () => wl.toggleWatched(movie)],
                ].map(([icon, label, on, color, fn], i) => (
                  <Pressable key={label} onPress={fn} style={({ pressed }) => [styles.action, { flex: i ? 1 : 1.8 }, on ? { borderColor: `${color}66`, backgroundColor: `${color}1f` } : !i && { backgroundColor: accent, borderColor: accent }, { opacity: pressed ? 0.8 : 1 }]}>
                    <Feather name={icon} size={18} color={on ? color : !i ? inkOn(accent) : '#fff'} />
                    <Text style={[styles.actionText, { color: on ? color : !i ? inkOn(accent) : '#fff' }]} numberOfLines={1}>{label}</Text>
                  </Pressable>
                ))}
              </View>

              <StreamOn movie={movie} style={{ marginTop: 20, marginBottom: 0 }} />
            </View>
          ) : null}

          {/* Similar — flat list with reasons, as on the web */}
          {tab === 'about' ? <View onLayout={(e) => { similarY.current = e.nativeEvent.layout.y; }}>
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
          </View> : null}
        </View>
      </ScrollView>
      {party && movie ? <StartParty movie={movie} onClose={() => setParty(false)} /> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  roundBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sharePill: { height: 44, borderRadius: 22, borderWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 7 },
  shareText: { fontFamily: F.bold, fontSize: 14 },
  cert: { borderWidth: 1, borderColor: '#F5A62399', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#F5A6231a' },
  certText: { fontFamily: F.bold, fontSize: 11, color: '#F5A623' },
  genre: { fontFamily: F.semibold, fontSize: 15 },
  readMore: { fontFamily: F.bold, fontSize: 14, marginTop: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, alignItems: 'center' },
  tag: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontFamily: F.medium, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  ratings: { flexDirection: 'row', marginTop: 22, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  rateBox: { flex: 1, paddingVertical: 16, paddingHorizontal: 14 },
  rateLabel: { fontFamily: F.bold, fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.45)' },
  rateBig: { fontFamily: F.displayHeavy, fontSize: 30, color: '#fff' },
  rateOf: { fontFamily: F.medium, fontSize: 13, color: 'rgba(255,255,255,0.45)' },
  rateSub: { fontFamily: F.body, fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6 },
  inlineComposer: { marginTop: 18, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)' },
  tabs: { flexDirection: 'row', gap: 22, marginTop: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.hairline },
  tab: { paddingBottom: 11, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontFamily: F.medium, fontSize: 13.5, color: T.text3 },
  composer: { paddingHorizontal: 16, paddingTop: 6, backgroundColor: 'rgba(6,6,11,0.92)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hairline },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  noTrailer: { fontFamily: F.semibold, color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  close: { position: 'absolute', left: 14 },
  title: { fontFamily: F.displayHeavy, fontSize: 26, lineHeight: 30, color: '#fff', letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  meta: { fontFamily: F.medium, fontSize: 15, color: 'rgba(255,255,255,0.6)' },
  dot: { color: 'rgba(255,255,255,0.4)', marginHorizontal: 6 },
  genres: { fontFamily: F.bold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 18 },
  action: { flex: 1, height: 50, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(0,0,0,0.3)' },
  actionText: { fontFamily: F.bold, fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  overview: { fontFamily: F.body, fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,0.82)', marginTop: 18 },
  muted: { fontFamily: F.body, fontSize: 12.5, color: T.text2 },
  simRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  simBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hairlineStrong },
  simTitle: { fontFamily: F.bold, fontSize: 14, color: '#fff' },
  simMeta: { fontFamily: F.body, fontSize: 11.5, color: T.text2, marginTop: 3 },
  simReason: { fontFamily: F.semibold, fontSize: 11.5, marginTop: 4, lineHeight: 16 },
});
