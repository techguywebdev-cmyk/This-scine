import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Ambient from '../components/Ambient';
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
      api.post('/api/track', { name: 'ask', props: { q: t.slice(0, 80), n: (d.movies || []).length, app: 'android' } }).catch(() => {});
    } catch (e) { setErr(e.message || 'Something went wrong'); }
    setBusy(false);
  };

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

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <Ambient accent={accent} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, paddingTop: insets.top + 10 }}>
        <View style={{ paddingHorizontal: 20 }}>
          <View style={styles.headRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="sparkles" size={12} color={accent} />
              <Text style={[styles.eyebrow, { color: accent }]}>ASK THISCENE</Text>
            </View>
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close} accessibilityLabel="Close"><Feather name="x" size={18} color="#fff" /></Pressable>
          </View>
          <Text style={styles.h1}>{listening ? 'Listening…' : 'What do you feel like watching?'}</Text>

          <View style={[styles.inputWrap, listening && { borderColor: accent }]}>
            <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => ask()} returnKeyType="search" placeholder="Mood, a film it’s like, length, where…" placeholderTextColor="rgba(255,255,255,0.4)" style={styles.input} maxLength={300} autoFocus={false} />
            <Pressable onPress={listen} accessibilityLabel={listening ? 'Stop listening' : 'Speak instead'} style={{ alignItems: 'center', justifyContent: 'center' }}>
              {listening ? <Animated.View style={[styles.ring, { borderColor: accent, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }] }]} /> : null}
              <View style={[styles.round, { backgroundColor: listening ? accent : 'rgba(255,255,255,0.1)' }]}><Feather name="mic" size={18} color={listening ? '#07070F' : '#fff'} /></View>
            </Pressable>
            <Pressable onPress={() => ask()} disabled={!q.trim() || busy} accessibilityLabel="Find" style={[styles.round, { backgroundColor: '#fff', opacity: q.trim() ? 1 : 0.35 }]}><Feather name="arrow-right" size={18} color="#07070F" /></Pressable>
          </View>
          {err ? <Text style={styles.err}>{err}</Text> : null}
          {res?.chips?.length && !busy ? (
            <View style={styles.chips}>{res.chips.map((c) => <View key={c} style={[styles.chip, { backgroundColor: `${accent}22`, borderColor: `${accent}55` }]}><Text style={styles.chipText}>{c}</Text></View>)}</View>
          ) : null}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 30 }} keyboardShouldPersistTaps="handled">
          {busy ? (
            <View style={{ alignItems: 'center', gap: 14, paddingTop: 50 }}><Dots /><Text style={styles.muted}>Finding films that fit…</Text></View>
          ) : res ? (
            res.movies?.length ? (
              <>
                <Text style={[styles.muted, { marginTop: 8 }]}>{res.movies.length} picks · tap one to watch the trailer</Text>
                {res.movies.map((m, i) => {
                  const saved = wl.ids.has(m.id);
                  return (
                    <View key={`${m.mediaType}-${m.id}`} style={[styles.row, i && styles.rowBorder]}>
                      <Pressable onPress={() => openTitle(m)} style={({ pressed }) => [{ flex: 1, flexDirection: 'row', gap: 12, alignItems: 'center', opacity: pressed ? 0.75 : 1 }]}>
                        <Poster uri={m.poster} width={54} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.title} numberOfLines={1}>{m.title}</Text>
                          <Text style={styles.meta} numberOfLines={1}>{[m.year, m.rating !== 'N/A' ? `★ ${m.rating}` : null, m.isTV ? 'Series' : null].filter(Boolean).join(' · ')}</Text>
                          {m.why ? <Text style={[styles.why, { color: accent }]} numberOfLines={2}>{m.why}</Text> : null}
                        </View>
                      </Pressable>
                      <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); wl.toggleSave(m); }} hitSlop={8} style={[styles.save, saved && { backgroundColor: '#7BFF9E22', borderColor: '#7BFF9E66' }]} accessibilityLabel={saved ? 'Saved' : 'Save'}>
                        <Feather name={saved ? 'check' : 'plus'} size={16} color={saved ? '#7BFF9E' : '#fff'} />
                      </Pressable>
                    </View>
                  );
                })}
                <Text style={[styles.muted, { textAlign: 'center', marginTop: 16 }]}>Not quite? Add to it — “newer”, “on Prime”, “no horror”…</Text>
              </>
            ) : <Text style={[styles.muted, { textAlign: 'center', paddingTop: 40, lineHeight: 20 }]}>Nothing fits all of that. Try fewer details, or a different film it’s like.</Text>
          ) : (
            <>
              <Text style={styles.tryLabel}>TRY</Text>
              {EXAMPLES.map((ex, i) => (
                <Pressable key={ex} onPress={() => ask(ex)} style={({ pressed }) => [styles.example, i && styles.rowBorder, { opacity: pressed ? 0.6 : 1 }]}>
                  <Ionicons name="sparkles" size={12} color={accent} /><Text style={styles.exampleText}>{ex}</Text>
                </Pressable>
              ))}
              <Text style={[styles.muted, { marginTop: 16 }]}>Tip: tap the mic and just say it.</Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const glass = { backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' };
const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 2.2 },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', ...glass },
  h1: { fontFamily: F.displayHeavy, fontSize: 25, color: '#fff', letterSpacing: -0.5, lineHeight: 29, marginTop: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, borderRadius: 18, paddingLeft: 16, paddingRight: 6, paddingVertical: 6, ...glass },
  input: { flex: 1, color: '#fff', fontFamily: F.body, fontSize: 15.5, paddingVertical: 8 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 2 },
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
  tryLabel: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 2, color: 'rgba(255,255,255,0.45)', marginTop: 18, marginBottom: 6 },
  example: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  exampleText: { fontFamily: F.medium, fontSize: 14.5, color: 'rgba(255,255,255,0.85)' },
});
