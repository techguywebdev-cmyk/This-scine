import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ActionSheet from './ActionSheet';
import { Spinner } from './Ui';
import { useApi } from '../lib/api';
import { useWatchlist } from '../lib/store';
import { F, T } from '../lib/theme';

// Add a title to one or more folders (or create a new folder on the spot)
export default function FolderPicker({ movie, onClose }) {
  const api = useApi();
  const wl = useWatchlist();
  const [lists, setLists] = useState(null);
  const [name, setName] = useState('');

  const load = () => api.get(`/api/lists?tab=mine&movieId=${movie.id}`).then((d) => setLists(d.lists || [])).catch(() => setLists([]));
  useEffect(() => { if (movie) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [movie?.id]);

  const toggle = async (l) => {
    setLists((p) => p.map((x) => (x.id === l.id ? { ...x, contains: !x.contains } : x)));
    const payload = { movie: { id: movie.id, title: movie.title, poster: movie.poster, year: movie.year, rating: movie.rating, accent: movie.accent, isTV: !!movie.isTV } };
    try {
      if (l.contains) await api.del(`/api/lists/${l.id}/movies`, { movieId: movie.id });
      else { if (!wl.ids.has(movie.id)) wl.toggleSave(movie); await api.post(`/api/lists/${l.id}/movies`, payload); }
    } catch {}
  };
  const create = async () => {
    if (!name.trim()) return;
    try { const d = await api.post('/api/lists', { title: name.trim(), is_public: false }); setName(''); if (d.list) await toggle({ ...d.list, contains: false }); load(); } catch {}
  };

  return (
    <ActionSheet visible={!!movie} onClose={onClose} poster={movie?.poster} title={movie ? `Add “${movie.title}”` : ''} sub="Choose folders">
      {lists === null ? <Spinner /> : lists.map((l) => (
        <Pressable key={l.id} onPress={() => toggle(l)} style={styles.row}>
          <Feather name="folder" size={17} color={T.accent} />
          <Text style={styles.name} numberOfLines={1}>{l.title}</Text>
          <View style={[styles.check, l.contains && { backgroundColor: T.accent, borderColor: T.accent }]}>{l.contains ? <Feather name="check" size={13} color="#06060B" /> : null}</View>
        </Pressable>
      ))}
      <View style={styles.newRow}>
        <TextInput value={name} onChangeText={setName} placeholder="New folder name" placeholderTextColor="rgba(255,255,255,0.35)" style={styles.input} onSubmitEditing={create} returnKeyType="done" />
        <Pressable onPress={create} style={styles.create}><Text style={styles.createText}>Create</Text></Pressable>
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.hairline },
  name: { flex: 1, fontFamily: F.semibold, fontSize: 14, color: '#fff' },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  newRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  input: { flex: 1, color: '#fff', fontFamily: F.body, fontSize: 14, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.14)', paddingVertical: 8 },
  create: { backgroundColor: T.accent, borderRadius: 18, paddingHorizontal: 14, height: 36, justifyContent: 'center' },
  createText: { fontFamily: F.bold, fontSize: 13, color: '#07070F' },
});
