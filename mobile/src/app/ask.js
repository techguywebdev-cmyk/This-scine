import { useThemed } from '../lib/userTheme';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Ambient from '../components/Ambient';
import Marquee from '../components/PosterMarquee';
import { Poster } from '../components/Ui';
import { DOTS } from '../components/Brand';
import { useApi } from '../lib/api';
import { useAccent } from '../lib/accent';
import { useWatchlist } from '../lib/store';
import { openTitle } from '../lib/titles';
import { F, T } from '../lib/theme';

// "Ask Thiscene": describe what you want (type or speak) → picks with why-they-fit. Free: phone speech + our parser.
const EXAMPLES = ['Something like Interstellar but shorter', 'A funny 90s movie on Netflix', 'Feel-good film for date night', 'Underrated heist movies', 'Scary Korean series', 'True story about boxing, no subtitles'];

// The phone's own speech recognition, loaded lazily so a missing module can never crash the app
let speech; const sr = () => { if (speech === undefined) { try { speech = require('expo-speech-recognition').ExpoSpeechRecognitionModule || null; } catch { speech = null; } } return speech; };

function Dots() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { const l = Animated.loop(Animated.timing(a, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })); l.start(); return () => l.stop(); }, [a]);
  return (
    <View style={{ flexDirection: 'row', gap: 7 }}>
      {DOTS.slice(0, 5).map((c, i) => {
        const p = Animated.modulo(Animated.add(a, i * 0.14), 1);
        return <Animated.View key={c} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c, opacity: p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1, 0.4] }), transform: [{ translateY: p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -6, 0] }) }] }} />;
      })}
    </View>
  );
}

const Bars = ({ tone }) => {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { const l = Animated.loop(Animated.timing(a, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true })); l.start(); return () => l.stop(); }, [a]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 22 }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const p = Animated.modulo(Animated.add(a, i * 0.15), 1);
        return <Animated.View key={i} style={{ width: 3, height: 22, borderRadius: 2, backgroundColor: tone, transform: [{ scaleY: p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 1, 0.35] }) }] }} />;
      })}
    </View>
  );
};

export default function Ask() {
  const insets = useSafeAreaInsets();
  const api = useApi();
  const accent = useAccent();
  const wl = useWatchlist();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  const [listening, setListening] = useState(false);
  const [wall, setWall] = useState([]);
  const { width } = useWindowDimensions();
  const pulse = useRef(new Animated.Value(0)).current;
  const finalRef = useRef('');
  const qRef = useRef('');
  qRef.current = q;

  const ask = async (text) => {
    const t = String(text ?? qRef.current).trim();
    if (!t || busy) return;
    setQ(t); setBusy(true); setErr('');
    try {
      const d = await api.get(`/api/ask?q=${encodeURIComponent(t)}`);
      setRes(d);
      const ps = (d.movies || []).map((m) => m.poster).filter(Boolean);
      if (ps.length >= 4) setWall(ps.slice(0, 14));
      api.post('/api/track', { name: 'ask', props: { q: t.slice(0, 80), n: (d.movies || []).length, app: 'android' } }).catch(() => {});
    } catch (e) { setErr(e.message || 'Something went wrong'); }
    setBusy(false);
  };

  useEffect(() => { api.get('/api/movies?popular=1').then((d) => setWall((d.movies || []).map((m) => m.poster).filter(Boolean).sort(() => Math.random() - 0.5).slice(0, 14))).catch(() => {}); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // speech events
  useEffect(() => {
    const m = sr();
    if (!m?.addListener) return undefined;
    const subs = [
      m.addListener('result', (e) => {
        const t = e?.results?.[0]?.transcript || '';
        if (e?.isFinal) finalRef.current = t; setQ(t);
      }),
      m.addListener('end', () => { setListening(false); const t = finalRef.current.trim() || qRef.current.trim(); if (t) ask(t); }),
      m.addListener('error', (e) => { setListening(false); if (e?.error && e.error !== 'no-speech' && e.error !== 'aborted') setErr(e.error === 'not-allowed' ? 'Allow the microphone to talk to Thiscene' : 'Didn’t catch that — try again or type it'); }),
    ];
    return () => { subs.forEach((s) => s?.remove?.()); try { m.abort?.(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!listening) { pulse.stopAnimation(); pulse.setValue(0); return undefined; }
    const l = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    l.start(); return () => l.stop();
  }, [listening, pulse]);

  const listen = async () => {
    const m = sr();
    if (!m) { setErr('Voice isn’t available on this phone — use the mic on your keyboard instead'); return; }
    if (listening) { try { m.stop(); } catch {} return; }
    try {
      const perm = await m.requestPermissionsAsync();
      if (!perm?.granted) { setErr('Allow the microphone to talk to Thiscene'); return; }
      finalRef.current = ''; setErr(''); setQ(''); setListening(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      m.start({ lang: 'en-US', interimResults: true, continuous: false, addsPunctuation: false });
    } catch { setListening(false); setErr('Couldn’t start listening — type it instead'); }
  };

  const movies = res?.movies || [];
  const top = movies[0];
  const tone = useThemed(top?.accent || accent);
  const SaveBtn = ({ m, size = 36 }) => {
    const saved = wl.ids.has(m.id);
    return (
      <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); wl.toggleSave(m); }} hitSlop={8} style={[styles.save, { width: size, height: size, borderRadius: size / 2 }, saved && { backgroundColor: '#7BFF9E22', borderColor: '#7BFF9E66' }]} accessibilityLabel={saved ? 'Saved' : 'Save'}>
        <Feather name={saved ? 'check' : 'plus'} size={16} color={saved ? '#7BFF9E' : '#fff'} />
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <Ambient accent={tone} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Header: drifting posters, tinted by the top pick */}
        <View style={{ height: 190 + insets.top }}>
          <Marquee posters={wall} tone={tone} />
          <Pressable onPress={() => router.back()} hitSlop={10} style={[styles.close, { position: 'absolute', top: insets.top + 10, right: 18 }]} accessibilityLabel="Close"><Feather name="x" size={18} color="#fff" /></Pressable>
          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 6 }}>
            <View style={[styles.badge, { backgroundColor: `${tone}33`, borderColor: `${tone}66` }]}>
              <Ionicons name="sparkles" size={12} color={tone} />
              <Text style={styles.badgeText}>ASK THISCENE</Text>
            </View>
            <Text style={styles.h1}>{listening ? 'Listening…' : res && movies.length ? `${movies.length} picks for you` : 'What do you feel like watching?'}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <View style={[styles.inputWrap, listening && { borderColor: tone }]}>
            {listening ? (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
                <Bars tone={tone} />
                <Text style={[styles.input, { color: q ? '#fff' : 'rgba(255,255,255,0.5)' }]} numberOfLines={1}>{q || 'Say it like you’d tell a friend…'}</Text>
              </View>
            ) : (
              <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => ask()} returnKeyType="search" placeholder="Mood, a film it’s like, length, where…" placeholderTextColor="rgba(255,255,255,0.4)" style={styles.input} maxLength={300} />
            )}
            <Pressable onPress={listen} accessibilityLabel={listening ? 'Stop listening' : 'Speak instead'} style={{ alignItems: 'center', justifyContent: 'center' }}>
              {listening ? <Animated.View style={[styles.ring, { borderColor: tone, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }] }]} /> : null}
              <LinearGradient colors={[tone, `${tone}99`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.orb}>
                {listening ? <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#07070F' }} /> : <Feather name="mic" size={19} color="#07070F" />}
              </LinearGradient>
            </Pressable>
            {!listening && q.trim() ? (
              <Pressable onPress={() => ask()} disabled={busy} accessibilityLabel="Find" style={[styles.orb, { backgroundColor: '#fff' }]}><Feather name="arrow-right" size={18} color="#07070F" /></Pressable>
            ) : null}
          </View>
          {err ? <Text style={styles.err}>{err}</Text> : null}
          {res?.chips?.length && !busy ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ marginTop: 12, flexGrow: 0 }}>
              {res.chips.map((c) => <View key={c} style={[styles.chip, { backgroundColor: `${tone}22`, borderColor: `${tone}55` }]}><Text style={styles.chipText}>{c}</Text></View>)}
            </ScrollView>
          ) : null}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled">
          {busy ? (
            <View style={{ alignItems: 'center', gap: 14, paddingTop: 46 }}><Dots /><Text style={styles.muted}>Finding films that fit…</Text></View>
          ) : res ? (
            movies.length ? (
              <>
                <Pressable onPress={() => openTitle(top)} style={[styles.hero, { width: width - 40, height: (width - 40) * 0.62, borderColor: `${tone}44` }]}>
                  {top.backdrop || top.poster ? <Image source={{ uri: (top.backdrop || top.poster).replace('/original/', '/w1280/') }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} /> : null}
                  <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(6,6,11,0.95)']} locations={[0.3, 1]} style={StyleSheet.absoluteFill} />
                  <View style={[styles.topPick, { backgroundColor: tone }]}><Text style={styles.topPickText}>TOP PICK</Text></View>
                  <View style={styles.heroBody}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.heroTitle} numberOfLines={2}>{top.title}</Text>
                      <Text style={styles.heroMeta}>{[top.year, top.rating !== 'N/A' ? `★ ${top.rating}` : null, top.isTV ? 'Series' : null].filter(Boolean).join(' · ')}</Text>
                      {top.why ? <Text style={[styles.why, { color: tone, fontFamily: F.bold, fontSize: 12.5 }]} numberOfLines={2}>{top.why}</Text> : null}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={[styles.orb, { backgroundColor: '#fff' }]}><Ionicons name="play" size={16} color="#07070F" style={{ marginLeft: 2 }} /></View>
                      <SaveBtn m={top} size={44} />
                    </View>
                  </View>
                </Pressable>

                {movies.length > 1 ? <Text style={styles.tryLabel}>MORE PICKS</Text> : null}
                {movies.slice(1).map((m, i) => (
                  <View key={`${m.mediaType}-${m.id}`} style={[styles.row, i && styles.rowBorder]}>
                    <Pressable onPress={() => openTitle(m)} style={({ pressed }) => [{ flex: 1, flexDirection: 'row', gap: 13, alignItems: 'center', opacity: pressed ? 0.75 : 1 }]}>
                      <View style={{ borderRadius: 9, shadowColor: m.accent, shadowOpacity: 0.4, shadowRadius: 10, elevation: 4 }}><Poster uri={m.poster} width={58} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.title} numberOfLines={1}>{m.title}</Text>
                        <Text style={styles.meta} numberOfLines={1}>{[m.year, m.rating !== 'N/A' ? `★ ${m.rating}` : null, m.isTV ? 'Series' : null].filter(Boolean).join(' · ')}</Text>
                        {m.why ? <Text style={[styles.why, { color: m.accent || tone }]} numberOfLines={2}>{m.why}</Text> : null}
                      </View>
                    </Pressable>
                    <SaveBtn m={m} />
                  </View>
                ))}
                <Text style={[styles.muted, { textAlign: 'center', marginTop: 18 }]}>Not quite? Add to it — “newer”, “on Prime”, “no horror”…</Text>
              </>
            ) : <Text style={[styles.muted, { textAlign: 'center', paddingTop: 40, lineHeight: 20 }]}>{res.note || 'Nothing fits all of that. Try fewer details, or a different film it’s like.'}</Text>
          ) : (
            <>
              <Text style={[styles.tryLabel, { marginTop: 4 }]}>TRY SAYING</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {EXAMPLES.map((ex, i) => (
                  <Pressable key={ex} onPress={() => ask(ex)} style={({ pressed }) => [styles.pill, { opacity: pressed ? 0.6 : 1 }]}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: DOTS[i % DOTS.length] }} />
                    <Text style={styles.pillText}>{ex}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.muted, { marginTop: 18, lineHeight: 18 }]}>Tap the mic and say it like you’d tell a friend — mood, a film it’s like, how long, where you watch.</Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const glass = { backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' };
const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 2.2, color: '#fff' },
  orb: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, backgroundColor: '#111', marginTop: 4 },
  topPick: { position: 'absolute', top: 12, left: 12, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  topPickText: { fontFamily: F.bold, fontSize: 10, letterSpacing: 1.8, color: '#07070F' },
  heroBody: { position: 'absolute', left: 16, right: 16, bottom: 14, flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  heroTitle: { fontFamily: F.displayHeavy, fontSize: 22, color: '#fff', letterSpacing: -0.4, lineHeight: 25 },
  heroMeta: { fontFamily: F.body, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  pillText: { fontFamily: F.semibold, fontSize: 13.5, color: '#fff' },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 2.2 },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', ...glass },
  h1: { fontFamily: F.displayHeavy, fontSize: 28, color: '#fff', letterSpacing: -0.7, lineHeight: 31, marginTop: 10, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 16 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 26, paddingLeft: 18, paddingRight: 6, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  input: { flex: 1, color: '#fff', fontFamily: F.body, fontSize: 15.5, paddingVertical: 8 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 2 },
  err: { fontFamily: F.body, fontSize: 12.5, color: '#FF8FA3', marginTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  chipText: { fontFamily: F.bold, fontSize: 11.5, color: '#fff' },
  muted: { fontFamily: F.body, fontSize: 12.5, color: 'rgba(255,255,255,0.55)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hairline },
  title: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  meta: { fontFamily: F.body, fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  why: { fontFamily: F.semibold, fontSize: 12, marginTop: 4, lineHeight: 16 },
  save: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', ...glass },
  tryLabel: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 2, color: 'rgba(255,255,255,0.45)', marginTop: 22, marginBottom: 10 },
  example: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  exampleText: { fontFamily: F.medium, fontSize: 14.5, color: 'rgba(255,255,255,0.85)' },
});
