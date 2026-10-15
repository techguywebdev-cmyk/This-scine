import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F } from '../lib/theme';

// Attachment tray — same five options as the website's chat
export const ATTACH = [
  { id: 'photos', label: 'Photos', icon: 'image', tint: '#7BC8FF' },
  { id: 'camera', label: 'Camera', icon: 'camera', tint: '#FF8FA3' },
  { id: 'video', label: 'Video', icon: 'video', tint: '#B07FEF' },
  { id: 'file', label: 'File', icon: 'file-text', tint: '#7BFFB0' },
  { id: 'gif', label: 'GIFs', icon: 'film', tint: '#FFD166' },
];

export function AttachTray({ onPick }) {
  return (
    <View style={styles.tray}>
      {ATTACH.map((a) => (
        <Pressable key={a.id} onPress={() => onPick(a.id)} style={({ pressed }) => [{ alignItems: 'center', gap: 7, flex: 1, opacity: pressed ? 0.6 : 1 }]} accessibilityLabel={a.label}>
          <View style={[styles.trayIcon, { borderColor: `${a.tint}66`, backgroundColor: `${a.tint}26`, shadowColor: a.tint }]}><Feather name={a.icon} size={22} color={a.tint} /></View>
          <Text style={styles.trayLabel}>{a.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// Emoji sets (same packs as the website's sticker tray)
const PACKS = {
  Cinema: ['🎬', '🍿', '🎥', '🎞️', '📽️', '🎦', '🏆', '⭐', '🌟', '💫', '🔥', '💥'],
  Reactions: ['😂', '😍', '😱', '😭', '🤯', '😎', '🤔', '😴', '🫡', '🫠', '👀', '💯'],
  Love: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💕', '✨', '🙌'],
  Fun: ['👻', '💀', '🎃', '👽', '🤖', '👾', '🎮', '🎯', '🍕', '☕', '🌙', '📱'],
};
export function EmojiPicker({ onPick }) {
  const [pack, setPack] = useState('Cinema');
  return (
    <View style={{ paddingTop: 10, paddingBottom: 4 }}>
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8, paddingHorizontal: 4 }}>
        {Object.keys(PACKS).map((k) => (
          <Pressable key={k} onPress={() => setPack(k)} hitSlop={6}><Text style={[styles.trayLabel, pack === k ? { color: '#fff', fontFamily: F.bold } : { color: 'rgba(255,255,255,0.45)' }]}>{k}</Text></Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {PACKS[pack].map((e) => (
          <Pressable key={e} onPress={() => onPick(e)} style={({ pressed }) => [{ width: '16.66%', alignItems: 'center', paddingVertical: 8, opacity: pressed ? 0.5 : 1 }]}><Text style={{ fontSize: 28 }}>{e}</Text></Pressable>
        ))}
      </View>
    </View>
  );
}

// GIF search (same GIPHY source as the website)
export function GifPicker({ onSend, onClose }) {
  const [q, setQ] = useState('');
  const [list, setList] = useState(null);
  const { width } = useWindowDimensions();
  const load = (query) => {
    setList(null);
    fetch(`https://api.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(query || 'cinema')}&limit=24&rating=pg-13`)
      .then((r) => r.json())
      .then((d) => setList((d.data || []).map((g) => ({ id: g.id, url: g.images?.fixed_height?.url || g.images?.original?.url, preview: g.images?.fixed_height_small?.url || g.images?.preview_gif?.url })).filter((g) => g.url)))
      .catch(() => setList([]));
  };
  useEffect(() => { load('cinema'); }, []);
  const w = (width - 24 - 16) / 3;
  return (
    <View style={styles.gifWrap}>
      <View style={styles.gifSearch}>
        <Feather name="search" size={15} color="rgba(255,255,255,0.5)" />
        <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => load(q)} returnKeyType="search" placeholder="Search GIFs" placeholderTextColor="rgba(255,255,255,0.4)" style={styles.gifInput} />
        <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close GIFs"><Feather name="x" size={17} color="#fff" /></Pressable>
      </View>
      <ScrollView style={{ height: 230 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 8 }} keyboardShouldPersistTaps="handled">
        {list === null ? <ActivityIndicator color="#fff" style={{ marginTop: 40, width: '100%' }} /> : list.length === 0 ? <Text style={styles.trayLabel}>No GIFs found</Text> : list.map((g) => (
          <Pressable key={g.id} onPress={() => onSend(g)} style={{ width: w, height: w * 0.8, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <Image source={{ uri: g.preview || g.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.powered}>Powered by GIPHY</Text>
    </View>
  );
}

function Viewer({ kind, uri, onClose }) {
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(kind === 'video' ? uri : null, (p) => { if (kind === 'video') p.play(); });
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {kind === 'video' ? <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls /> : <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="contain" />}
        <Pressable onPress={onClose} hitSlop={10} style={[styles.viewerClose, { top: insets.top + 12 }]} accessibilityLabel="Close"><Feather name="x" size={20} color="#fff" /></Pressable>
      </View>
    </Modal>
  );
}

export function MediaBubble({ m }) {
  const [open, setOpen] = useState(false);
  if (m.msg_type === 'image' || m.msg_type === 'photo') {
    return (
      <>
        <Pressable onPress={() => setOpen(true)} style={styles.media}><Image source={{ uri: m.media_url }} style={{ width: 220, height: 260 }} contentFit="cover" transition={200} /></Pressable>
        {open ? <Viewer kind="image" uri={m.media_url} onClose={() => setOpen(false)} /> : null}
      </>
    );
  }
  if (m.msg_type === 'video') {
    return (
      <>
        <Pressable onPress={() => setOpen(true)} style={[styles.media, styles.videoBox]} accessibilityLabel="Play video">
          <View style={styles.playBtn}><Feather name="play" size={22} color="#07070F" style={{ marginLeft: 3 }} /></View>
          <Text style={styles.videoLabel}>Video</Text>
        </Pressable>
        {open ? <Viewer kind="video" uri={m.media_url} onClose={() => setOpen(false)} /> : null}
      </>
    );
  }
  // file
  const name = m.text && m.text !== 'File' ? m.text : 'File';
  return (
    <Pressable onPress={() => Linking.openURL(m.media_url).catch(() => {})} style={styles.fileBox} accessibilityLabel={`Open ${name}`}>
      <View style={styles.fileIcon}><Feather name="file-text" size={18} color="#7BFFB0" /></View>
      <View style={{ flexShrink: 1 }}>
        <Text style={styles.fileName} numberOfLines={2}>{name}</Text>
        <Text style={styles.fileSub}>Tap to open</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tray: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 4 },
  trayIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, elevation: 6, shadowOpacity: 0.5, shadowRadius: 12 },
  trayLabel: { fontFamily: F.semibold, fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  gifWrap: { paddingTop: 8 },
  gifSearch: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, borderRadius: 21, paddingHorizontal: 14, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  gifInput: { flex: 1, color: '#fff', fontFamily: F.body, fontSize: 14, paddingVertical: 0 },
  powered: { fontFamily: F.body, fontSize: 10, color: 'rgba(255,255,255,0.35)', textAlign: 'right', marginTop: 4 },
  media: { borderRadius: 16, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)' },
  videoBox: { width: 220, height: 150, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', gap: 8 },
  playBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  videoLabel: { fontFamily: F.semibold, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  fileBox: { flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: 240, padding: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)' },
  fileIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#7BFFB01a', alignItems: 'center', justifyContent: 'center' },
  fileName: { fontFamily: F.bold, fontSize: 13.5, color: '#fff' },
  fileSub: { fontFamily: F.body, fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  viewerClose: { position: 'absolute', right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
});
