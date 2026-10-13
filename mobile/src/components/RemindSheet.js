import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ActionSheet from './ActionSheet';
import { useApi } from '../lib/api';
import { F, T } from '../lib/theme';

const timeOf = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const sameDay = (a, b) => a.toDateString() === b.toDateString();
const at = (addDays, h) => { const d = new Date(); d.setDate(d.getDate() + addDays); d.setHours(h, 0, 0, 0); return d; };

export function fmtRemind(iso) {
  if (!iso) return '';
  const d = new Date(iso), now = new Date(), tmr = new Date(); tmr.setDate(now.getDate() + 1);
  if (sameDay(d, now)) return `${d.getHours() >= 17 ? 'Tonight' : 'Today'} · ${timeOf(d)}`;
  if (sameDay(d, tmr)) return `Tomorrow · ${timeOf(d)}`;
  if (d - now < 6 * 86400000) return `${d.toLocaleDateString([], { weekday: 'short' })} · ${timeOf(d)}`;
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} · ${timeOf(d)}`;
}
export const reminderOn = (row) => !!(row?.remind_at && Date.parse(row.remind_at) > Date.now());

function picks() {
  const now = new Date(), out = [];
  const tonight = at(0, 20);
  out.push(tonight - now > 15 * 60000 ? { k: 'tonight', label: 'Tonight', when: tonight } : { k: 'hour', label: 'In an hour', when: new Date(now.getTime() + 3600000) });
  out.push({ k: 'tomorrow', label: 'Tomorrow night', when: at(1, 20) });
  const dow = now.getDay(); const toSat = dow === 6 ? 7 : 6 - dow;
  if (toSat > 1) out.push({ k: 'weekend', label: 'This weekend', when: at(toSat, 19) });
  out.push({ k: 'week', label: 'Next week', when: at(7, 20) });
  return out;
}

// "Remind me to watch" for a saved title (row = watchlist row)
export default function RemindSheet({ row, onClose, onChange }) {
  const api = useApi();
  const opts = useMemo(picks, []);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [err, setErr] = useState('');
  const [nudge, setNudge] = useState(null);
  const accent = row?.accent || T.accent;

  useEffect(() => { api.get('/api/settings').then((d) => setNudge(!!d.notify_prefs?.nudge)).catch(() => setNudge(false)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const save = async (when) => {
    if (busy) return;
    setBusy(true); setErr('');
    try {
      await api.patch('/api/watchlist', { movieId: row.movie_id, remindAt: when ? when.toISOString() : null });
      onChange?.(row.movie_id, when ? when.toISOString() : null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const f = when ? fmtRemind(when.toISOString()).replace(' · ', ' at ') : '';
      setDone(when ? `We'll remind you ${/^(Tonight|Today|Tomorrow)/.test(f) ? f[0].toLowerCase() + f.slice(1) : `on ${f}`}` : 'Reminder removed');
      setTimeout(onClose, 1300);
    } catch (e) { setErr(e.message || 'Could not set the reminder'); }
    setBusy(false);
  };

  const toggleNudge = (v) => {
    setNudge(v);
    let tz = 'UTC'; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch {}
    api.patch('/api/settings', { notify_prefs: { nudge: v, tz } }).catch(() => setNudge(!v));
  };

  const current = reminderOn(row) ? row.remind_at : null;

  return (
    <ActionSheet visible onClose={onClose} poster={row?.poster} title={done ? null : row?.title} sub={done ? null : current ? `Reminder set for ${fmtRemind(current)}` : 'Remind me to watch'} accent={accent}>
      {done ? (
        <View style={{ alignItems: 'center', paddingVertical: 28, gap: 14 }}>
          <View style={styles.doneIcon}><Feather name="bell" size={24} color={accent} /></View>
          <Text style={styles.doneText}>{done}</Text>
        </View>
      ) : (
        <>
          {opts.map((p) => (
            <Pressable key={p.k} disabled={busy} onPress={() => save(p.when)} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={styles.rowText}>{p.label}</Text>
              <Text style={styles.rowMeta}>{p.k === 'weekend' || p.k === 'week' ? `${p.when.toLocaleDateString([], { weekday: 'short' })} · ${timeOf(p.when)}` : timeOf(p.when)}</Text>
            </Pressable>
          ))}
          <View style={[styles.row, { alignItems: 'flex-start' }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.rowText}>Nudge me about older saves</Text>
              <Text style={styles.small}>Once a week at most, around 7pm, for something you saved a while ago.</Text>
            </View>
            <Switch value={!!nudge} disabled={nudge === null} onValueChange={toggleNudge} trackColor={{ true: accent, false: 'rgba(255,255,255,0.16)' }} thumbColor="#fff" />
          </View>
          {err ? <Text style={[styles.small, { color: '#ff8a8a', marginTop: 10 }]}>{err}</Text> : null}
          {current ? (
            <Pressable disabled={busy} onPress={() => save(null)} style={styles.remove}><Text style={styles.removeText}>Remove reminder</Text></Pressable>
          ) : null}
        </>
      )}
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.hairline },
  rowText: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  rowMeta: { fontFamily: F.body, fontSize: 13, color: T.text2 },
  small: { fontFamily: F.body, fontSize: 12, color: T.text2, marginTop: 3, lineHeight: 17 },
  remove: { marginTop: 16, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  removeText: { fontFamily: F.bold, fontSize: 14, color: '#ff8a8a' },
  doneIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  doneText: { fontFamily: F.displayHeavy, fontSize: 19, color: '#fff', textAlign: 'center', letterSpacing: -0.3 },
});
