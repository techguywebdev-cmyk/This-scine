import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Ambient from './Ambient';
import { Avatar, Poster } from './Ui';
import { useAccent } from '../lib/accent';
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

export function dayChoices(n = 14) {
  return Array.from({ length: n }, (_, i) => {
    const d = at(i, 0);
    return { i, d, label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString([], { weekday: 'short' }), sub: d.toLocaleDateString([], { day: 'numeric', month: 'short' }) };
  });
}
const TIMES = [[12, 0], [15, 0], [18, 0], [19, 0], [19, 30], [20, 0], [20, 30], [21, 0], [22, 0]];
const withTime = (d, h, m) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x; };
const releaseLabel = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short' });
const first = (u) => (u?.display_name || u?.username || '').split(' ')[0];

// "Remind me to watch" — row = watchlist row or a feed movie (with movie_id). Works on unsaved titles too (saves them).
export default function RemindSheet({ row, onClose, onChange }) {
  const api = useApi();
  const insets = useSafeAreaInsets();
  const live = useAccent();
  const accent = live || row?.accent || T.accent; // match whatever gradient is behind the sheet
  const opts = useMemo(picks, []);
  const days = useMemo(() => dayChoices(14), []);
  const [busy, setBusy] = useState(null); // key of the option being saved
  const [done, setDone] = useState(null);
  const [err, setErr] = useState('');
  const [nudge, setNudge] = useState(null);
  const [people, setPeople] = useState(null);
  const [withId, setWithId] = useState(row?.remind_with || null);
  const [note, setNote] = useState(row?.remind_note || '');
  const [custom, setCustom] = useState(false);
  const [dayI, setDayI] = useState(1);
  const [tm, setTm] = useState([20, 0]);
  const upcoming = row?.releaseDate && row.releaseDate > new Date().toISOString().slice(0, 10) ? row.releaseDate : null;

  useEffect(() => {
    api.get('/api/settings').then((d) => setNudge(!!d.notify_prefs?.nudge)).catch(() => setNudge(false));
    api.get('/api/follows?type=following').then((d) => setPeople(d.users || [])).catch(() => setPeople([]));
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const finish = (text) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setDone(text);
    setTimeout(onClose, 1400);
  };

  const save = async (when, key) => {
    if (busy) return;
    Haptics.selectionAsync().catch(() => {});
    setBusy(key); setErr('');
    try {
      const iso = when ? when.toISOString() : null;
      const f = when ? fmtRemind(iso).replace(' · ', ' at ') : '';
      const mv = { title: row?.title, year: row?.year, rating: row?.rating, poster: row?.poster, backdrop: row?.backdrop, genre: row?.genre, overview: row?.overview, accent: row?.accent, isTV: row?.isTV ?? row?.is_tv };
      await api.patch('/api/watchlist', { movieId: row.movie_id, remindAt: iso, ...(when ? { remindWith: withId, note: note.trim() || null, whenLabel: f } : {}), movie: mv });
      onChange?.(row.movie_id, iso, { remind_with: when ? withId : null, remind_note: when ? note.trim() || null : null });
      const friend = withId && people ? people.find((u) => u.user_id === withId) : null;
      finish(when ? `We'll remind you${friend ? ` and ${first(friend)}` : ''} ${/^(Tonight|Today|Tomorrow)/.test(f) ? f[0].toLowerCase() + f.slice(1) : `on ${f}`}` : 'Reminder removed');
    } catch (e) { setErr(e.message || 'Could not set the reminder'); }
    setBusy(null);
  };

  const remindRelease = async () => {
    if (busy) return;
    setBusy('release'); setErr('');
    try {
      await api.post('/api/reminders', { movieId: row.movie_id, mediaType: row?.isTV || row?.is_tv ? 'tv' : 'movie', title: row?.title, poster: row?.poster, releaseDate: upcoming });
      finish(`We'll tell you when it's out · ${releaseLabel(upcoming)}`);
    } catch (e) { setErr(e.message || 'Could not set that'); }
    setBusy(null);
  };

  const toggleNudge = (v) => {
    setNudge(v);
    let tz = 'UTC'; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch {}
    api.patch('/api/settings', { notify_prefs: { nudge: v, tz } }).catch(() => setNudge(!v));
  };

  const current = reminderOn(row) ? row.remind_at : null;
  const customWhen = withTime(days[dayI].d, tm[0], tm[1]);
  const customPast = customWhen.getTime() < Date.now() + 5 * 60000;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
        <Ambient accent={accent} style={{ borderTopLeftRadius: 22, borderTopRightRadius: 22 }} />
        <View style={styles.grab} />
        {done ? (
          <View style={{ alignItems: 'center', paddingVertical: 34, gap: 14 }}>
            <View style={styles.doneIcon}><Feather name="bell" size={24} color={accent} /></View>
            <Text style={styles.doneText}>{done}</Text>
            {row?.title ? <Text style={styles.small}>{row.title}</Text> : null}
          </View>
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ maxHeight: 640 }}>
            <View style={styles.head}>
              <Poster uri={row?.poster} width={46} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.eyebrow, { color: accent }]}>REMIND ME TO WATCH</Text>
                <Text style={styles.title} numberOfLines={2}>{row?.title}</Text>
                {current ? <Text style={styles.small}>Currently set for {fmtRemind(current)}</Text> : null}
              </View>
            </View>

            {people && people.length ? (
              <View style={{ paddingBottom: 14 }}>
                <Text style={styles.label}>WATCH IT WITH</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                  {[{ user_id: null }, ...people].map((u) => {
                    const on = withId === u.user_id;
                    return (
                      <Pressable key={u.user_id || 'me'} onPress={() => { Haptics.selectionAsync().catch(() => {}); setWithId(u.user_id); }} style={{ width: 58, alignItems: 'center', gap: 6 }}>
                        <View style={{ borderRadius: 28, borderWidth: 2, borderColor: on ? accent : 'transparent', padding: 2 }}>
                          {u.user_id ? <Avatar uri={u.avatar_url} name={u.display_name || u.username} size={44} /> : <View style={styles.meDot}><Feather name="user" size={18} color="#fff" /></View>}
                        </View>
                        <Text style={[styles.person, on && { color: '#fff', fontFamily: F.bold }]} numberOfLines={1}>{u.user_id ? first(u) : 'Just me'}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                {withId ? <Text style={[styles.small, { marginTop: 8 }]}>They’ll get a heads-up now, and you’ll both be reminded.</Text> : null}
              </View>
            ) : null}

            <View style={styles.noteRow}>
              <Feather name="edit-3" size={15} color={T.text3} />
              <TextInput value={note} onChangeText={(v) => setNote(v.slice(0, 80))} placeholder="Add a note — “order pizza”, “bring tissues”…" placeholderTextColor="rgba(255,255,255,0.35)" style={styles.noteInput} returnKeyType="done" />
            </View>

            {opts.map((p) => (
              <Pressable key={p.k} disabled={!!busy} onPress={() => save(p.when, p.k)} android_ripple={{ color: 'rgba(255,255,255,0.08)' }} style={({ pressed }) => [styles.row, pressed && { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                <Text style={styles.rowText}>{p.label}</Text>
                {busy === p.k ? <ActivityIndicator size="small" color={accent} /> : <Text style={styles.rowMeta}>{p.k === 'weekend' || p.k === 'week' ? `${p.when.toLocaleDateString([], { weekday: 'short' })} · ${timeOf(p.when)}` : timeOf(p.when)}</Text>}
              </Pressable>
            ))}

            <Pressable onPress={() => setCustom((c) => !c)} style={styles.row}>
              <Text style={styles.rowText}>Pick a day & time</Text>
              <Feather name={custom ? 'chevron-down' : 'chevron-right'} size={16} color={T.text2} />
            </Pressable>
            {custom ? (
              <View style={{ paddingVertical: 12 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {days.map((d) => {
                    const on = d.i === dayI;
                    return (
                      <Pressable key={d.i} onPress={() => setDayI(d.i)} style={[styles.chip, { minWidth: 62, alignItems: 'center' }, on && styles.chipOn]}>
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{d.label}</Text>
                        <Text style={[styles.chipSub, on && { color: '#06060B' }]}>{d.sub}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8 }}>
                  {TIMES.map(([h, m]) => {
                    const t = withTime(days[dayI].d, h, m);
                    const gone = t.getTime() < Date.now() + 5 * 60000;
                    const on = tm[0] === h && tm[1] === m;
                    return (
                      <Pressable key={`${h}:${m}`} disabled={gone} onPress={() => setTm([h, m])} style={[styles.chip, on && styles.chipOn, gone && { opacity: 0.3 }]}>
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{timeOf(t)}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <Pressable disabled={!!busy || customPast} onPress={() => save(customWhen, 'custom')} style={[styles.cta, customPast && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  {busy === 'custom' ? <ActivityIndicator color="#06060B" /> : <Text style={styles.ctaText}>{customPast ? 'Pick a later time' : `Remind me ${fmtRemind(customWhen.toISOString()).replace(' · ', ' at ')}`}</Text>}
                </Pressable>
              </View>
            ) : null}

            {upcoming ? (
              <Pressable disabled={!!busy} onPress={remindRelease} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowText}>When it comes out</Text>
                  <Text style={styles.small}>We’ll ping you on release day</Text>
                </View>
                {busy === 'release' ? <ActivityIndicator size="small" color={accent} /> : <Text style={styles.rowMeta}>{releaseLabel(upcoming)}</Text>}
              </Pressable>
            ) : null}

            <View style={[styles.row, { alignItems: 'flex-start' }]}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.rowText}>Nudge me about older saves</Text>
                <Text style={styles.small}>Once a week at most, around 7pm, for something you saved a while ago.</Text>
              </View>
              <Switch value={!!nudge} disabled={nudge === null} onValueChange={toggleNudge} trackColor={{ true: accent, false: 'rgba(255,255,255,0.16)' }} thumbColor="#fff" />
            </View>
            {err ? <Text style={[styles.small, { color: '#ff8a8a', marginTop: 10 }]}>{err}</Text> : null}
            {current ? (
              <Pressable disabled={!!busy} onPress={() => save(null, 'remove')} style={styles.remove}><Text style={styles.removeText}>Remove reminder</Text></Pressable>
            ) : null}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 10, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden', backgroundColor: T.bg },
  grab: { width: 34, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'center', marginBottom: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 16 },
  eyebrow: { fontFamily: F.bold, fontSize: 10.5, letterSpacing: 2.2 },
  title: { fontFamily: F.displayHeavy, fontSize: 20, color: '#fff', letterSpacing: -0.4, marginTop: 4, lineHeight: 24 },
  label: { fontFamily: F.bold, fontSize: 9.5, letterSpacing: 2, color: 'rgba(255,255,255,0.5)', marginBottom: 10 },
  person: { fontFamily: F.semibold, fontSize: 11, color: 'rgba(255,255,255,0.55)', maxWidth: 58 },
  meDot: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hairline },
  noteInput: { flex: 1, color: '#fff', fontFamily: F.body, fontSize: 14, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hairline },
  rowText: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  rowMeta: { fontFamily: F.body, fontSize: 13, color: T.text2 },
  small: { fontFamily: F.body, fontSize: 12, color: T.text2, marginTop: 3, lineHeight: 17 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  chipOn: { backgroundColor: '#fff', borderColor: '#fff' },
  chipText: { fontFamily: F.bold, fontSize: 13, color: '#fff' },
  chipTextOn: { color: '#06060B' },
  chipSub: { fontFamily: F.body, fontSize: 10.5, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  cta: { marginTop: 12, height: 46, borderRadius: 23, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: F.bold, fontSize: 14, color: '#06060B' },
  remove: { marginTop: 16, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  removeText: { fontFamily: F.bold, fontSize: 14, color: '#ff8a8a' },
  doneIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  doneText: { fontFamily: F.displayHeavy, fontSize: 19, color: '#fff', textAlign: 'center', letterSpacing: -0.3, paddingHorizontal: 10 },
});
