import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Ambient from '../../components/Ambient';
import VoiceBubble from '../../components/VoiceBubble';
import { RecorderBar, useVoiceRecorder } from '../../components/VoiceRecorder';
import SafetySheet from '../../components/SafetySheet';
import { AttachTray, GifPicker, MediaBubble } from '../../components/ChatMedia';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Avatar, GlassButton, Poster } from '../../components/Ui';
import { TsLoader } from '../../components/Brand';
import { useApi } from '../../lib/api';
import { useCalls } from '../../lib/calls';
import { openTitle } from '../../lib/titles';
import { F, T } from '../../lib/theme';

const timeOf = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const dayLabel = (ts) => {
  const d = new Date(ts), now = new Date(), y = new Date(); y.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' });
};
const isCallJson = (t) => typeof t === 'string' && t.trim().startsWith('{') && t.includes('"kind"');

export default function Chat() {
  const { id, name, avatar } = useLocalSearchParams();
  const peerId = String(id);
  const insets = useSafeAreaInsets();
  const api = useApi();
  const [peer, setPeer] = useState({ user_id: peerId, display_name: name || '', avatar_url: avatar || null });
  const [msgs, setMsgs] = useState(null);
  const [blocked, setBlocked] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const [safety, setSafety] = useState(false);
  const calls = useCalls();
  const timer = useRef(null);
  const listRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const d = await api.get(`/api/messages?with=${encodeURIComponent(peerId)}`);
      if (d.peer) setPeer((p) => ({ ...p, ...d.peer }));
      setBlocked(d.blocked || null);
      setMsgs((prev) => {
        const fresh = (d.messages || []).filter((m) => m.msg_type !== 'call_signal' && !isCallJson(m.text));
        const pending = (prev || []).filter((m) => m.pending);
        return [...fresh, ...pending.filter((p) => !fresh.some((f) => f.from_me && f.text === p.text && Math.abs(new Date(f.created_at) - new Date(p.created_at)) < 60000))];
      });
    } catch (e) { setMsgs((p) => p || []); if (e.status === 404) setBlocked('by_them'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId]);

  useFocusEffect(useCallback(() => {
    load();
    timer.current = setInterval(load, 3500);
    return () => clearInterval(timer.current);
  }, [load]));

  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setText(''); setErr(''); setSending(true);
    const temp = { id: `tmp-${Date.now()}`, text: t, from_me: true, created_at: new Date().toISOString(), msg_type: 'text', pending: true };
    setMsgs((p) => [...(p || []), temp]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await api.post('/api/messages', { toUserId: peerId, text: t });
      await load();
    } catch (e) {
      setMsgs((p) => (p || []).filter((m) => m.id !== temp.id));
      setText(t);
      setErr(e.message || 'Couldn’t send');
    }
    setSending(false);
  };

  const sendVoice = async ({ uri, secs, peaks }) => {
    setErr(''); setSending(true);
    const temp = { id: `tmp-${Date.now()}`, text: 'Voice note', from_me: true, created_at: new Date().toISOString(), msg_type: 'voice', media_url: uri, meta: { secs, peaks }, pending: true };
    setMsgs((p) => [...(p || []), temp]);
    try {
      const form = new FormData();
      form.append('file', { uri, name: `voice-${Date.now()}.m4a`, type: 'audio/mp4' });
      form.append('kind', 'voice');
      const up = await api.request('/api/upload-chat-media', { method: 'POST', body: form });
      if (!up.url) throw new Error('Voice upload failed');
      await api.post('/api/messages', { toUserId: peerId, text: 'Voice note', msg_type: 'voice', media_url: up.url, meta: { secs, peaks } });
      setMsgs((p) => (p || []).filter((m) => m.id !== temp.id));
      await load();
    } catch (e) {
      setMsgs((p) => (p || []).filter((m) => m.id !== temp.id));
      setErr(e.message || 'Couldn’t send your voice note');
    }
    setSending(false);
  };
  const rec = useVoiceRecorder({ maxSecs: 120, onDone: sendVoice, onError: setErr });

  // Photos, camera, video, files, GIFs — same message types as the website
  const [tray, setTray] = useState(null); // null | 'menu' | 'gif'
  const sendMedia = async ({ uri, name, mime, kind, size }) => {
    const limit = kind === 'image' ? 8 : 4.4;
    if (size && size > limit * 1024 * 1024) { setErr(kind === 'video' ? 'Video too large — keep it under about 30 seconds' : `File too large (max ${limit}MB)`); return; }
    setErr(''); setSending(true); setTray(null);
    const label = kind === 'video' ? 'Video' : kind === 'image' ? 'Photo' : name || 'File';
    const temp = { id: `tmp-${Date.now()}`, text: label, from_me: true, created_at: new Date().toISOString(), msg_type: kind, media_url: uri, pending: true };
    setMsgs((p) => [...(p || []), temp]);
    try {
      const form = new FormData();
      form.append('file', { uri, name: name || `upload-${Date.now()}`, type: mime || 'application/octet-stream' });
      form.append('kind', kind);
      const up = await api.request('/api/upload-chat-media', { method: 'POST', body: form });
      if (!up.url) throw new Error('Upload failed');
      await api.post('/api/messages', { toUserId: peerId, text: label, msg_type: kind, media_url: up.url });
      setMsgs((p) => (p || []).filter((m) => m.id !== temp.id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await load();
    } catch (e) {
      setMsgs((p) => (p || []).filter((m) => m.id !== temp.id));
      setErr(e.message || 'Couldn’t send that');
    }
    setSending(false);
  };
  const pick = async (what) => {
    try {
      if (what === 'gif') { setTray('gif'); return; }
      if (what === 'file') {
        const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
        const a = r?.assets?.[0]; if (r.canceled || !a) return;
        const mime = a.mimeType || '';
        await sendMedia({ uri: a.uri, name: a.name, mime, size: a.size, kind: mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : 'file' });
        return;
      }
      const video = what === 'video';
      if (what === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { setErr('Allow the camera to take a photo'); return; }
      }
      const opts = { mediaTypes: video ? ['videos'] : ['images'], quality: 0.7, videoMaxDuration: 30, videoQuality: ImagePicker.UIImagePickerControllerQualityType?.Medium ?? 1, allowsEditing: false };
      const r = what === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      const a = r?.assets?.[0]; if (r.canceled || !a) return;
      const isVid = a.type === 'video' || video;
      await sendMedia({ uri: a.uri, name: a.fileName || (isVid ? 'video.mp4' : 'photo.jpg'), mime: a.mimeType || (isVid ? 'video/mp4' : 'image/jpeg'), size: a.fileSize, kind: isVid ? 'video' : 'image' });
    } catch (e) { setErr(e.message || 'Couldn’t open that'); }
  };
  const sendGif = async (g) => {
    setTray(null); setErr('');
    const temp = { id: `tmp-${Date.now()}`, text: 'GIF', from_me: true, created_at: new Date().toISOString(), msg_type: 'gif', media_url: g.url, pending: true };
    setMsgs((p) => [...(p || []), temp]);
    try { await api.post('/api/messages', { toUserId: peerId, text: 'GIF', msg_type: 'gif', media_url: g.url }); await load(); }
    catch (e) { setErr(e.message || 'Couldn’t send that GIF'); }
    setMsgs((p) => (p || []).filter((m) => m.id !== temp.id));
  };

  // newest at the bottom: inverted list wants newest first
  const data = (msgs || []).slice().reverse();
  const accent = '#fff';

  const renderBody = (m) => {
    const mine = m.from_me;
    const ink = mine ? '#07070F' : '#fff';
    if (m.msg_type === 'voice' && m.media_url) return <VoiceBubble src={m.media_url} secs={m.meta?.secs} peaks={m.meta?.peaks} mine={mine} accent="#fff" />;
    if (['image', 'photo', 'video', 'file'].includes(m.msg_type) && m.media_url) return <MediaBubble m={m} />;
    if ((m.msg_type === 'sticker' || m.msg_type === 'gif') && m.media_url) return <Image source={{ uri: m.media_url }} style={{ width: 150, height: 150 }} contentFit="contain" />;
    if (m.msg_type === 'title' && m.meta) {
      return (
        <Pressable onPress={() => openTitle({ id: m.meta.id, title: m.meta.title, isTV: m.meta.type === 'tv', poster: m.meta.poster })} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', width: 220 }}>
          <Poster uri={m.meta.poster} width={48} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 13.5, color: ink }} numberOfLines={2}>{m.meta.title}</Text>
            <Text style={{ fontFamily: F.body, fontSize: 11.5, color: ink, opacity: 0.6, marginTop: 2 }}>{[m.meta.year, m.meta.type === 'tv' ? 'Series' : 'Film'].filter(Boolean).join(' · ')} · Tap to open</Text>
          </View>
        </Pressable>
      );
    }
    if (m.msg_type === 'party') {
      const pid = m.meta?.party_id;
      return (
        <View style={{ width: 230 }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Poster uri={m.meta?.poster} width={44} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.semibold, fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase', color: ink, opacity: 0.55 }}>🍿 Watch party{m.meta?.when_label ? ` · ${m.meta.when_label}` : ''}</Text>
              <Text style={{ fontFamily: F.bold, fontSize: 13.5, color: ink, marginTop: 2 }} numberOfLines={2}>{m.meta?.title || m.text}</Text>
            </View>
          </View>
          {pid ? (
            <Pressable onPress={() => router.push({ pathname: '/party/[id]', params: { id: pid } })} style={{ marginTop: 10, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: mine ? '#07070F' : '#fff' }}>
              <Text style={{ fontFamily: F.bold, fontSize: 13, color: mine ? '#fff' : '#07070F' }}>{mine ? 'Open room' : 'Join'}</Text>
            </Pressable>
          ) : null}
        </View>
      );
    }
    if (m.msg_type === 'status_reply') {
      return (
        <View>
          <Text style={{ fontFamily: F.semibold, fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase', color: ink, opacity: 0.55, marginBottom: 4 }}>{m.meta?.reaction ? 'Reacted to a status' : 'Replied to a status'}</Text>
          <Text style={[styles.msgText, { color: ink }]}>{m.text}</Text>
        </View>
      );
    }
    return <Text style={[styles.msgText, { color: ink }]}>{m.text}</Text>;
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Ambient />
      <View style={[styles.head, { paddingTop: insets.top + 8 }]}>
        <GlassButton icon="chevron-left" label="Back" onPress={() => router.back()} />
        <Pressable onPress={() => router.push({ pathname: '/person/[id]', params: { id: peerId } })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Avatar uri={peer.avatar_url} name={peer.display_name} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={styles.peerName} numberOfLines={1}>{peer.display_name || peer.username || ' '}</Text>
            {peer.username ? <Text style={styles.peerHandle} numberOfLines={1}>@{peer.username}</Text> : null}
          </View>
        </Pressable>
        {!blocked ? <GlassButton icon="phone" label="Voice call" onPress={() => calls.start({ user_id: peerId, display_name: peer.display_name, username: peer.username, avatar_url: peer.avatar_url }, 'audio')} /> : null}
        {!blocked ? <GlassButton icon="video" label="Video call" onPress={() => calls.start({ user_id: peerId, display_name: peer.display_name, username: peer.username, avatar_url: peer.avatar_url }, 'video')} /> : null}
        <GlassButton icon="more-horizontal" label="Report or block" onPress={() => setSafety(true)} />
      </View>

      {msgs === null ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><TsLoader size={40} /></View> : (
        <FlatList
          ref={listRef}
          inverted
          data={data}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 12 }}
          ListFooterComponent={data.length === 0 ? <Text style={styles.empty}>Say hi to {peer.display_name || 'them'} 👋</Text> : null}
          renderItem={({ item: m, index }) => {
            const older = data[index + 1];
            const showDay = !older || new Date(older.created_at).toDateString() !== new Date(m.created_at).toDateString();
            const mine = m.from_me;
            const media = ['sticker', 'gif', 'image', 'photo', 'video', 'file'].includes(m.msg_type) && m.media_url;
            return (
              <View>
                {showDay ? <Text style={styles.day}>{dayLabel(m.created_at)}</Text> : null}
                <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginVertical: 3 }}>
                  <View style={[styles.bubble, media ? styles.mediaBubble : mine ? styles.mine : styles.theirs, m.pending && { opacity: 0.6 }]}>
                    {renderBody(m)}
                  </View>
                  <Text style={styles.meta}>{timeOf(m.created_at)}{mine && !m.pending ? (m.read ? ' · Seen' : ' · Sent') : ''}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {blocked ? (
        <View style={[styles.blockedBar, { paddingBottom: insets.bottom + 14 }]}>
          <Text style={styles.blockedText}>{blocked === 'by_me' ? 'You blocked this account. Unblock them to message.' : 'You can’t message this account.'}</Text>
        </View>
      ) : (
        <View style={[styles.composer, { paddingBottom: insets.bottom + 10 }]}>
          {err ? <Text style={styles.err}>{err}</Text> : null}
          {tray === 'menu' && !rec.recording ? <AttachTray onPick={pick} /> : null}
          {tray === 'gif' && !rec.recording ? <GifPicker onSend={sendGif} onClose={() => setTray(null)} /> : null}
          {rec.recording ? <RecorderBar rec={rec} maxSecs={120} /> : (
            <View style={styles.inputRow}>
              <Pressable onPress={() => setTray((t) => (t ? null : 'menu'))} disabled={sending} accessibilityLabel={tray ? 'Close attachments' : 'Add photo, video, file or GIF'} style={[styles.send, styles.mic, tray && { backgroundColor: '#fff' }]}>
                <Feather name={tray ? 'x' : 'plus'} size={20} color={tray ? '#07070F' : '#fff'} />
              </Pressable>
              <TextInput value={text} onFocus={() => tray === 'menu' && setTray(null)} onChangeText={setText} placeholder="Message…" placeholderTextColor="rgba(255,255,255,0.35)" multiline maxLength={2000} style={styles.input} />
              {text.trim() ? (
                <Pressable onPress={send} disabled={sending} accessibilityLabel="Send" style={styles.send}>
                  <Feather name="arrow-up" size={18} color="#07070F" />
                </Pressable>
              ) : (
                <Pressable onPress={rec.start} disabled={sending} accessibilityLabel="Record a voice note" style={[styles.send, styles.mic]}>
                  <Feather name="mic" size={18} color="#fff" />
                </Pressable>
              )}
            </View>
          )}
        </View>
      )}

      {safety ? <SafetySheet user={{ user_id: peerId, username: peer.username, display_name: peer.display_name }} blocked={blocked === 'by_me'} onClose={() => setSafety(false)} onBlocked={(b) => setBlocked(b ? 'by_me' : null)} /> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.hairline },
  peerName: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  peerHandle: { fontFamily: F.body, fontSize: 11.5, color: T.text2 },
  day: { alignSelf: 'center', fontFamily: F.bold, fontSize: 10.5, letterSpacing: 1.6, textTransform: 'uppercase', color: T.text3, marginVertical: 14 },
  bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  mine: { backgroundColor: '#fff', borderBottomRightRadius: 6 },
  theirs: { backgroundColor: 'rgba(255,255,255,0.09)', borderBottomLeftRadius: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  mediaBubble: { padding: 0, backgroundColor: 'transparent' },
  msgText: { fontFamily: F.body, fontSize: 14.5, lineHeight: 20 },
  meta: { fontFamily: F.body, fontSize: 10.5, color: T.text3, marginTop: 3, marginHorizontal: 6 },
  empty: { alignSelf: 'center', fontFamily: F.semibold, fontSize: 13.5, color: T.text2, marginVertical: 40 },
  composer: { paddingHorizontal: 12, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hairline, backgroundColor: 'rgba(6,6,11,0.6)' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, maxHeight: 120, minHeight: 44, color: '#fff', fontFamily: F.body, fontSize: 15, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  mic: { backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  err: { fontFamily: F.body, fontSize: 12, color: '#ff8a8a', marginBottom: 6, marginLeft: 6 },
  blockedBar: { paddingHorizontal: 20, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hairline },
  blockedText: { fontFamily: F.body, fontSize: 13, color: T.text2, textAlign: 'center' },
});
