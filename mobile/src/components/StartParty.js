import { useThemed } from '../lib/userTheme';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import ActionSheet from './ActionSheet';
import { Avatar, Empty, Spinner } from './Ui';
import { useApi } from '../lib/api';
import { F, T } from '../lib/theme';

const at = (addDays, h) => { const d = new Date(); d.setDate(d.getDate() + addDays); d.setHours(h, 0, 0, 0); return d; };
function whenOptions() {
  const now = new Date(), out = [{ k: 'now', label: 'Now', when: null }];
  const tonight = at(0, 20);
  if (tonight - now > 30 * 60000) out.push({ k: 'tonight', label: 'Tonight 8pm', when: tonight, whenLabel: 'tonight 8pm' });
  out.push({ k: 'tomorrow', label: 'Tomorrow 8pm', when: at(1, 20), whenLabel: 'tomorrow 8pm' });
  const dow = now.getDay(); const toSat = dow === 6 ? 7 : 6 - dow;
  if (toSat > 1) out.push({ k: 'sat', label: 'Saturday 7pm', when: at(toSat, 19), whenLabel: 'Saturday 7pm' });
  return out;
}

// Pick a friend (+ now or later) and start a watch party for `movie`
export default function StartParty({ movie, onClose, preselect }) {
  const api = useApi();
  const [people, setPeople] = useState(null);
  const [pick, setPick] = useState(preselect || null);
  const [when, setWhen] = useState('now');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(null);
  const opts = whenOptions();
  const accent = useThemed(movie?.accent || T.accent);

  useEffect(() => { api.get('/api/follows?type=following').then((d) => setPeople(d.users || [])).catch(() => setPeople([])); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const start = async () => {
    if (!pick || busy) return;
    setBusy(true); setErr('');
    const o = opts.find((x) => x.k === when);
    try {
      const d = await api.post('/api/party', {
        action: 'create', with: pick.user_id, scheduledFor: o?.when ? o.when.toISOString() : undefined, whenLabel: o?.whenLabel,
        movie: { id: movie.id, title: movie.title, poster: movie.poster, backdrop: movie.backdrop, year: movie.year, rating: movie.rating, is_tv: !!(movie.isTV || movie.is_tv), accent: movie.accent },
      });
      const id = d.party?.id;
      if (!id) throw new Error('Couldn’t start the party');
      if (o?.when) { setSent(`Invite sent — ${o.label.toLowerCase()} with ${pick.display_name || pick.username}`); setTimeout(onClose, 1500); }
      else { onClose(); router.push({ pathname: '/party/[id]', params: { id } }); }
    } catch (e) { setErr(e.message || 'Couldn’t start the party'); }
    setBusy(false);
  };

  return (
    <ActionSheet visible onClose={onClose} poster={movie?.poster} title={sent ? null : `Watch ${movie?.title} together`} sub={sent ? null : 'Each of you presses play on your own screen — we keep you in sync.'} accent={accent}>
      {sent ? (
        <View style={{ alignItems: 'center', paddingVertical: 28, gap: 12 }}>
          <Text style={{ fontSize: 34 }}>🍿</Text>
          <Text style={styles.sent}>{sent}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.label}>With</Text>
          {people === null ? <Spinner /> : people.length === 0 ? <Empty title="Follow a friend first" sub="Watch parties are with people you follow." /> : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingVertical: 4 }}>
              {people.map((u) => {
                const on = pick?.user_id === u.user_id;
                return (
                  <Pressable key={u.user_id} onPress={() => setPick(u)} style={{ alignItems: 'center', width: 64 }}>
                    <View style={{ borderRadius: 30, borderWidth: 2, borderColor: on ? '#fff' : 'transparent', padding: 2 }}><Avatar uri={u.avatar_url} name={u.display_name} size={50} /></View>
                    <Text style={[styles.person, on && { color: '#fff', fontFamily: F.bold }]} numberOfLines={1}>{(u.display_name || u.username || '').split(' ')[0]}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          <Text style={[styles.label, { marginTop: 16 }]}>When</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {opts.map((o) => (
              <Pressable key={o.k} onPress={() => setWhen(o.k)} style={[styles.chip, when === o.k && styles.chipOn]}>
                <Text style={[styles.chipText, when === o.k && { color: '#07070F' }]}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
          {err ? <Text style={styles.err}>{err}</Text> : null}
          <Pressable disabled={!pick || busy} onPress={start} style={[styles.go, { opacity: pick ? 1 : 0.4 }]}>
            <Feather name="play" size={15} color="#07070F" />
            <Text style={styles.goText}>{busy ? 'Starting…' : when === 'now' ? 'Start watch party' : 'Send invite'}</Text>
          </Pressable>
        </>
      )}
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 2.2, textTransform: 'uppercase', color: T.text3, marginTop: 14, marginBottom: 10 },
  person: { fontFamily: F.semibold, fontSize: 11.5, color: T.text2, marginTop: 6 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  chipOn: { backgroundColor: '#fff', borderColor: '#fff' },
  chipText: { fontFamily: F.bold, fontSize: 12.5, color: '#fff' },
  go: { marginTop: 20, height: 50, borderRadius: 25, backgroundColor: '#fff', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  goText: { fontFamily: F.bold, fontSize: 14.5, color: '#07070F' },
  err: { fontFamily: F.body, fontSize: 12.5, color: '#ff8a8a', marginTop: 12 },
  sent: { fontFamily: F.displayHeavy, fontSize: 18, color: '#fff', textAlign: 'center' },
});
