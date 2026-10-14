import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useClerk, useUser } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import Ambient from '../../components/Ambient';
import ActionSheet from '../../components/ActionSheet';
import MyProfile from '../../components/MyProfile';
import { TsLoader } from '../../components/Brand';
import { Empty, SectionLabel } from '../../components/Ui';
import { useApi } from '../../lib/api';
import { usePushRegistration } from '../../lib/push';
import { API_URL } from '../../lib/config';
import { F, T } from '../../lib/theme';

const open = (path) => WebBrowser.openBrowserAsync(`${API_URL}${path}`, { toolbarColor: T.bg, controlsColor: '#ffffff' }).catch(() => {});

export default function Me() {
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const api = useApi();
  const push = usePushRegistration();
  const [nudge, setNudge] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;
    api.get('/api/settings').then((d) => setNudge(!!d.notify_prefs?.nudge)).catch(() => setNudge(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  if (!isSignedIn) {
    return (
      <View style={{ flex: 1, padding: 20, paddingTop: insets.top + 40 }}>
        <Ambient />
        <Text style={styles.h1}>Your Thiscene</Text>
        <Empty title="Sign in to save films, build folders and follow friends" sub="Same account as the website." />
        <Pressable onPress={() => router.push('/sign-in')} style={styles.cta}><Text style={styles.ctaText}>Sign in or create account</Text></Pressable>
        <View style={{ flexDirection: 'row', gap: 18, marginTop: 30 }}>
          <Pressable onPress={() => open('/privacy')}><Text style={styles.link}>Privacy</Text></Pressable>
          <Pressable onPress={() => open('/terms')}><Text style={styles.link}>Terms</Text></Pressable>
        </View>
      </View>
    );
  }

  const toggleNudge = (v) => {
    setNudge(v);
    let tz = 'UTC'; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch {}
    api.patch('/api/settings', { notify_prefs: { nudge: v, tz } }).catch(() => setNudge(!v));
  };

  const Row = ({ icon, text, sub, onPress, right, danger }) => (
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
      <Feather name={icon} size={17} color={danger ? '#ff8a8a' : '#fff'} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowText, danger && { color: '#ff8a8a' }]}>{text}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {right !== undefined ? right : onPress ? <Feather name="chevron-right" size={16} color={T.text3} /> : null}
    </Pressable>
  );

  const footer = (
    <View style={{ marginTop: 10 }}>
      <SectionLabel style={{ marginTop: 30 }}>Settings</SectionLabel>
      <Row icon="bell" text={push.enabled ? 'Notifications are on' : 'Turn on notifications'} sub={push.enabled ? null : 'Messages, watch invites and your reminders'} onPress={push.enabled ? null : push.enable} right={push.enabled ? null : undefined} />
      <Row icon="clock" text="Nudge me about older saves" sub="Once a week at most, around 7pm" right={<Switch value={!!nudge} disabled={nudge === null} onValueChange={toggleNudge} trackColor={{ true: '#fff', false: 'rgba(255,255,255,0.16)' }} thumbColor={nudge ? T.bg : '#fff'} />} />
      <Row icon="slash" text="Blocked accounts" onPress={() => router.push('/blocked')} />
      <Row icon="shield" text="Privacy policy" onPress={() => open('/privacy')} />
      <Row icon="file-text" text="Terms of use" onPress={() => open('/terms')} />
      <Row icon="log-out" text="Sign out" onPress={() => signOut()} right={null} />
      <Row icon="trash-2" text="Delete account" danger onPress={() => setDeleting(true)} />
      <Text style={styles.version}>Thiscene {Constants.expoConfig?.version || ''} · build {Constants.expoConfig?.android?.versionCode || '—'}</Text>
      {deleting ? <DeleteSheet onClose={() => setDeleting(false)} onDeleted={() => signOut().catch(() => {})} /> : null}
    </View>
  );

  return <MyProfile settingsFooter={footer} />;
}

function DeleteSheet({ onClose, onDeleted }) {
  const api = useApi();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ok = text.trim().toUpperCase() === 'DELETE';
  const go = async () => {
    if (!ok || busy) return;
    setBusy(true); setErr('');
    try { await api.del('/api/account', { confirm: 'DELETE' }); onDeleted(); } catch (e) { setErr(e.message || 'Could not delete your account'); setBusy(false); }
  };
  return (
    <ActionSheet visible onClose={() => !busy && onClose()} title="Delete your account?" sub="This can’t be undone">
      {busy ? (
        <View style={{ alignItems: 'center', paddingVertical: 30, gap: 14 }}>
          <TsLoader size={40} />
          <Text style={styles.rowSub}>Deleting everything…</Text>
        </View>
      ) : (
        <>
          <Text style={styles.body}>We’ll erase your profile, watchlist and folders, reviews, messages and voice notes, statuses, follows, watch parties and uploads, then close your sign-in.</Text>
          <Text style={[styles.rowSub, { marginTop: 16 }]}>Type DELETE to confirm</Text>
          <TextInput value={text} onChangeText={setText} autoCapitalize="characters" autoCorrect={false} placeholder="DELETE" placeholderTextColor="rgba(255,255,255,0.25)" style={styles.input} />
          {err ? <Text style={[styles.rowSub, { color: '#ff8a8a', marginTop: 8 }]}>{err}</Text> : null}
          <Pressable disabled={!ok} onPress={go} style={[styles.danger, { opacity: ok ? 1 : 0.45 }]}><Text style={styles.dangerText}>Delete my account</Text></Pressable>
        </>
      )}
    </ActionSheet>
  );
}

const glass = { backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' };
const styles = StyleSheet.create({
  h1: { fontFamily: F.displayHeavy, fontSize: 28, color: '#fff', letterSpacing: -0.5 },
  cta: { alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 21, paddingHorizontal: 20, height: 42, justifyContent: 'center', marginTop: 4 },
  ctaText: { fontFamily: F.bold, fontSize: 13, color: '#07070F' },
  version: { fontFamily: F.body, fontSize: 11.5, color: T.text3, textAlign: 'center', marginTop: 22 },
  link: { fontFamily: F.semibold, fontSize: 13, color: T.text2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.hairline, minHeight: 52 },
  rowText: { fontFamily: F.semibold, fontSize: 14.5, color: '#fff' },
  rowSub: { fontFamily: F.body, fontSize: 12, color: T.text2, marginTop: 2 },
  body: { fontFamily: F.body, fontSize: 13.5, lineHeight: 20, color: T.text2, marginTop: 14 },
  input: { color: '#fff', fontFamily: F.bold, fontSize: 16, letterSpacing: 2, height: 48, marginTop: 8, paddingHorizontal: 14, borderRadius: 12, ...glass },
  danger: { marginTop: 16, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', ...glass },
  dangerText: { fontFamily: F.bold, fontSize: 14, color: '#ff8a8a' },
});
