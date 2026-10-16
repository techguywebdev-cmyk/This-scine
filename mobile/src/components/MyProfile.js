import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import Svg, { Circle } from 'react-native-svg';
import { Feather, Ionicons } from '@expo/vector-icons';
import Ambient from './Ambient';
import { Poster, Tabs } from './Ui';
import { useApi } from '../lib/api';
import { useAccent } from '../lib/accent';
import ImportSheet from './ImportSheet';
import { useUserTheme } from '../lib/userTheme';
import { rowToMovie, useWatchlist } from '../lib/store';
import { openTitle } from '../lib/titles';
import { API_URL } from '../lib/config';
import RemindSheet, { fmtRemind, reminderOn } from './RemindSheet';
import { F, T, label } from '../lib/theme';

// CineScore — same formula and levels as the website
const LEVELS = [{ name: 'Newcomer', min: 0, max: 100 }, { name: 'Casual viewer', min: 100, max: 300 }, { name: 'Cinephile', min: 300, max: 600 }, { name: 'Connoisseur', min: 600, max: 999 }];
const score = (w, r, s) => Math.min(999, w * 3 + r * 8 + s * 2);
const level = (sc) => { const i = sc >= 999 ? LEVELS.length - 1 : Math.max(0, LEVELS.findIndex((l) => sc < l.max)); const l = LEVELS[i]; return { ...l, idx: i, next: LEVELS[i + 1] || null, progress: Math.min(1, (sc - l.min) / (l.max - l.min)), toNext: Math.max(0, l.max - sc) }; };

function Ring({ value, accent }) {
  const r = 40, c = 2 * Math.PI * r, lv = level(value), dash = Math.max(lv.progress > 0 ? 0.035 : 0, lv.progress) * c;
  return (
    <View style={{ width: 100, height: 100, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={100} height={100} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={50} cy={50} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={5} />
        <Circle cx={50} cy={50} r={r} fill="none" stroke={accent} strokeWidth={5} strokeDasharray={`${dash} ${c}`} strokeLinecap="round" />
      </Svg>
      <Text style={{ fontFamily: F.displayHeavy, fontSize: 26, color: '#fff', lineHeight: 28 }}>{value}</Text>
      <Text style={{ fontFamily: F.bold, fontSize: 8.5, letterSpacing: 1.6, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>LEVEL {lv.idx + 1}</Text>
    </View>
  );
}

export default function MyProfile({ settingsFooter }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user } = useUser();
  const api = useApi();
  const wl = useWatchlist();
  const accent = useAccent();
  const [tab, setTab] = useState('profile');
  const [importing, setImporting] = useState(false);
  const userTheme = useUserTheme();
  const [s, setS] = useState(null); // settings
  const [reviews, setReviews] = useState(null);
  const [editing, setEditing] = useState(false);
  const [nick, setNick] = useState('');
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState('');
  const [remindRow, setRemindRow] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2400); };

  useFocusEffect(useCallback(() => {
    api.get('/api/settings').then((d) => { setS(d); setNick(d.nickname || ''); setBio(d.bio || ''); }).catch(() => setS({}));
    api.get(`/api/reviews?userId=${encodeURIComponent(user.id)}`).then((d) => setReviews(d.comments || [])).catch(() => setReviews([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]));

  const items = wl.items;
  const watched = items.filter((m) => m.watched);
  const toWatch = items.filter((m) => !m.watched);
  const nRev = (reviews || []).length;
  const sc = score(watched.length, nRev, items.length);
  const lv = level(sc);
  const rated = (reviews || []).filter((r) => r.rating > 0);
  const avg = rated.length ? (rated.reduce((a, r) => a + r.rating, 0) / rated.length).toFixed(1) : '--';
  const gCount = {}; items.forEach((m) => (m.genre || []).forEach((g) => { gCount[g] = (gCount[g] || 0) + 1; }));
  const topG = Object.entries(gCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const name = s?.nickname || user?.fullName || user?.firstName || user?.username || 'You';

  const pickImage = async (aspect) => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect, quality: 0.8, base64: aspect[0] === 1 });
    return r.canceled ? null : r.assets?.[0];
  };
  const changeCover = async () => {
    const a = await pickImage([16, 9]); if (!a) return;
    setBusy('cover');
    try {
      const form = new FormData(); form.append('file', { uri: a.uri, name: 'cover.jpg', type: a.mimeType || 'image/jpeg' });
      const d = await api.request('/api/upload-cover', { method: 'POST', body: form });
      if (d.cover_url) { setS((x) => ({ ...x, cover_url: d.cover_url })); flash('Cover photo updated'); }
    } catch (e) { flash(e.message || 'Upload failed — try a smaller image'); }
    setBusy('');
  };
  const changeAvatar = async () => {
    const a = await pickImage([1, 1]); if (!a?.base64) return;
    setBusy('avatar');
    try { await user.setProfileImage({ file: `data:${a.mimeType || 'image/jpeg'};base64,${a.base64}` }); await user.reload(); flash('Photo updated'); }
    catch (e) { flash('Couldn’t update your photo'); }
    setBusy('');
  };
  const saveAbout = async () => {
    setBusy('about');
    try { const d = await api.patch('/api/settings', { nickname: nick, bio }); setS((x) => ({ ...x, nickname: typeof d.nickname === 'string' ? d.nickname : nick.trim(), bio })); setEditing(false); flash('Profile updated'); }
    catch (e) { flash(e.message || 'Couldn’t save'); }
    setBusy('');
  };
  const togglePublic = async (v) => { setS((x) => ({ ...x, watchlist_public: v })); try { await api.patch('/api/settings', { watchlist_public: v }); } catch { setS((x) => ({ ...x, watchlist_public: !v })); } };

  const Row = ({ m, i }) => (
    <View style={[styles.wRow, i > 0 && styles.border]}>
      <Text style={[styles.rank, i < 3 && { color: accent }]}>{i + 1}</Text>
      <Pressable onPress={() => openTitle(rowToMovie(m))}><Poster uri={m.poster} width={52} dim={m.watched} /></Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Pressable onPress={() => openTitle(rowToMovie(m))}><Text style={[styles.wTitle, m.watched && { color: T.text3, textDecorationLine: 'line-through' }]} numberOfLines={2}>{m.title}</Text></Pressable>
        <Text style={styles.wMeta}>{m.year}{m.rating && m.rating !== 'N/A' ? <>  <Text style={{ color: accent }}>★ {m.rating}</Text></> : null}{m.is_tv ? '  ·  TV' : ''}</Text>
        {m.genre?.length ? <View style={styles.chips}>{m.genre.slice(0, 3).map((g) => <Text key={g} style={styles.gChip}>{g}</Text>)}</View> : null}
        <View style={styles.acts}>
          <Pressable onPress={() => wl.toggleWatched(rowToMovie(m))} style={[styles.act, m.watched && { borderColor: `${accent}66`, backgroundColor: `${accent}1a` }]}><Feather name="check" size={10} color={m.watched ? accent : T.text2} /><Text style={[styles.actText, m.watched && { color: accent }]}>{m.watched ? 'Watched' : 'Mark watched'}</Text></Pressable>
          {!m.watched ? <Pressable onPress={() => setRemindRow(m)} style={[styles.act, reminderOn(m) && { borderColor: `${accent}66`, backgroundColor: `${accent}1a` }]}><Feather name="bell" size={10} color={reminderOn(m) ? accent : T.text2} /><Text style={[styles.actText, reminderOn(m) && { color: accent }]}>{reminderOn(m) ? fmtRemind(m.remind_at) : 'Remind'}</Text></Pressable> : null}
          <Pressable onPress={() => wl.toggleSave(rowToMovie(m))} style={[styles.act, { paddingHorizontal: 8 }]} accessibilityLabel="Remove"><Feather name="trash-2" size={11} color={T.text3} /></Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Ambient />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <Text style={styles.h1}>My Profile</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => router.push({ pathname: '/person/[id]', params: { id: user.id } })} style={styles.round} accessibilityLabel="See your public profile"><Feather name="eye" size={18} color="#fff" /></Pressable>
            <Pressable onPress={() => { setTab('profile'); setEditing(true); }} style={styles.round} accessibilityLabel="Edit profile"><Feather name="edit" size={17} color="#fff" /></Pressable>
          </View>
        </View>
        <View style={{ paddingHorizontal: 20 }}>
          <Tabs tabs={[['profile', 'Profile'], ['watchlist', 'Watchlist'], ['watched', 'Watched'], ['reviews', 'Reviews']]} value={tab} onChange={setTab} style={{ marginTop: 14 }} />
        </View>

        {tab === 'profile' ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
            {/* Cover + avatar */}
            <View style={[styles.cover, { height: (width - 40) / 2.5 }]}>
              {s?.cover_url ? <Image source={{ uri: s.cover_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: `${accent}22` }]} />}
              <Pressable onPress={changeCover} style={styles.coverBtn}>{busy === 'cover' ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="plus" size={14} color="#fff" />}<Text style={styles.coverText}>{s?.cover_url ? 'Change cover' : 'Add cover'}</Text></Pressable>
            </View>
            <View style={styles.idRow}>
              <View>
                <View style={[styles.avatar, { borderColor: T.bg }]}>
                  {user?.imageUrl ? <Image source={{ uri: user.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text style={styles.initial}>{name[0]?.toUpperCase()}</Text>}
                </View>
                <Pressable onPress={changeAvatar} style={styles.avatarEdit} accessibilityLabel="Change photo">{busy === 'avatar' ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="edit-2" size={13} color="#fff" />}</Pressable>
              </View>
              <View style={{ flex: 1, minWidth: 0, paddingTop: 30 }}>
                <Text style={styles.name} numberOfLines={1}>{name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 }}><View style={[styles.dot, { backgroundColor: accent }]} /><Text style={styles.email} numberOfLines={1}>{user?.primaryEmailAddress?.emailAddress}</Text></View>
              </View>
            </View>

            {/* About */}
            <View style={styles.sectionHead}>
              <Text style={label(accent)}>About you</Text>
              {!editing ? <Pressable onPress={() => setEditing(true)} style={styles.roundSm} accessibilityLabel="Edit about"><Feather name="edit" size={15} color="#fff" /></Pressable> : null}
            </View>
            {editing ? (
              <View style={{ gap: 10 }}>
                <TextInput value={nick} onChangeText={setNick} placeholder="Display name" placeholderTextColor="rgba(255,255,255,0.35)" maxLength={40} style={styles.input} />
                <TextInput value={bio} onChangeText={setBio} placeholder="A line about your taste" placeholderTextColor="rgba(255,255,255,0.35)" maxLength={160} multiline style={[styles.input, { minHeight: 70, textAlignVertical: 'top', paddingTop: 12 }]} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable onPress={() => { setEditing(false); setNick(s?.nickname || ''); setBio(s?.bio || ''); }} style={[styles.btn, styles.ghost]}><Text style={styles.ghostText}>Cancel</Text></Pressable>
                  <Pressable onPress={saveAbout} disabled={busy === 'about'} style={[styles.btn, { backgroundColor: '#fff', flex: 1 }]}><Text style={styles.btnText}>{busy === 'about' ? 'Saving…' : 'Save'}</Text></Pressable>
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.aboutName}>{name}</Text>
                <Text style={styles.bio}>{s?.bio || 'Add a line about your taste in films.'}</Text>
              </View>
            )}

            <View style={styles.rule} />
            <Pressable onPress={() => setImporting(true)} style={styles.importRow}>
              <View style={styles.roundLg}><Feather name="download" size={20} color="#fff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.importTitle}>Import from Letterboxd or IMDb</Text>
                <Text style={styles.importSub}>Bring everything you’ve watched in one go</Text>
              </View>
              <Feather name="chevron-right" size={18} color={T.text3} />
            </Pressable>
            <View style={styles.rule} />
            <Pressable onPress={() => router.push('/appearance')} style={styles.importRow}>
              {userTheme.mode === 'fixed'
                ? <View style={[styles.roundLg, { backgroundColor: `${userTheme.color}33`, borderColor: `${userTheme.color}aa` }]}><View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: userTheme.color }} /></View>
                : <View style={styles.roundLg}><View style={{ flexDirection: 'row' }}>{['#818CF8', '#2DD4BF', '#FF6B8A'].map((c, i) => <View key={c} style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c, marginLeft: i ? -4 : 0, borderWidth: 1.5, borderColor: '#06060B' }} />)}</View></View>}
              <View style={{ flex: 1 }}>
                <Text style={styles.importTitle}>Your colour</Text>
                <Text style={styles.importSub}>{userTheme.mode === 'fixed' ? 'One colour everywhere — tap to change' : 'Follows each film — tap to pick your own'}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={T.text3} />
            </Pressable>
            <View style={styles.rule} />
            <Pressable onPress={() => router.push('/feed-settings')} style={styles.importRow}>
              <View style={styles.roundLg}><Feather name="sliders" size={19} color="#fff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.importTitle}>Your feed</Text>
                <Text style={styles.importSub}>Country, streaming services, trailers and what to show</Text>
              </View>
              <Feather name="chevron-right" size={18} color={T.text3} />
            </Pressable>
            <View style={styles.rule} />

            {/* CineScore */}
            <View style={styles.scoreRow}>
              <Ring value={sc} accent={accent} />
              <View style={{ flex: 1 }}>
                <Text style={label(accent)}>CineScore</Text>
                <Text style={styles.lvName}>{lv.name}</Text>
                <Text style={styles.lvSub}>{lv.next ? <><Text style={{ color: '#fff', fontFamily: F.bold }}>{lv.toNext}</Text> points to {lv.next.name}</> : 'Top level reached'}</Text>
                <Text style={styles.lvHint}>Watch +3 · Review +8 · Save +2</Text>
              </View>
            </View>

            <View style={styles.stats}>
              {[[items.length, 'Titles'], [watched.length, 'Watched'], [nRev, 'Reviews']].map(([v, l], i) => (
                <View key={l} style={[styles.stat, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: T.hairlineStrong }]}><Text style={styles.statNum}>{v}</Text><Text style={styles.statLabel}>{l.toUpperCase()}</Text></View>
              ))}
            </View>
            <View style={[styles.stats, { marginTop: 24 }]}>
              <View style={styles.stat2}><View style={styles.stat2Head}><Feather name="star" size={12} color={T.text3} /><Text style={styles.statLabel}>AVG RATING</Text></View><Text style={styles.statNum}>{avg}</Text></View>
              <View style={[styles.stat2, { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: T.hairlineStrong }]}><View style={styles.stat2Head}><Ionicons name="diamond-outline" size={12} color={T.text3} /><Text style={styles.statLabel}>GENRES EXPLORED</Text></View><Text style={styles.statNum}>{Object.keys(gCount).length}</Text></View>
            </View>

            {topG.length ? (
              <View style={{ marginTop: 26 }}>
                <Text style={[label(T.text3), { marginBottom: 6 }]}>Top genres</Text>
                {topG.map(([g, n]) => (
                  <View key={g} style={{ paddingVertical: 9 }}>
                    <Text style={styles.gName}>{g}</Text>
                    <View style={styles.bar}><View style={[styles.barFill, { width: `${(n / topG[0][1]) * 100}%`, backgroundColor: accent }]} /></View>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={[label(accent), { marginTop: 30 }]}>Privacy</Text>
            <View style={styles.setRow}>
              <View style={{ flex: 1 }}><Text style={styles.setTitle}>Public watchlist</Text><Text style={styles.setSub}>{s?.watchlist_public === false ? 'Only you can see your watchlist' : 'Anyone can see your watchlist'}</Text></View>
              <Switch value={s?.watchlist_public !== false} onValueChange={togglePublic} disabled={!s} trackColor={{ true: accent, false: 'rgba(255,255,255,0.16)' }} thumbColor="#fff" />
            </View>
            {settingsFooter}
          </View>
        ) : tab === 'watchlist' || tab === 'watched' ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
            {(tab === 'watched' ? watched : toWatch).length === 0
              ? <Text style={styles.empty}>{tab === 'watched' ? 'Tap Seen on any film in the feed to log it here and grow your CineScore.' : 'Save films from your feed and they land here.'}</Text>
              : (tab === 'watched' ? watched : toWatch).map((m, i) => <Row key={m.movie_id} m={m} i={i} />)}
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
            {reviews === null ? null : reviews.length === 0 ? <Text style={styles.empty}>Your reviews show up here. Tap Review on any film to write one.</Text> : reviews.map((r, i) => (
              <View key={r.id} style={[{ paddingVertical: 14 }, i > 0 && styles.border]}>
                <Text style={styles.wTitle}>{r.movie_title}</Text>
                {r.rating > 0 ? <Text style={{ color: '#FFD166', marginTop: 4 }}>{'★'.repeat(r.rating)}<Text style={{ color: T.hairlineStrong }}>{'★'.repeat(5 - r.rating)}</Text></Text> : null}
                <Text style={styles.bio}>{r.text}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      {toast ? <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}
      {remindRow ? <RemindSheet row={wl.items.find((x) => x.movie_id === remindRow.movie_id) || remindRow} onClose={() => setRemindRow(null)} onChange={wl.setRemind} /> : null}
      <ImportSheet visible={importing} onClose={() => setImporting(false)} accent={accent} />
    </View>
  );
}

const glass = { backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' };
const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  h1: { fontFamily: F.displayHeavy, fontSize: 28, color: '#fff', letterSpacing: -0.6 },
  round: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', ...glass },
  roundSm: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', ...glass },
  roundLg: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', ...glass },
  cover: { borderRadius: 16, overflow: 'hidden', backgroundColor: T.surface },
  coverBtn: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  coverText: { fontFamily: F.bold, fontSize: 12, color: '#fff' },
  idRow: { flexDirection: 'row', gap: 14, marginTop: -36, paddingLeft: 6 },
  avatar: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, overflow: 'hidden', backgroundColor: '#14141B', alignItems: 'center', justifyContent: 'center' },
  avatarEdit: { position: 'absolute', right: -4, bottom: 2, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.75)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  initial: { fontFamily: F.bold, fontSize: 30, color: '#fff' },
  name: { fontFamily: F.displayHeavy, fontSize: 24, color: '#fff', letterSpacing: -0.4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  email: { fontFamily: F.body, fontSize: 12.5, color: T.text2, flexShrink: 1 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 12 },
  aboutName: { fontFamily: F.displayHeavy, fontSize: 19, color: '#fff' },
  bio: { fontFamily: F.body, fontSize: 14, lineHeight: 21, color: T.text2, marginTop: 6 },
  input: { color: '#fff', fontFamily: F.body, fontSize: 15, minHeight: 46, paddingHorizontal: 14, borderRadius: 12, ...glass },
  btn: { height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  btnText: { fontFamily: F.bold, fontSize: 14, color: '#07070F' },
  ghost: { ...glass },
  ghostText: { fontFamily: F.bold, fontSize: 14, color: '#fff' },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: T.hairlineStrong, marginVertical: 20 },
  importRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  importTitle: { fontFamily: F.bold, fontSize: 14.5, color: '#fff' },
  importSub: { fontFamily: F.body, fontSize: 12.5, color: T.text2, marginTop: 2 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 6 },
  lvName: { fontFamily: F.displayHeavy, fontSize: 22, color: '#fff', marginTop: 4 },
  lvSub: { fontFamily: F.body, fontSize: 12.5, color: T.text2, marginTop: 3 },
  lvHint: { fontFamily: F.body, fontSize: 11, color: T.text3, marginTop: 4 },
  stats: { flexDirection: 'row', marginTop: 22, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: T.hairlineStrong },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  stat2: { flex: 1, paddingVertical: 16, paddingHorizontal: 14 },
  stat2Head: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  statNum: { fontFamily: F.displayHeavy, fontSize: 22, color: '#fff' },
  statLabel: { fontFamily: F.bold, fontSize: 9.5, letterSpacing: 2, color: T.text3, marginTop: 4 },
  gName: { fontFamily: F.semibold, fontSize: 14, color: '#fff', marginBottom: 8 },
  bar: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)' },
  barFill: { height: 3, borderRadius: 2 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hairline, marginTop: 10 },
  setTitle: { fontFamily: F.bold, fontSize: 15, color: '#fff' },
  setSub: { fontFamily: F.body, fontSize: 12.5, color: T.text2, marginTop: 2 },
  wRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 13 },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hairline },
  rank: { width: 18, textAlign: 'center', fontFamily: F.displayHeavy, fontSize: 11.5, color: T.text3, marginTop: 4 },
  wTitle: { fontFamily: F.displayHeavy, fontSize: 14.5, color: '#fff', lineHeight: 18 },
  wMeta: { fontFamily: F.body, fontSize: 11.5, color: T.text3, marginTop: 3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  gChip: { fontFamily: F.body, fontSize: 9.5, color: T.text3, borderWidth: 1, borderColor: T.hairline, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  acts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  act: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: T.hairlineStrong, borderRadius: 14, paddingHorizontal: 9, height: 26 },
  actText: { fontFamily: F.semibold, fontSize: 10.5, color: T.text2 },
  empty: { fontFamily: F.body, fontSize: 13, color: T.text2, textAlign: 'center', paddingVertical: 40, lineHeight: 19 },
  toast: { position: 'absolute', alignSelf: 'center', bottom: 110, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, backgroundColor: 'rgba(14,14,22,0.95)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  toastText: { fontFamily: F.semibold, fontSize: 13, color: '#fff' },
});
