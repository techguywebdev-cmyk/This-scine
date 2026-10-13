import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ActionSheet from './ActionSheet';
import { useApi } from '../lib/api';
import { F, T } from '../lib/theme';

const REASONS = [
  ['spam', 'Spam or scam'],
  ['harassment', 'Harassment or bullying'],
  ['inappropriate', 'Nudity, violence or hateful content'],
  ['impersonation', 'Pretending to be someone else'],
  ['underage', 'May be under 13'],
  ['other', 'Something else'],
];

// Report / block a user (same API as the web SafetySheet)
export default function SafetySheet({ user, blocked, onClose, onBlocked }) {
  const api = useApi();
  const [view, setView] = useState('menu'); // menu | report | block | done
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [doneText, setDoneText] = useState('');
  const name = (user?.display_name || user?.username || 'this person').trim();

  const post = async (body) => {
    setBusy(true); setErr('');
    try { return await api.post('/api/safety', body); } catch (e) { setErr(e.message || 'Something went wrong'); return null; } finally { setBusy(false); }
  };
  const doBlock = async (unblock) => {
    const d = await post({ action: unblock ? 'unblock' : 'block', userId: user.user_id });
    if (!d) return;
    onBlocked?.(!unblock);
    setDoneText(unblock ? `${name} is unblocked` : `${name} is blocked. They can’t message you, see your profile or invite you to watch.`);
    setView('done');
  };
  const sendReport = async () => {
    if (!reason) { setErr('Pick a reason'); return; }
    const d = await post({ action: 'report', userId: user.user_id, kind: 'user', reason, note: note.trim() || undefined, alsoBlock });
    if (!d) return;
    if (alsoBlock) onBlocked?.(true);
    setDoneText(`Thanks — we’ll review it.${alsoBlock ? ` ${name} is also blocked.` : ''}`);
    setView('done');
  };

  return (
    <ActionSheet visible onClose={onClose} title={view === 'done' ? null : view === 'report' ? `Report ${name}` : view === 'block' ? `Block ${name}?` : name} sub={view === 'menu' && user?.username ? `@${user.username}` : null}>
      {view === 'menu' && (
        <>
          <Pressable onPress={() => setView('report')} style={styles.row}><Feather name="flag" size={18} color="#ff8a8a" /><Text style={[styles.rowText, { color: '#ff8a8a' }]}>Report</Text></Pressable>
          {blocked
            ? <Pressable disabled={busy} onPress={() => doBlock(true)} style={styles.row}><Feather name="user-check" size={18} color="#fff" /><Text style={styles.rowText}>Unblock</Text></Pressable>
            : <Pressable onPress={() => setView('block')} style={styles.row}><Feather name="slash" size={18} color="#ff8a8a" /><Text style={[styles.rowText, { color: '#ff8a8a' }]}>Block</Text></Pressable>}
        </>
      )}
      {view === 'block' && (
        <>
          <Text style={styles.body}>They won’t be able to message you, see your profile, follow you or invite you to a watch party. They won’t be told.</Text>
          <Pressable disabled={busy} onPress={() => doBlock(false)} style={styles.danger}><Text style={styles.dangerText}>{busy ? 'Blocking…' : 'Block'}</Text></Pressable>
        </>
      )}
      {view === 'report' && (
        <>
          {REASONS.map(([k, t]) => (
            <Pressable key={k} onPress={() => setReason(k)} style={styles.row}>
              <View style={[styles.radio, reason === k && { borderColor: '#fff' }]}>{reason === k ? <View style={styles.radioDot} /> : null}</View>
              <Text style={styles.rowText}>{t}</Text>
            </Pressable>
          ))}
          <TextInput value={note} onChangeText={setNote} placeholder="Anything else we should know? (optional)" placeholderTextColor="rgba(255,255,255,0.35)" multiline maxLength={1000} style={styles.input} />
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <Text style={[styles.rowText, { flex: 1 }]}>Also block {name}</Text>
            <Switch value={alsoBlock} onValueChange={setAlsoBlock} trackColor={{ true: '#ff8a8a', false: 'rgba(255,255,255,0.16)' }} thumbColor="#fff" />
          </View>
          <Pressable disabled={busy} onPress={sendReport} style={styles.danger}><Text style={styles.dangerText}>{busy ? 'Sending…' : 'Send report'}</Text></Pressable>
        </>
      )}
      {view === 'done' && (
        <View style={{ alignItems: 'center', paddingVertical: 26, gap: 12 }}>
          <View style={styles.doneIcon}><Feather name="check" size={24} color="#fff" /></View>
          <Text style={styles.doneText}>{doneText}</Text>
          <Pressable onPress={onClose} style={styles.ghost}><Text style={styles.ghostText}>Done</Text></Pressable>
        </View>
      )}
      {err ? <Text style={{ fontFamily: F.body, fontSize: 12.5, color: '#ff8a8a', marginTop: 10 }}>{err}</Text> : null}
    </ActionSheet>
  );
}

const glass = { backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' };
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.hairline },
  rowText: { fontFamily: F.semibold, fontSize: 14.5, color: '#fff' },
  body: { fontFamily: F.body, fontSize: 13.5, lineHeight: 20, color: T.text2, marginTop: 14 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  input: { color: '#fff', fontFamily: F.body, fontSize: 14, minHeight: 64, marginTop: 12, padding: 12, borderRadius: 12, ...glass, textAlignVertical: 'top' },
  danger: { marginTop: 16, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', ...glass },
  dangerText: { fontFamily: F.bold, fontSize: 14, color: '#ff8a8a' },
  ghost: { marginTop: 6, height: 42, paddingHorizontal: 26, borderRadius: 21, alignItems: 'center', justifyContent: 'center', ...glass },
  ghostText: { fontFamily: F.bold, fontSize: 13.5, color: '#fff' },
  doneIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...glass },
  doneText: { fontFamily: F.semibold, fontSize: 14.5, color: '#fff', textAlign: 'center', lineHeight: 21, paddingHorizontal: 10 },
});
