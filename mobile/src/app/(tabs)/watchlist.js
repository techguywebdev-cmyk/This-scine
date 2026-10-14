import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Ambient from '../../components/Ambient';
import PosterWall from '../../components/PosterWall';
import Folder from '../../components/Folder';
import ActionSheet from '../../components/ActionSheet';
import FolderPicker from '../../components/FolderPicker';
import RemindSheet, { fmtRemind, reminderOn } from '../../components/RemindSheet';
import { Empty, GlassButton, Poster, SectionLabel, Spinner, Tabs } from '../../components/Ui';
import { useApi } from '../../lib/api';
import { rowToMovie, useWatchlist } from '../../lib/store';
import { openTitle } from '../../lib/titles';
import { F, T } from '../../lib/theme';
import { useAccent } from '../../lib/accent';

export default function Watchlist() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isSignedIn } = useAuth();
  const api = useApi();
  const wl = useWatchlist();
  const accent = useAccent();
  const [tab, setTab] = useState('mine');
  const [lists, setLists] = useState(null);
  const [filter, setFilter] = useState('towatch');
  const [menu, setMenu] = useState(null);
  const [filing, setFiling] = useState(null);
  const [remindRow, setRemindRow] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLists = useCallback(async (t = tab) => {
    if (!isSignedIn && t !== 'trending') { setLists([]); return; }
    try { const d = await api.get(`/api/lists?tab=${t}`); setLists(d.lists || []); } catch { setLists([]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, tab]);

  useEffect(() => { setLists(null); fetchLists(tab); }, [tab, fetchLists]);
  useFocusEffect(useCallback(() => { fetchLists(tab); }, [fetchLists, tab]));

  const toWatch = wl.items.filter((m) => !m.watched);
  const upNext = toWatch.filter(reminderOn).sort((a, b) => Date.parse(a.remind_at) - Date.parse(b.remind_at));
  const watched = wl.items.filter((m) => m.watched);
  const shown = (filter === 'towatch' ? toWatch : watched).slice().sort((a, b) => (b.saved_at || 0) - (a.saved_at || 0));
  const wall = useMemo(() => wl.items.map((m) => m.poster).filter(Boolean).sort(() => Math.random() - 0.5).slice(0, 5), [wl.items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const col3 = (width - 40 - 24) / 3;
  const refresh = async () => { setRefreshing(true); await Promise.all([wl.refresh(), fetchLists(tab)]); setRefreshing(false); };

  return (
    <View style={{ flex: 1 }}>
      <Ambient />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#fff" />}>
        <PosterWall posters={wall} />
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20 }}>
          <View style={styles.topRow}>
            <View style={{ flex: 1 }} />
            {isSignedIn && tab === 'mine' ? <GlassButton icon="folder-plus" label="New folder" onPress={() => setFiling({ newOnly: true })} /> : null}
          </View>
          <Text style={styles.h1}>Watchlist</Text>
          <Text style={styles.counts}><Text style={styles.b}>{toWatch.length}</Text> to watch  ·  <Text style={styles.b}>{watched.length}</Text> watched</Text>
          <Tabs style={{ marginTop: 16 }} tabs={[['mine', 'Mine'], ['following', 'Following'], ['trending', 'Popular']]} value={tab} onChange={setTab} />

          {!isSignedIn && tab !== 'trending' ? (
            <View style={{ paddingTop: 24 }}>
              <Empty title="Your watchlist lives here" sub="Sign in to save films and sort them into folders." />
              <Pressable onPress={() => router.push('/sign-in')} style={styles.cta}><Text style={styles.ctaText}>Sign in</Text></Pressable>
            </View>
          ) : tab === 'mine' ? (
            <>
              {upNext.length ? (
                <>
                  <SectionLabel>{`Up next · ${upNext.length} reminder${upNext.length > 1 ? 's' : ''}`}</SectionLabel>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }} style={{ marginHorizontal: -20 }} contentInset={{ left: 20 }}>
                    <View style={{ width: 10 }} />
                    {upNext.map((m) => (
                      <Pressable key={m.movie_id} onPress={() => setRemindRow(m)} style={{ width: 112 }} accessibilityLabel={`${m.title}, reminder ${fmtRemind(m.remind_at)}`}>
                        <View style={[styles.upCard, { borderColor: `${m.accent || accent}66` }]}>
                          <Poster uri={m.poster} width={112} />
                          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.upFade}>
                            <Feather name="bell" size={10} color={m.accent || accent} />
                            <Text style={styles.upWhen} numberOfLines={1}>{fmtRemind(m.remind_at)}</Text>
                          </LinearGradient>
                          {m.remind_with ? <View style={styles.upWith}><Text style={styles.upWithText}>+1</Text></View> : null}
                        </View>
                        <Text style={styles.itemTitle} numberOfLines={1}>{m.title}</Text>
                        {m.remind_note ? <Text style={styles.upNote} numberOfLines={1}>“{m.remind_note}”</Text> : null}
                      </Pressable>
                    ))}
                    <View style={{ width: 10 }} />
                  </ScrollView>
                </>
              ) : null}
              <SectionLabel>Folders</SectionLabel>
              {lists === null ? <Spinner /> : (
                <View style={styles.grid}>
                  {lists.map((l) => (
                    <Pressable key={l.id} style={{ width: col3 }} onPress={() => router.push({ pathname: '/folder/[id]', params: { id: l.id } })}>
                      <Folder poster={l.cover_url || (l.posters || [])[0]} accent={accent} count={l.movie_count || 0} locked={l.is_public === false} />
                      <Text style={styles.folderName} numberOfLines={1}>{l.title}</Text>
                    </Pressable>
                  ))}
                  <Pressable style={{ width: col3 }} onPress={() => setFiling({ newOnly: true })} accessibilityLabel="New folder">
                    <View style={[styles.newFolder, { borderColor: `${accent}88` }]}><Feather name="plus" size={22} color={accent} /></View>
                    <Text style={[styles.folderName, { color: accent }]}>New folder</Text>
                  </Pressable>
                </View>
              )}

              <SectionLabel right={
                <View style={{ flexDirection: 'row', gap: 14 }}>
                  {[['towatch', 'To watch'], ['watched', 'Watched']].map(([id, t]) => (
                    <Pressable key={id} onPress={() => setFilter(id)}><Text style={[styles.toggle, filter === id && { color: '#fff' }]}>{t}</Text></Pressable>
                  ))}
                </View>
              }>Saved</SectionLabel>
              {shown.length === 0 ? <Empty title={filter === 'towatch' ? 'Nothing saved yet' : 'Nothing watched yet'} sub={filter === 'towatch' ? 'Tap Save on any film in your feed and it lands here.' : 'Films you mark as watched show up here.'} /> : (
                <View style={[styles.grid, { rowGap: 16, columnGap: 10 }]}>
                  {shown.map((m) => (
                    <View key={m.movie_id} style={{ width: (width - 40 - 20) / 3 }}>
                      <Pressable onPress={() => openTitle(rowToMovie(m))}><Poster uri={m.poster} width="100%" dim={m.watched} /></Pressable>
                      <Pressable onPress={() => setMenu(m)} hitSlop={8} style={styles.more}><Feather name="more-horizontal" size={14} color="#fff" /></Pressable>
                      {reminderOn(m) ? (
                        <Pressable onPress={() => setRemindRow(m)} hitSlop={6} style={styles.bell} accessibilityLabel={`Reminder ${fmtRemind(m.remind_at)}`}>
                          <Feather name="bell" size={10} color="#07070F" />
                          <Text style={styles.bellText} numberOfLines={1}>{fmtRemind(m.remind_at).split(' · ')[0]}</Text>
                        </Pressable>
                      ) : null}
                      <Text style={[styles.itemTitle, m.watched && { color: 'rgba(255,255,255,0.55)' }]} numberOfLines={1}>{m.title}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : lists === null ? <Spinner /> : lists.length === 0 ? (
            <Empty title={tab === 'following' ? 'No folders followed yet' : 'No public folders yet'} sub={tab === 'following' ? 'Follow a public folder and it shows up here.' : 'Make one of yours public to be the first.'} />
          ) : (
            <View style={[styles.grid, { paddingTop: 20 }]}>
              {lists.map((l) => (
                <Pressable key={l.id} style={{ width: col3 }} onPress={() => router.push({ pathname: '/folder/[id]', params: { id: l.id } })}>
                  <Folder poster={l.cover_url || (l.posters || [])[0] || l.cover_poster} accent={accent} count={l.movie_count || 0} />
                  <Text style={styles.folderName} numberOfLines={1}>{l.title}</Text>
                  <Text style={styles.owner} numberOfLines={1}>{l.display_name || l.username}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <ActionSheet visible={!!menu} onClose={() => setMenu(null)} poster={menu?.poster} title={menu?.title} sub={[menu?.year, menu?.is_tv ? 'Series' : null].filter(Boolean).join(' · ')}
        actions={menu ? [
          ['play', 'Watch trailer', () => openTitle(rowToMovie(menu))],
          ...(!menu.watched ? [['bell', reminderOn(menu) ? `Reminder · ${fmtRemind(menu.remind_at)}` : 'Remind me to watch', () => setRemindRow(menu)]] : []),
          ['folder', 'Add to folder', () => setFiling(rowToMovie(menu))],
          ['check', menu.watched ? 'Mark as not watched' : 'Mark as watched', () => wl.toggleWatched(rowToMovie(menu))],
          ['trash-2', 'Remove from watchlist', () => wl.toggleSave(rowToMovie(menu))],
        ] : []} />
      {filing && !filing.newOnly ? <FolderPicker movie={filing} onClose={() => { setFiling(null); fetchLists('mine'); }} /> : null}
      {remindRow ? <RemindSheet row={wl.items.find((x) => x.movie_id === remindRow.movie_id) || remindRow} onClose={() => setRemindRow(null)} onChange={wl.setRemind} /> : null}
      {filing?.newOnly ? <NewFolder onClose={() => { setFiling(null); fetchLists('mine'); }} /> : null}
    </View>
  );
}

function NewFolder({ onClose }) {
  const api = useApi();
  const [name, setName] = useState('');
  const create = async () => { if (!name.trim()) return; try { await api.post('/api/lists', { title: name.trim(), is_public: false }); } catch {} onClose(); };
  return (
    <ActionSheet visible onClose={onClose} title="New folder" sub="Private until you share it">
      <TextInput autoFocus value={name} onChangeText={setName} placeholder="e.g. Date night" placeholderTextColor="rgba(255,255,255,0.35)" onSubmitEditing={create} style={styles.newInput} />
      <Pressable onPress={create} style={[styles.cta, { marginTop: 16 }]}><Text style={styles.ctaText}>Create folder</Text></Pressable>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  upCard: { width: 112, borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
  upFade: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 18, paddingBottom: 7, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', gap: 4 },
  upWhen: { flex: 1, color: '#fff', fontFamily: F.bold, fontSize: 10.5 },
  upWith: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  upWithText: { color: '#fff', fontFamily: F.bold, fontSize: 9.5 },
  upNote: { color: T.text3, fontFamily: F.body, fontSize: 10.5, marginTop: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', height: 40 },
  h1: { fontFamily: F.displayHeavy, fontSize: 28, color: '#fff', marginTop: 78, letterSpacing: -0.5 },
  counts: { fontFamily: F.body, fontSize: 12.5, color: T.text2, marginTop: 2 },
  b: { fontFamily: F.bold, color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 18 },
  newFolder: { width: '100%', aspectRatio: 5 / 6, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  folderName: { fontFamily: F.semibold, fontSize: 12, color: '#fff', marginTop: 7 },
  owner: { fontFamily: F.body, fontSize: 10.5, color: T.text3, marginTop: 2 },
  toggle: { fontFamily: F.bold, fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  itemTitle: { fontFamily: F.semibold, fontSize: 11.5, color: '#fff', marginTop: 6 },
  bell: { position: 'absolute', left: 5, bottom: 26, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 6, height: 18, maxWidth: '85%' },
  bellText: { fontFamily: F.bold, fontSize: 9.5, color: '#07070F' },
  more: { position: 'absolute', top: 5, right: 5, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  cta: { alignSelf: 'flex-start', backgroundColor: T.accent, borderRadius: 21, paddingHorizontal: 20, height: 42, justifyContent: 'center' },
  ctaText: { fontFamily: F.bold, fontSize: 13, color: '#07070F' },
  newInput: { color: '#fff', fontFamily: F.body, fontSize: 15, borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.14)', paddingVertical: 10, marginTop: 12 },
});
