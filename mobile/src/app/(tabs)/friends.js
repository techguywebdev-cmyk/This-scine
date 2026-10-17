import { useCallback, useEffect, useMemo, useState } from 'react';
import SignedOutHero, { SignInPills } from '../../components/SignedOut';
import { useFocusEffect } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/expo';
import Ambient from '../../components/Ambient';
import PosterWall from '../../components/PosterWall';
import StatusRow from '../../components/StatusRow';
import UpcomingParties from '../../components/UpcomingParties';
import { Feather } from '@expo/vector-icons';
import { useBottomTabBarHeight } from 'expo-router/build/react-navigation/bottom-tabs';
import { Avatar, Empty, GlassButton, Poster, SectionLabel, Spinner, Tabs } from '../../components/Ui';
import { useApi } from '../../lib/api';
import { useWatchlist } from '../../lib/store';
import { openTitle } from '../../lib/titles';
import { F, T } from '../../lib/theme';
import { setUnreadNotifs, useUnreadNotifs } from '../../lib/notifs';
import { useAccent } from '../../lib/accent';

const SECTION = { saved: ['Saves', 'saved'], watched: ['Watched', 'watched'], reviewed: ['Reviews', 'reviewed'], list_follow: ['Folders', 'followed'] };
const timeAgo = (ts) => { const m = Math.floor((Date.now() - new Date(ts)) / 60000); if (m < 1) return 'now'; if (m < 60) return `${m}m`; const h = Math.floor(m / 60); if (h < 24) return `${h}h`; return `${Math.floor(h / 24)}d`; };
const toMovie = (it) => ({ id: it.movie_id, title: it.movie_title, poster: it.movie_poster, year: it.movie_year, rating: it.movie_rating, accent: it.movie_accent, mediaType: 'movie' });

export default function Friends() {
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const api = useApi();
  const wl = useWatchlist();
  const [tab, setTab] = useState('feed');
  const [feed, setFeed] = useState(null);
  const [friends, setFriends] = useState([]);
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [suggested, setSuggested] = useState([]);
  const [wall, setWall] = useState([]);
  const [open, setOpen] = useState({});
  const [personFilter, setPersonFilter] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState(0);
  const [leaders, setLeaders] = useState([]);
  const [q, setQ] = useState('');
  const [found, setFound] = useState(null);
  const [followQ, setFollowQ] = useState('');
  const [followingIds, setFollowingIds] = useState(new Set());
  useEffect(() => { setFollowingIds(new Set(friends.map((f) => f.user_id))); }, [friends]);
  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { setFound(null); return undefined; }
    let alive = true;
    const k = setTimeout(() => api.get(`/api/follows?type=search&q=${encodeURIComponent(t)}`).then((d) => alive && setFound(d.users || [])).catch(() => alive && setFound([])), 250);
    return () => { alive = false; clearTimeout(k); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  const tabBar = useBottomTabBarHeight();
  const notifs = useUnreadNotifs();
  const accent = useAccent();
  useFocusEffect(useCallback(() => {
    if (!isSignedIn) return;
    api.get('/api/messages').then((d) => setUnread((d.conversations || []).filter((c) => c.unread).length)).catch(() => {});
    api.get('/api/notifications').then((d) => setUnreadNotifs((d.items || []).filter((n) => !n.read).length)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]));

  const load = useCallback(async () => {
    api.get('/api/movies?popular=1').then((d) => setWall((d.movies || []).map((m) => m.poster).filter(Boolean).sort(() => Math.random() - 0.5).slice(0, 5))).catch(() => {});
    if (!isSignedIn) { setFeed([]); return; }
    await Promise.all([
      api.get('/api/activity?type=feed').then((d) => setFeed(d.items || [])).catch(() => setFeed([])),
      api.get('/api/follows?type=following').then((d) => setFriends(d.users || [])).catch(() => {}),
      api.get('/api/follows?type=stats').then((d) => setStats(d)).catch(() => {}),
      api.get('/api/follows?type=suggested').then((d) => setSuggested(d.users || [])).catch(() => {}),
      api.get('/api/leaderboard?type=watchlist').then((d) => setLeaders(d.leaders || [])).catch(() => {}),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);
  useEffect(() => { load(); }, [load]);

  const sections = useMemo(() => {
    const list = (feed || []).filter((i) => !personFilter || i.user_id === personFilter);
    const map = {};
    list.forEach((i) => {
      if (!SECTION[i.type]) return;
      map[i.type] = map[i.type] || new Map();
      const p = map[i.type].get(i.user_id) || { user_id: i.user_id, user: { username: i.username, display_name: i.display_name, avatar_url: i.avatar_url }, items: [] };
      if (!p.items.some((x) => x.movie_id === i.movie_id) || i.type === 'reviewed') p.items.push(i);
      map[i.type].set(i.user_id, p);
    });
    return Object.keys(SECTION).filter((t) => map[t]).map((t) => ({ type: t, people: [...map[t].values()] }));
  }, [feed, personFilter]);

  const isFollowing = (u) => followingIds.has(u.user_id) || !!u.isFollowing;
  const follow = async (u) => {
    const next = !isFollowing(u);
    const mark = (x) => (x.user_id === u.user_id ? { ...x, isFollowing: next } : x);
    setSuggested((p) => p.map(mark)); setFound((p) => (p ? p.map(mark) : p));
    setFollowingIds((s0) => { const s1 = new Set(s0); next ? s1.add(u.user_id) : s1.delete(u.user_id); return s1; });
    try { next ? await api.post('/api/follows', { targetId: u.user_id }) : await api.del('/api/follows', { targetId: u.user_id }); } catch {}
  };
  const FollowBtn = ({ u }) => {
    const on = isFollowing(u);
    return <Pressable onPress={() => follow(u)} style={[styles.followBtn, on && styles.followingBtn]}><Text style={styles.followText}>{on ? 'Following' : u.followsYou ? 'Follow back' : 'Follow'}</Text></Pressable>;
  };
  const MsgBtn = ({ u }) => <Pressable onPress={() => router.push({ pathname: '/chat/[id]', params: { id: u.user_id, name: u.display_name || u.username, avatar: u.avatar_url || '' } })} hitSlop={6} style={styles.msgBtn} accessibilityLabel={`Message ${u.display_name || u.username}`}><Feather name="message-circle" size={16} color="#fff" /></Pressable>;
  // "Buzzing in your circle": titles two or more friends touched this week
  const buzzing = useMemo(() => {
    const cut = Date.now() - 7 * 86400000;
    const map = new Map();
    (feed || []).forEach((i) => {
      if (!['saved', 'watched', 'reviewed'].includes(i.type) || !i.movie_id || new Date(i.created_at).getTime() < cut) return;
      const cur = map.get(i.movie_id) || { item: i, people: new Map() };
      if (!cur.people.has(i.user_id)) cur.people.set(i.user_id, i);
      map.set(i.movie_id, cur);
    });
    return [...map.values()].filter((x) => x.people.size >= 2).sort((a, b) => b.people.size - a.people.size).slice(0, 10);
  }, [feed]);

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (!isSignedIn) return <SignedOutHero title={'Your people,\ntheir picks.'} sub="Follow friends, see what they save and review, and message them about a film — same account as the website." />;

  return (
    <View style={{ flex: 1 }}>
      <Ambient />
      {isSignedIn ? (
        <Pressable onPress={() => router.push('/notifications')} accessibilityLabel={notifs ? `Notifications, ${notifs} new` : 'Notifications'} style={[styles.bell, { top: insets.top + 12 }]}>
          <Feather name="bell" size={20} color="#fff" />
          {notifs ? <View style={[styles.bellBadge, { backgroundColor: accent }]}><Text style={styles.bellBadgeText}>{notifs > 9 ? '9+' : notifs}</Text></View> : null}
        </Pressable>
      ) : null}
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#fff" colors={['#fff']} progressBackgroundColor="#1A1A22" />}>
        <PosterWall posters={wall} />
        <View style={{ paddingTop: insets.top + 48, paddingHorizontal: 20 }}>
          <Text style={styles.h1}>Friends</Text>
          <Text style={styles.counts}><Text onPress={() => isSignedIn && router.push({ pathname: '/follows', params: { type: 'followers' } })} suppressHighlighting><Text style={styles.b}>{stats.followers || 0}</Text> followers</Text>  ·  <Text onPress={() => isSignedIn && router.push({ pathname: '/follows', params: { type: 'following' } })} suppressHighlighting><Text style={styles.b}>{stats.following || 0}</Text> following</Text></Text>
          <Tabs style={{ marginTop: 16 }} tabs={[['feed', 'Feed'], ['following', 'Following'], ['find', 'Find people']]} value={tab} onChange={setTab} />

          {!isSignedIn ? (
            <View style={{ paddingTop: 20 }}>
              <Empty icon="users" title="See what your friends are watching" sub="Sign in to follow people, see their saves and reviews, and message them about a film." />
              <SignInPills style={{ marginTop: 18 }} />
            </View>
          ) : tab === 'feed' ? (
            feed === null ? <Spinner /> : (
              <>
                <UpcomingParties />
                <StatusRow onFind={() => setTab('find')} />
                <View style={styles.rule} />
                {buzzing.length ? (
                  <View style={{ paddingTop: 18 }}>
                    <SectionLabel style={{ marginTop: 0 }} right={<Text style={styles.secMeta}>This week</Text>}>Buzzing in your circle</SectionLabel>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
                      {buzzing.map(({ item, people }) => (
                        <Pressable key={item.movie_id} onPress={() => openTitle(toMovie(item))} style={{ width: 104 }}>
                          <Poster uri={item.movie_poster} width={104} />
                          <View style={styles.faces}>
                            {[...people.values()].slice(0, 3).map((p, k) => <View key={p.user_id} style={{ marginLeft: k ? -8 : 0 }}><Avatar uri={p.avatar_url} name={p.display_name || p.username} size={22} /></View>)}
                            <Text style={styles.facesText}>{people.size} friends</Text>
                          </View>
                          <Text style={styles.itemTitle} numberOfLines={1}>{item.movie_title}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}

                {sections.length === 0 ? (
                  <Empty icon="coffee" title={friends.length ? 'Quiet for now' : 'Your feed fills up when you follow people'} sub={friends.length ? 'When the people you follow save or review something, it shows up here.' : 'Find a few film lovers in Find people.'} />
                ) : sections.map((sec) => {
                  const [title, verb] = SECTION[sec.type];
                  const openId = open[sec.type];
                  const person = sec.people.find((p) => p.user_id === openId);
                  const count = sec.people.reduce((n, p) => n + p.items.length, 0);
                  return (
                    <View key={sec.type} style={styles.section}>
                      <SectionLabel style={{ marginTop: 0 }} right={<Text style={styles.secMeta}>{sec.people.length} {sec.people.length === 1 ? 'person' : 'people'} · {count}</Text>}>{title}</SectionLabel>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}>
                        {sec.people.map((p) => {
                          const on = openId === p.user_id;
                          return (
                            <Pressable key={p.user_id} onPress={() => setOpen((o) => ({ ...o, [sec.type]: on ? null : p.user_id }))} style={{ width: 60, alignItems: 'center', opacity: openId && !on ? 0.45 : 1 }}>
                              <View>
                                <Avatar uri={p.user.avatar_url} name={p.user.display_name || p.user.username} size={52} ring={on} />
                                <View style={[styles.badge, on && { backgroundColor: T.accent, borderColor: T.accent }]}><Text style={[styles.badgeText, on && { color: '#06060B' }]}>{p.items.length}</Text></View>
                              </View>
                              <Text style={[styles.circleName, on && { color: '#fff', fontFamily: F.bold }]} numberOfLines={1}>{(p.user.display_name || p.user.username || 'User').split(' ')[0]}</Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                      {!person ? <Text style={styles.hint}>Tap someone to see what they {verb}</Text> : (
                        <View style={{ marginTop: 14 }}>
                          <Pressable onPress={() => router.push({ pathname: '/person/[id]', params: { id: person.user_id } })}>
                            <Text style={styles.personName}>{person.user.display_name || person.user.username}<Text style={styles.personMeta}>  @{person.user.username} · {timeAgo(person.items[0].created_at)}</Text></Text>
                          </Pressable>
                          {sec.type === 'reviewed' ? person.items.slice(0, 5).map((it) => (
                            <Pressable key={it.id || it.movie_id} onPress={() => openTitle(toMovie(it))} style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                              <Poster uri={it.movie_poster} width={46} />
                              <View style={{ flex: 1 }}>
                                <Text style={styles.revTitle}>{it.movie_title}</Text>
                                {it.review_text ? <Text style={styles.revText} numberOfLines={3}>{it.review_text}</Text> : null}
                              </View>
                            </Pressable>
                          )) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginTop: 12 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
                              {person.items.slice(0, 20).map((it) => (
                                <View key={it.id || it.movie_id} style={{ width: 96 }}>
                                  <Pressable onPress={() => openTitle(toMovie(it))}><Poster uri={it.movie_poster} width={96} /></Pressable>
                                  <Text style={styles.itemTitle} numberOfLines={1}>{it.movie_title}</Text>
                                  <Pressable onPress={() => wl.toggleSave(toMovie(it))} hitSlop={6}><Text style={[styles.save, wl.ids.has(it.movie_id) && { color: T.accent }]}>{wl.ids.has(it.movie_id) ? '✓ Saved' : '+ Save'}</Text></Pressable>
                                </View>
                              ))}
                            </ScrollView>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )
          ) : tab === 'following' ? (
            <View style={{ paddingTop: 8 }}>
              {friends.length > 6 ? <SearchBox value={followQ} onChange={setFollowQ} placeholder="Search people you follow" /> : null}
              {friends.length === 0 ? <Empty icon="user-plus" title="You're not following anyone yet" action="Find people to follow" onAction={() => setTab('find')} />
                : friends.filter((f) => !followQ || `${f.username} ${f.display_name || ''}`.toLowerCase().includes(followQ.toLowerCase())).map((f, i) => <PersonRow key={f.user_id} u={f} first={i === 0} right={<MsgBtn u={f} />} />)}
            </View>
          ) : (
            <View style={{ paddingTop: 8 }}>
              <SearchBox value={q} onChange={setQ} placeholder="Search by name or username" />
              {found ? (found.length === 0 ? <Text style={styles.hint}>No one found for “{q.trim()}”.</Text> : found.map((u, i) => <PersonRow key={u.user_id} u={u} first={i === 0} right={<FollowBtn u={u} />} />)) : (
                <>
                  <SectionLabel style={{ marginTop: 18 }}>Suggested for you</SectionLabel>
                  {suggested.length === 0 ? <Text style={styles.hint}>No suggestions right now.</Text> : suggested.map((u, i) => <PersonRow key={u.user_id} u={u} first={i === 0} right={<FollowBtn u={u} />} />)}
                  {leaders.length ? <SectionLabel style={{ marginTop: 26 }} right={<Text style={styles.secMeta}>Biggest watchlists</Text>}>Top curators</SectionLabel> : null}
                  {leaders.map((u, i) => (
                    <View key={u.user_id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.rank, u.rank === 1 && { color: accent }]}>{u.rank}</Text>
                      <View style={{ flex: 1 }}><PersonRow u={{ ...u, mutualCount: 0, meta: `${u.watchlistCount} saved · @${u.username}` }} first={i === 0} right={<FollowBtn u={u} />} /></View>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>
      {isSignedIn ? (
        <Pressable onPress={() => router.push('/messages')} accessibilityLabel={unread ? `Messages, ${unread} unread` : 'Messages'} style={[styles.fab, { bottom: tabBar + 16 }]}>
          <Feather name="message-square" size={24} color="#fff" />
          {unread ? <View style={styles.fabBadge}><Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text></View> : null}
        </Pressable>
      ) : null}
    </View>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <View style={styles.search}>
      <Feather name="search" size={16} color="rgba(255,255,255,0.5)" />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="rgba(255,255,255,0.38)" autoCapitalize="none" autoCorrect={false} style={styles.searchInput} />
      {value ? <Pressable onPress={() => onChange('')} hitSlop={8}><Feather name="x" size={15} color="rgba(255,255,255,0.6)" /></Pressable> : null}
    </View>
  );
}

function PersonRow({ u, right, first }) {
  return (
    <Pressable onPress={() => router.push({ pathname: '/person/[id]', params: { id: u.user_id } })} style={[styles.row, !first && styles.rowBorder]}>
      <Avatar uri={u.avatar_url} name={u.display_name || u.username} size={44} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName} numberOfLines={1}>{u.display_name || u.username}</Text>
        <Text style={styles.rowMeta} numberOfLines={1}>{u.meta || (u.mutualCount ? `${u.mutualCount} mutual friend${u.mutualCount === 1 ? '' : 's'}` : `@${u.username}`)}</Text>
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, paddingHorizontal: 14, borderRadius: 23, marginTop: 6, marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  searchInput: { flex: 1, color: '#fff', fontFamily: F.body, fontSize: 14.5, paddingVertical: 0 },
  msgBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  faces: { flexDirection: 'row', alignItems: 'center', marginTop: 7 },
  facesText: { fontFamily: F.semibold, fontSize: 10.5, color: 'rgba(255,255,255,0.7)', marginLeft: 6 },
  rank: { width: 24, fontFamily: F.displayHeavy, fontSize: 15, color: 'rgba(255,255,255,0.35)' },
  bell: { position: 'absolute', right: 18, zIndex: 10, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  bellBadge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0B0B12' },
  bellBadgeText: { fontFamily: F.bold, fontSize: 9.5, color: '#07070F' },
  h1: { fontFamily: F.displayHeavy, fontSize: 28, color: '#fff', marginTop: 78, letterSpacing: -0.5 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: T.hairlineStrong, marginTop: 20 },
  fab: { position: 'absolute', right: 18, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', elevation: 6 },
  fabBadge: { position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { fontFamily: F.bold, fontSize: 10, color: '#07070F' },
  counts: { fontFamily: F.body, fontSize: 12.5, color: T.text2, marginTop: 2 },
  b: { fontFamily: F.bold, color: '#fff' },
  circleName: { fontFamily: F.medium, fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 6, textAlign: 'center' },
  section: { paddingTop: 20, paddingBottom: 18, marginTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hairlineStrong },
  secMeta: { fontFamily: F.body, fontSize: 11.5, color: T.text2 },
  badge: { position: 'absolute', right: -4, bottom: -2, minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: 'rgba(20,20,28,0.95)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: F.bold, fontSize: 10, color: '#fff' },
  hint: { fontFamily: F.body, fontSize: 11.5, color: T.text3, marginTop: 10 },
  personName: { fontFamily: F.bold, fontSize: 13.5, color: '#fff' },
  personMeta: { fontFamily: F.body, fontSize: 11.5, color: T.text2 },
  revTitle: { fontFamily: F.bold, fontSize: 13, color: '#fff' },
  revText: { fontFamily: F.body, fontSize: 12.5, lineHeight: 18, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  itemTitle: { fontFamily: F.semibold, fontSize: 11.5, color: '#fff', marginTop: 6 },
  save: { fontFamily: F.bold, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hairlineStrong },
  rowName: { fontFamily: F.bold, fontSize: 13.5, color: '#fff' },
  rowMeta: { fontFamily: F.body, fontSize: 11.5, color: T.text2, marginTop: 2 },
  followBtn: { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 16, paddingHorizontal: 14, height: 32, justifyContent: 'center' },
  followingBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: T.hairlineStrong },
  followText: { fontFamily: F.bold, fontSize: 12, color: '#fff' },
  cta: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 21, paddingHorizontal: 20, height: 42, justifyContent: 'center' },
  ctaText: { fontFamily: F.bold, fontSize: 13, color: '#fff' },
});
