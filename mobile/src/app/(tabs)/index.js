import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from 'expo-router/build/react-navigation/bottom-tabs';
import { useAuth } from '@clerk/expo';
import { router } from 'expo-router';
import FeedCard from '../../components/FeedCard';
import { useApi } from '../../lib/api';
import { useWatchlist } from '../../lib/store';
import { openTitle, shareTitle } from '../../lib/titles';
import { feedKey, isSeen, loadSeen, markSeen, recentSeen } from '../../lib/feedMemory';
import { F, MOODS, T } from '../../lib/theme';

const newSeed = () => String(Math.floor(Math.random() * 1e9));

export default function Feed() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBar = useBottomTabBarHeight();
  const api = useApi();
  const { isSignedIn } = useAuth();
  const wl = useWatchlist();
  const [mood, setMood] = useState('Trending');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reminded, setReminded] = useState(new Set());
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
    busy.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, wl.items.length]);

  useEffect(() => { load(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [mood]);
  useEffect(() => {
    if (!isSignedIn) return;
    api.get('/api/reminders').then((d) => setReminded(new Set((d.items || []).map((r) => r.movie_id)))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  const onViewable = useRef(({ viewableItems }) => { const v = viewableItems[0]; if (v?.item) setTimeout(() => markSeen(v.item), 1200); }).current;

  const toggleRemind = async (m) => {
    if (!isSignedIn) { router.push('/sign-in'); return; }
    const on = reminded.has(m.id);
    setReminded((p) => { const n = new Set(p); on ? n.delete(m.id) : n.add(m.id); return n; });
    try {
      if (on) await api.del('/api/reminders', { movieId: m.id, mediaType: m.isTV ? 'tv' : 'movie' });
      else await api.post('/api/reminders', { movieId: m.id, mediaType: m.isTV ? 'tv' : 'movie', title: m.title, poster: m.poster, releaseDate: m.releaseDate });
    } catch {}
  };

  const renderItem = ({ item }) => (
    <FeedCard
      movie={item}
      height={height}
      bottomInset={tabBar}
      saved={wl.ids.has(item.id)}
      watched={wl.isWatched(item.id)}
      reminded={reminded.has(item.id)}
      onOpen={() => openTitle(item)}
      onSave={() => wl.toggleSave(item)}
      onWatched={() => wl.toggleWatched(item)}
      onRemind={() => toggleRemind(item)}
      onSimilar={() => router.push({ pathname: '/title/[type]/[id]', params: { type: item.isTV ? 'tv' : 'movie', id: String(item.id), title: item.title, focus: 'similar' } })}
      onShare={() => shareTitle(item)}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {loading && movies.length === 0 ? (
        <View style={styles.center}><ActivityIndicator color={T.accent} /><Text style={styles.loadingText}>LOADING FILMS…</Text></View>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(m) => feedKey(m)}
          renderItem={renderItem}
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

      {/* Top bar: brand + moods */}
      <View pointerEvents="box-none" style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.brand}>CineScroll</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingHorizontal: 18, paddingTop: 10 }}>
          {MOODS.map((m) => (
            <Pressable key={m} onPress={() => setMood(m)}>
              <Text style={[styles.mood, mood === m && styles.moodOn]}>{m}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 2.2, color: T.text3 },
  top: { position: 'absolute', left: 0, right: 0, top: 0 },
  brand: { fontFamily: F.display, fontSize: 20, color: '#fff', paddingHorizontal: 18, letterSpacing: -0.4 },
  mood: { fontFamily: F.semibold, fontSize: 13.5, color: 'rgba(255,255,255,0.55)' },
  moodOn: { color: '#fff', fontFamily: F.bold },
});
