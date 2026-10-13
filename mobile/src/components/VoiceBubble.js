import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Feather } from '@expo/vector-icons';
import { F } from '../lib/theme';

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
let current = null; // only one voice note plays at a time

export default function VoiceBubble({ src, secs = 0, peaks, mine, accent }) {
  const player = useAudioPlayer(src ? { uri: src } : null);
  const st = useAudioPlayerStatus(player);
  const dur = st.duration || secs || 0;
  const pos = st.currentTime || 0;
  const prog = dur ? Math.min(1, pos / dur) : 0;
  const bars = (Array.isArray(peaks) && peaks.length ? peaks : Array.from({ length: 32 }, (_, i) => 0.3 + 0.5 * Math.abs(Math.sin(i * 1.7)))).slice(0, 40);
  const ink = mine ? '#07070F' : '#fff';

  useEffect(() => { if (st.didJustFinish) { player.seekTo(0); } }, [st.didJustFinish, player]);

  const toggle = () => {
    if (st.playing) { player.pause(); return; }
    if (current && current !== player) { try { current.pause(); } catch {} }
    current = player;
    player.play();
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 200 }}>
      <Pressable onPress={toggle} hitSlop={8} accessibilityLabel={st.playing ? 'Pause voice note' : 'Play voice note'} style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: mine ? 'rgba(0,0,0,0.12)' : accent || 'rgba(255,255,255,0.16)' }}>
        <Feather name={st.playing ? 'pause' : 'play'} size={15} color={mine ? '#07070F' : '#07070F'} style={{ marginLeft: st.playing ? 0 : 2 }} />
      </Pressable>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 28 }}>
        {bars.map((v, i) => (
          <View key={i} style={{ flex: 1, height: Math.max(3, v * 26), borderRadius: 2, backgroundColor: ink, opacity: i / bars.length <= prog ? 0.95 : 0.3 }} />
        ))}
      </View>
      <Text style={{ fontFamily: F.semibold, fontSize: 11.5, color: ink, opacity: 0.75, minWidth: 30, textAlign: 'right' }}>{mmss(st.playing || pos > 0 ? pos : dur)}</Text>
    </View>
  );
}
