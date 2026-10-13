import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { F } from '../lib/theme';

const PRESET = { ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 64000, isMeteringEnabled: true };
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// Squash a long level history into n peaks (0..1) for the bubble waveform
const squash = (levels, n = 40) => {
  if (!levels.length) return [];
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = Math.floor((i * levels.length) / n), b = Math.max(a + 1, Math.floor(((i + 1) * levels.length) / n));
    out.push(Math.round(Math.max(...levels.slice(a, b)) * 100) / 100);
  }
  return out;
};

// Hook: start() asks for the mic, records with metering; stop() hands { uri, secs, peaks } to onDone
export function useVoiceRecorder({ maxSecs = 120, onDone, onError }) {
  const recorder = useAudioRecorder(PRESET);
  const state = useAudioRecorderState(recorder, 90);
  const [recording, setRecording] = useState(false);
  const levels = useRef([]);
  const cancelled = useRef(false);

  useEffect(() => {
    if (!recording || typeof state.metering !== 'number') return;
    levels.current.push(Math.max(0.04, Math.min(1, (state.metering + 50) / 50)));
  }, [state.metering, state.durationMillis, recording]);

  const secs = Math.floor((state.durationMillis || 0) / 1000);
  useEffect(() => { if (recording && secs >= maxSecs) stop(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [secs, recording]);

  const start = async () => {
    try {
      const p = await requestRecordingPermissionsAsync();
      if (!p.granted) { onError?.('Allow microphone access to send voice notes'); return; }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      levels.current = []; cancelled.current = false;
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch (e) { onError?.('Couldn’t start recording'); }
  };

  const finish = async (send) => {
    if (!recording) return;
    const dur = (recorder.getStatus?.().durationMillis ?? state.durationMillis) || 0;
    setRecording(false);
    try { await recorder.stop(); } catch {}
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
    if (!send) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); return; }
    const s = Math.max(1, Math.round(dur / 1000));
    if (dur < 700 || !recorder.uri) { onError?.('Hold on a little longer — that was too short'); return; }
    onDone?.({ uri: recorder.uri, secs: s, peaks: squash(levels.current) });
  };
  const stop = () => finish(true);
  const cancel = () => finish(false);

  return { recording, secs, levels: levels.current, metering: state.metering, start, stop, cancel };
}

// Replaces the composer while recording: trash · red dot + timer · live waveform · send
export function RecorderBar({ rec, maxSecs = 120 }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 0.25, duration: 600, useNativeDriver: true }), Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true })]));
    loop.start(); return () => loop.stop();
  }, [pulse]);
  const bars = rec.levels.slice(-34);
  const late = maxSecs - rec.secs <= 10;
  return (
    <View style={styles.bar}>
      <Pressable onPress={rec.cancel} hitSlop={8} accessibilityLabel="Discard voice note" style={styles.round}><Feather name="trash-2" size={17} color="#ff8a8a" /></Pressable>
      <Animated.View style={[styles.rec, { opacity: pulse }]} />
      <Text style={[styles.time, late && { color: '#ff8a8a' }]}>{mmss(rec.secs)}</Text>
      <View style={styles.wave}>
        {bars.map((v, i) => <View key={i} style={{ width: 3, height: Math.max(3, v * 26), borderRadius: 2, backgroundColor: '#fff', opacity: 0.35 + 0.65 * (i / Math.max(1, bars.length)) }} />)}
      </View>
      <Pressable onPress={rec.stop} accessibilityLabel="Send voice note" style={styles.send}><Feather name="arrow-up" size={18} color="#07070F" /></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingLeft: 6, paddingRight: 4, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rec: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#ff5a5a' },
  time: { fontFamily: F.semibold, fontSize: 13, color: '#fff', minWidth: 34 },
  wave: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2, height: 30, overflow: 'hidden' },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
});
