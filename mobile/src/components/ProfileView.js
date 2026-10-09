import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Ambient from './Ambient';
import Folder from './Folder';
import { Empty, GlassButton, Poster, SectionLabel, Spinner, Tabs } from './Ui';
import { useApi } from '../lib/api';
import { rowToMovie, useWatchlist } from '../lib/store';
import { openTitle } from '../lib/titles';
import { F, T } from '../lib/theme';

const VERB = { saved: 'Saved', watched: 'Watched', reviewed: 'Reviewed', list_follow: 'Followed folder' };
const timeAgo = (ts) => { const m = Math.floor((Date.now() - new Date(ts)) / 60000); if (m < 60) return `${Math.max(1, m)}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; return `${Math.floor(h / 24)}d ago`; };

// Shared profile layout for friends and for "You" (isSelf adds settings via `footer`)
export default function ProfileView({ userId, onBack, footer, headerRight }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const api = useApi();
  const wl = useWatchlist();
  const [p, setP] = useState(null);
  const [tab, setTab] = useState('activity');
  const [activity, setActivity] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [lists, setLists] = useState(null);

  useEffect(() => {
    setP(null);
    api.get(`/api/users/${userId}`).then(setP).catch(() => setP({ error: true }));
    api.get(`/api/activity?type=user&userId=${userId}`).then((d) => setActivity(d.items || [])).catch(() => setActivity([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
  useEffect(() => {
    if (tab === 'reviews' && reviews === null) api.get(`/api/reviews?userId=${userId}`).then((d) => setReviews(d.comments || d.reviews || [])).catch(() => setReviews([]));
    if (tab === 'lists' && lists === null) api.get(`/api/lists?tab=user&userId=${encodeURIComponent(userId)}`).then((d) => setLists(d.lists || [])).catch(() => setLists([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const follow = async () => {
    const next = !p.isFollowing;
    setP((x) => ({ ...x, isFollowing: next, followers: Math.max(0, (x.followers || 0) + (next ? 1 : -1)) }));
    try { next ? await api.post('/api/follows', { targetId: userId }) : await api.del('/api/follows', { targetId: userId }); } catch {}
  };

  if (!p) return <View style={{ flex: 1 }}><Ambient /><Spinner /></View>;
  if (p.error) return <View style={{ flex: 1, padding: 20, paddingTop: insets.top + 20 }}><Ambient /><Empty title="Couldn't load this profile" /></View>;

  const name = p.display_name || p.username;
  const watchlist = p.watchlist || [];
  const col3 = (width - 40 - 20) / 3;

  return (
    <View style={{ flex: 1 }}>
      <Ambient />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
        <View style={{ width, aspectRatio: 1.9 }}>
          {p.cover_url ? <Image source={{ uri: p.cover_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} /> : <LinearGradient colors={[`${T.accent}40`, 'transparent']} style={StyleSheet.absoluteFill} />}
          <LinearGradient colors={['rgba(6,6,11,0.4)', 'transparent', '#06060B']} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
          <View style={[styles.topBtns, { top: insets.top + 8 }]}>
            {onBack ? <GlassButton icon="chevron-left" label="Back" onPress={onBack} /> : <View />}
            {headerRight}
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: -58 }}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              {p.avatar_url ? <Image source={{ uri: p.avatar_url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text style={styles.initial}>{(name || 'U')[0].toUpperCase()}</Text>}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Text style={styles.name}>{name}</Text>
            {p.followsYou ? <Text style={styles.followsYou}>Follows you</Text> : null}
          </View>
          <Text style={styles.handle}>@{p.username}{p.topGenres?.length ? <Text style={{ color: T.text3 }}> · into {p.topGenres.slice(0, 3).join(', ')}</Text> : null}</Text>
          {p.bio ? <Text style={styles.bio}>{p.bio}</Text> : null}
          <View style={styles.stats}>
            {[[p.followers, 'followers'], [p.following, 'following'], [p.watchlistCount, 'saved'], [p.watchedCount || 0, 'watched']].map(([v, l]) => (
              <Text key={l} style={styles.stat}><Text style={styles.b}>{v || 0}</Text> {l}</Text>
            ))}
          </View>

          {!p.isSelf ? (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <Pressable onPress={follow} style={[styles.btn, p.isFollowing ? styles.btnGhost : { backgroundColor: T.accent }]}>
                <Text style={[styles.btnText, !p.isFollowing && { color: '#07070F' }]}>{p.isFollowing ? 'Following' : p.followsYou ? 'Follow back' : 'Follow'}</Text>
              </Pressable>
            </View>
          ) : null}

          {!p.isSelf && p.inCommonCount > 0 ? (
            <>
              <SectionLabel right={<Text style={styles.secMeta}>{p.inCommonCount}</Text>}>You both saved</SectionLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
                {p.inCommon.map((m) => <Pressable key={m.movie_id} onPress={() => openTitle(rowToMovie(m))}><Poster uri={m.poster} width={72} /></Pressable>)}
              </ScrollView>
            </>
          ) : null}

          <Tabs style={{ marginTop: 28 }} tabs={[['activity', 'Activity'], ['watchlist', 'Watchlist'], ['reviews', 'Reviews'], ['lists', 'Folders']]} value={tab} onChange={setTab} />

          {tab === 'activity' ? (activity === null ? <Spinner /> : activity.length === 0 ? <Empty title="Nothing yet" /> : (
            <View style={[styles.grid, { paddingTop: 16 }]}>
              {activity.map((it, i) => (
                <View key={it.id || i} style={{ width: col3 }}>
                  <Pressable onPress={() => it.movie_id && it.type !== 'list_follow' && openTitle({ id: it.movie_id, title: it.movie_title, poster: it.movie_poster, isTV: !!it.is_tv })}>
                    <Poster uri={it.movie_poster} width="100%" />
                    <Text style={styles.tag}>{VERB[it.type] || 'Activity'}</Text>
                  </Pressable>
                  <Text style={styles.itemTitle} numberOfLines={1}>{it.movie_title}</Text>
                  <Text style={styles.itemSub}>{timeAgo(it.created_at)}</Text>
                </View>
              ))}
            </View>
          )) : null}

          {tab === 'watchlist' ? (p.watchlist === null ? <Empty title="This watchlist is private" /> : watchlist.length === 0 ? <Empty title="No titles yet" /> : watchlist.slice(0, 80).map((m, i) => (
            <Pressable key={m.movie_id} onPress={() => openTitle(rowToMovie(m))} style={[styles.row, i && styles.rowBorder]}>
              <Poster uri={m.poster} width={42} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{m.title}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>{[m.year, (m.genre || []).slice(0, 2).join(', ')].filter(Boolean).join(' · ')}{m.watched ? <Text style={{ color: '#7BFFB0' }}> · Watched</Text> : null}</Text>
              </View>
              {!p.isSelf ? <Pressable hitSlop={8} onPress={() => wl.toggleSave(rowToMovie(m))}><Feather name={wl.ids.has(m.movie_id) ? 'check' : 'plus'} size={18} color={wl.ids.has(m.movie_id) ? '#7BFF9E' : 'rgba(255,255,255,0.7)'} /></Pressable> : null}
            </Pressable>
          ))) : null}

          {tab === 'reviews' ? (reviews === null ? <Spinner /> : reviews.length === 0 ? <Empty title="No reviews yet" /> : reviews.map((r, i) => (
            <View key={r.id} style={[{ paddingVertical: 14 }, i && styles.rowBorder]}>
              <Text style={styles.rowTitle}>{r.movie_title}</Text>
              {r.rating > 0 ? <Text style={{ color: T.star, marginTop: 4 }}>{'★'.repeat(r.rating)}<Text style={{ color: T.hairlineStrong }}>{'★'.repeat(5 - r.rating)}</Text></Text> : null}
              <Text style={styles.reviewText}>{r.text}</Text>
            </View>
          ))) : null}

          {tab === 'lists' ? (lists === null ? <Spinner /> : lists.length === 0 ? <Empty title="No public folders" /> : (
            <View style={[styles.grid, { paddingTop: 18, columnGap: 12 }]}>
              {lists.map((l) => (
                <Pressable key={l.id} style={{ width: (width - 40 - 24) / 3 }} onPress={() => router.push({ pathname: '/folder/[id]', params: { id: l.id } })}>
                  <Folder poster={l.cover_url || (l.posters || [])[0]} accent={T.accent} count={l.movie_count || 0} locked={l.is_public === false} />
                  <Text style={styles.itemTitle} numberOfLines={1}>{l.title}</Text>
                </Pressable>
              ))}
            </View>
          )) : null}

          {footer}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBtns: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  avatarRing: { width: 88, height: 88, borderRadius: 44, padding: 3, backgroundColor: T.accent },
  avatar: { flex: 1, borderRadius: 44, overflow: 'hidden', backgroundColor: '#14141B', borderWidth: 3, borderColor: '#0B0B12', alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: F.bold, fontSize: 30, color: T.accent },
  name: { fontFamily: F.displayHeavy, fontSize: 23, color: '#fff', letterSpacing: -0.4 },
  followsYou: { fontFamily: F.bold, fontSize: 10.5, color: T.text2, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, overflow: 'hidden' },
  handle: { fontFamily: F.body, fontSize: 12.5, color: T.text2, marginTop: 3 },
  bio: { fontFamily: F.body, fontSize: 13.5, color: 'rgba(255,255,255,0.85)', marginTop: 10, lineHeight: 20 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 14 },
  stat: { fontFamily: F.body, fontSize: 12.5, color: T.text2 },
  b: { fontFamily: F.bold, color: '#fff' },
  btn: { flex: 1, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { borderWidth: 1, borderColor: T.hairlineStrong },
  btnText: { fontFamily: F.bold, fontSize: 13, color: '#fff' },
  secMeta: { fontFamily: F.body, fontSize: 11.5, color: T.text2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 14 },
  tag: { position: 'absolute', top: 5, left: 5, fontFamily: F.bold, fontSize: 9.5, color: '#fff', backgroundColor: 'rgba(0,0,0,0.62)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  itemTitle: { fontFamily: F.semibold, fontSize: 11.5, color: '#fff', marginTop: 6 },
  itemSub: { fontFamily: F.body, fontSize: 10.5, color: T.text3, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: T.hairlineStrong },
  rowTitle: { fontFamily: F.bold, fontSize: 13.5, color: '#fff' },
  rowMeta: { fontFamily: F.body, fontSize: 11.5, color: T.text2, marginTop: 3 },
  reviewText: { fontFamily: F.body, fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.85)', marginTop: 8 },
});
