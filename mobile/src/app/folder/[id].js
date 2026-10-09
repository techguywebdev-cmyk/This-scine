import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Ambient from '../../components/Ambient';
import Folder from '../../components/Folder';
import MovieRow from '../../components/MovieRow';
import { Empty, GlassButton, SectionLabel, Spinner } from '../../components/Ui';
import { useApi } from '../../lib/api';
import { F, T } from '../../lib/theme';

export default function FolderScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const api = useApi();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = () => api.get(`/api/lists/${id}`).then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const list = data?.list;
  const movies = (data?.movies || []).map((m) => ({ id: m.movie_id, title: m.movie_title, poster: m.movie_poster, year: m.movie_year, rating: m.movie_rating, accent: m.movie_accent, isTV: !!m.is_tv }));

  const togglePublic = async (v) => {
    setData((d) => ({ ...d, list: { ...d.list, is_public: v } }));
    try { await api.patch(`/api/lists/${id}`, { is_public: v }); } catch { setData((d) => ({ ...d, list: { ...d.list, is_public: !v } })); }
  };
  const toggleFollow = async () => {
    const next = !list.is_following;
    setData((d) => ({ ...d, list: { ...d.list, is_following: next } }));
    try { await api.post(`/api/lists/${id}/follow`, {}); } catch {}
  };

  return (
    <View style={{ flex: 1 }}>
      <Ambient accent={list?.cover_accent || T.accent} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>
        <GlassButton icon="chevron-left" label="Back" onPress={() => router.back()} />
        {error ? <Empty title="Couldn't open this folder" sub={error} /> : !list ? <Spinner /> : (
          <>
            <View style={styles.head}>
              <View style={{ width: 110 }}><Folder poster={list.cover_poster} accent={T.accent} count={movies.length} locked={list.is_public === false} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{list.title}</Text>
                <Text style={styles.by}>{list.is_owner ? 'Your folder' : `by ${list.display_name || list.username}`}</Text>
                {list.description ? <Text style={styles.desc} numberOfLines={3}>{list.description}</Text> : null}
              </View>
            </View>
            {list.is_owner ? (
              <View style={styles.privacy}>
                <Feather name={list.is_public === false ? 'lock' : 'globe'} size={15} color="#fff" />
                <Text style={styles.privacyText}>{list.is_public === false ? 'Private — only you can see it' : 'Public — anyone can find and follow it'}</Text>
                <Switch value={list.is_public !== false} onValueChange={togglePublic} trackColor={{ true: T.accent, false: 'rgba(255,255,255,0.15)' }} thumbColor="#fff" />
              </View>
            ) : (
              <Pressable onPress={toggleFollow} style={[styles.follow, list.is_following && styles.following]}>
                <Text style={[styles.followText, list.is_following && { color: '#fff' }]}>{list.is_following ? 'Following' : 'Follow folder'}</Text>
              </Pressable>
            )}
            <SectionLabel>{`${movies.length} title${movies.length === 1 ? '' : 's'}`}</SectionLabel>
            {movies.length === 0 ? (
              <>
                <Empty title="This folder is empty" sub="Save films from your feed, then add them here." />
                <Pressable onPress={() => router.navigate('/')} style={styles.fill}><Feather name="play-circle" size={15} color="#07070F" /><Text style={styles.fillText}>Find films in the feed</Text></Pressable>
              </>
            ) : movies.map((m, i) => <MovieRow key={m.id} movie={m} first={i === 0} />)}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', gap: 16, alignItems: 'flex-end', marginTop: 18 },
  title: { fontFamily: F.displayHeavy, fontSize: 24, color: '#fff', letterSpacing: -0.4 },
  by: { fontFamily: F.body, fontSize: 12.5, color: T.text2, marginTop: 4 },
  desc: { fontFamily: F.body, fontSize: 12.5, color: 'rgba(255,255,255,0.75)', marginTop: 6, lineHeight: 18 },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: T.hairlineStrong },
  privacyText: { flex: 1, fontFamily: F.medium, fontSize: 12.5, color: 'rgba(255,255,255,0.85)' },
  follow: { marginTop: 18, alignSelf: 'flex-start', backgroundColor: T.accent, borderRadius: 21, paddingHorizontal: 20, height: 42, justifyContent: 'center' },
  following: { backgroundColor: 'transparent', borderWidth: 1, borderColor: T.hairlineStrong },
  followText: { fontFamily: F.bold, fontSize: 13, color: '#07070F' },
  fill: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: T.accent, borderRadius: 21, paddingHorizontal: 16, height: 40, marginTop: 4 },
  fillText: { fontFamily: F.bold, fontSize: 13, color: '#07070F' },
});
