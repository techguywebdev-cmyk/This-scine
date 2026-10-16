import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ActionSheet from './ActionSheet';
import { F, FEEDS, GENRES, PLATFORMS, T } from '../lib/theme';

// What to show in the feed: one feed type, plus optional genre and streaming service
export default function FilterSheet({ value, onChange, onClose, accent = '#fff' }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const has = value.mood !== 'Trending' || value.genre || value.provider;
  const Chip = ({ on, label, onPress, dot }) => (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn]}>
      {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
      <Text style={[styles.chipText, on && { color: '#07070F' }]}>{label}</Text>
    </Pressable>
  );
  return (
    <ActionSheet visible onClose={onClose} title="What’s on" sub="Tune your feed" accent={accent}>
      <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
        {FEEDS.map((f) => {
          const on = value.mood === f.api;
          return (
            <Pressable key={f.api} onPress={() => set({ mood: f.api })} style={styles.row}>
              <Feather name={f.icon} size={17} color={on ? '#fff' : T.text2} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowText, on && { fontFamily: F.bold }]}>{f.label}</Text>
                <Text style={styles.rowSub}>{f.desc}</Text>
              </View>
              {on ? <Feather name="check" size={17} color="#fff" /> : null}
            </Pressable>
          );
        })}
        <Text style={styles.label}>Genre</Text>
        <View style={styles.wrap}>
          <Chip on={!value.genre} label="All" onPress={() => set({ genre: '' })} />
          {GENRES.map(([l, id]) => <Chip key={id} on={value.genre === id} label={l} onPress={() => set({ genre: value.genre === id ? '' : id })} />)}
        </View>
        <Text style={styles.label}>Streaming on</Text>
        <View style={styles.wrap}>
          <Chip on={!value.provider} label="Anywhere" onPress={() => set({ provider: '' })} />
          {PLATFORMS.map(([n, c]) => <Chip key={n} on={value.provider === n} label={n} dot={c} onPress={() => set({ provider: value.provider === n ? '' : n })} />)}
        </View>
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        {has ? <Pressable onPress={() => onChange({ mood: 'Trending', genre: '', provider: '' })} style={[styles.btn, styles.ghost]}><Text style={styles.ghostText}>Reset</Text></Pressable> : null}
        <Pressable onPress={onClose} style={[styles.btn, { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', flex: 1 }]}><Text style={styles.btnText}>Show films</Text></Pressable>
      </View>
    </ActionSheet>
  );
}

const glass = { backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' };
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.hairline },
  rowText: { fontFamily: F.semibold, fontSize: 14.5, color: '#fff' },
  rowSub: { fontFamily: F.body, fontSize: 12, color: T.text3, marginTop: 1 },
  label: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 2.2, textTransform: 'uppercase', color: T.text3, marginTop: 20, marginBottom: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 13, borderRadius: 17, ...glass },
  chipOn: { backgroundColor: '#fff', borderColor: '#fff' },
  chipText: { fontFamily: F.bold, fontSize: 12.5, color: '#fff' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  btn: { height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  btnText: { fontFamily: F.bold, fontSize: 14.5, color: '#fff' },
  ghost: { ...glass },
  ghostText: { fontFamily: F.bold, fontSize: 14.5, color: '#fff' },
});
