import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Ambient from '../../components/Ambient';
import MovieRow from '../../components/MovieRow';
import { SectionLabel } from '../../components/Ui';
import { TsLoader } from '../../components/Brand';
import { useApi } from '../../lib/api';
import { useAccent } from '../../lib/accent';
import { setFeedFilter, useFeedFilter } from '../../lib/feedFilter';
import { openTitle } from '../../lib/titles';
import { F, FEEDS, GENRES, PLATFORMS, T } from '../../lib/theme';

// Same mood detection as the website: "something scary", "feel good" → a mood
const MOOD_SIGNALS = [
  ['happy', 'cheerful', 'funny', 'laugh', 'comedy', 'light', 'feel good'],
  ['sad', 'cry', 'emotional', 'heartbreak', 'tearjerker', 'melancholy'],
  ['scary', 'horror', 'terrifying', 'creepy', 'dark', 'thriller', 'suspense'],
  ['romantic', 'love', 'date night', 'romance'],
  ['action', 'exciting', 'adrenaline', 'intense', 'epic', 'adventure'],
  ['thought provoking', 'intelligent', 'deep', 'mind bending', 'complex'],
  ['chill', 'relaxing', 'easy', 'calm', 'comfort', 'cozy'],
  ['inspiring', 'uplifting', 'motivating'],
];
const MOOD_NAMES = ['happy', 'sad', 'horror', 'romance', 'action', 'thoughtful', 'chill', 'uplifting'];
const detectMood = (q) => { const l = q.toLowerCase(); const i = MOOD_SIGNALS.findIndex((s) => s.some((k) => l.includes(k))); return i >= 0 ? MOOD_NAMES[i] : null; };
const dayPart = () => { const h = new Date().getHours(); return h < 12 ? 'This morning' : h < 17 ? 'This afternoon' : 'Tonight'; };
const FEED_ICON = { Trending: ['flame', 'Ionicons'], 'Top Rated': ['star', 'Ionicons'], New: ['sparkles', 'Ionicons'], Upcoming: ['calendar-outline', 'Ionicons'], 'Hidden Gems': ['diamond-outline', 'Ionicons'], International: ['globe-outline', 'Ionicons'], Awards: ['trophy-outline', 'Ionicons'] };

export default function Discover() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const api = useApi();
  const accent = useAccent();
  const filter = useFeedFilter();
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [searchMood, setSearchMood] = useState(null);
  const [tonight, setTonight] = useState(null);
  const [covers, setCovers] = useState({});
  const timer = useRef(null);

  useEffect(() => {
    const p = new URLSearchParams({ mood: 'trending', page: '1' });
    if (filter.provider) p.set('provider', filter.provider.toLowerCase());
    api.get(`/api/movies?${p}`).then((d) => {
      const pool = (d.movies || []).filter((m) => !m.isUpcoming);
      const day = new Date().toISOString().slice(0, 10); let seed = 0; for (const ch of day) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
      const out = [...pool]; for (let i = out.length - 1; i > 0; i--) { seed = (seed * 1103515245 + 12345) >>> 0; const j = seed % (i + 1); [out[i], out[j]] = [out[j], out[i]]; }
      setTonight(out.slice(0, 10));
    }).catch(() => setTonight([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.provider]);

  useEffect(() => {
    Promise.all(FEEDS.map((f) => api.get(`/api/movies?mood=${encodeURIComponent(f.api)}&page=1`).then((d) => d.movies || []).catch(() => []))).then((lists) => {
      const used = new Set(), out = {};
      lists.forEach((list, i) => { const m = list.find((x) => (x.backdrop || x.poster) && !used.has(x.id)) || list.find((x) => x.backdrop || x.poster); if (m) { used.add(m.id); out[FEEDS[i].api] = m.backdrop || m.poster; } });
      setCovers(out);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!q.trim()) { setResults(null); setSearchMood(null); return; }
    timer.current = setTimeout(() => {
      const mood = detectMood(q); setSearchMood(mood);
      const p = new URLSearchParams({ search: q.trim() }); if (mood) p.set('mood', mood);
      api.get(`/api/movies?${p}`).then((d) => setResults(d.movies || [])).catch(() => setResults([]));
    }, 350);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const apply = (patch) => { Haptics.selectionAsync().catch(() => {}); setFeedFilter(patch); router.navigate('/'); };
  const has = filter.mood !== 'Trending' || filter.genre || filter.provider;
  const feedLabel = [filter.mood !== 'Trending' ? FEEDS.find((f) => f.api === filter.mood)?.label : null, filter.genre ? (GENRES.find((g) => g[1] === filter.genre) || [])[0] : null, filter.provider || null].filter(Boolean).join(' · ');
  const half = (width - 40 - 10) / 2;

  return (
    <View style={{ flex: 1 }}>
      <Ambient />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: 120 }}>
        <Text style={styles.h1}>Discover</Text>
        <View style={styles.search}>
          <Feather name="search" size={18} color="rgba(255,255,255,0.5)" />
          <TextInput value={q} onChangeText={setQ} placeholder="Search a title, or describe a mood" placeholderTextColor="rgba(255,255,255,0.4)" style={styles.input} returnKeyType="search" />
          {q ? <Pressable onPress={() => setQ('')} hitSlop={8}><Feather name="x" size={16} color="rgba(255,255,255,0.6)" /></Pressable> : null}
        </View>

        {results !== null || q.trim() ? (
          results === null ? <View style={{ paddingVertical: 40, alignItems: 'center' }}><TsLoader size={36} /></View>
            : results.length === 0 ? (
              <View style={{ paddingVertical: 36, alignItems: 'center' }}>
                <Text style={styles.bold}>Nothing found for “{q}”</Text>
                <Text style={[styles.muted, { textAlign: 'center', marginTop: 6 }]}>Check the spelling, or describe a mood instead, like “something scary” or “feel good”.</Text>
              </View>
            ) : (
              <>
                <Text style={[styles.muted, { paddingTop: 16, paddingBottom: 8 }]}>{searchMood ? <>Showing <Text style={{ color: accent, fontFamily: F.bold }}>{searchMood}</Text> picks for “{q}”</> : `${results.length} results for “${q}”`}</Text>
                {results.map((m, i) => <MovieRow key={`${m.id}-${m.isTV}`} movie={m} first={i === 0} />)}
              </>
            )
        ) : (
          <>
            {has ? (
              <View style={styles.yourFeed}>
                <Text style={styles.muted} numberOfLines={1}>Your feed: <Text style={{ color: '#fff', fontFamily: F.bold }}>{feedLabel}</Text></Text>
                <Pressable onPress={() => setFeedFilter({ mood: 'Trending', genre: '', provider: '' })} hitSlop={8}><Text style={[styles.clear, { color: accent }]}>Clear all</Text></Pressable>
              </View>
            ) : null}

            <SectionLabel right={<Text style={styles.muted}>{filter.provider ? `On ${filter.provider}` : 'Trending today'}</Text>}>{`${dayPart()} for you`}</SectionLabel>
            {tonight === null ? <TsLoader size={30} /> : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
                {tonight.map((m) => (
                  <Pressable key={m.id} onPress={() => openTitle(m)} style={{ width: 112 }}>
                    <View style={styles.poster}>{m.poster ? <Image source={{ uri: m.poster }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}</View>
                    <Text style={styles.pTitle} numberOfLines={1}>{m.title}</Text>
                    <Text style={styles.pMeta}>{m.year}{m.rating && m.rating !== 'N/A' ? <> · <Text style={{ color: '#FFD166' }}>★</Text> {m.rating}</> : null}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <SectionLabel>Browse by</SectionLabel>
            <View style={styles.grid}>
              {FEEDS.map((f, i) => {
                const on = filter.mood === f.api;
                const wide = i === FEEDS.length - 1 && FEEDS.length % 2 === 1;
                const [icon] = FEED_ICON[f.api] || ['film'];
                return (
                  <Pressable key={f.api} onPress={() => apply({ mood: f.api })} style={[styles.tile, { width: wide ? width - 40 : half, height: wide ? 92 : 104, borderColor: on ? accent : 'rgba(255,255,255,0.08)', borderWidth: on ? 2 : 1 }]}>
                    <LinearGradient colors={[`${accent}22`, 'rgba(255,255,255,0.03)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                    {covers[f.api] ? <Image source={{ uri: covers[f.api] }} style={[StyleSheet.absoluteFill, { opacity: on ? 0.6 : 0.42 }]} contentFit="cover" transition={300} /> : null}
                    <LinearGradient colors={['rgba(6,6,11,0.15)', 'rgba(6,6,11,0.85)']} style={StyleSheet.absoluteFill} />
                    <View style={styles.tileText}>
                      <Ionicons name={icon} size={17} color={on ? accent : '#fff'} />
                      <Text style={styles.tileTitle}>{f.label}</Text>
                      <Text style={styles.tileSub} numberOfLines={1}>{f.desc}</Text>
                    </View>
                    {on ? <View style={[styles.check, { backgroundColor: accent }]}><Feather name="check" size={12} color="#07070F" /></View> : null}
                  </Pressable>
                );
              })}
            </View>

            <SectionLabel>Genre</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 22 }}>
              {[['Any genre', ''], ...GENRES].map(([l, id]) => {
                const on = (filter.genre || '') === id;
                return (
                  <Pressable key={id || 'any'} onPress={() => apply({ genre: on && id ? '' : id })} style={[styles.genreRow, { width: (width - 40 - 22) / 2 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                      <View style={[styles.gDot, on && { backgroundColor: accent }]} />
                      <Text style={[styles.genre, on && { color: accent, fontFamily: F.displayHeavy }]}>{l}</Text>
                    </View>
                    {on ? <Feather name="check" size={14} color={accent} /> : null}
                  </Pressable>
                );
              })}
            </View>

            <SectionLabel style={{ marginBottom: 2 }}>Platforms</SectionLabel>
            <Text style={[styles.muted, { marginBottom: 10 }]}>Only show what you can stream</Text>
            <View style={styles.grid}>
              {PLATFORMS.map(([n, c]) => {
                const on = filter.provider === n;
                return (
                  <Pressable key={n} onPress={() => apply({ provider: on ? '' : n })} style={[styles.plat, { width: half, borderColor: on ? accent : 'rgba(255,255,255,0.08)', borderWidth: on ? 2 : 1 }]}>
                    <LinearGradient colors={[`${c}${on ? '55' : '33'}`, 'rgba(255,255,255,0.03)']} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 0.9 }} style={StyleSheet.absoluteFill} />
                    <Text style={styles.platText}>{n}</Text>
                    {on ? <View style={[styles.check, { top: 6, right: 6, width: 18, height: 18, backgroundColor: accent }]}><Feather name="check" size={10} color="#07070F" /></View> : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontFamily: F.displayHeavy, fontSize: 26, color: '#fff', letterSpacing: -0.5 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, paddingBottom: 12, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.14)' },
  input: { flex: 1, color: '#fff', fontFamily: F.body, fontSize: 15.5, paddingVertical: 4 },
  muted: { fontFamily: F.body, fontSize: 12, color: T.text2 },
  bold: { fontFamily: F.bold, fontSize: 13.5, color: '#fff' },
  yourFeed: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.hairline },
  clear: { fontFamily: F.bold, fontSize: 12 },
  poster: { width: '100%', aspectRatio: 2 / 3, borderRadius: 3, overflow: 'hidden', backgroundColor: T.surface },
  pTitle: { fontFamily: F.bold, fontSize: 12, color: '#fff', marginTop: 8 },
  pMeta: { fontFamily: F.body, fontSize: 11, color: T.text2, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { borderRadius: 10, overflow: 'hidden' },
  tileText: { position: 'absolute', left: 12, right: 12, bottom: 11 },
  tileTitle: { fontFamily: F.displayHeavy, fontSize: 13.5, color: '#fff', marginTop: 6 },
  tileSub: { fontFamily: F.body, fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  check: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  genreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hairline },
  gDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)' },
  genre: { fontFamily: F.display, fontSize: 15, color: 'rgba(255,255,255,0.82)' },
  plat: { height: 64, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  platText: { fontFamily: F.displayHeavy, fontSize: 13.5, color: '#fff' },
});
