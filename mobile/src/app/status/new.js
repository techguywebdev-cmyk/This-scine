import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import Ambient from '../../components/Ambient';
import { TsLoader } from '../../components/Brand';
import { useApi } from '../../lib/api';
import { STATUS_BGS } from '../../lib/statusCache';
import { F, inkOn } from '../../lib/theme';

// New status: text on a colour, or a photo / short video from the gallery (gone after 24 hours)
export default function NewStatus() {
  const insets = useSafeAreaInsets();
  const api = useApi();
  const [text, setText] = useState('');
  const [bg, setBg] = useState('ambient');
  const [media, setMedia] = useState(null); // { uri, kind, mime }
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const accent = '#818CF8';
  const colour = bg === 'ambient' ? accent : bg;
  const ink = !media && bg !== 'ambient' && bg !== '#E6E6EA' ? inkOn(bg) : '#fff';
  const dark = ink !== '#fff' && ink !== '#FFFFFF';

  const pick = async () => {
    setErr('');
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.85, videoMaxDuration: 30, allowsEditing: false });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    const kind = a.type === 'video' ? 'video' : 'image';
    if (kind === 'video' && a.duration && a.duration > 31000) { setErr('Videos can be up to 30 seconds'); return; }
    setMedia({ uri: a.uri, kind, mime: a.mimeType || (kind === 'video' ? 'video/mp4' : 'image/jpeg') });
  };

  const post = async () => {
    if (busy) return;
    if (!media && !text.trim()) { setErr('Write something first'); return; }
    setBusy(true); setErr('');
    try {
      let body;
      if (media) {
        const ext = media.mime.split('/')[1] || (media.kind === 'video' ? 'mp4' : 'jpg');
        const form = new FormData();
        form.append('file', { uri: media.uri, name: `status.${ext}`, type: media.mime });
        form.append('kind', media.kind);
        const up = await api.request('/api/upload-chat-media', { method: 'POST', body: form });
        if (!up.url) throw new Error('Upload failed');
        body = { kind: media.kind, media_url: up.url, text: text.trim() || undefined };
      } else {
        body = { kind: 'text', text: text.trim(), bg: colour, meta: bg === 'ambient' ? { bgStyle: 'ambient' } : undefined };
      }
      await api.post('/api/status', body);
      router.back();
    } catch (e) { setErr(e.message || 'Couldn’t post'); setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#000' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {media ? <Image source={{ uri: media.uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
        : bg === 'ambient' || bg === '#E6E6EA' ? <Ambient accent={bg === 'ambient' ? accent : '#E6E6EA'} /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: bg }]} />}

      <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Close"><Feather name="x" size={26} color={ink} /></Pressable>
        <Text style={[styles.head, { color: ink }]}>New status</Text>
        <Pressable onPress={media ? () => setMedia(null) : pick} hitSlop={10} accessibilityLabel={media ? 'Remove photo' : 'Add a photo or video'} style={styles.round}>
          <Feather name={media ? 'type' : 'image'} size={18} color="#fff" />
        </Pressable>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 26 }}>
        {media ? (
          media.kind === 'video' ? <View style={styles.videoTag}><Feather name="video" size={14} color="#fff" /><Text style={styles.videoText}>Video ready</Text></View> : null
        ) : (
          <TextInput value={text} onChangeText={setText} autoFocus multiline maxLength={700} placeholder="What are you watching?" placeholderTextColor={dark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.55)'} style={[styles.big, dark && { color: ink }, { fontSize: text.length > 140 ? 22 : text.length > 60 ? 28 : 34 }]} textAlign="center" />
        )}
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
        {media ? (
          <TextInput value={text} onChangeText={setText} placeholder="Add a caption…" placeholderTextColor="rgba(255,255,255,0.6)" style={styles.caption} maxLength={300} />
        ) : (
          <View style={styles.swatches}>
            {['ambient', ...STATUS_BGS].map((c) => (
              <Pressable key={c} onPress={() => setBg(c)} accessibilityLabel={c === 'ambient' ? 'Default background' : 'Background colour'} style={[styles.swatch, { backgroundColor: c === 'ambient' ? '#232338' : c === '#E6E6EA' ? '#000' : c, borderColor: bg === c ? '#fff' : 'rgba(255,255,255,0.3)', borderWidth: bg === c ? 2.5 : 1.5 }]} />
            ))}
          </View>
        )}
        {err ? <Text style={styles.err}>{err}</Text> : null}
        <Pressable onPress={post} disabled={busy} style={styles.post}>
          {busy ? <TsLoader size={20} /> : <><Text style={styles.postText}>Share to status</Text><Feather name="arrow-right" size={16} color="#07070F" /></>}
        </Pressable>
        <Text style={[styles.hint, dark && { color: 'rgba(0,0,0,0.55)' }]}>Visible to people who follow you · gone after 24 hours</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const glass = { backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' };
const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  head: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', ...glass },
  big: { fontFamily: F.displayHeavy, color: '#fff', letterSpacing: -0.5 },
  videoTag: { alignSelf: 'center', flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 12, height: 32, borderRadius: 16, ...glass },
  videoText: { fontFamily: F.bold, fontSize: 12.5, color: '#fff' },
  bottom: { paddingHorizontal: 18, gap: 12 },
  swatches: { flexDirection: 'row', justifyContent: 'center', gap: 10, flexWrap: 'wrap' },
  swatch: { width: 30, height: 30, borderRadius: 15 },
  caption: { height: 46, borderRadius: 23, paddingHorizontal: 18, color: '#fff', fontFamily: F.body, fontSize: 15, ...glass },
  err: { fontFamily: F.semibold, fontSize: 12.5, color: '#ff8a8a', textAlign: 'center' },
  post: { height: 52, borderRadius: 26, backgroundColor: '#fff', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  postText: { fontFamily: F.bold, fontSize: 15, color: '#07070F' },
  hint: { fontFamily: F.body, fontSize: 11.5, color: 'rgba(255,255,255,0.55)', textAlign: 'center' },
});
