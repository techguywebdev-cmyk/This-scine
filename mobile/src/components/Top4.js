import { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Ambient from './Ambient';
import { useApi } from '../lib/api';
import { openTitle } from '../lib/titles';
import { F, T } from '../lib/theme';

// Top 4: the four films that say the most about you (same list as the website)
export default function Top4({ items = [], accent = '#F5A623', editable = false, watchlist = [], label = 'TOP 4', style }) {
  const api = useApi();
  const { width } = useWindowDimensions();
  const [list, setList] = useState(items);
  const [picking, setPicking] = useState(false);
  useEffect(() => { setList(items); }, [items]);
  if (!editable && !list.length) return null;
  const w = (width - 40 - 30) / 4;
  const save = (next) => { setList(next); api.patch('/api/settings', { top4: next }).catch(() => {}); };
  const place = (m) => {
    Haptics.selectionAsync().catch(() => {});
    const entry = { id: Number(m.id), type: m.isTV || m.mediaType === 'tv' || m.type === 'tv' ? 'tv' : 'movie', title: m.title, poster: m.poster || null, year: m.year || null, accent: m.accent || null };
    save([...list.filter((x) => !(x.id === entry.id && x.type === entry.type)), entry].slice(0, 4));
    setPicking(false);
  };
  return (
    <View style={style}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={[styles.eyebrow, { color: accent }]}>{label}</Text>
        {editable ? <Text style={styles.hint}>{list.length < 4 ? 'Tap + to add' : 'Tap × to swap'}</Text> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[0, 1, 2, 3].map((i) => {
          const m = list[i];
          if (m) return (
            <View key={`${m.type}-${m.id}`} style={{ width: w }}>
              <Pressable onPress={() => openTitle({ id: m.id, title: m.title, poster: m.poster, accent: m.accent, isTV: m.type === 'tv' })} accessibilityLabel={m.title}>
                <Image source={{ uri: m.poster }} style={[styles.poster, { width: w, height: w * 1.5, borderColor: `${m.accent || accent}44` }]} contentFit="cover" />
              </Pressable>
              {editable ? <Pressable onPress={() => save(list.filter((_, k) => k !== i))} hitSlop={8} accessibilityLabel={`Remove ${m.title}`} style={styles.x}><Feather name="x" size={12} color="#fff" /></Pressable> : null}
            </View>
          );
          return editable
            ? <Pressable key={i} onPress={() => setPicking(true)} accessibilityLabel="Add a favourite" style={[styles.empty, { width: w, height: w * 1.5, borderColor: `${accent}66`, backgroundColor: `${accent}12` }]}><Feather name="plus" size={20} color={accent} /></Pressable>
            : <View key={i} style={{ width: w }} />;
        })}
      </View>
      {picking ? <Picker accent={accent} watchlist={watchlist} onPick={place} onClose={() => setPicking(false)} /> : null}
    </View>
  );
}

function Picker({ accent, watchlist, onPick, onClose }) {
  const api = useApi();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [q, setQ] = useState('');
  const [found, setFound] = useState(null);
  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { setFound(null); return undefined; }
    let alive = true;
    const k = setTimeout(() => api.get(`/api/movies?search=${encodeURIComponent(t)}`).then((d) => alive && setFound(d.movies || [])).catch(() => alive && setFound([])), 250);
    return () => { alive = false; clearTimeout(k); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  const list = (found || watchlist).filter((m) => m.poster);
  const w = (width - 40 - 30) / 4;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <Ambient accent={accent} style={{ borderTopLeftRadius: 22, borderTopRightRadius: 22 }} />
          <View style={styles.grab} />
          <Text style={[styles.eyebrow, { color: accent, paddingHorizontal: 20 }]}>TOP 4</Text>
          <Text style={styles.title}>Pick a favourite</Text>
          <View style={styles.search}>
            <Feather name="search" size={16} color="rgba(255,255,255,0.5)" />
            <TextInput value={q} onChangeText={setQ} placeholder="Search any film or series" placeholderTextColor="rgba(255,255,255,0.38)" autoFocus style={styles.input} />
          </View>
          <Text style={[styles.hint, { paddingHorizontal: 20, marginBottom: 8 }]}>{found ? `${found.length} results` : 'From your watchlist'}</Text>
          <FlatList data={list} numColumns={4} keyExtractor={(m) => `${m.isTV ? 't' : 'm'}${m.id}`} style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled"
            columnWrapperStyle={{ gap: 10, paddingHorizontal: 20 }} contentContainerStyle={{ gap: 12, paddingBottom: 10 }}
            ListEmptyComponent={<Text style={[styles.hint, { paddingHorizontal: 20 }]}>Search for a film above.</Text>}
            renderItem={({ item: m }) => (
              <Pressable onPress={() => onPick(m)} style={{ width: w }}>
                <Image source={{ uri: m.poster }} style={{ width: w, height: w * 1.5, borderRadius: 6 }} contentFit="cover" />
                <Text style={styles.small} numberOfLines={1}>{m.title}</Text>
              </Pressable>
            )} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 2.2 },
  hint: { fontFamily: F.body, fontSize: 11.5, color: T.text3 },
  poster: { borderRadius: 8, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  empty: { borderRadius: 8, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  x: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,10,16,0.9)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden', backgroundColor: '#06060B', paddingTop: 10 },
  grab: { width: 34, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'center', marginBottom: 12 },
  title: { fontFamily: F.displayHeavy, fontSize: 22, color: '#fff', letterSpacing: -0.5, paddingHorizontal: 20, marginTop: 4, marginBottom: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, paddingHorizontal: 14, borderRadius: 23, marginHorizontal: 20, marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  input: { flex: 1, color: '#fff', fontFamily: F.body, fontSize: 14.5, paddingVertical: 0 },
  small: { fontFamily: F.semibold, fontSize: 10.5, color: '#fff', marginTop: 5 },
});
