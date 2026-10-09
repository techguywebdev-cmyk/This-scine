import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/expo';
import Ambient from '../../components/Ambient';
import PosterWall from '../../components/PosterWall';
import { Avatar, Empty, Poster, SectionLabel, Spinner, Tabs } from '../../components/Ui';
import { useApi } from '../../lib/api';
import { useWatchlist } from '../../lib/store';
import { openTitle } from '../../lib/titles';
import { F, T } from '../../lib/theme';

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

  const load = useCallback(async () => {
    api.get('/api/movies?popular=1').then((d) => setWall((d.movies || []).map((m) => m.poster).filter(Boolean).sort(() => Math.random() - 0.5).slice(0, 5))).catch(() => {});
    if (!isSignedIn) { setFeed([]); return; }
    await Promise.all([
      api.get('/api/activity?type=feed').then((d) => setFeed(d.items || [])).catch(() => setFeed([])),
      api.get('/api/follows?type=following').then((d) => setFriends(d.users || [])).catch(() => {}),
      api.get('/api/follows?type=stats').then((d) => setStats(d)).catch(() => {}),
      api.get('/api/follows?type=suggested').then((d) => setSuggested(d.users || [])).catch(() => {}),
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

  const follow = async (u) => {
    const next = !u.isFollowing;
    setSuggested((p) => p.map((x) => (x.user_id === u.user_id ? { ...x, isFollowing: next } : x)));
    try { next ? await api.post('/api/follows', { targetId: u.user_id }) : await api.del('/api/follows', { targetId: u.user_id }); } catch {}
  };

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <View style={{ flex: 1 }}>
      <Ambient />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#fff" />}>
        <PosterWall posters={wall} />
        <View style={{ paddingTop: insets.top + 48, paddingHorizontal: 20 }}>
          <Text style={styles.h1}>Friends</Text>
          <Text style={styles.counts}><Text style={styles.b}>{stats.followers || 0}</Text> followers  ·  <Text style={styles.b}>{stats.following || 0}</Text> following</Text>
          <Tabs style={{ marginTop: 16 }} tabs={[['feed', 'Feed'], ['following', 'Following'], ['find', 'Find people']]} value={tab} onChange={setTab} />

          {!isSignedIn ? (
            <View style={{ paddingTop: 20 }}>
              <Empty title="See what your friends are watching" sub="Sign in to follow people, see their saves and reviews, and message them about a film." />
              <Pressable onPress={() => router.push('/sign-in')} style={styles.cta}><Text style={styles.ctaText}>Sign in</Text></Pressable>
            </View>
          ) : tab === 'feed' ? (
            feed === null ? <Spinner /> : (
              <>
                {friends.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, marginTop: 18 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
                    {friends.map((f) => {
                      const on = personFilter === f.user_id;
                      return (
                        <Pressable key={f.user_id} onPress={() => setPersonFilter(on ? null : f.user_id)} style={{ width: 62, alignItems: 'center', opacity: personFilter && !on ? 0.4 : 1 }}>
                          <Avatar uri={f.avatar_url} name={f.display_name || f.username} size={58} ring={on} />
                          <Text style={[styles.circleName, on && { color: T.accent, fontFamily: F.bold }]} numberOfLines={1}>{f.display_name || f.username}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : null}

                {sections.length === 0 ? (
                  <Empty title={friends.length ? 'Quiet for now' : 'Your feed fills up when you follow people'} sub={friends.length ? 'When the people you follow save or review something, it shows up here.' : 'Find a few film lovers in Find people.'} />
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
              {friends.length === 0 ? <Empty title="You're not following anyone yet" /> : friends.map((f, i) => <PersonRow key={f.user_id} u={f} first={i === 0} />)}
            </View>
          ) : (
            <View style={{ paddingTop: 8 }}>
              {suggested.length === 0 ? <Empty title="No suggestions right now" /> : suggested.map((u, i) => (
                <PersonRow key={u.user_id} u={u} first={i === 0} right={
                  <Pressable onPress={() => follow(u)} style={[styles.followBtn, u.isFollowing && styles.followingBtn]}><Text style={[styles.followText, u.isFollowing && { color: '#fff' }]}>{u.isFollowing ? 'Following' : 'Follow'}</Text></Pressable>
                } />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function PersonRow({ u, right, first }) {
  return (
    <Pressable onPress={() => router.push({ pathname: '/person/[id]', params: { id: u.user_id } })} style={[styles.row, !first && styles.rowBorder]}>
      <Avatar uri={u.avatar_url} name={u.display_name || u.username} size={44} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName} numberOfLines={1}>{u.display_name || u.username}</Text>
        <Text style={styles.rowMeta} numberOfLines={1}>{u.mutualCount ? `${u.mutualCount} mutual` : `@${u.username}`}</Text>
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  h1: { fontFamily: F.displayHeavy, fontSize: 28, color: '#fff', marginTop: 78, letterSpacing: -0.5 },
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
  followBtn: { backgroundColor: T.accent, borderRadius: 16, paddingHorizontal: 14, height: 32, justifyContent: 'center' },
  followingBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: T.hairlineStrong },
  followText: { fontFamily: F.bold, fontSize: 12, color: '#07070F' },
  cta: { alignSelf: 'flex-start', backgroundColor: T.accent, borderRadius: 21, paddingHorizontal: 20, height: 42, justifyContent: 'center' },
  ctaText: { fontFamily: F.bold, fontSize: 13, color: '#07070F' },
});
