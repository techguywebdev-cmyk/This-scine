import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Ambient from '../../components/Ambient';
import MovieRow from '../../components/MovieRow';
import { SectionLabel, Spinner } from '../../components/Ui';
import { useApi } from '../../lib/api';
import { F, T } from '../../lib/theme';

const GENRES = [['Action', 28], ['Comedy', 35], ['Drama', 18], ['Horror', 27], ['Sci-Fi', 878], ['Thriller', 53], ['Romance', 10749], ['Animation', 16], ['Crime', 80], ['Fantasy', 14], ['Mystery', 9648], ['Documentary', 99]];

export default function Discover() {
  const insets = useSafeAreaInsets();
  const api = useApi();
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [popular, setPopular] = useState(null);
  const [genre, setGenre] = useState(null);
  const [genreList, setGenreList] = useState(null);
  const timer = useRef(null);

  const loadPopular = () => { setPopular(null); api.get('/api/movies?popular=1').then((d) => setPopular(d.movies || [])).catch(() => setPopular([])); };
  useEffect(() => { loadPopular(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!q.trim()) { setResults(null); return; }
    timer.current = setTimeout(() => {
      api.get(`/api/movies?search=${encodeURIComponent(q.trim())}`).then((d) => setResults(d.movies || [])).catch(() => setResults([]));
    }, 350);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    if (!genre) { setGenreList(null); return; }
    setGenreList(null);
    api.get(`/api/movies?mood=trending&genre=${genre[1]}&page=1`).then((d) => setGenreList(d.movies || [])).catch(() => setGenreList([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genre]);

  return (
    <View style={{ flex: 1 }}>
      <Ambient />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: 120 }}>
        <Text style={styles.h1}>Discover</Text>
        <View style={styles.search}>
          <Feather name="search" size={17} color="rgba(255,255,255,0.5)" />
          <TextInput value={q} onChangeText={setQ} placeholder="Search films and shows" placeholderTextColor="rgba(255,255,255,0.35)" style={styles.input} returnKeyType="search" />
          {q ? <Pressable onPress={() => setQ('')} hitSlop={8}><Feather name="x" size={16} color="rgba(255,255,255,0.6)" /></Pressable> : null}
        </View>

        {results ? (
          <>
            <SectionLabel>Results</SectionLabel>
            {results.length === 0 ? <Text style={styles.muted}>No matches for “{q}”.</Text> : results.map((m, i) => <MovieRow key={`${m.id}-${m.isTV}`} movie={m} first={i === 0} />)}
          </>
        ) : (
          <>
            <SectionLabel>Browse by</SectionLabel>
            <View style={styles.genres}>
              {GENRES.map((g) => {
                const on = genre?.[0] === g[0];
                return (
                  <Pressable key={g[0]} onPress={() => setGenre(on ? null : g)} style={[styles.genre, on && { backgroundColor: T.accent, borderColor: T.accent }]}>
                    <Text style={[styles.genreText, on && { color: '#07070F' }]}>{g[0]}</Text>
                  </Pressable>
                );
              })}
            </View>

            {genre ? (
              <>
                <SectionLabel>{`Trending in ${genre[0]}`}</SectionLabel>
                {genreList === null ? <Spinner /> : genreList.map((m, i) => <MovieRow key={`${m.id}-${m.isTV}`} movie={m} first={i === 0} />)}
              </>
            ) : null}

            <SectionLabel right={<Pressable onPress={loadPopular}><Text style={styles.link}>Refresh</Text></Pressable>}>Popular right now</SectionLabel>
            {popular === null ? <Spinner /> : popular.map((m, i) => <MovieRow key={`${m.id}-${m.isTV}`} movie={m} rank={i + 1} first={i === 0} />)}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontFamily: F.displayHeavy, fontSize: 26, color: '#fff', letterSpacing: -0.5 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, paddingBottom: 10, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.14)' },
  input: { flex: 1, color: '#fff', fontFamily: F.body, fontSize: 15, paddingVertical: 4 },
  muted: { fontFamily: F.body, fontSize: 12.5, color: T.text2 },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genre: { borderWidth: 1, borderColor: T.hairlineStrong, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 7 },
  genreText: { fontFamily: F.semibold, fontSize: 12.5, color: '#fff' },
  link: { fontFamily: F.bold, fontSize: 12, color: T.accent },
});
