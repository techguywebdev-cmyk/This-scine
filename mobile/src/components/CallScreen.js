import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RTCView } from 'react-native-webrtc';
import { Feather } from '@expo/vector-icons';
import Ambient from './Ambient';
import { Avatar } from './Ui';
import { useCalls } from '../lib/calls';
import { F } from '../lib/theme';

const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function Ripple({ size }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { const l = Animated.loop(Animated.timing(a, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true })); l.start(); return () => l.stop(); }, [a]);
  return <Animated.View pointerEvents="none" style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: '#fff', opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }] }} />;
}

function Ctrl({ icon, label, on, onPress, danger, big }) {
  const s = big ? 70 : 58;
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={{ alignItems: 'center', gap: 7 }}>
      <View style={[{ width: s, height: s, borderRadius: s / 2, alignItems: 'center', justifyContent: 'center' }, danger ? { backgroundColor: '#ff4d5e' } : on ? { backgroundColor: '#fff' } : styles.glass]}>
        <Feather name={icon} size={big ? 28 : 22} color={danger ? '#fff' : on ? '#07070F' : '#fff'} />
      </View>
      {label ? <Text style={styles.ctrlLabel}>{label}</Text> : null}
    </Pressable>
  );
}

// Full-screen call UI, mounted once at the app root
export default function CallScreen() {
  const c = useCalls();
  const insets = useSafeAreaInsets();
  const [secs, setSecs] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;
  const call = c?.call;

  useEffect(() => { Animated.timing(fade, { toValue: call ? 1 : 0, duration: 260, useNativeDriver: true }).start(); }, [!!call]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (call?.status !== 'connected' || !call.startedAt) { setSecs(0); return; }
    const t = setInterval(() => setSecs(Math.floor((Date.now() - call.startedAt) / 1000)), 500);
    return () => clearInterval(t);
  }, [call?.status, call?.startedAt]);

  if (!c) return null;
  if (!call) return c.error ? <View style={[styles.errWrap, { top: insets.top + 12 }]}><Text style={styles.errText}>{c.error}</Text></View> : null;

  const video = call.mode === 'video';
  const name = call.peer.display_name || call.peer.username || 'Friend';
  const showRemoteVideo = video && c.remote && call.status === 'connected';
  const label = call.status === 'incoming' ? (video ? 'Incoming video call' : 'Incoming call') : call.status === 'outgoing' ? 'Calling…' : call.status === 'connecting' ? 'Connecting…' : mmss(secs);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: fade }]}>
      {showRemoteVideo ? <RTCView streamURL={c.remote.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" /> : <Ambient accent="#818CF8" />}
      {video && c.local && !c.camOff && call.status !== 'incoming' ? (
        <View style={[styles.pip, { top: insets.top + 70 }]}><RTCView streamURL={c.local.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" mirror zOrder={1} /></View>
      ) : null}

      <View style={{ flex: 1, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 30, alignItems: 'center' }}>
        {!showRemoteVideo ? (
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {call.status === 'incoming' || call.status === 'outgoing' ? <Ripple size={130} /> : null}
              <Avatar uri={call.peer.avatar_url} name={name} size={130} />
            </View>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.state}>{label}</Text>
          </View>
        ) : (
          <View style={styles.topLabel}><Text style={styles.topName}>{name}</Text><Text style={styles.topTime}>{label}</Text></View>
        )}
        <View style={{ flex: 1 }} />

        {call.status === 'incoming' ? (
          <View style={styles.row}>
            <Ctrl icon="phone-off" label="Decline" danger big onPress={c.hangup} />
            <Ctrl icon={video ? 'video' : 'phone'} label="Accept" on big onPress={c.accept} />
          </View>
        ) : (
          <View style={{ gap: 26, alignItems: 'center' }}>
            <View style={styles.row}>
              <Ctrl icon={c.muted ? 'mic-off' : 'mic'} label={c.muted ? 'Unmute' : 'Mute'} on={c.muted} onPress={c.toggleMute} />
              <Ctrl icon={c.speaker ? 'volume-2' : 'volume-1'} label="Speaker" on={c.speaker} onPress={c.toggleSpeaker} />
              {video ? <Ctrl icon={c.camOff ? 'video-off' : 'video'} label="Camera" on={c.camOff} onPress={c.toggleCam} /> : null}
              {video ? <Ctrl icon="refresh-cw" label="Flip" onPress={c.flip} /> : null}
            </View>
            <Ctrl icon="phone-off" danger big onPress={c.hangup} label="End" />
          </View>
        )}
      </View>
      {c.error ? <View style={[styles.errWrap, { top: insets.top + 12 }]}><Text style={styles.errText}>{c.error}</Text></View> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 100, backgroundColor: '#06060B', elevation: 30 },
  glass: { backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  name: { fontFamily: F.displayHeavy, fontSize: 30, color: '#fff', letterSpacing: -0.5, marginTop: 26, textAlign: 'center' },
  state: { fontFamily: F.semibold, fontSize: 15, color: 'rgba(255,255,255,0.7)', marginTop: 8, fontVariant: ['tabular-nums'] },
  topLabel: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18 },
  topName: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  topTime: { fontFamily: F.semibold, fontSize: 12.5, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  row: { flexDirection: 'row', gap: 26, alignItems: 'flex-start', justifyContent: 'center' },
  ctrlLabel: { fontFamily: F.semibold, fontSize: 11.5, color: 'rgba(255,255,255,0.8)' },
  pip: { position: 'absolute', right: 16, width: 108, height: 150, borderRadius: 16, overflow: 'hidden', zIndex: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: '#000' },
  errWrap: { position: 'absolute', alignSelf: 'center', zIndex: 120, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 18, backgroundColor: 'rgba(20,20,28,0.95)', borderWidth: 1, borderColor: 'rgba(255,138,138,0.4)' },
  errText: { fontFamily: F.semibold, fontSize: 13, color: '#ff8a8a' },
});
