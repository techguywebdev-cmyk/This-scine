import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Ambient from '../components/Ambient';
import { useApi } from '../lib/api';
import { useAccent } from '../lib/accent';
import { setPrefs, usePrefs } from '../lib/prefs';
import { F } from '../lib/theme';

const GENRES = [['Action', 28], ['Comedy', 35], ['Drama', 18], ['Horror', 27], ['Thriller', 53], ['Romance', 10749], ['Sci-Fi', 878], ['Animation', 16], ['Documentary', 99], ['Crime', 80], ['Fantasy', 14], ['War', 10752], ['Western', 37], ['Family', 10751]];
const flag = (code) => (code && code.length === 2 ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))) : '🌍');

function Toggle({ on, onPress, accent, label }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="switch" accessibilityState={{ checked: !!on }} accessibilityLabel={label} hitSlop={8}
      style={[styles.track, { backgroundColor: on ? accent : 'rgba(255,255,255,0.16)' }]}>
      <View style={[styles.knob, { transform: [{ translateX: on ? 18 : 0 }] }]} />
    </Pressable>
  );
}

function Row({ title, sub, right }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export default function FeedSettings() {
  const insets = useSafeAreaInsets();
  const api = useApi();
  const accent = useAccent();
  const p = usePrefs();
  const [opts, setOpts] = useState(null);
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState('');
  const [saved, setSaved] = useState(false);
  const region = p.region || opts?.region || 'US';

  useEffect(() => {
    let alive = true;
    api.get(`/api/watch-options${p.region ? `?region=${p.region}` : ''}`).then((d) => {
      if (!alive) return;
      setOpts(d);
      if (!p.region && d.region) setPrefs({ region: d.region }, api);
    }).catch(() => alive && setOpts({ regions: [], providers: [] }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.region]);
  useEffect(() => { if (!saved) return undefined; const t = setTimeout(() => setSaved(false), 1800); return () => clearTimeout(t); }, [saved]);

  const save = (patch) => { Haptics.selectionAsync().catch(() => {}); setPrefs(patch, api); setSaved(true); };
  const toggleService = (id) => save({ services: p.services.includes(id) ? p.services.filter((x) => x !== id) : [...p.services, id] });
  const toggleGenre = (id) => save({ hideGenres: p.hideGenres.includes(id) ? p.hideGenres.filter((x) => x !== id) : [...p.hideGenres, id] });
  const regionName = opts?.regions?.find((r) => r.code === region)?.name || region;
  const list = useMemo(() => (opts?.regions || []).filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase())), [opts, q]);

  return (
    <View style={{ flex: 1, backgroundColor: '#06060B' }}>
      <Ambient accent={accent} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back} accessibilityLabel="Back"><Feather name="arrow-left" size={19} color="#fff" /></Pressable>
        <Text style={[styles.eyebrow, { color: accent, marginTop: 16 }]}>YOUR FEED</Text>
        <Text style={styles.h1}>Tune it to you</Text>
        <Text style={styles.lead}>Where you watch, how trailers play, and what shows up in your feed. The website matches.</Text>
        <Text style={styles.saved}>{saved ? 'Saved' : ' '}</Text>

        <Text style={styles.label}>YOUR COUNTRY</Text>
        <Pressable onPress={() => setPicking(true)} style={styles.select} accessibilityLabel={`Country: ${regionName}. Change`}>
          <Text style={{ fontSize: 20 }}>{flag(region)}</Text>
          <Text style={styles.selectText}>{regionName}</Text>
          <Feather name="chevron-down" size={18} color="rgba(255,255,255,0.5)" />
        </Pressable>
        {opts?.detected && !opts.detectedSupported ? <Text style={styles.note}>Streaming data isn’t available for your country yet — pick the country whose services you use.</Text> : null}

        <Text style={styles.label}>SERVICES YOU HAVE</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {opts === null ? <Text style={styles.rowSub}>Loading…</Text> : (opts.providers || []).map((s) => {
            const on = p.services.includes(s.id);
            return (
              <Pressable key={s.id} onPress={() => toggleService(s.id)} accessibilityLabel={s.name} accessibilityState={{ selected: on }} style={{ width: 64, alignItems: 'center', gap: 5 }}>
                <View style={[styles.logo, { borderColor: on ? accent : 'rgba(255,255,255,0.12)', opacity: on ? 1 : 0.55 }]}>
                  {s.logo ? <Image source={{ uri: s.logo }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
                  {on ? <View style={[styles.check, { backgroundColor: accent }]}><Feather name="check" size={10} color="#07070F" /></View> : null}
                </View>
                <Text numberOfLines={1} style={[styles.logoName, on && { color: '#fff', fontFamily: F.bold }]}>{s.name}</Text>
              </Pressable>
            );
          })}
        </View>
        <Row title="Only what I can watch" sub={p.services.length ? 'Your feed only shows titles on your services' : 'Pick your services above first'}
          right={<Toggle accent={accent} label="Only what I can watch" on={p.onlyMine && p.services.length > 0} onPress={() => p.services.length && save({ onlyMine: !p.onlyMine })} />} />

        <Text style={styles.label}>TRAILERS & DATA</Text>
        <Row title="Autoplay trailers" sub="Start playing as soon as you open a film" right={<Toggle accent={accent} label="Autoplay trailers" on={p.autoplay !== false} onPress={() => save({ autoplay: p.autoplay === false })} />} />
        <Row title="Start muted" sub="Trailers begin without sound" right={<Toggle accent={accent} label="Start muted" on={!!p.startMuted} onPress={() => save({ startMuted: !p.startMuted })} />} />
        <Row title="Data saver" sub="Lighter images — kinder to mobile data" right={<Toggle accent={accent} label="Data saver" on={!!p.dataSaver} onPress={() => save({ dataSaver: !p.dataSaver })} />} />

        <Text style={styles.label}>WHAT TO SHOW</Text>
        <View style={styles.seg}>
          {[['both', 'Films & series'], ['movie', 'Films'], ['tv', 'Series']].map(([k, l]) => {
            const on = p.kind === k;
            return <Pressable key={k} onPress={() => save({ kind: k })} accessibilityState={{ selected: on }} style={[styles.segBtn, on && { backgroundColor: `${accent}33`, borderColor: `${accent}88` }]}><Text style={[styles.segText, on && { color: '#fff' }]}>{l}</Text></Pressable>;
          })}
        </View>
        <Row title="Hide adult ratings" sub="No R, 18 or TV-MA titles in your feed" right={<Toggle accent={accent} label="Hide adult ratings" on={!!p.safe} onPress={() => save({ safe: !p.safe })} />} />
        <Text style={[styles.rowTitle, { marginTop: 16 }]}>Never show me</Text>
        <Text style={[styles.rowSub, { marginBottom: 10 }]}>Tap genres to hide them from your feed</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {GENRES.map(([name, id]) => {
            const off = p.hideGenres.includes(id);
            return <Pressable key={id} onPress={() => toggleGenre(id)} accessibilityState={{ selected: off }} style={[styles.chip, off && styles.chipOff]}><Text style={[styles.chipText, off && styles.chipTextOff]}>{name}</Text></Pressable>;
          })}
        </View>

        <Pressable onPress={() => router.back()} style={[styles.done, { backgroundColor: `${accent}2e`, borderColor: `${accent}99` }]}><Text style={styles.doneText}>Done</Text></Pressable>
      </ScrollView>

      <Modal visible={picking} transparent animationType="slide" onRequestClose={() => setPicking(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPicking(false)}><View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} /></Pressable>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
            <Ambient accent={accent} style={{ borderTopLeftRadius: 22, borderTopRightRadius: 22 }} />
            <View style={styles.grab} />
            <View style={[styles.select, { marginHorizontal: 16, marginBottom: 8 }]}>
              <Feather name="search" size={16} color="rgba(255,255,255,0.5)" />
              <TextInput value={q} onChangeText={setQ} placeholder="Search countries" placeholderTextColor="rgba(255,255,255,0.35)" style={[styles.selectText, { paddingVertical: 0 }]} autoCorrect={false} />
            </View>
            <FlatList data={list} keyExtractor={(r) => r.code} keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }}
              renderItem={({ item }) => (
                <Pressable onPress={() => { save({ region: item.code, services: [], onlyMine: false }); setPicking(false); setQ(''); }} style={styles.country}>
                  <Text style={{ fontSize: 20 }}>{flag(item.code)}</Text>
                  <Text style={[styles.rowTitle, { flex: 1, fontFamily: item.code === region ? F.bold : F.semibold }]}>{item.name}</Text>
                  {item.code === region ? <Feather name="check" size={17} color={accent} /> : null}
                </Pressable>
              )} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  eyebrow: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 2.2 },
  h1: { fontFamily: F.displayHeavy, fontSize: 28, letterSpacing: -0.7, color: '#fff', marginTop: 6 },
  lead: { fontFamily: F.body, fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.62)', marginTop: 8 },
  saved: { fontFamily: F.semibold, fontSize: 12, color: '#7BFF9E', marginTop: 8, height: 16 },
  label: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 2.2, color: 'rgba(255,255,255,0.5)', marginTop: 24, marginBottom: 10 },
  note: { fontFamily: F.body, fontSize: 12, lineHeight: 17, color: 'rgba(255,255,255,0.55)', marginTop: 8 },
  select: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingHorizontal: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  selectText: { flex: 1, fontFamily: F.semibold, fontSize: 15, color: '#fff' },
  logo: { width: 56, height: 56, borderRadius: 16, overflow: 'hidden', borderWidth: 2 },
  check: { position: 'absolute', right: 3, bottom: 3, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  logoName: { fontFamily: F.body, fontSize: 10, color: 'rgba(255,255,255,0.5)', maxWidth: 64 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.08)', marginTop: 4 },
  rowTitle: { fontFamily: F.bold, fontSize: 14, color: '#fff' },
  rowSub: { fontFamily: F.body, fontSize: 12, lineHeight: 17, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  track: { width: 46, height: 28, borderRadius: 14, padding: 3 },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  seg: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginBottom: 4 },
  segBtn: { flex: 1, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  segText: { fontFamily: F.bold, fontSize: 13, color: 'rgba(255,255,255,0.55)' },
  chip: { height: 34, paddingHorizontal: 13, borderRadius: 17, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  chipOff: { backgroundColor: 'rgba(255,107,138,0.12)', borderColor: 'rgba(255,107,138,0.5)' },
  chipText: { fontFamily: F.bold, fontSize: 12.5, color: 'rgba(255,255,255,0.8)' },
  chipTextOff: { color: '#FF8FA3', textDecorationLine: 'line-through' },
  done: { alignSelf: 'center', marginTop: 28, height: 46, paddingHorizontal: 30, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  doneText: { fontFamily: F.bold, fontSize: 14.5, color: '#fff' },
  sheet: { backgroundColor: '#06060B', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 10, overflow: 'hidden' },
  grab: { width: 34, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'center', marginBottom: 12 },
  country: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
});
