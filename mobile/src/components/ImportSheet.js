import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ambient from './Ambient';
import { useApi } from '../lib/api';
import { useWatchlist } from '../lib/store';
import { API_URL } from '../lib/config';
import { F, T } from '../lib/theme';

// Same flow as the website: type your username → we read your public profile → import with a live animation.
// If the platform won't let us read it, fall back to the export file (open their export page, upload on the web).
const BATCH = 40;
const MAX_ITEMS = 3000;
const DOTS = ['#818CF8', '#2DD4BF', '#FF6B8A', '#A3E635', '#B07FEF', '#38BDF8', '#FF7A2F', '#F5A623'];

const SOURCES = {
  letterboxd: {
    name: 'Letterboxd', label: 'Your Letterboxd username', placeholder: 'username', key: 'thiscene.import.lb',
    open: (h) => `https://letterboxd.com/${(h || '').replace(/^@/, '').trim()}`, openLabel: 'Open Letterboxd',
    hint: 'Not sure? Open Letterboxd — your username is in your profile link.',
    exportUrl: 'https://letterboxd.com/settings/data/',
  },
  imdb: {
    name: 'IMDb', label: 'Your IMDb profile link', placeholder: 'imdb.com/user/ur…', key: 'thiscene.import.imdb',
    open: () => 'https://www.imdb.com/profile', openLabel: 'Open IMDb',
    hint: 'Open IMDb, go to your profile and copy the link. Your ratings need to be public.',
    exportUrl: 'https://www.imdb.com/exports/',
  },
};

function Pulse({ accent, count, label, sub, posters, done }) {
  const spin = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;
  const marq = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (done) return;
    const a = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 5000, easing: Easing.linear, useNativeDriver: true }));
    const b = Animated.loop(Animated.sequence([Animated.timing(breath, { toValue: 1, duration: 1200, useNativeDriver: true }), Animated.timing(breath, { toValue: 0, duration: 1200, useNativeDriver: true })]));
    a.start(); b.start();
    return () => { a.stop(); b.stop(); };
  }, [done, spin, breath]);
  useEffect(() => { pop.setValue(0.85); Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: true }).start(); }, [count, pop]);
  const strip = posters.length ? [...posters, ...posters] : [];
  const stripW = posters.length * 64;
  useEffect(() => {
    if (!stripW) return;
    marq.setValue(0);
    const l = Animated.loop(Animated.timing(marq, { toValue: 1, duration: Math.max(12000, posters.length * 1600), easing: Easing.linear, useNativeDriver: true }));
    l.start();
    return () => l.stop();
  }, [stripW, posters.length, marq]);
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View style={{ alignItems: 'center', marginTop: 18 }}>
      <View style={{ width: 168, height: 168 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { margin: 18, borderRadius: 70, backgroundColor: accent, opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.28] }), transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }]} />
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: rot }] }]}>
          {DOTS.map((c, i) => {
            const a = (i / DOTS.length) * Math.PI * 2;
            return <View key={c} style={{ position: 'absolute', left: 84 + Math.cos(a) * 74 - 5, top: 84 + Math.sin(a) * 74 - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: c, opacity: done ? 0.5 : 1, shadowColor: c, shadowOpacity: 1, shadowRadius: 8, elevation: 4 }} />;
          })}
        </Animated.View>
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Animated.Text style={[styles.count, { transform: [{ scale: pop }] }]}>{count}</Animated.Text>
          <Text style={styles.countLabel}>{label}</Text>
        </View>
      </View>
      <Text style={styles.pulseSub}>{sub}</Text>
      <View style={{ width: '100%', height: 84, overflow: 'hidden', marginTop: 14 }}>
        {strip.length ? (
          <Animated.View style={{ flexDirection: 'row', gap: 8, transform: [{ translateX: marq.interpolate({ inputRange: [0, 1], outputRange: [0, -stripW] }) }] }}>
            {strip.map((p, i) => <Image key={i} source={{ uri: p }} style={{ width: 56, height: 84, borderRadius: 8, opacity: 0.85 }} contentFit="cover" />)}
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

export default function ImportSheet({ visible, onClose, accent = '#F5A623' }) {
  const insets = useSafeAreaInsets();
  const api = useApi();
  const { refresh } = useWatchlist();
  const [src, setSrc] = useState('letterboxd');
  const [handle, setHandle] = useState('');
  const [phase, setPhase] = useState('pick'); // pick | file | scanning | importing | done
  const [found, setFound] = useState(0);
  const [prog, setProg] = useState({ done: 0, total: 0, matched: 0, missed: 0 });
  const [posters, setPosters] = useState([]);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const cancelled = useRef(false);
  const S = SOURCES[src];

  useEffect(() => { AsyncStorage.getItem(S.key).then((v) => setHandle(v || '')).catch(() => {}); }, [S.key]);
  useEffect(() => { if (visible) { setPhase('pick'); setErr(''); setNote(''); } }, [visible]);

  const busy = phase === 'scanning' || phase === 'importing';
  const close = () => { if (busy) { cancelled.current = true; } onClose(); };

  const runImport = async (items) => {
    setPhase('importing');
    setProg({ done: 0, total: items.length, matched: 0, missed: 0 });
    let matched = 0, missed = 0;
    for (let i = 0; i < items.length; i += BATCH) {
      if (cancelled.current) break;
      try {
        const d = await api.post('/api/import', { items: items.slice(i, i + BATCH) });
        matched += d.matched || 0; missed += (d.missed || []).length;
        if (d.posters?.length) setPosters((p) => [...p, ...d.posters].slice(-24));
      } catch (e) { setErr(e.message || 'Import failed'); break; }
      setProg({ done: Math.min(items.length, i + BATCH), total: items.length, matched, missed });
    }
    setPhase('done');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    refresh && refresh();
  };

  const auto = async () => {
    const h = handle.trim();
    if (!h) { setErr(src === 'imdb' ? 'Paste your IMDb profile link first' : 'Type your Letterboxd username first'); return; }
    AsyncStorage.setItem(S.key, h).catch(() => {});
    setErr(''); setNote(''); setFound(0); setPosters([]);
    cancelled.current = false;
    setPhase('scanning');
    const all = [];
    let partial = false;
    for (const list of ['watched', 'watchlist']) {
      for (let page = 1; page <= 60; page++) {
        if (cancelled.current) { setPhase('pick'); return; }
        let d;
        try {
          d = await api.post('/api/import/fetch', { source: src, handle: h, list, page });
        } catch (e) {
          if (list === 'watchlist' && all.length) break;
          setErr(e.message || 'Could not read that profile');
          if (e.status === 502 || e.status === 403) { setNote(`${e.message}. No problem — grab your export file instead, it takes a minute.`); setPhase('file'); } else setPhase('pick');
          return;
        }
        if (d.partial) partial = true;
        all.push(...(d.items || []));
        setFound(all.length);
        if (!d.more || all.length >= MAX_ITEMS) break;
      }
      if (all.length >= MAX_ITEMS) break;
    }
    if (!all.length) { setErr('We didn’t find any films on that profile'); setPhase('pick'); return; }
    if (partial) setNote('Letterboxd only shared your recent diary — upload your export any time to bring the rest.');
    runImport(all.slice(0, MAX_ITEMS));
  };

  const pct = prog.total ? prog.done / prog.total : 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.wrap}>
        <Pressable style={styles.backdrop} onPress={busy ? undefined : close} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <Ambient accent={accent} style={{ borderTopLeftRadius: 22, borderTopRightRadius: 22 }} />
          <View style={styles.grab} />
          <Text style={[styles.eyebrow, { color: accent }]}>BRING YOUR HISTORY</Text>
          <Text style={styles.title}>Import your films</Text>
          {phase === 'pick' || phase === 'file' ? (
            <>
              <Text style={styles.lead}>Everything you’ve watched and want to watch, in one go.</Text>
              <View style={styles.tabs}>
                {Object.entries(SOURCES).map(([k, v]) => (
                  <Pressable key={k} onPress={() => { setSrc(k); setErr(''); setNote(''); }}>
                    <Text style={[styles.tab, src === k && styles.tabOn]}>{v.name}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          {phase === 'pick' ? (
            <>
              <Text style={styles.label}>{S.label.toUpperCase()}</Text>
              <View style={styles.inputWrap}>
                {src === 'letterboxd' ? <Text style={styles.at}>@</Text> : null}
                <TextInput value={handle} onChangeText={setHandle} placeholder={S.placeholder} placeholderTextColor="rgba(255,255,255,0.35)" autoCapitalize="none" autoCorrect={false} returnKeyType="go" onSubmitEditing={auto} style={styles.input} />
              </View>
              <Text style={styles.hint}>{S.hint}</Text>
              {err ? <Text style={styles.err}>{err}</Text> : null}
              <View style={styles.row}>
                <Pressable onPress={() => Linking.openURL(S.open(handle)).catch(() => {})} style={[styles.btn, { flex: 1 }]}>
                  <Text style={styles.btnText}>{S.openLabel}</Text><Feather name="arrow-up-right" size={14} color="#fff" />
                </Pressable>
                <Pressable onPress={auto} style={[styles.btn, styles.btnPrimary, { flex: 1.4 }]}>
                  <Text style={[styles.btnText, { color: '#06060B' }]}>Import automatically</Text>
                </Pressable>
              </View>
              <Pressable onPress={() => { setErr(''); setPhase('file'); }} hitSlop={8}><Text style={styles.link}>Or use an export file instead</Text></Pressable>
            </>
          ) : null}

          {phase === 'file' ? (
            <>
              {note ? <Text style={styles.note}>{note}</Text> : null}
              {[`Tap “Open export page” and sign in to ${S.name}`, src === 'imdb' ? 'Export Your Ratings (and Watchlist if you like)' : 'Tap “Export your data” and download the ZIP', 'Tap “Upload file” — it opens Thiscene where you can pick it'].map((t, i) => (
                <View key={i} style={styles.step}><Text style={[styles.stepN, { color: accent }]}>{i + 1}</Text><Text style={styles.stepT}>{t}</Text></View>
              ))}
              <View style={styles.row}>
                <Pressable onPress={() => Linking.openURL(S.exportUrl).catch(() => {})} style={[styles.btn, { flex: 1 }]}>
                  <Text style={styles.btnText}>Open export page</Text><Feather name="arrow-up-right" size={14} color="#fff" />
                </Pressable>
                <Pressable onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/?import=1`).then(() => refresh && refresh()).catch(() => {})} style={[styles.btn, styles.btnPrimary, { flex: 1 }]}>
                  <Text style={[styles.btnText, { color: '#06060B' }]}>Upload file</Text>
                </Pressable>
              </View>
              <Pressable onPress={() => { setErr(''); setNote(''); setPhase('pick'); }} hitSlop={8}><Text style={styles.link}>Back to automatic import</Text></Pressable>
            </>
          ) : null}

          {phase === 'scanning' ? (
            <>
              <Pulse accent={accent} count={found} label="FILMS FOUND" posters={[]} sub={`Reading ${src === 'imdb' ? 'your IMDb' : `@${handle.replace(/^@/, '').trim()} on Letterboxd`}…`} />
              <Pressable onPress={() => { cancelled.current = true; }} hitSlop={8}><Text style={styles.link}>Cancel</Text></Pressable>
            </>
          ) : null}

          {phase === 'importing' || phase === 'done' ? (
            <>
              <Pulse accent={accent} count={prog.matched} label={phase === 'done' ? 'TITLES ADDED' : 'ADDED SO FAR'} done={phase === 'done'} posters={posters} sub={phase === 'done' ? (err ? 'Stopped early' : 'All done — your feed just got smarter') : `Matching ${prog.done} of ${prog.total}…`} />
              <View style={styles.bar}><View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: accent }]} /></View>
              {err ? <Text style={styles.err}>{err}</Text> : null}
              {phase === 'done' && prog.missed ? <Text style={styles.hint}>{prog.missed} couldn’t be matched</Text> : null}
              {phase === 'done' && note ? <Text style={styles.hint}>{note}</Text> : null}
              {phase === 'done' ? (
                <Pressable onPress={onClose} style={[styles.btn, styles.btnPrimary, { marginTop: 18 }]}><Text style={[styles.btnText, { color: '#06060B' }]}>Done</Text></Pressable>
              ) : (
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 14 }}>
                  <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
                  <Pressable onPress={() => { cancelled.current = true; }} hitSlop={8}><Text style={[styles.link, { marginTop: 0 }]}>Stop</Text></Pressable>
                </View>
              )}
            </>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.72)' },
  sheet: { maxHeight: '92%', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 10, overflow: 'hidden', backgroundColor: '#06060B' },
  grab: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', alignSelf: 'center', marginBottom: 16 },
  eyebrow: { fontSize: 10.5, letterSpacing: 2.2, fontFamily: F.bold },
  title: { color: "#fff", fontSize: 24, fontFamily: F.displayHeavy, letterSpacing: -0.5, marginTop: 6 },
  lead: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 6, lineHeight: 19, fontFamily: F.body },
  tabs: { flexDirection: 'row', gap: 22, marginTop: 18 },
  tab: { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontFamily: F.semibold },
  tabOn: { color: '#fff', fontFamily: F.display },
  label: { color: 'rgba(255,255,255,0.5)', fontSize: 9.5, letterSpacing: 2, fontFamily: F.bold, marginTop: 18 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, height: 50, borderRadius: 14, paddingHorizontal: 14, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  at: { color: 'rgba(255,255,255,0.45)', fontSize: 15, fontFamily: F.bold },
  input: { flex: 1, color: '#fff', fontSize: 15, fontFamily: F.body, paddingVertical: 0 },
  hint: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 8, lineHeight: 17, fontFamily: F.body, textAlign: 'left' },
  err: { color: '#FF8FA3', fontSize: 12.5, marginTop: 10, fontFamily: F.body },
  note: { color: 'rgba(255,255,255,0.75)', fontSize: 12.5, marginTop: 12, lineHeight: 18, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', fontFamily: F.body },
  row: { flexDirection: 'row', gap: 10, marginTop: 18 },
  btn: { height: 46, borderRadius: 23, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  btnPrimary: { backgroundColor: '#fff', borderColor: '#fff' },
  btnText: { color: '#fff', fontSize: 13.5, fontFamily: F.bold },
  link: { color: 'rgba(255,255,255,0.55)', fontSize: 12.5, fontFamily: F.bold, textAlign: 'center', marginTop: 16 },
  step: { flexDirection: 'row', gap: 12, paddingVertical: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)' },
  stepN: { width: 20, fontFamily: F.display, fontSize: 13.5 },
  stepT: { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 13.5, lineHeight: 19, fontFamily: F.body },
  count: { color: '#fff', fontSize: 40, fontFamily: F.display, letterSpacing: -1 },
  countLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 9.5, letterSpacing: 2, fontFamily: F.bold },
  pulseSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 14, textAlign: 'center', fontFamily: F.body },
  bar: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', marginTop: 6 },
  barFill: { height: '100%', borderRadius: 2 },
});
