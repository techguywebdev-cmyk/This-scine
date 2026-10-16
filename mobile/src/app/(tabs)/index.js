import { useCallback, useEffect, useRef, useState } from 'react';
import FeedPopups from '../../components/FeedPopups';
import { usePrefsVersion } from '../../lib/prefs';
import { Animated, FlatList, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from 'expo-router/build/react-navigation/bottom-tabs';
import { useAuth } from '@clerk/expo';
import { router } from 'expo-router';
import FeedCard from '../../components/FeedCard';
import RemindSheet from '../../components/RemindSheet';
import ReviewsSheet from '../../components/ReviewsSheet';
import { TsLoader, Wordmark } from '../../components/Brand';
import { useApi } from '../../lib/api';
import { useWatchlist } from '../../lib/store';
import { openTitle, shareTitle } from '../../lib/titles';
import { feedKey, isSeen, loadSeen, markSeen, recentSeen } from '../../lib/feedMemory';
import { Feather } from '@expo/vector-icons';
import { F, FEEDS, GENRES, T } from '../../lib/theme';
import { setFeedFilter, useFeedFilter } from '../../lib/feedFilter';
import { GlassButton } from '../../components/Ui';
import { markBootReady } from '../../lib/boot';
import { setAccent } from '../../lib/accent';
import { useThemed } from '../../lib/userTheme';

const newSeed = () => String(Math.floor(Math.random() * 1e9));

export default function Feed() {
  const prefsV = usePrefsVersion();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBar = useBottomTabBarHeight();
  const api = useApi();
  const { isSignedIn } = useAuth();
  const wl = useWatchlist();
  const filter = useFeedFilter();
  const setFilter = setFeedFilter;
  const mood = filter.mood;
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reminded, setReminded] = useState(new Set());
  const [activeAccent, setActiveAccent] = useState('#fff');
  const themedActive = useThemed(activeAccent);
  const [savedToast, setSavedToast] = useState(null);
  const [remindRow, setRemindRow] = useState(null);
  const [reviewsFor, setReviewsFor] = useState(null);
  const [activeKey, setActiveKey] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const toastTimer = useRef(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const page = useRef(1);
  const seed = useRef(newSeed());
  const busy = useRef(false);

  const taste = () => {
    const counts = {};
    wl.items.forEach((w) => (Array.isArray(w.genre) ? w.genre : []).forEach((g) => { counts[g] = (counts[g] || 0) + (w.watched ? 1 : 2); }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([g]) => g);
  };

  const load = useCallback(async (append = false, retry = 0) => {
    if (busy.current && !retry) return;
    busy.current = true;
    await loadSeen();
    if (!append) { setLoading(true); seed.current = newSeed(); page.current = 1; }
    try {
      const q = new URLSearchParams({ mood: mood.toLowerCase(), page: String(page.current), seed: seed.current });
      if (filter.genre) q.set('genre', filter.genre);
      if (filter.provider) q.set('provider', filter.provider.toLowerCase());
      const ex = recentSeen(); if (ex.length) q.set('exclude', ex.join(','));
      const t = taste(); if (t.length) q.set('taste', t.join(','));
      const d = await api.get(`/api/movies?${q}`);
      const raw = d.movies || [];
      const fresh = raw.filter((m) => !isSeen(m));
      const pick = fresh.length >= 5 ? fresh : raw;
      if (append) {
        setMovies((p) => { const have = new Set(p.map(feedKey)); return [...p, ...pick.filter((m) => !have.has(feedKey(m)))]; });
        if (fresh.length < 4 && retry < 2) { page.current += 1; busy.current = false; return load(true, retry + 1); }
      } else setMovies(pick);
    } catch {}
    setLoading(false);
    markBootReady();
    busy.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, filter.genre, filter.provider, wl.items.length, prefsV]);

  useEffect(() => { load(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [mood, filter.genre, filter.provider, prefsV]);
  useEffect(() => {
    if (!isSignedIn) return;
    api.get('/api/reminders').then((d) => setReminded(new Set((d.items || []).map((r) => r.movie_id)))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  const filterOn = mood !== 'Trending' || !!filter.genre || !!filter.provider;
  const onViewable = useRef(({ viewableItems }) => { const v = viewableItems[0]; if (v?.index != null) setActiveIdx(v.index); if (v?.item) { setActiveAccent(v.item.accent || T.accent); setAccent(v.item.accent); setActiveKey(feedKey(v.item)); setTimeout(() => markSeen(v.item), 1200); } }).current;
  useEffect(() => { if (movies[0] && activeAccent === '#fff') { setActiveAccent(movies[0].accent || T.accent); setAccent(movies[0].accent); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [movies.length]);

  const showSaved = (m) => {
    clearTimeout(toastTimer.current);
    setSavedToast(m);
    Animated.spring(toastAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
    toastTimer.current = setTimeout(hideSaved, 4500);
  };
  const hideSaved = () => { clearTimeout(toastTimer.current); Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setSavedToast(null)); };
  const onSave = async (m) => { const added = await wl.toggleSave(m); if (added) showSaved(m); };

  const toggleRemind = async (m) => {
    if (!isSignedIn) { router.push('/sign-in'); return; }
    const on = reminded.has(m.id);
    setReminded((p) => { const n = new Set(p); on ? n.delete(m.id) : n.add(m.id); return n; });
    try {
      if (on) await api.del('/api/reminders', { movieId: m.id, mediaType: m.isTV ? 'tv' : 'movie' });
      else await api.post('/api/reminders', { movieId: m.id, mediaType: m.isTV ? 'tv' : 'movie', title: m.title, poster: m.poster, releaseDate: m.releaseDate });
    } catch {}
  };

  const renderItem = ({ item, index }) => (
    <FeedCard
      movie={item}
      index={index}
      topInset={insets.top - 20 + (filterOn ? 38 : 0)}
      active={activeKey ? activeKey === feedKey(item) : index === 0}
      onReviews={() => setReviewsFor(item)}
      height={height}
      bottomInset={tabBar}
      saved={wl.ids.has(item.id)}
      watched={wl.isWatched(item.id)}
      reminded={reminded.has(item.id)}
      onOpen={() => openTitle(item)}
      onSave={() => onSave(item)}
      onWatched={() => wl.toggleWatched(item)}
      onRemind={() => toggleRemind(item)}
      onSimilar={() => router.push({ pathname: '/title/[type]/[id]', params: { type: item.isTV ? 'tv' : 'movie', id: String(item.id), title: item.title, focus: 'similar' } })}
      onShare={() => shareTitle(item)}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {loading && movies.length === 0 ? (
        <View style={styles.center}><TsLoader size={52} /></View>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(m) => feedKey(m)}
          renderItem={renderItem}
          extraData={activeKey}
          pagingEnabled
          snapToInterval={height}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
          onEndReached={() => { page.current += 1; load(true); }}
          onEndReachedThreshold={3}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
          windowSize={5}
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          removeClippedSubviews
        />
      )}

      <FeedPopups accent={themedActive === '#fff' ? T.accent : themedActive} top={insets.top + 62} activeIndex={activeIdx} />
      {/* Top bar: brand + filter */}
      <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <View pointerEvents="box-none" style={styles.topRow}>
          <Wordmark accent={themedActive} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <GlassButton ionicon="sparkles-outline" label="Ask Thiscene — describe what you want to watch" onPress={() => router.push('/ask')} />
            <View>
            <GlassButton icon="sliders" label="Filter the feed" onPress={() => router.navigate('/discover')} />
            {filterOn ? <View style={styles.filterDot} /> : null}
            </View>
          </View>
        </View>
        {filterOn ? (
          <View pointerEvents="box-none" style={styles.chips}>
            {[
              mood !== 'Trending' ? [FEEDS.find((f) => f.api === mood)?.label || mood, () => setFilter((f) => ({ ...f, mood: 'Trending' }))] : null,
              filter.genre ? [(GENRES.find((g) => g[1] === filter.genre) || [])[0], () => setFilter((f) => ({ ...f, genre: '' }))] : null,
              filter.provider ? [filter.provider, () => setFilter((f) => ({ ...f, provider: '' }))] : null,
            ].filter(Boolean).map(([l, fn]) => (
              <Pressable key={l} onPress={fn} style={styles.chip}><Text style={styles.chipText}>{l}</Text><Feather name="x" size={12} color="#fff" /></Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {savedToast ? (
        <Animated.View style={[styles.toast, { bottom: tabBar + 14, opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
          <Text style={styles.toastText} numberOfLines={1}>Saved <Text style={{ color: T.text2, fontFamily: F.body }}>· {savedToast.title}</Text></Text>
          <Pressable onPress={() => { hideSaved(); setRemindRow({ ...savedToast, movie_id: savedToast.id }); }} style={styles.toastBtn} accessibilityLabel="Remind me to watch">
            <Feather name="bell" size={13} color="#fff" /><Text style={styles.toastBtnText}>Remind me</Text>
          </Pressable>
        </Animated.View>
      ) : null}
      {reviewsFor ? <ReviewsSheet movie={reviewsFor} onClose={() => setReviewsFor(null)} /> : null}
      {remindRow ? <RemindSheet row={{ ...remindRow, ...(wl.items.find((x) => x.movie_id === remindRow.movie_id) || {}) }} onClose={() => setRemindRow(null)} onChange={wl.setRemind} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 2.2, color: T.text3 },
  top: { position: 'absolute', left: 0, right: 0, top: 0 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  filterDot: { position: 'absolute', top: 2, right: 2, width: 9, height: 9, borderRadius: 5, backgroundColor: '#fff', borderWidth: 2, borderColor: T.bg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 18, marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, paddingHorizontal: 11, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  chipText: { fontFamily: F.bold, fontSize: 11.5, color: '#fff' },
  toast: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(12,12,18,0.92)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingLeft: 14, paddingRight: 8, height: 50 },
  toastText: { flex: 1, fontFamily: F.bold, fontSize: 13, color: '#fff' },
  toastBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  toastBtnText: { fontFamily: F.bold, fontSize: 12, color: '#fff' },
  brand: { fontFamily: F.display, fontSize: 20, color: '#fff', paddingHorizontal: 18, letterSpacing: -0.4 },
  mood: { fontFamily: F.semibold, fontSize: 13.5, color: 'rgba(255,255,255,0.55)' },
  moodOn: { color: '#fff', fontFamily: F.bold },
});
